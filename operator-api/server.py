#!/usr/bin/env python3
"""
Lightweight API server for the Latinum Board to fetch recent commits and session snapshots.
Runs on the operator host (10.0.0.92).
"""

import json
import sqlite3
import subprocess
from datetime import datetime
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from crm_manager import CRMManager
from hubspot_handler import HubSpotHandler
from salesforce_handler import SalesforceHandler

WORKSPACE_REPO = Path('/home/ubuntu/.openclaw/workspace')
SESSIONS_DIR = Path('/home/ubuntu/.openclaw/agents/main/sessions')
API_PORT = 9876
COMMIT_CACHE_FILE = WORKSPACE_REPO / '.latinum-board-commits.json'
SESSIONS_CACHE_FILE = WORKSPACE_REPO / '.latinum-board-sessions.json'
APP_SESSIONS_MIRROR_FILE = WORKSPACE_REPO / 'product/latinum-board/data/sessions.json'
CRM_DB_FILE = WORKSPACE_REPO / 'product/latinum-board/operator-api/data/crm.db'
CACHE_TTL_SECONDS = 300

CRM_MANAGER = CRMManager()
CRM_MANAGER.register_handler('hubspot', HubSpotHandler)
CRM_MANAGER.register_handler('salesforce', SalesforceHandler)


def get_db_connection():
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


