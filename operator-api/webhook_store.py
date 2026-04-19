from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import sqlite3
from typing import Any

from crm_store import get_db_connection, utc_now

WEBHOOK_SECRET_ENV = 'LATINUM_WEBHOOK_SECRET_KEY'
WEBHOOK_SECRET_ALLOW_PLAINTEXT_FALLBACK_ENV = 'LATINUM_WEBHOOK_ALLOW_PLAINTEXT_FALLBACK'


def get_webhook_secret_key() -> bytes:
    env_value = os.environ.get(WEBHOOK_SECRET_ENV, '').strip()
    if env_value:
        try:
            return base64.b64decode(env_value.encode())
        except Exception as exc:
            raise RuntimeError(f'{WEBHOOK_SECRET_ENV} must be valid base64') from exc

    allow_plaintext_fallback = os.environ.get(WEBHOOK_SECRET_ALLOW_PLAINTEXT_FALLBACK_ENV, '').strip().lower() in {'1', 'true', 'yes'}
    if allow_plaintext_fallback:
        raise RuntimeError('Plaintext webhook fallback has been disabled. Set a real LATINUM_WEBHOOK_SECRET_KEY.')

    raise RuntimeError(
        f'Missing webhook secret key. Set {WEBHOOK_SECRET_ENV}. Development fallback is no longer allowed.'
    )


def _keystream(key: bytes, nonce: bytes, length: int) -> bytes:
    stream = bytearray()
    counter = 0
    while len(stream) < length:
        block = hashlib.sha256(key + nonce + counter.to_bytes(4, 'big')).digest()
        stream.extend(block)
        counter += 1
    return bytes(stream[:length])


def _xor_bytes(data: bytes, key_stream: bytes) -> bytes:
    return bytes(byte ^ key_stream[index] for index, byte in enumerate(data))


def encrypt_webhook_secret(secret: str) -> str:
    plaintext = json.dumps({'secret': secret}, separators=(',', ':')).encode()
    key = hashlib.sha256(get_webhook_secret_key()).digest()
    nonce = os.urandom(16)
    keystream = _keystream(key, nonce, len(plaintext))
    ciphertext = _xor_bytes(plaintext, keystream)
    mac = hmac.new(key, nonce + ciphertext, hashlib.sha256).digest()
    return 'encv2:' + base64.b64encode(nonce + mac + ciphertext).decode()


def decrypt_webhook_secret(payload: str) -> str:
    if payload.startswith('encv2:'):
        key = hashlib.sha256(get_webhook_secret_key()).digest()
        blob = base64.b64decode(payload[6:].encode())
        nonce = blob[:16]
        mac = blob[16:48]
        ciphertext = blob[48:]
        expected = hmac.new(key, nonce + ciphertext, hashlib.sha256).digest()
        if not hmac.compare_digest(mac, expected):
            raise ValueError('Webhook secret integrity check failed')
        keystream = _keystream(key, nonce, len(ciphertext))
        plaintext = _xor_bytes(ciphertext, keystream)
        return str(json.loads(plaintext.decode()).get('secret', ''))
    if payload.startswith('enc:'):
        key = hashlib.sha256(get_webhook_secret_key()).digest()
        encrypted = base64.b64decode(payload[4:].encode())
        legacy_stream = bytes(key[index % len(key)] for index in range(len(encrypted)))
        plaintext = _xor_bytes(encrypted, legacy_stream)
        return str(json.loads(plaintext.decode()).get('secret', ''))
    return str(json.loads(payload).get('secret', ''))


def ensure_webhook_schema(conn: sqlite3.Connection) -> None:
    conn.execute(
        '''
        CREATE TABLE IF NOT EXISTS webhook_configs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id TEXT NOT NULL UNIQUE,
            webhook_url TEXT,
            webhook_enabled INTEGER NOT NULL DEFAULT 0,
            webhook_secret_label TEXT,
            webhook_secret_encrypted TEXT,
            webhook_secret_version INTEGER,
            webhook_event_version TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(client_id) REFERENCES client_registry(client_id)
        )
        '''
    )
    conn.execute(
        '''
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
        )
        '''
    )

    columns = {row['name'] for row in conn.execute('PRAGMA table_info(webhook_configs)').fetchall()}
    if 'webhook_secret_encrypted' not in columns:
        conn.execute('ALTER TABLE webhook_configs ADD COLUMN webhook_secret_encrypted TEXT')


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
    data.pop('webhook_secret_encrypted', None)
    return data


