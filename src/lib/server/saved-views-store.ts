import { promises as fs } from 'fs'
import path from 'path'
import type { SavedView } from '@/lib/board-types'

const SAVED_VIEWS_PATH = path.join(process.cwd(), 'data', 'saved-views.json')

async function ensureFile() {
  try {
    await fs.access(SAVED_VIEWS_PATH)
  } catch {
    await fs.writeFile(SAVED_VIEWS_PATH, '[]\n', 'utf8')
  }
}

export async function readSavedViews(): Promise<SavedView[]> {
  await ensureFile()
  const raw = await fs.readFile(SAVED_VIEWS_PATH, 'utf8')
  return JSON.parse(raw) as SavedView[]
}

export async function writeSavedViews(views: SavedView[]): Promise<void> {
  await ensureFile()
  await fs.writeFile(SAVED_VIEWS_PATH, JSON.stringify(views, null, 2) + '\n', 'utf8')
}
