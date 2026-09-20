import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhone, maskPhone, requireLocalSms, requireSameOrigin, hash, token } from '../src/lib/auth-policy';
test('phone validation rejects malformed or unsupported login identifiers', () => {
  assert.equal(normalizePhone('13800000000'), '+8613800000000');
  for (const value of [null, 13800000000, '1380000000', '12800000000', 'test@example.com', "' OR 1=1"]) assert.throws(() => normalizePhone(value));
  assert.equal(maskPhone('+8613800000000'), '+86138****0000');
});
test('mutations reject absent and cross-site origins', () => {
  process.env.APP_ORIGIN = 'http://127.0.0.1:3000';
  assert.throws(() => requireSameOrigin(new Request('http://127.0.0.1:3000/api/auth/login')));
  assert.throws(() => requireSameOrigin(new Request('http://127.0.0.1:3000/api/auth/login', { headers: { origin: 'https://evil.example' } })));
  assert.doesNotThrow(() => requireSameOrigin(new Request('http://127.0.0.1:3000/api/auth/login', { headers: { origin: 'http://127.0.0.1:3000' } })));
});
test('fixed test code is disabled in production, on public hosts and forwarded requests', () => {
  const previous = { ...process.env };
  try {
    Object.assign(process.env, { NODE_ENV: 'development', AUTH_SMS_MODE: 'development', AUTH_DEV_CODE: '123456' });
    assert.equal(requireLocalSms(new Request('http://127.0.0.1:3000')), '123456');
    assert.equal(requireLocalSms(new Request('http://127.0.0.1:3000', { headers: { 'x-forwarded-for': '127.0.0.1' } })), '123456');
    assert.throws(() => requireLocalSms(new Request('http://127.0.0.1:3000', { headers: { 'x-forwarded-for': '1.2.3.4, 127.0.0.1' } })));
    assert.throws(() => requireLocalSms(new Request('https://resumeiq.example')));
    assert.throws(() => requireLocalSms(new Request('http://127.0.0.1:3000', { headers: { 'x-forwarded-for': '1.2.3.4' } })));
    Object.assign(process.env, { NODE_ENV: 'production' });
    assert.throws(() => requireLocalSms(new Request('http://127.0.0.1:3000')));
  } finally { process.env = previous; }
});
test('session tokens are random and stored as hashes', () => { const a = token(), b = token(); assert.equal(a.length, 64); assert.notEqual(a, b); assert.notEqual(hash(a), a); assert.equal(hash(a).length, 64); });
