export interface SessionSnapshot {
  sessionKey: string
  title: string
  lastUpdated: string
  cwd?: string
  model?: string
  thinking?: string
  lastUserText?: string
  lastAssistantText?: string
  messageCount: number
  status: 'active' | 'quiet'
}

const OPERATOR_API = process.env.LATINUM_BOARD_OPERATOR_API || 'http://10.0.0.92:9876'

export async function readSessionSnapshots(limit = 20): Promise<SessionSnapshot[]> {
  try {
    const response = await fetch(`${OPERATOR_API}/api/sessions/recent`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    })

    if (!response.ok) return []

    const payload = (await response.json()) as SessionSnapshot[]
    return payload.slice(0, limit)
  } catch {
    return []
  }
}
