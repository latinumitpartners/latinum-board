'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/board/ui/Badge'
import { ProgressBar } from '@/components/board/ui/ProgressBar'
import { SectionCard } from '@/components/board/ui/SectionCard'
import { projects as fallbackProjects } from '@/lib/board-data'
import type { ProjectSummary } from '@/lib/board-types'

export function ActiveProjectsPanel() {
  const [projects, setProjects] = useState<ProjectSummary[]>(fallbackProjects)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/dashboard', { cache: 'no-store' })
        if (!response.ok) throw new Error('Failed to load dashboard')
        const payload = (await response.json()) as { projects: ProjectSummary[] }
        setProjects(payload.projects)
      } catch (error) {
        console.error(error)
      }
    }

    void load()
  }, [])

  return (
    <SectionCard title="Active Projects">
      <div className="space-y-3">
        {projects.map((project) => (
          <div key={project.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-white">{project.name}</h4>
                {project.nextMilestone ? (
                  <p className="mt-1 text-xs text-slate-400">Next: {project.nextMilestone}</p>
                ) : null}
              </div>
              {project.blocked ? <Badge variant="blocked">Blocked</Badge> : <Badge variant="status">Active</Badge>}
            </div>
            <div className="mt-4">
              <ProgressBar value={project.progress} />
              <p className="mt-2 text-xs text-slate-500">{project.progress}% complete</p>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}
