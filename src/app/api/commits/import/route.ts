import { NextResponse } from 'next/server'
import { appendAuditEvent } from '@/lib/server/audit-store'
import { importRecentWorkspaceCommits } from '@/lib/server/git-import'
import { rejectUnlessAuthorized } from '@/lib/server/request-guards'
import { readCommits, writeCommits } from '@/lib/server/commits-store'

export async function POST() {
  const unauthorized = await rejectUnlessAuthorized()
  if (unauthorized) return unauthorized
  const commits = await readCommits()
  const imported = await importRecentWorkspaceCommits(commits)
  const added = imported.length - commits.length
  await writeCommits(imported)

  if (added > 0) {
    await appendAuditEvent({
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      entityType: 'commit',
      entityId: 'workspace-import',
      action: 'imported',
      summary: `Imported ${added} recent commit${added === 1 ? '' : 's'} from workspace`,
      meta: 'axiom-workspace git log',
    })
  }

  return NextResponse.json({ added, commits: imported })
}
