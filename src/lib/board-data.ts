import type {
  ActivityItem,
  AuditEvent,
  BoardDataSnapshot,
  CommitRecord,
  DashboardData,
  DashboardKPI,
  ProjectSummary,
  Status,
  WorkItem,
  WorklogEntry,
} from '@/lib/board-types'

export const boardItems: WorkItem[] = [
  {
    id: 'board-1',
    title: 'Capture dashboard requirements',
    project: 'Latinum Board MVP',
    status: 'inbox',
    priority: 'medium',
    owner: 'Kevin',
    nextAction: 'Review workflow expectations from recent sessions',
    commitLinked: false,
    logLinked: false,
    description: 'Collect the exact operator workflow expectations so the board reflects how Kevin and Claudia already work.',
    subtasks: [
      { id: 'board-1-sub-1', title: 'List workflow sections', done: true },
      { id: 'board-1-sub-2', title: 'Define ownership and status metadata', done: false },
    ],
    linkedLogs: ['2026-04-17'],
    notes: ['Needs to keep work logs and commits as first-class records.'],
    history: ['Created from planning discussion in Claudia topics.'],
  },
  {
    id: 'board-2',
    title: 'Define board statuses',
    project: 'Latinum Board MVP',
    status: 'next',
    priority: 'high',
    owner: 'Claudia',
    nextAction: 'Confirm final status vocabulary',
    commitLinked: false,
    logLinked: true,
    description: 'Finalize the status model so tasks can move cleanly from capture through delivery.',
    subtasks: [
      { id: 'board-2-sub-1', title: 'Keep statuses minimal', done: true },
      { id: 'board-2-sub-2', title: 'Validate waiting and review semantics', done: false },
    ],
    linkedLogs: ['2026-04-17'],
    notes: ['Current preferred set: inbox, next, in progress, waiting, blocked, review, done.'],
    history: ['Promoted from dashboard planning into next actions.'],
  },
  {
    id: 'board-3',
    title: 'Build dashboard shell',
    project: 'Latinum Board MVP',
    status: 'in_progress',
    priority: 'high',
    owner: 'Claudia',
    dueDate: 'Apr 17',
    nextAction: 'Stabilize shell components and cards',
    commitLinked: true,
    logLinked: true,
    description: 'Establish the dark control-plane shell, shared primitives, and dashboard panels for the first usable board.',
    subtasks: [
      { id: 'board-3-sub-1', title: 'Create shell layout', done: true },
      { id: 'board-3-sub-2', title: 'Build dashboard panels', done: true },
      { id: 'board-3-sub-3', title: 'Wire item drawer', done: false },
    ],
    linkedCommits: ['34b047284'],
    linkedLogs: ['2026-04-17'],
    notes: ['Board is now a standalone app under product/latinum-board.'],
    history: ['Dashboard shell scaffolded.', 'Kanban route added at /board.'],
  },
  {
    id: 'board-4',
    title: 'Choose commit import model',
    project: 'Latinum Board MVP',
    status: 'waiting',
    priority: 'medium',
    owner: 'Kevin',
    waitingOn: 'Kevin',
    nextAction: 'Pick manual, assisted, or automatic ingestion',
    commitLinked: false,
    logLinked: false,
    description: 'Decide how commit records should enter the board, from fully manual links to automated ingestion.',
    subtasks: [
      { id: 'board-4-sub-1', title: 'Compare manual vs automatic import', done: false },
      { id: 'board-4-sub-2', title: 'Define minimum metadata to store', done: false },
    ],
    notes: ['This affects commits screen design and data model.'],
    history: ['Blocked pending workflow choice from Kevin.'],
  },
  {
    id: 'board-5',
    title: 'Resolve project auth approach',
    project: 'Latinum Board MVP',
    status: 'review',
    priority: 'medium',
    owner: 'Claudia',
    nextAction: 'Review auth options before implementation',
    commitLinked: false,
    logLinked: false,
    description: 'Basic auth is fine for v1, but the longer-term auth model should be reviewed before operational use expands.',
    subtasks: [
      { id: 'board-5-sub-1', title: 'Use nginx basic auth for v1', done: true },
      { id: 'board-5-sub-2', title: 'Define future app auth requirements', done: false },
    ],
    notes: ['Likely evolve to in-app auth and audit trail later.'],
    history: ['Moved into review after subdomain deployment planning.'],
  },
  {
    id: 'board-6',
    title: 'Split board into standalone app',
    project: 'Latinum Board MVP',
    status: 'done',
    priority: 'high',
    owner: 'Claudia',
    dueDate: 'Apr 17',
    nextAction: 'Use new repo boundary for all future work',
    commitLinked: true,
    logLinked: true,
    description: 'Moved the board out of latinum-landing into its own standalone project boundary.',
    subtasks: [
      { id: 'board-6-sub-1', title: 'Scaffold separate Next app', done: true },
      { id: 'board-6-sub-2', title: 'Move board shell and primitives', done: true },
      { id: 'board-6-sub-3', title: 'Clean latinum-landing', done: true },
    ],
    linkedCommits: ['34b047284'],
    linkedLogs: ['2026-04-17'],
    notes: ['Future work now belongs only in product/latinum-board.'],
    history: ['Standalone app created.', 'Both apps verified building cleanly.'],
  },
]

