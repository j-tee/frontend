# AI Features Navigation Flow - Visual Guide

**Quick Reference:** How users find and access AI features

---

## 🗺️ Navigation Map

```
Current User State: Mike Tetteh @ DataLogique Systems
├── ✅ Active Subscription (Standard Plan)
├── ⚠️ 0 AI Credits (needs to purchase)
└── 🎯 Wants to try AI features

WHERE TO GO?
```

---

## 🎯 Option 1: Add AI Link to Sidebar (RECOMMENDED)

### Current Sidebar (DashboardLayout.tsx)

```
📍 OPERATIONS
├── Dashboard
├── Sales
├── Inventory
├── Customers
└── Employees

📍 INSIGHTS
├── Reports
│   ├── Export Automation
│   └── Export History
└── Bookkeeping

📍 ADMINISTRATION
├── Billing
└── Settings
```

### Add This:

```typescript
// In DashboardLayout.tsx, SIDE_NAV_SECTIONS array

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
    // ADD THIS NEW LINK:
    {
      label: 'AI Features',  // 🤖 can be added in icon
      to: '/app/ai',
      icon: 'ai',  // Need to define this icon
      requiredCapability: CAPABILITIES.REPORTS_VIEW,  // Or new AI capability
    },
    {
      label: 'Bookkeeping',
      to: '/app/bookkeeping',
      icon: 'bookkeeping',
      requiredCapability: CAPABILITIES.BOOKKEEPING_VIEW,
    },
  ],
}
```

### Result:

```
📍 INSIGHTS
├── Reports
│   ├── Export Automation
│   └── Export History
├── 🤖 AI Features  ← NEW!
└── Bookkeeping
```

**User clicks "AI Features" → Goes to /app/ai**

---

## 🎯 Option 2: Add AI Widget to Dashboard

### In OverviewPage.tsx (Dashboard)

Add to right sidebar (where subscription info is):

```tsx
// After subscription widget, before help section

<section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
  <div className="flex items-center gap-3">
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600">
      <span className="text-2xl">🤖</span>
    </div>
    <div>
      <h3 className="text-lg font-semibold text-slate-900">AI Assistant</h3>
      <p className="text-sm text-slate-600">Smart insights for your business</p>
    </div>
  </div>

  <AICreditsWidget 
    showPurchaseOptions={false}
    compact={true}
  />

  <Button
    variant="primary"
    className="w-full rounded-pill"
    onClick={() => navigate('/app/ai')}
  >
    🚀 Explore AI Features
  </Button>

  <p className="text-xs text-slate-500 text-center">
    Get instant answers, generate descriptions, and analyze risks with AI
  </p>
</section>
```

### Result:

```
┌────────────────────────────┐
│  🤖  AI Assistant          │
│  Smart insights            │
│                            │
│  💳 AI Credits: 0.0        │
│  [Buy Credits]             │
│                            │
│  [🚀 Explore AI Features]  │
│                            │
│  Get instant answers...    │
└────────────────────────────┘
```

**User clicks "Explore AI Features" → Goes to /app/ai**

---

## 🎯 Option 3: Add Banner to Reports Page

### In ReportsPage.tsx

Add at the top of the page:

```tsx
<Alert variant="info" className="mb-4 d-flex align-items-center justify-content-between">
  <div className="d-flex align-items-center gap-3">
    <span className="text-2xl">🤖</span>
    <div>
      <strong>Ask AI about your data</strong>
      <p className="mb-0 small">Get instant insights with natural language queries</p>
    </div>
  </div>
  <Button 
    variant="primary" 
    onClick={() => navigate('/app/ai')}
  >
    Try AI Features
  </Button>
</Alert>
```

### Result:

```
┌────────────────────────────────────────────────────────┐
│ 🤖  Ask AI about your data                  [Try AI]  │
│     Get instant insights with natural language queries │
└────────────────────────────────────────────────────────┘
```

**User clicks "Try AI" → Goes to /app/ai**

---

## 🎯 Option 4: Contextual AI Buttons (Advanced)

### Product Form Integration

