import 'server-only';
import { randomUUID } from 'node:crypto';
import { getAdapter } from './adapters';
import { getApiKey, getModelConfig, PROMPT_VERSION } from './config';
import { buildPrompt } from './prompt';
import { parseEvalOutput } from './schema';
import { saveRun } from './store';
import type { EvalCase, EvalRun, ProviderId, TokenUsage } from './types';

function cost(usage: TokenUsage, inputPrice: number | null, outputPrice: number | null) {
  if (usage.input === null || usage.output === null || inputPrice === null || outputPrice === null) return null;
  return (usage.input * inputPrice + usage.output * outputPrice) / 1_000_000;
}

export async function runEvaluation(testCase: EvalCase, provider: ProviderId, runIndex: number): Promise<EvalRun> {
  const config = getModelConfig(provider);
  const started = Date.now();
  const startedAt = new Date(started).toISOString();
  let result: EvalRun;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120_000);
    try {
      const response = await getAdapter(provider).run({ testCase, prompt: buildPrompt(testCase), config, apiKey: getApiKey(config), signal: controller.signal });
      const parsed = parseEvalOutput(response.rawOutput);
      result = {
        id: randomUUID(), caseId: testCase.id, provider, modelId: config.modelId, runIndex,
        promptVersion: PROMPT_VERSION, startedAt, completedAt: new Date().toISOString(), latencyMs: Date.now() - started,
        success: true, schemaValid: parsed.valid, rawOutput: response.rawOutput, parsedOutput: parsed.value,
        usage: response.usage,
        estimatedCost: cost(response.usage, config.inputPricePerMillion, config.outputPricePerMillion),
        costCurrency: config.currency,
        error: parsed.error, review: null,
      };
    } finally { clearTimeout(timer); }
  } catch (error) {
    result = {
      id: randomUUID(), caseId: testCase.id, provider, modelId: config.modelId || '(未配置)', runIndex,
      promptVersion: PROMPT_VERSION, startedAt, completedAt: new Date().toISOString(), latencyMs: Date.now() - started,
      success: false, schemaValid: false, rawOutput: '', parsedOutput: null,
      usage: { input: null, output: null, total: null }, estimatedCost: null, costCurrency: config.currency,
      error: error instanceof Error ? error.message : '模型调用失败', review: null,
    };
  }
  await saveRun(result);
  return result;
}
