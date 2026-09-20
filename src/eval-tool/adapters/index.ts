import type { ProviderId } from '../types';
import type { ModelAdapter } from './base';
import { anthropicAdapter } from './anthropic';
import { deepseekAdapter } from './deepseek';
import { openaiAdapter } from './openai';

const adapters: Record<ProviderId, ModelAdapter> = { openai: openaiAdapter, anthropic: anthropicAdapter, deepseek: deepseekAdapter };
export function getAdapter(provider: ProviderId) { return adapters[provider]; }

