import { InteractiveBoard } from '@/components/board/kanban/InteractiveBoard'
import type { WorkItem } from '@/lib/board-types'

export function BoardView({
  boardFilter,
  quickCreateSignal,
  onQuickCreateConsumed,
  onSavedViewSelect,
}: {
  boardFilter: 'all' | 'high_priority' | 'blocked' | 'kevin' | 'claudia' | 'needs_logging'
  quickCreateSignal: WorkItem | null
  onQuickCreateConsumed: () => void
  onSavedViewSelect: (filter: 'all' | 'high_priority' | 'blocked' | 'kevin' | 'claudia' | 'needs_logging') => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Workflow Board</h2>
          <p className="mt-1 text-sm text-slate-400">
            Kanban view for Latinum development, approvals, and shipped work.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-slate-400">
          <span className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">Drag tasks between columns</span>
          <span className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">Filter by owner, blockers, priority, logging</span>
        </div>
      </div>

      <InteractiveBoard
        boardFilter={boardFilter}
        quickCreateSignal={quickCreateSignal}
        onQuickCreateConsumed={onQuickCreateConsumed}
        onSavedViewSelect={onSavedViewSelect}
      />
    </div>
  )
}
