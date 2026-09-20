'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Brand } from './brand';
import styles from './header-menu.module.css';
import { ProfileDrawer, type ProfileUser } from './profile-drawer';
import { setDiagnosisHistoryOwner } from '@/lib/diagnosis-report';
type User = ProfileUser;
export function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const menu = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function refreshUser() { fetch('/api/auth/me').then(r => r.json()).then(d => { setDiagnosisHistoryOwner(d.user?.id ?? null); setUser(d.user ?? null); }).catch(() => {}); }
    refreshUser();
    window.addEventListener('resumeiq:auth-changed', refreshUser);
    function dismiss(e: MouseEvent) { if (!menu.current?.contains(e.target as Node)) setOpen(false); }
    function escape(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', dismiss); document.addEventListener('keydown', escape);
    return () => { window.removeEventListener('resumeiq:auth-changed', refreshUser); document.removeEventListener('mousedown', dismiss); document.removeEventListener('keydown', escape); };
  }, []);
  async function logout() {
    setBusy(true); setError('');
    try { const r = await fetch('/api/auth/logout', { method: 'POST' }); if (!r.ok) throw new Error(); setDiagnosisHistoryOwner(null); setUser(null); setOpen(false); }
    catch { setError('退出失败，请重试'); } finally { setBusy(false); }
  }
  return <header className="site-header"><Brand />{user ? <div className="account" ref={menu}>
    <button className="avatar" aria-label="打开账号菜单" aria-expanded={open} aria-controls="account-actions" onClick={() => { setOpen(!open); setNotice(''); setError(''); }}>{user.avatarUrl ? <img src={user.avatarUrl} alt="头像" style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:"50%"}} /> : user.nickname.slice(0, 1)}</button>
    {open && <div id="account-actions" className={styles.menu}>
      <Link className={styles.item} href="/history" onClick={() => setOpen(false)}><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 4v5h5M3.8 8A9 9 0 1 1 3 14M12 7v5l3 2" /></svg><span>历史记录</span></Link>
      <button className={styles.item} onClick={() => { setOpen(false); setProfileOpen(true); }}><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="7" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg><span>个人中心</span></button>
      <div className={styles.divider} />
      <button className={`${styles.item} ${styles.logout}`} onClick={logout} disabled={busy}><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4M9 12h12m-5-5 5 5-5 5" /></svg><span>{busy ? '正在退出…' : '退出登录'}</span></button>
      {notice && <p className={styles.feedback} role="status">{notice}</p>}{error && <p className={`${styles.feedback} ${styles.logout}`} role="alert">{error}</p>}
    </div>}
  </div> : <Link className="button button-small" href="/login">登录</Link>}{profileOpen && user && <ProfileDrawer user={user} onClose={() => setProfileOpen(false)} onSaved={setUser} />}</header>;
}

