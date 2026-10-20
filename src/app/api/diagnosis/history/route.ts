import { NextResponse } from 'next/server';
import { currentOwner } from '@/lib/auth';
import { apiError, jsonBody, mutation } from '@/lib/api';
import { AuthError } from '@/lib/auth-policy';
import { deleteStoredDiagnosis, diagnosisHistory } from '@/lib/diagnosis-persistence';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const owner = await currentOwner();
    if (!owner) throw new AuthError('请先登录', 401);
    return NextResponse.json({ records: await diagnosisHistory(owner), guest: !owner.userId }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request) {
  return mutation(request, async () => {
    const owner = await currentOwner();
    if (!owner) throw new AuthError('请先登录', 401);
    const body = await jsonBody(request);
    if (typeof body.id !== 'string') throw new AuthError('诊断记录不存在', 404);
    if (!await deleteStoredDiagnosis(owner, body.id)) throw new AuthError('诊断记录不存在', 404);
    return { ok: true };
  });
}
