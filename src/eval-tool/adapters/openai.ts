import { evalOutputJsonSchema } from '../schema';
import type { ModelAdapter } from './base';
import { checkedJson, numberOrNull } from './base';

export const openaiAdapter: ModelAdapter = {
  async run({ prompt, config, apiKey, signal }) {
    const body = await checkedJson(await fetch(`${config.baseUrl}/responses`, {
      method: 'POST', signal,
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: config.modelId, store: false, input: prompt,
        text: { format: { type: 'json_schema', name: 'resume_diagnosis', strict: true, schema: evalOutputJsonSchema } },
      }),
    })) as { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }>; usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number } };
    const rawOutput = body.output_text || body.output?.flatMap(item => item.content || []).find(item => item.type === 'output_text')?.text || '';
    return { rawOutput, usage: { input: numberOrNull(body.usage?.input_tokens), output: numberOrNull(body.usage?.output_tokens), total: numberOrNull(body.usage?.total_tokens) } };
  },
};

