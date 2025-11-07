# AI Features API Documentation for Frontend Team

**Backend Implementation Complete** ✅  
**Date:** November 7, 2025  
**Django Backend Developer:** Senior Developer  
**For:** Frontend/React Development Team

---

## 📋 Overview

The AI features backend has been successfully integrated into your POS system. This document provides all the information needed to integrate these AI features into your React frontend application.

**Base URL:** `https://your-domain.com/ai/`

All endpoints require authentication via token in the header:
```
Authorization: Token YOUR_AUTH_TOKEN_HERE
```

---

## 🔐 Authentication

All AI endpoints use the same authentication as your existing POS endpoints:

```javascript
const headers = {
  'Authorization': `Token ${userToken}`,
  'Content-Type': 'application/json'
};
```

---

## 💰 AI Credit Management Endpoints

### 1. Get Credit Balance

**Endpoint:** `GET /ai/api/credits/balance/`

**Description:** Get the current AI credit balance for the authenticated user's business.

**Request:**
```javascript
fetch('https://your-domain.com/ai/api/credits/balance/', {
  method: 'GET',
  headers: {
    'Authorization': `Token ${userToken}`,
  }
})
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "business": "uuid",
  "balance": 45.50,
  "purchased_at": "2025-11-07T10:00:00Z",
  "updated_at": "2025-11-07T15:30:00Z",
  "expires_at": "2026-05-07T10:00:00Z",
  "is_active": true,
  "is_expired": false,
  "days_until_expiry": 180
}
```

**Response when no credits:** `200 OK`
```json
{
  "balance": 0.00,
  "message": "No active AI credits. Purchase credits to get started."
}
```

---

### 2. Purchase AI Credits

**Endpoint:** `POST /ai/api/credits/purchase/`

**Description:** Purchase AI credit packages.

**Credit Packages:**
- **Starter:** GHS 30 = 30 credits (no bonus)
- **Value:** GHS 80 = 100 credits (20 credits bonus = 25% extra)
- **Premium:** GHS 180 = 250 credits (70 credits bonus = 39% extra)
- **Custom:** Pay any amount, get 1:1 credits

**Request:**
```javascript
const purchaseData = {
  package: "value",  // "starter" | "value" | "premium" | "custom"
  payment_method: "mobile_money"  // "mobile_money" | "card"
};

// For custom package
const customPurchaseData = {
  package: "custom",
  custom_amount: 50.00,  // Required for custom
  payment_method: "mobile_money"
};

fetch('https://your-domain.com/ai/api/credits/purchase/', {
  method: 'POST',
  headers: {
    'Authorization': `Token ${userToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(purchaseData)
})
```

**Response:** `201 Created`
```json
{
  "purchase_id": "uuid",
  "credits_added": 100.00,
  "new_balance": 145.50,
  "expires_at": "2026-05-07T10:00:00Z",
  "payment_reference": "AI-CREDIT-1699357200"
}
```

**Error Response:** `400 Bad Request`
```json
{
  "error": "custom_amount required for custom package"
}
```

---

### 3. Get Usage Statistics

**Endpoint:** `GET /ai/api/usage/stats/?days=30`

**Description:** Get AI usage statistics for the business.

**Query Parameters:**
- `days` (optional, default=30): Number of days to look back

**Request:**
```javascript
fetch('https://your-domain.com/ai/api/usage/stats/?days=30', {
  method: 'GET',
  headers: {
    'Authorization': `Token ${userToken}`,
  }
})
```

**Response:** `200 OK`
```json
{
  "period_days": 30,
  "current_balance": 45.50,
  "total_requests": 150,
  "successful_requests": 148,
  "failed_requests": 2,
  "total_credits_used": 75.20,
  "total_cost_ghs": 25.40,
  "avg_processing_time_ms": 850,
  "feature_breakdown": [
    {
      "feature": "natural_language_query",
      "count": 80,
      "credits_used": 40.00
    },
    {
      "feature": "product_description",
      "count": 50,
      "credits_used": 5.00
    },
    {
      "feature": "collection_message",
      "count": 18,
      "credits_used": 9.00
    }
  ]
}
```

---

### 4. Get Transaction History

**Endpoint:** `GET /ai/api/transactions/?limit=50&feature=natural_language_query`

**Description:** Get AI transaction history with optional filtering.

**Query Parameters:**
- `limit` (optional, default=50): Max number of records
- `feature` (optional): Filter by specific feature

**Request:**
```javascript
fetch('https://your-domain.com/ai/api/transactions/?limit=20', {
  method: 'GET',
  headers: {
    'Authorization': `Token ${userToken}`,
  }
})
```

**Response:** `200 OK`
```json
{
  "count": 150,
  "results": [
    {
      "id": "uuid",
      "business": "uuid",
      "user": "uuid",
      "feature": "natural_language_query",
      "feature_display": "Natural Language Query",
      "credits_used": 0.50,
      "cost_to_us": 0.008,
      "tokens_used": 523,
      "timestamp": "2025-11-07T15:45:00Z",
      "success": true,
      "error_message": "",
      "processing_time_ms": 1250
    }
  ]
}
```

---

### 5. Check Feature Availability

**Endpoint:** `GET /ai/api/check-availability/?feature=natural_language_query`

**Description:** Check if user has enough credits for a specific feature before making the request.

**Query Parameters:**
- `feature` (required): Feature name to check

**Feature Names:**
- `natural_language_query` (0.5 credits)
- `product_description` (0.1 credits)
- `collection_message` (0.5 credits)
- `credit_assessment` (3.0 credits)
- `collection_priority` (5.0 credits)
- `portfolio_dashboard` (5.0 credits)
- `payment_prediction` (1.0 credits)
- `inventory_forecast` (4.0 credits)
- `report_narrative` (0.2 credits)

**Request:**
```javascript
fetch('https://your-domain.com/ai/api/check-availability/?feature=natural_language_query', {
  method: 'GET',
  headers: {
    'Authorization': `Token ${userToken}`,
  }
})
```

**Response:** `200 OK`
```json
{
  "available": true,
  "feature": "natural_language_query",
  "cost": 0.50,
  "current_balance": 45.50,
  "shortage": 0.0
}
```

**When insufficient credits:**
```json
{
  "available": false,
  "feature": "credit_assessment",
  "cost": 3.00,
  "current_balance": 2.50,
  "shortage": 0.50
}
```

---

## 🤖 Natural Language Query Endpoint

### Process Natural Language Query

**Endpoint:** `POST /ai/api/query/`

**Description:** Ask questions about your business data in plain English. **This is what answers questions like "How many Samsung TVs were sold between January and March?"**

**Cost:** 0.5 credits per query

**Request:**
```javascript
const queryData = {
  query: "How many Samsung TVs were sold between January and March?",
  storefront_id: "uuid"  // Optional: Filter to specific storefront
};

