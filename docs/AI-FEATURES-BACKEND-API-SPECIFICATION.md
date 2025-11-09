# 🤖 AI Features Backend API Specification

**Document Version:** 1.0  
**Date:** November 8, 2025  
**Frontend Branch:** `AI-platform-mngt`  
**Status:** ⚠️ **BACKEND IMPLEMENTATION REQUIRED**

---

## 📋 Overview

This document specifies the backend API endpoints required to support the 6 AI features implemented in the frontend. The frontend is **complete and production-ready**, but currently returns 404 errors because these endpoints don't exist yet.

### Frontend Implementation Status: ✅ 100% Complete
- All UI components built and tested
- Redux state management configured
- TypeScript types defined
- Error handling implemented
- Credit balance checking in place

### Backend Implementation Status: ❌ 0% Complete
**All 5 API endpoints below need to be implemented**

---

## 🎯 AI Provider Integration

All AI endpoints should integrate with OpenAI's GPT-4 or similar LLM service.

**Recommended Setup:**
```python
from openai import OpenAI

client = OpenAI(api_key=settings.OPENAI_API_KEY)

def call_ai(system_prompt, user_prompt, temperature=0.7):
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        temperature=temperature
    )
    return response.choices[0].message.content
```

---

## 💳 Credit System Requirements

### Credit Deduction Logic
**Every AI endpoint MUST:**

1. **Check credit balance before processing:**
   ```python
   from apps.ai.models import AICreditsBalance
   
   credits_balance = AICreditsBalance.objects.get(business=request.user.business)
   
   if credits_balance.balance < FEATURE_COST:
       return Response({
           'error': 'insufficient_credits',
           'message': 'Not enough credits',
           'current_balance': float(credits_balance.balance),
           'required_credits': FEATURE_COST
       }, status=402)  # 402 Payment Required
   ```

2. **Deduct credits after successful AI call:**
   ```python
   credits_balance.balance -= FEATURE_COST
   credits_balance.save()
   ```

3. **Log the transaction:**
   ```python
   from apps.ai.models import AITransaction
   
   AITransaction.objects.create(
       business=request.user.business,
       user=request.user,
       feature=feature_name,
       feature_display=display_name,
       credits_used=FEATURE_COST,
       cost_to_us=calculate_cost(tokens_used),
       tokens_used=tokens_used,
       success=True,
       processing_time_ms=processing_time
   )
   ```

4. **Return updated balance in response:**
   ```python
   return Response({
       # ... feature-specific data ...
       'credits_used': FEATURE_COST,
       'new_balance': float(credits_balance.balance)
   })
   ```

### Feature Costs (Fixed Prices)
```python
FEATURE_COSTS = {
    'product_description': Decimal('0.1'),
    'collection_message': Decimal('0.5'),
    'credit_assessment': Decimal('3.0'),
    'report_narrative': Decimal('0.2'),
    'inventory_forecast': Decimal('4.0'),
}
```

---

## 🔐 Authentication & Permissions

All endpoints require:
- **Authentication:** Bearer token (JWT)
- **Permission:** User must belong to a business with active subscription
- **Credits:** Business must have sufficient AI credits

```python
from rest_framework.permissions import IsAuthenticated
from apps.core.permissions import HasActiveSubscription

class AIFeatureView(APIView):
    permission_classes = [IsAuthenticated, HasActiveSubscription]
```

---

## 📝 API Endpoint #1: Product Description Generator

### Endpoint
```
POST /ai/api/products/generate-description/
```

### Credit Cost
**0.1 credits**

### Request Body
```json
{
  "product_id": "550e8400-e29b-41d4-a716-446655440000",
  "tone": "professional",
  "language": "en",
  "include_seo": true
}
```

**Field Specifications:**
- `product_id` (string, required): UUID of existing product
- `tone` (string, required): One of `["professional", "casual", "technical", "marketing"]`
- `language` (string, required): One of `["en", "tw"]` (English or Twi)
- `include_seo` (boolean, optional, default: true): Generate SEO keywords

### Response (200 OK)
```json
{
  "description": "Experience the future with iPhone 15, featuring advanced camera technology, lightning-fast 5G connectivity, and premium build quality. Perfect for professionals and tech enthusiasts who demand the best.",
  "short_description": "Premium 5G smartphone with advanced camera and cutting-edge performance",
  "seo_keywords": ["iPhone 15", "5G smartphone", "premium phone", "advanced camera", "tech"],
  "meta_description": "Buy iPhone 15 - Premium 5G smartphone with advanced camera technology and cutting-edge performance. Shop now at competitive prices.",
  "credits_used": 0.1,
  "new_balance": 9.9
}
```

### Implementation Guide

**Step 1: Fetch Product Data**
```python
from apps.inventory.models import Product

product = Product.objects.get(id=product_id, business=request.user.business)
product_info = {
    'name': product.name,
    'category': product.category.name if product.category else 'Uncategorized',
    'unit': product.unit,
    'existing_description': product.description or ''
}
```

