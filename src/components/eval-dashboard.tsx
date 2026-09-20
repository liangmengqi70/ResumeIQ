'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CurrencyCode, EvalCase, EvalRun, ProviderId, ResolvedModelConfig, ScoreKey } from '@/eval-tool/types';
import { scoreKeys } from '@/eval-tool/types';
import { DiagnosticReport } from './diagnostic-report';
import styles from './eval-dashboard.module.css';

type PublicModel = Omit<ResolvedModelConfig, 'keyEnv'> & { keyEnv: string };
type Payload = { cases: EvalCase[]; models: PublicModel[]; runs: EvalRun[] };
const scoreLabels: Record<ScoreKey, string> = {
  issueIdentification: '关键问题识别', jdMatch: 'JD 匹配判断', factualFaithfulness: '事实忠实度',
  explanationQuality: '诊断解释质量', suggestionQuality: '优化建议质量', stability: '输出稳定性',
};

function formatNumber(value: number | null) { return value === null ? '—' : value.toLocaleString(); }
function formatCost(value: number | null, currency: CurrencyCode) {
  if (value === null) return '—';
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency, minimumFractionDigits: 6, maximumFractionDigits: 6 }).format(value);
}

export function EvalDashboard() {
  const [data, setData] = useState<Payload>({ cases: [], models: [], runs: [] });
  const [caseId, setCaseId] = useState('');
  const [providers, setProviders] = useState<ProviderId[]>([]);
  const [repeatCount, setRepeatCount] = useState(3);
  const [activeProvider, setActiveProvider] = useState<'all' | ProviderId>('all');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const refresh = useCallback(async () => {
    const response = await fetch('/api/eval', { cache: 'no-store' });
    const next = await response.json() as Payload;
    setData(next); setCaseId(value => value || next.cases[0]?.id || '');
    setProviders(value => value.length ? value : next.models.filter(model => model.configured).map(model => model.provider));
  }, []);
  useEffect(() => { refresh().catch(() => setMessage('评测数据加载失败')); }, [refresh]);

  const selectedCase = data.cases.find(item => item.id === caseId);
  const visibleRuns = data.runs.filter(run => run.caseId === caseId && (activeProvider === 'all' || run.provider === activeProvider));
  const comparison = useMemo(() => data.models.map(model => {
    const runs = data.runs.filter(run => run.caseId === caseId && run.provider === model.provider);
    const successful = runs.filter(run => run.success);
    const schemaValid = successful.filter(run => run.schemaValid);
    const reviewed = runs.filter(run => run.review);
    const scoreValues = reviewed.flatMap(run => scoreKeys.map(key => run.review!.scores[key]));
    const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
    const inputs = successful.flatMap(run => run.usage.input === null ? [] : [run.usage.input]);
    const outputs = successful.flatMap(run => run.usage.output === null ? [] : [run.usage.output]);
    const totals = successful.flatMap(run => run.usage.total === null ? [] : [run.usage.total]);
    const costs = successful.flatMap(run => run.estimatedCost === null ? [] : [run.estimatedCost]);
    return {
      ...model,
      count: runs.length,
      successRate: runs.length ? successful.length / runs.length : null,
      schemaRate: successful.length ? schemaValid.length / successful.length : null,
      latency: average(successful.map(run => run.latencyMs)),
      inputTokens: average(inputs), outputTokens: average(outputs), totalTokens: average(totals),
      costPerCall: average(costs), totalCost: costs.length ? costs.reduce((sum, value) => sum + value, 0) : null,
      score: scoreValues.length ? scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length : null,
    };
  }), [caseId, data.models, data.runs]);

  async function startRun() {
    if (!caseId || !providers.length) return;
    setBusy(true); setMessage('评测运行中，请保持页面打开…');
    try {
      const response = await fetch('/api/eval/run', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ caseId, providers, repeatCount }) });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || '运行失败');
      await refresh(); setMessage('本轮评测已完成，单个模型失败不会影响其他记录。');
    } catch (error) { setMessage(error instanceof Error ? error.message : '运行失败'); }
    finally { setBusy(false); }
  }

  function toggleProvider(provider: ProviderId) {
    setProviders(current => current.includes(provider) ? current.filter(item => item !== provider) : [...current, provider]);
  }

  return <div className={styles.page}>
    <header className={styles.header}>
      <a href="/" className={styles.brand}><span>R</span>ResumeIQ</a>
      <div><strong>LLM Model Eval</strong><span>V0.2</span></div>
    </header>
    <main className={styles.main}>
      <section className={styles.hero}>
        <div><p className={styles.eyebrow}>INTERNAL EVALUATION TOOL</p><h1>简历诊断模型评测</h1><p>用同一组 Resume、JD、Background、Prompt 和 JSON Schema 横向记录模型表现。</p></div>
        <a className={styles.export} href="/api/eval/export">导出 CSV</a>
      </section>

      <section className={styles.setup}>
        <div className={styles.field}><label htmlFor="eval-case">测试 Case</label><select id="eval-case" value={caseId} onChange={event => setCaseId(event.target.value)}>{data.cases.map(item => <option key={item.id} value={item.id}>{item.id} · {item.title}</option>)}</select></div>
        <div className={styles.field}><label htmlFor="repeat">重复次数</label><select id="repeat" value={repeatCount} onChange={event => setRepeatCount(Number(event.target.value))}><option value={1}>1 次</option><option value={2}>2 次</option><option value={3}>3 次</option></select></div>
        <div className={styles.models}>{data.models.map(model => <label key={model.provider} className={model.configured ? styles.model : styles.modelDisabled}><input type="checkbox" checked={providers.includes(model.provider)} disabled={!model.configured || busy} onChange={() => toggleProvider(model.provider)} /><span><strong>{model.label}</strong><small>{model.configured ? model.modelId : `待配置 ${model.keyEnv} + ${model.modelEnv}`}</small></span><i>{model.configured ? '已就绪' : '未配置'}</i></label>)}</div>
        <button className={styles.runButton} disabled={busy || !providers.length} onClick={startRun}>{busy ? '运行中…' : `运行评测 × ${repeatCount}`}</button>
        {message && <p className={styles.message} role="status">{message}</p>}
      </section>

      {selectedCase && <section className={styles.casePanel}>
        <div className={styles.sectionTitle}><div><span>CASE CONTEXT</span><h2>{selectedCase.title}</h2></div><code>{selectedCase.id}</code></div>
        <div className={styles.contextGrid}><Context title="Resume" text={selectedCase.resume} /><Context title="JD" text={selectedCase.jd} /><Context title="Synthetic Background" text={selectedCase.background} /></div>
      </section>}

      <section className={styles.comparison}>
        <div className={styles.sectionTitle}><div><span>COMPARISON</span><h2>模型横向数据</h2></div><p>仅展示数据，不自动判断最佳模型</p></div>
        <div className={styles.comparisonGrid}>{comparison.map(item => <article key={item.provider}>
          <div><strong>{item.label}</strong><span className={item.configured ? styles.ready : styles.pending} title={item.modelId}>{item.configured ? item.modelId : '待配置'}</span></div>
          <dl>
            <div><dt>调用次数</dt><dd>{item.count}</dd></div>
            <div><dt>API 成功率</dt><dd>{item.successRate === null ? '—' : `${Math.round(item.successRate * 100)}%`}</dd></div>
            <div><dt>Schema 通过率</dt><dd>{item.schemaRate === null ? '—' : `${Math.round(item.schemaRate * 100)}%`}</dd></div>
            <div><dt>平均响应时间</dt><dd>{item.latency === null ? '—' : `${Math.round(item.latency)} ms`}</dd></div>
            <div><dt>平均输入 Token</dt><dd>{item.inputTokens === null ? '—' : formatNumber(Math.round(item.inputTokens))}</dd></div>
            <div><dt>平均输出 Token</dt><dd>{item.outputTokens === null ? '—' : formatNumber(Math.round(item.outputTokens))}</dd></div>
            <div><dt>平均总 Token</dt><dd>{item.totalTokens === null ? '—' : formatNumber(Math.round(item.totalTokens))}</dd></div>
            <div><dt>平均成本/次</dt><dd>{formatCost(item.costPerCall, item.currency)}</dd></div>
            <div><dt>累计成本</dt><dd>{formatCost(item.totalCost, item.currency)}</dd></div>
            <div><dt>人工评分均值</dt><dd>{item.score === null ? '—' : item.score.toFixed(2)}</dd></div>
          </dl>
        </article>)}</div>
        <p className={styles.metricNote}>Token 和响应时间来自每次 API 返回与本地计时；OpenAI、Anthropic 成本以美元计算，DeepSeek 成本以人民币计算。DeepSeek 当前按配置的固定价格档估算，不自动区分缓存命中和高峰时段。Schema 通过率以 API 成功的调用为分母。</p>
      </section>

      <section className={styles.results}>
        <div className={styles.sectionTitle}><div><span>RUNS</span><h2>评测记录</h2></div><div className={styles.filters}>{(['all','openai','anthropic','deepseek'] as const).map(value => <button key={value} className={activeProvider === value ? styles.activeFilter : ''} onClick={() => setActiveProvider(value)}>{value === 'all' ? '全部' : value}</button>)}</div></div>
        {visibleRuns.length ? <div className={styles.runList}>{visibleRuns.map((run, index) => <RunCard key={run.id} run={run} testCase={selectedCase!} initiallyOpen={index === 0} onSaved={refresh} />)}</div> : <div className={styles.empty}><strong>暂无评测记录</strong><p>{data.models.some(model => model.configured) ? '选择模型并开始第一轮运行。' : '页面框架已就绪。填写环境变量并重启开发服务器后即可运行。'}</p></div>}
      </section>
    </main>
  </div>;
}

