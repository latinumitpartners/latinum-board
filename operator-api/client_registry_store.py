from __future__ import annotations

import sqlite3
from typing import Any

from crm_store import get_db_connection, utc_now
from webhook_store import get_webhook_config


CLIENT_REGISTRY_STATUSES = {'active', 'paused', 'suspended', 'decommissioned'}


def ensure_client_registry_schema(conn: sqlite3.Connection) -> None:
    conn.execute(
        '''
        CREATE TABLE IF NOT EXISTS client_registry (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id TEXT NOT NULL UNIQUE,
            client_name TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'active',
            environment TEXT NOT NULL DEFAULT 'test',
            bot_id TEXT,
            crm_type TEXT,
            crm_integration_id INTEGER,
            webhook_url TEXT,
            webhook_secret_label TEXT,
            webhook_secret_version INTEGER,
            webhook_enabled INTEGER NOT NULL DEFAULT 0,
            webhook_event_version TEXT,
            notes TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            last_webhook_success_at TEXT,
            last_webhook_failure_at TEXT,
            last_webhook_error TEXT,
            FOREIGN KEY(crm_integration_id) REFERENCES crm_integrations(id)
        )
        '''
    )


def get_client_registry_connection() -> sqlite3.Connection:
    conn = get_db_connection()
    ensure_client_registry_schema(conn)
    return conn


def normalize_client_record(row: sqlite3.Row | None) -> dict[str, Any] | None:
    if not row:
        return None
    data = dict(row)
    data['webhook_enabled'] = bool(data.get('webhook_enabled'))
    webhook_config = get_webhook_config(data['client_id'])
    if webhook_config:
      data['webhook_url'] = webhook_config.get('webhook_url')
      data['webhook_secret_label'] = webhook_config.get('webhook_secret_label')
      data['webhook_secret_version'] = webhook_config.get('webhook_secret_version')
      data['webhook_enabled'] = webhook_config.get('webhook_enabled', data['webhook_enabled'])
      data['webhook_event_version'] = webhook_config.get('webhook_event_version')
    return data


def list_clients() -> list[dict[str, Any]]:
    conn = get_client_registry_connection()
    rows = conn.execute(
        '''
        SELECT * FROM client_registry
        ORDER BY updated_at DESC, client_name ASC
        '''
    ).fetchall()
    conn.close()
    return [normalize_client_record(row) for row in rows if row]


def get_client(client_id: str) -> dict[str, Any] | None:
    conn = get_client_registry_connection()
    row = conn.execute(
        'SELECT * FROM client_registry WHERE client_id = ?',
        (client_id,),
    ).fetchone()
    conn.close()
    return normalize_client_record(row)


def create_client(payload: dict[str, Any]) -> dict[str, Any]:
    client_id = str(payload.get('client_id', '')).strip()
    client_name = str(payload.get('client_name', '')).strip()
    if not client_id or not client_name:
        raise ValueError('client_id and client_name are required')

    status = str(payload.get('status', 'active')).strip().lower() or 'active'
    if status not in CLIENT_REGISTRY_STATUSES:
        raise ValueError(f'invalid status: {status}')

    environment = str(payload.get('environment', 'test')).strip() or 'test'
    webhook_enabled = 1 if bool(payload.get('webhook_enabled', False)) else 0

    conn = get_client_registry_connection()
    with conn:
        conn.execute(
            '''
            INSERT INTO client_registry (
                client_id, client_name, status, environment, bot_id, crm_type, crm_integration_id,
                webhook_url, webhook_secret_label, webhook_secret_version, webhook_enabled,
                webhook_event_version, notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''',
            (
                client_id,
                client_name,
                status,
                environment,
                payload.get('bot_id'),
                payload.get('crm_type'),
                payload.get('crm_integration_id'),
                payload.get('webhook_url'),
                payload.get('webhook_secret_label'),
                payload.get('webhook_secret_version'),
                webhook_enabled,
                payload.get('webhook_event_version'),
                payload.get('notes'),
                utc_now(),
                utc_now(),
            ),
        )
        row = conn.execute('SELECT * FROM client_registry WHERE client_id = ?', (client_id,)).fetchone()
    conn.close()
    record = normalize_client_record(row)
    if record is None:
        raise RuntimeError('failed to create client record')
    return record


def update_client(payload: dict[str, Any]) -> dict[str, Any] | None:
    client_id = str(payload.get('client_id', '')).strip()
    if not client_id:
        raise ValueError('client_id is required')

    current = get_client(client_id)
    if not current:
        return None

    status = str(payload.get('status', current['status'])).strip().lower() or current['status']
    if status not in CLIENT_REGISTRY_STATUSES:
        raise ValueError(f'invalid status: {status}')

    webhook_enabled = payload.get('webhook_enabled', current['webhook_enabled'])
    webhook_enabled_int = 1 if bool(webhook_enabled) else 0

    conn = get_client_registry_connection()
    with conn:
        conn.execute(
            '''
            UPDATE client_registry
            SET client_name = ?, status = ?, environment = ?, bot_id = ?, crm_type = ?, crm_integration_id = ?,
                webhook_url = ?, webhook_secret_label = ?, webhook_secret_version = ?, webhook_enabled = ?,
                webhook_event_version = ?, notes = ?, updated_at = ?
            WHERE client_id = ?
            ''',
            (
                payload.get('client_name', current['client_name']),
                status,
                payload.get('environment', current['environment']),
                payload.get('bot_id', current.get('bot_id')),
                payload.get('crm_type', current.get('crm_type')),
                payload.get('crm_integration_id', current.get('crm_integration_id')),
                payload.get('webhook_url', current.get('webhook_url')),
                payload.get('webhook_secret_label', current.get('webhook_secret_label')),
                payload.get('webhook_secret_version', current.get('webhook_secret_version')),
                webhook_enabled_int,
                payload.get('webhook_event_version', current.get('webhook_event_version')),
                payload.get('notes', current.get('notes')),
                utc_now(),
                client_id,
            ),
        )
        row = conn.execute('SELECT * FROM client_registry WHERE client_id = ?', (client_id,)).fetchone()
    conn.close()
    return normalize_client_record(row)


def update_client_status(client_id: str, status: str) -> dict[str, Any] | None:
    next_status = status.strip().lower()
    if next_status not in CLIENT_REGISTRY_STATUSES:
        raise ValueError(f'invalid status: {status}')

    conn = get_client_registry_connection()
    with conn:
        conn.execute(
            'UPDATE client_registry SET status = ?, updated_at = ? WHERE client_id = ?',
            (next_status, utc_now(), client_id),
        )
        row = conn.execute('SELECT * FROM client_registry WHERE client_id = ?', (client_id,)).fetchone()
    conn.close()
    return normalize_client_record(row)
