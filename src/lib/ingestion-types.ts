export type IngestionSource = 'operator-api' | 'local-store' | 'manual'

export interface IngestionEnvelope<T> {
  schemaVersion: '2026-04-18.v1'
  generatedAt: string
  source: IngestionSource
  kind: 'sessions' | 'commits' | 'tasks' | 'worklogs'
  items: T[]
}

export interface IngestedSessionRecord {
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

export interface IngestedCommitRecord {
  hash: string
  message: string
  repo: string
  date: string
  linkedItemId?: string
  linkedProjectId?: string
  filesChanged?: string[]
  imported?: boolean
}

export interface IngestedTaskRecord {
  id: string
  title: string
  project?: string
  status: string
  priority: string
  owner?: string
  dueDate?: string
  nextAction?: string
  blocked?: boolean
  waitingOn?: string
  commitLinked?: boolean
  logLinked?: boolean
  description?: string
}

export interface IngestedWorklogRecord {
  id: string
  date: string
  summary: string
  bullets: string[]
  linkedItemIds: string[]
  linkedCommitHashes: string[]
}
