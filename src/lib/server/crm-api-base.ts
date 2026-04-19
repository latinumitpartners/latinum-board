import { headers } from 'next/headers'

const DEFAULT_CRM_API_BASE = '/operator-api'

export async function getCrmApiBase(): Promise<string> {
  const configured = process.env.LATINUM_BOARD_OPERATOR_API_BASE
  if (configured) {
    return configured
  }

  const headerStore = await headers()
  const proto = headerStore.get('x-forwarded-proto') ?? 'http'
  const host = headerStore.get('x-forwarded-host') ?? headerStore.get('host')

  if (host) {
    return `${proto}://${host}${DEFAULT_CRM_API_BASE}`
  }

  return `http://127.0.0.1:3010${DEFAULT_CRM_API_BASE}`
}
