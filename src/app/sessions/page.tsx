import { AppShell } from '@/components/board/layout/AppShell'
import { SessionsPanel } from '@/components/board/sessions/SessionsPanel'

export default function SessionsPage() {
  return (
    <AppShell title="Sessions">
      <SessionsPanel />
    </AppShell>
  )
}
