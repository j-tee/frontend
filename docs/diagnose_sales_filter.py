#!/usr/bin/env python
"""
Sales Filter Diagnostic Script
Run this in Django shell: python manage.py shell < diagnose_sales_filter.py
"""

print("=" * 60)
print("SALES FILTER DIAGNOSTIC SCRIPT")
print("=" * 60)
print()

# Import required modules
from sales.models import Sale
from django.contrib.auth import get_user_model
from django.db.models import Count
import sys

User = get_user_model()

# Test 1: Basic Counts
print("TEST 1: BASIC DATABASE COUNTS")
print("-" * 60)
total = Sale.objects.count()
print(f"Total sales in database: {total}")

completed = Sale.objects.filter(status='COMPLETED').count()
print(f"COMPLETED sales: {completed}")

draft = Sale.objects.filter(status='DRAFT').count()
print(f"DRAFT sales: {draft}")

pending = Sale.objects.filter(status='PENDING').count()
print(f"PENDING sales: {pending}")

partial = Sale.objects.filter(status='PARTIAL').count()
print(f"PARTIAL sales: {partial}")

print()

# Test 2: Status Filter Works?
print("TEST 2: STATUS FILTERING")
print("-" * 60)
completed_qs = Sale.objects.filter(status='COMPLETED')
print(f"Filter by COMPLETED works: {completed_qs.exists()}")
if completed_qs.exists():
    first_completed = completed_qs.first()
    print(f"First COMPLETED sale: {first_completed.receipt_number or 'N/A'}")
    print(f"  Status: {first_completed.status}")
    print(f"  Amount: ${first_completed.total_amount}")

print()

# Test 3: Check User and Storefront
print("TEST 3: USER & STOREFRONT CHECK")
print("-" * 60)
try:
    user = User.objects.get(username='Mike Tetteh')
    print(f"User found: {user.username}")
    
    if hasattr(user, 'current_storefront'):
        print(f"Has current_storefront attribute: Yes")
        storefront = user.current_storefront
        if storefront:
            print(f"Current storefront: {storefront.name if hasattr(storefront, 'name') else storefront}")
            
            # Count sales in this storefront
            storefront_sales = Sale.objects.filter(storefront=storefront)
            print(f"Sales in this storefront: {storefront_sales.count()}")
            
            # Breakdown by status
            status_breakdown = storefront_sales.values('status').annotate(count=Count('id'))
            print(f"Status breakdown:")
            for item in status_breakdown:
                print(f"  {item['status']}: {item['count']}")
            
            # Check if all are DRAFT
            all_draft = storefront_sales.filter(status='DRAFT').count()
            if all_draft == storefront_sales.count():
                print("⚠️  WARNING: ALL sales in this storefront are DRAFT!")
                print("   This explains why filtering doesn't seem to work!")
        else:
            print(f"Current storefront: None")
    else:
        print(f"Has current_storefront attribute: No")
except User.DoesNotExist:
    print("User 'Mike Tetteh' not found. Try another username.")

print()

# Test 4: FilterSet Test
print("TEST 4: FILTERSET TEST")
print("-" * 60)
try:
    from sales.filters import SaleFilter
    from django.http import QueryDict
    
    print("SaleFilter class found: Yes")
    
    # Test with COMPLETED filter
    query_params = QueryDict('status=COMPLETED')
    filterset = SaleFilter(query_params, queryset=Sale.objects.all())
    filtered_qs = filterset.qs
    
    print(f"FilterSet applied: Yes")
    print(f"Filtered queryset count: {filtered_qs.count()}")
    
    if filtered_qs.exists():
        first = filtered_qs.first()
        print(f"First result status: {first.status}")
        print(f"First result receipt: {first.receipt_number or 'N/A'}")
        
        # Check if filter actually filtered
        all_statuses = list(filtered_qs.values_list('status', flat=True)[:10])
        unique_statuses = set(all_statuses)
        print(f"First 10 statuses: {all_statuses}")
        print(f"Unique statuses in results: {unique_statuses}")
        
        if 'DRAFT' in unique_statuses and 'COMPLETED' not in unique_statuses:
            print("⚠️  WARNING: Filter returned DRAFT instead of COMPLETED!")
        elif len(unique_statuses) > 1:
            print("⚠️  WARNING: Filter returned multiple statuses!")
        else:
            print("✅ Filter working correctly!")
    
