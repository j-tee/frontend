# Quick Integration Guide - AI Features

**For:** Development Team  
**Date:** November 7, 2025  
**Time Required:** 30 minutes  

---

## 🚀 5-Minute Quick Start

### 1. Add Environment Variables

Add to your `.env` file:

```env
VITE_AI_FEATURES_ENABLED=true
```

### 2. Add AI Route

In your router file (usually `App.tsx` or `routes.tsx`):

```typescript
import { AIFeaturesPage, PurchaseCreditsModal } from './features/ai'

// Add route
<Route path="/ai" element={<AIFeaturesPage />} />

// Add modal (outside routes, at root level)
<PurchaseCreditsModal />
```

### 3. Add Navigation Link

In your navigation menu:

```typescript
<NavLink to="/ai">
  <span>🤖</span>
  AI Features
</NavLink>
```

### 4. Test It!

Navigate to `/ai` and you should see the AI Features page!

---

## 📍 Recommended Integration Points

### 1. **Dashboard - Credits Widget**

Add credit balance widget to your dashboard sidebar:

```typescript
import { AICreditsWidget } from './features/ai'

// In your Dashboard component
<aside className="dashboard-sidebar">
  {/* Existing widgets */}
  
  <AICreditsWidget showPurchaseOptions={false} />
</aside>
```

**Why?** Users can always see their credit balance.

---

### 2. **Reports Pages - Query Box**

Add AI query box to your reports pages:

```typescript
import { AIQueryBox } from './features/ai'

// In your Reports component
<div className="reports-header">
  <h1>Sales Reports</h1>
  
  <AIQueryBox 
    placeholder="Ask about your sales data..."
  />
</div>
```

**Why?** Users can ask questions about the data they're viewing.

---

### 3. **Customer Management - Credit Assessment**

Add "AI Risk Assessment" button to customer profiles:

```typescript
import { useAppDispatch } from './hooks/useAppDispatch'
import { assessRisk, selectCreditAssessment } from './features/ai'

const CustomerProfile = ({ customerId }) => {
  const dispatch = useAppDispatch()
  const assessment = useAppSelector(selectCreditAssessment)
  
  const handleAssess = async () => {
    await dispatch(assessRisk({
      customer_id: customerId,
      requested_credit_limit: 5000,
      assessment_type: 'new_credit'
    }))
  }
  
  return (
    <div>
      {/* Customer info */}
      
      <button onClick={handleAssess}>
        🤖 AI Credit Assessment
      </button>
      
      {assessment && (
        <div className="assessment-results">
          <h3>Risk Level: {assessment.risk_level}</h3>
          <p>Recommendation: {assessment.recommendation.action}</p>
          <p>{assessment.explanation}</p>
        </div>
      )}
    </div>
  )
}
```

**Why?** AI helps evaluate customer creditworthiness.

---

### 4. **Product Forms - Description Generator**

Add "Generate Description" button to product forms:

```typescript
import { useAppDispatch } from './hooks/useAppDispatch'
import { generateDescription } from './features/ai'

const ProductForm = ({ productId }) => {
  const dispatch = useAppDispatch()
  const [description, setDescription] = useState('')
  
  const handleGenerate = async () => {
    const result = await dispatch(generateDescription({
      product_id: productId,
      tone: 'professional',
      language: 'en',
      include_seo: true
    })).unwrap()
    
    setDescription(result.description)
  }
  
  return (
    <form>
      <label>Description</label>
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
      
      <button type="button" onClick={handleGenerate}>
        🤖 Generate with AI
      </button>
    </form>
  )
}
```

**Why?** Save time writing product descriptions.

---

### 5. **Accounts Receivable - Collection Messages**

Add "Generate Message" to customer payment reminders:

