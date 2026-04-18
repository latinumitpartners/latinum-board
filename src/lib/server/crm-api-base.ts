const DEFAULT_CRM_API_BASE = 'http://10.0.0.92:9876'

export function getCrmApiBase(): string {
  return process.env.LATINUM_BOARD_OPERATOR_API_BASE || DEFAULT_CRM_API_BASE
}
