import { NextResponse } from 'next/server'
import type { SavedView } from '@/lib/board-types'
import { appendAuditEvent } from '@/lib/server/audit-store'
import { ensureObject, parseBoundedJsonBodyError, rejectUnlessAuthorized, requireNonEmptyString } from '@/lib/server/request-guards'
import { readSavedViews, writeSavedViews } from '@/lib/server/saved-views-store'

export async function GET() {
  const unauthorized = await rejectUnlessAuthorized()
  if (unauthorized) return unauthorized

  const views = await readSavedViews()
  return NextResponse.json(views)
}

export async function POST(request: Request) {
  const unauthorized = await rejectUnlessAuthorized()
  if (unauthorized) return unauthorized

  const payload = await request.json().catch(() => null)
  if (!ensureObject(payload)) return parseBoundedJsonBodyError('Invalid saved view payload')
  const view = payload as SavedView
  requireNonEmptyString(view.id, 'view.id')
  requireNonEmptyString(view.name, 'view.name')
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
