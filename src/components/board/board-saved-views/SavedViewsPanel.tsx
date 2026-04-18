'use client'

import { useEffect, useState } from 'react'
import type { SavedView } from '@/lib/board-types'

export function SavedViewsPanel({
  currentFilter,
  onSelect,
}: {
  currentFilter: 'all' | 'high_priority' | 'blocked' | 'kevin' | 'claudia' | 'needs_logging'
  onSelect: (filter: 'all' | 'high_priority' | 'blocked' | 'kevin' | 'claudia' | 'needs_logging') => void
}) {
  const [views, setViews] = useState<SavedView[]>([])
  const [name, setName] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/saved-views', { cache: 'no-store' })
        if (!response.ok) throw new Error('Failed to load saved views')
        const payload = (await response.json()) as SavedView[]
        setViews(payload)
      } catch (error) {
        console.error(error)
      }
    }

    void load()
  }, [])

  const saveCurrentView = async () => {
    const trimmed = name.trim()
    if (!trimmed) return

    const view: SavedView = {
      id: `view-${Date.now()}`,
      name: trimmed,
      filter: currentFilter,
      createdAt: new Date().toISOString(),
    }

    setViews((current) => [view, ...current])
    setName('')

    try {
      await fetch('/api/saved-views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(view),
      })
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Saved Views</h3>
          <p className="mt-1 text-xs text-slate-400">Reuse your preferred board slices.</p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Save current filter as..."
          className="flex-1 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-white"
        />
        <button className="rounded-xl bg-sky-500 px-3 py-2 text-sm font-semibold text-slate-950" onClick={saveCurrentView}>
          Save
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {views.length ? (
          views.map((view) => (
            <button
              key={view.id}
              onClick={() => onSelect(view.filter)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800/70"
            >
              <div className="font-medium text-white">{view.name}</div>
              <div className="text-xs text-slate-500">{view.filter}</div>
            </button>
          ))
        ) : (
          <p className="text-sm text-slate-500">No saved views yet.</p>
        )}
      </div>
    </div>
  )
}
