#!/bin/bash
set -euo pipefail

APP_HOST="${APP_HOST:-ubuntu@10.1.0.47}"
GATEWAY_HOST="${GATEWAY_HOST:-ubuntu@10.0.0.88}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOMAIN="kevin-todo.latinum.ca"
EXPECTED_DNS="51.79.26.26"
APP_PORT="3010"
APP_IP="10.1.0.47"
SKIP_DEPLOY=false
SKIP_GATEWAY=false
SKIP_CERTBOT=false
SMOKE_ONLY=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-deploy)
      SKIP_DEPLOY=true
      shift
      ;;
    --skip-gateway)
      SKIP_GATEWAY=true
      shift
      ;;
    --skip-certbot)
      SKIP_CERTBOT=true
      shift
      ;;
    --smoke-only)
      SMOKE_ONLY=true
      shift
      ;;
    *)
      echo "Unknown argument: $1"
      exit 1
      ;;
  esac
done

if [[ "$SMOKE_ONLY" == "true" ]]; then
  SKIP_DEPLOY=true
  SKIP_GATEWAY=true
  SKIP_CERTBOT=true
fi

info() { echo -e "\033[0;34m[·]\033[0m $1"; }
log()  { echo -e "\033[0;32m[✓]\033[0m $1"; }
warn() { echo -e "\033[1;33m[!]\033[0m $1"; }

check_code() {
  local actual="$1"
  local expected="$2"
  local label="$3"
  if [[ "$actual" == "$expected" ]]; then
    log "$label -> $actual"
  else
    warn "$label -> expected $expected, got ${actual:-none}"
  fi
}

if [[ "$SKIP_DEPLOY" == "true" ]]; then
  warn "Skipping app deploy by request"
else
  info "Step 1/4: Deploying app to ${APP_HOST}"
  bash "${SCRIPT_DIR}/deploy-latinum-board.sh" "$APP_HOST"
fi

if [[ "$SKIP_GATEWAY" == "true" ]]; then
  warn "Skipping gateway copy/setup by request"
else
  info "Step 2/4: Copying nginx config and gateway setup script to ${GATEWAY_HOST}"
  scp -i "$SSH_KEY" -o StrictHostKeyChecking=no \
    "${SCRIPT_DIR}/nginx-kevin-todo.latinum.ca.conf" \
    "${SCRIPT_DIR}/setup-kevin-todo-gateway.sh" \
    "${GATEWAY_HOST}:/tmp/"

  info "Step 3/4: Running gateway setup remotely"
  GATEWAY_CMD="sudo bash /tmp/setup-kevin-todo-gateway.sh /tmp/nginx-kevin-todo.latinum.ca.conf"
  if [[ "$SKIP_CERTBOT" == "true" ]]; then
    GATEWAY_CMD+=" --skip-certbot"
  fi
  ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$GATEWAY_HOST" "$GATEWAY_CMD"
fi

info "Step 4/4: Running smoke tests"
DNS_RESULT="$(dig +short "$DOMAIN" | tail -n 1 || true)"
if [[ "$DNS_RESULT" == "$EXPECTED_DNS" ]]; then
  log "DNS -> $DNS_RESULT"
else
  warn "DNS -> expected $EXPECTED_DNS, got ${DNS_RESULT:-none}"
fi

APP_LOCAL_CODE="$(ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$APP_HOST" "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:${APP_PORT}" || true)"
check_code "$APP_LOCAL_CODE" "200" "Dev app local health"

GATEWAY_APP_CODE="$(ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$GATEWAY_HOST" "curl -s -o /dev/null -w '%{http_code}' http://${APP_IP}:${APP_PORT}" || true)"
check_code "$GATEWAY_APP_CODE" "200" "Gateway to app reachability"

PUBLIC_CODE="$(curl -k -s -o /dev/null -w '%{http_code}' https://${DOMAIN} || true)"
check_code "$PUBLIC_CODE" "401" "Public unauthenticated response"

echo ""
log "kevin-todo.latinum.ca rollout finished"
echo ""
echo "Final verification commands:"
echo ""
echo "DNS check:"
echo "  dig +short ${DOMAIN}"
echo ""
echo "Public unauthenticated check (expect 401):"
echo "  curl -I https://${DOMAIN}"
echo ""
echo "Public authenticated check (expect 200):"
echo "  curl -u kevin:YOURPASSWORD -I https://${DOMAIN}"
echo ""
echo "Gateway to app check:"
echo "  ssh ${GATEWAY_HOST} 'curl -I http://${APP_IP}:${APP_PORT}'"
echo ""
echo "Dev app local check:"
echo "  ssh ${APP_HOST} 'curl -I http://127.0.0.1:${APP_PORT}'"
echo ""
warn "During gateway setup, you will still be prompted to create or confirm the basic auth password if needed."
