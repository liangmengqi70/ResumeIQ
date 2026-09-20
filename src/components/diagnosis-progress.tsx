import { Fragment } from 'react';

const steps = ['上传简历', '输入JD', '背景调查', 'AI分析', '诊断报告'];

export function DiagnosisProgress({ current = 0 }: { current?: number }) {
  return <nav className="diagnosis-progress" aria-label="诊断进度">
    <ol>{steps.map((step, index) => <Fragment key={step}>
      <li className={index < current ? 'step-complete' : undefined} aria-current={index === current ? 'step' : undefined}>
        <span className="step-number">{index < current ? <svg viewBox="0 0 24 24" fill="none" aria-label="已完成"><path d="m6 12 4 4 8-8" /></svg> : index + 1}</span><span>{step}</span>
      </li>
      {index < steps.length - 1 && <span className={`step-connector${index < current ? ' connector-complete' : ''}`} aria-hidden="true" />}
    </Fragment>)}</ol>
  </nav>;
}
