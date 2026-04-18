from __future__ import annotations

import base64
import hashlib
import json
import secrets
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any

WORKSPACE_REPO = Path('/home/ubuntu/.openclaw/workspace')
CRM_DB_FILE = WORKSPACE_REPO / 'product/latinum-board/operator-api/data/crm.db'
CRM_SECRET_FILE = WORKSPACE_REPO / 'product/latinum-board/operator-api/data/crm-secret.key'


def get_db_connection() -> sqlite3.Connection:
    CRM_DB_FILE.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(CRM_DB_FILE)
    conn.row_factory = sqlite3.Row
    conn.execute(
        '''
        CREATE TABLE IF NOT EXISTS crm_integrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bot_id TEXT NOT NULL,
            crm_type TEXT NOT NULL,
            credentials TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            last_sync TEXT,
            UNIQUE(bot_id, crm_type)
        )
        '''
    )
    conn.execute(
        '''
        CREATE TABLE IF NOT EXISTS crm_sync_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            integration_id INTEGER NOT NULL,
            action TEXT NOT NULL,
            external_id TEXT,
            status TEXT NOT NULL,
            error_message TEXT,
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(integration_id) REFERENCES crm_integrations(id)
        )
        '''
    )
    return conn


def get_or_create_secret_key() -> bytes:
    CRM_SECRET_FILE.parent.mkdir(parents=True, exist_ok=True)
    if CRM_SECRET_FILE.exists():
        return base64.b64decode(CRM_SECRET_FILE.read_text().strip().encode())
    key = secrets.token_bytes(32)
    CRM_SECRET_FILE.write_text(base64.b64encode(key).decode())
    return key


def _xor_bytes(data: bytes, key: bytes) -> bytes:
    return bytes(byte ^ key[index % len(key)] for index, byte in enumerate(data))


def encrypt_credentials(credentials: dict[str, Any]) -> str:
    plaintext = json.dumps(credentials).encode()
    key = get_or_create_secret_key()
    encrypted = _xor_bytes(plaintext, hashlib.sha256(key).digest())
    return 'enc:' + base64.b64encode(encrypted).decode()


def decrypt_credentials(payload: str) -> dict[str, Any]:
    if payload.startswith('enc:'):
        key = get_or_create_secret_key()
        encrypted = base64.b64decode(payload[4:].encode())
        decrypted = _xor_bytes(encrypted, hashlib.sha256(key).digest())
        return json.loads(decrypted.decode())
    return json.loads(payload)


def upsert_crm_integration(bot_id: str, crm_type: str, credentials: dict[str, Any]) -> dict[str, Any] | None:
    conn = get_db_connection()
    with conn:
        conn.execute(
            '''
            INSERT INTO crm_integrations (bot_id, crm_type, credentials, last_sync)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(bot_id, crm_type)
            DO UPDATE SET credentials=excluded.credentials, last_sync=excluded.last_sync
            ''',
            (bot_id, crm_type, encrypt_credentials(credentials), datetime.utcnow().isoformat() + 'Z'),
        )
    row = conn.execute(
        'SELECT id, bot_id, crm_type, created_at, last_sync FROM crm_integrations WHERE bot_id = ? AND crm_type = ?',
        (bot_id, crm_type),
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def get_crm_integration(bot_id: str, crm_type: str) -> dict[str, Any] | None:
    conn = get_db_connection()
    row = conn.execute(
        'SELECT * FROM crm_integrations WHERE bot_id = ? AND crm_type = ?',
        (bot_id, crm_type),
    ).fetchone()
    conn.close()
    if not row:
        return None
    data = dict(row)
    data['credentials'] = decrypt_credentials(data['credentials'])
    return data


def log_crm_sync(integration_id: int, action: str, status: str, external_id: str | None = None, error_message: str | None = None) -> None:
    conn = get_db_connection()
    with conn:
        conn.execute(
            '''
            INSERT INTO crm_sync_log (integration_id, action, external_id, status, error_message, timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
            ''',
            (integration_id, action, external_id, status, error_message, datetime.utcnow().isoformat() + 'Z'),
        )
    conn.close()


def mask_credentials(credentials: dict[str, Any]) -> dict[str, str]:
    masked: dict[str, str] = {}
    for key, value in credentials.items():
        value_str = str(value)
        masked[key] = ('••••••' + value_str[-4:]) if value_str else ''
    return masked
