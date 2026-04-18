'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/board/ui/Badge'
import type { CommitRecord, Status, WorkItem, WorklogEntry } from '@/lib/board-types'

const statuses: Status[] = ['inbox', 'next', 'in_progress', 'waiting', 'blocked', 'review', 'done']
const priorities: Array<WorkItem['priority']> = ['low', 'medium', 'high', 'critical']

export function ItemDetailDrawer({
  item,
  open,
  tasks,
  commits,
  worklogs,
  onClose,
  onSave,
  onDelete,
}: {
  item: WorkItem | null
  open: boolean
  tasks: WorkItem[]
  commits: CommitRecord[]
  worklogs: WorklogEntry[]
  onClose: () => void
  onSave: (item: WorkItem) => void
  onDelete: (id: string) => void
}) {
  const [draft, setDraft] = useState<WorkItem | null>(item)

  useEffect(() => {
    setDraft(item)
  }, [item])

  const availableCommits = useMemo(
    () => commits.filter((commit) => !draft || commit.linkedItemId === draft.id || !commit.linkedItemId),
    [commits, draft]
  )
  const availableWorklogs = useMemo(
    () => worklogs.filter((entry) => !draft || entry.linkedItemIds.includes(draft.id) || !entry.linkedItemIds.length),
    [worklogs, draft]
  )

  if (!open || !item || !draft) return null

  const updateField = <K extends keyof WorkItem>(field: K, value: WorkItem[K]) => {
    setDraft((current) => (current ? { ...current, [field]: value } : current))
  }

  const updateNotes = (value: string) => {
    updateField(
      'notes',
      value
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
    )
  }

  const updateSubtasks = (value: string) => {
    const prior = new Map((draft.subtasks || []).map((subtask) => [subtask.title.toLowerCase(), subtask.done]))
    updateField(
      'subtasks',
      value
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((title, index) => ({
          id: `${draft.id}-sub-${index + 1}`,
          title,
          done: prior.get(title.toLowerCase()) || false,
        }))
    )
  }

  const toggleLinkedCommit = (hash: string) => {
    const linked = draft.linkedCommits || []
    updateField(
      'linkedCommits',
      linked.includes(hash) ? linked.filter((value) => value !== hash) : [...linked, hash]
    )
  }

  const toggleLinkedWorklog = (id: string) => {
    const linked = draft.linkedLogs || []
    updateField(
      'linkedLogs',
      linked.includes(id) ? linked.filter((value) => value !== id) : [...linked, id]
    )
  }

  const handleSave = () => {
    onSave({
      ...draft,
      blocked: draft.status === 'blocked' ? true : draft.blocked,
      commitLinked: Boolean(draft.linkedCommits?.length),
      logLinked: Boolean(draft.linkedLogs?.length),
    })
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-950/70" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col border-l border-slate-800 bg-slate-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">{draft.title}</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="status">{draft.status}</Badge>
              {draft.priority === 'critical' ? <Badge variant="critical">Critical</Badge> : null}
              {draft.priority === 'high' ? <Badge variant="high">High</Badge> : null}
              {draft.blocked ? <Badge variant="blocked">Blocked</Badge> : null}
            </div>
          </div>
          <div className="flex gap-2">
            <button className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200" onClick={onClose}>
              Close
            </button>
            <button className="rounded-xl border border-rose-700 px-3 py-2 text-sm text-rose-300" onClick={() => onDelete(draft.id)}>
              Delete
            </button>
            <button className="rounded-xl bg-sky-500 px-3 py-2 text-sm font-semibold text-slate-950" onClick={handleSave}>
              Save
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <section className="space-y-3">
            <div>
              <label className="text-xs text-slate-500">Title</label>
              <input
                value={draft.title}
                onChange={(event) => updateField('title', event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-500">Status</label>
                <select
                  value={draft.status}
                  onChange={(event) => updateField('status', event.target.value as Status)}
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
                  onChange={(event) => updateField('priority', event.target.value as WorkItem['priority'])}
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
                <label className="text-xs text-slate-500">Owner</label>
                <input
                  value={draft.owner || ''}
                  onChange={(event) => updateField('owner', event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-500">Due Date</label>
                <input
                  value={draft.dueDate || ''}
                  onChange={(event) => updateField('dueDate', event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-500">Project</label>
                <input
                  value={draft.project || ''}
                  onChange={(event) => updateField('project', event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-white"
                />
                {draft.project ? (
                  <Link href="/projects" className="mt-2 inline-block text-xs text-sky-400">
                    View projects
                  </Link>
                ) : null}
              </div>

              <div>
                <label className="text-xs text-slate-500">Waiting On</label>
                <input
                  value={draft.waitingOn || ''}
                  onChange={(event) => updateField('waitingOn', event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-white"
                />
              </div>
            </div>
          </section>

          <section>
            <label className="text-xs text-slate-500">Next Action</label>
            <textarea
              value={draft.nextAction || ''}
              onChange={(event) => updateField('nextAction', event.target.value)}
              className="mt-1 min-h-24 w-full rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-white"
            />
          </section>

          <section>
            <label className="text-xs text-slate-500">Description</label>
            <textarea
              value={draft.description || ''}
              onChange={(event) => updateField('description', event.target.value)}
              className="mt-1 min-h-32 w-full rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-white"
            />
          </section>

          <section>
            <label className="text-xs text-slate-500">Subtasks (one per line)</label>
            <textarea
              value={(draft.subtasks || []).map((subtask) => subtask.title).join('\n')}
              onChange={(event) => updateSubtasks(event.target.value)}
              className="mt-1 min-h-32 w-full rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-white"
            />
          </section>

          <section>
            <label className="text-xs text-slate-500">Notes / Decisions (one per line)</label>
            <textarea
              value={(draft.notes || []).join('\n')}
              onChange={(event) => updateNotes(event.target.value)}
              className="mt-1 min-h-32 w-full rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-white"
            />
          </section>

          <section>
            <h3 className="text-sm font-semibold text-white">Link commits</h3>
            <div className="mt-3 grid gap-2">
              {availableCommits.length ? (
                availableCommits.map((commit) => {
                  const checked = draft.linkedCommits?.includes(commit.hash) || false
                  return (
                    <label
                      key={commit.hash}
                      className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-3"
                    >
                      <input type="checkbox" checked={checked} onChange={() => toggleLinkedCommit(commit.hash)} className="h-4 w-4" />
                      <div>
                        <p className="text-sm text-slate-200">{commit.hash} · {commit.message}</p>
                        <p className="text-xs text-slate-500">{commit.repo}</p>
                      </div>
                    </label>
                  )
                })
              ) : (
                <p className="text-sm text-slate-500">No available commits to link.</p>
              )}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-white">Link work logs</h3>
            <div className="mt-3 grid gap-2">
              {availableWorklogs.length ? (
                availableWorklogs.map((log) => {
                  const checked = draft.linkedLogs?.includes(log.id) || false
                  return (
                    <label
                      key={log.id}
                      className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-3"
                    >
                      <input type="checkbox" checked={checked} onChange={() => toggleLinkedWorklog(log.id)} className="h-4 w-4" />
                      <div>
                        <p className="text-sm text-slate-200">{log.date}</p>
                        <p className="text-xs text-slate-500">{log.summary}</p>
                      </div>
                    </label>
                  )
                })
              ) : (
                <p className="text-sm text-slate-500">No available work logs to link.</p>
              )}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-white">Linked Activity</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {draft.linkedCommits?.map((commit) => (
                <Link key={commit} href="/commits" className="inline-flex rounded-lg bg-emerald-500/15 px-2 py-1 text-xs font-medium text-emerald-300">
                  Commit: {commit}
                </Link>
              ))}
              {draft.linkedLogs?.map((log) => (
                <Link key={log} href="/worklog" className="inline-flex rounded-lg bg-emerald-500/15 px-2 py-1 text-xs font-medium text-emerald-300">
                  Work log: {log}
                </Link>
              ))}
              {!draft.linkedCommits?.length && !draft.linkedLogs?.length ? (
                <p className="text-sm text-slate-500">No linked activity yet.</p>
              ) : null}
            </div>
          </section>
        </div>
      </aside>
    </>
  )
}
