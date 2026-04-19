import { NextResponse } from 'next/server'
import type { Priority, Status, WorkItem } from '@/lib/board-types'
import { appendAuditEvent } from '@/lib/server/audit-store'
import { ensureObject, parseBoundedJsonBodyError, rejectUnlessAuthorized, requireNonEmptyString } from '@/lib/server/request-guards'
import { readTasks, writeTasks } from '@/lib/server/tasks-store'

const ALLOWED_TASK_STATUSES = new Set<Status>([
  'inbox',
  'next',
  'in_progress',
  'waiting',
  'blocked',
  'review',
  'done',
])

const ALLOWED_TASK_PRIORITIES = new Set<Priority>([
  'low',
  'medium',
  'high',
  'critical',
])

function requireTaskStatus(value: unknown, field: string): Status {
  const status = requireNonEmptyString(value, field)
  if (!ALLOWED_TASK_STATUSES.has(status as Status)) {
    throw new Error(`${field} is invalid`)
  }
  return status as Status
}

function requireTaskPriority(value: unknown, field: string): Priority {
  const priority = requireNonEmptyString(value, field)
  if (!ALLOWED_TASK_PRIORITIES.has(priority as Priority)) {
    throw new Error(`${field} is invalid`)
  }
  return priority as Priority
}

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

  const id = requireNonEmptyString(payload.id, 'task.id')
  const title = requireNonEmptyString(payload.title, 'task.title')
  const status = requireTaskStatus(payload.status, 'task.status')
  const priority = requireTaskPriority(payload.priority, 'task.priority')

  const task: WorkItem = {
    ...payload,
    id,
    title,
    status,
    priority,
  }
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

  const payload = await request.json().catch(() => null)
  if (!ensureObject(payload)) return parseBoundedJsonBodyError('Invalid task payload')
  const tasks = await readTasks()

  const deleteId = typeof payload.__deleteId === 'string' ? payload.__deleteId : undefined
  if (deleteId) {
    const next = tasks.filter((task) => task.id !== deleteId)
    await writeTasks(next)
    await appendAuditEvent({
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      entityType: 'task',
      entityId: deleteId,
      action: 'deleted',
      summary: `Task deleted: ${deleteId}`,
    })
    return NextResponse.json({ deleted: deleteId })
  }

  const id = requireNonEmptyString(payload.id, 'task.id')
  const title = requireNonEmptyString(payload.title, 'task.title')
  const status = requireTaskStatus(payload.status, 'task.status')
  const priority = requireTaskPriority(payload.priority, 'task.priority')

  const updated: WorkItem = {
    ...payload,
    id,
    title,
    status,
    priority,
  }

  const next = tasks.map((task) => (task.id === updated.id ? updated : task))
  await writeTasks(next)
  await appendAuditEvent({
    id: `audit-${Date.now()}`,
    timestamp: new Date().toISOString(),
    entityType: 'task',
    entityId: updated.id,
    action: 'updated',
    summary: `Task updated: ${updated.title}`,
    meta: updated.status,
  })
  return NextResponse.json(updated)
}
