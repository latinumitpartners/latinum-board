import { AppShell } from '@/components/board/layout/AppShell'
import { KPIGrid } from '@/components/board/dashboard/KPIGrid'
import { TodayPanel } from '@/components/board/dashboard/TodayPanel'
import { WaitingPanel } from '@/components/board/dashboard/WaitingPanel'
import { ActiveProjectsPanel } from '@/components/board/dashboard/ActiveProjectsPanel'
import { RecentActivityPanel } from '@/components/board/dashboard/RecentActivityPanel'
import { NeedsLoggingPanel } from '@/components/board/dashboard/NeedsLoggingPanel'
import { SessionsOverviewPanel } from '@/components/board/dashboard/SessionsOverviewPanel'
import { RecentCompletedSessionsPanel } from '@/components/board/dashboard/RecentCompletedSessionsPanel'
import { SessionsSecondaryPanel } from '@/components/board/dashboard/SessionsSecondaryPanel'
import { IngestionStatusPanel } from '@/components/board/dashboard/IngestionStatusPanel'

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
          <div className="xl:col-span-8">
            <SessionsOverviewPanel />
          </div>
          <div className="xl:col-span-4">
            <RecentCompletedSessionsPanel />
          </div>
          <div className="xl:col-span-12">
            <IngestionStatusPanel />
          </div>
          <div className="xl:col-span-12">
            <SessionsSecondaryPanel />
          </div>
        </div>
      </div>
    </AppShell>
  )
}
