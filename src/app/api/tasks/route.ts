import { NextResponse } from 'next/server'
import type { WorkItem } from '@/lib/board-types'
import { appendAuditEvent } from '@/lib/server/audit-store'
import { ensureObject, parseBoundedJsonBodyError, rejectUnlessAuthorized, requireNonEmptyString } from '@/lib/server/request-guards'
import { readTasks, writeTasks } from '@/lib/server/tasks-store'

export async function GET() {
  const unauthorized = await rejectUnlessAuthorized()
  if (unauthorized) return unauthorized

  const tasks = await readTasks()
  return NextResponse.json(tasks)
}

export async function POST(request: Request) {
  const unauthorized = await rejectUnlessAuthorized()
  if (unauthorized) return unauthorized

  const payload = await request.json().catch(() => null)
  if (!ensureObject(payload)) return parseBoundedJsonBodyError('Invalid task payload')
  const task = payload as WorkItem
  requireNonEmptyString(task.id, 'task.id')
  requireNonEmptyString(task.title, 'task.title')
  requireNonEmptyString(task.status, 'task.status')
  const tasks = await readTasks()
  await writeTasks([task, ...tasks])
  await appendAuditEvent({
    id: `audit-${Date.now()}`,
    timestamp: new Date().toISOString(),
    entityType: 'task',
    entityId: task.id,
    action: 'created',
    summary: `Task created: ${task.title}`,
    meta: task.status,
  })
  return NextResponse.json(task, { status: 201 })
}

export async function PUT(request: Request) {
  const unauthorized = await rejectUnlessAuthorized()
  if (unauthorized) return unauthorized

  const payload = (await request.json().catch(() => null)) as (WorkItem & { __deleteId?: string }) | null
  if (!ensureObject(payload)) return parseBoundedJsonBodyError('Invalid task payload')
  const tasks = await readTasks()

  if (payload.__deleteId) {
    const next = tasks.filter((task) => task.id !== payload.__deleteId)
    await writeTasks(next)
    await appendAuditEvent({
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      entityType: 'task',
      entityId: payload.__deleteId,
      action: 'deleted',
      summary: `Task deleted: ${payload.__deleteId}`,
    })
    return NextResponse.json({ deleted: payload.__deleteId })
  }

  const next = tasks.map((task) => (task.id === payload.id ? payload : task))
  await writeTasks(next)
  await appendAuditEvent({
    id: `audit-${Date.now()}`,
    timestamp: new Date().toISOString(),
    entityType: 'task',
    entityId: payload.id,
    action: 'updated',
    summary: `Task updated: ${payload.title}`,
    meta: payload.status,
  })
  return NextResponse.json(payload)
}
