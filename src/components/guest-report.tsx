'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ReportLogin } from './report-login';
import { DiagnosticReport } from './diagnostic-report';
import { loadDiagnosisReport, type DiagnosisReport } from '@/lib/diagnosis-report';
import styles from './guest-report.module.css';

export function GuestReport() {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const unlock = useRef<HTMLButtonElement>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [report, setReport] = useState<DiagnosisReport | null>(null);
  async function recordView(current: DiagnosisReport) {
    await fetch('/api/diagnosis/report/view', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reportId: current.id }),
    }).catch(() => undefined);
  }
  useEffect(() => {
    let active = true;
    const storedReport = loadDiagnosisReport();
    if (!storedReport) { router.replace('/upload'); return () => { active = false; }; }
    setReport(storedReport);
    fetch('/api/auth/me').then(response => response.json()).then(data => {
      if (!active) return;
      setSignedIn(Boolean(data.user));
      if (data.user) void recordView(storedReport);
      else dialog.current?.showModal();
    }).catch(() => { if (active) dialog.current?.showModal(); });
    return () => { active = false; dialog.current?.close(); };
  }, [router]);
  function close() { dialog.current?.close(); setLoginOpen(false); unlock.current?.focus({ preventScroll: true }); }
  if (!report) return <main className={styles.main} aria-busy="true" />;
  return <main className={`${styles.main}${signedIn ? ` ${styles.unlockedMain}` : ''}`}>
    {!signedIn && <div className={styles.heading}><div><h1>AI 诊断报告</h1><p>分析完成 · 报告将在 10 天内为你保留</p></div><span className={styles.badge}><i />待解锁</span></div>}
    <div className={styles.reportBody}>
    <div className={signedIn ? undefined : styles.lockedReport} aria-hidden={!signedIn} inert={!signedIn}><DiagnosticReport report={report} showIntro={signedIn} /></div>
    <div className={styles.unlock}>
      {!signedIn && <><span className={styles.lock} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><rect x="4" y="10" width="16" height="12" rx="1.5" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg></span><button ref={unlock} className={`button upload-next ${styles.primary}`} onClick={() => { setLoginOpen(true); dialog.current?.showModal(); }}>登录查看完整报告</button></>}
    </div>
    </div>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="report-dialog-title" aria-describedby="report-dialog-description" onCancel={event => { event.preventDefault(); close(); }}>
      <button className={styles.close} aria-label="关闭登录提示" onClick={close}><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 5 14 14M19 5 5 19" /></svg></button>
      {loginOpen ? <ReportLogin onBack={() => setLoginOpen(false)} onSuccess={() => { setSignedIn(true); void recordView(report); close(); window.dispatchEvent(new Event('resumeiq:auth-changed')); }} /> : <><h2 id="report-dialog-title">诊断报告已生成</h2>
      <p id="report-dialog-description">登录后即可查看完整的 AI HR 初筛结论、关键问题、原文证据和修改建议。本次诊断结果将在 10 天内为你保留。</p>
      <button autoFocus onClick={() => setLoginOpen(true)} className={`button upload-next ${styles.primary}`}>手机号登录并查看报告</button>
      <button className={styles.later} onClick={close}>暂不登录</button></>}
    </dialog>
  </main>;
}
