export const scoreKeys = [
  'issueIdentification',
  'jdMatch',
  'factualFaithfulness',
  'explanationQuality',
  'suggestionQuality',
  'stability',
] as const;

export type ProviderId = 'openai' | 'anthropic' | 'deepseek';
export type CurrencyCode = 'USD' | 'CNY';
export type ScoreKey = (typeof scoreKeys)[number];
export type EvalScore = 1 | 2 | 3;

export type EvalCase = {
  id: string;
  title: string;
  resume: string;
  jd: string;
  background: string;
  referenceAnnotation: {
    expectedVerdict: 'recommended' | 'concern' | 'rejected';
    keyIssues: string[];
    jdPriorities: string[];
    fidelityNotes: string[];
  };
};

export type EvalProblem = {
  id: string;
  impact: 'high' | 'mid' | 'low';
  title: string;
  summary: string;
  resumeQuote: string;
  jdRequirement: string;
  whyMatters: string;
  suggestion: string;
  rewrite: string;
  /** v2：fixable 可通过改简历解决；hard 为学历、年限等硬性门槛，rewrite 可为空。旧报告缺省视为 fixable。 */
  type?: 'fixable' | 'hard';
  /** v2：match 岗位匹配；expression 经历表达。 */
  category?: 'match' | 'expression';
  /** v2：折叠卡片上显示的一句话行动，如「压缩成 3 行」。 */
  actionLine?: string;
};

export type EvalNextStep = { title: string; detail: string };
export type EvalAlternativeRole = { role: string; reason: string; evidence: string };
export type EvalAnswer = { question: string; reply: string };

export type EvalOutput = {
  targetRole: string;
  verdict: 'recommended' | 'concern' | 'rejected';
  verdictSummary: string;
  problems: EvalProblem[];
  strengths: Array<{ id: string; title: string; detail: string }>;
  /** v2 新增字段，旧报告与评测工具 v0.2 输出中可缺省。 */
  nextSteps?: EvalNextStep[];
  alternativeRoles?: EvalAlternativeRole[];
  answer?: EvalAnswer | null;
};

export type ModelConfig = {
  provider: ProviderId;
  label: string;
  modelEnv: string;
  keyEnv: string;
  baseUrlEnv: string;
  defaultBaseUrl: string;
  inputPricePerMillionEnv: string;
  outputPricePerMillionEnv: string;
  currency: CurrencyCode;
};

export type ResolvedModelConfig = ModelConfig & {
  modelId: string;
  configured: boolean;
  baseUrl: string;
  inputPricePerMillion: number | null;
  outputPricePerMillion: number | null;
};

export type TokenUsage = { input: number | null; output: number | null; total: number | null };

export type ManualReview = {
  scores: Record<ScoreKey, EvalScore>;
  notes: string;
  failureType: string;
  highRisk: boolean;
  fail: boolean;
  updatedAt: string;
};

export type EvalRun = {
  id: string;
  caseId: string;
  provider: ProviderId;
  modelId: string;
  runIndex: number;
  promptVersion: string;
  startedAt: string;
  completedAt: string;
  latencyMs: number;
  success: boolean;
  schemaValid: boolean;
  rawOutput: string;
  parsedOutput: EvalOutput | null;
  usage: TokenUsage;
  estimatedCost: number | null;
  costCurrency: CurrencyCode;
  error: string | null;
  review: ManualReview | null;
};

export type AdapterResult = { rawOutput: string; usage: TokenUsage };