```tsx
// In product form (src/features/inventory/ProductForm.tsx)

<Form.Group className="mb-3">
  <Form.Label>Description</Form.Label>
  <Form.Control
    as="textarea"
    rows={3}
    value={description}
    onChange={(e) => setDescription(e.target.value)}
  />
  
  <Button
    variant="link"
    size="sm"
    className="mt-2"
    onClick={handleGenerateDescription}
  >
    🤖 Generate with AI (0.1 credits)
  </Button>
</Form.Group>
```

### Customer Profile Integration

```tsx
// In customer profile (src/features/customers/CustomerProfile.tsx)

<Card>
  <Card.Header>
    <div className="d-flex justify-content-between align-items-center">
      <h5>Credit Information</h5>
      <Button
        variant="outline-primary"
        size="sm"
        onClick={handleAIRiskAssessment}
      >
        🤖 AI Risk Assessment
      </Button>
    </div>
  </Card.Header>
  <Card.Body>
    {/* Credit info */}
  </Card.Body>
</Card>
```

---

## 📋 Complete User Flow (Step-by-Step)

### Flow 1: Discovery via Sidebar

```
1. User logs in
   ├── Sees dashboard
   └── Looks at sidebar
   
2. User spots "🤖 AI Features" in sidebar
   └── Under "INSIGHTS" section
   
3. User clicks "AI Features"
   └── Navigates to /app/ai
   
4. Sees AI Features Page
   ├── Balance: 0.0 credits
   ├── Feature cards (6 options)
   └── Purchase options
   
5. User clicks "Buy Starter (GHS 30)"
   ├── Redirects to Paystack
   ├── Pays with mobile money
   └── Returns with 30 credits
   
6. User tries first query
   ├── Types: "What were my sales yesterday?"
   ├── Clicks "Ask (0.5 credits)"
   └── Gets AI answer
   
7. Balance updates: 30.0 → 29.5 credits ✅
```

### Flow 2: Discovery via Dashboard Widget

```
1. User on dashboard
   └── Sees right sidebar
   
2. Spots "AI Assistant" widget
   ├── Shows: "0.0 credits"
   └── Button: "Explore AI Features"
   
3. Clicks button → /app/ai
   
4. (Same as Flow 1 from step 4)
```

### Flow 3: Contextual Discovery

```
1. User creating new product
   └── On product form
   
2. Sees "🤖 Generate with AI (0.1 credits)"
   └── Under description field
   
3. Clicks button
   ├── If has credits: Generates description
   └── If no credits: Modal opens
   
4. Modal shows:
   ├── "Need 0.1 credits to continue"
   ├── "Current balance: 0.0"
   └── [Buy Credits] button
   
5. Clicks [Buy Credits] → /app/ai
   
6. (Same as Flow 1 from step 4)
```

---

## 🎨 Visual Hierarchy

### Priority 1: Sidebar Link (Always Visible)
```
✅ Most discoverable
✅ Always accessible
✅ Consistent with app structure
✅ One click to AI features
```

### Priority 2: Dashboard Widget (High Visibility)
```
✅ Catches attention on main page
✅ Shows credit balance
✅ Reminds users about AI
🟡 Only visible on dashboard
```

### Priority 3: Contextual Buttons (Smart Discovery)
```
✅ Appears when relevant
✅ Shows AI in action
✅ Increases usage
🟡 Scattered across app
```

### Priority 4: Banners/Alerts (Promotional)
```
🟡 Can be dismissed
🟡 May cause banner blindness
✅ Good for announcements
✅ Time-limited promotions
```

---

## 🚀 Recommended Implementation Order

### Week 1: Core Access
1. ✅ Add `/app/ai` route (already done)
2. ✅ Add AI icon to ICONS object
3. ✅ Add "AI Features" to sidebar INSIGHTS section
4. ✅ Test navigation: Dashboard → Sidebar → AI Features

### Week 2: Dashboard Integration
1. ✅ Import AICreditsWidget to OverviewPage
2. ✅ Add AI widget to right sidebar
3. ✅ Test: Dashboard → Widget → "Explore AI" → AI Features

