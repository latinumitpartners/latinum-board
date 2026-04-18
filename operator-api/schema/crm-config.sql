CREATE TABLE IF NOT EXISTS crm_integrations (
  id SERIAL PRIMARY KEY,
  bot_id TEXT NOT NULL,
  crm_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  credential_label TEXT,
  credential_version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_validated_at TIMESTAMP,
  last_sync TIMESTAMP,
  UNIQUE(bot_id, crm_type)
);

CREATE TABLE IF NOT EXISTS crm_integration_secrets (
  id SERIAL PRIMARY KEY,
  integration_id INT NOT NULL REFERENCES crm_integrations(id) ON DELETE CASCADE,
  version INT NOT NULL,
  credentials_encrypted TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sealed_at TIMESTAMP DEFAULT NOW(),
  rotated_at TIMESTAMP,
  UNIQUE(integration_id, version)
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
