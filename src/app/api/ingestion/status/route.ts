import { NextResponse } from 'next/server'
import { readIngestionMeta } from '@/lib/server/ingestion-readers'

function getAgeMinutes(timestamp?: string | null) {
  if (!timestamp) return null
  const ageMs = Date.now() - new Date(timestamp).getTime()
  return Math.round(ageMs / 60000)
}

export async function GET() {
  const [sessions, commits, tasks, worklogs] = await Promise.all([
    readIngestionMeta('sessions.json'),
    readIngestionMeta('commits.json'),
    readIngestionMeta('tasks.json'),
    readIngestionMeta('worklogs.json'),
  ])

  const payload = {
    sessions: sessions ? { ...sessions, ageMinutes: getAgeMinutes(sessions.generatedAt) } : null,
    commits: commits ? { ...commits, ageMinutes: getAgeMinutes(commits.generatedAt) } : null,
    tasks: tasks ? { ...tasks, ageMinutes: getAgeMinutes(tasks.generatedAt) } : null,
    worklogs: worklogs ? { ...worklogs, ageMinutes: getAgeMinutes(worklogs.generatedAt) } : null,
  }

  return NextResponse.json(payload)
}