def upsert_crm_integration(bot_id, crm_type, credentials):
    conn = get_db_connection()
    with conn:
        conn.execute(
            '''
            INSERT INTO crm_integrations (bot_id, crm_type, credentials, last_sync)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(bot_id, crm_type)
            DO UPDATE SET credentials=excluded.credentials, last_sync=excluded.last_sync
            ''',
            (bot_id, crm_type, json.dumps(credentials), datetime.utcnow().isoformat() + 'Z'),
        )
    row = conn.execute(
        'SELECT id, bot_id, crm_type, created_at, last_sync FROM crm_integrations WHERE bot_id = ? AND crm_type = ?',
        (bot_id, crm_type),
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def get_crm_integration(bot_id, crm_type):
    conn = get_db_connection()
    row = conn.execute(
        'SELECT * FROM crm_integrations WHERE bot_id = ? AND crm_type = ?',
        (bot_id, crm_type),
    ).fetchone()
    conn.close()
    if not row:
        return None
    data = dict(row)
    data['credentials'] = json.loads(data['credentials'])
    return data


def log_crm_sync(integration_id, action, status, external_id=None, error_message=None):
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


def mask_credentials(credentials):
    masked = {}
    for key, value in credentials.items():
        value_str = str(value)
        masked[key] = ('••••••' + value_str[-4:]) if value_str else ''
    return masked


def get_recent_commits(limit=25):
    if not WORKSPACE_REPO.exists():
        return []

    try:
        result = subprocess.run(
            ['git', '-C', str(WORKSPACE_REPO), 'log', '--date=short', '--pretty=format:%h%n%s%n%ad%n---', '-n', str(limit)],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode != 0:
            return []

        commits = []
        lines = result.stdout.strip().split('\n')
        i = 0
        while i < len(lines):
            if i + 2 < len(lines):
                hash_val = lines[i].strip()
                message = lines[i + 1].strip()
                date = lines[i + 2].strip()
                if hash_val and message and date and date != '---':
                    commits.append({'hash': hash_val, 'message': message, 'date': date})
                i += 4
            else:
                i += 1
        return commits
    except Exception as e:
        print(f'Error fetching commits: {e}')
        return []


def clean_text(value, max_len=180):
    if not value:
        return None
    compact = ' '.join(value.split())
    return compact[:max_len] + '…' if len(compact) > max_len else compact


def extract_meaningful_text(text):
    if not text:
        return None

    compact = ' '.join(text.split())

    wrappers = [
        '[Queued messages while agent was busy] --- Queued #1',
        '[Queued messages while agent was busy]',
        'Note: The previous agent run was aborted by the user. Resume carefully or ask for clarification.',
        'An async command you ran earlier has completed. The result is shown in the system messages above. Please relay the command output to the user in a helpful way.',
    ]
    for wrapper in wrappers:
        compact = compact.replace(wrapper, '').strip()

    skip_prefixes = [
        'Conversation info (untrusted metadata):',
        'Sender (untrusted metadata):',
        'System (untrusted):',
    ]
    skip_exact = {
        'NO_REPLY',
        'HEARTBEAT_OK',
    }
    skip_contains = [
        'Pre-compaction memory flush.',
        'Treat workspace bootstrap/reference files',
        'Read HEARTBEAT.md if it exists',
        'A new session was started via /new or /reset',
        'Current time:',
        'An async command you ran earlier has completed.',
        'Conversation info (untrusted metadata):',
        'Sender (untrusted metadata):',
    ]

    if compact in skip_exact:
        return None
    if any(compact.startswith(prefix) for prefix in skip_prefixes):
        return None
    if any(marker in compact for marker in skip_contains):
        return None
    if compact.startswith('[cron:'):
        return None

    if compact.startswith('[[reply_to_current]]'):
        compact = compact.replace('[[reply_to_current]]', '', 1).strip()

    if compact.startswith('```json') or compact.startswith('```'):
        return None

    return compact or None


def summarize_text(text, max_len=96):
    cleaned = extract_meaningful_text(text) or clean_text(text, max_len)
    return clean_text(cleaned, max_len) if cleaned else None


def classify_session(minutes_ago, last_user, last_assistant):
    last_user_lower = (last_user or '').lower()
    last_assistant_lower = (last_assistant or '').lower()

    waiting_markers = [
        'waiting on',
        'waiting for',
        'needs your decision',
        'needs your input',
        'if you want, i can',
        'if you want i can',
        'if you want, i’ll',
        'if you want i’ll',
        'if you want, i will',
        'if you want i will',
        'let me know',
    ]

    if any(marker in last_assistant_lower for marker in waiting_markers):
        return 'waiting'
    if minutes_ago < 45:
        return 'active'
    if minutes_ago > 240:
        return 'stalled'
    if 'done.' in last_assistant_lower or 'completed' in last_assistant_lower:
        return 'quiet'
    return 'quiet'


def pick_session_title(session_id, last_user, last_assistant, cwd):
    candidate = extract_meaningful_text(last_user) or extract_meaningful_text(last_assistant)
    if candidate:
        return clean_text(candidate, 80)
    if cwd:
        return f'Session in {cwd.split('/')[-1]}'
    return session_id


def build_operational_summary(status, last_user, last_assistant):
    if status == 'waiting':
        return summarize_text(last_assistant or last_user, 120) or 'Waiting on user input'
    if status == 'stalled':
        return summarize_text(last_user or last_assistant, 120) or 'Session appears stalled'
    if status == 'active':
        return summarize_text(last_assistant or last_user, 120) or 'Session active'
    return summarize_text(last_assistant or last_user, 120) or 'Quiet session'


def get_session_snapshots(limit=20):
    if not SESSIONS_DIR.exists():
        return []

    try:
        files = sorted([p for p in SESSIONS_DIR.glob('*.jsonl') if '.checkpoint.' not in p.name], key=lambda p: p.stat().st_mtime, reverse=True)[:80]
        snapshots = []

        for file_path in files:
            try:
                lines = file_path.read_text().splitlines()
                session_id = file_path.stem
                cwd = None
                model = None
                thinking = None
                last_user = None
                last_assistant = None
                meaningful_user = None
                meaningful_assistant = None
                message_count = 0

                for line in lines:
                    if not line.strip():
                        continue
                    try:
                        record = json.loads(line)
                    except Exception:
                        continue

                    if record.get('type') == 'session':
                        cwd = record.get('cwd')
                        session_id = record.get('id', session_id)
                    elif record.get('type') == 'model_change':
                        model = record.get('modelId')
                    elif record.get('type') == 'thinking_level_change':
                        thinking = record.get('thinkingLevel')
                    elif record.get('type') == 'message':
                        message_count += 1
                        role = record.get('message', {}).get('role')
                        content = record.get('message', {}).get('content', [])
                        text_parts = [part.get('text', '') for part in content if part.get('type') == 'text']
                        text = ' '.join(text_parts).strip()
                        if role == 'user' and text:
                            last_user = text
                            maybe_user = extract_meaningful_text(text)
                            if maybe_user:
                                meaningful_user = maybe_user
                        elif role == 'assistant' and text:
                            last_assistant = text
                            maybe_assistant = extract_meaningful_text(text)
                            if maybe_assistant:
                                meaningful_assistant = maybe_assistant

                minutes_ago = (datetime.utcnow().timestamp() - file_path.stat().st_mtime) / 60
                status = classify_session(minutes_ago, meaningful_user, meaningful_assistant)
                snapshots.append({
                    'sessionKey': session_id,
                    'title': pick_session_title(session_id, meaningful_user, meaningful_assistant, cwd),
                    'lastUpdated': datetime.utcfromtimestamp(file_path.stat().st_mtime).isoformat() + 'Z',
                    'cwd': cwd,
                    'model': model,
                    'thinking': thinking,
                    'lastUserText': clean_text(meaningful_user or last_user),
                    'lastAssistantText': clean_text(meaningful_assistant or last_assistant),
                    'messageCount': message_count,
                    'status': status,
                    'summary': build_operational_summary(status, meaningful_user or last_user, meaningful_assistant or last_assistant),
                })
            except Exception as e:
                print(f'Error parsing session file {file_path}: {e}')
                continue

        return snapshots[:limit]
    except Exception as e:
        print(f'Error reading sessions: {e}')
        return []


def get_cached(cache_file, producer, key):
    if cache_file.exists():
        try:
            data = json.loads(cache_file.read_text())
            cache_time = datetime.fromisoformat(data['timestamp'])
            age = (datetime.utcnow() - cache_time).total_seconds()
            if age < CACHE_TTL_SECONDS:
                return data[key]
        except Exception as e:
            print(f'Cache error for {cache_file}: {e}')

    payload = producer()
    cache_file.write_text(json.dumps({'timestamp': datetime.utcnow().isoformat(), key: payload}, indent=2) + '\n')
    if key == 'sessions':
        try:
            APP_SESSIONS_MIRROR_FILE.parent.mkdir(parents=True, exist_ok=True)
            APP_SESSIONS_MIRROR_FILE.write_text(json.dumps(payload, indent=2) + '\n')
        except Exception as e:
            print(f'Error writing mirrored sessions file: {e}')
    return payload


class RequestHandler(BaseHTTPRequestHandler):
    def _send_json(self, payload, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode())

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == '/api/commits/recent':
            commits = get_cached(COMMIT_CACHE_FILE, get_recent_commits, 'commits')
            self._send_json(commits)
        elif parsed.path == '/api/sessions/recent':
            sessions = get_cached(SESSIONS_CACHE_FILE, get_session_snapshots, 'sessions')
            self._send_json(sessions)
        elif parsed.path == '/api/crm/supported':
            payload = {'crms': CRM_MANAGER.list_supported_crms()}
            self._send_json(payload)
        elif parsed.path == '/api/crm/validate':
            params = parse_qs(parsed.query)
            crm_type = (params.get('crm_type') or [''])[0]
            credentials_raw = (params.get('credentials') or ['{}'])[0]
            try:
                credentials = json.loads(credentials_raw)
            except json.JSONDecodeError:
                return self._send_json({'success': False, 'message': 'Invalid credentials JSON'}, 400)
            ok, message = CRM_MANAGER.validate_credentials(crm_type, credentials)
            self._send_json({'success': ok, 'message': message, 'crm_type': crm_type}, 200 if ok else 400)
        elif parsed.path == '/api/crm/config':
            params = parse_qs(parsed.query)
            crm_type = (params.get('crm_type') or [''])[0]
            bot_id = (params.get('bot_id') or [''])[0]
            record = get_crm_integration(bot_id, crm_type)
            if not record:
                return self._send_json({'success': False, 'message': 'CRM integration not found'}, 404)
            record['credentials'] = mask_credentials(record['credentials'])
            self._send_json({'success': True, 'integration': record})
        elif parsed.path in ('/api/crm/contacts/get', '/api/crm/contacts/list'):
            params = parse_qs(parsed.query)
            crm_type = (params.get('crm_type') or [''])[0]
            bot_id = (params.get('bot_id') or [''])[0]
            record = get_crm_integration(bot_id, crm_type)
            if not record:
                return self._send_json({'success': False, 'message': 'CRM integration not found'}, 404)
            handler = CRM_MANAGER.get_handler(crm_type, record['credentials'])
            if parsed.path == '/api/crm/contacts/get':
                contact_id = (params.get('contact_id') or [''])[0]
                result = handler.get_contact(contact_id)
                log_crm_sync(record['id'], 'get_contact', 'success' if result.get('success') else 'error', contact_id, None if result.get('success') else result.get('message'))
                return self._send_json(result, 200 if result.get('success') else 400)
            limit = int((params.get('limit') or ['10'])[0])
            result = {'success': True, 'contacts': handler.list_contacts(limit=limit)}
            log_crm_sync(record['id'], 'list_contacts', 'success')
            return self._send_json(result)
        elif parsed.path == '/health':
            self._send_json({'status': 'ok'})
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        parsed = urlparse(self.path)
        content_length = int(self.headers.get('Content-Length', '0'))
        body = self.rfile.read(content_length) if content_length > 0 else b'{}'
        try:
            payload = json.loads(body.decode())
        except json.JSONDecodeError:
            return self._send_json({'success': False, 'message': 'Invalid JSON body'}, 400)

        if parsed.path == '/api/crm/setup':
            crm_type = str(payload.get('crm_type', '')).strip().lower()
            bot_id = str(payload.get('bot_id', '')).strip()
            credentials = payload.get('credentials', {})
            if not bot_id or not crm_type or not isinstance(credentials, dict):
                return self._send_json({'success': False, 'message': 'bot_id, crm_type and credentials are required'}, 400)

            ok, message = CRM_MANAGER.validate_credentials(crm_type, credentials)
            if not ok:
                return self._send_json({'success': False, 'message': message, 'crm_type': crm_type}, 400)
            record = upsert_crm_integration(bot_id, crm_type, credentials)
            return self._send_json({'success': True, 'message': 'CRM integration saved', 'integration': record})

        if parsed.path in ('/api/crm/contacts', '/api/crm/deals', '/api/crm/activities', '/api/crm/contacts/update', '/api/crm/deals/update'):
            bot_id = str(payload.get('bot_id', '')).strip()
            crm_type = str(payload.get('crm_type', '')).strip().lower()
            data = payload.get('data', {})
            if not bot_id or not crm_type or not isinstance(data, dict):
                return self._send_json({'success': False, 'message': 'bot_id, crm_type and data are required'}, 400)
            record = get_crm_integration(bot_id, crm_type)
            if not record:
                return self._send_json({'success': False, 'message': 'CRM integration not configured'}, 404)
            try:
                handler = CRM_MANAGER.get_handler(crm_type, record['credentials'])
                if parsed.path == '/api/crm/contacts':
                    result = handler.add_contact(data)
                    action = 'add_contact'
                elif parsed.path == '/api/crm/deals':
                    result = handler.create_deal(data)
                    action = 'create_deal'
                elif parsed.path == '/api/crm/activities':
                    result = handler.log_activity(data)
                    action = 'log_activity'
                elif parsed.path == '/api/crm/contacts/update':
                    contact_id = str(payload.get('contact_id', '')).strip()
                    result = handler.update_contact(contact_id, data)
                    action = 'update_contact'
                else:
                    deal_id = str(payload.get('deal_id', '')).strip()
                    result = handler.update_deal(deal_id, data)
                    action = 'update_deal'
                log_crm_sync(
                    record['id'],
                    action,
                    'success' if result.get('success') else 'error',
                    result.get('id') or result.get('external_id'),
                    None if result.get('success') else result.get('message'),
                )
                return self._send_json(result, 200 if result.get('success') else 400)
            except Exception as exc:
                log_crm_sync(record['id'], 'exception', 'error', None, str(exc))
                return self._send_json({'success': False, 'message': str(exc)}, 400)

        self.send_response(404)
        self.end_headers()

    def log_message(self, format, *args):
        print(f'[{self.log_date_time_string()}] {format % args}')


def main():
    server = HTTPServer(('0.0.0.0', API_PORT), RequestHandler)
    print(f'Latinum Board operator API listening on :{API_PORT}')
    print(f'Workspace repo: {WORKSPACE_REPO}')
    print(f'Sessions dir: {SESSIONS_DIR}')
    print(f'Cache TTL: {CACHE_TTL_SECONDS}s')
    print(f'Endpoints: /api/commits/recent, /api/sessions/recent, /api/crm/supported, /api/crm/validate, /api/crm/config, /api/crm/setup, /api/crm/contacts, /api/crm/contacts/get, /api/crm/contacts/list, /api/crm/contacts/update, /api/crm/deals, /api/crm/deals/update, /api/crm/activities, /health')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nShutdown.')


if __name__ == '__main__':
    main()
