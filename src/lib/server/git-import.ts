import type { CommitRecord } from '@/lib/board-types'

const OPERATOR_API = process.env.LATINUM_BOARD_OPERATOR_API || 'http://10.0.0.92:9876'

export async function importRecentWorkspaceCommits(existing: CommitRecord[]): Promise<CommitRecord[]> {
  const known = new Set(existing.map((commit) => commit.hash))

  try {
    const response = await fetch(`${OPERATOR_API}/api/commits/recent`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      console.warn('Operator API unavailable for commit import')
      return existing
    }

    const payload = (await response.json()) as Array<{
      hash: string
      message: string
      date: string
    }>

    const imported = payload
      .filter((commit) => !known.has(commit.hash))
      .map<CommitRecord>((commit) => ({
        hash: commit.hash,
        message: commit.message,
        repo: 'axiom-workspace',
        date: commit.date,
        filesChanged: [],
        imported: true,
      }))

    return [...imported, ...existing]
  } catch (error) {
    console.warn('Failed to fetch commits from operator API:', error)
    return existing
  }
}
