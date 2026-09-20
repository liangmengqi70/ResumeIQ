import type { AdapterResult, EvalCase, ResolvedModelConfig } from '../types';

export type ModelAdapter = {
  run(input: { testCase: EvalCase; prompt: string; config: ResolvedModelConfig; apiKey: string; signal?: AbortSignal }): Promise<AdapterResult>;
};

export async function checkedJson(response: Response) {
  const text = await response.text();
  let body: unknown;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) {
    const message = typeof body === 'object' && body && 'error' in body
      ? JSON.stringify((body as { error: unknown }).error)
      : String(body || `HTTP ${response.status}`);
    throw new Error(`${response.status} ${message}`.slice(0, 1200));
  }
  return body;
}

export function numberOrNull(value: unknown) { return typeof value === 'number' && Number.isFinite(value) ? value : null; }

