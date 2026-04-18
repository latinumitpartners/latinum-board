'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { SectionCard } from '@/components/board/ui/SectionCard'
import { Badge } from '@/components/board/ui/Badge'
import type { SessionSnapshot } from '@/lib/board-types'

export function SessionsSecondaryPanel() {
  const [sessions, setSessions] = useState<SessionSnapshot[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/sessions', { cache: 'no-store' })
        if (!response.ok) throw new Error('Failed to load sessions')
        const payload = (await response.json()) as SessionSnapshot[]
        setSessions(payload)
      } catch (error) {
        console.error(error)
      }
    }

    void load()
  }, [])

  const preview = useMemo(() => sessions.slice(0, 5), [sessions])

  return (
    <SectionCard
      title="Live Sessions Preview"
      action={
        <Link href="/sessions" className="text-xs text-sky-400 hover:text-sky-300">
          Open full sessions view
        </Link>
      }
    >
      <div className="space-y-3">
        {preview.length ? (
          preview.map((session) => (
            <div key={session.sessionKey} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-white">{session.title}</p>
                {session.status === 'active' ? (
                  <Badge variant="success">Active</Badge>
                ) : session.status === 'waiting' ? (
                  <Badge variant="status">Waiting</Badge>
                ) : session.status === 'stalled' ? (
                  <Badge variant="default">Stalled</Badge>
                ) : (
                  <Badge variant="default">Quiet</Badge>
                )}
              </div>
              {session.summary ? <p className="mt-1 text-xs text-slate-400">{session.summary}</p> : null}
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">No sessions available yet.</p>
        )}
      </div>
    </SectionCard>
  )
}
