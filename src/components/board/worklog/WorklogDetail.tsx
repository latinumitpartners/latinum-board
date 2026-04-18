'use client'

import { useEffect, useState } from 'react'
import type { CommitRecord, WorkItem, WorklogEntry } from '@/lib/board-types'

export function WorklogDetail({
  entry,
  tasks,
  commits,
  onSave,
}: {
  entry: WorklogEntry | null
  tasks: WorkItem[]
  commits: CommitRecord[]
  onSave: (entry: WorklogEntry) => void
}) {
  const [draft, setDraft] = useState<WorklogEntry | null>(entry)

  useEffect(() => {
    setDraft(entry)
  }, [entry])

  if (!entry || !draft) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-sm text-slate-500">
        Select a work log entry to view details.
      </div>
    )
  }

  const linkedItems = tasks.filter((item) => draft.linkedItemIds.includes(item.id))

  const updateBullets = (value: string) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            bullets: value
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean),
          }
        : current
    )
  }

  const toggleLinkedItem = (itemId: string) => {
    setDraft((current) => {
      if (!current) return current
      const exists = current.linkedItemIds.includes(itemId)
      return {
        ...current,
        linkedItemIds: exists
          ? current.linkedItemIds.filter((id) => id !== itemId)
          : [...current.linkedItemIds, itemId],
      }
    })
  }

  const toggleLinkedCommit = (hash: string) => {
    setDraft((current) => {
      if (!current) return current
      const exists = current.linkedCommitHashes.includes(hash)
      return {
        ...current,
        linkedCommitHashes: exists
          ? current.linkedCommitHashes.filter((value) => value !== hash)
          : [...current.linkedCommitHashes, hash],
      }
    })
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">{draft.date}</h2>
          <p className="mt-2 text-sm text-slate-300">Edit and persist the work completed for this day.</p>
        </div>
        <button
          className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950"
          onClick={() => onSave(draft)}
        >
          Save Entry
        </button>
      </div>

      <div className="mt-6 space-y-4">
        <section>
          <label className="text-xs uppercase tracking-wide text-slate-500">Date</label>
          <input
            value={draft.date}
            onChange={(event) => setDraft((current) => (current ? { ...current, date: event.target.value } : current))}
            className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-200"
          />
        </section>

        <section>
          <label className="text-xs uppercase tracking-wide text-slate-500">Summary</label>
          <textarea
            value={draft.summary}
            onChange={(event) => setDraft((current) => (current ? { ...current, summary: event.target.value } : current))}
            className="mt-2 min-h-24 w-full rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-200"
          />
        </section>

        <section>
          <label className="text-xs uppercase tracking-wide text-slate-500">Work completed (one bullet per line)</label>
          <textarea
            value={draft.bullets.join('\n')}
            onChange={(event) => updateBullets(event.target.value)}
            className="mt-2 min-h-32 w-full rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-200"
          />
        </section>

        <section>
          <p className="text-xs uppercase tracking-wide text-slate-500">Linked items</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {linkedItems.length ? (
              linkedItems.map((item) => (
                <span key={item.id} className="rounded-lg bg-slate-800 px-2 py-1 text-xs text-slate-200">
                  {item.title}
                </span>
              ))
            ) : (
              <p className="text-sm text-slate-500">No linked items.</p>
            )}
          </div>

          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {tasks.map((item) => {
              const checked = draft.linkedItemIds.includes(item.id)
              return (
                <label
                  key={item.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-200"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleLinkedItem(item.id)}
                    className="h-4 w-4"
                  />
                  <span>{item.title}</span>
                </label>
              )
            })}
          </div>
        </section>

        <section>
          <p className="text-xs uppercase tracking-wide text-slate-500">Linked commits</p>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {commits.map((commit) => {
              const checked = draft.linkedCommitHashes.includes(commit.hash)
              return (
                <label
                  key={commit.hash}
                  className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-200"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleLinkedCommit(commit.hash)}
                    className="h-4 w-4"
                  />
                  <div>
                    <p>{commit.hash}</p>
                    <p className="text-xs text-slate-500">{commit.message}</p>
                  </div>
                </label>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
