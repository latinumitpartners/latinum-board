import { CRMTestClient } from '@/components/board/crm/CRMTestClient'
import { getCrmApiBase } from '@/lib/server/crm-api-base'

async function fetchSupportedCrms() {
  const base = await getCrmApiBase()
  const response = await fetch(`${base}/api/crm/supported`, { cache: 'no-store' })
  if (!response.ok) {
    return []
  }
  const data = await response.json()
  return data.crms ?? []
}

export default async function CRMTestPage() {
  const crms = await fetchSupportedCrms()

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-100">
      <div className="mx-auto max-w-6xl space-y-8">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">Internal diagnostics</p>
          <h1 className="mt-2 text-3xl font-semibold">CRM Diagnostics Surface</h1>
          <p className="mt-3 max-w-3xl text-sm text-zinc-400">
            Internal operator-only diagnostics for validating CRM setup, status, and CRUD smoke tests through the board's proxied operator API path.
          </p>
        </div>

        <CRMTestClient supportedCrms={crms} />
      </div>
    </main>
  )
}
