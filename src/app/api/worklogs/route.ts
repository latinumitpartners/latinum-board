import { NextResponse } from 'next/server'
import type { WorklogEntry } from '@/lib/board-types'
import { appendAuditEvent } from '@/lib/server/audit-store'
import { readWorklogs, writeWorklogs } from '@/lib/server/worklogs-store'

export async function GET() {
  const worklogs = await readWorklogs()
  return NextResponse.json(worklogs)
}

export async function POST(request: Request) {
  const worklog = (await request.json()) as WorklogEntry
  const worklogs = await readWorklogs()
  await writeWorklogs([worklog, ...worklogs])
  await appendAuditEvent({
    id: `audit-${Date.now()}`,
    timestamp: new Date().toISOString(),
    entityType: 'worklog',
    entityId: worklog.id,
    action: 'created',
    summary: `Work log created: ${worklog.date}`,
  })
  return NextResponse.json(worklog, { status: 201 })
}

export async function PUT(request: Request) {
  const updated = (await request.json()) as WorklogEntry
  const worklogs = await readWorklogs()
  const next = worklogs.map((entry) => (entry.id === updated.id ? updated : entry))
  await writeWorklogs(next)
  await appendAuditEvent({
    id: `audit-${Date.now()}`,
    timestamp: new Date().toISOString(),
    entityType: 'worklog',
    entityId: updated.id,
    action: 'updated',
    summary: `Work log updated: ${updated.date}`,
  })
  return NextResponse.json(updated)
}
