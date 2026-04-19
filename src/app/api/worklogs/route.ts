import { NextResponse } from 'next/server'
import type { WorklogEntry } from '@/lib/board-types'
import { appendAuditEvent } from '@/lib/server/audit-store'
import { ensureObject, parseBoundedJsonBodyError, rejectUnlessAuthorized, requireNonEmptyString } from '@/lib/server/request-guards'
import { readWorklogs, writeWorklogs } from '@/lib/server/worklogs-store'

function requireStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`${field} must be an array of strings`)
  }
  return value
}

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

  const id = requireNonEmptyString(payload.id, 'worklog.id')
  const date = requireNonEmptyString(payload.date, 'worklog.date')
  const summary = requireNonEmptyString(payload.summary, 'worklog.summary')
  const bullets = requireStringArray(payload.bullets, 'worklog.bullets')
  const linkedItemIds = requireStringArray(payload.linkedItemIds, 'worklog.linkedItemIds')
  const linkedCommitHashes = requireStringArray(payload.linkedCommitHashes, 'worklog.linkedCommitHashes')

  const worklog: WorklogEntry = {
    ...payload,
    id,
    date,
    summary,
    bullets,
    linkedItemIds,
    linkedCommitHashes,
  }
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

  const id = requireNonEmptyString(payload.id, 'worklog.id')
  const date = requireNonEmptyString(payload.date, 'worklog.date')
  const summary = requireNonEmptyString(payload.summary, 'worklog.summary')
  const bullets = requireStringArray(payload.bullets, 'worklog.bullets')
  const linkedItemIds = requireStringArray(payload.linkedItemIds, 'worklog.linkedItemIds')
  const linkedCommitHashes = requireStringArray(payload.linkedCommitHashes, 'worklog.linkedCommitHashes')

  const updated: WorklogEntry = {
    ...payload,
    id,
    date,
    summary,
    bullets,
    linkedItemIds,
    linkedCommitHashes,
  }
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
