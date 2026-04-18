import { Badge } from '@/components/board/ui/Badge'
import type { DragEvent } from 'react'
import type { WorkItem } from '@/lib/board-types'

export function ItemCard({
  item,
  onClick,
  draggable,
  onDragStart,
}: {
  item: WorkItem
  onClick?: () => void
  draggable?: boolean
  onDragStart?: (event: DragEvent<HTMLButtonElement>) => void
}) {
  return (
    <button
      type="button"
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={onClick}
      className="w-full rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-left transition hover:border-slate-700 hover:bg-slate-800/60"
    >
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-sm font-semibold text-white">{item.title}</h4>
        {item.priority === 'critical' ? (
          <Badge variant="critical">Critical</Badge>
        ) : item.priority === 'high' ? (
          <Badge variant="high">High</Badge>
        ) : null}
      </div>

      {item.project ? <p className="mt-2 text-xs text-slate-400">{item.project}</p> : null}
      {item.nextAction ? <p className="mt-3 text-sm text-slate-300">{item.nextAction}</p> : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge variant="status">{item.status}</Badge>
        {item.blocked ? <Badge variant="blocked">Blocked</Badge> : null}
        {item.commitLinked ? <Badge variant="success">Commit linked</Badge> : null}
        {item.logLinked ? <Badge variant="success">Logged</Badge> : null}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
        <span>{item.owner || 'Unassigned'}</span>
        <span>{item.dueDate || 'No due date'}</span>
      </div>
    </button>
  )
}
