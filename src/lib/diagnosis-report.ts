export type Verdict = 'recommended' | 'concern' | 'rejected';
export type Impact = 'high' | 'mid' | 'low';

export type DiagnosisProblem = {
  id: string;
  impact: Impact;
  title: string;
  summary: string;
  resumeQuote: string;
  jdRequirement: string;
  whyMatters: string;
  suggestion: string;
  rewrite: string;
};

export type DiagnosisStrength = { id: string; title: string; detail: string };

export type DiagnosisReport = {
  id: string;
  generatedAt: string;
  targetRole: string;
  verdict: Verdict;
  verdictSummary: string;
  problems: DiagnosisProblem[];
  strengths: DiagnosisStrength[];
};

export type DiagnosisHistoryRecord = {
  id: string;
  fileName: string;
  uploadedAt: string;
  completedAt: string;
  report: DiagnosisReport;
};

export const demoDiagnosisReport: DiagnosisReport = {
  id: 'demo-report', generatedAt: new Date(0).toISOString(), targetRole: '产品运营实习生', verdict: 'concern',
  verdictSummary: '你的经历方向基本符合岗位要求，但简历还没有充分证明项目成果和数据分析能力。',
  problems: [
    { id: 'results', impact: 'high', title: '项目经历缺少明确结果', summary: '你写了做了什么，但没说做完之后有什么效果，HR 看不到你带来了多少价值。', resumeQuote: '负责新用户引导流程的设计与优化，协调产品、设计和开发团队推进项目落地。', jdRequirement: '有实际运营项目经验，能够用数据说明工作成果，展示可量化的业务影响。', whyMatters: '初筛 HR 通常每份简历只看 30 秒，没有结果数据的项目描述很难在短时间内建立信任感。这类描述让人看不出你实际产出了什么，容易被直接跳过。', suggestion: '在每条项目描述末尾加上结果，格式参考：做了什么 → 怎么做的 → 结果是什么（尽量有数字）。如果没有精确数据，也可以描述定性结果，比如「上线后用户反馈明显改善」。', rewrite: '负责新用户引导流程的设计与优化，协调产品、设计和开发三个团队推进项目落地，上线后次日留存率提升约 12%，完成月度增长目标。' },
    { id: 'analytics', impact: 'mid', title: '数据分析能力证据不足', summary: 'JD 里明确要求会数据分析，但你的简历里只提到「熟悉 Excel」，没有实际用数据做过判断或推动决策的例子。', resumeQuote: '熟悉 Excel 及基础数据处理，具备一定数据分析能力。', jdRequirement: '能够独立完成数据分析报告，通过数据洞察驱动运营策略调整，有 SQL 或 Python 使用经验者优先。', whyMatters: '「具备一定能力」是一个非常模糊的说法，在竞争激烈的实习岗位中，HR 更倾向于看到具体使用场景。缺乏实例会让这项技能看起来像是凑字数。', suggestion: '如果你用 Excel 做过实际分析，直接写出来，比如「用 Excel 透视表分析活动数据，发现……，提出……建议」。如果学过 SQL 或 Python，也可以说明用在了哪里。', rewrite: '通过 Excel 透视表对社团 3 次线上活动数据进行复盘分析，识别出报名转化率最低的环节，提出优化推文时间的建议，下次活动转化率提升约 8%。' },
    { id: 'specificity', impact: 'low', title: '部分经历描述过于笼统', summary: '有几条经历写得太宽泛，只说了「参与」或「协助」，看不出你具体做了什么。', resumeQuote: '参与品牌推广活动策划，协助完成多项团队任务。', jdRequirement: '有实际执行经验，能独立承担模块任务，具备良好的协作沟通能力。', whyMatters: '「参与」和「协助」暗示你处于被动配合的角色，而 JD 期望的是能独立负责模块的人。这类描述不会加分，但也不是一票否决的问题。', suggestion: '把「参与」换成你实际负责的具体事情。哪怕你只负责了一小部分，也可以具体说出来，比如「负责活动文案撰写和微信推文排版」，比「参与策划」清楚得多。', rewrite: '负责品牌推广活动的微信推文撰写和排版，独立完成 2 篇内容推送，阅读量累计超过 3000 次。' },
  ],
  strengths: [
    { id: 'relevance', title: '具备岗位相关的运营经历', detail: '你在社团和项目中有实际的运营参与经历，与目标岗位的方向吻合，不是完全零基础。' },
    { id: 'metrics', title: '项目成果有部分数据支撑', detail: '简历中出现了具体数字，说明你有意识地记录工作结果，这比纯文字描述更有说服力。' },
    { id: 'tools', title: '工具能力有真实使用场景', detail: '你提到的工具（Excel、Figma 等）结合了具体使用情境，不是单纯罗列软件名称。' },
  ],
};

const storageKey = 'resumeiq:diagnosis-report';
const legacyHistoryStorageKey = 'resumeiq:diagnosis-history';
const historyOwnerKey = 'resumeiq:diagnosis-history-owner';
const guestHistoryStorageKey = 'resumeiq:diagnosis-history:guest';
const userHistoryStoragePrefix = 'resumeiq:diagnosis-history:user:';
const retentionMs = 10 * 24 * 60 * 60 * 1000;

