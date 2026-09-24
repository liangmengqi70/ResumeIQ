import { createDiagnosis, DiagnosisServiceError } from '@/lib/deepseek-diagnosis';
import { extractResumeText, ResumeTextError } from '@/lib/resume-text';
import type { BackgroundAnswers } from '@/lib/diagnosis-draft';
import { currentOwner } from '@/lib/auth';
import { AuthError } from '@/lib/auth-policy';
import { completeDiagnosis, enforceDiagnosisQuota, failDiagnosis, recordFailedUsage, storeDiagnosisInputs, type StoredDiagnosis } from '@/lib/diagnosis-persistence';

export const runtime = 'nodejs';

function parseBackground(value: FormDataEntryValue | null): BackgroundAnswers {
  if (typeof value !== 'string') return { identity: '', applications: '', difficulties: [], question: '' };
  try {
    const parsed = JSON.parse(value) as Partial<BackgroundAnswers>;
    return {
      identity: typeof parsed.identity === 'string' ? parsed.identity.slice(0, 100) : '',
      applications: typeof parsed.applications === 'string' ? parsed.applications.slice(0, 100) : '',
      difficulties: Array.isArray(parsed.difficulties) ? parsed.difficulties.filter(item => typeof item === 'string').slice(0, 10) : [],
      question: typeof parsed.question === 'string' ? parsed.question.slice(0, 2000) : '',
    };
  } catch {
    return { identity: '', applications: '', difficulties: [], question: '' };
  }
}

export async function POST(request: Request) {
  let stored: StoredDiagnosis | null = null;
  let aiStartedAt = 0;
  try {
    const owner = await currentOwner();
    if (!owner) throw new AuthError('登录状态已失效，请返回首页重新开始。', 401);
    await enforceDiagnosisQuota(owner);
    const form = await request.formData();
    const file = form.get('resume');
    const jd = typeof form.get('jd') === 'string' ? String(form.get('jd')).trim().slice(0, 5_000) : '';
    if (!(file instanceof File)) return Response.json({ error: '没有找到已上传的简历，请返回重新上传。' }, { status: 400 });
    if ([...jd].length < 100) return Response.json({ error: '岗位 JD 内容过短，请至少填写 100 个字符。' }, { status: 400 });

    const resume = await extractResumeText(file);
    const background = parseBackground(form.get('background'));
    stored = await storeDiagnosisInputs({ owner, file, resumeText: resume, jd, background });
    aiStartedAt = Date.now();
    const result = await createDiagnosis({ resume, jd, background });
    return Response.json({ status: 'completed', report: await completeDiagnosis(stored, result.report, result.usage) });
  } catch (error) {
    if (stored) {
      await recordFailedUsage(stored, aiStartedAt ? Date.now() - aiStartedAt : 0).catch(() => undefined);
      await failDiagnosis(stored, error).catch(() => undefined);
    }
    if (error instanceof AuthError) return Response.json({ error: error.message }, { status: error.status });
    if (error instanceof ResumeTextError) return Response.json({ error: error.message }, { status: 422 });
    if (error instanceof DiagnosisServiceError) return Response.json({ error: error.message }, { status: error.status });
    console.error('Diagnosis failed', error);
    return Response.json({ error: '分析服务发生异常，请稍后重新分析。' }, { status: 500 });
  }
}
