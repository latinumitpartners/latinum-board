import { AppShell } from '@/components/board/layout/AppShell'
import { WorklogView } from '@/components/board/worklog/WorklogView'

export default function WorklogPage() {
  return (
    <AppShell title="Work Log">
      <WorklogView />
    </AppShell>
  )
}
