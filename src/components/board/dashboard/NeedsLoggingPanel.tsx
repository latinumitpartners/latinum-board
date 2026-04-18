'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/board/ui/Badge'
import { SectionCard } from '@/components/board/ui/SectionCard'
import { needsLoggingItems as fallbackItems } from '@/lib/board-data'

export function NeedsLoggingPanel() {
  const [items, setItems] = useState<string[]>(fallbackItems)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/dashboard', { cache: 'no-store' })
        if (!response.ok) throw new Error('Failed to load dashboard')
        const payload = (await response.json()) as { needsLogging: string[] }
        setItems(payload.needsLogging)
      } catch (error) {
        console.error(error)
      }
    }

    void load()
  }, [])

  return (
    <SectionCard title="Needs Logging">
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item}
            className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3"
          >
            <span className="text-sm text-slate-200">{item}</span>
            <Badge variant="waiting">Action</Badge>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}
