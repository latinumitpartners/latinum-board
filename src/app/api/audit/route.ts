import { NextResponse } from 'next/server'
import { readAuditEvents } from '@/lib/server/audit-store'

export async function GET() {
  const events = await readAuditEvents()
  return NextResponse.json(events)
}
