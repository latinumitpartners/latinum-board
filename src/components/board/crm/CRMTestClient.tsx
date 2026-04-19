'use client'

import { FormEvent, useMemo, useState } from 'react'

const API_BASE = '/operator-api'

type JsonValue = Record<string, unknown> | unknown[] | string | number | boolean | null

type ResultCardProps = {
  title: string
  value: JsonValue
}

function renderValue(value: JsonValue): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (value === null) return 'null'
  return JSON.stringify(value, null, 2)
}

function ResultCard({ title, value }: ResultCardProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{title}</p>
      <pre className="mt-3 overflow-auto whitespace-pre-wrap break-words text-xs text-zinc-200">{renderValue(value)}</pre>
    </div>
  )
}

async function getJson(url: string) {
  const response = await fetch(url, { cache: 'no-store' })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error((data as { message?: string }).message || `Request failed (${response.status})`)
  }
  return data
}

async function postJson(url: string, payload: Record<string, unknown>) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error((data as { message?: string }).message || `Request failed (${response.status})`)
  }
  return data
}

function CRMIntegrationSetupPanel({
  supportedCrms,
  botId,
  setBotId,
  crmType,
  setCrmType,
  privateAppToken,
  setPrivateAppToken,
  credentialLabel,
  setCredentialLabel,
  busy,
  setBusy,
  setError,
  setSetupResult,
  setQueryResult,
  refreshIntegrationStatus,
}: {
  supportedCrms: string[]
  botId: string
  setBotId: (value: string) => void
  crmType: string
  setCrmType: (value: string) => void
  privateAppToken: string
  setPrivateAppToken: (value: string) => void
  credentialLabel: string
  setCredentialLabel: (value: string) => void
  busy: string | null
  setBusy: (value: string | null) => void
  setError: (value: string | null) => void
  setSetupResult: (value: JsonValue | null) => void
  setQueryResult: (value: JsonValue | null) => void
  refreshIntegrationStatus: () => Promise<JsonValue>
}) {
  async function onSetup(e: FormEvent) {
    e.preventDefault()
    setBusy('setup')
    setError(null)
    try {
      const result = await postJson(`${API_BASE}/api/crm/setup`, {
        bot_id: botId,
        crm_type: crmType,
        credential_label: credentialLabel,
        credentials: { private_app_token: privateAppToken },
      })
      setSetupResult(result)
      setQueryResult(result)
      await refreshIntegrationStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed')
    } finally {
      setBusy(null)
    }
  }

  async function onRotate() {
    setBusy('rotate')
    setError(null)
    try {
      const result = await postJson(`${API_BASE}/api/crm/rotate`, {
        bot_id: botId,
        crm_type: crmType,
        credential_label: credentialLabel,
        credentials: { private_app_token: privateAppToken },
      })
      setSetupResult(result)
      setQueryResult(result)
      await refreshIntegrationStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rotation failed')
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
      <h2 className="text-lg font-semibold">Integration setup</h2>
      <p className="mt-2 text-sm text-zinc-400">Internal diagnostics surface for configuring and rotating CRM credentials.</p>
      <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={onSetup}>
        <label className="space-y-2 text-sm">
          <span className="text-zinc-300">Bot ID</span>
          <input className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2" value={botId} onChange={(e) => setBotId(e.target.value)} />
        </label>
        <label className="space-y-2 text-sm">
          <span className="text-zinc-300">CRM type</span>
          <select className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2" value={crmType} onChange={(e) => setCrmType(e.target.value)}>
            {supportedCrms.map((crm) => <option key={crm} value={crm}>{crm}</option>)}
          </select>
        </label>
        <label className="space-y-2 text-sm">
          <span className="text-zinc-300">Credential label</span>
          <input className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2" value={credentialLabel} onChange={(e) => setCredentialLabel(e.target.value)} placeholder="Primary token" />
        </label>
        <label className="space-y-2 text-sm md:col-span-2">
          <span className="text-zinc-300">HubSpot private app token</span>
          <input className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2" value={privateAppToken} onChange={(e) => setPrivateAppToken(e.target.value)} placeholder="pat-..." />
        </label>
        <div className="flex flex-wrap gap-3 md:col-span-2">
          <button className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-cyan-400 disabled:opacity-50" disabled={busy === 'setup'} type="submit">
            {busy === 'setup' ? 'Saving…' : 'Save CRM integration'}
          </button>
          <button className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-300 hover:bg-amber-500/20 disabled:opacity-50" disabled={busy === 'rotate'} onClick={onRotate} type="button">
            {busy === 'rotate' ? 'Rotating…' : 'Rotate credentials'}
          </button>
          <button className="rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-900" onClick={() => refreshIntegrationStatus()} type="button">
            Refresh status
          </button>
        </div>
      </form>
    </section>
  )
}

function CRMIntegrationStatusPanel({ integrationStatus }: { integrationStatus: JsonValue | null }) {
  if (!integrationStatus || typeof integrationStatus !== 'object' || Array.isArray(integrationStatus)) return null

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
      <h2 className="text-lg font-semibold">Integration status</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Object.entries(integrationStatus).map(([key, value]) => (
          <ResultCard key={key} title={key} value={value as JsonValue} />
        ))}
      </div>
    </section>
  )
}

