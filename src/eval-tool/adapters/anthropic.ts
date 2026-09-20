import type { ModelAdapter } from './base';
import { checkedJson, numberOrNull } from './base';

export const anthropicAdapter: ModelAdapter = {
  async run({ prompt, config, apiKey, signal }) {
    const body = await checkedJson(await fetch(`${config.baseUrl}/messages`, {
      method: 'POST', signal,
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: config.modelId, max_tokens: 8192, temperature: 0, messages: [{ role: 'user', content: prompt }] }),
    })) as { content?: Array<{ type?: string; text?: string }>; usage?: { input_tokens?: number; output_tokens?: number } };
    const rawOutput = body.content?.filter(item => item.type === 'text').map(item => item.text || '').join('') || '';
    const input = numberOrNull(body.usage?.input_tokens); const output = numberOrNull(body.usage?.output_tokens);
    return { rawOutput, usage: { input, output, total: input !== null && output !== null ? input + output : null } };
  },
};
