'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { label: 'Dashboard', href: '/' },
  { label: 'Board', href: '/board' },
  { label: 'Sessions', href: '/sessions' },
  { label: 'Work Log', href: '/worklog' },
  { label: 'Commits', href: '/commits' },
  { label: 'Projects', href: '/projects' },
]

const filters = ['High Priority', 'Blocked', 'Delegated to Claudia', 'Needs Logging']

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <aside className="hidden border-r border-slate-800 bg-slate-900/80 md:flex md:w-64 md:flex-col">
      <div className="border-b border-slate-800 p-5">
        <h1 className="text-sm font-semibold text-white">Latinum Command Board</h1>
        <p className="mt-1 text-xs text-slate-400">Internal workflow</p>
      </div>

      <nav className="space-y-1 p-3">
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.label}
              href={item.href}
              className={[
                'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition',
                active
                  ? 'border border-sky-500/20 bg-sky-500/15 text-sky-300'
                  : 'text-slate-300 hover:bg-slate-800',
              ].join(' ')}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto border-t border-slate-800 p-3">
        <p className="mb-2 px-3 text-xs uppercase tracking-wide text-slate-500">Smart filters</p>
        <div className="space-y-1">
          {filters.map((filter) => (
            <button
              key={filter}
              className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
            >
              {filter}
            </button>
          ))}
        </div>
      </div>
    </aside>
  )
}