fetch('https://your-domain.com/ai/api/query/', {
  method: 'POST',
  headers: {
    'Authorization': `Token ${userToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(queryData)
})
```

**Example Queries:**
- "How many Samsung TVs were sold between January and March?"
- "What were my total sales this month?"
- "Which product is my top seller?"
- "Show me customers who haven't bought in 90 days"
- "What products are out of stock?"
- "What's my profit this month?"

**Response:** `200 OK`
```json
{
  "answer": "Based on your sales data, 127 Samsung TVs were sold between January and March 2025, generating GHS 152,400 in revenue. This represents 23% of your total electronics sales for that period.\n\nKey insights:\n• January: 45 units (GHS 54,000)\n• February: 42 units (GHS 50,400)\n• March: 40 units (GHS 48,000)\n• Average price per unit: GHS 1,200\n• Sales trend: Declining slightly month-over-month",
  
  "query_type": "product",
  
  "data": {
    "products": [
      {
        "product__id": "uuid",
        "product__name": "Samsung 55\" QLED TV",
        "product__sku": "SAM-TV-55-001",
        "total_quantity": 127,
        "total_revenue": 152400.00,
        "transaction_count": 115
      }
    ],
    "total_products": 1
  },
  
  "follow_up_questions": [
    "Which products have the highest profit margins?",
    "Show me slow-moving products",
    "What products need restocking?"
  ],
  
  "visualization_hints": {
    "type": "bar_chart",
    "x_axis": "product_name",
    "y_axis": "total_quantity",
    "title": "Product Sales Comparison"
  },
  
  "credits_used": 0.50,
  "new_balance": 45.00,
  "processing_time_ms": 1250
}
```

**Error - Insufficient Credits:** `402 Payment Required`
```json
{
  "error": "insufficient_credits",
  "message": "You need 0.5 credits for this query. Purchase more to continue.",
  "current_balance": 0.20,
  "required_credits": 0.50
}
```

**Error - Processing Failed:** `500 Internal Server Error`
```json
{
  "error": "processing_failed",
  "message": "Error details here"
}
```

---

## 📝 Product Description Generator

### Generate Product Description

**Endpoint:** `POST /ai/api/products/generate-description/`

**Description:** Generate AI-powered product descriptions for e-commerce/catalog.

**Cost:** 0.1 credits per generation

**Request:**
```javascript
const descriptionData = {
  product_id: "uuid",
  tone: "professional",  // "professional" | "casual" | "technical" | "marketing"
  language: "en",  // "en" | "tw"
  include_seo: true
};

fetch('https://your-domain.com/ai/api/products/generate-description/', {
  method: 'POST',
  headers: {
    'Authorization': `Token ${userToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(descriptionData)
})
```

**Response:** `200 OK`
```json
{
  "description": "Experience cinema-quality entertainment with this Samsung 55\" QLED TV. Featuring Quantum Dot technology, this television delivers stunning picture quality with over a billion shades of vibrant, accurate color. The 4K resolution ensures every detail is crystal clear, while the intelligent processor optimizes content in real-time.\n\nDesigned for modern living spaces, the sleek, minimalist design complements any room décor. Smart TV capabilities provide easy access to your favorite streaming services, and built-in voice control makes finding content effortless. Whether you're watching movies, sports, or gaming, this QLED TV transforms your entertainment experience.",
  
  "short_description": "Samsung 55\" QLED TV with stunning 4K picture quality and smart features",
  
  "seo_keywords": [
    "samsung tv",
    "qled television",
    "55 inch tv",
    "4k television",
    "smart tv",
    "quantum dot tv",
    "samsung qled"
  ],
  
  "meta_description": "Shop Samsung 55\" QLED TV - Crystal clear 4K picture, Quantum Dot technology, smart features. Experience cinema-quality entertainment at home.",
  
  "credits_used": 0.10,
  "new_balance": 44.90
}
```

**Error - Product Not Found:** `404 Not Found`
```json
{
  "error": "Product not found"
}
```

---

## 💼 Smart Collections Endpoints

### 1. Generate Collection Message

**Endpoint:** `POST /ai/api/collections/message/`

**Description:** Generate personalized, culturally-appropriate collection messages for customers with outstanding balances.

**Cost:** 0.5 credits per message

**Request:**
```javascript
const messageData = {
  customer_id: "uuid",
  message_type: "first_reminder",  // "first_reminder" | "second_reminder" | "final_notice" | "payment_plan_offer"
  tone: "professional_friendly",  // "professional_friendly" | "firm" | "formal_legal"
  language: "en",  // "en" | "tw"
  include_payment_plan: false
};

fetch('https://your-domain.com/ai/api/collections/message/', {
  method: 'POST',
  headers: {
    'Authorization': `Token ${userToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(messageData)
})
```

**Response:** `200 OK`
```json
{
  "subject": "Friendly Reminder: Outstanding Balance - Invoice #INV-2024-1234",
  
  "body": "Dear Mr. Mensah,\n\nI hope this message finds you well and business is thriving.\n\nThis is a gentle reminder regarding your outstanding balance of GHS 15,000.00. We value our business relationship and want to ensure everything is going smoothly on your end.\n\nOutstanding invoices:\n• Invoice #INV-2024-1234 - GHS 10,000.00 (Due: Oct 15, 2024)\n• Invoice #INV-2024-1256 - GHS 5,000.00 (Due: Oct 30, 2024)\n\nIf you've already made payment, please disregard this message. If you're experiencing any challenges, I'd be happy to discuss a payment plan that works for you.\n\nPlease feel free to contact us to discuss this matter.\n\nBest regards,\n[Your Business Name]",
  
  "sms_version": "Dear Mr. Mensah, gentle reminder that invoice INV-2024-1234 (GHS 15,000) is overdue. Please contact us to arrange payment or discuss a plan. Thank you.",
  
  "whatsapp_version": "Hello Mr. Mensah 👋\n\nJust a friendly reminder about your outstanding balance of GHS 15,000.00 📋\n\nWe value our partnership and want to help if there are any issues. Can we arrange payment or would a payment plan work better?\n\nLet's chat! 📞",
  
  "credits_used": 0.50,
  "new_balance": 44.40
}
```

**Error - Customer Not Found:** `404 Not Found`
```json
{
  "error": "Customer not found"
}
```

---

### 2. Credit Risk Assessment

**Endpoint:** `POST /ai/api/credit/assess/`

**Description:** AI-powered credit risk assessment for approving or adjusting customer credit limits.

**Cost:** 3.0 credits per assessment

**Request:**
```javascript
const assessmentData = {
  customer_id: "uuid",
  requested_credit_limit: 5000.00,
  assessment_type: "new_credit"  // "new_credit" | "increase" | "renewal"
};

fetch('https://your-domain.com/ai/api/credit/assess/', {
  method: 'POST',
  headers: {
    'Authorization': `Token ${userToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(assessmentData)
})
```

**Response:** `200 OK`
```json
{
  "customer": {
    "id": "uuid",
    "name": "ABC Wholesale",
    "current_limit": 0.00,
    "requested_limit": 5000.00
  },
  
  "risk_score": 72,
  "risk_level": "MEDIUM",
  
  "recommendation": {
    "action": "APPROVE_PARTIAL",
    "suggested_limit": 3000.00,
    "suggested_terms_days": 30,
    "confidence": 0.78
  },
  
  "analysis": {
    "positive_factors": [
      "Perfect payment history over 6 months",
      "Purchase frequency is consistent (weekly)",
      "Average order value stable at GHS 1,200",
      "No overdue payments in history"
    ],
    "risk_factors": [
      "Only 6 months of history (prefer 12+ months)",
      "Requested limit is 3x average monthly purchases",
      "No previous credit history"
    ],
    "comparable_customers": {
      "similar_approved_limit_avg": 3500.00,
      "default_rate_for_similar_profile": "8%"
    }
  },
  
  "conditions": [
    "Start with GHS 3,000 limit",
    "Review after 3 months of good payment",
    "Require monthly statements",
    "Personal guarantee recommended"
  ],
  
  "explanation": "Based on ABC Wholesale's solid 6-month track record of consistent purchases and perfect payment history, they demonstrate good credit discipline. However, the limited history and high requested limit relative to their purchase patterns suggest starting with a conservative GHS 3,000 limit. This allows them to prove their ability to manage larger credit while minimizing your risk. After 3 months of on-time payments, consider increasing to their requested amount.",
  
  "credits_used": 3.00,
  "new_balance": 41.40
}
```

**Possible Actions:**
- `APPROVE_FULL`: Approve full requested amount
- `APPROVE_PARTIAL`: Approve reduced amount
- `DENY`: Deny credit request
- `REQUIRE_MORE_INFO`: Need additional information

**Possible Risk Levels:**
- `LOW`: Safe to approve
- `MEDIUM`: Approve with caution
- `HIGH`: High risk, careful consideration needed
- `CRITICAL`: Very high risk, likely deny

---

## 🎨 React Component Examples

### Natural Language Query Component

```jsx
import React, { useState } from 'react';

const AIQueryBox = () => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(null);

  const handleQuery = async () => {
    setLoading(true);
    
    try {
      const response = await fetch('https://your-domain.com/ai/api/query/', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query })
      });
      
      if (response.status === 402) {
        const error = await response.json();
        alert(`Insufficient credits: ${error.message}`);
        return;
      }
      
      const data = await response.json();
      setResult(data);
      setBalance(data.new_balance);
    } catch (error) {
      console.error('Query failed:', error);
      alert('Query failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-query-box">
      <div className="query-header">
        <h3>🤖 Ask About Your Business</h3>
        {balance !== null && (
          <span className="credit-balance">
            Credits: {balance.toFixed(2)}
          </span>
        )}
      </div>
      
      <div className="query-input-section">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask a question... (e.g., 'How many Samsung TVs were sold in January?')"
          rows={3}
        />
        
        <button 
          onClick={handleQuery} 
          disabled={loading || !query.trim()}
        >
          {loading ? 'Thinking...' : 'Ask (0.5 credits)'}
        </button>
      </div>
      
      {result && (
        <div className="query-result">
          <div className="answer">
            <h4>✅ Answer</h4>
            <p style={{ whiteSpace: 'pre-wrap' }}>{result.answer}</p>
          </div>
          
          {result.follow_up_questions && (
            <div className="follow-up-questions">
              <h5>❓ You might also want to ask:</h5>
              <div className="follow-up-buttons">
                {result.follow_up_questions.map((q, i) => (
                  <button 
                    key={i}
                    onClick={() => setQuery(q)}
                    className="follow-up-btn"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div className="query-meta">
            <small>
              Processed in {result.processing_time_ms}ms | 
              Credits used: {result.credits_used}
            </small>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIQueryBox;
```

### Credit Balance Widget

```jsx
import React, { useState, useEffect } from 'react';

const AICreditsWidget = () => {
  const [credits, setCredits] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    try {
      const response = await fetch('https://your-domain.com/ai/api/credits/balance/', {
        headers: {
          'Authorization': `Token ${localStorage.getItem('token')}`,
        }
      });
      
      const data = await response.json();
      setCredits(data);
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (packageType) => {
    try {
      const response = await fetch('https://your-domain.com/ai/api/credits/purchase/', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          package: packageType,
          payment_method: 'mobile_money'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(`Successfully purchased ${data.credits_added} credits!`);
        fetchBalance(); // Refresh balance
      }
    } catch (error) {
      console.error('Purchase failed:', error);
    }
  };

  if (loading) return <div>Loading credits...</div>;

  return (
    <div className="ai-credits-widget">
      <div className="balance-display">
        <h4>AI Credits</h4>
        <div className="balance-amount">
          {credits?.balance?.toFixed(2) || '0.00'}
        </div>
        {credits?.days_until_expiry && (
          <small>Expires in {credits.days_until_expiry} days</small>
        )}
      </div>
      
      {credits?.balance < 10 && (
        <div className="low-balance-warning">
          ⚠️ Low balance! Purchase more credits to continue using AI features.
        </div>
      )}
      
      <div className="purchase-options">
        <button onClick={() => handlePurchase('starter')}>
          Buy Starter Pack<br/>
          <small>GHS 30 = 30 credits</small>
        </button>
        
        <button onClick={() => handlePurchase('value')} className="recommended">
          Buy Value Pack<br/>
          <small>GHS 80 = 100 credits (+25% bonus!)</small>
        </button>
        
        <button onClick={() => handlePurchase('premium')}>
          Buy Premium Pack<br/>
          <small>GHS 180 = 250 credits (+39% bonus!)</small>
        </button>
      </div>
    </div>
  );
};

export default AICreditsWidget;
```

### Collection Message Generator Component

```jsx
import React, { useState } from 'react';

const CollectionMessageGenerator = ({ customerId }) => {
  const [messageType, setMessageType] = useState('first_reminder');
  const [tone, setTone] = useState('professional_friendly');
  const [language, setLanguage] = useState('en');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateMessage = async () => {
    setLoading(true);
    
    try {
      const response = await fetch('https://your-domain.com/ai/api/collections/message/', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_id: customerId,
          message_type: messageType,
          tone: tone,
          language: language,
          include_payment_plan: false
        })
      });
      
      if (response.status === 402) {
        const error = await response.json();
        alert(`Insufficient credits: ${error.message}`);
        return;
      }
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Failed to generate message:', error);
      alert('Failed to generate message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  return (
    <div className="collection-message-generator">
      <h3>🤖 AI Collection Message Generator</h3>
      
      <div className="message-options">
        <div className="option-group">
          <label>Message Type:</label>
          <select value={messageType} onChange={(e) => setMessageType(e.target.value)}>
            <option value="first_reminder">First Reminder</option>
            <option value="second_reminder">Second Reminder</option>
            <option value="final_notice">Final Notice</option>
            <option value="payment_plan_offer">Payment Plan Offer</option>
          </select>
        </div>
        
        <div className="option-group">
          <label>Tone:</label>
          <select value={tone} onChange={(e) => setTone(e.target.value)}>
            <option value="professional_friendly">Professional & Friendly</option>
            <option value="firm">Firm</option>
            <option value="formal_legal">Formal/Legal</option>
          </select>
        </div>
        
        <div className="option-group">
          <label>Language:</label>
          <select value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="en">English</option>
            <option value="tw">Twi</option>
          </select>
        </div>
      </div>
      
      <button 
        onClick={generateMessage} 
        disabled={loading}
        className="generate-btn"
      >
        {loading ? 'Generating...' : 'Generate Message (0.5 credits)'}
      </button>
      
      {result && (
        <div className="message-result">
          <div className="message-section">
            <h4>📧 Email Message</h4>
            <div className="message-header">
              <strong>Subject:</strong> {result.subject}
            </div>
            <div className="message-body">
              <pre>{result.body}</pre>
            </div>
            <button onClick={() => copyToClipboard(result.body)}>
              Copy Email
            </button>
          </div>
          
          <div className="message-section">
            <h4>📱 SMS Version</h4>
            <div className="message-body">
              <pre>{result.sms_version}</pre>
            </div>
            <button onClick={() => copyToClipboard(result.sms_version)}>
              Copy SMS
            </button>
          </div>
          
          <div className="message-section">
            <h4>💬 WhatsApp Version</h4>
            <div className="message-body">
              <pre>{result.whatsapp_version}</pre>
            </div>
            <button onClick={() => copyToClipboard(result.whatsapp_version)}>
              Copy WhatsApp
            </button>
          </div>
          
          <div className="message-meta">
            <small>Credits used: {result.credits_used} | New balance: {result.new_balance}</small>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollectionMessageGenerator;
```

### Credit Risk Assessment Component

```jsx
import React, { useState } from 'react';

const CreditRiskAssessment = ({ customerId, customerName }) => {
  const [requestedLimit, setRequestedLimit] = useState('');
  const [assessmentType, setAssessmentType] = useState('new_credit');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const assessCredit = async () => {
    if (!requestedLimit || parseFloat(requestedLimit) <= 0) {
      alert('Please enter a valid credit limit');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('https://your-domain.com/ai/api/credit/assess/', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_id: customerId,
          requested_credit_limit: parseFloat(requestedLimit),
          assessment_type: assessmentType
        })
      });
      
      if (response.status === 402) {
        const error = await response.json();
        alert(`Insufficient credits: ${error.message}`);
        return;
      }
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Assessment failed:', error);
      alert('Assessment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevelColor = (level) => {
    const colors = {
      'LOW': '#22c55e',
      'MEDIUM': '#eab308',
      'HIGH': '#f97316',
      'CRITICAL': '#ef4444'
    };
    return colors[level] || '#6b7280';
  };

  const getActionColor = (action) => {
    const colors = {
      'APPROVE_FULL': '#22c55e',
      'APPROVE_PARTIAL': '#3b82f6',
      'DENY': '#ef4444',
      'REQUIRE_MORE_INFO': '#eab308'
    };
    return colors[action] || '#6b7280';
  };

  return (
    <div className="credit-risk-assessment">
      <h3>🎯 AI Credit Risk Assessment</h3>
      <p className="customer-name">Customer: <strong>{customerName}</strong></p>
      
      <div className="assessment-form">
        <div className="form-group">
          <label>Requested Credit Limit (GHS):</label>
          <input
            type="number"
            value={requestedLimit}
            onChange={(e) => setRequestedLimit(e.target.value)}
            placeholder="e.g., 5000"
            min="0"
            step="100"
          />
        </div>
        
        <div className="form-group">
          <label>Assessment Type:</label>
          <select value={assessmentType} onChange={(e) => setAssessmentType(e.target.value)}>
            <option value="new_credit">New Credit Request</option>
            <option value="increase">Credit Limit Increase</option>
            <option value="renewal">Credit Renewal</option>
          </select>
        </div>
        
        <button 
          onClick={assessCredit} 
          disabled={loading}
          className="assess-btn"
        >
          {loading ? 'Analyzing...' : 'Assess Risk (3.0 credits)'}
        </button>
      </div>
      
      {result && (
        <div className="assessment-result">
          <div className="risk-overview">
            <div className="risk-score">
              <h4>Risk Score</h4>
              <div className="score-value">{result.risk_score}/100</div>
              <div 
                className="risk-level"
                style={{ color: getRiskLevelColor(result.risk_level) }}
              >
                {result.risk_level}
              </div>
            </div>
            
            <div className="recommendation">
              <h4>Recommendation</h4>
              <div 
                className="action"
                style={{ color: getActionColor(result.recommendation.action) }}
              >
                {result.recommendation.action.replace(/_/g, ' ')}
              </div>
              <div className="suggested-limit">
                Suggested Limit: <strong>GHS {result.recommendation.suggested_limit.toFixed(2)}</strong>
              </div>
              <div className="confidence">
                Confidence: {(result.recommendation.confidence * 100).toFixed(0)}%
              </div>
            </div>
          </div>
          
          <div className="analysis-section">
            <h4>✅ Positive Factors</h4>
            <ul>
              {result.analysis.positive_factors.map((factor, i) => (
                <li key={i} className="positive-factor">{factor}</li>
              ))}
            </ul>
          </div>
          
          <div className="analysis-section">
            <h4>⚠️ Risk Factors</h4>
            <ul>
              {result.analysis.risk_factors.map((factor, i) => (
                <li key={i} className="risk-factor">{factor}</li>
              ))}
            </ul>
          </div>
          
          <div className="analysis-section">
            <h4>📋 Recommended Conditions</h4>
            <ul>
              {result.conditions.map((condition, i) => (
                <li key={i}>{condition}</li>
              ))}
            </ul>
          </div>
          
          <div className="explanation-section">
            <h4>💡 AI Explanation</h4>
            <p>{result.explanation}</p>
          </div>
          
          {result.analysis.comparable_customers && (
            <div className="comparable-section">
              <h4>📊 Comparable Customers</h4>
              <p>Average approved limit: GHS {result.analysis.comparable_customers.similar_approved_limit_avg.toFixed(2)}</p>
              <p>Default rate: {result.analysis.comparable_customers.default_rate_for_similar_profile}</p>
            </div>
          )}
          
          <div className="assessment-meta">
            <small>Credits used: {result.credits_used} | New balance: {result.new_balance}</small>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditRiskAssessment;
```

---

## 📊 Feature Cost Reference

Quick reference for frontend developers to show users:

| Feature | Credits | GHS Cost | Use Case |
|---------|---------|----------|----------|
| Natural Language Query | 0.5 | GHS 0.50 | Ask questions about business data |
| Product Description | 0.1 | GHS 0.10 | Generate product descriptions |
| Collection Message | 0.5 | GHS 0.50 | Create payment reminder messages |
| Credit Risk Assessment | 3.0 | GHS 3.00 | Analyze customer creditworthiness |
| Collection Priority | 5.0 | GHS 5.00 | Prioritize collection efforts |
| Payment Prediction | 1.0 | GHS 1.00 | Predict when customer will pay |
| Inventory Forecast | 4.0 | GHS 4.00 | Forecast inventory needs |
| Report Narrative | 0.2 | GHS 0.20 | Generate report summaries |

---

## 🚨 Error Handling

All endpoints follow consistent error patterns:

**402 Payment Required** - Insufficient credits
```json
{
  "error": "insufficient_credits",
  "message": "You need X credits. Current balance: Y",
  "current_balance": 2.50,
  "required_credits": 3.00
}
```

**400 Bad Request** - Invalid parameters
```json
{
  "field_name": ["Error message"],
  "another_field": ["Another error"]
}
```

**404 Not Found** - Resource doesn't exist
```json
{
  "error": "Product not found"
}
```

**500 Internal Server Error** - Processing failed
```json
{
  "error": "processing_failed",
  "message": "Detailed error message"
}
```

**Example Error Handling:**
```javascript
const makeAIRequest = async (endpoint, options) => {
  try {
    const response = await fetch(endpoint, options);
    
    if (response.status === 402) {
      // Insufficient credits - prompt user to purchase
      const error = await response.json();
      showPurchaseModal(error);
      return null;
    }
    
    if (response.status === 404) {
      const error = await response.json();
      showNotification('error', error.error || 'Resource not found');
      return null;
    }
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Request failed');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API Error:', error);
    showNotification('error', error.message || 'An error occurred');
    return null;
  }
};
```

---

## 🎯 Best Practices for Frontend Integration

### 1. Check Credits Before Expensive Operations

Always use the `check-availability` endpoint before making expensive AI calls (3+ credits):

```javascript
const performExpensiveAIOperation = async (feature, requestData) => {
  // Check if user has enough credits
  const availability = await fetch(
    `https://your-domain.com/ai/api/check-availability/?feature=${feature}`,
    {
      headers: {
        'Authorization': `Token ${localStorage.getItem('token')}`,
      }
    }
  ).then(res => res.json());
  
  if (!availability.available) {
    // Show purchase modal with exact shortage amount
    showPurchaseModal({
      required: availability.cost,
      current: availability.current_balance,
      shortage: availability.shortage
    });
    return;
  }
  
  // Proceed with the actual AI request
  const result = await makeAIRequest(requestData);
  return result;
};
```

### 2. Display Credit Balance Prominently

Always show the current credit balance in the UI:

```javascript
// Fetch balance on app load and after purchases
const fetchAndDisplayBalance = async () => {
  const balance = await fetch('https://your-domain.com/ai/api/credits/balance/', {
    headers: {
      'Authorization': `Token ${localStorage.getItem('token')}`,
    }
  }).then(res => res.json());
  
  // Update UI
  document.getElementById('credit-balance').textContent = balance.balance.toFixed(2);
  
  // Show warning if low
  if (balance.balance < 10) {
    showLowCreditWarning(balance.balance);
  }
};
```

### 3. Cache Product Descriptions

Product descriptions rarely change, so cache them locally:

```javascript
const getProductDescription = async (productId) => {
  // Check local cache first
  const cached = localStorage.getItem(`ai_desc_${productId}`);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Generate new description
  const description = await fetch('https://your-domain.com/ai/api/products/generate-description/', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      product_id: productId,
      tone: 'professional',
      language: 'en',
      include_seo: true
    })
  }).then(res => res.json());
  
  // Cache for 30 days
  localStorage.setItem(`ai_desc_${productId}`, JSON.stringify(description));
  
  return description;
};
```

### 4. Implement Loading States

Always show clear loading indicators for AI operations:

```javascript
const AILoadingIndicator = ({ message }) => (
  <div className="ai-loading">
    <div className="spinner"></div>
    <p>{message || 'AI is thinking...'}</p>
    <small>This may take a few seconds</small>
  </div>
);
```

### 5. Handle 402 (Insufficient Credits) Gracefully

Create a reusable purchase modal:

```javascript
const PurchaseCreditsModal = ({ requiredCredits, currentBalance, onPurchase, onClose }) => {
  const shortage = requiredCredits - currentBalance;
  
  return (
    <div className="modal">
      <h3>⚠️ Insufficient AI Credits</h3>
      <p>You need <strong>{requiredCredits} credits</strong> for this operation.</p>
      <p>Current balance: <strong>{currentBalance.toFixed(2)} credits</strong></p>
      <p>Shortage: <strong>{shortage.toFixed(2)} credits</strong></p>
      
      <div className="purchase-options">
        <button onClick={() => onPurchase('starter')}>
          Starter Pack - GHS 30<br/>
          <small>Get 30 credits</small>
        </button>
        <button onClick={() => onPurchase('value')} className="recommended">
          Value Pack - GHS 80<br/>
          <small>Get 100 credits (Best Value!)</small>
        </button>
        <button onClick={() => onPurchase('premium')}>
          Premium Pack - GHS 180<br/>
          <small>Get 250 credits</small>
        </button>
      </div>
      
      <button onClick={onClose} className="close-btn">Cancel</button>
    </div>
  );
};
```

### 6. Show Usage Analytics

Display usage statistics to help users understand their AI consumption:

```javascript
const AIUsageChart = () => {
  const [stats, setStats] = useState(null);
  
  useEffect(() => {
    fetch('https://your-domain.com/ai/api/usage/stats/?days=30', {
      headers: {
        'Authorization': `Token ${localStorage.getItem('token')}`,
      }
    })
      .then(res => res.json())
      .then(data => setStats(data));
  }, []);
  
  if (!stats) return <div>Loading...</div>;
  
  return (
    <div className="ai-usage-chart">
      <h3>AI Usage (Last 30 Days)</h3>
      
      <div className="usage-overview">
        <div className="stat">
          <label>Total Requests</label>
          <value>{stats.total_requests}</value>
        </div>
        <div className="stat">
          <label>Credits Used</label>
          <value>{stats.total_credits_used.toFixed(2)}</value>
        </div>
        <div className="stat">
          <label>Success Rate</label>
          <value>{((stats.successful_requests / stats.total_requests) * 100).toFixed(1)}%</value>
        </div>
      </div>
      
      <div className="feature-breakdown">
        <h4>Usage by Feature</h4>
        {stats.feature_breakdown.map(feature => (
          <div key={feature.feature} className="feature-row">
            <span>{feature.feature}</span>
            <span>{feature.count} requests</span>
            <span>{feature.credits_used.toFixed(2)} credits</span>
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## 🔧 Installation & Setup (Backend)

For backend deployment, ensure these steps are completed:

1. **Install Dependencies:**
```bash
pip install openai==1.54.0 tiktoken==0.7.0 python-dateutil==2.9.0
```

2. **Set Environment Variables:**
Add to `.env.production`:
```env
OPENAI_API_KEY=sk-proj-your-key-here
AI_FEATURES_ENABLED=True
```

3. **Run Migrations:**
```bash
python manage.py migrate ai_features
```

4. **Create Initial Credits (optional):**
You can grant initial free credits via Django admin or create a management command.

---

## 📞 Support & Questions

**For Frontend Team:**
- All endpoints are live and tested
- Check `check-availability` endpoint before making expensive calls (3+ credits)
- Cache product descriptions (they don't change often)
- Show credit balance prominently in UI
- Implement "low credit" warnings at 10 credits threshold

**Need Help?**
- Backend issues: Contact backend team
- API questions: Refer to this document
- New features: Submit feature request

---

## ✅ Testing Checklist

Before deploying frontend:

- [ ] Can fetch credit balance successfully
- [ ] Can purchase credits (test with starter package)
- [ ] Natural language query works and returns formatted results
- [ ] Error handling for insufficient credits (402) is working
- [ ] Product description generation works
- [ ] Collection message generation works with all tones
- [ ] Credit assessment endpoint works and displays results properly
- [ ] Usage stats display correctly with charts
- [ ] Low credit warnings shown at < 10 credits
- [ ] Transaction history loads and paginates
- [ ] Check-availability endpoint works before expensive operations
- [ ] Loading states display during AI processing
- [ ] Follow-up questions are clickable and populate query box
- [ ] Copy-to-clipboard works for messages
- [ ] Mobile responsive design for all AI components

---

## 🎨 Suggested UI/UX Guidelines

### Color Coding for AI Features

```css
/* AI-related colors */
.ai-feature {
  --ai-primary: #8b5cf6;      /* Purple for AI branding */
  --ai-success: #22c55e;       /* Green for successful operations */
  --ai-warning: #eab308;       /* Yellow for low credits */
  --ai-danger: #ef4444;        /* Red for insufficient credits */
  --ai-info: #3b82f6;          /* Blue for informational */
}

/* Risk level colors */
.risk-low { color: #22c55e; }
.risk-medium { color: #eab308; }
.risk-high { color: #f97316; }
.risk-critical { color: #ef4444; }
```

### Icons for AI Features

Recommended icons (using emoji or icon library):
- 🤖 Natural Language Query
- 📝 Product Description
- 💬 Collection Message
- 🎯 Credit Assessment
- 📊 Analytics/Usage Stats
- 💳 Credit Purchase
- ⚡ Fast/Processing
- ✅ Success
- ⚠️ Warning
- ❌ Error

### Loading Messages

Vary loading messages to make the experience feel intelligent:

```javascript
const aiLoadingMessages = [
  "AI is analyzing your data...",
  "Crunching the numbers...",
  "Thinking through the best answer...",
  "Processing your request...",
  "Almost there...",
  "Consulting the data..."
];

const getRandomLoadingMessage = () => {
  return aiLoadingMessages[Math.floor(Math.random() * aiLoadingMessages.length)];
};
```

---

## 🚀 Deployment Readiness

### Environment Variables (Frontend)

```env
# .env.production
VITE_API_BASE_URL=https://your-domain.com
VITE_AI_API_BASE_URL=https://your-domain.com/ai
VITE_AI_FEATURES_ENABLED=true
```

### Feature Flags

Implement feature flags to gradually roll out AI features:

```javascript
const featureFlags = {
  aiQuery: true,
  aiProductDescription: true,
  aiCollectionMessage: true,
  aiCreditAssessment: true,  // May want to start as false
  aiInventoryForecast: false,  // Coming soon
};

const isFeatureEnabled = (feature) => {
  return featureFlags[feature] && 
         import.meta.env.VITE_AI_FEATURES_ENABLED === 'true';
};
```

---

## 📈 Analytics & Tracking

Track AI feature usage for product insights:

```javascript
const trackAIUsage = (feature, creditsUsed, success) => {
  // Send to your analytics platform
  analytics.track('AI Feature Used', {
    feature: feature,
    credits_used: creditsUsed,
    success: success,
    timestamp: new Date().toISOString(),
    user_id: getCurrentUserId(),
    business_id: getCurrentBusinessId()
  });
};

// Usage
const handleAIQuery = async (query) => {
  const result = await makeAIQuery(query);
  
  trackAIUsage(
    'natural_language_query',
    result.credits_used,
    result.success !== false
  );
  
  return result;
};
```

---

## 🎉 You're All Set!

The backend is production-ready with all AI endpoints fully functional. This documentation provides everything needed to build a comprehensive AI-powered frontend experience.

**Key Takeaways:**
- ✅ Always check credit availability before expensive operations
- ✅ Show credit balance prominently in UI
- ✅ Implement graceful error handling for 402 (insufficient credits)
- ✅ Cache product descriptions to save credits
- ✅ Display loading states during AI processing
- ✅ Track AI usage for analytics
- ✅ Test all features thoroughly before deployment

**Next Steps:**
1. Integrate credit balance widget in dashboard
2. Add Natural Language Query to reports page
3. Add Collection Message generator to AR module
4. Add Credit Assessment to customer management
5. Implement purchase flow with MOMO integration
6. Add usage analytics dashboard

**Happy Coding! 🚀**

---

**Last Updated:** November 7, 2025  
**Backend Version:** 1.0.0  
**Django Version:** 5.2.6  
**Frontend Framework:** React 18+ (recommended)

---

## 📝 Document Revision History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0.0 | Nov 7, 2025 | Initial documentation | Backend Team |

---

**Questions?** Contact the backend team or refer to the [AI Integration Strategy document](./AI-INTEGRATION-STRATEGY-BACKEND-REQUIREMENTS.md) for business context and implementation details.
