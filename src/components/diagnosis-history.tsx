'use client';
import { ButtonArrow } from './button-arrow';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  setCurrentDiagnosisReport,
  setDiagnosisHistoryOwner,
  type DiagnosisHistoryRecord,
  type Verdict,
} from '@/lib/diagnosis-report';
import styles from './diagnosis-history.module.css';

const verdictLabels: Record<Verdict, string> = { recommended: '推荐', concern: '存在顾虑', rejected: '不推荐' };

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const parts = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Shanghai',
  }).formatToParts(date).reduce<Record<string, string>>((result, part) => ({ ...result, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

function FileIcon({ small = false }: { small?: boolean }) {
  return <svg width={small ? 14 : 20} height={small ? 14 : 20} viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M5 2.5h7L15.5 6v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1Z" /><path d="M12 2.5V6h3.5M7 10h6M7 13h4" /></svg>;
}

export function DiagnosisHistory() {
  const router = useRouter();
  const [records, setRecords] = useState<DiagnosisHistoryRecord[]>([]);
  const [ready, setReady] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<DiagnosisHistoryRecord | null>(null);
  const [toast, setToast] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/auth/me').then(response => response.json())
      .then(async auth => {
        if (!active) return;
        if (!auth.user) { router.replace('/login'); return; }
        setDiagnosisHistoryOwner(auth.user.id);
        const response = await fetch('/api/diagnosis/history', { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || '历史记录加载失败');
        if (active) { setRecords(data.records || []); setReady(true); }
      }).catch(() => { if (active) router.replace('/login'); });
    return () => { active = false; if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, [router]);

  useEffect(() => {
    if (!pendingDelete) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setPendingDelete(null); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [pendingDelete]);

  function goBack() {
    if (window.history.length > 1) router.back();
    else router.push('/');
  }

  function openReport(record: DiagnosisHistoryRecord) {
    setCurrentDiagnosisReport(record.report);
    router.push('/report');
  }

  async function confirmDelete() {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    try {
      const response = await fetch('/api/diagnosis/history', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: pendingDelete.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '删除失败');
      setRecords(current => current.filter(item => item.id !== pendingDelete.id));
      setPendingDelete(null);
      setToast(true);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(false), 2800);
    } finally { setDeleting(false); }
  }

  if (!ready) return <main className={styles.main} aria-busy="true" />;

  return <main className={styles.main}>
    <div className={styles.content}>
      <button type="button" className={styles.back} onClick={goBack}><ButtonArrow direction="left" />返回</button>
      <header className={styles.heading}>
        <h1>历史记录</h1>
        <p>查看你已完成的简历诊断报告</p>
        <span>共 {records.length} 条诊断记录</span>
      </header>

      {records.length > 0 ? <div className={styles.list}>
        {records.map(record => <article className={styles.card} key={record.id}>
          <span className={styles.fileIcon}><FileIcon /></span>
          <div className={styles.info}>
            <h2 title={record.fileName}>{record.fileName}</h2>
            <div className={styles.meta}><span>目标岗位：<strong>{record.report.targetRole}</strong></span><span className={`${styles.verdict} ${styles[record.report.verdict]}`}><i />{verdictLabels[record.report.verdict]}</span></div>
            <div className={styles.times}><span>上传时间：{formatTime(record.uploadedAt)}</span><span>诊断完成时间：{formatTime(record.completedAt)}</span></div>
          </div>
          <div className={styles.actions}><button type="button" className={styles.view} onClick={() => openReport(record)}>查看报告</button><button type="button" className={styles.delete} onClick={() => setPendingDelete(record)}>删除记录</button></div>
        </article>)}
      </div> : <section className={styles.empty}>
        <svg width="52" height="52" viewBox="0 0 52 52" fill="none" aria-hidden="true"><rect x="10" y="6" width="28" height="36" rx="3" /><path d="M18 6v3a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V6M18 22h12M18 28h8" /><circle cx="36" cy="36" r="8" /><path d="M33 36h6M36 33v6" /></svg>
        <h2>暂无诊断记录</h2><p>完成一次简历诊断后，报告会保存在这里。</p><Link href="/upload" className={styles.start}>开始简历诊断</Link>
      </section>}
    </div>

    {pendingDelete && <div className={styles.overlay} onMouseDown={event => { if (event.target === event.currentTarget) setPendingDelete(null); }}>
      <section className={styles.dialog} role="alertdialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-description">
        <button type="button" className={styles.close} aria-label="关闭" disabled={deleting} onClick={() => setPendingDelete(null)}>×</button>
        <h2 id="delete-title">删除诊断记录？</h2><p id="delete-description">删除后将无法查看这份诊断报告，且无法恢复。</p>
        <div className={styles.fileChip}><FileIcon small />{pendingDelete.fileName}</div>
        <div className={styles.dialogActions}><button type="button" autoFocus disabled={deleting} onClick={() => setPendingDelete(null)}>取消</button><button type="button" className={styles.confirm} disabled={deleting} onClick={() => void confirmDelete()}>{deleting ? '正在删除…' : '确认删除'}</button></div>
      </section>
    </div>}
    <div className={`${styles.toast} ${toast ? styles.toastVisible : ''}`} role="status">诊断记录已删除</div>
  </main>;
}