function historyStorageKey() {
  const owner = localStorage.getItem(historyOwnerKey);
  return owner ? `${userHistoryStoragePrefix}${owner}` : guestHistoryStorageKey;
}

export function setDiagnosisHistoryOwner(userId: string | null) {
  if (!userId) {
    localStorage.removeItem(historyOwnerKey);
    return;
  }
  const targetKey = `${userHistoryStoragePrefix}${userId}`;
  if (localStorage.getItem(targetKey) === null) {
    const current = loadDiagnosisReport();
    const candidates = [legacyHistoryStorageKey, guestHistoryStorageKey]
      .flatMap(key => {
        try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value : []; }
        catch { return []; }
      })
      .filter(isDiagnosisHistoryRecord);
    const currentRecord = current ? candidates.find(item => item.id === current.id) : undefined;
    localStorage.setItem(targetKey, JSON.stringify(currentRecord ? [currentRecord] : []));
  }
  localStorage.setItem(historyOwnerKey, userId);
  localStorage.removeItem(legacyHistoryStorageKey);
  localStorage.removeItem(guestHistoryStorageKey);
}

export function setCurrentDiagnosisReport(report: DiagnosisReport) {
  localStorage.setItem(storageKey, JSON.stringify({ report, expiresAt: Date.now() + retentionMs }));
}

export function saveDiagnosisReport(report: DiagnosisReport, details?: { fileName?: string; uploadedAt?: string }) {
  setCurrentDiagnosisReport(report);
  const history = loadDiagnosisHistory();
  const record: DiagnosisHistoryRecord = {
    id: report.id,
    fileName: details?.fileName?.trim() || '本次诊断简历',
    uploadedAt: details?.uploadedAt || report.generatedAt,
    completedAt: report.generatedAt,
    report,
  };
  localStorage.setItem(historyStorageKey(), JSON.stringify([record, ...history.filter(item => item.id !== report.id)]));
}

export function loadDiagnosisReport(): DiagnosisReport | null {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (!stored || stored.expiresAt < Date.now() || !isDiagnosisReport(stored.report)) {
      localStorage.removeItem(storageKey);
      return null;
    }
    return stored.report;
  } catch { return null; }
}

export function loadDiagnosisHistory(): DiagnosisHistoryRecord[] {
  try {
    const key = historyStorageKey();
    const stored = JSON.parse(localStorage.getItem(key) || localStorage.getItem(legacyHistoryStorageKey) || '[]');
    if (!Array.isArray(stored)) return [];
    const cutoff = Date.now() - retentionMs;
    const history = stored.filter(isDiagnosisHistoryRecord).filter(item => {
      const completedAt = Date.parse(item.completedAt);
      return Number.isFinite(completedAt) && completedAt >= cutoff;
    });
    if (history.length === 0) {
      const current = loadDiagnosisReport();
      if (current) {
        const migrated = [{ id: current.id, fileName: `${current.targetRole || '本次诊断'}简历`, uploadedAt: current.generatedAt, completedAt: current.generatedAt, report: current }];
        localStorage.setItem(key, JSON.stringify(migrated));
        return migrated;
      }
    }
    if (history.length !== stored.length || localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(history));
    return history;
  } catch { return []; }
}

export function deleteDiagnosisHistoryRecord(id: string) {
  const next = loadDiagnosisHistory().filter(item => item.id !== id);
  localStorage.setItem(historyStorageKey(), JSON.stringify(next));
  const current = loadDiagnosisReport();
  if (current?.id === id) localStorage.removeItem(storageKey);
  return next;
}

function isDiagnosisHistoryRecord(value: unknown): value is DiagnosisHistoryRecord {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<DiagnosisHistoryRecord>;
  return typeof item.id === 'string' && typeof item.fileName === 'string' &&
    typeof item.uploadedAt === 'string' && typeof item.completedAt === 'string' && isDiagnosisReport(item.report);
}

export function isDiagnosisReport(value: unknown): value is DiagnosisReport {
  if (!value || typeof value !== 'object') return false;
  const report = value as Partial<DiagnosisReport>;
  const validProblem = (problem: unknown) => {
    if (!problem || typeof problem !== 'object') return false;
    const item = problem as Partial<DiagnosisProblem>;
    return typeof item.id === 'string' && ['high', 'mid', 'low'].includes(item.impact || '') &&
      ['title', 'summary', 'resumeQuote', 'jdRequirement', 'whyMatters', 'suggestion', 'rewrite']
        .every(field => typeof item[field as keyof DiagnosisProblem] === 'string');
  };
  const validStrength = (strength: unknown) => {
    if (!strength || typeof strength !== 'object') return false;
    const item = strength as Partial<DiagnosisStrength>;
    return typeof item.id === 'string' && typeof item.title === 'string' && typeof item.detail === 'string';
  };
  return typeof report.id === 'string' && typeof report.generatedAt === 'string' && typeof report.targetRole === 'string' &&
    ['recommended', 'concern', 'rejected'].includes(report.verdict || '') &&
    typeof report.verdictSummary === 'string' && Array.isArray(report.problems) && report.problems.every(validProblem) &&
    Array.isArray(report.strengths) && report.strengths.every(validStrength);
}
