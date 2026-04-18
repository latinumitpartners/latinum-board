#!/usr/bin/env python3
"""
Lightweight API server for the Latinum Board to fetch recent commits and session snapshots.
Runs on the operator host (10.0.0.92).
"""

import json
import subprocess
from datetime import datetime
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

WORKSPACE_REPO = Path('/home/ubuntu/.openclaw/workspace')
SESSIONS_DIR = Path('/home/ubuntu/.openclaw/agents/main/sessions')
API_PORT = 9876
COMMIT_CACHE_FILE = WORKSPACE_REPO / '.latinum-board-commits.json'
SESSIONS_CACHE_FILE = WORKSPACE_REPO / '.latinum-board-sessions.json'
CACHE_TTL_SECONDS = 300


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
                        elif role == 'assistant' and text:
                            last_assistant = text

                minutes_ago = (datetime.utcnow().timestamp() - file_path.stat().st_mtime) / 60
                snapshots.append({
                    'sessionKey': session_id,
                    'title': clean_text(last_user, 80) or session_id,
                    'lastUpdated': datetime.utcfromtimestamp(file_path.stat().st_mtime).isoformat() + 'Z',
                    'cwd': cwd,
                    'model': model,
                    'thinking': thinking,
                    'lastUserText': clean_text(last_user),
                    'lastAssistantText': clean_text(last_assistant),
                    'messageCount': message_count,
                    'status': 'active' if minutes_ago < 30 else 'quiet',
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
    return payload


class RequestHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/api/commits/recent':
            commits = get_cached(COMMIT_CACHE_FILE, get_recent_commits, 'commits')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(commits).encode())
        elif self.path == '/api/sessions/recent':
            sessions = get_cached(SESSIONS_CACHE_FILE, get_session_snapshots, 'sessions')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(sessions).encode())
        elif self.path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"status":"ok"}')
        else:
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
    print(f'Endpoints: /api/commits/recent, /api/sessions/recent, /health')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nShutdown.')


if __name__ == '__main__':
    main()
