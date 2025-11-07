# AI Features - Quick Setup Checklist

**Goal:** Get AI features accessible to users in 1-2 hours  
**Date:** November 7, 2025  
**Status:** Ready to implement

---

## ✅ Pre-Flight Check

Before starting, confirm:

- [ ] All AI frontend files created (types, services, slices, components, pages)
- [ ] Redux store includes `ai` reducer
- [ ] Backend AI endpoints are deployed and working
- [ ] Environment variables set (`VITE_AI_FEATURES_ENABLED=true`)
- [ ] Payment gateway configured (Paystack/Hubtel)

---

## 🚀 Part 1: Add Navigation (30 minutes)

### Step 1: Add AI Icon (5 min)

**File:** `/src/features/dashboard/DashboardLayout.tsx`

**Find this (around line 35):**
```typescript
type NavIconKey =
  | 'dashboard'
  | 'sales'
  | 'inventory'
  | 'customers'
  | 'employees'
  | 'reports'
  | 'bookkeeping'
  | 'billing'
  | 'settings'
```

**Change to:**
```typescript
type NavIconKey =
  | 'dashboard'
  | 'sales'
  | 'inventory'
  | 'customers'
  | 'employees'
  | 'reports'
  | 'bookkeeping'
  | 'billing'
  | 'settings'
  | 'ai'  // ADD THIS LINE
```

**Find ICONS object (around line 60):**
```typescript
const ICONS: Record<NavIconKey, ReactNode> = {
  dashboard: (...),
  sales: (...),
  // ... other icons
  settings: (...)
}
```

**Add AI icon at the end (before closing brace):**
```typescript
  ai: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
```

✅ **Test:** TypeScript should compile without errors

---

### Step 2: Add Sidebar Link (10 min)

**File:** `/src/features/dashboard/DashboardLayout.tsx`

**Find SIDE_NAV_SECTIONS (around line 174):**
```typescript
{
  title: 'Insights',
  links: [
    {
      label: 'Reports',
      to: '/app/reports',
      icon: 'reports',
      requiredCapability: CAPABILITIES.REPORTS_VIEW,
      subLinks: [
        {
          to: '/app/reports/export-schedules',
          label: 'Export Automation',
          requiredCapability: CAPABILITIES.REPORTS_VIEW,
        },
        {
          to: '/app/reports/export-history',
          label: 'Export History',
          requiredCapability: CAPABILITIES.REPORTS_VIEW,
        },
      ],
    },
    {
      label: 'Bookkeeping',
      to: '/app/bookkeeping',
      icon: 'bookkeeping',
      requiredCapability: CAPABILITIES.BOOKKEEPING_VIEW,
    },
  ],
},
```

**Add AI link after Reports, before Bookkeeping:**
```typescript
{
  title: 'Insights',
  links: [
    {
      label: 'Reports',
      to: '/app/reports',
      icon: 'reports',
      requiredCapability: CAPABILITIES.REPORTS_VIEW,
      subLinks: [
        {
          to: '/app/reports/export-schedules',
          label: 'Export Automation',
          requiredCapability: CAPABILITIES.REPORTS_VIEW,
        },
        {
          to: '/app/reports/export-history',
          label: 'Export History',
          requiredCapability: CAPABILITIES.REPORTS_VIEW,
        },
      ],
    },
    // ADD THIS SECTION:
    {
      label: 'AI Features',
      to: '/app/ai',
      icon: 'ai',
      requiredCapability: CAPABILITIES.REPORTS_VIEW,
    },
    // END OF NEW SECTION
    {
      label: 'Bookkeeping',
      to: '/app/bookkeeping',
      icon: 'bookkeeping',
      requiredCapability: CAPABILITIES.BOOKKEEPING_VIEW,
    },
  ],
},
```

✅ **Test:** Save file, check for TypeScript errors

---

### Step 3: Add Route (10 min)

**File:** `/src/App.tsx`

**Find imports at top (around line 18):**
```typescript
import ExportSchedulesPage from './features/dashboard/pages/ExportSchedulesPage.tsx'
import ExportHistoryPage from './features/dashboard/pages/ExportHistoryPage.tsx'
```

**Add after these lines:**
```typescript
import { AIFeaturesPage, PurchaseCreditsModal } from './features/ai'
```

**Find routes inside `<Route path="/app" element={<DashboardLayout />}>` (around line 100):**

**Add this route (find a good spot, maybe after reports routes):**
```typescript
<Route
  path="ai"
  element={(
    <RequirePermission capability={CAPABILITIES.REPORTS_VIEW}>
      <AIFeaturesPage />
    </RequirePermission>
  )}
/>
```

