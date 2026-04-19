export type ClientRegistryStatus = 'active' | 'paused' | 'suspended' | 'decommissioned'

export interface ClientRegistryRecord {
  id: number
  client_id: string
  client_name: string
  status: ClientRegistryStatus
  environment: string
  bot_id?: string | null
  crm_type?: string | null
  crm_integration_id?: number | null
  webhook_url?: string | null
  webhook_secret_label?: string | null
  webhook_secret_version?: number | null
  webhook_enabled: boolean
  webhook_event_version?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
  last_webhook_success_at?: string | null
  last_webhook_failure_at?: string | null
  last_webhook_error?: string | null
}
