import { listCases } from '@/eval-tool/cases';
import { publicModelConfigs } from '@/eval-tool/config';
import { listRuns } from '@/eval-tool/store';
import { evalToolEnabled, evalUnavailable } from '@/eval-tool/access';

export const runtime = 'nodejs';
export async function GET() {
  if (!evalToolEnabled()) return evalUnavailable();
  return Response.json({ cases: listCases(), models: publicModelConfigs(), runs: await listRuns() });
}
