'use client'

import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/board/ui/Badge'
import type { SessionSnapshot } from '@/lib/board-types'

export function SessionsPanel({ initialStatusFilter }: { initialStatusFilter?: string }) {
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

  const filteredSessions = useMemo(() => {
    if (!initialStatusFilter) return sessions
    return sessions.filter((session) => session.status === initialStatusFilter)
  }, [sessions, initialStatusFilter])

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-white">Live Sessions</h3>
        <div className="flex items-center gap-2">
          <Badge variant="status">{sessions.filter((s) => s.status === 'active').length} active</Badge>
          <Badge variant="default">{sessions.filter((s) => s.status === 'waiting').length} waiting</Badge>
          <Badge variant="default">{sessions.filter((s) => s.status === 'stalled').length} stalled</Badge>
          {initialStatusFilter ? <Badge variant="status">filter: {initialStatusFilter}</Badge> : null}
        </div>
      </div>

      <div className="space-y-3">
        {filteredSessions.length ? (
          filteredSessions.map((session) => (
            <div key={session.sessionKey} className={[
              'rounded-xl border p-4',
              session.status === 'active'
                ? 'border-emerald-700/60 bg-emerald-950/20'
                : session.status === 'waiting'
                  ? 'border-amber-700/60 bg-amber-950/20'
                  : session.status === 'stalled'
                    ? 'border-rose-700/60 bg-rose-950/20'
                    : 'border-slate-800 bg-slate-950/60',
            ].join(' ')}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{session.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{session.sessionKey}</p>
                </div>
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

              <div className="mt-3 grid gap-2 text-xs text-slate-400 md:grid-cols-2">
                <div>Model: {session.model || 'unknown'}</div>
                <div>Thinking: {session.thinking || 'default'}</div>
                <div>Messages: {session.messageCount}</div>
                <div>Updated: {new Date(session.lastUpdated).toLocaleString()}</div>
              </div>

              {session.summary ? (
                <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/70 p-3 text-sm text-slate-200">
                  {session.summary}
                </div>
              ) : null}

              {session.lastUserText ? (
                <div className="mt-3 rounded-lg bg-slate-900/80 p-3 text-xs text-slate-300">
                  <span className="text-slate-500">Last user:</span> {session.lastUserText}
                </div>
              ) : null}

              {session.lastAssistantText ? (
                <div className="mt-2 rounded-lg bg-slate-900/80 p-3 text-xs text-slate-300">
                  <span className="text-slate-500">Last assistant:</span> {session.lastAssistantText}
                </div>
              ) : null}
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">No sessions available for this filter yet.</p>
        )}
      </div>
    </section>
  )
}
