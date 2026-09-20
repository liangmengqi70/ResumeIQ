import assert from 'node:assert/strict';
import { createHash, randomInt } from 'node:crypto';
import mysql from 'mysql2/promise';

// Uses only a newly allocated test phone and guest session; removes only its own rows.
const origin = 'http://127.0.0.1:3000';
const db = await mysql.createConnection({ host: process.env.MYSQL_HOST, port: Number(process.env.MYSQL_PORT), database: process.env.MYSQL_DATABASE, user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD });
const hash = value => createHash('sha256').update(value).digest('hex');
let phone, userId, guestHash;
async function request(path, body, cookie, method = 'POST') {
  const response = await fetch(`${origin}/api/auth/${path}`, { method, headers: { origin, 'content-type': 'application/json', ...(cookie ? { cookie } : {}) }, ...(method === 'POST' ? { body: JSON.stringify(body || {}) } : {}) });
  return { status: response.status, data: await response.json(), cookies: response.headers.getSetCookie() };
}
function cookie(result, name) { return result.cookies.find(value => value.startsWith(`${name}=`))?.split(';')[0]; }
function ok(result) { assert.equal(result.status, 200, JSON.stringify(result.data)); }
try {
  assert.match(process.env.AUTH_DEV_CODE || '', /^\d{6}$/);
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = `199${String(randomInt(10000000, 99999999))}`;
    const [existing] = await db.execute('SELECT phone FROM users WHERE phone = ? UNION SELECT phone FROM auth_challenges WHERE phone = ?', [`+86${candidate}`, `+86${candidate}`]);
    if (!existing.length) { phone = candidate; break; }
  }
  assert.ok(phone, 'Could not allocate isolated test identity');
  const guest = await request('guest'); ok(guest);
  const guestCookie = cookie(guest, 'resumeiq_guest'); assert.ok(guestCookie);
  guestHash = hash(guestCookie.split('=')[1]);
  const renewed = await request('guest', {}, guestCookie); ok(renewed); assert.equal(cookie(renewed, 'resumeiq_guest'), guestCookie);
  const issued = await request('code', { phone }); ok(issued);
  assert.equal((await request('code', { phone })).status, 429);
  const wrong = process.env.AUTH_DEV_CODE === '000000' ? '111111' : '000000';
  assert.equal((await request('login', { phone, code: wrong })).status, 400);
  const loggedIn = await request('login', { phone, code: process.env.AUTH_DEV_CODE }, guestCookie); ok(loggedIn);
  const sessionCookie = cookie(loggedIn, 'resumeiq_session'); assert.ok(sessionCookie);
  assert.match(loggedIn.cookies.find(value => value.startsWith('resumeiq_session=')), /HttpOnly/i);
  assert.match(loggedIn.cookies.find(value => value.startsWith('resumeiq_session=')), /Max-Age=2592000/i);
  const me = await request('me', null, sessionCookie, 'GET'); ok(me); userId = me.data.user.id;
  assert.ok(me.data.user.phone.includes('****'));
  assert.equal((await request('me', null, sessionCookie, 'GET')).data.user.id, userId);
  const [bound] = await db.execute('SELECT bound_user_id, invalidated_at FROM guest_sessions WHERE token_hash = ?', [guestHash]);
  assert.equal(String(bound[0].bound_user_id), userId); assert.ok(bound[0].invalidated_at);
  const [usage] = await db.execute('SELECT COUNT(*) AS count FROM free_usage_records WHERE user_id = ?', [userId]); assert.equal(usage[0].count, 0);
  assert.equal((await request('login', { phone, code: process.env.AUTH_DEV_CODE })).status, 400, 'OTP must be single use');
  ok(await request('logout', {}, sessionCookie));
  assert.equal((await request('me', null, sessionCookie, 'GET')).data.user, null, 'Revoked token must fail');
  await db.execute('UPDATE auth_challenges SET sent_at = UTC_TIMESTAMP(3) - INTERVAL 61 SECOND WHERE phone = ?', [`+86${phone}`]);
  ok(await request('code', { phone }));
  for (let i = 0; i < 5; i++) assert.equal((await request('login', { phone, code: wrong })).status, 400);
  assert.equal((await request('login', { phone, code: process.env.AUTH_DEV_CODE })).status, 400, 'Five failures lock the challenge');
  await db.execute('UPDATE auth_challenges SET sent_at = UTC_TIMESTAMP(3) - INTERVAL 61 SECOND WHERE phone = ?', [`+86${phone}`]);
  ok(await request('code', { phone }));
  await db.execute('UPDATE auth_challenges SET expires_at = UTC_TIMESTAMP(3) - INTERVAL 1 SECOND WHERE phone = ?', [`+86${phone}`]);
  assert.equal((await request('login', { phone, code: process.env.AUTH_DEV_CODE })).status, 400, 'Expired code must fail');
  await db.execute('UPDATE auth_challenges SET sent_at = UTC_TIMESTAMP(3) - INTERVAL 61 SECOND WHERE phone = ?', [`+86${phone}`]);
  ok(await request('code', { phone }));
  const again = await request('login', { phone, code: process.env.AUTH_DEV_CODE }); ok(again);
  const againMe = await request('me', null, cookie(again, 'resumeiq_session'), 'GET'); assert.equal(againMe.data.user.id, userId, 'Repeat login must reuse account');
  ok(await request('logout', {}, cookie(again, 'resumeiq_session')));
  console.log('PASS: guest reuse/binding, registration, repeat login, resend limit, wrong/locked/expired/reused OTP, 30-day HttpOnly session, session persistence, logout revocation, no free entitlement consumed.');
} finally {
  if (guestHash) await db.execute('DELETE FROM guest_sessions WHERE token_hash = ?', [guestHash]);
  if (phone) {
    // The candidate was confirmed absent before this test; never targets pre-existing accounts.
    const [users] = await db.execute('SELECT id FROM users WHERE phone = ?', [`+86${phone}`]);
    for (const user of users) await db.execute('DELETE FROM auth_sessions WHERE user_id = ?', [user.id]);
    await db.execute('DELETE FROM users WHERE phone = ?', [`+86${phone}`]);
    await db.execute('DELETE FROM auth_challenges WHERE phone = ?', [`+86${phone}`]);
  }
  await db.end();
  console.log('Temporary authentication test records cleaned up.');
}
