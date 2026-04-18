'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import type { CommitRecord, WorkItem, WorklogEntry } from '@/lib/board-types'

export function CommitDetail({
  commit,
  tasks,
  worklogs,
  onSave,
}: {
  commit: CommitRecord | null
  tasks: WorkItem[]
  worklogs: WorklogEntry[]
  onSave: (commit: CommitRecord) => void
}) {
  const [draft, setDraft] = useState<CommitRecord | null>(commit)

  useEffect(() => {
    setDraft(commit)
  }, [commit])

  const linkedItem = useMemo(
    () => tasks.find((item) => item.id === draft?.linkedItemId),
    [tasks, draft]
  )
  const linkedLogs = useMemo(
    () => worklogs.filter((entry) => draft && entry.linkedCommitHashes.includes(draft.hash)),
    [worklogs, draft]
  )
  const unlinked = !draft?.linkedItemId && !draft?.linkedProjectId

  if (!commit || !draft) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-sm text-slate-500">
        Select a commit to view details.
      </div>
    )
  }

  const updateFilesChanged = (value: string) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            filesChanged: value
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean),
          }
        : current
    )
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">{draft.hash}</h2>
          <p className="mt-2 text-sm text-slate-300">Edit linkage and metadata for this commit.</p>
        </div>
        <button
          className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950"
          onClick={() => onSave(draft)}
        >
          Save Commit
        </button>
      </div>

      <div className="mt-6 space-y-4">
        <section>
          <label className="text-xs uppercase tracking-wide text-slate-500">Message</label>
          <textarea
            value={draft.message}
            onChange={(event) => setDraft((current) => (current ? { ...current, message: event.target.value } : current))}
            className="mt-2 min-h-24 w-full rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-200"
          />
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-500">Repo</label>
            <input
              value={draft.repo}
              onChange={(event) => setDraft((current) => (current ? { ...current, repo: event.target.value } : current))}
              className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-200"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-500">Date</label>
            <input
              value={draft.date}
              onChange={(event) => setDraft((current) => (current ? { ...current, date: event.target.value } : current))}
              className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-200"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-500">Linked task</label>
            <select
              value={draft.linkedItemId || ''}
              onChange={(event) =>
                setDraft((current) =>
                  current ? { ...current, linkedItemId: event.target.value || undefined } : current
                )
              }
              className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-200"
            >
              <option value="">No task linked</option>
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
            {linkedItem ? (
              <Link href="/board" className="mt-2 inline-block text-xs text-sky-400">
                Open linked task on board
              </Link>
            ) : null}
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-500">Linked project</label>
            <input
              value={draft.linkedProjectId || linkedItem?.project || ''}
              onChange={(event) =>
                setDraft((current) =>
                  current ? { ...current, linkedProjectId: event.target.value || undefined } : current
                )
              }
              className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-200"
            />
          </div>
        </section>

        <section>
          <p className="text-xs uppercase tracking-wide text-slate-500">Resolved linkage</p>
          <div className="mt-2 space-y-2">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-300">
              Task: {linkedItem ? linkedItem.title : 'No linked task yet.'}
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-300">
              Project: {draft.linkedProjectId || linkedItem?.project || 'No linked project yet.'}
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-300">
              Status: {unlinked ? 'Unlinked' : 'Linked'}
            </div>
          </div>
        </section>

        <section>
          <p className="text-xs uppercase tracking-wide text-slate-500">Work logs</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {linkedLogs.length ? (
              linkedLogs.map((entry) => (
                <Link key={entry.id} href="/worklog" className="rounded-lg bg-slate-800 px-2 py-1 text-xs text-slate-200">
                  {entry.date}
                </Link>
              ))
            ) : (
              <p className="text-sm text-slate-500">No work logs linked.</p>
            )}
          </div>
        </section>

        <section>
          <label className="text-xs uppercase tracking-wide text-slate-500">Files changed (one per line)</label>
          <textarea
            value={(draft.filesChanged || []).join('\n')}
            onChange={(event) => updateFilesChanged(event.target.value)}
            className="mt-2 min-h-32 w-full rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-200"
          />
        </section>
      </div>
    </div>
  )
}