except ImportError:
    print("SaleFilter class not found!")
    print("Check: sales/filters.py should have SaleFilter class")

print()

# Test 5: ViewSet Configuration
print("TEST 5: VIEWSET CONFIGURATION")
print("-" * 60)
try:
    from sales.views import SaleViewSet
    
    print("SaleViewSet found: Yes")
    
    # Check filterset_class
    if hasattr(SaleViewSet, 'filterset_class'):
        print(f"Has filterset_class: Yes ({SaleViewSet.filterset_class})")
    else:
        print("Has filterset_class: No ⚠️")
        print("  This might be the issue!")
    
    # Check filter_backends
    if hasattr(SaleViewSet, 'filter_backends'):
        print(f"Has filter_backends: Yes ({SaleViewSet.filter_backends})")
    else:
        print("Has filter_backends: No ⚠️")
    
    # Check get_queryset
    if hasattr(SaleViewSet, 'get_queryset'):
        print(f"Has custom get_queryset: Yes")
        print("  Check if it has automatic storefront filtering!")
    else:
        print(f"Has custom get_queryset: No")
        
except ImportError:
    print("SaleViewSet not found!")
    print("Check: sales/views.py should have SaleViewSet class")

print()

# Test 6: Simulate API Request
print("TEST 6: SIMULATE API REQUEST")
print("-" * 60)
try:
    from django.test import RequestFactory
    from sales.views import SaleViewSet
    
    factory = RequestFactory()
    
    # Simulate request with COMPLETED filter
    request = factory.get('/sales/api/sales/?status=COMPLETED')
    
    # Try to get user context
    try:
        user = User.objects.get(username='Mike Tetteh')
        request.user = user
        print(f"Request user: {user.username}")
    except:
        print("Could not set request user")
    
    viewset = SaleViewSet()
    viewset.request = request
    viewset.format_kwarg = None
    
    try:
        queryset = viewset.get_queryset()
        print(f"Queryset count: {queryset.count()}")
        
        if queryset.exists():
            first = queryset.first()
            print(f"First result status: {first.status}")
            print(f"First result receipt: {first.receipt_number or 'N/A'}")
            
            # Check statuses
            statuses = list(queryset.values_list('status', flat=True)[:10])
            print(f"First 10 statuses: {statuses}")
            
            if all(s == 'DRAFT' for s in statuses):
                print("⚠️  WARNING: get_queryset() returned only DRAFT sales!")
                print("   Check for automatic storefront filtering in get_queryset()")
            elif all(s == 'COMPLETED' for s in statuses):
                print("✅ get_queryset() correctly filtered by COMPLETED!")
        else:
            print("Queryset is empty!")
            
    except Exception as e:
        print(f"Error calling get_queryset(): {e}")
        
except Exception as e:
    print(f"Could not simulate API request: {e}")

print()

# Summary
print("=" * 60)
print("DIAGNOSTIC SUMMARY")
print("=" * 60)

print("\nLikely Issues Found:")
issues = []

if total > 0 and completed > 0:
    print("✅ Database has sales and COMPLETED sales exist")
else:
    issues.append("❌ No COMPLETED sales in database")

try:
    from sales.filters import SaleFilter
    if not hasattr(SaleViewSet, 'filterset_class'):
        issues.append("❌ ViewSet missing filterset_class")
except:
    issues.append("❌ SaleFilter not found or not imported")

try:
    user = User.objects.get(username='Mike Tetteh')
    if hasattr(user, 'current_storefront') and user.current_storefront:
        storefront_sales = Sale.objects.filter(storefront=user.current_storefront)
        storefront_draft = storefront_sales.filter(status='DRAFT').count()
        if storefront_sales.count() == storefront_draft and storefront_draft > 0:
            issues.append(f"⚠️  User's storefront has ONLY {storefront_draft} DRAFT sales")
            issues.append("   Auto-storefront filtering might be limiting results")
except:
    pass

if not issues:
    print("No obvious issues found. Check viewset get_queryset() method.")
else:
    for issue in issues:
        print(issue)

print("\n" + "=" * 60)
print("END OF DIAGNOSTIC")
print("=" * 60)
