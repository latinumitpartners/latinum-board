#!/usr/bin/env python3
"""
Lightweight API server for the Latinum Board to fetch recent commits and session snapshots.
Runs on the operator host (10.0.0.92).
"""

import json
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import urlparse

from crm_api import CRM_GET_PATHS, CRM_POST_PATHS, handle_crm_get, handle_crm_post
from ingestion import COMMIT_CACHE_FILE, SESSIONS_CACHE_FILE, get_cached, get_recent_commits, get_session_snapshots

WORKSPACE_REPO = Path('/home/ubuntu/.openclaw/workspace')
API_PORT = 9876


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
        elif parsed.path in CRM_GET_PATHS:
            result = handle_crm_get(parsed.path, parsed.query)
            if result is None:
                return self._send_json({'success': False, 'message': 'Unhandled CRM route'}, 404)
            payload, status = result
            self._send_json(payload, status)
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

        if parsed.path in CRM_POST_PATHS:
            result = handle_crm_post(parsed.path, payload)
            if result is None:
                return self._send_json({'success': False, 'message': 'Unhandled CRM route'}, 404)
            response_body, status = result
            return self._send_json(response_body, status)

        self.send_response(404)
        self.end_headers()

    def log_message(self, format, *args):
        print(f'[{self.log_date_time_string()}] {format % args}')


def main():
    server = HTTPServer(('0.0.0.0', API_PORT), RequestHandler)
    print(f'Latinum Board operator API listening on :{API_PORT}')
    print(f'Workspace repo: {WORKSPACE_REPO}')
    print('Endpoints: /api/commits/recent, /api/sessions/recent, /api/crm/*, /health')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nShutdown.')


if __name__ == '__main__':
    main()
