import { NextResponse } from 'next/server'
import type { WorklogEntry } from '@/lib/board-types'
import { appendAuditEvent } from '@/lib/server/audit-store'
import { ensureObject, parseBoundedJsonBodyError, rejectUnlessAuthorized, requireNonEmptyString } from '@/lib/server/request-guards'
import { readWorklogs, writeWorklogs } from '@/lib/server/worklogs-store'

export async function GET() {
  const unauthorized = await rejectUnlessAuthorized()
  if (unauthorized) return unauthorized

  const worklogs = await readWorklogs()
  return NextResponse.json(worklogs)
}

export async function POST(request: Request) {
  const unauthorized = await rejectUnlessAuthorized()
  if (unauthorized) return unauthorized

  const payload = await request.json().catch(() => null)
  if (!ensureObject(payload)) return parseBoundedJsonBodyError('Invalid worklog payload')
  const worklog = payload as WorklogEntry
  requireNonEmptyString(worklog.id, 'worklog.id')
  requireNonEmptyString(worklog.date, 'worklog.date')
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
  const unauthorized = await rejectUnlessAuthorized()
  if (unauthorized) return unauthorized

  const payload = await request.json().catch(() => null)
  if (!ensureObject(payload)) return parseBoundedJsonBodyError('Invalid worklog payload')
  const updated = payload as WorklogEntry
  requireNonEmptyString(updated.id, 'worklog.id')
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
