'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { SectionCard } from '@/components/board/ui/SectionCard'
import { Badge } from '@/components/board/ui/Badge'
import type { SessionSnapshot } from '@/lib/board-types'

export function SessionsOverviewPanel() {
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

  const active = sessions.filter((session) => session.status === 'active')
  const waiting = sessions.filter((session) => session.status === 'waiting')
  const stalled = sessions.filter((session) => session.status === 'stalled')

  const groups = [
    { label: 'Active', items: active, badge: 'success' as const },
    { label: 'Waiting', items: waiting, badge: 'status' as const },
    { label: 'Stalled', items: stalled, badge: 'default' as const },
  ]

  return (
    <SectionCard title="Session Command View" action={<Badge variant="status">{sessions.length} tracked</Badge>}>
      <div className="grid gap-4 xl:grid-cols-3">
        {groups.map((group) => (
          <div key={group.label} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-white">{group.label}</h4>
              <Link href={`/sessions?status=${group.label.toLowerCase()}`} className="inline-flex">
                <Badge variant={group.badge}>{group.items.length}</Badge>
              </Link>
            </div>

            <div className="space-y-3">
              {group.items.length ? (
                group.items.slice(0, 4).map((session) => (
                  <Link
                    key={session.sessionKey}
                    href={`/sessions?status=${group.label.toLowerCase()}`}
                    className="block rounded-lg border border-slate-800 bg-slate-900/70 p-3 transition hover:border-sky-700/50 hover:bg-slate-900"
                  >
                    <p className="text-sm font-medium text-slate-100">{session.title}</p>
                    {session.summary ? <p className="mt-1 text-xs text-slate-400">{session.summary}</p> : null}
                    <p className="mt-2 text-[11px] text-slate-500">
                      {session.model || 'unknown'} · {new Date(session.lastUpdated).toLocaleString()}
                    </p>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-slate-500">No {group.label.toLowerCase()} sessions.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}
