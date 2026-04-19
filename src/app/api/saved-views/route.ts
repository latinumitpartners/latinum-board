import { NextResponse } from 'next/server'
import type { SavedView } from '@/lib/board-types'

const ALLOWED_VIEW_FILTERS = new Set<SavedView['filter']>([
  'all',
  'high_priority',
  'blocked',
  'kevin',
  'claudia',
  'needs_logging',
])
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

  const id = requireNonEmptyString(payload.id, 'view.id')
  const name = requireNonEmptyString(payload.name, 'view.name')
  const filterValue = requireNonEmptyString(payload.filter, 'view.filter')
  if (!ALLOWED_VIEW_FILTERS.has(filterValue as SavedView['filter'])) {
    return parseBoundedJsonBodyError('Invalid view.filter')
  }
  const filter = filterValue as SavedView['filter']
  const createdAt = requireNonEmptyString(payload.createdAt, 'view.createdAt')

  const view: SavedView = {
    ...payload,
    id,
    name,
    filter,
    createdAt,
  }
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