### Week 3: Reports Integration
1. ✅ Add AIQueryBox to ReportsPage header
2. ✅ Add banner: "Ask AI about your data"
3. ✅ Test: Reports → Query box → AI answers

### Week 4: Contextual Integration
1. 🔄 Add "Generate Description" to product form
2. 🔄 Add "Risk Assessment" to customer profile
3. 🔄 Add "Generate Message" to collections
4. 🔄 Test all contextual buttons

---

## 🔧 Code Changes Required

### 1. Add AI Icon (DashboardLayout.tsx)

```typescript
// Add to ICONS object (line ~25)

const ICONS: Record<NavIconKey, ReactNode> = {
  // ... existing icons ...
  
  ai: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 2L2 7L12 12L22 7L12 2Z" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 17L12 22L22 17" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 12L12 17L22 12" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
}

// Update NavIconKey type (line ~35)
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
  | 'ai'  // ADD THIS
```

### 2. Add AI Link to Sidebar (DashboardLayout.tsx)

```typescript
// In SIDE_NAV_SECTIONS array (line ~130)

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
    // ADD THIS:
    {
      label: 'AI Features',
      to: '/app/ai',
      icon: 'ai',
      requiredCapability: CAPABILITIES.REPORTS_VIEW,
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

### 3. Add Route (App.tsx)

```typescript
// Import (line ~18)
import AIFeaturesPage from './features/ai/pages/AIFeaturesPage.tsx'
import PurchaseCreditsModal from './features/ai/components/PurchaseCreditsModal.tsx'

// In routes (line ~100+)
<Route
  path="ai"
  element={(
    <RequirePermission capability={CAPABILITIES.REPORTS_VIEW}>
      <AIFeaturesPage />
    </RequirePermission>
  )}
/>

// Add modal at root level (outside DashboardLayout)
// Place after </Route> for /app, before </Route> for ProtectedRoute
<PurchaseCreditsModal />
```

---

## ✅ Testing Checklist

After implementing navigation:

### Basic Navigation
- [ ] Sidebar shows "AI Features" link
- [ ] AI icon renders correctly
- [ ] Link is clickable
- [ ] Navigates to `/app/ai`
- [ ] AIFeaturesPage renders without errors

### Permissions
- [ ] Only users with active subscription can access
- [ ] Non-subscribers see upgrade prompt
- [ ] Role-based access works correctly

### Credit Widget
- [ ] Shows current balance (0.0 initially)
- [ ] Purchase buttons visible
- [ ] Clicking purchase redirects correctly

### Payment Flow
- [ ] Can click "Buy Starter"
- [ ] Redirects to payment gateway
- [ ] After payment, returns to AI page
- [ ] Balance updates correctly

### Mobile Responsiveness
- [ ] Sidebar link visible on mobile menu
- [ ] AI page works on mobile
- [ ] Widget responsive
- [ ] Purchase modal works on mobile

---

## 📊 Success Metrics After Launch

Track in analytics:

1. **Discovery Rate**
   - % of users who click AI link
   - Time to first AI page visit
   
2. **Engagement Rate**
   - % who explore features
   - Time spent on AI page
   
3. **Conversion Rate**
   - % who purchase credits
   - Average time to first purchase
   
4. **Usage Patterns**
   - Most used features
   - Credit consumption rate
   - Repeat purchase rate

---

## 🎯 Quick Reference Summary

| Where | What | Action | Result |
|-------|------|--------|--------|
| Sidebar → Insights | "AI Features" link | Click | Goes to /app/ai |
| Dashboard → Right sidebar | AI widget | Click "Explore" | Goes to /app/ai |
| Reports page | "Ask AI" banner | Click button | Goes to /app/ai |
| Product form | "Generate with AI" | Click | Opens AI or modal |
| AI Features page | Purchase packages | Buy credits | Adds credits to account |
| Any AI button | Credit check | Auto | Blocks if insufficient |

---

**Implementation Time: 2-3 hours**  
**Testing Time: 1 hour**  
**Total: ~4 hours to fully integrate navigation** 🚀
