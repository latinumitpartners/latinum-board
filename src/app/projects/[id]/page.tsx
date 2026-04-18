import { AppShell } from '@/components/board/layout/AppShell'
import { ProjectDetailView } from '@/components/board/projects/ProjectDetailView'

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <AppShell title="Project Detail">
      <ProjectDetailView id={id} />
    </AppShell>
  )
}