```typescript
import { useAppDispatch } from './hooks/useAppDispatch'
import { generateMessage } from './features/ai'

const SendReminder = ({ customerId }) => {
  const dispatch = useAppDispatch()
  const [message, setMessage] = useState('')
  
  const handleGenerate = async () => {
    const result = await dispatch(generateMessage({
      customer_id: customerId,
      message_type: 'first_reminder',
      tone: 'professional_friendly',
      language: 'en',
      include_payment_plan: false
    })).unwrap()
    
    setMessage(result.body)
  }
  
  return (
    <div>
      <button onClick={handleGenerate}>
        🤖 Generate Professional Message
      </button>
      
      {message && (
        <div>
          <h4>Subject: {result.subject}</h4>
          <textarea value={message} />
          
          <div className="message-options">
            <button>📧 Send Email</button>
            <button>📱 Send SMS</button>
            <button>💬 Send WhatsApp</button>
          </div>
        </div>
      )}
    </div>
  )
}
```

**Why?** Professional collection messages improve payment rates.

---

## 🎨 Styling Integration

### Option 1: Use Existing Theme Colors

Update AI component CSS to match your theme:

```css
/* In your theme CSS file */
.ai-query-box,
.ai-credits-widget,
.purchase-modal {
  /* Override with your brand colors */
  --ai-primary: var(--your-primary-color);
  --ai-secondary: var(--your-secondary-color);
}
```

### Option 2: Keep Default Purple Theme

The AI components use purple gradient by default (modern AI aesthetic). If this works with your design, no changes needed!

---

## 🧪 Testing Your Integration

### 1. **Test Credit Balance**

```bash
# Should show balance or "No credits" message
curl -H "Authorization: Token YOUR_TOKEN" \
  http://localhost:8000/ai/api/credits/balance/
```

### 2. **Test Query**

```bash
# Should return AI response or 402 if no credits
curl -X POST -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"How many products do I have?"}' \
  http://localhost:8000/ai/api/query/
```

### 3. **Test in Browser**

1. Navigate to `/ai`
2. Click "Ask (0.5 credits)" button
3. Should show:
   - Loading spinner
   - Then answer
   - OR "Insufficient credits" if balance < 0.5

---

## 🐛 Troubleshooting

### "Module not found" errors

Make sure you have all files created:
- `src/types/ai.ts` ✅
- `src/services/ai/aiService.ts` ✅
- `src/store/slices/aiSlice.ts` ✅
- `src/features/ai/components/...` ✅

### Redux errors

Make sure `aiReducer` is added to store:

```typescript
// src/store/index.ts
import aiReducer from './slices/aiSlice'

export const store = configureStore({
  reducer: {
    // ... other reducers
    ai: aiReducer, // ← Must be here!
  },
})
```

### 402 errors (insufficient credits)

This is expected! The modal should automatically open. If not:
- Check PurchaseCreditsModal is rendered in your app
- Check Redux state for `purchaseModal.isOpen`

### CORS errors

Backend needs these headers:

```python
# Django settings.py
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",  # Vite dev server
    "https://your-frontend.com",
]
```

---

## 📱 Mobile Responsiveness

All AI components are mobile-responsive! Test on:
- Mobile: 320px - 767px (stacked layout)
- Tablet: 768px - 1199px (2-column grid)
- Desktop: 1200px+ (full layout)

---

## ♿ Accessibility

Components include:
- ✅ ARIA labels
- ✅ Keyboard navigation
- ✅ Focus states
- ✅ Screen reader text
- ⚠️ Color contrast (verify with your theme)

Test with:
- Tab navigation
- Screen readers (NVDA, JAWS, VoiceOver)
- High contrast mode

---

## 🚀 Going Live Checklist

Before deploying AI features to production:

- [ ] Environment variables set (VITE_AI_FEATURES_ENABLED)
- [ ] Backend AI endpoints deployed
- [ ] API base URL configured for production
- [ ] CORS headers configured
- [ ] Test credit purchase flow
- [ ] Test all AI features with real data
- [ ] Monitor error logs
- [ ] Set up analytics tracking
- [ ] Prepare user documentation
- [ ] Train support team

---

## 📞 Need Help?

**Frontend issues:** Check component files for inline documentation  
**Backend issues:** Refer to `AI-FEATURES-API-DOCUMENTATION-FRONTEND.md`  
**Integration issues:** This guide!

---

**That's it! You're ready to integrate AI features! 🎉**
