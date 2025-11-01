# Environment Configuration

## Overview

The POS frontend uses environment-specific configuration files to manage API endpoints and feature flags.

---

## Environment Files

### `.env` - Development (Local)
**Used when:** Running `npm run dev`  
**API URL:** `http://localhost:8000`

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_BYPASS_SUBSCRIPTION_CHECK=true
VITE_USE_NEW_TRANSFER_API=true
```

### `.env.production` - Production
**Used when:** Running `npm run build` with `NODE_ENV=production`  
**API URL:** `https://posbackend.alphalogiquetechnologies.com`

```env
VITE_API_BASE_URL=https://posbackend.alphalogiquetechnologies.com
VITE_BYPASS_SUBSCRIPTION_CHECK=true
VITE_USE_NEW_TRANSFER_API=true
```

---

## Environment Variables

| Variable | Description | Values |
|----------|-------------|--------|
| `VITE_API_BASE_URL` | Backend API base URL | Development: `http://localhost:8000`<br>Production: `https://posbackend.alphalogiquetechnologies.com` |
| `VITE_BYPASS_SUBSCRIPTION_CHECK` | Skip subscription validation | `true` / `false` |
| `VITE_USE_NEW_TRANSFER_API` | Use new batch warehouse transfer API | `true` / `false` |

---

## How It Works

### Local Development
```bash
npm run dev
# Uses .env file
# API requests → http://localhost:8000
```

### Production Build (Local)
```bash
npm run build
# Uses .env.production file
# API requests → https://posbackend.alphalogiquetechnologies.com
```

### GitHub Actions Deployment
The CI/CD pipeline automatically:
1. Sets `NODE_ENV=production`
2. Runs `npm run build`
3. Vite uses `.env.production` configuration
4. Deploys built files with production API URL

**No GitHub Secrets needed** - The production URL is committed in `.env.production`

---

## Checking Current Configuration

### In Browser DevTools:
```javascript
// Open browser console and run:
console.log(import.meta.env.VITE_API_BASE_URL)
```

### In Code:
```typescript
// src/services/httpClient.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'
```

---

## Updating Configuration

### Change Production API URL:
1. Edit `.env.production`
2. Commit and push to `main` branch
3. GitHub Actions will rebuild and deploy automatically

### Add New Environment Variable:
1. Add to both `.env` and `.env.production`
2. Access in code: `import.meta.env.VITE_YOUR_VARIABLE`
3. **Note:** Variable must start with `VITE_` to be exposed to the app

---

## Troubleshooting

### Still seeing localhost requests?
1. **Clear browser cache** - Hard reload (Ctrl+Shift+R)
2. **Check deployment** - Verify latest build deployed
3. **Check console** - `console.log(import.meta.env.VITE_API_BASE_URL)`

### API requests failing?
1. **Check backend is running** - Visit https://posbackend.alphalogiquetechnologies.com
2. **Check CORS settings** - Backend must allow `pos.alphalogiquetechnologies.com`
3. **Check network tab** - Verify requests going to correct URL

---

## Backend Requirements

The backend API must:
- ✅ Be accessible at: `https://posbackend.alphalogiquetechnologies.com`
- ✅ Have SSL/HTTPS enabled
- ✅ Allow CORS from: `https://pos.alphalogiquetechnologies.com`
- ✅ Accept requests without trailing slash in base URL

**CORS Configuration Example (Django):**
```python
# settings.py
CORS_ALLOWED_ORIGINS = [
    "https://pos.alphalogiquetechnologies.com",
    "http://localhost:5173",  # For local dev
]
```

---

## Files Modified

- ✅ `.env` - Development configuration
- ✅ `.env.production` - Production configuration  
- ✅ `.github/workflows/deploy.yml` - Already set `NODE_ENV=production`

---

**Last Updated:** October 28, 2025  
**Production API:** https://posbackend.alphalogiquetechnologies.com  
**Production Frontend:** https://pos.alphalogiquetechnologies.com
