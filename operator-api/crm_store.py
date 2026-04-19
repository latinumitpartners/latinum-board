from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any

WORKSPACE_REPO = Path('/home/ubuntu/.openclaw/workspace')
CRM_DB_FILE = WORKSPACE_REPO / 'product/latinum-board/operator-api/data/crm.db'
CRM_SECRET_FILE = WORKSPACE_REPO / 'product/latinum-board/operator-api/data/crm-secret.key'
CRM_SECRET_ENV = 'LATINUM_CRM_SECRET_KEY'
CRM_ALLOW_LOCAL_SECRET_FALLBACK_ENV = 'LATINUM_CRM_ALLOW_LOCAL_SECRET_FALLBACK'


def utc_now() -> str:
    return datetime.utcnow().isoformat() + 'Z'


def get_secret_key() -> bytes:
    env_value = os.environ.get(CRM_SECRET_ENV, '').strip()
    if env_value:
        try:
            return base64.b64decode(env_value.encode())
        except Exception as exc:
            raise RuntimeError(f'{CRM_SECRET_ENV} must be valid base64') from exc

    allow_local_fallback = os.environ.get(CRM_ALLOW_LOCAL_SECRET_FALLBACK_ENV, '').strip().lower() in {'1', 'true', 'yes'}
    if allow_local_fallback and CRM_SECRET_FILE.exists():
        return base64.b64decode(CRM_SECRET_FILE.read_text().strip().encode())

    raise RuntimeError(
        f'Missing CRM secret key. Set {CRM_SECRET_ENV}, or set {CRM_ALLOW_LOCAL_SECRET_FALLBACK_ENV}=true to allow legacy local-file fallback.'
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


def encrypt_credentials(credentials: dict[str, Any]) -> str:
    plaintext = json.dumps(credentials, separators=(',', ':')).encode()
    key = hashlib.sha256(get_secret_key()).digest()
    nonce = os.urandom(16)
    keystream = _keystream(key, nonce, len(plaintext))
    ciphertext = _xor_bytes(plaintext, keystream)
    mac = hmac.new(key, nonce + ciphertext, hashlib.sha256).digest()
    return 'encv2:' + base64.b64encode(nonce + mac + ciphertext).decode()


def decrypt_credentials(payload: str) -> dict[str, Any]:
    if payload.startswith('encv2:'):
        key = hashlib.sha256(get_secret_key()).digest()
        blob = base64.b64decode(payload[6:].encode())
        nonce = blob[:16]
        mac = blob[16:48]
        ciphertext = blob[48:]
        expected = hmac.new(key, nonce + ciphertext, hashlib.sha256).digest()
        if not hmac.compare_digest(mac, expected):
            raise ValueError('Credential payload integrity check failed')
        keystream = _keystream(key, nonce, len(ciphertext))
        plaintext = _xor_bytes(ciphertext, keystream)
        return json.loads(plaintext.decode())
    if payload.startswith('enc:'):
        key = hashlib.sha256(get_secret_key()).digest()
        encrypted = base64.b64decode(payload[4:].encode())
        legacy_stream = bytes(key[index % len(key)] for index in range(len(encrypted)))
        decrypted = _xor_bytes(encrypted, legacy_stream)
        return json.loads(decrypted.decode())
    return json.loads(payload)


def ensure_schema(conn: sqlite3.Connection) -> None:
    conn.execute(
        '''
        CREATE TABLE IF NOT EXISTS crm_integrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bot_id TEXT NOT NULL,
            crm_type TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'active',
            credential_label TEXT,
            credential_version INTEGER NOT NULL DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            last_validated_at TEXT,
            last_sync TEXT,
            UNIQUE(bot_id, crm_type)
        )
        '''
    )
    conn.execute(
        '''
        CREATE TABLE IF NOT EXISTS crm_integration_secrets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            integration_id INTEGER NOT NULL,
            version INTEGER NOT NULL,
            credentials_encrypted TEXT NOT NULL,
            is_active INTEGER NOT NULL DEFAULT 1,
            sealed_at TEXT DEFAULT CURRENT_TIMESTAMP,
            rotated_at TEXT,
            FOREIGN KEY(integration_id) REFERENCES crm_integrations(id),
            UNIQUE(integration_id, version)
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

    columns = {row['name'] for row in conn.execute('PRAGMA table_info(crm_integrations)').fetchall()}
    if 'status' not in columns:
        conn.execute("ALTER TABLE crm_integrations ADD COLUMN status TEXT NOT NULL DEFAULT 'active'")
    if 'credential_label' not in columns:
        conn.execute('ALTER TABLE crm_integrations ADD COLUMN credential_label TEXT')
    if 'credential_version' not in columns:
        conn.execute('ALTER TABLE crm_integrations ADD COLUMN credential_version INTEGER NOT NULL DEFAULT 1')
    if 'updated_at' not in columns:
        conn.execute('ALTER TABLE crm_integrations ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP')
    if 'last_validated_at' not in columns:
        conn.execute('ALTER TABLE crm_integrations ADD COLUMN last_validated_at TEXT')

    legacy_columns = {row['name'] for row in conn.execute('PRAGMA table_info(crm_integrations)').fetchall()}
    if 'credentials' in legacy_columns:
        legacy_rows = conn.execute('SELECT id, credentials, credential_version FROM crm_integrations WHERE credentials IS NOT NULL').fetchall()
        for row in legacy_rows:
            existing = conn.execute(
                'SELECT id FROM crm_integration_secrets WHERE integration_id = ? AND version = ?',
                (row['id'], row['credential_version'] or 1),
            ).fetchone()
            if existing:
                continue
            conn.execute(
                '''
                INSERT INTO crm_integration_secrets (integration_id, version, credentials_encrypted, is_active, sealed_at)
                VALUES (?, ?, ?, 1, ?)
                ''',
                (row['id'], row['credential_version'] or 1, row['credentials'], utc_now()),
            )


def get_db_connection() -> sqlite3.Connection:
    CRM_DB_FILE.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(CRM_DB_FILE)
    conn.row_factory = sqlite3.Row
    ensure_schema(conn)
    return conn


def get_active_secret_row(conn: sqlite3.Connection, integration_id: int) -> sqlite3.Row | None:
    return conn.execute(
        '''
        SELECT * FROM crm_integration_secrets
        WHERE integration_id = ? AND is_active = 1
        ORDER BY version DESC
        LIMIT 1
        ''',
        (integration_id,),
    ).fetchone()


def rotate_integration_secret(conn: sqlite3.Connection, integration_id: int, credentials: dict[str, Any]) -> int:
    current = get_active_secret_row(conn, integration_id)
    next_version = 1 if not current else int(current['version']) + 1
    if current:
        conn.execute(
            'UPDATE crm_integration_secrets SET is_active = 0, rotated_at = ? WHERE id = ?',
            (utc_now(), current['id']),
        )
    conn.execute(
        '''
        INSERT INTO crm_integration_secrets (integration_id, version, credentials_encrypted, is_active, sealed_at)
        VALUES (?, ?, ?, 1, ?)
        ''',
        (integration_id, next_version, encrypt_credentials(credentials), utc_now()),
    )
    conn.execute(
        '''
        UPDATE crm_integrations
        SET credential_version = ?, updated_at = ?, last_validated_at = ?
        WHERE id = ?
        ''',
        (next_version, utc_now(), utc_now(), integration_id),
    )
    return next_version


def upsert_crm_integration(bot_id: str, crm_type: str, credentials: dict[str, Any], credential_label: str | None = None) -> dict[str, Any] | None:
    conn = get_db_connection()
    with conn:
        existing = conn.execute(
            'SELECT * FROM crm_integrations WHERE bot_id = ? AND crm_type = ?',
            (bot_id, crm_type),
        ).fetchone()
        if existing:
            integration_id = existing['id']
            conn.execute(
                '''
                UPDATE crm_integrations
                SET status = 'active', credential_label = COALESCE(?, credential_label), updated_at = ?, last_validated_at = ?
                WHERE id = ?
                ''',
                (credential_label, utc_now(), utc_now(), integration_id),
            )
        else:
            cursor = conn.execute(
                '''
                INSERT INTO crm_integrations (bot_id, crm_type, status, credential_label, credential_version, created_at, updated_at, last_validated_at, last_sync)
                VALUES (?, ?, 'active', ?, 1, ?, ?, ?, ?)
                ''',
                (bot_id, crm_type, credential_label, utc_now(), utc_now(), utc_now(), utc_now()),
            )
            integration_id = cursor.lastrowid
        version = rotate_integration_secret(conn, integration_id, credentials)
        row = conn.execute(
            '''
            SELECT id, bot_id, crm_type, status, credential_label, credential_version, created_at, updated_at, last_validated_at, last_sync
            FROM crm_integrations WHERE id = ?
            ''',
            (integration_id,),
        ).fetchone()
    conn.close()
    data = dict(row) if row else None
    if data:
        data['credential_version'] = version
    return data


def get_crm_integration(bot_id: str, crm_type: str) -> dict[str, Any] | None:
    conn = get_db_connection()
    row = conn.execute(
        '''
        SELECT id, bot_id, crm_type, status, credential_label, credential_version, created_at, updated_at, last_validated_at, last_sync
        FROM crm_integrations WHERE bot_id = ? AND crm_type = ?
        ''',
        (bot_id, crm_type),
    ).fetchone()
    if not row:
        conn.close()
        return None
    data = dict(row)
    secret_row = get_active_secret_row(conn, data['id'])
    conn.close()
    if not secret_row:
        return None
    data['credentials'] = decrypt_credentials(secret_row['credentials_encrypted'])
    return data


def get_crm_integration_status(bot_id: str, crm_type: str) -> dict[str, Any] | None:
    conn = get_db_connection()
    row = conn.execute(
        '''
        SELECT id, bot_id, crm_type, status, credential_label, credential_version, created_at, updated_at, last_validated_at, last_sync
        FROM crm_integrations WHERE bot_id = ? AND crm_type = ?
        ''',
        (bot_id, crm_type),
    ).fetchone()
    if not row:
        conn.close()
        return None
    active_secret = get_active_secret_row(conn, row['id'])
    secret_count = conn.execute(
        'SELECT COUNT(*) AS count FROM crm_integration_secrets WHERE integration_id = ?',
        (row['id'],),
    ).fetchone()['count']
    conn.close()
    data = dict(row)
    data['has_active_secret'] = bool(active_secret)
    data['active_secret_version'] = active_secret['version'] if active_secret else None
    data['active_secret_sealed_at'] = active_secret['sealed_at'] if active_secret else None
    data['secret_version_count'] = secret_count
    return data


def rotate_crm_credentials(bot_id: str, crm_type: str, credentials: dict[str, Any], credential_label: str | None = None) -> dict[str, Any] | None:
    conn = get_db_connection()
    with conn:
        integration = conn.execute(
            'SELECT * FROM crm_integrations WHERE bot_id = ? AND crm_type = ?',
            (bot_id, crm_type),
        ).fetchone()
        if not integration:
            conn.close()
            return None
        version = rotate_integration_secret(conn, integration['id'], credentials)
        conn.execute(
            '''
            UPDATE crm_integrations
            SET status = 'active', credential_label = COALESCE(?, credential_label), updated_at = ?, last_validated_at = ?
            WHERE id = ?
            ''',
            (credential_label, utc_now(), utc_now(), integration['id']),
        )
        row = conn.execute(
            '''
            SELECT id, bot_id, crm_type, status, credential_label, credential_version, created_at, updated_at, last_validated_at, last_sync
            FROM crm_integrations WHERE id = ?
            ''',
            (integration['id'],),
        ).fetchone()
    conn.close()
    data = dict(row) if row else None
    if data:
        data['credential_version'] = version
    return data


def reseal_all_credentials() -> int:
    conn = get_db_connection()
    resealed = 0
    with conn:
        rows = conn.execute('SELECT id FROM crm_integrations').fetchall()
        for row in rows:
            secret_row = get_active_secret_row(conn, row['id'])
            if not secret_row:
                continue
            credentials = decrypt_credentials(secret_row['credentials_encrypted'])
            rotate_integration_secret(conn, row['id'], credentials)
            resealed += 1
    conn.close()
    return resealed


def log_crm_sync(integration_id: int, action: str, status: str, external_id: str | None = None, error_message: str | None = None) -> None:
    conn = get_db_connection()
    with conn:
        conn.execute(
            '''
            INSERT INTO crm_sync_log (integration_id, action, external_id, status, error_message, timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
            ''',
            (integration_id, action, external_id, status, error_message, utc_now()),
        )
        conn.execute('UPDATE crm_integrations SET last_sync = ?, updated_at = ? WHERE id = ?', (utc_now(), utc_now(), integration_id))
    conn.close()


def mask_credentials(credentials: dict[str, Any]) -> dict[str, str]:
    masked: dict[str, str] = {}
    for key, value in credentials.items():
        value_str = str(value)
        masked[key] = ('••••••' + value_str[-4:]) if value_str else ''
    return masked
