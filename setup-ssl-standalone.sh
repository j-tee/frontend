#!/bin/bash

# SSL Setup Script for POS Frontend - Fixed Version
# Server: pos.alphalogiquetechnologies.com

echo "===== SSL Certificate Setup (Standalone Method) ====="
echo ""

# Step 1: Stop nginx temporarily
echo "Step 1: Stopping nginx temporarily..."
sudo /opt/nginx/sbin/nginx -s stop
sleep 2

# Step 2: Obtain SSL certificate using standalone method
echo ""
echo "Step 2: Obtaining SSL certificate using standalone method..."
echo "This will use port 80 directly (nginx must be stopped)"
sudo certbot certonly --standalone -d pos.alphalogiquetechnologies.com \
    --non-interactive \
    --agree-tos \
    --email admin@alphalogiquetechnologies.com

# Check if certbot succeeded
if [ $? -eq 0 ]; then
    echo ""
    echo "✓ SSL certificate obtained successfully!"
    
    # Step 3: Update nginx config to enable HTTPS
    echo ""
    echo "Step 3: Updating nginx configuration for HTTPS..."
    
    # Backup current config
    sudo cp /opt/nginx/conf/conf.d/pos_frontend.conf /opt/nginx/conf/conf.d/pos_frontend.conf.backup
    
    # Update config to enable HTTPS redirect
    sudo sed -i 's/# return 301 https/return 301 https/' /opt/nginx/conf/conf.d/pos_frontend.conf
    
    echo "✓ Configuration updated"
    
    # Step 4: Test nginx configuration
    echo ""
    echo "Step 4: Testing nginx configuration..."
    sudo /opt/nginx/sbin/nginx -t
    
    if [ $? -eq 0 ]; then
        # Step 5: Start nginx
        echo ""
        echo "Step 5: Starting nginx..."
        sudo /opt/nginx/sbin/nginx
        
        echo ""
        echo "===== SSL Setup Complete! ====="
        echo ""
        echo "Your site is now available at:"
        echo "https://pos.alphalogiquetechnologies.com"
        echo ""
        echo "Certificate details:"
        sudo certbot certificates -d pos.alphalogiquetechnologies.com
        echo ""
        echo "Certificate will auto-renew. You can test renewal with:"
        echo "sudo certbot renew --dry-run"
    else
        echo ""
        echo "✗ Nginx configuration test failed"
        echo "Starting nginx anyway with old config..."
        sudo /opt/nginx/sbin/nginx
    fi
else
    echo ""
    echo "✗ Failed to obtain SSL certificate"
    echo "Restarting nginx with existing configuration..."
    sudo /opt/nginx/sbin/nginx
fi
