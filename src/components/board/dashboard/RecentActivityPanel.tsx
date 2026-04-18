'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/board/ui/Badge'
import { SectionCard } from '@/components/board/ui/SectionCard'
import { activity as fallbackActivity } from '@/lib/board-data'
import type { ActivityItem } from '@/lib/board-types'

export function RecentActivityPanel() {
  const [items, setItems] = useState<ActivityItem[]>(fallbackActivity)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/dashboard', { cache: 'no-store' })
        if (!response.ok) throw new Error('Failed to load dashboard')
        const payload = (await response.json()) as { activity: ActivityItem[] }
        setItems(payload.activity)
      } catch (error) {
        console.error(error)
      }
    }

    void load()
  }, [])

  return (
    <SectionCard title="Recent Activity">
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <div>
              <p className="text-sm text-slate-200">{item.text}</p>
              {item.meta ? <p className="mt-1 text-xs text-slate-500">{item.meta}</p> : null}
            </div>
            <Badge variant="default">{item.type}</Badge>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}
