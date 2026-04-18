'use client'

import { useEffect, useState } from 'react'
import { ItemCard } from '@/components/board/cards/ItemCard'
import { SectionCard } from '@/components/board/ui/SectionCard'
import { waitingItems as fallbackItems } from '@/lib/board-data'
import type { WorkItem } from '@/lib/board-types'

export function WaitingPanel() {
  const [items, setItems] = useState<WorkItem[]>(fallbackItems)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/dashboard', { cache: 'no-store' })
        if (!response.ok) throw new Error('Failed to load dashboard')
        const payload = (await response.json()) as { waitingItems: WorkItem[] }
        setItems(payload.waitingItems)
      } catch (error) {
        console.error(error)
      }
    }

    void load()
  }, [])

  return (
    <SectionCard title="Waiting / Blocked">
      <div className="space-y-3">
        {items.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>
    </SectionCard>
  )
}
