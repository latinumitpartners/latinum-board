'use client'

import { useCallback, useState } from 'react'
import { BoardView } from '@/components/board/kanban/BoardView'
import { AppShell } from '@/components/board/layout/AppShell'
import type { WorkItem } from '@/lib/board-types'

export default function BoardPage() {
  const [boardFilter, setBoardFilter] = useState<'all' | 'high_priority' | 'blocked' | 'kevin' | 'claudia' | 'needs_logging'>('all')
  const [quickCreateSignal, setQuickCreateSignal] = useState<WorkItem | null>(null)

  const handleQuickCreate = useCallback((task: WorkItem) => {
    setQuickCreateSignal(task)
  }, [])

  return (
    <AppShell title="Kanban Board" onQuickCreate={handleQuickCreate} boardFilter={boardFilter} onBoardFilterChange={setBoardFilter}>
      <BoardView
        boardFilter={boardFilter}
        quickCreateSignal={quickCreateSignal}
        onQuickCreateConsumed={() => setQuickCreateSignal(null)}
        onSavedViewSelect={setBoardFilter}
      />
    </AppShell>
  )
}
