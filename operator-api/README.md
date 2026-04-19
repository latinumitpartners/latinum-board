# Latinum Board Operator API

Lightweight HTTP API for serving recent commits, sessions, CRM state, and client registry data to the Latinum Board app.

## Quick Start

```bash
cd operator-api
python3 server.py
```

Server runs on port 9876 and listens at:
- `GET /api/commits/recent` – returns recent commits from the workspace
- `GET /api/sessions/recent` – returns recent session snapshots
- `GET /api/clients` – lists client registry records
- `GET /api/client?client_id=...` – returns one client registry record
- `POST /api/clients` – creates a client registry record
- `POST /api/clients/update` – updates a client registry record
- `POST /api/clients/status` – updates client lifecycle status
- `GET /health` – health check

## Systemd Service (Optional)

To run as a daemon:

```bash
sudo mkdir -p /etc/latinum-board
sudo cp latinum-board-operator-api.env.example /etc/latinum-board/operator-api.env
sudo cp latinum-board-operator-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable latinum-board-operator-api
sudo systemctl start latinum-board-operator-api
sudo systemctl status latinum-board-operator-api
```

The systemd unit now reads:
- `/etc/latinum-board/operator-api.env`

Populate that env file with the real `LATINUM_CRM_SECRET_KEY` before starting in steady state.

## Configuration

Environment variables:
- `LATINUM_BOARD_REPO` – path to workspace repo (default: `/home/ubuntu/.openclaw/workspace`)
- `LATINUM_BOARD_API_PORT` – API port (default: 9876)
- `LATINUM_BOARD_COMMIT_LIMIT` – max commits to return (default: 25)
- `LATINUM_CRM_SECRET_KEY` – base64-encoded sealing key for CRM credential storage, preferred formal secret source
- `LATINUM_CRM_ALLOW_LOCAL_SECRET_FALLBACK` – optional legacy fallback (`true`/`1`) to allow reading the old local `data/crm-secret.key`

### CRM secret handling

The CRM API now prefers an injected env-backed secret key via `LATINUM_CRM_SECRET_KEY`.
This keeps the API contract unchanged while moving secret handling away from local generated key files.

Recommended mode:
- set `LATINUM_CRM_SECRET_KEY` in the systemd service environment or another approved secret injector
- keep `LATINUM_CRM_ALLOW_LOCAL_SECRET_FALLBACK` unset in steady state

Migration mode:
- temporarily set `LATINUM_CRM_ALLOW_LOCAL_SECRET_FALLBACK=true` if old locally sealed rows still need to be read before resealing under the env-backed key

### Clean migration sequence

1. Put the new env-backed key into `/etc/latinum-board/operator-api.env` as `LATINUM_CRM_SECRET_KEY`
2. Temporarily set `LATINUM_CRM_ALLOW_LOCAL_SECRET_FALLBACK=true`
3. Restart the operator API service
4. Call `GET /api/crm/reseal`
5. Verify CRM integrations still load correctly
6. Set `LATINUM_CRM_ALLOW_LOCAL_SECRET_FALLBACK=false`
7. Restart the operator API service again

## Notes

- Caches commits and sessions for 5 minutes to reduce workload
- CORS enabled for all origins (internal use)
- Includes CRM integration APIs and Phase 1 client registry APIs
- Tolerates missing repo or git errors gracefully
