import { promises as fs } from 'fs'
import path from 'path'

import type { IngestionEnvelope } from '@/lib/ingestion-types'

const SCHEMA_VERSION = '2026-04-18.v1'

export function buildLocalEnvelope<T>(kind: IngestionEnvelope<T>['kind'], items: T[]): IngestionEnvelope<T> {
  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    source: 'local-store',
    kind,
    items,
  }
}

export async function writeIngestionItems<T>(filename: string, kind: IngestionEnvelope<T>['kind'], items: T[]): Promise<void> {
  const fullPath = path.join(process.cwd(), 'data', filename)
  const envelope = buildLocalEnvelope(kind, items)
  await fs.writeFile(fullPath, JSON.stringify(envelope, null, 2) + '\n', 'utf8')
}

export async function readIngestionItems<T>(filename: string): Promise<T[]> {
  const fullPath = path.join(process.cwd(), 'data', filename)
  const raw = await fs.readFile(fullPath, 'utf8')
  const payload = JSON.parse(raw) as T[] | IngestionEnvelope<T>

  if (Array.isArray(payload)) return payload
  if (payload && Array.isArray(payload.items)) return payload.items
  return []
}

export async function readIngestionMeta<T>(filename: string): Promise<Pick<IngestionEnvelope<T>, 'schemaVersion' | 'generatedAt' | 'source' | 'kind'> | null> {
  const fullPath = path.join(process.cwd(), 'data', filename)
  try {
    const raw = await fs.readFile(fullPath, 'utf8')
    const payload = JSON.parse(raw) as T[] | IngestionEnvelope<T>
    if (Array.isArray(payload)) return null
    if (payload && payload.generatedAt && payload.schemaVersion && payload.kind && payload.source) {
      return {
        schemaVersion: payload.schemaVersion,
        generatedAt: payload.generatedAt,
        source: payload.source,
        kind: payload.kind,
      }
    }
    return null
  } catch {
    return null
  }
}