**Step 2: Build AI Prompt**
```python
TONE_INSTRUCTIONS = {
    'professional': 'Write in a professional, business-appropriate tone',
    'casual': 'Write in a friendly, conversational tone',
    'technical': 'Write with technical details and specifications focus',
    'marketing': 'Write persuasively with emotional appeal and benefits focus'
}

LANGUAGE_INSTRUCTIONS = {
    'en': 'Write in English',
    'tw': 'Write in Twi (Ghanaian language)'
}

system_prompt = f"""You are a professional product copywriter. Generate compelling product descriptions for e-commerce.

{TONE_INSTRUCTIONS[tone]}
{LANGUAGE_INSTRUCTIONS[language]}

Format your response as JSON with these fields:
- description: Full product description (2-3 paragraphs, 150-200 words)
- short_description: One-sentence summary (max 80 characters)
- seo_keywords: Array of 5-8 relevant keywords
- meta_description: SEO meta description (150-160 characters)
"""

user_prompt = f"""Product Name: {product_info['name']}
Category: {product_info['category']}
Unit: {product_info['unit']}

Generate a product description. Include these keywords if relevant: {keywords if keywords else 'N/A'}
"""
```

**Step 3: Call OpenAI API**
```python
import json
from openai import OpenAI

client = OpenAI(api_key=settings.OPENAI_API_KEY)

response = client.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ],
    temperature=0.7,
    response_format={"type": "json_object"}
)

result = json.loads(response.choices[0].message.content)
```

**Step 4: Return Response**
```python
return Response({
    'description': result['description'],
    'short_description': result['short_description'],
    'seo_keywords': result['seo_keywords'],
    'meta_description': result['meta_description'],
    'credits_used': 0.1,
    'new_balance': float(credits_balance.balance)
})
```

### Error Responses

**Product Not Found (404)**
```json
{
  "error": "product_not_found",
  "message": "Product does not exist or does not belong to your business"
}
```

**Insufficient Credits (402)**
```json
{
  "error": "insufficient_credits",
  "message": "Not enough credits to generate description",
  "current_balance": 0.05,
  "required_credits": 0.1
}
```

---

## 💬 API Endpoint #2: Collection Message Generator

### Endpoint
```
POST /ai/api/collections/message/
```

### Credit Cost
**0.5 credits**

### Request Body
```json
{
  "customer_id": "550e8400-e29b-41d4-a716-446655440000",
  "message_type": "first_reminder",
  "tone": "professional_friendly",
  "language": "en",
  "include_payment_plan": true
}
```

**Field Specifications:**
- `customer_id` (string, required): UUID of customer with outstanding balance
- `message_type` (string, required): One of:
  - `"first_reminder"` - Gentle first reminder
  - `"second_reminder"` - Firmer follow-up
  - `"final_notice"` - Final warning before action
  - `"payment_plan_offer"` - Suggest payment plan
- `tone` (string, required): One of:
  - `"professional_friendly"` - Polite and understanding
  - `"firm"` - Direct and assertive
  - `"formal_legal"` - Legal/formal language
- `language` (string, required): One of `["en", "tw"]`
- `include_payment_plan` (boolean, optional): Mention payment plan option

### Response (200 OK)
```json
{
  "subject": "Friendly Reminder: Outstanding Balance on Account",
  "body": "Dear John Doe,\n\nWe hope this message finds you well. We wanted to reach out regarding your account with Adenta Store.\n\nCurrent Outstanding Balance: GHS 1,250.00\nDays Past Due: 15 days\n\nWe understand that circumstances can sometimes make timely payments challenging. If you're experiencing difficulties, we're happy to discuss a payment plan that works for your situation.\n\nPlease contact us at your earliest convenience to settle this balance or discuss payment options.\n\nThank you for your continued business.\n\nBest regards,\nAdenta Store",
  "sms_version": "Hello John, your account at Adenta Store has an outstanding balance of GHS 1,250.00 (15 days overdue). Please contact us to arrange payment. Thank you.",
  "whatsapp_version": "Hi John! 👋\n\nJust a friendly reminder about your account with us at Adenta Store.\n\nOutstanding: GHS 1,250.00\nDays overdue: 15\n\nWe're here to help if you need to discuss payment options. Please reach out when you can.\n\nThanks! 🙏",
  "credits_used": 0.5,
  "new_balance": 9.4
}
```

### Implementation Guide

**Step 1: Fetch Customer Data**
```python
from apps.customers.models import Customer
from apps.sales.models import ARTransaction

customer = Customer.objects.get(id=customer_id, business=request.user.business)

# Calculate outstanding balance
ar_transactions = ARTransaction.objects.filter(
    customer=customer,
    balance__gt=0
)

total_balance = sum(t.balance for t in ar_transactions)
oldest_transaction = ar_transactions.order_by('transaction_date').first()

if oldest_transaction:
    days_past_due = (timezone.now().date() - oldest_transaction.transaction_date).days
else:
    days_past_due = 0

customer_info = {
    'name': customer.name,
    'outstanding_balance': float(total_balance),
    'days_past_due': days_past_due,
    'credit_limit': float(customer.credit_limit),
    'email': customer.email,
    'phone': customer.phone
}
```

