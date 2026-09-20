import 'server-only';

import type { BackgroundAnswers } from './diagnosis-draft';
import type { DiagnosisReport } from './diagnosis-report';
import { parseEvalOutput } from '@/eval-tool/schema';

const defaultBaseUrl = 'https://api.deepseek.com';
const defaultModel = 'deepseek-v4-pro';
const timeoutMs = 120_000;

export class DiagnosisServiceError extends Error {
  constructor(message: string, readonly status = 502) { super(message); }
}

export type DiagnosisUsage = {
  provider: 'deepseek';
  modelName: string;
  providerRequestId: string | null;
  latencyMs: number;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  totalTokens: number;
};

function backgroundText(background: BackgroundAnswers) {
  return [
    `当前身份：${background.identity || '未填写'}`,
    `投递情况：${background.applications || '未填写'}`,
    `主要困难：${background.difficulties.length ? background.difficulties.join('、') : '未填写'}`,
    `希望解决的问题：${background.question.trim() || '未填写'}`,
  ].join('\n');
}

export function buildDiagnosisPrompt(input: { resume: string; jd: string; background: BackgroundAnswers }) {
  return `你是一名严谨、表达清楚的招聘初筛 HR。请结合候选人的简历、目标岗位 JD 和求职背景，生成 ResumeIQ 简历诊断报告。

要求：
1. 只能使用下方材料中的事实，不得猜测或编造候选人未提供的经历、技能、数字和结果。
2. 明确把简历证据与 JD 要求对应起来，判断以 JD 的核心要求为准。
3. problems 按影响从高到低排列，保留最影响初筛的 3～5 项；每项都要包含简历原文、对应 JD 要求、影响原因、具体修改建议和参考改写。
4. 建议要具体、可执行。参考改写缺少事实或数字时必须使用「[补充真实数据]」一类占位符，不能代替候选人补造。
5. strengths 保留最有证据的 2～3 项。没有证据的能力不能列为优势。
6. verdict 只能是 recommended、concern、rejected；impact 只能是 high、mid、low。
7. 只输出一个合法 JSON 对象，不要输出 Markdown、代码围栏或解释前缀。

<resume>\n${input.resume}\n</resume>

<job_description>\n${input.jd}\n</job_description>

<background>\n${backgroundText(input.background)}\n</background>

JSON 字段：
{
  "targetRole": "从 JD 中提取的岗位名称",
  "verdict": "recommended | concern | rejected",
  "verdictSummary": "自然、通俗地说明结论和最核心原因",
  "problems": [{
    "id": "简短且仅含英文小写字母和连字符的标识",
    "impact": "high | mid | low",
    "title": "问题标题",
    "summary": "问题概括",
    "resumeQuote": "简历直接原文；未体现时写「简历未体现」",
    "jdRequirement": "对应的 JD 原文或忠实概括",
    "whyMatters": "为什么会影响初筛",
    "suggestion": "具体修改方法",
    "rewrite": "严格基于已有事实的参考改写"
  }],
  "strengths": [{
    "id": "简短且仅含英文小写字母和连字符的标识",
    "title": "优势标题",
    "detail": "优势说明及简历证据"
  }]
}`;
}

function apiFailure(status: number) {
  if (status === 401 || status === 403) return new DiagnosisServiceError('DeepSeek API Key 无效或没有该模型权限，请检查服务端配置。', 503);
  if (status === 402) return new DiagnosisServiceError('DeepSeek 账户余额不足，请充值后重新分析。', 503);
  if (status === 429) return new DiagnosisServiceError('DeepSeek 当前请求较多，请稍后重新分析。', 503);
  if (status >= 500) return new DiagnosisServiceError('DeepSeek 服务暂时不可用，请稍后重新分析。', 503);
  return new DiagnosisServiceError('AI 诊断请求未成功，请检查服务配置后重试。', 502);
}

export async function createDiagnosis(input: { resume: string; jd: string; background: BackgroundAnswers }): Promise<{ report: DiagnosisReport; usage: DiagnosisUsage }> {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey) throw new DiagnosisServiceError('尚未配置 DeepSeek API Key，请在 .env.local 中填写 DEEPSEEK_API_KEY。', 503);

  const model = process.env.DEEPSEEK_MODEL?.trim() || defaultModel;
  const baseUrl = (process.env.DEEPSEEK_BASE_URL?.trim() || defaultBaseUrl).replace(/\/$/, '');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        max_tokens: 8192,
        reasoning_effort: 'low',
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: buildDiagnosisPrompt(input) }],
      }),
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new DiagnosisServiceError('AI 分析超时，请稍后重新分析。', 504);
    throw new DiagnosisServiceError('无法连接 DeepSeek 服务，请检查服务器网络后重试。', 503);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) throw apiFailure(response.status);
  const body = await response.json().catch(() => null) as {
    id?: string;
    model?: string;
    choices?: Array<{ message?: { content?: string } }>;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
      prompt_cache_hit_tokens?: number;
      completion_tokens_details?: { reasoning_tokens?: number };
    };
  } | null;
  const raw = body?.choices?.[0]?.message?.content || '';
  const parsed = parseEvalOutput(raw);
  if (!parsed.valid || !parsed.value) {
    throw new DiagnosisServiceError(`AI 返回的报告格式不完整（${parsed.error || '未知格式错误'}），请重新分析。`, 502);
  }

  const report = { ...parsed.value, id: crypto.randomUUID(), generatedAt: new Date().toISOString() };
  return {
    report,
    usage: {
      provider: 'deepseek',
      modelName: body?.model || model,
      providerRequestId: body?.id || null,
      latencyMs: Date.now() - startedAt,
      inputTokens: Math.max(0, Number(body?.usage?.prompt_tokens || 0)),
      cachedInputTokens: Math.max(0, Number(body?.usage?.prompt_cache_hit_tokens || 0)),
      outputTokens: Math.max(0, Number(body?.usage?.completion_tokens || 0)),
      reasoningTokens: Math.max(0, Number(body?.usage?.completion_tokens_details?.reasoning_tokens || 0)),
      totalTokens: Math.max(0, Number(body?.usage?.total_tokens || 0)),
    },
  };
}
