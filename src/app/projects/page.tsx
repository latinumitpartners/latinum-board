import { AppShell } from '@/components/board/layout/AppShell'
import { ProjectsIndexView } from '@/components/board/projects/ProjectsIndexView'

export default function ProjectsPage() {
  return (
    <AppShell title="Projects">
      <ProjectsIndexView />
    </AppShell>
  )
}
