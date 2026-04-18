import type { ReactNode } from 'react'

const variants = {
  default: 'bg-slate-800 text-slate-300',
  status: 'bg-sky-500/15 text-sky-300',
  high: 'bg-amber-500/15 text-amber-300',
  critical: 'bg-rose-500/15 text-rose-300',
  waiting: 'bg-amber-500/15 text-amber-300',
  blocked: 'bg-rose-500/15 text-rose-300',
  success: 'bg-emerald-500/15 text-emerald-300',
} as const

export function Badge({
  children,
  variant = 'default',
}: {
  children: ReactNode
  variant?: keyof typeof variants
}) {
  return (
    <span className={`inline-flex rounded-lg px-2 py-1 text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  )
}
