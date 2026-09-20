import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { apiError } from '@/lib/api';
export async function GET() { try { return NextResponse.json({ user: await currentUser() }, { headers: { 'Cache-Control': 'no-store' } }); } catch (error) { return apiError(error); } }
