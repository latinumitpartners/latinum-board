import Link from 'next/link'
import { projects } from '@/lib/board-data'
import { Badge } from '@/components/board/ui/Badge'
import { ProgressBar } from '@/components/board/ui/ProgressBar'

export function ProjectsIndexView() {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => (
        <Link
          key={project.id}
          href={`/projects/${project.id}`}
          className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 transition hover:border-slate-700 hover:bg-slate-900"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">{project.name}</h2>
              {project.nextMilestone ? (
                <p className="mt-2 text-sm text-slate-400">Next: {project.nextMilestone}</p>
              ) : null}
            </div>
            {project.blocked ? <Badge variant="blocked">Blocked</Badge> : <Badge variant="status">Active</Badge>}
          </div>

          <div className="mt-4">
            <ProgressBar value={project.progress} />
            <p className="mt-2 text-xs text-slate-500">{project.progress}% complete</p>
          </div>
        </Link>
      ))}
    </div>
  )
}
