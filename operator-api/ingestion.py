#!/usr/bin/env python3

import json
import subprocess
from datetime import datetime
from pathlib import Path

WORKSPACE_REPO = Path('/home/ubuntu/.openclaw/workspace')
SESSIONS_DIR = Path('/home/ubuntu/.openclaw/agents/main/sessions')
COMMIT_CACHE_FILE = WORKSPACE_REPO / '.latinum-board-commits.json'
SESSIONS_CACHE_FILE = WORKSPACE_REPO / '.latinum-board-sessions.json'
APP_DATA_DIR = WORKSPACE_REPO / 'product/latinum-board/data'
APP_SESSIONS_MIRROR_FILE = APP_DATA_DIR / 'sessions.json'
APP_COMMITS_MIRROR_FILE = APP_DATA_DIR / 'commits.json'
CACHE_TTL_SECONDS = 300


def build_ingestion_envelope(kind, items, source='operator-api'):
    return {
        'schemaVersion': '2026-04-18.v1',
        'generatedAt': datetime.utcnow().isoformat() + 'Z',
        'source': source,
        'kind': kind,
        'items': items,
    }


def write_mirror_file(path, kind, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(build_ingestion_envelope(kind, payload), indent=2) + '\n')


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
    skip_exact = {'NO_REPLY', 'HEARTBEAT_OK'}
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
    last_assistant_lower = (last_assistant or '').lower()
    waiting_markers = [
        'waiting on', 'waiting for', 'needs your decision', 'needs your input',
        'if you want, i can', 'if you want i can', 'if you want, i’ll', 'if you want i’ll',
        'if you want, i will', 'if you want i will', 'let me know',
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
        return f"Session in {cwd.split('/')[-1]}"
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
            write_mirror_file(APP_SESSIONS_MIRROR_FILE, 'sessions', payload)
        except Exception as e:
            print(f'Error writing mirrored sessions file: {e}')
    if key == 'commits':
        try:
            write_mirror_file(APP_COMMITS_MIRROR_FILE, 'commits', payload)
        except Exception as e:
            print(f'Error writing mirrored commits file: {e}')
    return payload
