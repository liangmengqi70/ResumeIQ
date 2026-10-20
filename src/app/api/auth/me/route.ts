import { NextResponse } from 'next/server';
import { currentOwner, currentUser } from '@/lib/auth';
import { apiError } from '@/lib/api';
export async function GET() { try { const user = await currentUser(); const guest = !user && Boolean((await currentOwner())?.guestSessionId); return NextResponse.json({ user, guest }, { headers: { 'Cache-Control': 'no-store' } }); } catch (error) { return apiError(error); } }
