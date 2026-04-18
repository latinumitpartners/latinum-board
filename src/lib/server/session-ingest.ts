import { promises as fs } from 'fs'
import path from 'path'

import type { SessionSnapshot } from '@/lib/board-types'

const SESSION_SNAPSHOT_FILE = process.env.LATINUM_BOARD_SESSIONS_FILE || path.join(process.cwd(), 'data', 'sessions.json')

export async function readSessionSnapshots(limit = 20): Promise<SessionSnapshot[]> {
  try {
    const raw = await fs.readFile(SESSION_SNAPSHOT_FILE, 'utf8')
    const payload = JSON.parse(raw) as SessionSnapshot[]
    return payload.slice(0, limit)
  } catch {
    return []
  }
}
