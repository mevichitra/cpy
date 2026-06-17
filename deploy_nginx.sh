#!/bin/bash
# Nginx & SSL Certbot automatic deployment script for cpy
set -e

echo "=== 1. Updating packages ==="
apt-get update

echo "=== 2. Installing Nginx and Certbot ==="
apt-get install -y nginx certbot python3-certbot-nginx

echo "=== 3. Copying Nginx Server configuration ==="
cp /home/vichitra/cpy/nginx.conf /etc/nginx/sites-available/cpy

echo "=== 4. Enabling Site configuration ==="
ln -sf /etc/nginx/sites-available/cpy /etc/nginx/sites-enabled/

echo "=== 5. Restarting Nginx ==="
systemctl restart nginx

echo "=== 6. Requesting SSL Certificate ==="
certbot --nginx -d cpy.thefounders.cafe --non-interactive --agree-tos --register-unsafely-without-email

echo "=== SUCCESS: Deployment completed! ==="
