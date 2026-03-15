#!/bin/bash
set -e

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "==> Copia configurazione nginx..."
cp "$REPO_DIR/nginx/hl7.conf" /etc/nginx/sites-available/hl7.conf
ln -sf /etc/nginx/sites-available/hl7.conf /etc/nginx/sites-enabled/hl7.conf

echo "==> Rimozione default nginx (se presente)..."
rm -f /etc/nginx/sites-enabled/default

echo "==> Verifica configurazione nginx..."
nginx -t

echo "==> Ricarica nginx..."
systemctl reload nginx

echo "==> Avvio applicazione con docker compose..."
cd "$REPO_DIR"
docker compose up -d --build

echo "==> Deploy completato. Attesa avvio app..."
sleep 5

echo "==> Test endpoint:"
curl -s -o /dev/null -w "GET /api/prescriptions -> HTTP %{http_code}\n" https://ip87-106-10-111.pbiaas.com/api/prescriptions
curl -s -o /dev/null -w "GET /api/config/filters -> HTTP %{http_code}\n" https://ip87-106-10-111.pbiaas.com/api/config/filters
