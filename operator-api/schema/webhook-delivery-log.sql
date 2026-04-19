CREATE TABLE IF NOT EXISTS webhook_delivery_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_version TEXT,
  delivery_status TEXT NOT NULL,
  response_code INTEGER,
  error_message TEXT,
  delivered_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(client_id) REFERENCES client_registry(client_id)
);
