import { NextResponse } from 'next/server'
import { readSessionSnapshots } from '@/lib/server/session-ingest'
import { rejectUnlessAuthorized } from '@/lib/server/request-guards'

export async function GET() {
  const unauthorized = await rejectUnlessAuthorized()
  if (unauthorized) return unauthorized

  const sessions = await readSessionSnapshots()
  return NextResponse.json(sessions)
}
