import { NextResponse } from 'next/server'
import type { SavedView } from '@/lib/board-types'
import { appendAuditEvent } from '@/lib/server/audit-store'
import { readSavedViews, writeSavedViews } from '@/lib/server/saved-views-store'

export async function GET() {
  const views = await readSavedViews()
  return NextResponse.json(views)
}

export async function POST(request: Request) {
  const view = (await request.json()) as SavedView
  const views = await readSavedViews()
  await writeSavedViews([view, ...views])
  await appendAuditEvent({
    id: `audit-${Date.now()}`,
    timestamp: new Date().toISOString(),
    entityType: 'view',
    entityId: view.id,
    action: 'saved',
    summary: `Saved view created: ${view.name}`,
    meta: view.filter,
  })
  return NextResponse.json(view, { status: 201 })
}
