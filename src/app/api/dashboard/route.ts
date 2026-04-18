import { NextResponse } from 'next/server'
import { buildDashboardData, createBoardSnapshot } from '@/lib/board-data'
import { readAuditEvents } from '@/lib/server/audit-store'
import { readCommits } from '@/lib/server/commits-store'
import { readTasks } from '@/lib/server/tasks-store'
import { readWorklogs } from '@/lib/server/worklogs-store'

export async function GET() {
  const [tasks, commits, worklogs, auditEvents] = await Promise.all([readTasks(), readCommits(), readWorklogs(), readAuditEvents()])
  const snapshot = createBoardSnapshot(tasks, commits, worklogs, auditEvents)
  const dashboard = buildDashboardData(snapshot)
  return NextResponse.json(dashboard)
}
