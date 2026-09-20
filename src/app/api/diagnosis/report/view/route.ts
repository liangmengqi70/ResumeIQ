import { currentUser } from '@/lib/auth';
import { mutation, jsonBody } from '@/lib/api';
import { AuthError } from '@/lib/auth-policy';
import { recordAuthenticatedReportView } from '@/lib/diagnosis-persistence';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  return mutation(request, async () => {
    const user = await currentUser();
    if (!user) throw new AuthError('请先登录', 401);
    const body = await jsonBody(request);
    if (typeof body.reportId !== 'string') throw new AuthError('诊断报告不存在', 404);
    const result = await recordAuthenticatedReportView(user.id, body.reportId);
    if (!result) throw new AuthError('诊断报告不存在', 404);
    return result;
  });
}