def upsert_webhook_config(payload: dict[str, Any]) -> dict[str, Any]:
    client_id = str(payload.get('client_id', '')).strip()
    if not client_id:
        raise ValueError('client_id is required')

    encrypted_secret = encrypt_webhook_secret(str(payload.get('webhook_secret'))) if payload.get('webhook_secret') else None

    conn = get_webhook_connection()
    with conn:
        existing = conn.execute('SELECT id FROM webhook_configs WHERE client_id = ?', (client_id,)).fetchone()
        if existing:
            conn.execute(
                '''
                UPDATE webhook_configs
                SET webhook_url = ?, webhook_enabled = ?, webhook_secret_label = ?, webhook_secret_encrypted = COALESCE(?, webhook_secret_encrypted), webhook_secret_version = ?,
                    webhook_event_version = ?, updated_at = ?
                WHERE client_id = ?
                ''',
                (
                    payload.get('webhook_url'),
                    1 if bool(payload.get('webhook_enabled', False)) else 0,
                    payload.get('webhook_secret_label'),
                    encrypted_secret,
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
                    webhook_secret_encrypted, webhook_secret_version, webhook_event_version, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''',
                (
                    client_id,
                    payload.get('webhook_url'),
                    1 if bool(payload.get('webhook_enabled', False)) else 0,
                    payload.get('webhook_secret_label'),
                    encrypted_secret,
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
    data.pop('webhook_secret_encrypted', None)
    return data


def rotate_webhook_secret(payload: dict[str, Any]) -> dict[str, Any]:
    client_id = str(payload.get('client_id', '')).strip()
    if not client_id:
        raise ValueError('client_id is required')

    current = get_webhook_config(client_id)
    if not current:
        raise ValueError('webhook config not found')

    current_version = int(current.get('webhook_secret_version') or 0)
    next_payload = {
        'client_id': client_id,
        'webhook_url': payload.get('webhook_url', current.get('webhook_url')),
        'webhook_enabled': payload.get('webhook_enabled', current.get('webhook_enabled')),
        'webhook_secret_label': payload.get('webhook_secret_label', current.get('webhook_secret_label')),
        'webhook_secret': payload.get('webhook_secret'),
        'webhook_secret_version': current_version + 1,
        'webhook_event_version': payload.get('webhook_event_version', current.get('webhook_event_version')),
    }
    return upsert_webhook_config(next_payload)


def write_webhook_delivery_log(payload: dict[str, Any]) -> dict[str, Any]:
    client_id = str(payload.get('client_id', '')).strip()
    event_type = str(payload.get('event_type', '')).strip()
    delivery_status = str(payload.get('delivery_status', '')).strip()
    if not client_id or not event_type or not delivery_status:
        raise ValueError('client_id, event_type, and delivery_status are required')

    conn = get_webhook_connection()
    with conn:
        conn.execute(
            '''
            INSERT INTO webhook_delivery_log (
                client_id, event_type, event_version, delivery_status,
                response_code, error_message, delivered_at, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''',
            (
                client_id,
                event_type,
                payload.get('event_version'),
                delivery_status,
                payload.get('response_code'),
                payload.get('error_message'),
                payload.get('delivered_at'),
                utc_now(),
            ),
        )
        if delivery_status == 'success':
            conn.execute(
                '''
                UPDATE client_registry
                SET last_webhook_success_at = ?, last_webhook_error = NULL, updated_at = ?
                WHERE client_id = ?
                ''',
                (payload.get('delivered_at') or utc_now(), utc_now(), client_id),
            )
        else:
            conn.execute(
                '''
                UPDATE client_registry
                SET last_webhook_failure_at = ?, last_webhook_error = ?, updated_at = ?
                WHERE client_id = ?
                ''',
                (payload.get('delivered_at') or utc_now(), payload.get('error_message'), utc_now(), client_id),
            )
        row = conn.execute('SELECT * FROM webhook_delivery_log WHERE id = last_insert_rowid()').fetchone()
    conn.close()
    if not row:
        raise RuntimeError('failed to write delivery log')
    return dict(row)
