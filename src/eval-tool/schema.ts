import type { EvalOutput } from './types';

export const evalOutputJsonSchema = {
  type: 'object', additionalProperties: false,
  required: ['targetRole', 'verdict', 'verdictSummary', 'problems', 'strengths'],
  properties: {
    targetRole: { type: 'string' },
    verdict: { type: 'string', enum: ['recommended', 'concern', 'rejected'] },
    verdictSummary: { type: 'string' },
    problems: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['id', 'impact', 'title', 'summary', 'resumeQuote', 'jdRequirement', 'whyMatters', 'suggestion', 'rewrite'],
        properties: {
          id: { type: 'string' }, impact: { type: 'string', enum: ['high', 'mid', 'low'] }, title: { type: 'string' },
          summary: { type: 'string' }, resumeQuote: { type: 'string' }, jdRequirement: { type: 'string' },
          whyMatters: { type: 'string' }, suggestion: { type: 'string' }, rewrite: { type: 'string' },
        },
      },
    },
    strengths: {
      type: 'array',
      items: { type: 'object', additionalProperties: false, required: ['id', 'title', 'detail'], properties: { id: { type: 'string' }, title: { type: 'string' }, detail: { type: 'string' } } },
    },
  },
} as const;

function isString(value: unknown): value is string { return typeof value === 'string' && value.trim().length > 0; }

export function parseEvalOutput(raw: string): { valid: boolean; value: EvalOutput | null; error: string | null } {
  try {
    const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    const value = JSON.parse(cleaned) as Partial<EvalOutput>;
    if (!value || typeof value !== 'object') throw new Error('输出不是 JSON 对象');
    if (!isString(value.targetRole)) throw new Error('targetRole 缺失');
    if (!['recommended', 'concern', 'rejected'].includes(value.verdict || '')) throw new Error('verdict 不符合约定');
    if (!isString(value.verdictSummary)) throw new Error('verdictSummary 缺失');
    if (!Array.isArray(value.problems) || !value.problems.every(problem =>
      problem && isString(problem.id) && ['high', 'mid', 'low'].includes(problem.impact) && isString(problem.title) &&
      isString(problem.summary) && isString(problem.resumeQuote) && isString(problem.jdRequirement) &&
      isString(problem.whyMatters) && isString(problem.suggestion) &&
      (problem.type === undefined || problem.type === 'fixable' || problem.type === 'hard') &&
      (problem.category === undefined || problem.category === 'match' || problem.category === 'expression') &&
      (problem.actionLine === undefined || typeof problem.actionLine === 'string') &&
      // 硬性门槛无法靠改简历解决，允许不给参考改写；其余问题必须给出改写。
      (problem.type === 'hard' ? (problem.rewrite === undefined || typeof problem.rewrite === 'string') : isString(problem.rewrite)))) {
      throw new Error('problems 不符合正式报告 Schema');
    }
    if (!Array.isArray(value.strengths) || !value.strengths.every(item => item && isString(item.id) && isString(item.title) && isString(item.detail))) {
      throw new Error('strengths 不符合 Schema');
    }
    if (value.nextSteps !== undefined && (!Array.isArray(value.nextSteps) || !value.nextSteps.every(item => item && isString(item.title) && isString(item.detail)))) {
      throw new Error('nextSteps 不符合 Schema');
    }
    if (value.alternativeRoles !== undefined && (!Array.isArray(value.alternativeRoles) || !value.alternativeRoles.every(item => item && isString(item.role) && isString(item.reason) && isString(item.evidence)))) {
      throw new Error('alternativeRoles 不符合 Schema');
    }
    if (value.answer !== undefined && value.answer !== null && !(isString(value.answer.question) && isString(value.answer.reply))) {
      throw new Error('answer 不符合 Schema');
    }
    for (const problem of value.problems) if (problem.type === 'hard' && problem.rewrite === undefined) problem.rewrite = '';
    return { valid: true, value: value as EvalOutput, error: null };
  } catch (error) {
    return { valid: false, value: null, error: error instanceof Error ? error.message : 'JSON 解析失败' };
  }
}
