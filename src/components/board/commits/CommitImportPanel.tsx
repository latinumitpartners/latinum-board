'use client'

import { useState } from 'react'

export function CommitImportPanel({ onImported }: { onImported: () => void }) {
  const [status, setStatus] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const runImport = async () => {
    setLoading(true)
    setStatus('')
    try {
      const response = await fetch('/api/commits/import', { method: 'POST' })
      if (!response.ok) throw new Error('Import failed')
      const payload = (await response.json()) as { added: number }
      setStatus(`Imported ${payload.added} new commit${payload.added === 1 ? '' : 's'}.`)
      onImported()
    } catch (error) {
      console.error(error)
      setStatus('Import failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Commit Auto-Import</h3>
          <p className="mt-1 text-xs text-slate-400">Pull recent commits from the workspace git history.</p>
        </div>
        <button
          className="rounded-xl bg-sky-500 px-3 py-2 text-sm font-semibold text-slate-950"
          onClick={runImport}
          disabled={loading}
        >
          {loading ? 'Importing...' : 'Import Recent'}
        </button>
      </div>
      {status ? <p className="mt-3 text-sm text-slate-300">{status}</p> : null}
    </div>
  )
}
