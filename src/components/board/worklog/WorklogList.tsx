'use client'

import type { WorklogEntry } from '@/lib/board-types'

export function WorklogList({
  entries,
  selectedId,
  onSelect,
}: {
  entries: WorklogEntry[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  return (
    <div className="space-y-3">
      {entries.map((entry) => {
        const active = entry.id === selectedId
        return (
          <button
            key={entry.id}
            type="button"
            onClick={() => onSelect(entry.id)}
            className={[
              'w-full rounded-xl border p-4 text-left transition',
              active
                ? 'border-sky-500/20 bg-sky-500/10'
                : 'border-slate-800 bg-slate-900/50 hover:bg-slate-800/60',
            ].join(' ')}
          >
            <p className="text-sm font-semibold text-white">{entry.date}</p>
            <p className="mt-1 text-xs text-slate-400">{entry.summary}</p>
          </button>
        )
      })}
    </div>
  )
}