export const commits: CommitRecord[] = [
  {
    hash: '34b047284',
    message: 'Clarify nested product repo boundaries',
    repo: 'axiom-workspace',
    date: '2026-04-17',
    linkedItemId: 'board-6',
    linkedProjectId: 'proj-1',
    filesChanged: ['AGENTS.md', 'workspace docs', 'migration notes'],
  },
  {
    hash: '6ede40707',
    message: 'Add product repo migration plan',
    repo: 'axiom-workspace',
    date: '2026-04-17',
    linkedItemId: 'board-3',
    linkedProjectId: 'proj-1',
    filesChanged: ['migration notes', 'workspace planning docs'],
  },
  {
    hash: '88816d3',
    message: 'Add workspace context note',
    repo: 'latinum-landing',
    date: '2026-04-17',
    linkedItemId: undefined,
    linkedProjectId: undefined,
    filesChanged: ['README-WORKSPACE-CONTEXT.md'],
  },
]

export const worklogEntries: WorklogEntry[] = [
  {
    id: 'log-2026-04-17',
    date: '2026-04-17',
    summary: 'Planned and scaffolded the first version of the Latinum command board.',
    bullets: [
      'Defined the dashboard and kanban structure for the private operator board.',
      'Split the board into its own standalone app under product/latinum-board.',
      'Added deployment scripts and rollout automation for kevin-todo.latinum.ca.',
      'Built the item detail drawer and connected it to board cards.',
    ],
    linkedItemIds: ['board-2', 'board-3', 'board-6'],
    linkedCommitHashes: ['34b047284'],
  },
  {
    id: 'log-2026-04-16',
    date: '2026-04-16',
    summary: 'Established the dev staging path and confirmed the hidden staging workflow.',
    bullets: [
      'Used 10.1.0.47 and dev.latinum.ca as the staging environment for landing work.',
      'Confirmed the staging host runtime and service layout.',
      'Validated the decision to use the dev VPS as the first private board host.',
    ],
    linkedItemIds: ['board-1'],
    linkedCommitHashes: [],
  },
  {
    id: 'log-2026-04-15',
    date: '2026-04-15',
    summary: 'Clarified deployment and firewall baseline decisions for client infrastructure.',
    bullets: [
      'Refined deploy script firewall defaults and access assumptions.',
      'Captured reusable deployment patterns that now inform board rollout scripts.',
    ],
    linkedItemIds: ['board-4'],
    linkedCommitHashes: [],
  },
]

const statusRank: Record<Status, number> = {
  inbox: 0,
  next: 1,
  in_progress: 2,
  waiting: 3,
  blocked: 4,
  review: 5,
  done: 6,
}

function statusLabel(status: Status) {
  return status.replace(/_/g, ' ')
}