function CRMCrudSmokeTestPanel({
  botId,
  crmType,
  run,
}: {
  botId: string
  crmType: string
  run: (label: string, fn: () => Promise<JsonValue>) => Promise<JsonValue>
}) {
  const [contactName, setContactName] = useState('James Wong')
  const [contactEmail, setContactEmail] = useState('james@latinum.ca')
  const [contactPhone, setContactPhone] = useState('555-1234')
  const [contactCompany, setContactCompany] = useState('Latinum IT Partners')
  const [contactId, setContactId] = useState('')

  const [dealTitle, setDealTitle] = useState('Acme Corp Opportunity')
  const [dealAmount, setDealAmount] = useState('50000')
  const [dealStage, setDealStage] = useState('appointmentscheduled')
  const [dealId, setDealId] = useState('')

  const [activityText, setActivityText] = useState('Follow-up call completed with prospect')

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
        <h2 className="text-lg font-semibold">Contacts smoke test</h2>
        <div className="mt-4 space-y-3">
          <input className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Name" />
          <input className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="Email" />
          <input className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="Phone" />
          <input className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" value={contactCompany} onChange={(e) => setContactCompany(e.target.value)} placeholder="Company" />
          <input className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" value={contactId} onChange={(e) => setContactId(e.target.value)} placeholder="Contact ID for get/update" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <button className="rounded bg-zinc-800 px-3 py-2" onClick={() => run('contact-create', () => postJson(`${API_BASE}/api/crm/contacts`, { bot_id: botId, crm_type: crmType, data: { name: contactName, email: contactEmail, phone: contactPhone, company: contactCompany } }))}>Create</button>
          <button className="rounded bg-zinc-800 px-3 py-2" onClick={() => run('contact-update', () => postJson(`${API_BASE}/api/crm/contacts/update`, { bot_id: botId, crm_type: crmType, contact_id: contactId, data: { name: contactName, email: contactEmail, phone: contactPhone, company: contactCompany } }))}>Update</button>
          <button className="rounded bg-zinc-800 px-3 py-2" onClick={() => run('contact-get', () => getJson(`${API_BASE}/api/crm/contacts/get?bot_id=${encodeURIComponent(botId)}&crm_type=${encodeURIComponent(crmType)}&contact_id=${encodeURIComponent(contactId)}`))}>Get</button>
          <button className="rounded bg-zinc-800 px-3 py-2" onClick={() => run('contact-list', () => getJson(`${API_BASE}/api/crm/contacts/list?bot_id=${encodeURIComponent(botId)}&crm_type=${encodeURIComponent(crmType)}&limit=10`))}>List</button>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
        <h2 className="text-lg font-semibold">Deals smoke test</h2>
        <div className="mt-4 space-y-3">
          <input className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" value={dealTitle} onChange={(e) => setDealTitle(e.target.value)} placeholder="Deal title" />
          <input className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" value={dealAmount} onChange={(e) => setDealAmount(e.target.value)} placeholder="Amount" />
          <input className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" value={dealStage} onChange={(e) => setDealStage(e.target.value)} placeholder="Deal stage" />
          <input className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" value={dealId} onChange={(e) => setDealId(e.target.value)} placeholder="Deal ID for get/update" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <button className="rounded bg-zinc-800 px-3 py-2" onClick={() => run('deal-create', () => postJson(`${API_BASE}/api/crm/deals`, { bot_id: botId, crm_type: crmType, data: { title: dealTitle, amount: dealAmount, stage: dealStage } }))}>Create</button>
          <button className="rounded bg-zinc-800 px-3 py-2" onClick={() => run('deal-update', () => postJson(`${API_BASE}/api/crm/deals/update`, { bot_id: botId, crm_type: crmType, deal_id: dealId, data: { title: dealTitle, amount: dealAmount, stage: dealStage } }))}>Update</button>
          <button className="rounded bg-zinc-800 px-3 py-2" onClick={() => run('deal-get', () => getJson(`${API_BASE}/api/crm/deals/get?bot_id=${encodeURIComponent(botId)}&crm_type=${encodeURIComponent(crmType)}&deal_id=${encodeURIComponent(dealId)}`))}>Get</button>
          <button className="rounded bg-zinc-800 px-3 py-2" onClick={() => run('deal-list', () => getJson(`${API_BASE}/api/crm/deals/list?bot_id=${encodeURIComponent(botId)}&crm_type=${encodeURIComponent(crmType)}&limit=10`))}>List</button>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
        <h2 className="text-lg font-semibold">Activities smoke test</h2>
        <div className="mt-4 space-y-3">
          <textarea className="min-h-32 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" value={activityText} onChange={(e) => setActivityText(e.target.value)} placeholder="Activity / note text" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <button className="rounded bg-zinc-800 px-3 py-2" onClick={() => run('activity-create', () => postJson(`${API_BASE}/api/crm/activities`, { bot_id: botId, crm_type: crmType, data: { description: activityText, timestamp: new Date().toISOString() } }))}>Log activity</button>
          <button className="rounded bg-zinc-800 px-3 py-2" onClick={() => run('activity-list', () => getJson(`${API_BASE}/api/crm/activities/list?bot_id=${encodeURIComponent(botId)}&crm_type=${encodeURIComponent(crmType)}&limit=10`))}>List activities</button>
        </div>
      </section>
    </div>
  )
}

