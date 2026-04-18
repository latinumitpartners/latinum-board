import type { WorklogEntry } from '@/lib/board-types'
import { readIngestionItems, writeIngestionItems } from '@/lib/server/ingestion-readers'

export async function readWorklogs(): Promise<WorklogEntry[]> {
  return readIngestionItems<WorklogEntry>('worklogs.json')
}

export async function writeWorklogs(worklogs: WorklogEntry[]): Promise<void> {
  await writeIngestionItems('worklogs.json', 'worklogs', worklogs)
}
