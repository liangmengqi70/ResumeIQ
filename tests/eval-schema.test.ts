import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseEvalOutput } from '../src/eval-tool/schema';

const valid = {
  targetRole: '商业化运营实习生',
  verdict: 'concern', verdictSummary: '匹配但证据不足',
  problems: [{ id: 'missing-data', impact: 'high', title: '缺少数据', summary: '项目结果不够清楚', resumeQuote: '简历未体现结果数据', jdRequirement: '要求量化结果', whyMatters: 'HR 难以验证贡献', suggestion: '补充真实指标', rewrite: '完成相关工作，使[补充真实指标]提升[补充真实数据]' }],
  strengths: [{ id: 'relevant-experience', title: '方向匹配', detail: '有运营项目经历' }],
};

test('eval output accepts the shared diagnosis schema', () => {
  const result = parseEvalOutput(JSON.stringify(valid));
  assert.equal(result.valid, true);
  assert.equal(result.value?.problems[0].impact, 'high');
  assert.match(result.value?.problems[0].rewrite || '', /补充真实数据/);
});

test('eval output rejects malformed or incomplete model JSON', () => {
  assert.equal(parseEvalOutput('not json').valid, false);
  assert.equal(parseEvalOutput(JSON.stringify({ ...valid, verdict: 'maybe' })).valid, false);
  assert.equal(parseEvalOutput(JSON.stringify({ ...valid, problems: [{ title: 'missing fields' }] })).valid, false);
  assert.equal(parseEvalOutput(JSON.stringify({ ...valid, problems: [{ ...valid.problems[0], rewrite: '' }] })).valid, false);
});

test('eval output tolerates a single markdown JSON fence while preserving validation', () => {
  assert.equal(parseEvalOutput(`\`\`\`json\n${JSON.stringify(valid)}\n\`\`\``).valid, true);
});
