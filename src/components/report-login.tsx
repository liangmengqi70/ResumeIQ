'use client';
import { useEffect, useRef, useState } from 'react';
import styles from './guest-report.module.css';
import { setDiagnosisHistoryOwner } from '@/lib/diagnosis-report';

export function ReportLogin({ onBack, onSuccess }: { onBack: () => void; onSuccess: () => void }) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [deadline, setDeadline] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const field = useRef<HTMLInputElement>(null);
  const validPhone = /^1[3-9]\d{9}$/.test(phone);
  useEffect(() => { field.current?.focus(); }, [step]);
  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick(); const timer = setInterval(tick, 1000); return () => clearInterval(timer);
  }, [deadline]);

  async function sendCode() {
    if (!validPhone || busy || remaining > 0) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/auth/code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone }) });
      const data = await response.json();
      if (data.retryAfter) setDeadline(Date.now() + data.retryAfter * 1000);
      if (!response.ok) throw new Error(data.error || '获取验证码失败，请重试');
      setDeadline(Date.now() + 60_000); setStep('code'); setNotice(data.message || '验证码已发送，5 分钟内有效');
    } catch (e) { setError(e instanceof Error ? e.message : '网络连接失败，请重试'); }
    finally { setBusy(false); }
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (step === 'phone') { await sendCode(); return; }
    if (busy || !validPhone || !/^\d{6}$/.test(code)) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, code }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '登录失败，请重试');
      setDiagnosisHistoryOwner(data.user.id);
      onSuccess();
    } catch (e) { setError(e instanceof Error ? e.message : '网络连接失败，请重试'); }
    finally { setBusy(false); }
  }
  return <>
    <h2 id="report-dialog-title">{step === 'phone' ? '手机号登录' : '输入验证码'}</h2>
    <p id="report-dialog-description" className={styles.loginDescription}>{step === 'phone' ? '登录后即可查看完整诊断报告' : `请输入 ${phone.slice(0, 3)}****${phone.slice(-4)} 的验证码`}</p>
    <form className={styles.loginForm} onSubmit={submit}>
      <label htmlFor="report-login-field">{step === 'phone' ? '手机号' : '验证码'}</label>
      <input key={step} ref={field} id="report-login-field" type={step === 'phone' ? 'tel' : 'text'} inputMode="numeric" autoComplete={step === 'phone' ? 'tel-national' : 'one-time-code'} maxLength={step === 'phone' ? 11 : 6} value={step === 'phone' ? phone : code} placeholder={step === 'phone' ? '请输入手机号' : '请输入 6 位验证码'} disabled={busy} onChange={e => { const value = e.target.value.replace(/\D/g, ''); if (step === 'phone') setPhone(value); else setCode(value); setError(''); }} />
      {step === 'code' && <button type="button" className={styles.resend} disabled={busy || remaining > 0} onClick={() => void sendCode()}>{remaining > 0 ? `${remaining} 秒后重新发送` : '重新发送验证码'}</button>}
      {(error || notice) && <p className={`${styles.authFeedback}${error ? ` ${styles.authError}` : ''}`} role={error ? 'alert' : 'status'}>{error || notice}</p>}
      <button className={`button upload-next ${styles.primary}`} disabled={busy || !validPhone || (step === 'phone' ? remaining > 0 : !/^\d{6}$/.test(code))}>{busy ? (step === 'phone' ? '发送中…' : '登录中…') : step === 'phone' ? (remaining > 0 ? `${remaining} 秒后重新发送` : '发送验证码') : '登录并查看报告'}</button>
    </form>
    <button className={`${styles.later} ${styles.return}`} disabled={busy} onClick={() => { if (step === 'code') { setStep('phone'); setCode(''); setError(''); setNotice(''); } else onBack(); }}>返回</button>
  </>;
}
