'use client';
import { ButtonArrow } from './button-arrow';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export function GuestButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function enter() {
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/auth/guest', { method: 'POST' }); const data = await response.json();
      if (!response.ok) throw new Error(data.error || '暂时无法开始，请重试');
      router.push('/upload');
    } catch (error) { setMessage(error instanceof Error ? error.message : '网络连接失败，请重试'); }
    finally { setBusy(false); }
  }
  return <div className={compact ? 'guest-entry' : 'start-entry'}><button onClick={enter} disabled={busy} className={compact ? 'text-button' : 'button button-hero'}>
    {busy ? '正在准备…' : compact ? '游客体验' : '开始诊断'}{!compact && <ButtonArrow />}
  </button>{message && <p className="entry-message" role="status">{message}</p>}</div>;
}

