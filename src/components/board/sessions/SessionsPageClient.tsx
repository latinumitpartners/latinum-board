'use client'

import { useSearchParams } from 'next/navigation'
import { SessionsPanel } from '@/components/board/sessions/SessionsPanel'

export function SessionsPageClient() {
  const searchParams = useSearchParams()
  const status = searchParams.get('status') || undefined

  return <SessionsPanel initialStatusFilter={status} />
}