**Find the closing of DashboardLayout routes and add modal outside:**
```typescript
            {/* Other routes */}
          </Route>
        </Route>
      </Route>
      
      {/* ADD MODAL HERE - outside DashboardLayout but inside ProtectedRoute */}
      <PurchaseCreditsModal />
      
      {/* Public routes for payment callbacks */}
      <Route path="/payment/callback" element={<PaymentCallback />} />
```

✅ **Test:** Save file, check for TypeScript errors

---

### Step 4: Test Navigation (5 min)

```bash
# Start dev server
npm run dev

# Open browser to http://localhost:5173
# Log in with test account
# Check sidebar for "AI Features" link
# Click it - should navigate to /app/ai
# Should see AIFeaturesPage with credit widget
```

✅ **Expected Result:**
- Sidebar shows "AI Features" with lightbulb icon
- Clicking navigates to `/app/ai`
- Page shows AI features, balance widget, purchase options

---

## 🎨 Part 2: Add Dashboard Widget (30 minutes) - OPTIONAL

### Step 1: Import Widget Components (5 min)

**File:** `/src/features/dashboard/pages/OverviewPage.tsx`

**Add imports at top:**
```typescript
import { AICreditsWidget } from '../../ai/components/AICreditsWidget'
import { useNavigate } from 'react-router-dom'
```

---

### Step 2: Add Widget to Right Sidebar (15 min)

**File:** `/src/features/dashboard/pages/OverviewPage.tsx`

**Find the right sidebar section (where subscription info is shown)**

**Add this after subscription card:**
```tsx
{/* AI Features Widget */}
<section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
  <div className="flex items-center gap-3">
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
        <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
    <div>
      <h3 className="text-lg font-semibold text-slate-900">AI Assistant</h3>
      <p className="text-sm text-slate-600">Smart insights</p>
    </div>
  </div>

  <AICreditsWidget 
    showPurchaseOptions={false}
  />

  <Button
    variant="primary"
    className="w-100 rounded-pill"
    onClick={() => navigate('/app/ai')}
  >
    🚀 Explore AI Features
  </Button>

  <p className="text-xs text-slate-500 text-center mt-2">
    Get instant answers, generate descriptions, and analyze business risks
  </p>
</section>
```

---

### Step 3: Test Dashboard Widget (10 min)

```bash
# Refresh browser at /app (dashboard)
# Check right sidebar
# Should see "AI Assistant" card
# Shows credit balance
# "Explore AI Features" button works
```

✅ **Expected Result:**
- Widget visible on dashboard right sidebar
- Shows credit balance (0.0 initially)
- Button navigates to `/app/ai`

---

## 🧪 Part 3: End-to-End Testing (30 minutes)

### Test 1: Navigation Flow (5 min)

```
✅ Dashboard → Sidebar → "AI Features" → /app/ai loads
✅ AI Features page shows correctly
✅ Credit balance widget visible
✅ Purchase options visible (3 packages)
✅ Feature cards display (6 features)
```

---

### Test 2: Credit Purchase Flow (10 min)

**Backend must be deployed for this test!**

```
1. Click "Buy Starter (GHS 30)"
   ✅ Should redirect to payment gateway
   
2. Complete payment (test mode)
   ✅ Should redirect back to /app/ai
   
3. Check balance
   ✅ Should show 30.0 credits
   
4. Check browser console
   ✅ No errors in console
```

---

### Test 3: AI Query (10 min)

```
1. With credits available, type query:
   "How many products do I have?"
   
2. Click "Ask (costs 0.5 credits)"
   ✅ Loading spinner appears
   ✅ Answer displays after 2-3 seconds
   ✅ Balance decreases: 30.0 → 29.5
   
3. Try insufficient credits:
   Set balance to 0.3, try query (needs 0.5)
   ✅ Modal opens showing shortage
   ✅ Purchase options displayed
```

---

### Test 4: Modal Flow (5 min)

```
1. Zero out credits (or use test account with 0)
2. Try to ask question
   ✅ PurchaseCreditsModal opens automatically
   ✅ Shows: "Need 0.5 credits, you have 0.0"
   ✅ Shows shortage: 0.5 credits
   ✅ Purchase buttons work
3. Click outside modal
   ✅ Modal closes (doesn't persist)
```

---

## 🐛 Troubleshooting

### Issue: "Module not found" error

**Solution:**
```bash
# Check all AI files exist
ls -la src/types/ai.ts
ls -la src/services/ai/aiService.ts
ls -la src/store/slices/aiSlice.ts
ls -la src/features/ai/index.ts

# If missing, re-create them from implementation docs
```

