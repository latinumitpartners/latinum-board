import { NextResponse } from 'next/server'
import { readAuditEvents } from '@/lib/server/audit-store'
import { rejectUnlessAuthorized } from '@/lib/server/request-guards'

export async function GET() {
  const unauthorized = await rejectUnlessAuthorized()
  if (unauthorized) return unauthorized

  const events = await readAuditEvents()
  return NextResponse.json(events)
}