**Step 2: Build AI Prompts**
```python
MESSAGE_TYPE_CONTEXT = {
    'first_reminder': {
        'urgency': 'low',
        'description': 'Friendly first reminder, gentle and understanding'
    },
    'second_reminder': {
        'urgency': 'medium',
        'description': 'Follow-up reminder, more direct but still polite'
    },
    'final_notice': {
        'urgency': 'high',
        'description': 'Final warning, firm and clear about consequences'
    },
    'payment_plan_offer': {
        'urgency': 'medium',
        'description': 'Offer to help with a payment plan, empathetic'
    }
}

TONE_INSTRUCTIONS = {
    'professional_friendly': 'Be professional yet warm and understanding',
    'firm': 'Be direct and assertive while remaining professional',
    'formal_legal': 'Use formal business language with legal undertones'
}

system_prompt = f"""You are a professional debt collection communication specialist. Generate collection messages that are effective yet maintain customer relationships.

Message Type: {message_type} - {MESSAGE_TYPE_CONTEXT[message_type]['description']}
Tone: {TONE_INSTRUCTIONS[tone]}
Language: {'English' if language == 'en' else 'Twi'}
Payment Plan: {'Mention payment plan options' if include_payment_plan else 'Do not mention payment plans'}

Generate 3 versions:
1. EMAIL: Full professional email with subject line
2. SMS: Short version (max 160 characters), concise and clear
3. WHATSAPP: Medium length, slightly casual with emojis

Business Name: {request.user.business.name}
Customer Name: {customer_info['name']}
Outstanding Balance: GHS {customer_info['outstanding_balance']:,.2f}
Days Past Due: {customer_info['days_past_due']}

Format as JSON:
{{
  "subject": "...",
  "body": "...",
  "sms_version": "...",
  "whatsapp_version": "..."
}}
"""

user_prompt = f"Generate collection message for the details provided above."
```

**Step 3: Call OpenAI & Parse**
```python
response = client.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ],
    temperature=0.6,
    response_format={"type": "json_object"}
)

result = json.loads(response.choices[0].message.content)
```

**Step 4: Return Response**
```python
return Response({
    'subject': result['subject'],
    'body': result['body'],
    'sms_version': result['sms_version'][:160],  # Enforce SMS limit
    'whatsapp_version': result['whatsapp_version'],
    'credits_used': 0.5,
    'new_balance': float(credits_balance.balance)
})
```

---

## 🎯 API Endpoint #3: Credit Risk Assessment

### Endpoint
```
POST /ai/api/credit/assess/
```

### Credit Cost
**3.0 credits**

### Request Body
```json
{
  "customer_id": "550e8400-e29b-41d4-a716-446655440000",
  "requested_credit_limit": 5000.00,
  "assessment_type": "new_credit"
}
```

**Field Specifications:**
- `customer_id` (string, required): UUID of customer
- `requested_credit_limit` (number, required): Credit amount customer is requesting (in GHS)
- `assessment_type` (string, required): One of:
  - `"new_credit"` - First-time credit application
  - `"increase"` - Requesting increase to existing credit
  - `"renewal"` - Renewing existing credit line

### Response (200 OK)
```json
{
  "customer": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "current_limit": 2000.00,
    "requested_limit": 5000.00
  },
  "risk_score": 72,
  "risk_level": "MEDIUM",
  "recommendation": {
    "action": "APPROVE_PARTIAL",
    "suggested_limit": 3500.00,
    "suggested_terms_days": 30,
    "confidence": 0.85
  },
  "analysis": {
    "positive_factors": [
      "Customer has 8 months of payment history",
      "95% on-time payment rate",
      "Average order value increasing over time",
      "No missed payments in last 3 months"
    ],
    "risk_factors": [
      "Current utilization at 85% of credit limit",
      "Recent late payment (45 days ago)",
      "Requesting 150% increase in credit"
    ],
    "comparable_customers": {
      "similar_approved_limit_avg": 3200.00,
      "default_rate_for_similar_profile": "3.2%"
    }
  },
  "conditions": [
    "Require initial payment to reduce current balance below 50% utilization",
    "Review credit performance after 3 months",
    "Consider full increase to GHS 5,000 after 6 months of good payment history"
  ],
  "explanation": "Based on the customer's payment history and current credit utilization, we recommend a partial approval. While the customer has demonstrated reliability with a 95% on-time payment rate, the current high utilization (85%) and recent late payment suggest caution with a large increase. A gradual increase to GHS 3,500 allows for continued relationship building while managing risk. After demonstrating consistent payment behavior, a full increase can be reconsidered.",
  "credits_used": 3.0,
  "new_balance": 6.4
}
```

### Implementation Guide

