import { requireSameOrigin } from '@/lib/auth-policy';
import { getCase } from '@/eval-tool/cases';
import { MAX_REPEAT_COUNT } from '@/eval-tool/config';
import { runEvaluation } from '@/eval-tool/runner';
import type { ProviderId } from '@/eval-tool/types';
import { evalToolEnabled, evalUnavailable } from '@/eval-tool/access';

export const runtime = 'nodejs';
const providers: ProviderId[] = ['openai', 'anthropic', 'deepseek'];

export async function POST(request: Request) {
  if (!evalToolEnabled()) return evalUnavailable();
  try {
    requireSameOrigin(request);
    const body = await request.json() as { caseId?: string; providers?: ProviderId[]; repeatCount?: number };
    const testCase = body.caseId ? getCase(body.caseId) : null;
    if (!testCase) return Response.json({ error: '请选择有效的测试 Case' }, { status: 400 });
    const selected = Array.isArray(body.providers) ? body.providers.filter(value => providers.includes(value)) : [];
    if (!selected.length) return Response.json({ error: '请至少选择一个模型厂商' }, { status: 400 });
    const repeatCount = Math.min(MAX_REPEAT_COUNT, Math.max(1, Math.floor(Number(body.repeatCount) || 1)));
    const runs = [];
    for (const provider of selected) for (let index = 1; index <= repeatCount; index += 1) runs.push(await runEvaluation(testCase, provider, index));
    return Response.json({ runs });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : '评测任务启动失败' }, { status: 400 });
  }
}
