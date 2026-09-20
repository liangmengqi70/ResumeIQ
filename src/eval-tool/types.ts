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
};

export type EvalOutput = {
  targetRole: string;
  verdict: 'recommended' | 'concern' | 'rejected';
  verdictSummary: string;
  problems: EvalProblem[];
  strengths: Array<{ id: string; title: string; detail: string }>;
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
