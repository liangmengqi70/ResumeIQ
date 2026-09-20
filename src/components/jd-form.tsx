'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DiagnosisFooter } from './diagnosis-footer';
import { diagnosisDraft } from '@/lib/diagnosis-draft';
import styles from './jd-form.module.css';

const example = `岗位名称：前端开发工程师

岗位职责：
1. 负责 Web 产品的页面开发、交互实现与维护。
2. 与产品、设计及后端团队协作，完成需求交付。
3. 持续优化页面性能、可访问性和跨设备体验。

任职要求：
1. 熟悉 HTML、CSS、JavaScript 和 TypeScript。
2. 熟悉 React，具备组件设计和状态管理经验。
3. 熟悉 Git，具备良好的代码规范和团队沟通能力。
4. 有实际项目经验，能够独立定位和解决问题。`;

export function JdForm() {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => { setValue(diagnosisDraft.jd); }, []);
  function update(text: string) { const next = text.slice(0, 5000); setValue(next); diagnosisDraft.jd = next; setNotice(''); }
  return <>
    <main className="upload-main">
      <h1>输入目标岗位 JD</h1>
      <p className="upload-description">复制并粘贴招聘岗位描述，AI 将结合岗位要求分析你的简历。</p>
      <div className={styles.card}>
        <label className="sr-only" htmlFor="job-description">目标岗位 JD</label>
        <textarea id="job-description" className={styles.input} placeholder="请粘贴岗位 JD……" value={value} onChange={event => update(event.target.value)} maxLength={5000} aria-describedby="jd-count" />
        <div id="jd-count" className={styles.count}>{value.length.toLocaleString()} / 5,000</div>
        <div className={styles.toolbar}><span>支持粘贴任意招聘平台的 JD 原文</span><button type="button" onClick={() => update(example)}>使用示例 JD</button></div>
      </div>
      <div className="upload-feedback" role="status">{notice}</div>
    </main>
    <DiagnosisFooter back="/upload" disabled={!value.trim()} onNext={() => router.push('/background')} />
  </>;
}