**Step 1: Gather Customer Data**
```python
from apps.customers.models import Customer
from apps.sales.models import Sale, ARTransaction
from django.db.models import Sum, Avg, Count, Q
from datetime import timedelta

customer = Customer.objects.get(id=customer_id, business=request.user.business)

# Payment history
ar_transactions = ARTransaction.objects.filter(customer=customer)
total_transactions = ar_transactions.count()
paid_on_time = ar_transactions.filter(
    Q(payment_date__lte=F('due_date')) | Q(payment_date__isnull=True, balance=0)
).count()

on_time_rate = (paid_on_time / total_transactions * 100) if total_transactions > 0 else 0

# Current balance and utilization
current_balance = ar_transactions.filter(balance__gt=0).aggregate(
    total=Sum('balance')
)['total'] or 0
utilization = (current_balance / customer.credit_limit * 100) if customer.credit_limit > 0 else 0

# Sales history
sales = Sale.objects.filter(customer=customer)
months_active = (timezone.now().date() - sales.order_by('created_at').first().created_at.date()).days / 30

avg_order_value = sales.aggregate(avg=Avg('total_amount'))['avg'] or 0
total_orders = sales.count()

# Recent late payments
recent_late = ar_transactions.filter(
    payment_date__gt=F('due_date'),
    payment_date__gte=timezone.now() - timedelta(days=90)
).count()

customer_data = {
    'name': customer.name,
    'current_credit_limit': float(customer.credit_limit),
    'current_balance': float(current_balance),
    'utilization_pct': round(utilization, 2),
    'months_active': round(months_active, 1),
    'on_time_payment_rate': round(on_time_rate, 2),
    'total_transactions': total_transactions,
    'avg_order_value': float(avg_order_value),
    'total_orders': total_orders,
    'recent_late_payments': recent_late
}
```

**Step 2: Get Comparable Customers**
```python
# Find similar customers (similar order value, similar tenure)
comparable = Customer.objects.filter(
    business=request.user.business,
    credit_limit__gt=0
).exclude(id=customer_id).annotate(
    avg_order=Avg('sale__total_amount'),
    months=Count('sale', distinct=True)
).filter(
    avg_order__range=(avg_order_value * 0.7, avg_order_value * 1.3),
    months__gte=months_active * 0.8
)

avg_similar_limit = comparable.aggregate(avg=Avg('credit_limit'))['avg'] or 0
```

**Step 3: Build AI Prompt**
```python
system_prompt = f"""You are a credit risk assessment AI. Analyze customer credit applications and provide data-driven recommendations.

Assessment Type: {assessment_type}
Current Credit Limit: GHS {customer_data['current_credit_limit']:,.2f}
Requested Credit Limit: GHS {requested_credit_limit:,.2f}

Customer Profile:
- Months Active: {customer_data['months_active']}
- Payment History: {customer_data['on_time_payment_rate']}% on-time rate
- Total Transactions: {customer_data['total_transactions']}
- Current Balance: GHS {customer_data['current_balance']:,.2f}
- Credit Utilization: {customer_data['utilization_pct']}%
- Average Order Value: GHS {customer_data['avg_order_value']:,.2f}
- Recent Late Payments (90 days): {customer_data['recent_late_payments']}

Market Benchmark:
- Similar Customers Avg Credit Limit: GHS {avg_similar_limit:,.2f}

Provide assessment as JSON:
{{
  "risk_score": 0-100 (0=highest risk, 100=lowest risk),
  "risk_level": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "recommendation": {{
    "action": "APPROVE_FULL" | "APPROVE_PARTIAL" | "DENY" | "REQUIRE_MORE_INFO",
    "suggested_limit": number,
    "suggested_terms_days": 15 | 30 | 45 | 60,
    "confidence": 0.0-1.0
  }},
  "analysis": {{
    "positive_factors": ["factor1", "factor2"],
    "risk_factors": ["risk1", "risk2"],
    "comparable_customers": {{
      "similar_approved_limit_avg": number,
      "default_rate_for_similar_profile": "X.X%"
    }}
  }},
  "conditions": ["condition1", "condition2"],
  "explanation": "detailed explanation paragraph"
}}
"""

user_prompt = f"Assess credit risk for {customer_data['name']} requesting GHS {requested_credit_limit:,.2f}"
```

**Step 4: Call OpenAI**
```python
response = client.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ],
    temperature=0.3,  # Lower temperature for more consistent risk assessment
    response_format={"type": "json_object"}
)

result = json.loads(response.choices[0].message.content)
```

**Step 5: Return Response**
```python
return Response({
    'customer': {
        'id': str(customer.id),
        'name': customer.name,
        'current_limit': float(customer.credit_limit),
        'requested_limit': float(requested_credit_limit)
    },
    'risk_score': result['risk_score'],
    'risk_level': result['risk_level'],
    'recommendation': result['recommendation'],
    'analysis': result['analysis'],
    'conditions': result['conditions'],
    'explanation': result['explanation'],
    'credits_used': 3.0,
    'new_balance': float(credits_balance.balance)
})
```

---

## 📈 API Endpoint #4: Report Narrative Generator

### Endpoint
```
POST /ai/api/reports/narrative/
```

### Credit Cost
**0.2 credits**

### Request Body
```json
{
  "report_type": "sales_summary",
  "report_data": {
    "summary": {
      "total_sales": 125000.50,
      "total_transactions": 342,
      "average_transaction_value": 365.50,
      "growth_rate": 15.3
    },
    "breakdown": [
      {"date": "2025-11-01", "sales": 4200.00},
      {"date": "2025-11-02", "sales": 3800.00}
    ],
    "comparison": {
      "previous_period_sales": 108500.00,
      "change_percentage": 15.3
    },
    "date_range": {
      "start_date": "2025-11-01",
      "end_date": "2025-11-08"
    }
  }
}
```

