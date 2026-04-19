from __future__ import annotations

import sqlite3
from typing import Any

from crm_store import get_db_connection, utc_now


def ensure_webhook_schema(conn: sqlite3.Connection) -> None:
    conn.execute(
        '''
        CREATE TABLE IF NOT EXISTS webhook_configs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id TEXT NOT NULL UNIQUE,
            webhook_url TEXT,
            webhook_enabled INTEGER NOT NULL DEFAULT 0,
            webhook_secret_label TEXT,
            webhook_secret_version INTEGER,
            webhook_event_version TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(client_id) REFERENCES client_registry(client_id)
        )
        '''
    )


def get_webhook_connection() -> sqlite3.Connection:
    conn = get_db_connection()
    ensure_webhook_schema(conn)
    return conn


def get_webhook_config(client_id: str) -> dict[str, Any] | None:
    conn = get_webhook_connection()
    row = conn.execute('SELECT * FROM webhook_configs WHERE client_id = ?', (client_id,)).fetchone()
    conn.close()
    if not row:
        return None
    data = dict(row)
    data['webhook_enabled'] = bool(data.get('webhook_enabled'))
    return data


def upsert_webhook_config(payload: dict[str, Any]) -> dict[str, Any]:
    client_id = str(payload.get('client_id', '')).strip()
    if not client_id:
        raise ValueError('client_id is required')

    conn = get_webhook_connection()
    with conn:
        existing = conn.execute('SELECT id FROM webhook_configs WHERE client_id = ?', (client_id,)).fetchone()
        if existing:
            conn.execute(
                '''
                UPDATE webhook_configs
                SET webhook_url = ?, webhook_enabled = ?, webhook_secret_label = ?, webhook_secret_version = ?,
                    webhook_event_version = ?, updated_at = ?
                WHERE client_id = ?
                ''',
                (
                    payload.get('webhook_url'),
                    1 if bool(payload.get('webhook_enabled', False)) else 0,
                    payload.get('webhook_secret_label'),
                    payload.get('webhook_secret_version'),
                    payload.get('webhook_event_version'),
                    utc_now(),
                    client_id,
                ),
            )
        else:
            conn.execute(
                '''
                INSERT INTO webhook_configs (
                    client_id, webhook_url, webhook_enabled, webhook_secret_label,
                    webhook_secret_version, webhook_event_version, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''',
                (
                    client_id,
                    payload.get('webhook_url'),
                    1 if bool(payload.get('webhook_enabled', False)) else 0,
                    payload.get('webhook_secret_label'),
                    payload.get('webhook_secret_version'),
                    payload.get('webhook_event_version'),
                    utc_now(),
                    utc_now(),
                ),
            )
        row = conn.execute('SELECT * FROM webhook_configs WHERE client_id = ?', (client_id,)).fetchone()
    conn.close()
    if not row:
        raise RuntimeError('failed to save webhook config')
    data = dict(row)
    data['webhook_enabled'] = bool(data.get('webhook_enabled'))
    return data
