# Kevin Todo Rollout Runbook

This is the copy-paste operator runbook for deploying `kevin-todo.latinum.ca`.

## Assumptions
- App host: `10.1.0.47`
- Gateway host: `10.0.0.88`
- App port: `3010`
- App path: `/var/www/latinum-board`
- Domain: `kevin-todo.latinum.ca`
- Workspace path: `/home/ubuntu/.openclaw/workspace/product/latinum-board`

---

## 1. Operator VPS: deploy app to dev host

```bash
cd /home/ubuntu/.openclaw/workspace/product/latinum-board
bash deploy/deploy-latinum-board.sh ubuntu@10.1.0.47
```

---

## 2. Dev VPS: verify service and app health

```bash
ssh ubuntu@10.1.0.47
sudo systemctl status latinum-board
curl -I http://127.0.0.1:3010
sudo ufw allow from 10.0.0.88 to any port 3010 proto tcp
sudo ufw status
journalctl -u latinum-board -n 100 --no-pager
exit
```

Expected:
- `latinum-board` is active
- local curl returns `200 OK`

---

## 3. Operator VPS: copy nginx config to gateway

```bash
scp /home/ubuntu/.openclaw/workspace/product/latinum-board/deploy/nginx-kevin-todo.latinum.ca.conf \
  ubuntu@10.0.0.88:/tmp/kevin-todo.latinum.ca.conf
```

---

## 4. Gateway VPS: install nginx site and auth

```bash
ssh ubuntu@10.0.0.88
sudo apt-get update
sudo apt-get install -y apache2-utils
sudo htpasswd -c /etc/nginx/.htpasswd-kevin-todo kevin
sudo mv /tmp/kevin-todo.latinum.ca.conf /etc/nginx/sites-available/kevin-todo.latinum.ca
sudo ln -sf /etc/nginx/sites-available/kevin-todo.latinum.ca /etc/nginx/sites-enabled/kevin-todo.latinum.ca
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d kevin-todo.latinum.ca -m latinumITpartners@gmail.com --agree-tos --non-interactive
sudo nginx -t
sudo systemctl reload nginx
exit
```

---

## 5. Verify DNS and public access

### DNS
```bash
dig +short kevin-todo.latinum.ca
```
Expected:
```bash
51.79.26.26
```

### Public unauthenticated
```bash
curl -I https://kevin-todo.latinum.ca
```
Expected:
- `401 Unauthorized`

### Public authenticated
```bash
curl -u kevin:YOURPASSWORD -I https://kevin-todo.latinum.ca
```
Expected:
- `200 OK`

---

## 6. Troubleshooting

### Dev VPS app logs
```bash
ssh ubuntu@10.1.0.47
journalctl -u latinum-board -n 100 --no-pager
```

### Restart app
```bash
ssh ubuntu@10.1.0.47
sudo systemctl restart latinum-board
sudo systemctl status latinum-board
```

### Gateway nginx test
```bash
ssh ubuntu@10.0.0.88
sudo nginx -t
sudo systemctl status nginx
```

### Gateway to app connectivity
```bash
ssh ubuntu@10.0.0.88
curl -I http://10.1.0.47:3010
```
