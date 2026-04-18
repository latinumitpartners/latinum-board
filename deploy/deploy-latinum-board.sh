#!/bin/bash
set -euo pipefail

APP_NAME="latinum-board"
APP_DIR="/var/www/${APP_NAME}"
APP_PORT="3010"
REMOTE_HOST="${1:-ubuntu@10.1.0.47}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

info() { echo -e "\033[0;34m[·]\033[0m $1"; }
log()  { echo -e "\033[0;32m[✓]\033[0m $1"; }
warn() { echo -e "\033[1;33m[!]\033[0m $1"; }

info "Deploying ${APP_NAME} to ${REMOTE_HOST}:${APP_DIR}"

ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$REMOTE_HOST" "sudo mkdir -p ${APP_DIR} && sudo chown -R ubuntu:ubuntu ${APP_DIR}"

rsync -av --delete \
  --exclude='.git' \
  --exclude='.next' \
  --exclude='node_modules' \
  --exclude='deploy' \
  -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
  "${ROOT_DIR}/" "${REMOTE_HOST}:${APP_DIR}/"

info "Installing dependencies and building app"
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$REMOTE_HOST" "cd ${APP_DIR} && npm install && npm run build"

info "Installing systemd service"
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no \
  "${SCRIPT_DIR}/latinum-board.service" "${REMOTE_HOST}:/tmp/latinum-board.service"

ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$REMOTE_HOST" "sudo mv /tmp/latinum-board.service /etc/systemd/system/latinum-board.service && sudo systemctl daemon-reload && sudo systemctl enable latinum-board && sudo systemctl restart latinum-board"

info "Verifying local app health"
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$REMOTE_HOST" "curl -I http://127.0.0.1:${APP_PORT} || true"

warn "If UFW is enabled on the app host, allow gateway access with:"
echo "  sudo ufw allow from 10.0.0.88 to any port ${APP_PORT} proto tcp"

echo ""
log "Deployment complete"
echo ""
echo "Next steps on gateway VPS:"
echo "  1. Copy deploy/nginx-kevin-todo.latinum.ca.conf to /etc/nginx/sites-available/kevin-todo.latinum.ca"
echo "  2. Create basic auth: sudo htpasswd -c /etc/nginx/.htpasswd-kevin-todo kevin"
echo "  3. Enable site: sudo ln -sf /etc/nginx/sites-available/kevin-todo.latinum.ca /etc/nginx/sites-enabled/"
echo "  4. Reload nginx: sudo nginx -t && sudo systemctl reload nginx"
echo "  5. Issue cert: sudo certbot --nginx -d kevin-todo.latinum.ca -m latinumITpartners@gmail.com --agree-tos --non-interactive"
