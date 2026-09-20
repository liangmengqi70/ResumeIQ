'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GuestButton } from './guest-button';
import { setDiagnosisHistoryOwner } from '@/lib/diagnosis-report';
export function LoginForm() {
  const router = useRouter();
  const [phone, setPhone] = useState(''); const [code, setCode] = useState('');
  const [deadline, setDeadline] = useState(0); const [remaining, setRemaining] = useState(0);
  const [sending, setSending] = useState(false); const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const validPhone = /^1[3-9]\d{9}$/.test(phone);
  useEffect(() => { const tick = () => setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000))); tick(); const timer = setInterval(tick, 1000); return () => clearInterval(timer); }, [deadline]);
  async function sendCode() {
    setSending(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/auth/code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone }) });
      const data = await response.json();
      if (data.retryAfter) setDeadline(Date.now() + data.retryAfter * 1000);
      if (!response.ok) throw new Error(data.error || '获取验证码失败');
      setDeadline(Date.now() + 60_000); setNotice(data.message || '验证码已发送，5 分钟内有效');
    } catch (e) { setError(e instanceof Error ? e.message : '网络连接失败，请重试'); }
    finally { setSending(false); }
  }
  async function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!validPhone || !/^\d{6}$/.test(code) || submitting) return;
    setSubmitting(true); setError('');
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, code }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || '登录失败');
      setDiagnosisHistoryOwner(data.user.id);
      router.replace('/'); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : '网络连接失败，请重试'); setSubmitting(false); }
  }
  return <><form onSubmit={login} className="login-form">
    <div className="phone-field"><span className="country-code">+86</span><label className="sr-only" htmlFor="phone">手机号</label><input id="phone" name="phone" type="tel" autoComplete="tel-national" inputMode="numeric" maxLength={11} placeholder="请输入手机号" value={phone} onChange={e => { setPhone(e.target.value.replace(/\D/g, '')); setError(''); setNotice(''); }} required disabled={submitting || sending} /></div>
    <div className="code-row"><label className="sr-only" htmlFor="code">验证码</label><input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="验证码" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} required disabled={submitting} />
      <button type="button" className="code-button" onClick={sendCode} disabled={!validPhone || sending || submitting || remaining > 0}>{sending ? '获取中…' : remaining > 0 ? `${remaining} 秒后重试` : '获取验证码'}</button></div>
    <div className="form-feedback" aria-live="polite">{error ? <p className="form-error" role="alert">{error}</p> : notice ? <p>{notice}</p> : null}</div>
    <button className="button login-submit" disabled={!validPhone || !/^\d{6}$/.test(code) || submitting || sending}>{submitting ? '正在登录…' : '登录'}</button>
  </form><GuestButton compact /></>;
}
