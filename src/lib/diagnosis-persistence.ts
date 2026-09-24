import 'server-only';

import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { db, transaction } from './db';
import type { BackgroundAnswers } from './diagnosis-draft';
import type { DiagnosisReport, Verdict } from './diagnosis-report';
import type { DiagnosisUsage } from './deepseek-diagnosis';
import { dataDirectory } from './data-directory';
import { AuthError } from './auth-policy';

export type DiagnosisOwner = { userId: string | null; guestSessionId: string | null };
export type StoredDiagnosis = {
  taskId: string;
  resumeId: string;
  jobDescriptionId: string;
  surveyId: string;
};

function positiveLimit(name: string, productionDefault: number) {
  const configured = process.env[name];
  if (configured === undefined || configured.trim() === '') return process.env.NODE_ENV === 'production' ? productionDefault : 0;
  const value = Number(configured);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

export async function enforceDiagnosisQuota(owner: DiagnosisOwner) {
  const globalLimit = positiveLimit('AI_DAILY_GLOBAL_LIMIT', 20);
  const ownerLimit = positiveLimit('AI_DAILY_OWNER_LIMIT', 3);
  if (!globalLimit && !ownerLimit) return;

  if (globalLimit) {
    const [rows] = await db().execute<RowDataPacket[]>(
      'SELECT COUNT(*) AS total FROM diagnosis_tasks WHERE created_at >= UTC_TIMESTAMP(3) - INTERVAL 24 HOUR',
    );
    if (Number(rows[0]?.total || 0) >= globalLimit) throw new AuthError('今日公开体验次数已用完，请稍后再试。', 429);
  }

  if (ownerLimit) {
    const field = owner.userId ? 'user_id' : 'guest_session_id';
    const value = owner.userId || owner.guestSessionId;
    const [rows] = await db().execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM diagnosis_tasks WHERE ${field} = ? AND created_at >= UTC_TIMESTAMP(3) - INTERVAL 24 HOUR`,
      [value],
    );
    if (Number(rows[0]?.total || 0) >= ownerLimit) throw new AuthError('你今天的体验次数已用完，请明天再试。', 429);
  }
}

const retentionMs = 10 * 24 * 60 * 60 * 1000;

function mysqlDate(value: Date) {
  return new Date(value.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 23).replace('T', ' ');
}

function ownerValues(owner: DiagnosisOwner) {
  return [owner.userId, owner.guestSessionId, owner.userId ? null : mysqlDate(new Date(Date.now() + retentionMs))] as const;
}

export async function storeDiagnosisInputs(input: {
  owner: DiagnosisOwner;
  file: File;
  resumeText: string;
  jd: string;
  background: BackgroundAnswers;
}) {
  const extension = input.file.name.split('.').pop()?.toLowerCase() || '';
  const storageDirectory = dataDirectory('resumes');
  const storageName = `${randomUUID()}.${extension}`;
  await mkdir(storageDirectory, { recursive: true });
  await writeFile(path.join(/*turbopackIgnore: true*/ storageDirectory, storageName), Buffer.from(await input.file.arrayBuffer()));
  const storageKey = path.posix.join('resumes', storageName);
  const [userId, guestSessionId, expiresAt] = ownerValues(input.owner);

  return transaction(async connection => {
    const [resume] = await connection.execute<ResultSetHeader>(
      'INSERT INTO resume_files (user_id, guest_session_id, original_filename, storage_key, file_extension, mime_type, size_bytes, extracted_text, parse_status, uploaded_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, guestSessionId, input.file.name.slice(0, 255), storageKey, extension, input.file.type || null, input.file.size, input.resumeText, 'succeeded', mysqlDate(new Date()), expiresAt],
    );
    const [jd] = await connection.execute<ResultSetHeader>(
      'INSERT INTO job_descriptions (user_id, guest_session_id, job_title, raw_text, normalized_text, character_count, is_sample, expires_at) VALUES (?, ?, NULL, ?, ?, ?, FALSE, ?)',
      [userId, guestSessionId, input.jd, input.jd, [...input.jd].length, expiresAt],
    );
    const [survey] = await connection.execute<ResultSetHeader>(
      'INSERT INTO background_surveys (user_id, guest_session_id, current_identity, application_status, difficulties, additional_notes, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, guestSessionId, input.background.identity || '未填写', input.background.applications || '未填写', JSON.stringify(input.background.difficulties), input.background.question || null, expiresAt],
    );
    const [task] = await connection.execute<ResultSetHeader>(
      'INSERT INTO diagnosis_tasks (user_id, guest_session_id, resume_file_id, job_description_id, background_survey_id, idempotency_key, status, model_name, prompt_version, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, guestSessionId, resume.insertId, jd.insertId, survey.insertId, randomUUID(), 'processing', process.env.DEEPSEEK_MODEL?.trim() || 'deepseek-v4-pro', 'resumeiq-diagnosis-v1', expiresAt],
    );
    return { taskId: String(task.insertId), resumeId: String(resume.insertId), jobDescriptionId: String(jd.insertId), surveyId: String(survey.insertId) } satisfies StoredDiagnosis;
  });
}

function databaseConclusion(verdict: Verdict) {
  return verdict === 'recommended' ? 'recommended' : verdict === 'concern' ? 'concerned' : 'not_recommended';
}

function price(name: string, fallback: string) {
  const value = Number(process.env[name] || process.env[fallback] || 0);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

export async function completeDiagnosis(stored: StoredDiagnosis, report: DiagnosisReport, usage: DiagnosisUsage) {
  return transaction(async connection => {
    await connection.execute('UPDATE job_descriptions SET job_title = ? WHERE id = ?', [report.targetRole.slice(0, 100), stored.jobDescriptionId]);
    const [result] = await connection.execute<ResultSetHeader>(
      'INSERT INTO diagnosis_reports (task_id, conclusion, conclusion_summary, issues, strengths, raw_model_output, generated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [stored.taskId, databaseConclusion(report.verdict), report.verdictSummary, JSON.stringify(report.problems), JSON.stringify(report.strengths), JSON.stringify(report), mysqlDate(new Date(report.generatedAt))],
    );
    const inputPrice = price('DEEPSEEK_INPUT_CNY_PER_1M', 'EVAL_DEEPSEEK_INPUT_CNY_PER_1M');
    const cachedPrice = price('DEEPSEEK_CACHED_INPUT_CNY_PER_1M', 'EVAL_DEEPSEEK_CACHED_INPUT_CNY_PER_1M');
    const outputPrice = price('DEEPSEEK_OUTPUT_CNY_PER_1M', 'EVAL_DEEPSEEK_OUTPUT_CNY_PER_1M');
    const cachedTokens = Math.min(usage.inputTokens, usage.cachedInputTokens);
    const estimatedCost = ((usage.inputTokens - cachedTokens) * inputPrice + cachedTokens * cachedPrice + usage.outputTokens * outputPrice) / 1_000_000;
    await connection.execute(`INSERT INTO ai_usage_records
      (task_id, attempt_number, provider, model_name, provider_request_id, status, latency_ms, input_tokens, cached_input_tokens, output_tokens, reasoning_tokens, total_tokens, currency, input_price_per_million, cached_input_price_per_million, output_price_per_million, estimated_cost)
      VALUES (?, 1, ?, ?, ?, 'succeeded', ?, ?, ?, ?, ?, ?, 'CNY', ?, ?, ?, ?)`,
      [stored.taskId, usage.provider, usage.modelName, usage.providerRequestId, usage.latencyMs, usage.inputTokens, cachedTokens, usage.outputTokens, usage.reasoningTokens, usage.totalTokens, inputPrice, cachedPrice, outputPrice, estimatedCost]);
    await connection.execute('UPDATE diagnosis_tasks SET status = ?, completed_at = ? WHERE id = ?', ['succeeded', mysqlDate(new Date(report.generatedAt)), stored.taskId]);
    return { ...report, id: `db-report-${result.insertId}` };
  });
}

export async function recordFailedUsage(stored: StoredDiagnosis, latencyMs: number) {
  await db().execute(`INSERT IGNORE INTO ai_usage_records
    (task_id, attempt_number, provider, model_name, status, latency_ms, currency)
    VALUES (?, 1, 'deepseek', ?, 'failed', ?, 'CNY')`,
    [stored.taskId, process.env.DEEPSEEK_MODEL?.trim() || 'deepseek-v4-pro', Math.max(0, latencyMs)]);
}

export async function failDiagnosis(stored: StoredDiagnosis, error: unknown) {
  const message = error instanceof Error ? error.message.slice(0, 1000) : '未知错误';
  await db().execute('UPDATE diagnosis_tasks SET status = ?, error_code = ?, error_message = ? WHERE id = ?', ['failed', 'DIAGNOSIS_FAILED', message, stored.taskId]);
}

function jsonArray(value: unknown) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') { try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; } }
  return [];
}

function reportVerdict(value: string): Verdict {
  return value === 'recommended' ? 'recommended' : value === 'concerned' ? 'concern' : 'rejected';
}

export async function diagnosisHistory(userId: string) {
  const [rows] = await db().execute<RowDataPacket[]>(`SELECT r.id AS report_id, r.conclusion, r.conclusion_summary, r.issues, r.strengths, r.generated_at,
    t.completed_at, f.original_filename, f.uploaded_at, j.job_title
    FROM diagnosis_reports r
    JOIN diagnosis_tasks t ON t.id = r.task_id
    JOIN resume_files f ON f.id = t.resume_file_id
    JOIN job_descriptions j ON j.id = t.job_description_id
    WHERE t.user_id = ? AND t.status = 'succeeded' AND t.deleted_at IS NULL AND r.deleted_at IS NULL AND f.deleted_at IS NULL AND j.deleted_at IS NULL
    ORDER BY t.completed_at DESC`, [userId]);
  return rows.map(row => {
    const report: DiagnosisReport = {
      id: `db-report-${row.report_id}`,
      generatedAt: `${String(row.generated_at).replace(' ', 'T')}+08:00`,
      targetRole: String(row.job_title || '目标岗位'),
      verdict: reportVerdict(String(row.conclusion)),
      verdictSummary: String(row.conclusion_summary),
      problems: jsonArray(row.issues) as DiagnosisReport['problems'],
      strengths: jsonArray(row.strengths) as DiagnosisReport['strengths'],
    };
    return {
      id: report.id,
      fileName: String(row.original_filename),
      uploadedAt: `${String(row.uploaded_at).replace(' ', 'T')}+08:00`,
      completedAt: `${String(row.completed_at || row.generated_at).replace(' ', 'T')}+08:00`,
      report,
    };
  });
}

export async function deleteStoredDiagnosis(userId: string, reportId: string) {
  const match = /^db-report-(\d+)$/.exec(reportId);
  if (!match) return false;
  return transaction(async connection => {
    const [rows] = await connection.execute<RowDataPacket[]>(`SELECT r.id AS report_id, t.id AS task_id, t.resume_file_id, t.job_description_id, t.background_survey_id
      FROM diagnosis_reports r JOIN diagnosis_tasks t ON t.id = r.task_id
      WHERE r.id = ? AND t.user_id = ? AND r.deleted_at IS NULL FOR UPDATE`, [match[1], userId]);
    if (!rows[0]) return false;
    const row = rows[0];
    const deletedAt = mysqlDate(new Date());
    await connection.execute('UPDATE diagnosis_reports SET deleted_at = ? WHERE id = ?', [deletedAt, row.report_id]);
    await connection.execute('UPDATE diagnosis_tasks SET deleted_at = ? WHERE id = ?', [deletedAt, row.task_id]);
    await connection.execute('UPDATE resume_files SET deleted_at = ? WHERE id = ?', [deletedAt, row.resume_file_id]);
    await connection.execute('UPDATE job_descriptions SET deleted_at = ? WHERE id = ?', [deletedAt, row.job_description_id]);
    await connection.execute('UPDATE background_surveys SET deleted_at = ? WHERE id = ?', [deletedAt, row.background_survey_id]);
    return true;
  });
}

export async function recordAuthenticatedReportView(userId: string, reportId: string) {
  const match = /^db-report-(\d+)$/.exec(reportId);
  if (!match) return null;
  return transaction(async connection => {
    const [reports] = await connection.execute<RowDataPacket[]>(`SELECT r.id
      FROM diagnosis_reports r JOIN diagnosis_tasks t ON t.id = r.task_id
      WHERE r.id = ? AND t.user_id = ? AND t.status = 'succeeded' AND t.deleted_at IS NULL AND r.deleted_at IS NULL
      FOR UPDATE`, [match[1], userId]);
    if (!reports[0]) return null;
    await connection.execute('UPDATE diagnosis_reports SET first_viewed_at = COALESCE(first_viewed_at, ?) WHERE id = ?', [mysqlDate(new Date()), match[1]]);
    const [existing] = await connection.execute<RowDataPacket[]>('SELECT report_id FROM free_usage_records WHERE user_id = ? FOR UPDATE', [userId]);
    if (!existing[0]) {
      await connection.execute('INSERT INTO free_usage_records (user_id, report_id) VALUES (?, ?)', [userId, match[1]]);
      return { consumedNow: true, freeReportId: reportId };
    }
    return { consumedNow: false, freeReportId: `db-report-${existing[0].report_id}` };
  });
}
