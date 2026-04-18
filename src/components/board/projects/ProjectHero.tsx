import { Badge } from '@/components/board/ui/Badge'
import { ProgressBar } from '@/components/board/ui/ProgressBar'
import type { ProjectSummary } from '@/lib/board-types'

export function ProjectHero({ project }: { project: ProjectSummary }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">{project.name}</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Strategic view of the project, with progress, tasks, commits, and linked work logs.
          </p>
        </div>
        {project.blocked ? <Badge variant="blocked">Blocked</Badge> : <Badge variant="status">Active</Badge>}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <div>
          <p className="text-xs text-slate-500">Status</p>
          <p className="mt-1 text-sm text-white">{project.status}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Progress</p>
          <p className="mt-1 text-sm text-white">{project.progress}%</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Next Milestone</p>
          <p className="mt-1 text-sm text-white">{project.nextMilestone || 'None set'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Project ID</p>
          <p className="mt-1 text-sm text-white">{project.id}</p>
        </div>
      </div>

      <div className="mt-4">
        <ProgressBar value={project.progress} />
      </div>

      <div className="mt-6 flex gap-3">
        <button className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950">
          Add Task
        </button>
        <button className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200">
          Add Work Log
        </button>
      </div>
    </div>
  )
}
