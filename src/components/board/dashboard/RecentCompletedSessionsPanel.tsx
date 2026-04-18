'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { SectionCard } from '@/components/board/ui/SectionCard'
import type { SessionSnapshot } from '@/lib/board-types'

export function RecentCompletedSessionsPanel() {
  const [sessions, setSessions] = useState<SessionSnapshot[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/dashboard', { cache: 'no-store' })
        if (!response.ok) throw new Error('Failed to load dashboard')
        const payload = (await response.json()) as { recentCompletedSessions?: SessionSnapshot[] }
        setSessions(payload.recentCompletedSessions || [])
      } catch (error) {
        console.error(error)
      }
    }

    void load()
  }, [])

  return (
    <SectionCard
      title="Recent Completions"
      action={
        <Link href="/sessions?status=quiet" className="text-xs text-sky-400 hover:text-sky-300">
          View all
        </Link>
      }
    >
      <div className="space-y-3">
        {sessions.length ? (
          sessions.map((session) => (
            <div key={session.sessionKey} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-sm font-medium text-white">{session.title}</p>
              {session.summary ? <p className="mt-1 text-xs text-slate-400">{session.summary}</p> : null}
              <p className="mt-2 text-[11px] text-slate-500">{new Date(session.lastUpdated).toLocaleString()}</p>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">No recently completed sessions detected yet.</p>
        )}
      </div>
    </SectionCard>
  )
}
