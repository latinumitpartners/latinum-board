'use client'

import { useEffect, useMemo, useState } from 'react'
import { CommitDetail } from '@/components/board/commits/CommitDetail'
import { CommitImportPanel } from '@/components/board/commits/CommitImportPanel'
import { CommitList } from '@/components/board/commits/CommitList'
import { SectionCard } from '@/components/board/ui/SectionCard'
import { boardItems as fallbackTasks, commits as fallbackCommits, worklogEntries as fallbackWorklogs } from '@/lib/board-data'
import type { CommitRecord, WorkItem, WorklogEntry } from '@/lib/board-types'

export function CommitsView() {
  const [commits, setCommits] = useState<CommitRecord[]>(fallbackCommits)
  const [tasks, setTasks] = useState<WorkItem[]>(fallbackTasks)
  const [worklogs, setWorklogs] = useState<WorklogEntry[]>(fallbackWorklogs)
  const [selectedHash, setSelectedHash] = useState<string>(fallbackCommits[0]?.hash || '')
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  const loadData = async () => {
      try {
        const [commitsResponse, tasksResponse, worklogsResponse] = await Promise.all([
          fetch('/api/commits', { cache: 'no-store' }),
          fetch('/api/tasks', { cache: 'no-store' }),
          fetch('/api/worklogs', { cache: 'no-store' }),
        ])
        if (!commitsResponse.ok || !tasksResponse.ok || !worklogsResponse.ok) {
          throw new Error('Failed to load commits view data')
        }
        const [commitsPayload, tasksPayload, worklogsPayload] = await Promise.all([
          commitsResponse.json() as Promise<CommitRecord[]>,
          tasksResponse.json() as Promise<WorkItem[]>,
          worklogsResponse.json() as Promise<WorklogEntry[]>,
        ])
        setCommits(commitsPayload)
        setTasks(tasksPayload)
        setWorklogs(worklogsPayload)
        if (commitsPayload[0]) setSelectedHash(commitsPayload[0].hash)
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

  useEffect(() => {
    void loadData()
  }, [])

  const filteredCommits = useMemo(() => {
    if (!query.trim()) return commits
    const normalized = query.toLowerCase()
    return commits.filter(
      (commit) =>
        commit.hash.toLowerCase().includes(normalized) ||
        commit.message.toLowerCase().includes(normalized) ||
        commit.repo.toLowerCase().includes(normalized)
    )
  }, [commits, query])

  const selectedCommit = useMemo(
    () => commits.find((commit) => commit.hash === selectedHash) || null,
    [commits, selectedHash]
  )

  const unlinkedCount = commits.filter((commit) => !commit.linkedItemId).length

  const saveCommit = async (updated: CommitRecord) => {
    const previous = commits.find((commit) => commit.hash === updated.hash)
    const previousTaskId = previous?.linkedItemId
    const nextTaskId = updated.linkedItemId

    const nextCommits = commits.map((commit) => (commit.hash === updated.hash ? updated : commit))
    const nextTasks = tasks.map((task) => {
      const linkedCommits = new Set(task.linkedCommits || [])
      if (previousTaskId === task.id && previousTaskId !== nextTaskId) linkedCommits.delete(updated.hash)
      if (nextTaskId === task.id) linkedCommits.add(updated.hash)
      return {
        ...task,
        linkedCommits: Array.from(linkedCommits),
        commitLinked: linkedCommits.size > 0,
      }
    })

    setCommits(nextCommits)
    setTasks(nextTasks)

    try {
      await Promise.all([
        fetch('/api/commits', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated),
        }),
        ...nextTasks
          .filter((task) => task.id === previousTaskId || task.id === nextTaskId)
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

  return (
    <div className="grid gap-6 xl:grid-cols-12">
      <div className="xl:col-span-5">
        <SectionCard
          title="Commits"
          action={
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search commits..."
              className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-100"
            />
          }
        >
          {loading ? <p className="mb-3 text-sm text-slate-500">Loading commits...</p> : null}
          <CommitList commits={filteredCommits} selectedHash={selectedHash} onSelect={setSelectedHash} />
        </SectionCard>
      </div>

      <div className="space-y-6 xl:col-span-7">
        <CommitImportPanel onImported={() => void loadData()} />

        <CommitDetail commit={selectedCommit} tasks={tasks} worklogs={worklogs} onSave={saveCommit} />

        <SectionCard title="Commit Hygiene">
          <div className="space-y-3 text-sm text-slate-300">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              {unlinkedCount} commit{unlinkedCount === 1 ? '' : 's'} still need task linkage.
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              Use this screen to close the loop between shipped code and logged work.
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
