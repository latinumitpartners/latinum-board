'use client'

import { useEffect, useState } from 'react'
import { SectionCard } from '@/components/board/ui/SectionCard'
import { Badge } from '@/components/board/ui/Badge'

type IngestionMeta = {
  schemaVersion: string
  generatedAt: string
  source: string
  kind: string
  ageMinutes: number | null
}

type IngestionStatus = {
  sessions: IngestionMeta | null
  commits: IngestionMeta | null
  tasks: IngestionMeta | null
  worklogs: IngestionMeta | null
}

function freshnessBadge(ageMinutes: number | null) {
  if (ageMinutes === null) return <Badge variant="default">unknown</Badge>
  if (ageMinutes <= 10) return <Badge variant="success">fresh</Badge>
  if (ageMinutes <= 60) return <Badge variant="status">aging</Badge>
  return <Badge variant="default">stale</Badge>
}

export function IngestionStatusPanel() {
  const [status, setStatus] = useState<IngestionStatus | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/ingestion/status', { cache: 'no-store' })
        if (!response.ok) throw new Error('Failed to load ingestion status')
        const payload = (await response.json()) as IngestionStatus
        setStatus(payload)
      } catch (error) {
        console.error(error)
      }
    }

    void load()
  }, [])

  const entries = status
    ? Object.entries(status) as Array<[keyof IngestionStatus, IngestionMeta | null]>
    : []

  return (
    <SectionCard title="Ingestion Health">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {entries.map(([key, value]) => (
          <div key={key} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium capitalize text-white">{key}</p>
              {freshnessBadge(value?.ageMinutes ?? null)}
            </div>
            {value ? (
              <div className="mt-2 space-y-1 text-xs text-slate-400">
                <p>source: {value.source}</p>
                <p>schema: {value.schemaVersion}</p>
                <p>age: {value.ageMinutes ?? 'unknown'} min</p>
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-500">No ingestion metadata yet.</p>
            )}
          </div>
        ))}
      </div>
    </SectionCard>
  )
}
