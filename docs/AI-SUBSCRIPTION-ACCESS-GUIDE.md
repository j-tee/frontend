# AI Features Access & Subscription Upgrade Guide

**For:** Product/Business Team  
**Date:** November 7, 2025  
**Context:** How users with standard subscriptions access AI features

---

## 📊 Business Model Overview

### AI Features Use a **Separate Credit System**

AI features are **NOT** included in standard subscription plans. Instead, they use a **prepaid credit model**:

```
Standard Subscription (GHS 100-200/month)
    ↓
    Gives access to core POS features
    
AI Features (Pay-per-use)
    ↓
    Requires purchasing AI credits separately
    ↓
    GHS 30-180 for credit packages
```

**Why separate?**
1. AI costs money to run (OpenAI API charges)
2. Not all users need AI features
3. Pay-as-you-go fits Ghana market behavior
4. Highly profitable (50-95% margins)

---

## 🎯 How Users Access AI Features

### Step 1: User Has Active Subscription ✅

**Current State:**
- User: Mike Tetteh (from screenshot)
- Business: DataLogique Systems
- Subscription: ACTIVE (standard plan)
- Role: Owner

The user **already has access to the app**. ✅

### Step 2: Discover AI Features 🔍

**Option A: Via Navigation Menu**
```
Dashboard → Navigation Sidebar
    └── "🤖 AI Features" link
            └── Click to go to /app/ai
```

**Option B: Via Dashboard Widget**
```
Dashboard → Right Sidebar
    └── "AI Assistant" widget
            └── "Try AI Features" button
```

**Option C: Via Reports Page**
```
Reports Page → Top Banner
    └── "Ask AI about your data" prompt
            └── Redirects to AI features
```

**Option D: Via Contextual Prompts**
```
Product Form → "Generate Description" button
Customer Profile → "AI Risk Assessment" button
Collections Page → "Generate Message" button
```

### Step 3: First Time - No Credits ⚠️

When user clicks any AI feature for the first time:

```
┌─────────────────────────────────────────┐
│  🤖 AI Features                         │
├─────────────────────────────────────────┤
│                                         │
│  AI Credits Balance                     │
│  ┌───────────────────────────────────┐  │
│  │  💳 0.0 credits                   │  │
│  │  ⚠️ No credits available          │  │
│  └───────────────────────────────────┘  │
│                                         │
│  Purchase AI Credits                    │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐│
│  │ Starter │  │  Value  │  │ Premium ││
│  │ 30 cr   │  │ 100 cr  │  │ 250 cr  ││
│  │ GHS 30  │  │ GHS 80  │  │ GHS 180 ││
│  └─────────┘  └─────────┘  └─────────┘│
└─────────────────────────────────────────┘
```

**User sees:**
- Current balance: 0 credits
- Three purchase options (Starter, Value, Premium)
- Explanation of what credits are for

### Step 4: Purchase Credits 💳

**User clicks "Buy Starter Package (GHS 30)"**

```
1. Click "Buy" button
2. Redirects to payment gateway (Paystack/Hubtel)
3. User pays via:
   - Mobile Money (MTN, Vodafone, AirtelTigo)
   - Card
4. On successful payment:
   - Credits added to account instantly
   - User redirected back to AI features page
   - Balance now shows: 30.0 credits
```

**Payment Flow:**
```
AI Features Page
    ↓
Click "Buy 30 credits"
    ↓
POST /ai/api/credits/purchase/
    ↓
Backend creates payment link
    ↓
Redirect to Paystack
    ↓
User pays with mobile money
    ↓
Paystack callback to backend
    ↓
Backend adds credits to user account
    ↓
Redirect back to /app/ai
    ↓
User sees: "💰 30.0 credits available"
```

### Step 5: Use AI Features ⚡

Now with credits, user can:

**Natural Language Queries (0.5 credits each)**
```
User types: "What were my total sales last month?"
    ↓
Click "Ask (costs 0.5 credits)"
    ↓
AI processes query
    ↓
Returns: "Your total sales in October 2025 were GHS 45,230..."
    ↓
Balance: 30.0 → 29.5 credits
```

