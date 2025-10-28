# Nginx Server Block Setup for POS Frontend

**Server Name:** pos.alphalogiquetechnologies.com  
**Config File:** pos_frontend.conf  
**Nginx Location:** `/opt/nginx/conf/conf.d/`

---

## Initial HTTP Deployment (COMPLETED ✓)

### 1. Copy the config to the server:
```bash
scp -P 7822 pos_frontend.conf deploy@68.66.251.79:/tmp/
```

### 2. SSH into the server:
```bash
ssh -p 7822 deploy@68.66.251.79
```

### 3. Move config to nginx conf.d directory:
```bash
sudo mv /tmp/pos_frontend.conf /opt/nginx/conf/conf.d/
```

### 4. Set proper permissions:
```bash
sudo chown root:root /opt/nginx/conf/conf.d/pos_frontend.conf
sudo chmod 644 /opt/nginx/conf/conf.d/pos_frontend.conf
```

### 5. Test nginx configuration:
```bash
sudo /opt/nginx/sbin/nginx -t
```

### 6. Reload nginx:
```bash
sudo /opt/nginx/sbin/nginx -s reload
```

---

## SSL/HTTPS Setup

### Option A: Automated Setup (Recommended)

**Run the automated script on the server:**

```bash
# Copy script to server
scp -P 7822 setup-ssl.sh deploy@68.66.251.79:/tmp/

# SSH to server
ssh -p 7822 deploy@68.66.251.79

# Make executable and run
chmod +x /tmp/setup-ssl.sh
/tmp/setup-ssl.sh
```

### Option B: Manual Setup

**1. Install Certbot (if not installed):**
```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
```

**2. Obtain SSL Certificate:**
```bash
sudo certbot --nginx -d pos.alphalogiquetechnologies.com
```

Follow the prompts:
- Enter email address (e.g., admin@alphalogiquetechnologies.com)
- Agree to terms of service (Y)
- Choose to redirect HTTP to HTTPS (option 2)

**3. Alternative: Use pre-configured SSL config:**
```bash
# Backup current config
sudo cp /opt/nginx/conf/conf.d/pos_frontend.conf /opt/nginx/conf/conf.d/pos_frontend.conf.backup

# Copy SSL-ready config
scp -P 7822 pos_frontend_ssl.conf deploy@68.66.251.79:/tmp/
sudo mv /tmp/pos_frontend_ssl.conf /opt/nginx/conf/conf.d/pos_frontend.conf
sudo chown root:root /opt/nginx/conf/conf.d/pos_frontend.conf
sudo chmod 644 /opt/nginx/conf/conf.d/pos_frontend.conf

# Obtain certificate (without nginx plugin modifying config)
sudo certbot certonly --webroot -w /var/www/pos/frontend/dist -d pos.alphalogiquetechnologies.com

# Test and reload
sudo /opt/nginx/sbin/nginx -t
sudo /opt/nginx/sbin/nginx -s reload
```

**4. Verify SSL Certificate:**
```bash
sudo certbot certificates
```

**5. Test HTTPS:**
```bash
curl -I https://pos.alphalogiquetechnologies.com
```

---

## Verify Deployment

### Check nginx is running:
```bash
sudo systemctl status nginx
# OR
ps aux | grep nginx
```

### Test the site:
```bash
curl -I http://pos.alphalogiquetechnologies.com
curl -I https://pos.alphalogiquetechnologies.com
```

### Check logs if issues:
```bash
sudo tail -f /var/log/nginx/pos_frontend_access.log
sudo tail -f /var/log/nginx/pos_frontend_error.log
```

---

## Existing Nginx Configs on Server

Located in `/opt/nginx/conf/conf.d/`:
- `autorepairs.conf`
- `default.conf`
- `portfolio.conf`
- `pos_backend.conf`
- `pos_backend.conf.backup`
- `pos_backend.conf.backup.20251028_091734`
- `profile.conf`
- `sdms.conf`
- `sdmsapi.conf`

---

## Backup Existing Config (if updating)

```bash
sudo cp /opt/nginx/conf/conf.d/pos_frontend.conf \
       /opt/nginx/conf/conf.d/pos_frontend.conf.backup.$(date +%Y%m%d_%H%M%S)
```

---

## Quick Commands Reference

**Nginx Control:**
- Test config: `sudo /opt/nginx/sbin/nginx -t`
- Reload: `sudo /opt/nginx/sbin/nginx -s reload`
- Restart: `sudo systemctl restart nginx`
- Stop: `sudo /opt/nginx/sbin/nginx -s stop`
- Start: `sudo systemctl start nginx`

**File Locations:**
- Config: `/opt/nginx/conf/conf.d/pos_frontend.conf`
- Access Log: `/var/log/nginx/pos_frontend_access.log`
- Error Log: `/var/log/nginx/pos_frontend_error.log`
- App Files: `/var/www/pos/frontend/dist/`
