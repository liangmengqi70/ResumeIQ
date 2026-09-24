import 'server-only';

import path from 'node:path';

export function dataDirectory(...segments: string[]) {
  const root = process.env.RESUMEIQ_DATA_DIR?.trim() || path.join(process.cwd(), '.data');
  return path.join(/*turbopackIgnore: true*/ root, ...segments);
}
