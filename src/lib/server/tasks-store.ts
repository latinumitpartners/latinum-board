import type { WorkItem } from '@/lib/board-types'
import { readIngestionItems, writeIngestionItems } from '@/lib/server/ingestion-readers'

export async function readTasks(): Promise<WorkItem[]> {
  return readIngestionItems<WorkItem>('tasks.json')
}

export async function writeTasks(tasks: WorkItem[]): Promise<void> {
  await writeIngestionItems('tasks.json', 'tasks', tasks)
}
