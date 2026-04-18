import { promises as fs } from 'fs'
import path from 'path'
import type { CommitRecord } from '@/lib/board-types'

const COMMITS_PATH = path.join(process.cwd(), 'data', 'commits.json')

export async function readCommits(): Promise<CommitRecord[]> {
  const raw = await fs.readFile(COMMITS_PATH, 'utf8')
  return JSON.parse(raw) as CommitRecord[]
}

export async function writeCommits(commits: CommitRecord[]): Promise<void> {
  await fs.writeFile(COMMITS_PATH, JSON.stringify(commits, null, 2) + '\n', 'utf8')
}
