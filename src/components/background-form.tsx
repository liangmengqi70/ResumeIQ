'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DiagnosisFooter } from './diagnosis-footer';
import { diagnosisDraft, type BackgroundAnswers } from '@/lib/diagnosis-draft';
import styles from './background-form.module.css';

const identities = ['在校大学生', '应届毕业生', '社会求职者', '转行求职'];
const applications = ['还没有开始投递', '已投递，但没有收到反馈', '投递后收到过少量反馈', '收到过较多面试机会'];
const difficulties = ['投递后没有回应', '不知道简历哪里有问题', '项目经历竞争力不足', '不知道如何匹配岗位 JD', '缺少相关经验', '想转行，需要重新定位'];
const prompts = ['为什么没有面试', 'ATS 总不过', '项目经历不会写', '简历没有亮点', '想转行'];

export function BackgroundForm() {
  const router = useRouter();
  const [answers, setAnswers] = useState<BackgroundAnswers>({ identity: '', applications: '', difficulties: [], question: '' });
  const [notice, setNotice] = useState('');
  const questionInput = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { setAnswers(diagnosisDraft.background); }, []);
  function update(patch: Partial<BackgroundAnswers>) {
    const next = { ...answers, ...patch }; setAnswers(next); diagnosisDraft.background = next; setNotice('');
  }
  function addPrompt(prompt: string) {
    if (!answers.question.split('\n').includes(prompt)) update({ question: [answers.question, prompt].filter(Boolean).join('\n') });
    questionInput.current?.focus();
  }
  return <>
    <main className={`upload-main ${styles.main}`}>
      <h1 className={styles.title}>帮助 AI 更了解你的求职情况</h1>
      <p className="upload-description">回答几个简单的问题，AI 将结合你的简历、岗位 JD 和求职背景，<br className={styles.break} />为你生成更精准的诊断报告。</p>
      <div className={styles.card}>
        <section className={styles.section}>
          <h2 id="identity-title">当前身份</h2><p>请选择你的当前身份</p>
          <div className={styles.grid} role="radiogroup" aria-labelledby="identity-title">{identities.map(option => <label className={styles.option} key={option}>
            <input type="radio" name="identity" value={option} checked={answers.identity === option} onChange={() => update({ identity: option })} /><span>{option}</span>
          </label>)}</div>
        </section>
        <section className={styles.section}>
          <h2 id="applications-title">你的投递情况</h2><p>请选择你目前的求职状态</p>
          <div className={styles.stack} role="radiogroup" aria-labelledby="applications-title">{applications.map(option => <label className={styles.option} key={option}>
            <input type="radio" name="applications" value={option} checked={answers.applications === option} onChange={() => update({ applications: option })} /><span>{option}</span>
          </label>)}</div>
        </section>
        <section className={styles.section}>
          <h2 id="difficulties-title">你目前最大的求职困难是什么？</h2><p>选择最符合你的情况，可以多选。</p>
          <div className={styles.grid} role="group" aria-labelledby="difficulties-title">{difficulties.map(option => <label className={styles.option} key={option}>
            <input type="checkbox" checked={answers.difficulties.includes(option)} onChange={event => update({ difficulties: event.target.checked ? [...answers.difficulties, option] : answers.difficulties.filter(item => item !== option) })} /><span>{option}</span>
          </label>)}</div>
        </section>
        <section className={styles.section}>
          <h2><label htmlFor="background-question">告诉 AI，你最希望解决什么问题</label></h2><p id="question-help">描述你的具体困惑，AI 会结合你的简历和岗位要求进行针对性分析。</p>
          <textarea ref={questionInput} id="background-question" aria-describedby="question-help" className={styles.question} value={answers.question} onChange={event => update({ question: event.target.value })} placeholder={'例如：\n为什么一直没有收到面试？\n我的项目经历是不是竞争力不足？\n我的简历和岗位要求匹配吗？'} />
          <div className={styles.prompts}>{prompts.map(prompt => <button type="button" key={prompt} onClick={() => addPrompt(prompt)}># {prompt}</button>)}</div>
        </section>
      </div>
      <p className="upload-feedback" role="status">{notice}</p>
    </main>
    <DiagnosisFooter back="/jd" label="AI 诊断" disabled={false} onNext={() => router.push('/analysis')} />
    <p className={styles.privacy}><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>你的信息仅用于生成本次简历诊断，我们将按照隐私说明妥善处理和保护相关数据。</p>
  </>;
}
