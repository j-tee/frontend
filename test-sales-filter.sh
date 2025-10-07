#!/bin/bash

# Sales Filter Diagnostic Script
# Run this to test the backend API directly

echo "🔍 Sales Filter Diagnostic Test"
echo "================================"
echo ""

# Get token from user
read -p "Enter your auth token: " TOKEN
echo ""

# Test 1: Get all sales (no filter)
echo "TEST 1: Get all sales (no filter)"
echo "---------------------------------"
RESPONSE1=$(curl -s -H "Authorization: Token $TOKEN" \
  "http://localhost:8000/sales/api/sales/?page_size=10")

TOTAL_COUNT=$(echo "$RESPONSE1" | jq -r '.count')
ALL_STATUSES=$(echo "$RESPONSE1" | jq -r '.results[].status' | sort | uniq -c)

echo "Total sales: $TOTAL_COUNT"
echo "Statuses breakdown:"
echo "$ALL_STATUSES"
echo ""

# Test 2: Filter by COMPLETED status
echo "TEST 2: Filter by status=COMPLETED"
echo "-----------------------------------"
RESPONSE2=$(curl -s -H "Authorization: Token $TOKEN" \
  "http://localhost:8000/sales/api/sales/?status=COMPLETED&page_size=10")

COMPLETED_COUNT=$(echo "$RESPONSE2" | jq -r '.count')
COMPLETED_STATUSES=$(echo "$RESPONSE2" | jq -r '.results[].status' | sort | uniq -c)

echo "Filtered count: $COMPLETED_COUNT"
echo "Statuses in results:"
echo "$COMPLETED_STATUSES"
echo ""

# Test 3: Filter by PENDING status
echo "TEST 3: Filter by status=PENDING"
echo "---------------------------------"
RESPONSE3=$(curl -s -H "Authorization: Token $TOKEN" \
  "http://localhost:8000/sales/api/sales/?status=PENDING&page_size=10")

PENDING_COUNT=$(echo "$RESPONSE3" | jq -r '.count')
PENDING_STATUSES=$(echo "$RESPONSE3" | jq -r '.results[].status' | sort | uniq -c)

echo "Filtered count: $PENDING_COUNT"
echo "Statuses in results:"
echo "$PENDING_STATUSES"
echo ""

# Test 4: Filter by DRAFT status
echo "TEST 4: Filter by status=DRAFT"
echo "-------------------------------"
RESPONSE4=$(curl -s -H "Authorization: Token $TOKEN" \
  "http://localhost:8000/sales/api/sales/?status=DRAFT&page_size=10")

DRAFT_COUNT=$(echo "$RESPONSE4" | jq -r '.count')
DRAFT_STATUSES=$(echo "$RESPONSE4" | jq -r '.results[].status' | sort | uniq -c)

echo "Filtered count: $DRAFT_COUNT"
echo "Statuses in results:"
echo "$DRAFT_STATUSES"
echo ""

# Analysis
echo "📊 ANALYSIS"
echo "==========="
echo ""

if echo "$COMPLETED_STATUSES" | grep -qv "COMPLETED"; then
    echo "❌ FAILED: status=COMPLETED filter is returning other statuses!"
    echo "   This confirms the backend filter is NOT working."
else
    echo "✅ PASSED: status=COMPLETED filter is working correctly"
fi
echo ""

if echo "$PENDING_STATUSES" | grep -qv "PENDING"; then
    echo "❌ FAILED: status=PENDING filter is returning other statuses!"
    echo "   This confirms the backend filter is NOT working."
else
    echo "✅ PASSED: status=PENDING filter is working correctly"
fi
echo ""

if echo "$DRAFT_STATUSES" | grep -qv "DRAFT"; then
    echo "❌ FAILED: status=DRAFT filter is returning other statuses!"
    echo "   This confirms the backend filter is NOT working."
else
    echo "✅ PASSED: status=DRAFT filter is working correctly"
fi
echo ""

echo "📝 RECOMMENDATION"
echo "================="
if echo "$COMPLETED_STATUSES" | grep -qv "COMPLETED" || \
   echo "$PENDING_STATUSES" | grep -qv "PENDING" || \
   echo "$DRAFT_STATUSES" | grep -qv "DRAFT"; then
    echo ""
    echo "The backend sales filter is NOT working properly."
    echo ""
    echo "Share these results with your backend team and reference:"
    echo "  - docs/BACKEND-FILTER-NOT-WORKING.md"
    echo ""
    echo "Backend needs to verify:"
    echo "  1. filterset_class = SaleFilter is set in SaleViewSet"
    echo "  2. filter_backends = [DjangoFilterBackend] is set"
    echo "  3. django-filter is installed in requirements.txt"
    echo "  4. 'django_filters' is in INSTALLED_APPS"
    echo ""
else
    echo ""
    echo "✅ All backend filters are working correctly!"
    echo "   The issue might be on the frontend side."
    echo ""
fi