function Context({ title, text }: { title: string; text: string }) { return <article><span>{title}</span><p>{text}</p></article>; }

function RunCard({ run, testCase, initiallyOpen, onSaved }: { run: EvalRun; testCase: EvalCase; initiallyOpen: boolean; onSaved: () => Promise<void> }) {
  const [open, setOpen] = useState(initiallyOpen); const [saving, setSaving] = useState(false); const [feedback, setFeedback] = useState('');
  const [scores, setScores] = useState<Record<ScoreKey, number>>(() => Object.fromEntries(scoreKeys.map(key => [key, run.review?.scores[key] || 2])) as Record<ScoreKey, number>);
  const [notes, setNotes] = useState(run.review?.notes || ''); const [failureType, setFailureType] = useState(run.review?.failureType || ''); const [highRisk, setHighRisk] = useState(run.review?.highRisk || false);
  async function save() {
    setSaving(true); setFeedback('');
    const response = await fetch('/api/eval/review', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ runId: run.id, scores, notes, failureType, highRisk }) });
    const body = await response.json() as { error?: string }; setSaving(false);
    if (!response.ok) { setFeedback(body.error || '保存失败'); return; }
    setFeedback('评分已保存'); await onSaved();
  }
  return <article className={styles.runCard}>
    <button className={styles.runSummary} onClick={() => setOpen(value => !value)} aria-expanded={open}>
      <span className={`${styles.statusDot} ${run.success && run.schemaValid ? styles.success : styles.failure}`} />
      <span><strong>{run.provider} · {run.modelId}</strong><small>Run {run.runIndex} · {new Date(run.startedAt).toLocaleString('zh-CN')}</small></span>
      <span className={styles.metrics}><b>{run.latencyMs} ms</b><b>{formatNumber(run.usage.total)} tokens</b><b>{formatCost(run.estimatedCost, run.costCurrency)}</b>{run.review?.fail && <em>FAIL</em>}</span>
      <i>{open ? '−' : '+'}</i>
    </button>
    {open && <div className={styles.runBody}>
      <div className={styles.autoMetrics}><span>API {run.success ? '成功' : '失败'}</span><span>Schema {run.schemaValid ? '通过' : '未通过'}</span><span>Prompt {run.promptVersion}</span>{run.error && <span className={styles.error}>{run.error}</span>}</div>
      {run.promptVersion === 'resume-diagnosis-v0.2' && run.parsedOutput && <div className={styles.reportPreview}>
        <h3>正式诊断报告预览</h3>
        <DiagnosticReport report={{ id: run.id, generatedAt: run.completedAt, ...run.parsedOutput }} showIntro={false} />
      </div>}
      <div className={styles.outputGrid}><div><h3>完整模型输出</h3><pre>{run.rawOutput || '(无输出)'}</pre></div><div><h3>Reference Annotation</h3><pre>{JSON.stringify(testCase.referenceAnnotation, null, 2)}</pre></div></div>
      <div className={styles.review}><h3>人工评测</h3><div className={styles.scoreGrid}>{scoreKeys.map(key => <label key={key}><span>{scoreLabels[key]}</span><select value={scores[key]} onChange={event => setScores(current => ({ ...current, [key]: Number(event.target.value) }))}><option value={1}>1 · 差</option><option value={2}>2 · 可用</option><option value={3}>3 · 好</option></select></label>)}</div>
        <div className={styles.reviewNotes}><label><span>Failure Type</span><input value={failureType} onChange={event => setFailureType(event.target.value)} placeholder="如：事实编造、核心要求误判" /></label><label><span>人工备注</span><textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder="记录判断依据和需要复查的内容" /></label></div>
        <label className={styles.risk}><input type="checkbox" checked={highRisk} onChange={event => setHighRisk(event.target.checked)} /><span>严重 JD 核心要求误判，标记 High Risk / FAIL</span></label>
        <p className={styles.rule}>事实忠实度评分为 1 时自动标记 FAIL。</p><div className={styles.saveRow}><span>{feedback}</span><button disabled={saving} onClick={save}>{saving ? '保存中…' : '保存人工评分'}</button></div>
      </div>
    </div>}
  </article>;
}
