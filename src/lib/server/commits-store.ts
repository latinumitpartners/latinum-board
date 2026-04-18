import type { CommitRecord } from '@/lib/board-types'
import { readIngestionItems, writeIngestionItems } from '@/lib/server/ingestion-readers'

export async function readCommits(): Promise<CommitRecord[]> {
  return readIngestionItems<CommitRecord>('commits.json')
}

export async function writeCommits(commits: CommitRecord[]): Promise<void> {
  await writeIngestionItems('commits.json', 'commits', commits)
}
