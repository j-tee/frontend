# BACKEND BUG: Subscription API Missing Critical Data

## Issue
The subscription API endpoint `/subscriptions/api/subscriptions/` is returning incomplete data for active subscriptions.

## Current Behavior (BROKEN)
```json
{
  "id": "...",
  "business_name": "DataLogique Systems",
  "business_email": "...",
  "business_owner": "...",
  "status": "ACTIVE",
  "auto_renew": true,
  "plan": null,  // ❌ MISSING
  "plan_details": null,  // ❌ MISSING
  "current_period_start": null,  // ❌ MISSING
  "current_period_end": null  // ❌ MISSING
}
```

## Expected Behavior (CORRECT)
```json
{
  "id": "...",
  "business_name": "DataLogique Systems",
  "business_email": "...",
  "business_owner": "...",
  "status": "ACTIVE",
  "auto_renew": true,
  "plan": {
    "id": "...",
    "name": "Professional Plan",
    "price": "50.00",
    "currency": "GHS",
    "billing_cycle": "MONTHLY"
  },
  "plan_details": {
    "name": "Professional Plan",
    "price": "50.00",
    "currency": "GHS",
    "billing_cycle": "MONTHLY"
  },
  "current_period_start": "2025-11-02T00:00:00Z",
  "current_period_end": "2025-12-02T00:00:00Z"
}
```

## Root Cause
The Django serializer for `PlatformSubscription` is not including:
1. The nested `plan` object (should use `PlanSerializer(read_only=True)`)
2. The `plan_details` object (computed field)
3. Date fields: `current_period_start` and `current_period_end`

## Backend Fix Required

### File: `subscriptions/serializers.py` (or similar)

```python
class PlatformSubscriptionSerializer(serializers.ModelSerializer):
    plan = PlanSerializer(read_only=True)  # ✅ ADD THIS
    plan_details = serializers.SerializerMethodField()  # ✅ ADD THIS
    
    class Meta:
        model = Subscription
        fields = [
            'id',
            'business_id',
            'business_name',
            'business_email', 
            'business_owner',
            'plan',  # ✅ INCLUDE
            'plan_id',
            'plan_details',  # ✅ INCLUDE
            'status',
            'payment_status',
            'payment_method',
            'start_date',
            'end_date',
            'current_period_start',  # ✅ INCLUDE
            'current_period_end',  # ✅ INCLUDE
            'next_billing_date',
            'is_trial',
            'trial_end_date',
            'auto_renew',
            'cancel_at_period_end',
            'created_at',
            'updated_at'
        ]
    
    def get_plan_details(self, obj):
        """Return plan details in a consistent format"""
        if not obj.plan:
            return None
        
        return {
            'name': obj.plan.name,
            'price': str(obj.plan.price),
            'currency': obj.plan.currency,
            'billing_cycle': obj.plan.billing_cycle,
            'interval': obj.plan.get_billing_cycle_display()
        }
```

## Impact
- Platform admin cannot see what plan businesses are subscribed to
- Cannot see subscription period dates
- Makes subscription management impossible

## Priority
🔴 **CRITICAL** - Blocks platform administration

## Testing After Fix
1. Create an active subscription in backend
2. Call `GET /subscriptions/api/subscriptions/`
3. Verify response includes:
   - `plan` object with id, name, price, currency, billing_cycle
   - `plan_details` object
   - `current_period_start` (ISO 8601 date)
   - `current_period_end` (ISO 8601 date)

## Frontend Status
✅ Frontend is ready - already handles the data correctly
❌ Backend is not providing the required data
