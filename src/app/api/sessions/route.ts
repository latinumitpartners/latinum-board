import { NextResponse } from 'next/server'
import { readSessionSnapshots } from '@/lib/server/session-ingest'

export async function GET() {
  const sessions = await readSessionSnapshots()
  return NextResponse.json(sessions)
}
