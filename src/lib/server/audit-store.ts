import { promises as fs } from 'fs'
import path from 'path'
import type { AuditEvent } from '@/lib/board-types'

const AUDIT_PATH = path.join(process.cwd(), 'data', 'audit.json')

async function ensureFile() {
  try {
    await fs.access(AUDIT_PATH)
  } catch {
    await fs.writeFile(AUDIT_PATH, '[]\n', 'utf8')
  }
}

export async function readAuditEvents(): Promise<AuditEvent[]> {
  await ensureFile()
  const raw = await fs.readFile(AUDIT_PATH, 'utf8')
  return JSON.parse(raw) as AuditEvent[]
}

export async function writeAuditEvents(events: AuditEvent[]): Promise<void> {
  await ensureFile()
  await fs.writeFile(AUDIT_PATH, JSON.stringify(events, null, 2) + '\n', 'utf8')
}

export async function appendAuditEvent(event: AuditEvent): Promise<void> {
  const events = await readAuditEvents()
  await writeAuditEvents([event, ...events].slice(0, 500))
}
