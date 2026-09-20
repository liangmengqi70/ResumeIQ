import { mutation } from '@/lib/api';
import { signOut } from '@/lib/auth';
export async function POST(request: Request) { return mutation(request, async () => { await signOut(); return { ok: true }; }); }
