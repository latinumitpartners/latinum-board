import { promises as fs } from 'fs'
import path from 'path'
import type { WorklogEntry } from '@/lib/board-types'

const WORKLOGS_PATH = path.join(process.cwd(), 'data', 'worklogs.json')

export async function readWorklogs(): Promise<WorklogEntry[]> {
  const raw = await fs.readFile(WORKLOGS_PATH, 'utf8')
  return JSON.parse(raw) as WorklogEntry[]
}

export async function writeWorklogs(worklogs: WorklogEntry[]): Promise<void> {
  await fs.writeFile(WORKLOGS_PATH, JSON.stringify(worklogs, null, 2) + '\n', 'utf8')
}
