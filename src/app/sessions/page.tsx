import { Suspense } from 'react'
import { AppShell } from '@/components/board/layout/AppShell'
import { SessionsPageClient } from '@/components/board/sessions/SessionsPageClient'

export default function SessionsPage() {
  return (
    <AppShell title="Sessions">
      <Suspense fallback={<div className="text-sm text-slate-500">Loading sessions…</div>}>
        <SessionsPageClient />
      </Suspense>
    </AppShell>
  )
}
