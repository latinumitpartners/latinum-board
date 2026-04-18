'use client'

import { useEffect, useMemo, useState } from 'react'
import { SavedViewsPanel } from '@/components/board/board-saved-views/SavedViewsPanel'
import { BoardColumn } from '@/components/board/kanban/BoardColumn'
import { ItemDetailDrawer } from '@/components/board/items/ItemDetailDrawer'
import { boardItems as fallbackBoardItems, commits as fallbackCommits, worklogEntries as fallbackWorklogs } from '@/lib/board-data'
import type { CommitRecord, Status, WorkItem, WorklogEntry } from '@/lib/board-types'

type BoardFilterKey = 'all' | 'high_priority' | 'blocked' | 'kevin' | 'claudia' | 'needs_logging'

const columns: Array<{ title: string; status: Status }> = [
  { title: 'Inbox', status: 'inbox' },
  { title: 'Next', status: 'next' },
  { title: 'In Progress', status: 'in_progress' },
  { title: 'Waiting', status: 'waiting' },
  { title: 'Review', status: 'review' },
  { title: 'Done', status: 'done' },
]

const newTaskTemplate = (): WorkItem => ({
  id: `task-${Date.now()}`,
  title: 'New task',
  project: 'Latinum Board MVP',
  status: 'inbox',
  priority: 'medium',
  owner: 'Kevin',
  nextAction: 'Define the next action',
  commitLinked: false,
  logLinked: false,
  description: '',
  subtasks: [],
  linkedCommits: [],
  linkedLogs: [],
  notes: [],
  history: ['Task created from board quick add.'],
})

function applyBoardFilter(items: WorkItem[], filter: BoardFilterKey) {
  switch (filter) {
    case 'high_priority':
      return items.filter((item) => item.priority === 'high' || item.priority === 'critical')
    case 'blocked':
      return items.filter((item) => item.status === 'blocked' || item.blocked || item.status === 'waiting')
    case 'kevin':
      return items.filter((item) => item.owner?.toLowerCase() === 'kevin')
    case 'claudia':
      return items.filter((item) => item.owner?.toLowerCase() === 'claudia')
    case 'needs_logging':
      return items.filter((item) => item.status === 'done' && !item.logLinked)
    default:
      return items
  }
}

