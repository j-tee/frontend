# Local Development Setup Guide

## Issue: CORS Errors in Development

If you're seeing CORS errors like in your screenshot, it means your local frontend is trying to connect to a backend that either:
1. Isn't running
2. Doesn't have CORS configured properly

---

## Solution Options

### Option 1: Run Backend Locally (Recommended)

**If you have the backend code:**

```bash
# Navigate to your backend directory
cd /path/to/pos/backend

# Start the Django development server
python manage.py runserver

# Or if using different port:
python manage.py runserver 8000
```

Your frontend will connect to `http://localhost:8000` automatically.

---

### Option 2: Connect to Production Backend

**If you don't have backend running locally:**

1. **Create `.env.local` file** (already gitignored):
```bash
cp .env.local.example .env.local
```

2. **Restart your dev server:**
```bash
npm run dev
```

Your local frontend will now connect to the production backend at `https://posbackend.alphalogiquetechnologies.com`

3. **To switch back to localhost:**
```bash
rm .env.local
npm run dev
```

---

## Environment File Priority

Vite loads environment files in this order (later files override earlier):

1. `.env` - Base configuration (all environments)
2. `.env.local` - Local overrides (gitignored)
3. `.env.[mode]` - Mode-specific (`.env.development`, `.env.production`)
4. `.env.[mode].local` - Mode-specific local overrides (gitignored)

**For development:**
- Without `.env.local`: Uses `.env` → `http://localhost:8000`
- With `.env.local`: Uses `.env.local` → `https://posbackend.alphalogiquetechnologies.com`

**For production build:**
- Always uses `.env.production` → `https://posbackend.alphalogiquetechnologies.com`

---

## Quick Commands

### Start Frontend Only (connects to localhost:8000)
```bash
npm run dev
```

### Start Frontend with Production Backend
```bash
# One-time setup
cp .env.local.example .env.local

# Start dev server
npm run dev
```

### Check Current API URL
```bash
# In browser console (F12):
console.log(import.meta.env.VITE_API_BASE_URL)
```

---

## Backend CORS Configuration

If running backend locally, ensure CORS is configured:

**Django settings.py:**
```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://pos.alphalogiquetechnologies.com",
]

# Or for development only:
CORS_ALLOW_ALL_ORIGINS = True  # ⚠️ Only for local dev!
```

---

## Troubleshooting

### Still seeing localhost:8000 in requests?
1. Stop dev server (`Ctrl+C`)
2. Clear node cache: `rm -rf node_modules/.vite`
3. Restart: `npm run dev`

### CORS errors with production backend?
The production backend at `https://posbackend.alphalogiquetechnologies.com` must allow:
- `http://localhost:5173`
- `http://localhost:5174`
- `https://pos.alphalogiquetechnologies.com`

### Network Error shown in screenshot
This is expected when backend is not running. Start your local backend or use `.env.local` to connect to production.

---

## Files Overview

| File | Purpose | Committed? | Used When |
|------|---------|------------|-----------|
| `.env` | Development defaults | ✅ Yes | Local dev (default) |
| `.env.local` | Local overrides | ❌ No | Local dev (if exists) |
| `.env.local.example` | Template for local | ✅ Yes | Documentation |
| `.env.production` | Production config | ✅ Yes | `npm run build` |

---

**Quick Fix for Your Current Issue:**

```bash
# Option A: Start local backend
cd ../backend && python manage.py runserver

# Option B: Use production backend
cp .env.local.example .env.local
npm run dev
```

After this, refresh your browser and the CORS errors should be gone! ✅
