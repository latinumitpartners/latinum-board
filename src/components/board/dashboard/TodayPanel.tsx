'use client'

import { useEffect, useState } from 'react'
import { ItemCard } from '@/components/board/cards/ItemCard'
import { SectionCard } from '@/components/board/ui/SectionCard'
import { todayItems as fallbackItems } from '@/lib/board-data'
import type { WorkItem } from '@/lib/board-types'

export function TodayPanel() {
  const [items, setItems] = useState<WorkItem[]>(fallbackItems)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/dashboard', { cache: 'no-store' })
        if (!response.ok) throw new Error('Failed to load dashboard')
        const payload = (await response.json()) as { todayItems: WorkItem[] }
        setItems(payload.todayItems)
      } catch (error) {
        console.error(error)
      }
    }

    void load()
  }, [])

  return (
    <SectionCard title="Today / Now" action={<button className="text-xs text-sky-400">Live queue</button>}>
      <div className="space-y-3">
        {items.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>
    </SectionCard>
  )
}
