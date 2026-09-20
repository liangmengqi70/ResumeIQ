import 'server-only';
import type { ModelConfig, ProviderId, ResolvedModelConfig } from './types';

export const PROMPT_VERSION = 'resume-diagnosis-v0.2';
export const MAX_REPEAT_COUNT = 3;

export const modelConfigs: ModelConfig[] = [
  { provider: 'openai', label: 'OpenAI', modelEnv: 'EVAL_OPENAI_MODEL', keyEnv: 'OPENAI_API_KEY', baseUrlEnv: 'OPENAI_BASE_URL', defaultBaseUrl: 'https://api.openai.com/v1', inputPricePerMillionEnv: 'EVAL_OPENAI_INPUT_USD_PER_1M', outputPricePerMillionEnv: 'EVAL_OPENAI_OUTPUT_USD_PER_1M', currency: 'USD' },
  { provider: 'anthropic', label: 'Anthropic', modelEnv: 'EVAL_ANTHROPIC_MODEL', keyEnv: 'ANTHROPIC_API_KEY', baseUrlEnv: 'ANTHROPIC_BASE_URL', defaultBaseUrl: 'https://api.anthropic.com/v1', inputPricePerMillionEnv: 'EVAL_ANTHROPIC_INPUT_USD_PER_1M', outputPricePerMillionEnv: 'EVAL_ANTHROPIC_OUTPUT_USD_PER_1M', currency: 'USD' },
  { provider: 'deepseek', label: 'DeepSeek', modelEnv: 'EVAL_DEEPSEEK_MODEL', keyEnv: 'DEEPSEEK_API_KEY', baseUrlEnv: 'DEEPSEEK_BASE_URL', defaultBaseUrl: 'https://api.deepseek.com', inputPricePerMillionEnv: 'EVAL_DEEPSEEK_INPUT_CNY_PER_1M', outputPricePerMillionEnv: 'EVAL_DEEPSEEK_OUTPUT_CNY_PER_1M', currency: 'CNY' },
];

function optionalNumber(name: string) {
  const value = process.env[name];
  if (!value?.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function getModelConfig(provider: ProviderId): ResolvedModelConfig {
  const config = modelConfigs.find(item => item.provider === provider);
  if (!config) throw new Error(`不支持的模型厂商：${provider}`);
  const modelId = process.env[config.modelEnv]?.trim() || '';
  const apiKey = process.env[config.keyEnv]?.trim() || '';
  return {
    ...config,
    modelId,
    configured: Boolean(modelId && apiKey),
    baseUrl: (process.env[config.baseUrlEnv]?.trim() || config.defaultBaseUrl).replace(/\/$/, ''),
    inputPricePerMillion: optionalNumber(config.inputPricePerMillionEnv),
    outputPricePerMillion: optionalNumber(config.outputPricePerMillionEnv),
  };
}

export function getApiKey(config: ResolvedModelConfig) {
  const key = process.env[config.keyEnv]?.trim();
  if (!key || !config.modelId) throw new Error(`${config.label} 尚未配置 API Key 或 model ID`);
  return key;
}

export function publicModelConfigs() {
  return modelConfigs.map(item => getModelConfig(item.provider)).map(({ keyEnv, ...item }) => ({ ...item, keyEnv }));
}
