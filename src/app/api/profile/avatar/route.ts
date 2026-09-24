import { readFile } from 'node:fs/promises';
import { currentUser } from '@/lib/auth';
import { dataDirectory } from '@/lib/data-directory';
export async function GET(request: Request) {
  const user = await currentUser();
  const name = new URL(request.url).searchParams.get('file');
  if (!user || !name || !/^[a-f0-9-]{36}\.png$/.test(name) || user.avatarUrl !== '/api/profile/avatar?file=' + name) return new Response(null, { status: 404 });
  try { return new Response(await readFile(dataDirectory('avatars', name)), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'private, no-store' } }); }
  catch { return new Response(null, { status: 404 }); }
}
