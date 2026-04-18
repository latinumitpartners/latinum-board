'use client'

import { useEffect, useState } from 'react'
import { kpis as fallbackKpis } from '@/lib/board-data'
import type { DashboardKPI } from '@/lib/board-types'

function KPIStatCard({
  label,
  value,
  meta,
}: {
  label: string
  value: string | number
  meta?: string
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      {meta ? <p className="mt-1 text-xs text-slate-500">{meta}</p> : null}
    </div>
  )
}

export function KPIGrid() {
  const [items, setItems] = useState<DashboardKPI[]>(fallbackKpis)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/dashboard', { cache: 'no-store' })
        if (!response.ok) throw new Error('Failed to load dashboard')
        const payload = (await response.json()) as { kpis: DashboardKPI[] }
        setItems(payload.kpis)
      } catch (error) {
        console.error(error)
      }
    }

    void load()
  }, [])

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
      {items.map((kpi) => (
        <KPIStatCard key={kpi.label} label={kpi.label} value={kpi.value} meta={kpi.meta} />
      ))}
    </div>
  )
}
