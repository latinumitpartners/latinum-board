export type Status =
  | 'inbox'
  | 'next'
  | 'in_progress'
  | 'waiting'
  | 'blocked'
  | 'review'
  | 'done'

export type Priority = 'low' | 'medium' | 'high' | 'critical'

export interface WorkItem {
  id: string
  title: string
  project?: string
  status: Status
  priority: Priority
  owner?: string
  dueDate?: string
  nextAction?: string
  blocked?: boolean
  waitingOn?: string
  commitLinked?: boolean
  logLinked?: boolean
  description?: string
  subtasks?: Array<{ id: string; title: string; done: boolean }>
  linkedCommits?: string[]
  linkedLogs?: string[]
  notes?: string[]
  history?: string[]
}

export interface ProjectSummary {
  id: string
  name: string
  status: Status
  progress: number
  nextMilestone?: string
  blocked?: boolean
}

export interface ActivityItem {
  id: string
  type: 'task' | 'commit' | 'worklog' | 'review' | 'audit'
  text: string
  meta?: string
}

export interface WorklogEntry {
  id: string
  date: string
  summary: string
  bullets: string[]
  linkedItemIds: string[]
  linkedCommitHashes: string[]
}

export interface CommitRecord {
  hash: string
  message: string
  repo: string
  date: string
  linkedItemId?: string
  linkedProjectId?: string
  filesChanged?: string[]
  imported?: boolean
}

export interface DashboardKPI {
  label: string
  value: string | number
  meta?: string
}

export interface SessionSnapshot {
  sessionKey: string
  title: string
  lastUpdated: string
  cwd?: string
  model?: string
  thinking?: string
  lastUserText?: string
  lastAssistantText?: string
  messageCount: number
  status: 'active' | 'quiet' | 'waiting' | 'stalled'
  summary?: string
}

export interface DashboardData {
  kpis: DashboardKPI[]
  todayItems: WorkItem[]
  waitingItems: WorkItem[]
  projects: ProjectSummary[]
  activity: ActivityItem[]
  needsLogging: string[]
  sessionCounts?: {
    active: number
    waiting: number
    stalled: number
    completedRecently: number
  }
  recentCompletedSessions?: SessionSnapshot[]
}

export interface BoardDataSnapshot {
  tasks: WorkItem[]
  commits: CommitRecord[]
  worklogs: WorklogEntry[]
  auditEvents: AuditEvent[]
}

export interface AuditEvent {
  id: string
  timestamp: string
  entityType: 'task' | 'commit' | 'worklog' | 'view'
  entityId: string
  action: 'created' | 'updated' | 'deleted' | 'linked' | 'imported' | 'saved'
  summary: string
  meta?: string
}

export interface SavedView {
  id: string
  name: string
  filter: 'all' | 'high_priority' | 'blocked' | 'kevin' | 'claudia' | 'needs_logging'
  createdAt: string
}
