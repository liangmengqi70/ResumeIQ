import 'server-only';
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { CurrencyCode, EvalRun, ManualReview } from './types';

type StoreEvent = { type: 'run'; run: EvalRun } | { type: 'review'; runId: string; review: ManualReview };
const dataDirectory = path.join(process.cwd(), '.data', 'eval-tool');
const eventsFile = path.join(dataDirectory, 'events.jsonl');

async function events(): Promise<StoreEvent[]> {
  try {
    const content = await readFile(eventsFile, 'utf8');
    return content.split(/\r?\n/).filter(Boolean).flatMap(line => { try { return [JSON.parse(line) as StoreEvent]; } catch { return []; } });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

async function append(event: StoreEvent) {
  await mkdir(dataDirectory, { recursive: true });
  await appendFile(eventsFile, `${JSON.stringify(event)}\n`, { encoding: 'utf8', flag: 'a' });
}

export async function saveRun(run: EvalRun) { await append({ type: 'run', run }); }
export async function saveReview(runId: string, review: ManualReview) { await append({ type: 'review', runId, review }); }

export async function listRuns(): Promise<EvalRun[]> {
  const map = new Map<string, EvalRun>();
  for (const event of await events()) {
    if (event.type === 'run') {
      const legacy = event.run as EvalRun & { estimatedCostUsd?: number | null; costCurrency?: CurrencyCode; estimatedCost?: number | null };
      map.set(event.run.id, {
        ...event.run,
        estimatedCost: legacy.estimatedCost ?? legacy.estimatedCostUsd ?? null,
        costCurrency: legacy.costCurrency ?? (event.run.provider === 'deepseek' ? 'CNY' : 'USD'),
      });
    }
    else {
      const run = map.get(event.runId);
      if (run) map.set(event.runId, { ...run, review: event.review });
    }
  }
  return [...map.values()].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}
