import { createHash, randomBytes } from 'node:crypto';
export const SESSION_SECONDS = 30 * 24 * 60 * 60;
export const GUEST_SECONDS = 24 * 60 * 60;
export const SESSION_COOKIE = 'resumeiq_session';
export const GUEST_COOKIE = 'resumeiq_guest';
export function hash(value: string) { return createHash('sha256').update(value).digest('hex'); }
export function token() { return randomBytes(32).toString('hex'); }
export function normalizePhone(value: unknown) {
  if (typeof value !== 'string' || !/^1[3-9]\d{9}$/.test(value)) throw new AuthError('请输入有效的 11 位手机号', 400);
  return `+86${value}`;
}
export function maskPhone(value: string) { return `${value.slice(0, 6)}****${value.slice(-4)}`; }
export class AuthError extends Error {
  constructor(message: string, public status = 400, public retryAfter?: number) { super(message); }
}
export function requireLocalSms(request: Request) {
  const origin = new URL(request.url);
  // Next.js adds x-forwarded-for from the socket even for direct local requests.
  const forwarded = request.headers.get('x-forwarded-for');
  const localPeer = !forwarded || ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(forwarded.trim());
  if (process.env.NODE_ENV !== 'development' || process.env.AUTH_SMS_MODE !== 'development' || !['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname) || !localPeer || request.headers.has('forwarded')) {
    throw new AuthError('短信服务尚未配置，请稍后再试', 503);
  }
  const code = process.env.AUTH_DEV_CODE;
  if (!code || !/^\d{6}$/.test(code)) throw new AuthError('请先配置本地测试验证码', 503);
  return code;
}
export function requireSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const expected = process.env.APP_ORIGIN || new URL(request.url).origin;
  if (!origin || origin !== expected || request.headers.get('sec-fetch-site') === 'cross-site') throw new AuthError('请求来源无效，请刷新页面重试', 403);
}
