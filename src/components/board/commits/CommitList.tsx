'use client'

import type { CommitRecord } from '@/lib/board-types'

export function CommitList({
  commits,
  selectedHash,
  onSelect,
}: {
  commits: CommitRecord[]
  selectedHash: string
  onSelect: (hash: string) => void
}) {
  return (
    <div className="space-y-3">
      {commits.map((commit) => {
        const active = commit.hash === selectedHash
        return (
          <button
            key={commit.hash}
            type="button"
            onClick={() => onSelect(commit.hash)}
            className={[
              'w-full rounded-xl border p-4 text-left transition',
              active
                ? 'border-sky-500/20 bg-sky-500/10'
                : 'border-slate-800 bg-slate-900/50 hover:bg-slate-800/60',
            ].join(' ')}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-white">{commit.hash}</span>
              <span className="text-xs text-slate-500">{commit.date}</span>
            </div>
            <p className="mt-2 text-sm text-slate-300">{commit.message}</p>
            <p className="mt-2 text-xs text-slate-500">{commit.repo}</p>
          </button>
        )
      })}
    </div>
  )
}