**Field Specifications:**
- `report_type` (string, required): One of:
  - `"sales_summary"` - Sales performance report
  - `"stock_levels"` - Inventory status report
  - `"revenue_profit"` - Financial performance report
  - `"ar_aging"` - Accounts receivable report
  - `"inventory_movement"` - Stock movement report
  - `"general"` - Custom report
- `report_data` (object, required): The actual report data (flexible schema based on report_type)

### Response (200 OK)
```json
{
  "executive_summary": "Sales performance for the period November 1-8, 2025 shows strong growth momentum. Total sales reached GHS 125,000.50 across 342 transactions, representing a 15.3% increase compared to the previous period. The average transaction value of GHS 365.50 indicates healthy per-customer spending.",
  "key_insights": [
    "Sales grew 15.3% compared to previous period (from GHS 108,500 to GHS 125,000)",
    "Transaction count increased, suggesting customer acquisition is working",
    "Average transaction value remained stable, indicating consistent customer behavior",
    "Daily sales show consistency with minor fluctuations"
  ],
  "trends": [
    "Upward sales trajectory maintained throughout the period",
    "Weekend sales (Nov 2-3) slightly lower than weekdays, typical seasonal pattern",
    "Growth rate accelerating compared to industry average of 8-10%"
  ],
  "recommendations": [
    "Continue current sales strategies - they're working well",
    "Consider targeted promotions on weekends to boost slower days",
    "Focus on customer retention to maintain transaction momentum",
    "Monitor inventory levels to ensure stock availability during high-growth period"
  ],
  "alerts": [],
  "credits_used": 0.2,
  "new_balance": 6.2
}
```

### Implementation Guide

**Step 1: Analyze Report Data**
```python
import json

report_type = data.get('report_type')
report_data = data.get('report_data')

# Extract key metrics based on report type
if report_type == 'sales_summary':
    summary = report_data.get('summary', {})
    metrics = {
        'total_sales': summary.get('total_sales'),
        'growth_rate': summary.get('growth_rate'),
        'transaction_count': summary.get('total_transactions'),
        'avg_transaction': summary.get('average_transaction_value')
    }
elif report_type == 'stock_levels':
    summary = report_data.get('summary', {})
    metrics = {
        'total_products': summary.get('total_products'),
        'low_stock': summary.get('low_stock'),
        'out_of_stock': summary.get('out_of_stock'),
        'stock_value': summary.get('total_stock_value')
    }
# ... handle other report types
```

**Step 2: Build Context-Aware Prompt**
```python
REPORT_TYPE_INSTRUCTIONS = {
    'sales_summary': {
        'focus': 'revenue growth, transaction patterns, customer behavior',
        'concerns': 'declining sales, low transaction value, seasonal issues'
    },
    'stock_levels': {
        'focus': 'inventory health, stockout risks, overstock issues',
        'concerns': 'stockouts, dead inventory, poor turnover'
    },
    'revenue_profit': {
        'focus': 'profitability, margins, cost management',
        'concerns': 'shrinking margins, high costs, unprofitable products'
    },
    'ar_aging': {
        'focus': 'cash flow, collection efficiency, customer credit risk',
        'concerns': 'overdue accounts, high DSO, collection issues'
    }
}

instructions = REPORT_TYPE_INSTRUCTIONS.get(report_type, REPORT_TYPE_INSTRUCTIONS['sales_summary'])

system_prompt = f"""You are a business intelligence analyst. Generate natural language narratives from business report data.

Report Type: {report_type}
Focus Areas: {instructions['focus']}
Watch For: {instructions['concerns']}

Report Data:
{json.dumps(report_data, indent=2)}

Generate insights as JSON:
{{
  "executive_summary": "2-3 sentence overview of report findings",
  "key_insights": ["insight 1", "insight 2", "insight 3"],
  "trends": ["trend 1", "trend 2"],
  "recommendations": ["action 1", "action 2", "action 3"],
  "alerts": ["urgent issue 1" (only if critical issues found)]
}}

Guidelines:
- Be specific with numbers (include actual values)
- Compare to benchmarks when possible
- Flag only genuinely urgent issues in alerts
- Keep language clear and actionable
"""

user_prompt = "Analyze the report data and generate narrative insights."
```

**Step 3: Call OpenAI**
```python
response = client.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ],
    temperature=0.5,
    response_format={"type": "json_object"}
)

result = json.loads(response.choices[0].message.content)
```

**Step 4: Return Response**
```python
return Response({
    'executive_summary': result['executive_summary'],
    'key_insights': result['key_insights'],
    'trends': result['trends'],
    'recommendations': result['recommendations'],
    'alerts': result.get('alerts', []),
    'credits_used': 0.2,
    'new_balance': float(credits_balance.balance)
})
```

---

## 📦 API Endpoint #5: Inventory Forecasting

### Endpoint
```
POST /ai/api/inventory/forecast/
```

### Credit Cost
**4.0 credits** (most expensive - complex calculations)

### Request Body
```json
{
  "warehouse_id": "550e8400-e29b-41d4-a716-446655440000",
  "category_id": "660e8400-e29b-41d4-a716-446655440000",
  "forecast_days": 30
}
```

