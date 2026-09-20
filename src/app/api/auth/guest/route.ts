import { mutation } from '@/lib/api';
import { enterGuest } from '@/lib/auth';
export async function POST(request: Request) { return mutation(request, async () => { await enterGuest(); return { ok: true }; }); }