**Product Description Generator (0.1 credits)**
```
Product Form → "Generate Description"
    ↓
AI creates professional description
    ↓
Balance: 29.5 → 29.4 credits
```

**Credit Risk Assessment (5.0 credits)**
```
Customer Profile → "AI Risk Assessment"
    ↓
AI analyzes payment history, patterns
    ↓
Returns: Risk Level, Recommendation, Credit Limit
    ↓
Balance: 29.4 → 24.4 credits
```

---

## 💡 Where to Upgrade/Purchase

### AI Credits (Separate from Subscription)

**Location 1: AI Features Page** (Primary)
- **URL:** `/app/ai`
- **Widget:** AICreditsWidget (always visible)
- **Packages:** Starter, Value, Premium

**Location 2: Insufficient Credits Modal** (Auto-triggered)
- **Trigger:** User attempts AI action with insufficient credits
- **Example:** User has 0.3 credits, tries to do query (0.5 needed)
- **Modal:** Shows shortage, suggests packages to buy

**Location 3: Dashboard Widget** (Reminder)
- **Position:** Right sidebar
- **Shows:** Current balance
- **Button:** "Purchase More Credits"

### Subscription Upgrades (Core POS Access)

**Location: Billing Page**
- **URL:** `/app/billing`
- **Button:** Header → User dropdown → "Billing"
- **Purpose:** Upgrade core subscription (more storefronts, users)

**Note:** Subscription upgrades and AI credits are **separate purchases**!

---

## 🔄 Credit Purchase Process (Technical)

### Frontend Flow

```typescript
// User clicks "Buy Value Package (GHS 80)"
dispatch(purchaseCredits({
  package: 'value',     // Starter, Value, Premium
  credits: 100,
  amount: 80,
  currency: 'GHS'
}))

// Backend creates payment link
// Frontend redirects to payment gateway

// After payment success, callback hits backend
// Backend adds credits to user's account

// Frontend detects user returned
dispatch(fetchCreditsBalance())  // Refresh balance

// User sees updated balance: 100.0 credits
```

### Backend Endpoints

```python
# Purchase credits (creates payment)
POST /ai/api/credits/purchase/
{
  "package": "value",
  "credits": 100,
  "amount": 80.00,
  "currency": "GHS",
  "payment_method": "mobile_money"
}

Response:
{
  "payment_link": "https://paystack.com/pay/xyz123",
  "reference": "AI_CREDIT_123456",
  "amount": 80.00
}

# Payment callback (automatic)
POST /ai/api/credits/payment-callback/
{
  "reference": "AI_CREDIT_123456",
  "status": "success",
  "amount": 80.00
}

# Backend action:
1. Verify payment with Paystack
2. Add 100 credits to user's AICreditsBalance
3. Create transaction record
4. Send confirmation email/SMS

# Check balance
GET /ai/api/credits/balance/

Response:
{
  "balance": 100.0,
  "currency": "GHS",
  "last_purchase_date": "2025-11-07T11:30:00Z",
  "total_purchased": 100.0,
  "total_spent": 0.0
}
```

---

## 📋 User Journey - Complete Example

### Scenario: New User Wants to Try AI

**Starting Point:**
- User: Mike Tetteh
- Subscription: Active (GHS 150/month - 3 storefronts)
- AI Credits: 0

**Step-by-Step:**

#### 1. Discovery (2 minutes)
```
Dashboard → Sees "🤖 Try AI Features" banner
    ↓
Clicks banner
    ↓
Lands on /app/ai
```

#### 2. Explore Features (5 minutes)
```
AI Features Page shows:
- What AI can do (6 feature cards)
- How much each costs
- Current balance: 0 credits
- Purchase options
```

User thinks: *"Let me try the cheapest package first"*

#### 3. Purchase Credits (3 minutes)
```
Clicks "Buy Starter (GHS 30 → 30 credits)"
    ↓
Redirects to Paystack
    ↓
Enters phone: 0244123456
    ↓
Approves payment on MTN Mobile Money
    ↓
Redirects back to app
    ↓
Sees: "✅ Purchase successful! Balance: 30.0 credits"
```

