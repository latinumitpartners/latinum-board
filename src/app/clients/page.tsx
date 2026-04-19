import { AppShell } from '@/components/board/layout/AppShell'
import { readClientRegistry } from '@/lib/server/client-registry'

export default async function ClientsPage() {
  const clients = await readClientRegistry()

  return (
    <AppShell title="Clients">
      <div className="space-y-6">
        <div>
          <p className="text-sm text-slate-400">Phase 1 client registry debug surface</p>
          <h1 className="text-2xl font-semibold text-white">Client Registry</h1>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
          <table className="min-w-full divide-y divide-slate-800 text-sm">
            <thead className="bg-slate-950/60 text-left text-slate-400">
              <tr>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Env</th>
                <th className="px-4 py-3">Bot</th>
                <th className="px-4 py-3">CRM</th>
                <th className="px-4 py-3">Webhook</th>
                <th className="px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {clients.map((client) => (
                <tr key={client.client_id}>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-white">{client.client_name}</p>
                      <p className="text-xs text-slate-500">{client.client_id}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">{client.status}</td>
                  <td className="px-4 py-3">{client.environment}</td>
                  <td className="px-4 py-3">{client.bot_id || '—'}</td>
                  <td className="px-4 py-3">{client.crm_type || '—'}</td>
                  <td className="px-4 py-3">{client.webhook_enabled ? 'enabled' : 'disabled'}</td>
                  <td className="px-4 py-3">{client.updated_at}</td>
                </tr>
              ))}
              {clients.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                    No client registry records yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  )
}
