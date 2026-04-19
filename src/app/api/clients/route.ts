import { NextResponse } from 'next/server'
import { appendAuditEvent } from '@/lib/server/audit-store'
import { boardApiAuthHeaders } from '@/lib/server/api-auth'
import { readClientRegistry } from '@/lib/server/client-registry'
import { getCrmApiBase } from '@/lib/server/crm-api-base'
import { ensureObject, parseBoundedJsonBodyError, rejectUnlessAuthorized } from '@/lib/server/request-guards'

export async function GET() {
  const unauthorized = await rejectUnlessAuthorized()
  if (unauthorized) return unauthorized

  const clients = await readClientRegistry()
  return NextResponse.json(clients)
}

export async function POST(request: Request) {
  const unauthorized = await rejectUnlessAuthorized()
  if (unauthorized) return unauthorized

  const payload = await request.json().catch(() => null)
  if (!ensureObject(payload)) return parseBoundedJsonBodyError('Invalid client payload')
  const response = await fetch(`${await getCrmApiBase()}/api/clients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...boardApiAuthHeaders() },
    body: JSON.stringify(payload),
  })

  const body = await response.json().catch(() => ({}))
  if (response.ok && body?.client?.client_id) {
    await appendAuditEvent({
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      entityType: 'view',
      entityId: body.client.client_id,
      action: 'created',
      summary: `Client registry record created: ${body.client.client_name || body.client.client_id}`,
      meta: body.client.status,
    })
  }

  return NextResponse.json(body, { status: response.status })
}
