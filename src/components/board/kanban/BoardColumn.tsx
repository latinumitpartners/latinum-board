import { ItemCard } from '@/components/board/cards/ItemCard'
import type { Status, WorkItem } from '@/lib/board-types'

export function BoardColumn({
  title,
  items,
  status,
  activeDrop,
  onSelectItem,
  onDropItem,
}: {
  title: string
  items: WorkItem[]
  status: Status
  activeDrop?: boolean
  onSelectItem?: (id: string) => void
  onDropItem?: (id: string, status: Status) => void
}) {
  return (
    <div
      className={[
        'flex min-w-[320px] max-w-[320px] flex-col rounded-2xl border bg-slate-900/60 transition',
        activeDrop ? 'border-sky-400/70 ring-2 ring-sky-400/20' : 'border-slate-800',
      ].join(' ')}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault()
        const itemId = event.dataTransfer.getData('text/plain')
        if (itemId) onDropItem?.(itemId, status)
      }}
    >
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <span className="text-xs text-slate-500">{items.length}</span>
      </div>

      <div className="flex-1 space-y-3 p-3">
        {items.length > 0 ? (
          items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onClick={() => onSelectItem?.(item.id)}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData('text/plain', item.id)
                event.dataTransfer.effectAllowed = 'move'
              }}
            />
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-500">
            Drop items here.
          </div>
        )}
      </div>
    </div>
  )
}
