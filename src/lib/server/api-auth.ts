import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

const APP_TOKEN_ENV = 'LATINUM_BOARD_API_TOKEN'
const APP_TOKEN_HEADER = 'x-latinum-board-token'

function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}

export async function requireBoardApiAuth(): Promise<NextResponse | null> {
  const expected = process.env[APP_TOKEN_ENV]?.trim()
  if (!expected) {
    return NextResponse.json(
      { success: false, message: `Server misconfigured: missing ${APP_TOKEN_ENV}` },
      { status: 503 },
    )
  }

  const headerStore = await headers()
  const provided = headerStore.get(APP_TOKEN_HEADER)?.trim() ?? ''
  if (!provided || !timingSafeEqualString(provided, expected)) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  return null
}

export function boardApiAuthHeaders(): HeadersInit {
  const token = process.env[APP_TOKEN_ENV]?.trim()
  if (!token) {
    throw new Error(`Missing ${APP_TOKEN_ENV}`)
  }
  return { [APP_TOKEN_HEADER]: token }
}
