import type { ModelAdapter } from './base';
import { checkedJson, numberOrNull } from './base';

export const deepseekAdapter: ModelAdapter = {
  async run({ prompt, config, apiKey, signal }) {
    const body = await checkedJson(await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST', signal,
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model: config.modelId, temperature: 0, max_tokens: 8192, response_format: { type: 'json_object' }, messages: [{ role: 'user', content: prompt }] }),
    })) as { choices?: Array<{ message?: { content?: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } };
    return { rawOutput: body.choices?.[0]?.message?.content || '', usage: { input: numberOrNull(body.usage?.prompt_tokens), output: numberOrNull(body.usage?.completion_tokens), total: numberOrNull(body.usage?.total_tokens) } };
  },
};
