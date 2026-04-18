import { promises as fs } from 'fs'
import path from 'path'

import type { SessionSnapshot } from '@/lib/board-types'
import type { IngestionEnvelope, IngestedSessionRecord } from '@/lib/ingestion-types'

const SESSION_SNAPSHOT_FILE = process.env.LATINUM_BOARD_SESSIONS_FILE || path.join(process.cwd(), 'data', 'sessions.json')

function normalizeSessionItems(payload: unknown): SessionSnapshot[] {
  if (Array.isArray(payload)) {
    return payload as SessionSnapshot[]
  }

  const envelope = payload as IngestionEnvelope<IngestedSessionRecord>
  if (envelope && Array.isArray(envelope.items)) {
    return envelope.items as SessionSnapshot[]
  }

  return []
}

export async function readSessionSnapshots(limit = 20): Promise<SessionSnapshot[]> {
  try {
    const raw = await fs.readFile(SESSION_SNAPSHOT_FILE, 'utf8')
    const payload = JSON.parse(raw)
    const sessions = normalizeSessionItems(payload)
    return sessions.slice(0, limit)
  } catch {
    return []
  }
}