**Field Specifications:**
- `warehouse_id` (string, optional): Filter by specific warehouse
- `category_id` (string, optional): Filter by product category
- `forecast_days` (integer, optional, default: 30): How many days ahead to forecast (15-90)

### Response (200 OK)
```json
{
  "forecast_period_days": 30,
  "total_products_analyzed": 156,
  "products_at_risk": 23,
  "forecasts": [
    {
      "product_id": "prod-123",
      "product_name": "iPhone 15 Pro",
      "sku": "APPLE-IP15P-256",
      "current_stock": 12,
      "reorder_point": 20,
      "predicted_stockout_date": "2025-11-18",
      "days_until_stockout": 10,
      "recommended_reorder_quantity": 45,
      "recommended_reorder_date": "2025-11-12",
      "confidence_score": 0.87,
      "weekly_sales_velocity": 8.5,
      "trend": "increasing",
      "seasonality_factor": 1.15,
      "risk_level": "critical"
    },
    {
      "product_id": "prod-124",
      "product_name": "Samsung Galaxy S24",
      "sku": "SAMS-S24-128",
      "current_stock": 45,
      "reorder_point": 25,
      "predicted_stockout_date": "2025-11-25",
      "days_until_stockout": 17,
      "recommended_reorder_quantity": 30,
      "recommended_reorder_date": "2025-11-18",
      "confidence_score": 0.82,
      "weekly_sales_velocity": 6.2,
      "trend": "stable",
      "seasonality_factor": 1.0,
      "risk_level": "high"
    }
  ],
  "summary": {
    "critical_items": 5,
    "high_risk_items": 8,
    "medium_risk_items": 10,
    "low_risk_items": 133,
    "total_recommended_reorder_value": 145000.00
  },
  "credits_used": 4.0,
  "new_balance": 2.2
}
```

### Field Descriptions

**Risk Levels:**
- `critical`: Stock will run out in ≤7 days
- `high`: Stock will run out in 8-14 days
- `medium`: Stock will run out in 15-30 days
- `low`: Stock will run out in >30 days or well-stocked

**Trend Values:**
- `increasing`: Sales velocity going up (buy more)
- `stable`: Consistent sales pattern
- `decreasing`: Sales velocity going down (buy less)

### Implementation Guide

This is the most complex endpoint. Here's the full implementation:

**Step 1: Gather Historical Sales Data**
```python
from apps.inventory.models import Product, StockMovement, WarehouseStock
from apps.sales.models import SaleItem
from datetime import timedelta
from django.db.models import Sum, Count, Avg, F
from django.db.models.functions import TruncWeek, TruncDay

# Get products to analyze
products_query = Product.objects.filter(business=request.user.business)

if warehouse_id:
    products_query = products_query.filter(
        warehousestock__warehouse_id=warehouse_id
    )

if category_id:
    products_query = products_query.filter(category_id=category_id)

products = products_query.distinct()

forecasts = []
ninety_days_ago = timezone.now() - timedelta(days=90)

for product in products:
    # Get current stock
    if warehouse_id:
        stock = WarehouseStock.objects.filter(
            product=product,
            warehouse_id=warehouse_id
        ).first()
    else:
        stock = WarehouseStock.objects.filter(
            product=product
        ).aggregate(total=Sum('quantity_available'))
        stock = type('obj', (object,), {
            'quantity_available': stock['total'] or 0,
            'reorder_point': product.reorder_point or 10
        })()
    
    if not stock:
        continue
    
    # Calculate sales velocity (units per week)
    sales_data = SaleItem.objects.filter(
        product=product,
        sale__created_at__gte=ninety_days_ago
    ).annotate(
        week=TruncWeek('sale__created_at')
    ).values('week').annotate(
        units_sold=Sum('quantity')
    ).order_by('week')
    
    if sales_data.count() == 0:
        continue  # Skip products with no sales
    
    # Calculate average weekly sales
    total_weeks = 12  # 90 days / 7
    total_units = sum(item['units_sold'] for item in sales_data)
    weekly_velocity = total_units / total_weeks
    
    # Detect trend
    if sales_data.count() >= 4:
        first_half_avg = sum(item['units_sold'] for item in sales_data[:len(sales_data)//2]) / (len(sales_data)//2)
        second_half_avg = sum(item['units_sold'] for item in sales_data[len(sales_data)//2:]) / (len(sales_data) - len(sales_data)//2)
        
        if second_half_avg > first_half_avg * 1.2:
            trend = 'increasing'
        elif second_half_avg < first_half_avg * 0.8:
            trend = 'decreasing'
        else:
            trend = 'stable'
    else:
        trend = 'stable'
    
    # Store data for AI analysis
    product_data = {
        'product_id': str(product.id),
        'product_name': product.name,
        'sku': product.sku,
        'current_stock': stock.quantity_available,
        'reorder_point': stock.reorder_point,
        'weekly_velocity': round(weekly_velocity, 2),
        'trend': trend,
        'sales_history': list(sales_data)
    }
    
    forecasts.append(product_data)
```