export function CRMTestClient({ supportedCrms }: { supportedCrms: string[] }) {
  const [botId, setBotId] = useState('sales-bot')
  const [crmType, setCrmType] = useState('hubspot')
  const [privateAppToken, setPrivateAppToken] = useState('')
  const [credentialLabel, setCredentialLabel] = useState('Primary token')
  const [setupResult, setSetupResult] = useState<JsonValue | null>(null)
  const [queryResult, setQueryResult] = useState<JsonValue | null>(null)
  const [integrationStatus, setIntegrationStatus] = useState<JsonValue | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const setupCards = useMemo(() => {
    if (!setupResult || typeof setupResult !== 'object' || Array.isArray(setupResult)) return []
    return Object.entries(setupResult)
  }, [setupResult])

  const queryCards = useMemo(() => {
    if (!queryResult || typeof queryResult !== 'object' || Array.isArray(queryResult)) return []
    return Object.entries(queryResult)
  }, [queryResult])

  async function run(label: string, fn: () => Promise<JsonValue>) {
    setBusy(label)
    setError(null)
    try {
      const result = await fn()
      setQueryResult(result)
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      throw err
    } finally {
      setBusy(null)
    }
  }

  async function refreshIntegrationStatus() {
    const result = await getJson(`${API_BASE}/api/crm/status?bot_id=${encodeURIComponent(botId)}&crm_type=${encodeURIComponent(crmType)}`)
    setIntegrationStatus(result)
    return result
  }

  return (
    <div className="space-y-6">
      <CRMIntegrationSetupPanel
        supportedCrms={supportedCrms}
        botId={botId}
        setBotId={setBotId}
        crmType={crmType}
        setCrmType={setCrmType}
        privateAppToken={privateAppToken}
        setPrivateAppToken={setPrivateAppToken}
        credentialLabel={credentialLabel}
        setCredentialLabel={setCredentialLabel}
        busy={busy}
        setBusy={setBusy}
        setError={setError}
        setSetupResult={setSetupResult}
        setQueryResult={setQueryResult}
        refreshIntegrationStatus={refreshIntegrationStatus}
      />

      {setupCards.length > 0 && (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
          <h2 className="text-lg font-semibold">Setup result</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {setupCards.map(([key, value]) => (
              <ResultCard key={key} title={key} value={value as JsonValue} />
            ))}
          </div>
        </section>
      )}

      <CRMIntegrationStatusPanel integrationStatus={integrationStatus} />
      <CRMCrudSmokeTestPanel botId={botId} crmType={crmType} run={run} />

      {(error || queryCards.length > 0) && (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
          <h2 className="text-lg font-semibold">Diagnostics result</h2>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          {queryCards.length > 0 && (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {queryCards.map(([key, value]) => (
                <ResultCard key={key} title={key} value={value as JsonValue} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
