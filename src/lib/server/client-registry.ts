import type { ClientRegistryRecord } from '@/lib/board-types'
import { boardApiAuthHeaders } from '@/lib/server/api-auth'
import { getCrmApiBase } from '@/lib/server/crm-api-base'

export async function readClientRegistry(): Promise<ClientRegistryRecord[]> {
  try {
    const response = await fetch(`${await getCrmApiBase()}/api/clients`, { cache: 'no-store', headers: boardApiAuthHeaders() })
    if (!response.ok) return []
    const payload = (await response.json()) as { clients?: ClientRegistryRecord[] }
    return payload.clients ?? []
  } catch {
    return []
  }
}
