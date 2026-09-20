import 'server-only';
import { cookies } from 'next/headers';
import type { RowDataPacket } from 'mysql2/promise';
import { timingSafeEqual } from 'node:crypto';
import { db, transaction } from './db';
import { AuthError, hash, token, maskPhone, SESSION_COOKIE, GUEST_COOKIE, SESSION_SECONDS, GUEST_SECONDS } from './auth-policy';

export const cookieOptions = { httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/' };
export async function currentUser() {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!value || !/^[a-f0-9]{64}$/.test(value)) return null;
  const [rows] = await db().execute<RowDataPacket[]>('SELECT u.id, u.nickname, u.phone, u.avatar_url, u.registered_at, u.last_login_at FROM auth_sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > UTC_TIMESTAMP(3) AND u.deleted_at IS NULL', [hash(value)]);
  return rows[0] ? { id: String(rows[0].id), nickname: rows[0].nickname as string, phone: maskPhone(rows[0].phone), avatarUrl: rows[0].avatar_url as string | null, registeredAt: String(rows[0].registered_at), lastLoginAt: String(rows[0].last_login_at || rows[0].registered_at) } : null;
}
export async function currentOwner() {
  const user = await currentUser();
  if (user) return { userId: user.id, guestSessionId: null };
  const value = (await cookies()).get(GUEST_COOKIE)?.value;
  if (!value || !/^[a-f0-9]{64}$/.test(value)) return null;
  const [rows] = await db().execute<RowDataPacket[]>('SELECT id FROM guest_sessions WHERE token_hash = ? AND invalidated_at IS NULL AND deleted_at IS NULL AND bound_user_id IS NULL AND draft_expires_at > UTC_TIMESTAMP(3)', [hash(value)]);
  return rows[0] ? { userId: null, guestSessionId: String(rows[0].id) } : null;
}
export async function issueCode(phone: string, code: string) {
  const result = await transaction(async connection => {
    // A persistent row lock serializes resend and verification for this phone.
    await connection.execute('INSERT IGNORE INTO auth_challenges (phone) VALUES (?)', [phone]);
    const [rows] = await connection.execute<RowDataPacket[]>('SELECT *, TIMESTAMPDIFF(SECOND, sent_at, UTC_TIMESTAMP(3)) AS elapsed, window_started_at > UTC_TIMESTAMP(3) - INTERVAL 1 HOUR AS in_window FROM auth_challenges WHERE phone = ? FOR UPDATE', [phone]);
    const row = rows[0];
    const inWindow = Number(row.in_window) === 1;
    if (row.elapsed !== null && row.elapsed < 60) return new AuthError('请稍后再获取验证码', 429, 60 - row.elapsed);
    if (inWindow && Number(row.sent_count) >= 5) return new AuthError('获取验证码过于频繁，请一小时后再试', 429);
    const salt = token();
    await connection.execute('UPDATE auth_challenges SET code_hash = ?, salt = ?, attempts = 0, expires_at = UTC_TIMESTAMP(3) + INTERVAL 5 MINUTE, sent_at = UTC_TIMESTAMP(3), sent_count = ?, window_started_at = IF(?, window_started_at, UTC_TIMESTAMP(3)) WHERE phone = ?', [hash(`${salt}:${code}`), salt, inWindow ? Number(row.sent_count) + 1 : 1, inWindow, phone]);
    return null;
  });
  if (result) throw result;
}
export async function invalidateCode(phone: string) {
  await db().execute('UPDATE auth_challenges SET code_hash = NULL, salt = NULL, expires_at = NULL WHERE phone = ?', [phone]);
}
export async function signIn(phone: string, code: string) {
  const jar = await cookies();
  const guestToken = jar.get(GUEST_COOKIE)?.value;
  const previousToken = jar.get(SESSION_COOKIE)?.value;
  const session = token();
  const result = await transaction(async connection => {
    const [rows] = await connection.execute<RowDataPacket[]>('SELECT *, expires_at > UTC_TIMESTAMP(3) AS valid FROM auth_challenges WHERE phone = ? FOR UPDATE', [phone]);
    const challenge = rows[0];
    if (!challenge || Number(challenge.valid) !== 1 || !challenge.code_hash || Number(challenge.attempts) >= 5) return new AuthError('验证码已失效，请重新获取');
    if (!timingSafeEqual(Buffer.from(hash(`${challenge.salt}:${code}`)), Buffer.from(challenge.code_hash))) {
      await connection.execute('UPDATE auth_challenges SET attempts = attempts + 1 WHERE phone = ?', [phone]);
      return new AuthError(challenge.attempts >= 4 ? '错误次数过多，请重新获取验证码' : '验证码错误，请重试');
    }
    await connection.execute('INSERT INTO users (phone, nickname) VALUES (?, ?) ON DUPLICATE KEY UPDATE id = id', [phone, `求职者${token().slice(0, 6)}`]);
    const [users] = await connection.execute<RowDataPacket[]>('SELECT id, deleted_at FROM users WHERE phone = ? FOR UPDATE', [phone]);
    if (users[0].deleted_at) return new AuthError('此账号不可用', 403);
    const userId = users[0].id;
    if (guestToken) {
      const [guests] = await connection.execute<RowDataPacket[]>('SELECT id FROM guest_sessions WHERE token_hash = ? AND bound_user_id IS NULL AND invalidated_at IS NULL AND deleted_at IS NULL AND (draft_expires_at > UTC_TIMESTAMP(3) OR EXISTS (SELECT 1 FROM diagnosis_tasks t WHERE t.guest_session_id = guest_sessions.id AND t.expires_at > UTC_TIMESTAMP(3) AND t.deleted_at IS NULL)) FOR UPDATE', [hash(guestToken)]);
      if (guests[0]) {
        const guestId = guests[0].id;
        // All identifiers below are static, never derived from request input.
        for (const table of ['resume_files', 'job_descriptions', 'background_surveys', 'diagnosis_tasks']) {
          await connection.execute(`UPDATE ${table} SET user_id = ?, expires_at = NULL WHERE guest_session_id = ? AND user_id IS NULL AND deleted_at IS NULL AND (expires_at IS NULL OR expires_at > UTC_TIMESTAMP(3))`, [userId, guestId]);
        }
        await connection.execute('UPDATE guest_sessions SET bound_user_id = ?, bound_at = UTC_TIMESTAMP(3), invalidated_at = UTC_TIMESTAMP(3) WHERE id = ?', [userId, guestId]);
      }
    }
    if (previousToken) await connection.execute('DELETE FROM auth_sessions WHERE token_hash = ?', [hash(previousToken)]);
    await connection.execute('INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES (?, ?, UTC_TIMESTAMP(3) + INTERVAL 30 DAY)', [hash(session), userId]);
    await connection.execute('UPDATE users SET last_login_at = UTC_TIMESTAMP(3) WHERE id = ?', [userId]);
    await connection.execute('UPDATE auth_challenges SET code_hash = NULL, salt = NULL, expires_at = NULL WHERE phone = ?', [phone]);
    return null;
  });
  if (result) throw result;
  jar.set(SESSION_COOKIE, session, { ...cookieOptions, maxAge: SESSION_SECONDS });
  jar.set(GUEST_COOKIE, '', { ...cookieOptions, maxAge: 0 });
}
export async function signOut() {
  const jar = await cookies(); const session = jar.get(SESSION_COOKIE)?.value;
  if (session) await db().execute('DELETE FROM auth_sessions WHERE token_hash = ?', [hash(session)]);
  jar.set(SESSION_COOKIE, '', { ...cookieOptions, maxAge: 0 });
}
export async function enterGuest() {
  if (await currentUser()) return;
  const jar = await cookies(); const previous = jar.get(GUEST_COOKIE)?.value;
  if (previous) {
    const [rows] = await db().execute<RowDataPacket[]>('SELECT id FROM guest_sessions WHERE token_hash = ? AND invalidated_at IS NULL AND deleted_at IS NULL AND bound_user_id IS NULL AND draft_expires_at > UTC_TIMESTAMP(3)', [hash(previous)]);
    if (rows[0]) {
      await db().execute('UPDATE guest_sessions SET last_active_at = UTC_TIMESTAMP(3), draft_expires_at = UTC_TIMESTAMP(3) + INTERVAL 24 HOUR WHERE id = ?', [rows[0].id]);
      jar.set(GUEST_COOKIE, previous, { ...cookieOptions, maxAge: GUEST_SECONDS }); return;
    }
  }
  const guest = token();
  await db().execute('INSERT INTO guest_sessions (token_hash, created_at, last_active_at, draft_expires_at) VALUES (?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3), UTC_TIMESTAMP(3) + INTERVAL 24 HOUR)', [hash(guest)]);
  jar.set(GUEST_COOKIE, guest, { ...cookieOptions, maxAge: GUEST_SECONDS });
}

