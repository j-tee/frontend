#!/bin/bash

# SSL Setup Script for POS Frontend
# Server: pos.alphalogiquetechnologies.com

echo "===== SSL Certificate Setup ====="
echo ""

# Step 1: Check if certbot is installed
echo "Step 1: Checking for certbot..."
if ! command -v certbot &> /dev/null; then
    echo "Certbot not found. Installing..."
    sudo apt update
    sudo apt install -y certbot python3-certbot-nginx
else
    echo "Certbot is already installed."
fi
echo ""

# Step 2: Obtain SSL certificate
echo "Step 2: Obtaining SSL certificate..."
echo "This will modify the nginx config automatically."
sudo certbot --nginx -d pos.alphalogiquetechnologies.com --non-interactive --agree-tos --email admin@alphalogiquetechnologies.com --redirect

# Check if certbot succeeded
if [ $? -eq 0 ]; then
    echo ""
    echo "✓ SSL certificate obtained successfully!"
    echo ""
    
    # Step 3: Test nginx configuration
    echo "Step 3: Testing nginx configuration..."
    sudo /opt/nginx/sbin/nginx -t
    
    # Step 4: Reload nginx
    echo ""
    echo "Step 4: Reloading nginx..."
    sudo /opt/nginx/sbin/nginx -s reload
    
    echo ""
    echo "===== SSL Setup Complete! ====="
    echo ""
    echo "Your site is now available at:"
    echo "https://pos.alphalogiquetechnologies.com"
    echo ""
    echo "Certificate details:"
    sudo certbot certificates -d pos.alphalogiquetechnologies.com
else
    echo ""
    echo "✗ Failed to obtain SSL certificate"
    echo "Please check the error messages above"
fi
