'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import { SidebarNav } from '@/components/board/layout/SidebarNav'
import { Topbar } from '@/components/board/layout/Topbar'
import { QuickAddModal } from '@/components/board/quick-add/QuickAddModal'
import type { WorkItem } from '@/lib/board-types'

export type BoardFilterKey = 'all' | 'high_priority' | 'blocked' | 'kevin' | 'claudia' | 'needs_logging'

export function AppShell({
  title,
  children,
  onQuickCreate,
  boardFilter = 'all',
  onBoardFilterChange,
}: {
  title: string
  children: ReactNode
  onQuickCreate?: (task: WorkItem) => void
  boardFilter?: BoardFilterKey
  onBoardFilterChange?: (value: BoardFilterKey) => void
}) {
  const [quickAddOpen, setQuickAddOpen] = useState(false)

  const handleCreate = (task: WorkItem) => {
    onQuickCreate?.(task)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="grid min-h-screen md:grid-cols-[260px_minmax(0,1fr)]">
        <SidebarNav />
        <div className="min-w-0">
          <Topbar
            title={title}
            onQuickAdd={() => setQuickAddOpen(true)}
            boardFilter={boardFilter}
            onBoardFilterChange={onBoardFilterChange}
          />
          <main className="p-6">{children}</main>
        </div>
      </div>

      <QuickAddModal
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  )
}
