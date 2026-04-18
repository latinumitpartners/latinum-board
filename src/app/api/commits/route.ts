import { NextResponse } from 'next/server'
import type { CommitRecord } from '@/lib/board-types'
import { appendAuditEvent } from '@/lib/server/audit-store'
import { readCommits, writeCommits } from '@/lib/server/commits-store'

export async function GET() {
  const commits = await readCommits()
  return NextResponse.json(commits)
}

export async function PUT(request: Request) {
  const updated = (await request.json()) as CommitRecord
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
