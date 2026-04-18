import { AppShell } from '@/components/board/layout/AppShell'
import { KPIGrid } from '@/components/board/dashboard/KPIGrid'
import { TodayPanel } from '@/components/board/dashboard/TodayPanel'
import { WaitingPanel } from '@/components/board/dashboard/WaitingPanel'
import { ActiveProjectsPanel } from '@/components/board/dashboard/ActiveProjectsPanel'
import { RecentActivityPanel } from '@/components/board/dashboard/RecentActivityPanel'
import { NeedsLoggingPanel } from '@/components/board/dashboard/NeedsLoggingPanel'
import { SessionsPanel } from '@/components/board/sessions/SessionsPanel'

export default function Home() {
  return (
    <AppShell title="Latinum Command Board">
      <div className="space-y-6">
        <KPIGrid />

        <div className="grid gap-6 xl:grid-cols-12">
          <div className="xl:col-span-5">
            <TodayPanel />
          </div>
          <div className="xl:col-span-3">
            <WaitingPanel />
          </div>
          <div className="xl:col-span-4">
            <ActiveProjectsPanel />
          </div>
          <div className="xl:col-span-7">
            <RecentActivityPanel />
          </div>
          <div className="xl:col-span-5">
            <NeedsLoggingPanel />
          </div>
          <div className="xl:col-span-12">
            <SessionsPanel />
          </div>
        </div>
      </div>
    </AppShell>
  )
}
