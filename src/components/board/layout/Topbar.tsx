'use client'

import { usePathname } from 'next/navigation'

type FilterKey = 'all' | 'high_priority' | 'blocked' | 'kevin' | 'claudia' | 'needs_logging'

const labels: Record<string, string> = {
  '/': 'Dashboard',
  '/board': 'Board',
  '/worklog': 'Work Log',
  '/commits': 'Commits',
  '/clients': 'Clients',
}

const filterOptions: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'All items' },
  { key: 'high_priority', label: 'High priority' },
  { key: 'blocked', label: 'Blocked' },
  { key: 'kevin', label: 'Kevin' },
  { key: 'claudia', label: 'Claudia' },
  { key: 'needs_logging', label: 'Needs logging' },
]

function getBreadcrumb(pathname: string) {
  if (pathname === '/projects') {
    return 'Projects'
  }
  if (pathname.startsWith('/projects/')) {
    return 'Projects / Detail'
  }
  return labels[pathname] || 'Latinum Board'
}

export function Topbar({
  title,
  onQuickAdd,
  boardFilter,
  onBoardFilterChange,
}: {
  title: string
  onQuickAdd?: () => void
  boardFilter?: FilterKey
  onBoardFilterChange?: (value: FilterKey) => void
}) {
  const pathname = usePathname()
  const breadcrumb = getBreadcrumb(pathname)
  const showBoardControls = pathname === '/board'

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950/80 px-6 backdrop-blur">
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500">{breadcrumb}</p>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
      </div>

      <div className="flex items-center gap-3">
        {showBoardControls ? (
          <select
            value={boardFilter || 'all'}
            onChange={(event) => onBoardFilterChange?.(event.target.value as FilterKey)}
            className="hidden rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm text-slate-100 focus:outline-none lg:block"
          >
            {filterOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            placeholder="Search tasks, commits, logs..."
            className="hidden w-80 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none lg:block"
          />
        )}
        <button
          className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
          onClick={onQuickAdd}
        >
          + Quick Add
        </button>
      </div>
    </header>
  )
}