**Step 2: Use AI for Advanced Forecasting**
```python
# Prepare data for AI
forecast_request = {
    'forecast_days': forecast_days,
    'products': forecasts[:50]  # Limit to 50 products per request to avoid token limits
}

system_prompt = """You are an inventory forecasting AI. Analyze sales patterns and predict stockouts.

For each product, calculate:
1. predicted_stockout_date: When stock will hit zero (null if >90 days)
2. days_until_stockout: Days until stockout (null if not within forecast period)
3. recommended_reorder_quantity: How many to order (consider lead time, safety stock)
4. recommended_reorder_date: When to place order (account for supplier lead time)
5. confidence_score: 0.0-1.0 (based on data quality and consistency)
6. seasonality_factor: Multiplier for seasonal trends (1.0 = no seasonality)
7. risk_level: "critical" | "high" | "medium" | "low"

Assumptions:
- Supplier lead time: 7 days
- Safety stock: 1 week of inventory
- Consider trend when forecasting

Return JSON array of forecasts."""

user_prompt = f"Forecast inventory for {forecast_days} days:\n{json.dumps(forecast_request, indent=2)}"

response = client.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ],
    temperature=0.3,
    response_format={"type": "json_object"}
)

ai_forecasts = json.loads(response.choices[0].message.content)
```

**Step 3: Merge AI Results with Product Data**
```python
final_forecasts = []

for ai_forecast in ai_forecasts.get('forecasts', []):
    # Find matching product data
    product_data = next(
        (p for p in forecasts if p['product_id'] == ai_forecast['product_id']),
        None
    )
    
    if product_data:
        final_forecast = {
            'product_id': product_data['product_id'],
            'product_name': product_data['product_name'],
            'sku': product_data['sku'],
            'current_stock': product_data['current_stock'],
            'reorder_point': product_data['reorder_point'],
            'predicted_stockout_date': ai_forecast.get('predicted_stockout_date'),
            'days_until_stockout': ai_forecast.get('days_until_stockout'),
            'recommended_reorder_quantity': ai_forecast['recommended_reorder_quantity'],
            'recommended_reorder_date': ai_forecast.get('recommended_reorder_date'),
            'confidence_score': ai_forecast['confidence_score'],
            'weekly_sales_velocity': product_data['weekly_velocity'],
            'trend': product_data['trend'],
            'seasonality_factor': ai_forecast.get('seasonality_factor', 1.0),
            'risk_level': ai_forecast['risk_level']
        }
        final_forecasts.append(final_forecast)

# Calculate summary
summary = {
    'critical_items': len([f for f in final_forecasts if f['risk_level'] == 'critical']),
    'high_risk_items': len([f for f in final_forecasts if f['risk_level'] == 'high']),
    'medium_risk_items': len([f for f in final_forecasts if f['risk_level'] == 'medium']),
    'low_risk_items': len([f for f in final_forecasts if f['risk_level'] == 'low']),
    'total_recommended_reorder_value': 0.0  # Calculate based on product costs
}
```

**Step 4: Return Response**
```python
return Response({
    'forecast_period_days': forecast_days,
    'total_products_analyzed': len(products),
    'products_at_risk': len([f for f in final_forecasts if f['risk_level'] in ['critical', 'high']]),
    'forecasts': final_forecasts,
    'summary': summary,
    'credits_used': 4.0,
    'new_balance': float(credits_balance.balance)
})
```

---

## 🔧 Implementation Checklist

### Phase 1: Setup (Week 1)
- [ ] Install OpenAI SDK: `pip install openai`
- [ ] Add `OPENAI_API_KEY` to environment variables
- [ ] Create helper function for AI calls
- [ ] Test OpenAI connection

### Phase 2: Credit System (Week 1)
- [ ] Implement credit balance checking
- [ ] Implement credit deduction logic
- [ ] Add transaction logging
- [ ] Test 402 error responses

### Phase 3: API Endpoints (Week 2-3)
- [ ] Implement Product Description endpoint
- [ ] Implement Collection Message endpoint  
- [ ] Implement Credit Risk Assessment endpoint
- [ ] Implement Report Narrative endpoint
- [ ] Implement Inventory Forecasting endpoint

### Phase 4: Testing (Week 4)
- [ ] Unit tests for each endpoint
- [ ] Integration tests with frontend
- [ ] Load testing (AI calls can be slow)
- [ ] Error handling tests

### Phase 5: Optimization (Week 5)
- [ ] Add caching for similar requests
- [ ] Implement rate limiting
- [ ] Add monitoring/logging
- [ ] Performance optimization

---

## 🚨 Common Pitfalls to Avoid

### 1. **Not Checking Credits First**
```python
# ❌ WRONG
result = call_ai(...)  # Might fail if no credits
deduct_credits(...)

# ✅ CORRECT
if credits_balance.balance < FEATURE_COST:
    return 402 error
result = call_ai(...)
deduct_credits(...)
```

### 2. **Not Handling AI Errors**
```python
# ❌ WRONG
result = client.chat.completions.create(...)  # Might timeout

# ✅ CORRECT
try:
    result = client.chat.completions.create(...)
except OpenAIError as e:
    log_error(e)
    return Response({'error': 'AI service unavailable'}, status=503)
```

