import { listRuns } from '@/eval-tool/store';
import { scoreKeys } from '@/eval-tool/types';

export const runtime = 'nodejs';
function csv(value: unknown) { const text = value === null || value === undefined ? '' : String(value); return `"${text.replace(/"/g, '""')}"`; }

export async function GET() {
  const headers = ['run_id','case_id','provider','model_id','run_index','prompt_version','success','schema_valid','latency_ms','input_tokens','output_tokens','total_tokens','estimated_cost','cost_currency',...scoreKeys,'high_risk','fail','failure_type','notes','error','started_at'];
  const rows = (await listRuns()).map(run => [run.id,run.caseId,run.provider,run.modelId,run.runIndex,run.promptVersion,run.success,run.schemaValid,run.latencyMs,run.usage.input,run.usage.output,run.usage.total,run.estimatedCost,run.costCurrency,...scoreKeys.map(key => run.review?.scores[key] ?? ''),run.review?.highRisk ?? '',run.review?.fail ?? '',run.review?.failureType ?? '',run.review?.notes ?? '',run.error ?? '',run.startedAt]);
  const content = '\uFEFF' + [headers, ...rows].map(row => row.map(csv).join(',')).join('\r\n');
  return new Response(content, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="resumeiq-eval-runs.csv"' } });
}
