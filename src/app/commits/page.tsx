import { CommitsView } from '@/components/board/commits/CommitsView'
import { AppShell } from '@/components/board/layout/AppShell'

export default function CommitsPage() {
  return (
    <AppShell title="Commits">
      <CommitsView />
    </AppShell>
  )
}
