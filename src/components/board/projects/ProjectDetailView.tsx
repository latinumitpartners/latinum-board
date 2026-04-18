import { ItemCard } from '@/components/board/cards/ItemCard'
import { ProjectHero } from '@/components/board/projects/ProjectHero'
import { SectionCard } from '@/components/board/ui/SectionCard'
import { boardItems, commits, projects, worklogEntries } from '@/lib/board-data'

export function ProjectDetailView({ id }: { id: string }) {
  const project = projects.find((entry) => entry.id === id)

  if (!project) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-sm text-slate-500">
        Project not found.
      </div>
    )
  }

  const relatedItems = boardItems.filter((item) => item.project === project.name)
  const relatedCommits = commits.filter((commit) => commit.linkedProjectId === project.id)
  const relatedLogs = worklogEntries.filter((entry) =>
    entry.linkedItemIds.some((itemId) => relatedItems.some((item) => item.id === itemId))
  )

  return (
    <div className="grid gap-6 xl:grid-cols-12">
      <div className="space-y-6 xl:col-span-8">
        <ProjectHero project={project} />

        <SectionCard title="Project Tasks">
          <div className="space-y-3">
            {relatedItems.length ? (
              relatedItems.map((item) => <ItemCard key={item.id} item={item} />)
            ) : (
              <p className="text-sm text-slate-500">No tasks linked to this project yet.</p>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Related Commits">
          <div className="space-y-3">
            {relatedCommits.length ? (
              relatedCommits.map((commit) => (
                <div key={commit.hash} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-sm font-semibold text-white">{commit.hash}</p>
                  <p className="mt-1 text-sm text-slate-300">{commit.message}</p>
                  <p className="mt-1 text-xs text-slate-500">{commit.repo} • {commit.date}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No commits linked yet.</p>
            )}
          </div>
        </SectionCard>
      </div>

      <div className="space-y-6 xl:col-span-4">
        <SectionCard title="Linked Work Logs">
          <div className="space-y-3">
            {relatedLogs.length ? (
              relatedLogs.map((entry) => (
                <div key={entry.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-sm font-semibold text-white">{entry.date}</p>
                  <p className="mt-1 text-sm text-slate-300">{entry.summary}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No work logs linked yet.</p>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Project Health">
          <div className="space-y-3 text-sm text-slate-300">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              {relatedItems.length} linked task{relatedItems.length === 1 ? '' : 's'}
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              {relatedCommits.length} linked commit{relatedCommits.length === 1 ? '' : 's'}
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              {relatedLogs.length} linked work log entr{relatedLogs.length === 1 ? 'y' : 'ies'}
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
