import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { apiError, jsonBody, mutation } from '@/lib/api';
import { AuthError } from '@/lib/auth-policy';
import { deleteStoredDiagnosis, diagnosisHistory } from '@/lib/diagnosis-persistence';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) throw new AuthError('请先登录', 401);
    return NextResponse.json({ records: await diagnosisHistory(user.id) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request) {
  return mutation(request, async () => {
    const user = await currentUser();
    if (!user) throw new AuthError('请先登录', 401);
    const body = await jsonBody(request);
    if (typeof body.id !== 'string') throw new AuthError('诊断记录不存在', 404);
    if (!await deleteStoredDiagnosis(user.id, body.id)) throw new AuthError('诊断记录不存在', 404);
    return { ok: true };
  });
}
