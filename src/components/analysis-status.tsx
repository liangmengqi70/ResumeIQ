'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './analysis-status.module.css';
import { ResumeScanIllustration } from './resume-scan-illustration';
import { diagnosisDraft } from '@/lib/diagnosis-draft';
import { isDiagnosisReport, saveDiagnosisReport } from '@/lib/diagnosis-report';

type Status = 'loading' | 'failed';
const minimumLoadingMs = 3200;
type AnalysisResponse = { ok: boolean; data: Record<string, unknown> };
let pendingAnalysis: Promise<AnalysisResponse> | null = null;

function requestAnalysis(form: FormData) {
  if (!pendingAnalysis) {
    pendingAnalysis = fetch('/api/diagnosis/analyze', { method: 'POST', body: form })
      .then(async response => ({ ok: response.ok, data: await response.json().catch(() => ({})) }))
      .finally(() => { pendingAnalysis = null; });
  }
  return pendingAnalysis;
}

export function AnalysisStatus() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState('');
  const requestId = useRef(0);

  const analyze = useCallback(async () => {
    const current = ++requestId.current;
    setStatus('loading'); setError('');
    const started = Date.now();
    let failure = '分析结果暂不可用，请稍后重试或返回修改信息。';
    let report: unknown = null;
    try {
      const form = new FormData();
      if (diagnosisDraft.file) form.set('resume', diagnosisDraft.file);
      form.set('jd', diagnosisDraft.jd);
      form.set('background', JSON.stringify(diagnosisDraft.background));
      const response = await requestAnalysis(form);
      if (response.ok) {
        const data = response.data;
        if (data.status === 'completed' && isDiagnosisReport(data.report)) report = data.report;
        else failure = typeof data.error === 'string' ? data.error : '分析结果格式不完整，请重新分析。';
      } else {
        const data = response.data;
        failure = typeof data.error === 'string' ? data.error : '分析暂时失败，请稍后重试或返回修改信息。';
      }
    } catch {
      failure = '连接分析服务失败，请检查网络后重试。';
    }
    await new Promise(resolve => setTimeout(resolve, Math.max(0, minimumLoadingMs - (Date.now() - started))));
    if (current !== requestId.current) return;
    if (isDiagnosisReport(report)) {
      saveDiagnosisReport(report, {
        fileName: diagnosisDraft.file?.name,
        uploadedAt: new Date(started).toISOString(),
      });
      router.replace('/report');
      return;
    }
    setError(failure);
    setStatus('failed');
  }, [router]);

  useEffect(() => { void analyze(); return () => { requestId.current++; }; }, [analyze]);
  return <main className={styles.main}>
    <div className={`${styles.loading}${status === 'failed' ? ` ${styles.loadingHidden}` : ''}`} aria-hidden={status === 'failed'}>
      <div className={styles.documentFrame} aria-hidden="true">
        <div className={styles.document}>
          <ResumeScanIllustration />
        </div>
      </div>
      <h1 className={styles.heading} role="status" aria-label="AI HR 正在分析中"><span>AI HR 正在分析中</span><span className={styles.dots} aria-hidden="true"><i /><i /><i /></span></h1>
      <p className={styles.keepOpen}><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>请保持页面打开，分析结束后会显示结果。</p>
    </div>
    {status === 'failed' && <div className={styles.backdrop}>
      <section className={styles.dialog} role="alertdialog" aria-modal="true" aria-labelledby="analysis-title" aria-describedby="analysis-message">
        <span className={styles.icon} aria-hidden="true">!</span>
        <h2 id="analysis-title">分析失败</h2>
        <p id="analysis-message">{error}</p>
        <div className={styles.actions}>
          <button type="button" className={`button upload-next ${styles.retry}`} onClick={() => void analyze()}>重新分析</button>
          <Link href="/background" className={styles.back}>返回修改</Link>
        </div>
      </section>
    </div>}
  </main>;
}