### 3. **Not Validating Customer Data Belongs to Business**
```python
# ❌ WRONG
customer = Customer.objects.get(id=customer_id)  # Security risk!

# ✅ CORRECT
customer = Customer.objects.get(
    id=customer_id,
    business=request.user.business  # Ensure ownership
)
```

### 4. **Not Returning Updated Balance**
```python
# ❌ WRONG
return Response({'description': '...'})  # Frontend won't update balance

# ✅ CORRECT
return Response({
    'description': '...',
    'credits_used': 0.1,
    'new_balance': float(credits_balance.balance)  # Frontend needs this
})
```

---

## 📊 Performance Considerations

### AI Call Timeouts
OpenAI calls can take 5-30 seconds. Set appropriate timeouts:

```python
from openai import OpenAI

client = OpenAI(
    api_key=settings.OPENAI_API_KEY,
    timeout=30.0,  # 30 second timeout
    max_retries=2   # Retry failed requests
)
```

### Request Limits
- **Rate Limiting**: Implement per-user rate limits (e.g., 10 AI calls per minute)
- **Token Limits**: GPT-4 has token limits (~8K). Keep prompts under 4K tokens
- **Cost Control**: Monitor OpenAI costs in production

### Caching Strategy
Cache AI responses for identical requests:

```python
from django.core.cache import cache

cache_key = f"ai_description_{product_id}_{tone}_{language}"
cached_result = cache.get(cache_key)

if cached_result:
    return Response(cached_result)

# Call AI...
result = generate_description(...)
cache.set(cache_key, result, timeout=3600)  # Cache for 1 hour
```

---

## 🧪 Testing

### Sample Test Cases

```python
from rest_framework.test import APITestCase

class ProductDescriptionTests(APITestCase):
    def test_generate_description_success(self):
        """Test successful description generation"""
        self.client.force_authenticate(user=self.user)
        
        response = self.client.post('/ai/api/products/generate-description/', {
            'product_id': str(self.product.id),
            'tone': 'professional',
            'language': 'en',
            'include_seo': True
        })
        
        self.assertEqual(response.status_code, 200)
        self.assertIn('description', response.data)
        self.assertIn('credits_used', response.data)
        self.assertEqual(response.data['credits_used'], 0.1)
    
    def test_insufficient_credits(self):
        """Test 402 error when not enough credits"""
        self.credits_balance.balance = 0.05  # Less than 0.1 needed
        self.credits_balance.save()
        
        response = self.client.post('/ai/api/products/generate-description/', {
            'product_id': str(self.product.id),
            'tone': 'professional',
            'language': 'en'
        })
        
        self.assertEqual(response.status_code, 402)
        self.assertIn('required_credits', response.data)
    
    def test_product_not_found(self):
        """Test 404 for non-existent product"""
        response = self.client.post('/ai/api/products/generate-description/', {
            'product_id': '00000000-0000-0000-0000-000000000000',
            'tone': 'professional',
            'language': 'en'
        })
        
        self.assertEqual(response.status_code, 404)
```

---

## 📞 Support & Questions

### Frontend Team Contact
- **Developer**: Current session implementer
- **Branch**: `AI-platform-mngt`
- **Status**: ✅ Ready for backend integration

### Key Frontend Files to Reference
- **Types**: `/src/types/ai.ts` (see all request/response interfaces)
- **Redux**: `/src/store/slices/aiSlice.ts` (see all API calls)
- **Service**: `/src/services/ai/aiService.ts` (see exact endpoints)

### Testing Endpoints
Use these curl commands to test:

```bash
# Test Product Description
curl -X POST http://localhost:8000/ai/api/products/generate-description/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "your-product-id",
    "tone": "professional",
    "language": "en",
    "include_seo": true
  }'

# Test Collection Message
curl -X POST http://localhost:8000/ai/api/collections/message/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "your-customer-id",
    "message_type": "first_reminder",
    "tone": "professional_friendly",
    "language": "en"
  }'
```

---

## 🎯 Priority Implementation Order

1. **Week 1**: Product Description (simplest, good for learning)
2. **Week 2**: Collection Messages (moderate complexity)
3. **Week 2**: Report Narratives (moderate complexity)
4. **Week 3**: Credit Risk Assessment (complex data gathering)
5. **Week 4**: Inventory Forecasting (most complex)

---

## ✅ Definition of Done

An endpoint is complete when:
- [ ] Returns 200 OK with correct data structure
- [ ] Checks credits before processing (returns 402 if insufficient)
- [ ] Deducts credits after successful AI call
- [ ] Logs transaction to AITransaction model
- [ ] Returns updated balance in response
- [ ] Handles errors gracefully (404, 500, 503)
- [ ] Has unit tests with >80% coverage
- [ ] Works with frontend (no CORS issues)
- [ ] Documented in backend README

---

## 📝 Notes

- All monetary values should be Decimal in database, float in JSON
- All dates should be ISO 8601 format: `"2025-11-08"`
- All UUIDs should be strings in JSON
- Currency is always GHS (Ghana Cedis)
- AI responses should be in English or Twi based on `language` parameter

---

**END OF SPECIFICATION**

*Last Updated: November 8, 2025*  
*Frontend Implementation: Complete ✅*  
*Backend Implementation: Pending ⏳*
