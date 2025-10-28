# CI/CD Deployment Setup Guide

## ✅ What's Been Set Up

1. **GitHub Actions Workflow** created at `.github/workflows/deploy.yml`
2. **SSH Key** identified: `~/.ssh/gha_ci` (matches server's `github-actions` key)
3. **Deployment Strategy**: Build on GitHub, deploy to server with automatic backups

---

## 🔧 Steps to Complete Setup

### Step 1: Add GitHub Secrets

Go to your GitHub repository: https://github.com/j-tee/frontend/settings/secrets/actions

Click **"New repository secret"** and add these secrets:

#### 1. DEPLOY_SSH_KEY
**Value:** Copy the ENTIRE private key (including header/footer):
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACBEvxY3GMRLmZRBhYQKp0xFmVi+lTcmq9+lwk05LJOz0gAAAJg1WmHwNVph
8AAAAAtzc2gtZWQyNTUxOQAAACBEvxY3GMRLmZRBhYQKp0xFmVi+lTcmq9+lwk05LJOz0g
AAAEByO43IR3ugyRpPz9JHxDC6pJJWtZEag1E0xBh9P7zoB0S/FjcYxEuZlEGFhAqnTEWZ
WL6VNyar36XCTTksk7PSAAAADmdpdGh1Yi1hY3Rpb25zAQIDBAUGBw==
-----END OPENSSH PRIVATE KEY-----
```

#### 2. DEPLOY_HOST
**Value:** `68.66.251.79`

#### 3. DEPLOY_USER
**Value:** `deploy`

#### 4. DEPLOY_PORT
**Value:** `7822`

#### 5. DEPLOY_PATH
**Value:** `/var/www/pos/frontend`

#### 6. VITE_API_URL (Optional - if your app needs it)
**Value:** Your production API URL (e.g., `https://api.yoursite.com`)

---

### Step 2: Update Workflow Settings (Optional)

The workflow currently deploys when you push to the `main` branch.

**To deploy from `Warehouse-transfers` branch instead:**
Edit `.github/workflows/deploy.yml` and change:
```yaml
on:
  push:
    branches:
      - Warehouse-transfers  # Changed from 'main'
```

**To deploy from BOTH branches:**
```yaml
on:
  push:
    branches:
      - main
      - Warehouse-transfers
```

---

### Step 3: Add Environment Variables (If Needed)

If your app needs environment variables during build:

1. Add them as GitHub Secrets (like VITE_API_URL above)
2. Edit `.github/workflows/deploy.yml` under the "Build application" step:
```yaml
- name: Build application
  run: npm run build
  env:
    VITE_API_URL: ${{ secrets.VITE_API_URL }}
    VITE_OTHER_VAR: ${{ secrets.VITE_OTHER_VAR }}
    NODE_ENV: production
```

---

### Step 4: Test the Deployment

**Option A: Push to trigger deployment**
```bash
git add .
git commit -m "Add CI/CD deployment workflow"
git push origin main  # or Warehouse-transfers
```

**Option B: Manual deployment**
1. Go to https://github.com/j-tee/frontend/actions
2. Click "Deploy to Production" workflow
3. Click "Run workflow" button
4. Select your branch
5. Click "Run workflow"

---

## 📦 What Happens During Deployment

1. **Checkout code** from your repository
2. **Install Node.js 20** and dependencies
3. **Build the app** (`npm run build`)
4. **Backup current deployment** on server (keeps last 3 backups)
5. **Upload `dist/` folder** to server via SSH
6. **Report status** (success/failure)

---

## 🔄 Deployment Features

### Automatic Backups
- Before each deployment, the current version is backed up
- Backups are named: `dist.backup.YYYYMMDD_HHMMSS`
- Only the last 3 backups are kept (older ones auto-deleted)

### Manual Rollback
If something goes wrong, SSH to server and restore:
```bash
ssh -p 7822 deploy@68.66.251.79
cd /var/www/pos/frontend
rm -rf dist
cp -r dist.backup.20251028_143022 dist  # Use actual backup name
```

---

## 🚀 Quick Commands

### View deployment logs
```bash
# Go to: https://github.com/j-tee/frontend/actions
```

### Manual deployment from CLI
```bash
gh workflow run deploy.yml --ref main
```

### Check server deployment
```bash
ssh -p 7822 deploy@68.66.251.79 "ls -lh /var/www/pos/frontend/dist/"
```

---

## ⚙️ Server Requirements

The deployment assumes:
- `/var/www/pos/frontend` directory exists
- `deploy` user has write permissions
- Web server (Nginx/Apache) serves from `dist/` folder

If not configured, run on server:
```bash
sudo mkdir -p /var/www/pos/frontend
sudo chown -R deploy:deploy /var/www/pos/frontend
```

---

## 🛠️ Troubleshooting

### "Permission denied" error
- Check that DEPLOY_SSH_KEY secret is correct (including header/footer)
- Verify the key is in server's `~/.ssh/authorized_keys`

### "Host key verification failed"
- First deployment may need to accept host key
- Add to workflow if needed (but reduces security)

### Build fails
- Check environment variables are set
- Verify `npm run build` works locally

### Deployment succeeds but app doesn't work
- Check browser console for errors
- Verify API URL is correct
- Check web server configuration

---

## 📝 Next Steps

1. ✅ Add GitHub Secrets (Step 1 above)
2. ✅ Commit and push the workflow file
3. ✅ Watch the deployment run in GitHub Actions
4. ✅ Verify the app works at your domain

---

**Created:** October 28, 2025  
**Status:** Ready to deploy  
**Deployment Key:** `gha_ci` (already on server)
