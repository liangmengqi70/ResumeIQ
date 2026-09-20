'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { DiagnosisProblem, DiagnosisReport, Impact, Verdict } from '@/lib/diagnosis-report';
import styles from './diagnostic-report.module.css';

const impactLabels: Record<Impact, string> = { high: '高影响', mid: '中影响', low: '低影响' };
const verdictLabels: Record<Verdict, string> = { recommended: '推荐', concern: '存在顾虑', rejected: '不推荐' };
const verdicts: Verdict[] = ['recommended', 'concern', 'rejected'];

function ProblemCard({ problem, initiallyOpen }: { problem: DiagnosisProblem; initiallyOpen: boolean }) {
  const [open, setOpen] = useState(initiallyOpen);
  const panelId = `problem-${problem.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  return <article className={styles.problem}>
    <button type="button" className={styles.problemToggle} aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(value => !value)}>
      <span className={styles.problemHeading}><span className={`${styles.impact} ${styles[problem.impact]}`}>{impactLabels[problem.impact]}</span><strong>{problem.title}</strong><span>{problem.summary}</span></span>
      <svg className={open ? styles.chevronOpen : ''} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>
    </button>
    {open && <div className={styles.problemDetails} id={panelId}>
      <div className={styles.comparison}><div><h3>简历原文</h3><p>“{problem.resumeQuote}”</p></div><div><h3>JD 要求</h3><p>“{problem.jdRequirement}”</p></div></div>
      <div className={styles.explanation}><h3>为什么会影响初筛</h3><p>{problem.whyMatters}</p></div>
      <div className={styles.explanation}><h3>具体修改建议</h3><p>{problem.suggestion}</p></div>
      <div className={styles.rewrite}><div><h3>参考改写</h3><span>仅供参考</span></div><p>{problem.rewrite}</p></div>
    </div>}
  </article>;
}

export function DiagnosticReport({ report, showIntro = true }: { report: DiagnosisReport; showIntro?: boolean }) {
  return <div className={styles.report}>
    {showIntro && <header className={styles.intro}><h1>你的简历诊断报告</h1><p>目标岗位：<strong>{report.targetRole}</strong></p></header>}
    <section className={styles.section} aria-labelledby="verdict-title"><h2 id="verdict-title">AI HR 初筛结论</h2><div className={styles.statuses} aria-label={`当前初筛结论：${verdictLabels[report.verdict]}`}>{verdicts.map(verdict => <span key={verdict} className={verdict === report.verdict ? `${styles.current} ${styles[verdict]}` : undefined}><i />{verdictLabels[verdict]}</span>)}</div><p className={`${styles.verdict} ${styles[report.verdict]}`}>{report.verdictSummary}</p></section>
    <section className={styles.section} aria-labelledby="problems-title"><div className={styles.sectionHeading}><h2 id="problems-title">为什么是这个结论</h2><span>按影响程度从高到低排列</span></div><div className={styles.problemList}>{report.problems.map((problem, index) => <ProblemCard key={problem.id} problem={problem} initiallyOpen={index === 0} />)}</div></section>
    <section className={styles.section} aria-labelledby="strengths-title"><h2 id="strengths-title">你的简历优势</h2><div className={styles.strengths}>{report.strengths.map(strength => <article key={strength.id}><span aria-hidden="true"><svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="m2 5 2 2 4-3.5" /></svg></span><div><h3>{strength.title}</h3><p>{strength.detail}</p></div></article>)}</div></section>
    {showIntro && <footer className={styles.footer}><Link href="/" className={styles.home}><svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="m9 11-4-4 4-4" /></svg>返回首页</Link></footer>}
  </div>;
}