---

### Issue: TypeScript errors in DashboardLayout

**Solution:**
```typescript
// Make sure NavIconKey includes 'ai'
// Make sure ICONS object has ai entry
// Make sure no typos in icon name
```

---

### Issue: Route not working (404)

**Solution:**
```typescript
// Check App.tsx route is inside DashboardLayout route
// Check path is exactly "ai" (not "/ai")
// Check RequirePermission allows access
```

---

### Issue: Redux store error "ai is undefined"

**Solution:**
```typescript
// Check src/store/index.ts includes:
import aiReducer from './slices/aiSlice'

// In configureStore:
reducer: {
  // ... other reducers
  ai: aiReducer,  // Must be here!
}
```

---

### Issue: Payment not working

**Solution:**
```bash
# Check environment variables
echo $VITE_API_BASE_URL

# Check backend is deployed
curl -H "Authorization: Token YOUR_TOKEN" \
  http://YOUR_BACKEND/ai/api/credits/balance/

# Check payment gateway configured in backend
```

---

## 📋 Launch Checklist

Before announcing to users:

### Technical Checks
- [ ] Navigation link visible in sidebar
- [ ] Route works: /app/ai loads correctly
- [ ] Credit widget displays balance
- [ ] Purchase flow completes successfully
- [ ] AI queries return answers
- [ ] Credit deduction works correctly
- [ ] Modal triggers on insufficient credits
- [ ] Mobile responsive (test on phone)
- [ ] No console errors

### Business Checks
- [ ] Pricing confirmed (GHS 30, 80, 180)
- [ ] Payment gateway live mode enabled
- [ ] Support team trained on AI features
- [ ] User documentation ready
- [ ] Email template for announcements ready
- [ ] Analytics tracking configured

### Security Checks
- [ ] User authentication required
- [ ] Active subscription required
- [ ] Credit transactions logged
- [ ] Payment verification secure
- [ ] API rate limiting enabled
- [ ] Error messages don't leak data

---

## 🚀 Launch Steps

### Soft Launch (Week 1)
```
1. Enable for 10 beta users
   - Give 50 free credits
   - Collect feedback
   
2. Monitor:
   - Usage patterns
   - Error rates
   - Payment success rate
   - Feature popularity
   
3. Iterate:
   - Fix bugs
   - Adjust UI/UX
   - Optimize pricing
```

### Full Launch (Week 2)
```
1. Announce via email:
   "🤖 New: AI-Powered Insights!"
   
2. Add banner to dashboard:
   "Try AI Features - Get 10 Free Credits"
   
3. Social media posts:
   Screenshots, demos, testimonials
   
4. Support documentation:
   FAQ, video tutorials, examples
```

---

## 📊 Success Metrics

Track daily for first 2 weeks:

| Metric | Target | Actual |
|--------|--------|--------|
| Users who click AI link | 40% | ___ |
| Users who visit /app/ai | 30% | ___ |
| Users who purchase credits | 15% | ___ |
| Average credits purchased | GHS 80 | ___ |
| Repeat purchases (30 days) | 50% | ___ |
| AI queries per day | 100+ | ___ |
| User satisfaction (1-5) | 4.0+ | ___ |

---

## ✅ Completion Checklist

Mark when done:

- [ ] Part 1: Navigation added (sidebar, icon, route)
- [ ] Part 2: Dashboard widget added (optional)
- [ ] Part 3: All tests passed
- [ ] Launch checklist completed
- [ ] Soft launch executed
- [ ] Monitoring active
- [ ] Full launch ready

---

## 🎯 Time Estimate Summary

| Task | Time | Difficulty |
|------|------|------------|
| Add navigation | 30 min | Easy ⭐ |
| Add dashboard widget | 30 min | Medium ⭐⭐ |
| Testing | 30 min | Easy ⭐ |
| Documentation | 30 min | Easy ⭐ |
| **Total** | **2 hours** | **Easy** |

---

## 📞 Need Help?

**Frontend Issues:**
- Check: `AI-FRONTEND-IMPLEMENTATION-COMPLETE.md`
- Check: `AI-QUICK-INTEGRATION-GUIDE.md`

**Navigation Issues:**
- Check: `AI-NAVIGATION-INTEGRATION-GUIDE.md`

**Business Questions:**
- Check: `AI-SUBSCRIPTION-ACCESS-GUIDE.md`

**Backend Issues:**
- Check: `AI-FEATURES-API-DOCUMENTATION-FRONTEND.md`
- Contact: Backend team

---

**Ready to launch! 🚀**

Just follow this checklist and AI features will be live in ~2 hours.
