#!/bin/bash
set -euo pipefail

DOMAIN="kevin-todo.latinum.ca"
SITE_NAME="kevin-todo.latinum.ca"
HTPASSWD_FILE="/etc/nginx/.htpasswd-kevin-todo"
NGINX_SRC="/tmp/kevin-todo.latinum.ca.conf"
NGINX_DEST="/etc/nginx/sites-available/${SITE_NAME}"
CERT_EMAIL="latinumITpartners@gmail.com"
UPSTREAM="10.1.0.47:3010"
SKIP_CERTBOT=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-certbot)
      SKIP_CERTBOT=true
      shift
      ;;
    *)
      NGINX_SRC="$1"
      shift
      ;;
  esac
done

info() { echo -e "\033[0;34m[·]\033[0m $1"; }
log()  { echo -e "\033[0;32m[✓]\033[0m $1"; }
warn() { echo -e "\033[1;33m[!]\033[0m $1"; }

if [[ $EUID -ne 0 ]]; then
  echo "Run as root or via sudo"
  exit 1
fi

if [[ ! -f "$NGINX_SRC" ]]; then
  echo "Missing nginx config: $NGINX_SRC"
  exit 1
fi

info "Installing dependencies"
apt-get update
apt-get install -y apache2-utils certbot python3-certbot-nginx

if [[ ! -f "$HTPASSWD_FILE" ]]; then
  warn "Creating basic auth file at $HTPASSWD_FILE"
  htpasswd -c "$HTPASSWD_FILE" kevin
else
  warn "Basic auth file already exists at $HTPASSWD_FILE"
  echo "To update password: sudo htpasswd $HTPASSWD_FILE kevin"
fi

info "Installing first-pass nginx site config"
mv "$NGINX_SRC" "$NGINX_DEST"
ln -sf "$NGINX_DEST" "/etc/nginx/sites-enabled/${SITE_NAME}"

info "Testing nginx"
nginx -t
systemctl reload nginx

if [[ "$SKIP_CERTBOT" == "true" ]]; then
  warn "Skipping certbot by request"
else
  info "Issuing or renewing certificate"
  certbot --nginx -d "$DOMAIN" -m "$CERT_EMAIL" --agree-tos --non-interactive
fi

info "Writing final HTTPS + auth site config"
cat > "$NGINX_DEST" <<EOF
server {
    listen 80;
    server_name ${DOMAIN};

    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name ${DOMAIN};

    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    auth_basic "Restricted";
    auth_basic_user_file ${HTPASSWD_FILE};

    location / {
        proxy_pass http://${UPSTREAM};
        proxy_http_version 1.1;

        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;

        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
        client_max_body_size 25M;
    }
}
EOF

info "Reloading nginx"
nginx -t
systemctl reload nginx

log "Gateway setup complete"
echo ""
echo "Verify with:"
echo "  curl -I https://${DOMAIN}"
echo "  curl -u kevin:YOURPASSWORD -I https://${DOMAIN}"