#### 4. Use AI Features (Ongoing)
```
First Query:
"What were my top 5 products last month?"
Cost: 0.5 credits
Balance: 30.0 → 29.5 credits

Generate Product Description:
"Premium Cooking Oil 5L"
Cost: 0.1 credits
Balance: 29.5 → 29.4 credits

Credit Risk Assessment:
Customer: Kwame's Wholesale Store
Cost: 5.0 credits
Balance: 29.4 → 24.4 credits
Result: "Low risk. Recommended credit limit: GHS 10,000"

User thinks: *"This is useful! I'll buy more credits."*
```

#### 5. Replenish Credits (When Low)
```
Balance drops to 5.0 credits
    ↓
Widget shows: "⚠️ Low balance"
    ↓
User clicks "Buy Value Package (GHS 80 → 100 credits)"
    ↓
Pays via Mobile Money
    ↓
Balance: 5.0 → 105.0 credits
```

---

## 🎨 UI/UX Highlights

### Always Visible Credit Balance

Every page with AI features shows:

```
┌─────────────────────────┐
│  💳 AI Credits          │
│  24.5 available         │
│  [Buy More Credits]     │
└─────────────────────────┘
```

### Cost Transparency

Every AI button shows the cost:

```
[🤖 Generate Description (0.1 credits)]
[🔍 Ask AI (0.5 credits)]
[📊 Risk Assessment (5.0 credits)]
```

### Insufficient Credits Modal

Auto-appears when user tries to use AI without enough credits:

```
┌─────────────────────────────────────┐
│  ⚠️ Insufficient Credits            │
├─────────────────────────────────────┤
│  This action requires: 5.0 credits  │
│  Your current balance: 1.2 credits  │
│  Shortage: 3.8 credits              │
│                                     │
│  Purchase credits to continue:      │
│  [ Starter - 30cr ]  ← Recommended  │
│  [ Value - 100cr ]                  │
│  [ Premium - 250cr ]                │
└─────────────────────────────────────┘
```

### Usage Tracking

Dashboard shows:
```
Last 30 Days:
- Queries: 45 (22.5 credits)
- Descriptions: 120 (12.0 credits)
- Assessments: 8 (40.0 credits)
Total spent: 74.5 credits
```

---

## 📱 Mobile Experience

AI features are fully responsive:

```
Mobile View:
┌──────────────────┐
│  AI Features     │
│                  │
│  💳 Balance      │
│  24.5 credits    │
│                  │
│  [Buy Credits]   │
│                  │
│  Quick Query:    │
│  [Text input...] │
│  [Ask (0.5cr)]   │
│                  │
│  Features ↓      │
│  🔍 Queries      │
│  📝 Descriptions │
│  💰 Assessments  │
└──────────────────┘
```

---

## 🚀 Launch Strategy

### Phase 1: Soft Launch (Week 1)
- Enable AI features for **existing subscribers only**
- Give **10 free credits** to try
- Monitor usage patterns
- Collect feedback

### Phase 2: Optimize (Week 2-3)
- Adjust pricing based on usage data
- Improve features based on feedback
- Add more AI capabilities

### Phase 3: Market (Week 4+)
- Add AI features to marketing materials
- "Now with AI Assistant!" banner
- Email existing users about AI
- Offer promotional packages

### Promotional Ideas

**Launch Special:**
```
First 100 users get:
- 50 free credits (normally GHS 40)
- 20% discount on first purchase
- Unlimited queries for 7 days
```

**Referral Program:**
```
Refer a friend who buys AI credits:
- You get: 10 free credits
- Friend gets: 10% discount
```

**Bundle Deals:**
```
Upgrade to Professional Plan + Buy 100 AI credits
= Save GHS 20 (GHS 180 instead of GHS 200)
```

---

## 💼 Business Impact Projections

### Revenue Potential

**Conservative Scenario (500 users):**
```
- 30% try AI features (150 users)
- Average purchase: GHS 80/month
Monthly AI revenue: GHS 12,000
Annual AI revenue: GHS 144,000 ✅
```

