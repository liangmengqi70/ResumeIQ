import { requireSameOrigin } from '@/lib/auth-policy';
import { listRuns, saveReview } from '@/eval-tool/store';
import { scoreKeys, type EvalScore, type ManualReview, type ScoreKey } from '@/eval-tool/types';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const body = await request.json() as { runId?: string; scores?: Partial<Record<ScoreKey, number>>; notes?: string; failureType?: string; highRisk?: boolean };
    if (!body.runId || !(await listRuns()).some(run => run.id === body.runId)) return Response.json({ error: '评测记录不存在' }, { status: 404 });
    const scores = Object.fromEntries(scoreKeys.map(key => [key, body.scores?.[key]])) as Record<ScoreKey, number | undefined>;
    if (scoreKeys.some(key => ![1, 2, 3].includes(scores[key] || 0))) return Response.json({ error: '六项评分都必须为 1、2 或 3' }, { status: 400 });
    const review: ManualReview = {
      scores: scores as Record<ScoreKey, EvalScore>, notes: String(body.notes || '').slice(0, 4000), failureType: String(body.failureType || '').slice(0, 200),
      highRisk: Boolean(body.highRisk), fail: scores.factualFaithfulness === 1 || Boolean(body.highRisk), updatedAt: new Date().toISOString(),
    };
    await saveReview(body.runId, review);
    return Response.json({ review });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : '保存失败' }, { status: 400 }); }
}