export function InteractiveBoard({
  boardFilter,
  quickCreateSignal,
  onQuickCreateConsumed,
  onSavedViewSelect,
}: {
  boardFilter: BoardFilterKey
  quickCreateSignal: WorkItem | null
  onQuickCreateConsumed: () => void
  onSavedViewSelect?: (filter: BoardFilterKey) => void
}) {
  const [items, setItems] = useState<WorkItem[]>(fallbackBoardItems)
  const [commits, setCommits] = useState<CommitRecord[]>(fallbackCommits)
  const [worklogs, setWorklogs] = useState<WorklogEntry[]>(fallbackWorklogs)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [activeDropStatus, setActiveDropStatus] = useState<Status | null>(null)

  useEffect(() => {
    const loadAll = async () => {
      try {
        const [tasksResponse, commitsResponse, worklogsResponse] = await Promise.all([
          fetch('/api/tasks', { cache: 'no-store' }),
          fetch('/api/commits', { cache: 'no-store' }),
          fetch('/api/worklogs', { cache: 'no-store' }),
        ])

        if (!tasksResponse.ok || !commitsResponse.ok || !worklogsResponse.ok) {
          throw new Error('Failed to load board data')
        }

        const [tasks, commitsPayload, worklogsPayload] = await Promise.all([
          tasksResponse.json() as Promise<WorkItem[]>,
          commitsResponse.json() as Promise<CommitRecord[]>,
          worklogsResponse.json() as Promise<WorklogEntry[]>,
        ])

        setItems(tasks)
        setCommits(commitsPayload)
        setWorklogs(worklogsPayload)
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    void loadAll()
  }, [])

  useEffect(() => {
    if (!quickCreateSignal) return
    void createTask(quickCreateSignal)
    onQuickCreateConsumed()
  }, [quickCreateSignal, onQuickCreateConsumed])

  const filteredItems = useMemo(() => {
    const boardFiltered = applyBoardFilter(items, boardFilter)
    if (!query.trim()) return boardFiltered
    const normalized = query.toLowerCase()
    return boardFiltered.filter(
      (item) =>
        item.title.toLowerCase().includes(normalized) ||
        item.project?.toLowerCase().includes(normalized) ||
        item.nextAction?.toLowerCase().includes(normalized)
    )
  }, [items, query, boardFilter])

  const selectedItem: WorkItem | null = useMemo(
    () => items.find((item) => item.id === selectedId) || null,
    [items, selectedId]
  )

  async function createTask(task?: WorkItem) {
    const nextTask = task || newTaskTemplate()
    setItems((current) => [nextTask, ...current])
    setSelectedId(nextTask.id)

    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextTask),
      })
    } catch (error) {
      console.error(error)
    }
  }

  const saveItem = async (updated: WorkItem) => {
    const previousItem = items.find((item) => item.id === updated.id)
    const nextUpdated = {
      ...updated,
      history: [...(updated.history || []), `Task edited at ${new Date().toISOString()}`],
    }

    const previousCommitHashes = previousItem?.linkedCommits || []
    const nextCommitHashes = nextUpdated.linkedCommits || []
    const previousLogIds = previousItem?.linkedLogs || []
    const nextLogIds = nextUpdated.linkedLogs || []

    const nextCommits = commits.map((commit) => {
      const wasLinked = previousCommitHashes.includes(commit.hash)
      const shouldBeLinked = nextCommitHashes.includes(commit.hash)

      if (!wasLinked && !shouldBeLinked) return commit
      return {
        ...commit,
        linkedItemId: shouldBeLinked ? nextUpdated.id : commit.linkedItemId === nextUpdated.id ? undefined : commit.linkedItemId,
      }
    })

    const nextWorklogs = worklogs.map((entry) => {
      const wasLinked = previousLogIds.includes(entry.id)
      const shouldBeLinked = nextLogIds.includes(entry.id)

      if (!wasLinked && !shouldBeLinked) return entry
      return {
        ...entry,
        linkedItemIds: shouldBeLinked
          ? Array.from(new Set([...entry.linkedItemIds, nextUpdated.id]))
          : entry.linkedItemIds.filter((id) => id !== nextUpdated.id),
      }
    })

    setItems((current) => current.map((item) => (item.id === nextUpdated.id ? nextUpdated : item)))
    setCommits(nextCommits)
    setWorklogs(nextWorklogs)

    try {
      await Promise.all([
        fetch('/api/tasks', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(nextUpdated),
        }),
        ...nextCommits
          .filter((commit) => previousCommitHashes.includes(commit.hash) || nextCommitHashes.includes(commit.hash))
          .map((commit) =>
            fetch('/api/commits', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(commit),
            })
          ),
        ...nextWorklogs
          .filter((entry) => previousLogIds.includes(entry.id) || nextLogIds.includes(entry.id))
          .map((entry) =>
            fetch('/api/worklogs', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(entry),
            })
          ),
      ])
    } catch (error) {
      console.error(error)
    }
  }

  const moveItemToStatus = async (id: string, status: Status) => {
    const item = items.find((entry) => entry.id === id)
    if (!item || item.status === status) return
    await saveItem({ ...item, status, blocked: status === 'blocked' ? true : item.blocked })
  }

  const deleteItem = async (id: string) => {
    const remaining = items.filter((item) => item.id !== id)
    const nextCommits = commits.map((commit) =>
      commit.linkedItemId === id ? { ...commit, linkedItemId: undefined } : commit
    )
    const nextWorklogs = worklogs.map((entry) => ({
      ...entry,
      linkedItemIds: entry.linkedItemIds.filter((itemId) => itemId !== id),
    }))

    setItems(remaining)
    setCommits(nextCommits)
    setWorklogs(nextWorklogs)
    setSelectedId(null)

    try {
      await Promise.all([
        fetch('/api/tasks', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ __deleteId: id }),
        }),
        ...nextCommits
          .filter((commit) => commit.linkedItemId === undefined)
          .map((commit) =>
            fetch('/api/commits', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(commit),
            })
          ),
        ...nextWorklogs.map((entry) =>
          fetch('/api/worklogs', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entry),
          })
        ),
      ])
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Workflow Board</h2>
            <p className="mt-1 text-sm text-slate-400">
              Kanban view for Latinum development, approvals, and shipped work.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search tasks..."
              className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-100"
            />
            <button
              type="button"
              onClick={() => void createTask()}
              className="rounded-lg bg-sky-500 px-3 py-2 text-xs font-semibold text-slate-950"
            >
              + New Task
            </button>
          </div>
        </div>

        {loading ? <p className="text-sm text-slate-500">Loading tasks...</p> : null}

        <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
          <div>
            <SavedViewsPanel currentFilter={boardFilter} onSelect={(filter) => onSavedViewSelect?.(filter)} />
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {columns.map((column) => (
              <div
                key={column.status}
                onDragEnter={() => setActiveDropStatus(column.status)}
                onDragLeave={() => setActiveDropStatus((current) => (current === column.status ? null : current))}
              >
                <BoardColumn
                  title={column.title}
                  status={column.status}
                  activeDrop={activeDropStatus === column.status}
                  items={filteredItems.filter((item) => item.status === column.status)}
                  onSelectItem={setSelectedId}
                  onDropItem={(id, status) => {
                    setActiveDropStatus(null)
                    void moveItemToStatus(id, status)
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <ItemDetailDrawer
        item={selectedItem}
        open={Boolean(selectedItem)}
        tasks={items}
        commits={commits}
        worklogs={worklogs}
        onClose={() => setSelectedId(null)}
        onSave={saveItem}
        onDelete={deleteItem}
      />
    </>
  )
}
