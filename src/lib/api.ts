import { NextResponse } from 'next/server';
import { AuthError, requireSameOrigin } from './auth-policy';
export async function mutation(request: Request, run: () => Promise<unknown>) {
  try { requireSameOrigin(request); return NextResponse.json(await run(), { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { return apiError(error); }
}
export function apiError(error: unknown) {
  if (error instanceof AuthError) return NextResponse.json({ error: error.message, retryAfter: error.retryAfter }, { status: error.status, headers: { 'Cache-Control': 'no-store', ...(error.retryAfter ? { 'Retry-After': String(error.retryAfter) } : {}) } });
  // Never log request bodies, phone numbers, codes or connection credentials.
  const code = (error as { code?: string })?.code;
  console.error('Auth operation failed:', code || 'UNKNOWN');
  return NextResponse.json({ error: '登录服务暂不可用，请检查数据库连接与登录表配置' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
}
export async function jsonBody(request: Request, limit = 1024): Promise<Record<string, unknown>> {
  if (!request.headers.get('content-type')?.includes('application/json')) throw new AuthError('请求格式错误', 415);
  const reader = request.body?.getReader();
  if (!reader) throw new AuthError('请求内容为空');
  let size = 0; const parts: Uint8Array[] = [];
  while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > limit) { await reader.cancel(); throw new AuthError('请求内容过长', 413); } parts.push(value); }
  try { const data = JSON.parse(Buffer.concat(parts).toString('utf8')); if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error(); return data; }
  catch { throw new AuthError('请求格式错误'); }
}
