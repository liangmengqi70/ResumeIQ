import 'server-only';

export function evalToolEnabled() {
  return process.env.NODE_ENV !== 'production' || process.env.EVAL_TOOL_ENABLED === 'true';
}

export function evalUnavailable() {
  return Response.json({ error: 'Not found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
}
