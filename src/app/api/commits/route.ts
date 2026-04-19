import { NextResponse } from 'next/server'
import type { CommitRecord } from '@/lib/board-types'
import { appendAuditEvent } from '@/lib/server/audit-store'
import { ensureObject, parseBoundedJsonBodyError, rejectUnlessAuthorized, requireNonEmptyString } from '@/lib/server/request-guards'
import { readCommits, writeCommits } from '@/lib/server/commits-store'

export async function GET() {
  const unauthorized = await rejectUnlessAuthorized()
  if (unauthorized) return unauthorized

  const commits = await readCommits()
  return NextResponse.json(commits)
}

export async function PUT(request: Request) {
  const unauthorized = await rejectUnlessAuthorized()
  if (unauthorized) return unauthorized

  const payload = await request.json().catch(() => null)
  if (!ensureObject(payload)) return parseBoundedJsonBodyError('Invalid commit payload')

  const hash = requireNonEmptyString(payload.hash, 'commit.hash')
  const message = requireNonEmptyString(payload.message, 'commit.message')
  const repo = requireNonEmptyString(payload.repo, 'commit.repo')
  const date = requireNonEmptyString(payload.date, 'commit.date')

  const updated: CommitRecord = {
    ...payload,
    hash,
    message,
    repo,
    date,
    linkedItemId: typeof payload.linkedItemId === 'string' ? payload.linkedItemId : undefined,
  }
  const commits = await readCommits()
  const next = commits.map((commit) => (commit.hash === updated.hash ? updated : commit))
  await writeCommits(next)
  await appendAuditEvent({
    id: `audit-${Date.now()}`,
    timestamp: new Date().toISOString(),
    entityType: 'commit',
    entityId: updated.hash,
    action: 'updated',
    summary: `Commit updated: ${updated.hash}`,
    meta: updated.linkedItemId || 'unlinked',
  })
  return NextResponse.json(updated)
}
