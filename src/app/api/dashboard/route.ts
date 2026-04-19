import { NextResponse } from 'next/server'
import { buildDashboardData, createBoardSnapshot } from '@/lib/board-data'
import { readAuditEvents } from '@/lib/server/audit-store'
import { readCommits } from '@/lib/server/commits-store'
import { rejectUnlessAuthorized } from '@/lib/server/request-guards'
import { readTasks } from '@/lib/server/tasks-store'
import { readWorklogs } from '@/lib/server/worklogs-store'
import { readSessionSnapshots } from '@/lib/server/session-ingest'

export async function GET() {
  const unauthorized = await rejectUnlessAuthorized()
  if (unauthorized) return unauthorized

  const [tasks, commits, worklogs, auditEvents, sessions] = await Promise.all([
    readTasks(),
    readCommits(),
    readWorklogs(),
    readAuditEvents(),
    readSessionSnapshots(),
  ])
  const snapshot = createBoardSnapshot(tasks, commits, worklogs, auditEvents)
  const dashboard = buildDashboardData(snapshot, sessions)
  return NextResponse.json(dashboard)
}
