import { promises as fs } from 'fs'
import path from 'path'
import type { WorkItem } from '@/lib/board-types'

const TASKS_PATH = path.join(process.cwd(), 'data', 'tasks.json')

export async function readTasks(): Promise<WorkItem[]> {
  const raw = await fs.readFile(TASKS_PATH, 'utf8')
  return JSON.parse(raw) as WorkItem[]
}

export async function writeTasks(tasks: WorkItem[]): Promise<void> {
  await fs.writeFile(TASKS_PATH, JSON.stringify(tasks, null, 2) + '\n', 'utf8')
}
