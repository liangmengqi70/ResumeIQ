import { mutation, jsonBody } from '@/lib/api';
import { AuthError, normalizePhone } from '@/lib/auth-policy';
import { currentUser, signIn } from '@/lib/auth';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  return mutation(request, async () => {
    const body = await jsonBody(request); const phone = normalizePhone(body.phone);
    if (typeof body.code !== 'string' || !/^\d{6}$/.test(body.code)) throw new AuthError('请输入 6 位验证码');
    await signIn(phone, body.code); return { ok: true, user: await currentUser() };
  });
}
