import { listCases } from '@/eval-tool/cases';
import { publicModelConfigs } from '@/eval-tool/config';
import { listRuns } from '@/eval-tool/store';

export const runtime = 'nodejs';
export async function GET() {
  return Response.json({ cases: listCases(), models: publicModelConfigs(), runs: await listRuns() });
}
