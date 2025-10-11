#!/usr/bin/env python3
"""
Sale Catalog Diagnostic Tool
=============================

This script helps diagnose why products from certain storefronts (like Cow Lane)
are not showing up in the sale catalog API but others (like Adenta) work fine.

Usage:
    python diagnose_sale_catalog.py

Requirements:
    - Django project environment
    - Database access
    - Run from backend project root
"""

import os
import sys
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db.models import Count, Sum, Q
from storefronts.models import Storefront
from inventory.models import StorefrontInventory, StockProduct, Product
from transfers.models import TransferRequest

def print_header(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")

def print_section(title):
    print(f"\n{'-'*60}")
    print(f"{title}")
    print(f"{'-'*60}")

def diagnose_storefront(storefront_name):
    """Diagnose a specific storefront's sale catalog"""
    
    print_header(f"Diagnosing: {storefront_name}")
    
    # Find storefront
    try:
        storefront = Storefront.objects.get(name__icontains=storefront_name)
        print(f"✅ Found storefront: {storefront.name}")
        print(f"   ID: {storefront.id}")
        print(f"   Active: {storefront.is_active}")
        print(f"   Location: {storefront.location or 'Not set'}")
    except Storefront.DoesNotExist:
        print(f"❌ Storefront '{storefront_name}' not found!")
        return None
    except Storefront.MultipleObjectsReturned:
        storefronts = Storefront.objects.filter(name__icontains=storefront_name)
        print(f"⚠️  Multiple storefronts found:")
        for sf in storefronts:
            print(f"   - {sf.name} (ID: {sf.id})")
        print(f"   Using first: {storefronts.first().name}")
        storefront = storefronts.first()
    
    # Check if active
    if not storefront.is_active:
        print(f"⚠️  WARNING: Storefront is INACTIVE!")
        print(f"   This may cause it to be filtered out of sale catalog")
    
    # Check inventory records
    print_section("Inventory Records")
    inventory_total = StorefrontInventory.objects.filter(
        storefront=storefront
    ).count()
    print(f"Total inventory records: {inventory_total}")
    
    inventory_with_stock = StorefrontInventory.objects.filter(
        storefront=storefront,
        available_quantity__gt=0
    ).count()
    print(f"Records with available quantity > 0: {inventory_with_stock}")
    
    if inventory_total == 0:
        print(f"❌ ERROR: No inventory records found!")
        print(f"   Products must be transferred to this storefront first")
        return storefront
    
    if inventory_with_stock == 0:
        print(f"⚠️  WARNING: No products with available quantity!")
        print(f"   All products may be sold out or reserved")
    
    # Check transfer requests
    print_section("Transfer History")
    transfers_total = TransferRequest.objects.filter(
        storefront=storefront
    ).count()
    print(f"Total transfer requests: {transfers_total}")
    
    transfers_fulfilled = TransferRequest.objects.filter(
        storefront=storefront,
        status='FULFILLED'
    ).count()
    print(f"Fulfilled transfer requests: {transfers_fulfilled}")
    
    if transfers_fulfilled == 0:
        print(f"⚠️  WARNING: No fulfilled transfer requests")
        print(f"   Inventory may have been created manually")
    
    # Check stock products linkage
    print_section("Stock Product Linkage (Critical for Sale Catalog)")
    
    inventory_items = StorefrontInventory.objects.filter(
        storefront=storefront,
        available_quantity__gt=0
    ).select_related('product')[:10]  # Sample first 10
    
    if not inventory_items:
        print(f"❌ No products to check (no available inventory)")
        return storefront
    
    print(f"\nChecking first {len(inventory_items)} products:\n")
    
    issues_found = 0
    for inv in inventory_items:
        product = inv.product
        
        # Find stock products for this product at this storefront
        stock_products = StockProduct.objects.filter(
            product=product,
            # This is the critical join - adjust based on your model structure
            warehouse__storefront=storefront  # or however your model links stock to storefronts
        )
        
        stock_product_ids = list(stock_products.values_list('id', flat=True))
        
        print(f"Product: {product.name}")
        print(f"  SKU: {product.sku or 'None'}")
        print(f"  Available: {inv.available_quantity}")
        print(f"  Stock Product IDs: {len(stock_product_ids)} found")
        
        if not stock_product_ids:
            print(f"  ❌ CRITICAL: No stock_product_ids!")
            print(f"     Frontend will filter this product out!")
            issues_found += 1
        else:
            print(f"  ✅ Stock products linked: {stock_product_ids[:3]}...")
        print()
    
    if issues_found > 0:
        print(f"\n⚠️  FOUND {issues_found} PRODUCTS WITHOUT STOCK_PRODUCT_IDS")
        print(f"   These products will NOT appear in sale catalog!")
        print(f"   Frontend requires stock_product_ids array to be non-empty")
    else:
        print(f"\n✅ All sampled products have stock_product_ids")
    
    return storefront

def compare_storefronts(working_name, broken_name):
    """Compare two storefronts to find differences"""
    
    print_header("Comparing Storefronts")
    
    print(f"Working: {working_name}")
    print(f"Broken:  {broken_name}\n")
    
    working = diagnose_storefront(working_name)
    broken = diagnose_storefront(broken_name)
    
    if not working or not broken:
        print("\n❌ Could not compare - one or both storefronts not found")
        return
    
    print_header("Comparison Summary")
    
    # Compare key metrics
    metrics = [
        ('is_active', 'Active Status'),
        ('location', 'Location Set'),
    ]
    
    for attr, label in metrics:
        w_val = getattr(working, attr)
        b_val = getattr(broken, attr)
        
        if w_val != b_val:
            print(f"⚠️  DIFFERENCE in {label}:")
            print(f"   Working: {w_val}")
            print(f"   Broken:  {b_val}")
        else:
            print(f"✅ {label}: Same ({w_val})")
    
    # Compare inventory counts
    w_inv = StorefrontInventory.objects.filter(
        storefront=working,
        available_quantity__gt=0
    ).count()
    
    b_inv = StorefrontInventory.objects.filter(
        storefront=broken,
        available_quantity__gt=0
    ).count()
    
    print(f"\n📊 Inventory Comparison:")
    print(f"   Working has {w_inv} available products")
    print(f"   Broken has  {b_inv} available products")
    
    if b_inv == 0:
        print(f"\n❌ CRITICAL: Broken storefront has NO available inventory!")
        print(f"   Sale catalog will be empty")

def test_sale_catalog_endpoint():
    """Simulate what the sale catalog endpoint should return"""
    
    print_header("Simulating Sale Catalog API")
    
    storefront_name = input("\nEnter storefront name to test (e.g., 'Cow Lane'): ").strip()
    
    try:
        storefront = Storefront.objects.get(name__icontains=storefront_name)
    except Storefront.DoesNotExist:
        print(f"❌ Storefront '{storefront_name}' not found!")
        return
    
    print(f"\nSimulating: GET /inventory/api/storefronts/{storefront.id}/sale-catalog/\n")
    
    # Simulate the catalog generation
    inventory_items = StorefrontInventory.objects.filter(
        storefront=storefront,
        available_quantity__gt=0
    ).select_related('product', 'product__category')
    
    products = []
    
    for inv in inventory_items:
        product = inv.product
        
        # Get stock product IDs (adjust query based on your model structure)
        stock_product_ids = list(
            StockProduct.objects.filter(
                product=product,
                warehouse__storefront=storefront  # Adjust this join
            ).values_list('id', flat=True)
        )
        
        # Frontend filters out products without stock_product_ids
        if not stock_product_ids:
            continue
        
        products.append({
            'product_id': str(product.id),
            'product_name': product.name,
            'sku': product.sku or '',
            'available_quantity': inv.available_quantity,
            'stock_product_ids': stock_product_ids,
        })
    
    print(f"Response would contain {len(products)} products:")
    print(f"\n{{\n  'storefront': '{storefront.id}',")
    print(f"  'products': [")
    
    for i, p in enumerate(products[:5]):  # Show first 5
        print(f"    {{")
        print(f"      'product_id': '{p['product_id'][:8]}...',")
        print(f"      'product_name': '{p['product_name']}',")
        print(f"      'sku': '{p['sku']}',")
        print(f"      'available_quantity': {p['available_quantity']},")
        print(f"      'stock_product_ids': [{len(p['stock_product_ids'])} IDs]")
        print(f"    }},")
    
    if len(products) > 5:
        print(f"    ... {len(products) - 5} more products")
    
    print(f"  ]\n}}")
    
    if len(products) == 0:
        print(f"\n❌ PROBLEM: API would return EMPTY products array!")
        print(f"   This is why products don't show in sales page")
    else:
        print(f"\n✅ API should return {len(products)} products")

def main():
    """Main diagnostic menu"""
    
    print("""
╔══════════════════════════════════════════════════════════════╗
║          Sale Catalog Diagnostic Tool                       ║
║                                                              ║
║  Helps diagnose why products from certain storefronts        ║
║  are not showing up in the sale catalog API                  ║
╚══════════════════════════════════════════════════════════════╝
    """)
    
    while True:
        print("\nOptions:")
        print("  1. Diagnose single storefront")
        print("  2. Compare two storefronts (working vs broken)")
        print("  3. Simulate sale catalog API response")
        print("  4. Quick check: Cow Lane vs Adenta")
        print("  0. Exit")
        
        choice = input("\nSelect option: ").strip()
        
        if choice == '1':
            name = input("Enter storefront name: ").strip()
            diagnose_storefront(name)
        
        elif choice == '2':
            working = input("Enter working storefront name (e.g., 'Adenta'): ").strip()
            broken = input("Enter broken storefront name (e.g., 'Cow Lane'): ").strip()
            compare_storefronts(working, broken)
        
        elif choice == '3':
            test_sale_catalog_endpoint()
        
        elif choice == '4':
            compare_storefronts('Adenta', 'Cow Lane')
        
        elif choice == '0':
            print("\nExiting...")
            break
        
        else:
            print("Invalid option, try again")

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nInterrupted by user. Exiting...")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