**Optimistic Scenario (1000 users):**
```
- 50% try AI features (500 users)
- Average purchase: GHS 100/month
Monthly AI revenue: GHS 50,000
Annual AI revenue: GHS 600,000 ✅✅
```

**AI costs (50% margin):**
```
Monthly cost: GHS 25,000
Profit: GHS 25,000/month = GHS 300,000/year
```

### Competitive Advantage

**Without AI:**
- "Another POS system"
- Price-based competition
- Low switching costs

**With AI:**
- "Smart POS with AI insights"
- Value-based competition
- High switching costs (users love AI)
- Premium pricing justified

---

## ❓ FAQ

### Q: Do I need to upgrade my subscription to use AI?
**A:** No! AI features are separate. You keep your current subscription and buy AI credits separately.

### Q: What happens if I run out of credits?
**A:** AI features will prompt you to purchase more. You can buy credits anytime.

### Q: Do credits expire?
**A:** Yes, after 1 year of inactivity. But we send reminders before expiry.

### Q: Can I get a refund?
**A:** Credits are non-refundable, but they never expire if you use them.

### Q: Is there a free trial?
**A:** Yes! First-time users get 10 free credits to try AI features.

### Q: Can I buy credits for my team?
**A:** Yes! Business owner can purchase credits that all team members use.

### Q: What if AI gives wrong answers?
**A:** We don't charge credits for failed queries. Only successful responses cost credits.

---

## 🔧 Technical Integration Points

### Navigation Menu Update

Add to sidebar:
```typescript
{
  label: '🤖 AI Features',
  to: '/app/ai',
  icon: 'ai',
  badge: aiCreditsBalance < 10 ? 'Low' : null
}
```

### Dashboard Widget

Add to right sidebar:
```tsx
<AICreditsWidget 
  showPurchaseOptions={false}
  compact={true}
  onBuyCredits={() => navigate('/app/ai')}
/>
```

### Contextual Integrations

**Product Form:**
```tsx
<Button onClick={handleGenerateDescription}>
  🤖 Generate with AI (0.1 credits)
</Button>
```

**Customer Profile:**
```tsx
<Button onClick={handleRiskAssessment}>
  🤖 AI Risk Assessment (5.0 credits)
</Button>
```

**Reports Page:**
```tsx
<AIQueryBox placeholder="Ask about your sales..." />
```

---

## 📊 Success Metrics

Track these KPIs:

1. **Adoption Rate:** % of subscribers who try AI
2. **Purchase Rate:** % who buy credits after trying
3. **Average Purchase:** GHS spent per user
4. **Repeat Purchase:** % who buy again within 30 days
5. **Feature Usage:** Most/least used AI features
6. **Credit Burn Rate:** Average credits spent per user/month
7. **Satisfaction Score:** User ratings of AI quality

**Target Metrics (3 months):**
- Adoption: 40% of active subscribers
- Purchase rate: 60% of trial users
- Average purchase: GHS 80/month
- Repeat purchase: 70%

---

## 🎯 Conclusion

### Key Takeaways

✅ **AI is separate** from core subscription  
✅ **Prepaid credits** model (GHS 30-180 packages)  
✅ **Pay-per-use** fits Ghana market  
✅ **High margins** (50-95% profit)  
✅ **Easy access** - one click from any page  
✅ **Transparent pricing** - costs shown upfront  
✅ **Mobile-friendly** - works on all devices  

### Next Steps for Product Team

1. **Add AI link to navigation** (30 min)
2. **Add dashboard widget** (1 hour)
3. **Test payment flow** with Paystack (2 hours)
4. **Create launch email** template (1 hour)
5. **Prepare user documentation** (2 hours)
6. **Train support team** on AI features (1 day)

**Total: ~1 week to fully launch** 🚀

---

**Questions?** Contact frontend team or check:
- `AI-FRONTEND-IMPLEMENTATION-COMPLETE.md` - Technical details
- `AI-QUICK-INTEGRATION-GUIDE.md` - Integration steps
- `AI-FEATURES-API-DOCUMENTATION-FRONTEND.md` - API docs
