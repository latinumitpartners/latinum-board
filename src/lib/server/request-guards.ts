import { NextResponse } from 'next/server'
import { requireBoardApiAuth } from '@/lib/server/api-auth'

export async function rejectUnlessAuthorized() {
  return requireBoardApiAuth()
}

export function ensureObject(payload: unknown): payload is Record<string, unknown> {
  return typeof payload === 'object' && payload !== null && !Array.isArray(payload)
}

export function parseBoundedJsonBodyError(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status })
}

export function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${field} is required`)
  }
  return value.trim()
}
