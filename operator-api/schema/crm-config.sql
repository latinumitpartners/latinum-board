CREATE TABLE IF NOT EXISTS crm_integrations (
  id SERIAL PRIMARY KEY,
  bot_id TEXT NOT NULL,
  crm_type TEXT NOT NULL,
  credentials JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_sync TIMESTAMP,
  UNIQUE(bot_id, crm_type)
);

CREATE TABLE IF NOT EXISTS crm_sync_log (
  id SERIAL PRIMARY KEY,
  integration_id INT NOT NULL REFERENCES crm_integrations(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  external_id TEXT,
  status TEXT NOT NULL,
  error_message TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);