function slugifyProject(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function inferTaskFlags(task: WorkItem, commitsList: CommitRecord[], worklogsList: WorklogEntry[]): WorkItem {
  const linkedCommits = task.linkedCommits || []
  const linkedLogs = task.linkedLogs || []
  const commitLinked = linkedCommits.length > 0 || commitsList.some((commit) => commit.linkedItemId === task.id)
  const logLinked = linkedLogs.length > 0 || worklogsList.some((entry) => entry.linkedItemIds.includes(task.id))

  return {
    ...task,
    commitLinked,
    logLinked,
  }
}

export function createBoardSnapshot(
  tasks: WorkItem[] = boardItems,
  commitsList: CommitRecord[] = commits,
  worklogsList: WorklogEntry[] = worklogEntries,
  auditEvents: AuditEvent[] = []
): BoardDataSnapshot {
  const normalizedTasks = tasks.map((task) => inferTaskFlags(task, commitsList, worklogsList))
  return {
    tasks: normalizedTasks,
    commits: commitsList,
    worklogs: worklogsList,
    auditEvents,
  }
}

export function buildProjectSummaries(snapshot: BoardDataSnapshot): ProjectSummary[] {
  const grouped = new Map<string, WorkItem[]>()

  snapshot.tasks.forEach((task) => {
    const name = task.project || 'Unassigned'
    grouped.set(name, [...(grouped.get(name) || []), task])
  })

  return Array.from(grouped.entries())
    .map(([name, tasks]) => {
      const done = tasks.filter((task) => task.status === 'done').length
      const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0
      const blocked = tasks.some((task) => task.status === 'blocked' || task.blocked)
      const activeStatuses = tasks
        .map((task) => task.status)
        .sort((a, b) => statusRank[a] - statusRank[b])
      const nextTask = tasks.find((task) => task.status !== 'done')

      return {
        id: `proj-${slugifyProject(name)}`,
        name,
        status: blocked ? 'blocked' : activeStatuses[0] || 'next',
        progress,
        nextMilestone: nextTask?.nextAction || nextTask?.title || 'No next action set',
        blocked,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function buildActivity(snapshot: BoardDataSnapshot): ActivityItem[] {
  if (snapshot.auditEvents.length > 0) {
    return snapshot.auditEvents.slice(0, 8).map((event) => ({
      id: event.id,
      type: 'audit' as const,
      text: event.summary,
      meta: event.meta || event.timestamp,
    }))
  }

  const taskEvents = snapshot.tasks.slice(0, 3).map((task) => ({
    id: `task-${task.id}`,
    type: 'task' as const,
    text: `${task.title}`,
    meta: `${statusLabel(task.status)}${task.project ? ` · ${task.project}` : ''}`,
  }))

  const commitEvents = snapshot.commits.slice(0, 3).map((commit) => ({
    id: `commit-${commit.hash}`,
    type: 'commit' as const,
    text: `Commit ${commit.hash}`,
    meta: commit.message,
  }))

  const worklogEvents = snapshot.worklogs.slice(0, 2).map((entry) => ({
    id: `worklog-${entry.id}`,
    type: 'worklog' as const,
    text: `Work log ${entry.date}`,
    meta: entry.summary,
  }))

  return [...taskEvents, ...commitEvents, ...worklogEvents].slice(0, 6)
}

export function buildNeedsLogging(snapshot: BoardDataSnapshot): string[] {
  const doneWithoutLogs = snapshot.tasks.filter((task) => task.status === 'done' && !task.logLinked).length
  const commitsWithoutTasks = snapshot.commits.filter((commit) => !commit.linkedItemId).length
  const logsWithoutTasks = snapshot.worklogs.filter((entry) => entry.linkedItemIds.length === 0).length

  return [
    `${doneWithoutLogs} completed task${doneWithoutLogs === 1 ? '' : 's'} not in work log`,
    `${commitsWithoutTasks} commit${commitsWithoutTasks === 1 ? '' : 's'} not linked to any task`,
    `${logsWithoutTasks} work log entr${logsWithoutTasks === 1 ? 'y' : 'ies'} missing task references`,
  ]
}

export function buildDashboardData(snapshot: BoardDataSnapshot): DashboardData {
  const tasks = snapshot.tasks
  const projects = buildProjectSummaries(snapshot)
  const dueThisWeek = tasks.filter((task) => Boolean(task.dueDate) && task.status !== 'done').length
  const inProgress = tasks.filter((task) => task.status === 'in_progress').length
  const waiting = tasks.filter((task) => task.status === 'waiting' || task.status === 'blocked').length
  const commitsThisWeek = snapshot.commits.length
  const worklogsThisWeek = snapshot.worklogs.length
  const needsLogging = buildNeedsLogging(snapshot)
  const needsLoggingCount = [
    tasks.filter((task) => task.status === 'done' && !task.logLinked).length,
    snapshot.commits.filter((commit) => !commit.linkedItemId).length,
    snapshot.worklogs.filter((entry) => entry.linkedItemIds.length === 0).length,
  ].reduce((sum, value) => sum + value, 0)

  const kpis: DashboardKPI[] = [
    { label: 'Open Items', value: tasks.filter((task) => task.status !== 'done').length, meta: `${dueThisWeek} due this week` },
    { label: 'In Progress', value: inProgress },
    { label: 'Waiting', value: waiting },
    { label: 'Commits This Week', value: commitsThisWeek },
    { label: 'Work Logs This Week', value: worklogsThisWeek },
    { label: 'Needs Logging', value: needsLoggingCount, meta: 'attention needed' },
  ]

  const todayItems = tasks
    .filter((task) => ['in_progress', 'next'].includes(task.status))
    .sort((a, b) => statusRank[a.status] - statusRank[b.status])
    .slice(0, 5)

  const waitingItems = tasks
    .filter((task) => ['waiting', 'blocked', 'review'].includes(task.status))
    .sort((a, b) => statusRank[a.status] - statusRank[b.status])
    .slice(0, 5)

  return {
    kpis,
    todayItems,
    waitingItems,
    projects,
    activity: buildActivity(snapshot),
    needsLogging,
  }
}

const fallbackSnapshot = createBoardSnapshot()
const fallbackDashboard = buildDashboardData(fallbackSnapshot)

export const todayItems = fallbackDashboard.todayItems
export const waitingItems = fallbackDashboard.waitingItems
export const projects = fallbackDashboard.projects
export const activity = fallbackDashboard.activity
export const kpis = fallbackDashboard.kpis
export const needsLoggingItems = fallbackDashboard.needsLogging
