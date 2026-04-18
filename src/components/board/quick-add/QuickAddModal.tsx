'use client'

import { useEffect, useState } from 'react'
import type { Priority, Status, WorkItem } from '@/lib/board-types'

const statuses: Status[] = ['inbox', 'next', 'in_progress', 'waiting', 'blocked', 'review', 'done']
const priorities: Priority[] = ['low', 'medium', 'high', 'critical']

const blankTask = (): WorkItem => ({
  id: `task-${Date.now()}`,
  title: '',
  project: 'Latinum Board MVP',
  status: 'inbox',
  priority: 'medium',
  owner: 'Kevin',
  nextAction: '',
  description: '',
  subtasks: [],
  linkedCommits: [],
  linkedLogs: [],
  notes: [],
  history: ['Task created from quick add modal.'],
  commitLinked: false,
  logLinked: false,
})

export function QuickAddModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean
  onClose: () => void
  onCreate: (task: WorkItem) => void
}) {
  const [draft, setDraft] = useState<WorkItem>(blankTask())

  useEffect(() => {
    if (open) setDraft(blankTask())
  }, [open])

  if (!open) return null

  const submit = () => {
    const title = draft.title.trim()
    if (!title) return
    onCreate({
      ...draft,
      title,
      nextAction: draft.nextAction?.trim(),
      description: draft.description?.trim(),
    })
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-950/70" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Quick Add Task</h2>
              <p className="mt-1 text-sm text-slate-400">Capture a task fast without leaving the current view.</p>
            </div>
            <button className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200" onClick={onClose}>
              Close
            </button>
          </div>

          <div className="space-y-4 px-6 py-5">
            <div>
              <label className="text-xs text-slate-500">Title</label>
              <input
                autoFocus
                value={draft.title}
                onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-white"
                placeholder="What needs to happen?"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs text-slate-500">Project</label>
                <input
                  value={draft.project || ''}
                  onChange={(event) => setDraft((current) => ({ ...current, project: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">Owner</label>
                <input
                  value={draft.owner || ''}
                  onChange={(event) => setDraft((current) => ({ ...current, owner: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">Status</label>
                <select
                  value={draft.status}
                  onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as Status }))}
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-white"
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500">Priority</label>
                <select
                  value={draft.priority}
                  onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value as Priority }))}
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-white"
                >
                  {priorities.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500">Due Date</label>
                <input
                  value={draft.dueDate || ''}
                  onChange={(event) => setDraft((current) => ({ ...current, dueDate: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-white"
                  placeholder="Apr 21"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">Waiting On</label>
                <input
                  value={draft.waitingOn || ''}
                  onChange={(event) => setDraft((current) => ({ ...current, waitingOn: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-500">Next Action</label>
              <textarea
                value={draft.nextAction || ''}
                onChange={(event) => setDraft((current) => ({ ...current, nextAction: event.target.value }))}
                className="mt-1 min-h-24 w-full rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-white"
                placeholder="What is the next visible move?"
              />
            </div>

            <div>
              <label className="text-xs text-slate-500">Description</label>
              <textarea
                value={draft.description || ''}
                onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                className="mt-1 min-h-24 w-full rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-white"
                placeholder="Optional context"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-800 px-6 py-4">
            <button className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200" onClick={onClose}>
              Cancel
            </button>
            <button className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950" onClick={submit}>
              Create Task
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
