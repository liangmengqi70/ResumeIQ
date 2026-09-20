'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './profile-drawer.module.css';
export type ProfileUser = { id: string; nickname: string; phone: string; avatarUrl?: string | null; registeredAt?: string; lastLoginAt?: string };

function formatDateTime(value?: string) {
  if (!value) return '—';
  const date = new Date(value.endsWith('Z') ? value : `${value.replace(' ', 'T')}Z`);
  if (Number.isNaN(date.getTime())) return value.replace('T', ' ').slice(0, 19);
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(date).replaceAll('/', '-');
}
export function ProfileDrawer({ user, onClose, onSaved }: { user: ProfileUser; onClose: () => void; onSaved: (user: ProfileUser) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [nickname, setNickname] = useState(user.nickname);
  const [avatar, setAvatar] = useState<string | null>(user.avatarUrl || null);
  const [source, setSource] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [x, setX] = useState(50);
  const [y, setY] = useState(50);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const dirty = nickname !== user.nickname || avatar !== (user.avatarUrl || null);
  const count = [...nickname.trim()].length;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  useEffect(() => { if (!success) return; const timer = setTimeout(() => setSuccess(false), 2800); return () => clearTimeout(timer); }, [success]);
  useEffect(() => {
    if (!source || !canvas.current) return;
    const size = Math.min(source.naturalWidth, source.naturalHeight) / zoom;
    canvas.current.getContext('2d')?.drawImage(source, (source.naturalWidth-size)*x/100, (source.naturalHeight-size)*y/100, size, size, 0, 0, 256, 256);
  }, [source, zoom, x, y]);
  async function choose(file?: File) {
    if (!file) return;
    setError('');
    if (!['image/jpeg','image/png'].includes(file.type) || file.size > 5*1024*1024) { setError('请选择不超过 5MB 的 JPG 或 PNG 图片'); return; }
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.src = url;
    try { await image.decode(); setSource(image); setZoom(1); setX(50); setY(50); }
    catch { setError('图片无法读取，请重新选择'); }
    finally { URL.revokeObjectURL(url); }
  }
  async function save() {
    setBusy(true); setError(''); setSuccess(false);
    try {
      const response = await fetch('/api/profile', { method:'PATCH', headers:{'content-type':'application/json'}, body:JSON.stringify({ nickname, ...(avatar !== (user.avatarUrl || null) ? { avatar } : {}) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '保存失败，请重试');
      onSaved(result.user); setNickname(result.user.nickname); setAvatar(result.user.avatarUrl || null); setSuccess(true);
      window.dispatchEvent(new Event('resumeiq:auth-changed'));
    } catch (error) { setError(error instanceof Error ? error.message : '保存失败，请重试'); }
    finally { setBusy(false); }
  }
  return createPortal(<dialog ref={dialog} className={styles.drawer} aria-labelledby="profile-title" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }} onClick={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <div className={styles.shell}>
      <div className={styles.top}><h2 id="profile-title">个人中心</h2><button className={styles.close} aria-label="关闭个人中心" disabled={busy} onClick={onClose}>×</button></div>
      <div className={styles.body}>
        <div className={styles.avatarArea}><div className={styles.avatar}>{avatar ? <img src={avatar} alt="头像" /> : [...nickname][0] || '用'}</div>
          <button className={styles.change} disabled={busy} onClick={() => fileInput.current?.click()}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg> 更换头像</button>
          <input ref={fileInput} type="file" hidden accept="image/jpeg,image/png" onChange={event => { void choose(event.target.files?.[0]); event.target.value=''; }} />
          {avatar && <button className={styles.restore} disabled={busy} onClick={() => { setAvatar(null); setSource(null); }}>恢复默认头像</button>}<p className={styles.hint}>支持 JPG、PNG，最大 5MB</p>
        </div>
        {source && <section className={styles.crop} aria-label="头像裁剪"><canvas ref={canvas} width={256} height={256} /><label>缩放<input aria-label="缩放" type="range" min="1" max="3" step=".01" value={zoom} onChange={e=>setZoom(Number(e.target.value))}/></label><label>左右<input aria-label="左右" type="range" value={x} onChange={e=>setX(Number(e.target.value))}/></label><label>上下<input aria-label="上下" type="range" value={y} onChange={e=>setY(Number(e.target.value))}/></label><button onClick={()=>{setAvatar(canvas.current!.toDataURL('image/png'));setSource(null);}}>使用此头像</button><button onClick={()=>setSource(null)}>取消裁剪</button></section>}
        <div className={styles.form}>
          <label className={styles.field}>昵称<div className={styles.inputWrap}><input value={nickname} disabled={busy} aria-invalid={count<2 || count>20} onChange={e=>setNickname(e.target.value)} /><span>{[...nickname].length}/20</span></div>{(count<2 || count>20) && <span>昵称需要 2～20 个字符</span>}</label>
          <div className={styles.field}>手机号<div className={styles.readonly}>{user.phone}</div></div>
          <div className={styles.field}>最近登录时间<div className={styles.date}>{formatDateTime(user.lastLoginAt)}</div></div>
        </div>
        {error && <p className={styles.error} role="alert">{error}</p>}{success && <p className={styles.success} role="status">个人资料已更新</p>}
      </div>
      {dirty && <div className={styles.footer}><button disabled={busy} onClick={()=>{setNickname(user.nickname);setAvatar(user.avatarUrl||null);setSource(null);setError('');}}>取消</button><button className={styles.save} disabled={busy || !!source || count<2 || count>20} onClick={()=>void save()}>{busy?'正在保存…':'保存修改'}</button></div>}
    </div>
  </dialog>, document.body);
}

