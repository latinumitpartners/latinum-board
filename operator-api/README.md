# Latinum Board Operator API

Lightweight HTTP API for serving recent commits to the Latinum Board app.

## Quick Start

```bash
cd operator-api
python3 server.py
```

Server runs on port 9876 and listens at:
- `GET /api/commits/recent` – returns recent commits from the workspace
- `GET /health` – health check

## Systemd Service (Optional)

To run as a daemon:

```bash
sudo cp latinum-board-operator-api.service /etc/systemd/system/
sudo systemctl enable latinum-board-operator-api
sudo systemctl start latinum-board-operator-api
sudo systemctl status latinum-board-operator-api
```

## Configuration

Environment variables:
- `LATINUM_BOARD_REPO` – path to workspace repo (default: `/home/ubuntu/.openclaw/workspace`)
- `LATINUM_BOARD_API_PORT` – API port (default: 9876)
- `LATINUM_BOARD_COMMIT_LIMIT` – max commits to return (default: 25)

## Notes

- Caches commits for 5 minutes to reduce git workload
- CORS enabled for all origins (internal use)
- Tolerates missing repo or git errors gracefully
