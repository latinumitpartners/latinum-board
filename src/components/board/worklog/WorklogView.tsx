'use client'

import { useEffect, useMemo, useState } from 'react'
import { WorklogDetail } from '@/components/board/worklog/WorklogDetail'
import { WorklogList } from '@/components/board/worklog/WorklogList'
import { SectionCard } from '@/components/board/ui/SectionCard'
import { boardItems as fallbackTasks, commits as fallbackCommits, worklogEntries as fallbackWorklogs } from '@/lib/board-data'
import type { CommitRecord, WorkItem, WorklogEntry } from '@/lib/board-types'

const newWorklogTemplate = (): WorklogEntry => ({
  id: `log-${Date.now()}`,
  date: new Date().toISOString().slice(0, 10),
  summary: 'New work log entry',
  bullets: ['Add what was completed today.'],
  linkedItemIds: [],
  linkedCommitHashes: [],
})

export function WorklogView() {
  const [entries, setEntries] = useState<WorklogEntry[]>(fallbackWorklogs)
  const [tasks, setTasks] = useState<WorkItem[]>(fallbackTasks)
  const [commits, setCommits] = useState<CommitRecord[]>(fallbackCommits)
  const [selectedId, setSelectedId] = useState<string>(fallbackWorklogs[0]?.id || '')
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    const loadData = async () => {
      try {
        const [worklogsResponse, tasksResponse, commitsResponse] = await Promise.all([
          fetch('/api/worklogs', { cache: 'no-store' }),
          fetch('/api/tasks', { cache: 'no-store' }),
          fetch('/api/commits', { cache: 'no-store' }),
        ])
        if (!worklogsResponse.ok || !tasksResponse.ok || !commitsResponse.ok) {
          throw new Error('Failed to load worklog data')
        }
        const [worklogsPayload, tasksPayload, commitsPayload] = await Promise.all([
          worklogsResponse.json() as Promise<WorklogEntry[]>,
          tasksResponse.json() as Promise<WorkItem[]>,
          commitsResponse.json() as Promise<CommitRecord[]>,
        ])
        setEntries(worklogsPayload)
        setTasks(tasksPayload)
        setCommits(commitsPayload)
        if (worklogsPayload[0]) setSelectedId(worklogsPayload[0].id)
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [])

  const filteredEntries = useMemo(() => {
    if (!query.trim()) return entries
    const normalized = query.toLowerCase()
    return entries.filter(
      (entry) =>
        entry.date.toLowerCase().includes(normalized) ||
        entry.summary.toLowerCase().includes(normalized) ||
        entry.bullets.some((bullet) => bullet.toLowerCase().includes(normalized))
    )
  }, [entries, query])

  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.id === selectedId) || null,
    [entries, selectedId]
  )

  const createEntry = async () => {
    const entry = newWorklogTemplate()
    setEntries((current) => [entry, ...current])
    setSelectedId(entry.id)

    try {
      await fetch('/api/worklogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      })
    } catch (error) {
      console.error(error)
    }
  }

  const saveEntry = async (updated: WorklogEntry) => {
    const previous = entries.find((entry) => entry.id === updated.id)
    const previousTaskIds = previous?.linkedItemIds || []
    const nextTaskIds = updated.linkedItemIds

    const nextEntries = entries.map((entry) => (entry.id === updated.id ? updated : entry))
    const nextTasks = tasks.map((task) => {
      const linkedLogs = new Set(task.linkedLogs || [])
      if (previousTaskIds.includes(task.id) && !nextTaskIds.includes(task.id)) linkedLogs.delete(updated.id)
      if (nextTaskIds.includes(task.id)) linkedLogs.add(updated.id)
      return {
        ...task,
        linkedLogs: Array.from(linkedLogs),
        logLinked: linkedLogs.size > 0,
      }
    })

    setEntries(nextEntries)
    setTasks(nextTasks)

    try {
      await Promise.all([
        fetch('/api/worklogs', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated),
        }),
        ...nextTasks
          .filter((task) => previousTaskIds.includes(task.id) || nextTaskIds.includes(task.id))
          .map((task) =>
            fetch('/api/tasks', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(task),
            })
          ),
      ])
    } catch (error) {
      console.error(error)
    }
  }

  const doneWithoutLogs = tasks.filter((task) => task.status === 'done' && !(task.linkedLogs || []).length).length
  const commitsWithoutLogs = commits.filter(
    (commit) => !entries.some((entry) => entry.linkedCommitHashes.includes(commit.hash))
  ).length

  return (
    <div className="grid gap-6 xl:grid-cols-12">
      <div className="xl:col-span-4">
        <SectionCard
          title="Work Log Entries"
          action={
            <div className="flex gap-2">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search logs..."
                className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-100"
              />
              <button className="text-xs text-sky-400" onClick={createEntry}>
                New Entry
              </button>
            </div>
          }
        >
          {loading ? <p className="mb-3 text-sm text-slate-500">Loading work logs...</p> : null}
          <WorklogList entries={filteredEntries} selectedId={selectedId} onSelect={setSelectedId} />
        </SectionCard>
      </div>

      <div className="space-y-6 xl:col-span-8">
        <WorklogDetail entry={selectedEntry} tasks={tasks} commits={commits} onSave={saveEntry} />

        <SectionCard title="Needs Logging">
          <div className="space-y-3 text-sm text-slate-300">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              {doneWithoutLogs} done item{doneWithoutLogs === 1 ? '' : 's'} are still missing work log links.
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              {commitsWithoutLogs} recent commit{commitsWithoutLogs === 1 ? '' : 's'} are not attached to a work log entry.
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
