# 🔌 Backend Requirements - Settings System

**Date:** October 7, 2025  
**Priority:** MEDIUM (Feature complete on frontend, needs persistence)  
**Developer:** Backend Team

---

## 📋 Executive Summary

The frontend has implemented a comprehensive settings system with:
- ✅ Currency selection (12 currencies)
- ✅ Theme customization (7 presets)
- ✅ Appearance options (light/dark, font size, etc.)
- ✅ Complete UI with real-time preview

**What's Needed from Backend:**
Simple CRUD API for storing/retrieving settings as JSON. Users can use the feature now (with temporary storage), but need backend for persistence.

---

## 🎯 Required API Endpoints

### 1. Get Settings
```
GET /settings/api/settings/
```

**Description:** Get current business settings

**Headers:**
```
Authorization: Token <user-token>
```

**Response 200:**
```json
{
  "id": "uuid",
  "business": "business-uuid",
  "regional": {
    "currency": {
      "code": "GHS",
      "symbol": "₵",
      "name": "Ghanaian Cedi",
      "position": "before",
      "decimalPlaces": 2
    },
    "timezone": "Africa/Accra",
    "dateFormat": "DD/MM/YYYY",
    "timeFormat": "24h",
    "firstDayOfWeek": 1,
    "numberFormat": "en-GB"
  },
  "appearance": {
    "colorScheme": "auto",
    "themePreset": "emerald-green",
    "customColors": null,
    "fontSize": "medium",
    "compactMode": false,
    "animationsEnabled": true,
    "highContrast": false
  },
  "notifications": {
    "emailNotifications": true,
    "pushNotifications": true,
    "smsNotifications": false,
    "lowStockAlerts": true,
    "salesUpdates": true,
    "systemUpdates": true,
    "marketingEmails": false
  },
  "receipt": {
    "showLogo": true,
    "logoUrl": null,
    "headerText": null,
    "footerText": "Thank you for your business!",
    "showTaxBreakdown": true,
    "showBarcode": true,
    "paperSize": "thermal-80mm"
  },
  "created_at": "2025-10-01T10:00:00Z",
  "updated_at": "2025-10-07T14:30:00Z"
}
```

**Response 404:** (If settings don't exist yet)
```json
{
  "detail": "Settings not found"
}
```

### 2. Update Settings
```
PATCH /settings/api/settings/
```

**Description:** Update business settings (partial update)

**Headers:**
```
Authorization: Token <user-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "regional": {
    "currency": {
      "code": "USD",
      "symbol": "$",
      "name": "US Dollar",
      "position": "before",
      "decimalPlaces": 2
    }
  },
  "appearance": {
    "themePreset": "purple-galaxy"
  }
}
```

**Response 200:** (Same as GET response with updated values)

### 3. Create Settings
```
POST /settings/api/settings/
```

**Description:** Create initial settings (usually auto-created on business registration)

**Headers:**
```
Authorization: Token <user-token>
Content-Type: application/json
```

**Request Body:** (Same structure as GET response)

**Response 201:** (Same as GET response)

---

## 🗃️ Database Schema

### Recommended Approach: JSON Fields

```python
# settings/models.py
from django.db import models
from django.contrib.postgres.fields import JSONField  # or models.JSONField in Django 3.1+
import uuid

class BusinessSettings(models.Model):
    """
    Stores user preferences for currency, theme, and other settings
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.OneToOneField(
        'Business', 
        on_delete=models.CASCADE,
        related_name='settings'
    )
    
    # Store all settings as JSON for flexibility
    regional = models.JSONField(default=dict, blank=True)
    appearance = models.JSONField(default=dict, blank=True)
    notifications = models.JSONField(default=dict, blank=True)
    receipt = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'business_settings'
        verbose_name = 'Business Settings'
        verbose_name_plural = 'Business Settings'
    
    def __str__(self):
        return f"Settings for {self.business.name}"
```

**Why JSON fields?**
- ✅ Flexible - Easy to add new settings without migrations
- ✅ Frontend compatibility - Direct JSON serialization
- ✅ Simple - No complex relationships
- ✅ Fast - Single database row per business

---

## 📝 Serializer

```python
# settings/serializers.py
from rest_framework import serializers
from .models import BusinessSettings

class BusinessSettingsSerializer(serializers.ModelSerializer):
    """
    Serializer for business settings
    """
    class Meta:
        model = BusinessSettings
        fields = [
            'id',
            'business',
            'regional',
            'appearance',
            'notifications',
            'receipt',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_regional(self, value):
        """Validate regional settings structure"""
        if 'currency' in value:
            currency = value['currency']
            required_fields = ['code', 'symbol', 'name', 'position', 'decimalPlaces']
            for field in required_fields:
                if field not in currency:
                    raise serializers.ValidationError(
                        f"Currency must include '{field}' field"
                    )
        return value
    
    def validate_appearance(self, value):
        """Validate appearance settings"""
        valid_themes = [
            'default-blue', 'emerald-green', 'purple-galaxy',
            'sunset-orange', 'ocean-teal', 'rose-pink', 'slate-minimal'
        ]
        if 'themePreset' in value:
            if value['themePreset'] not in valid_themes:
                raise serializers.ValidationError(
                    f"Invalid theme preset. Must be one of: {', '.join(valid_themes)}"
                )
        return value
```

---

## 🎯 ViewSet

```python
# settings/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import BusinessSettings
from .serializers import BusinessSettingsSerializer

class BusinessSettingsViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing business settings
    """
    serializer_class = BusinessSettingsSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'patch', 'post']  # No DELETE
    
    def get_queryset(self):
        """Get settings for current user's business"""
        return BusinessSettings.objects.filter(
            business=self.request.user.business
        )
    
    def get_object(self):
        """Get or create settings for current business"""
        settings, created = BusinessSettings.objects.get_or_create(
            business=self.request.user.business,
            defaults=self.get_default_settings()
        )
        return settings
    
    def get_default_settings(self):
        """Default settings for new businesses"""
        return {
            'regional': {
                'currency': {
                    'code': 'USD',
                    'symbol': '$',
                    'name': 'US Dollar',
                    'position': 'before',
                    'decimalPlaces': 2
                },
                'timezone': 'UTC',
                'dateFormat': 'MM/DD/YYYY',
                'timeFormat': '12h',
                'firstDayOfWeek': 0,
                'numberFormat': 'en-US'
            },
            'appearance': {
                'colorScheme': 'auto',
                'themePreset': 'default-blue',
                'fontSize': 'medium',
                'compactMode': False,
                'animationsEnabled': True,
                'highContrast': False
            },
            'notifications': {
                'emailNotifications': True,
                'pushNotifications': True,
                'smsNotifications': False,
                'lowStockAlerts': True,
                'salesUpdates': True,
                'systemUpdates': True,
                'marketingEmails': False
            },
            'receipt': {
                'showLogo': True,
                'showTaxBreakdown': True,
                'showBarcode': True,
                'paperSize': 'thermal-80mm'
            }
        }
    
    def list(self, request):
        """GET /settings/api/settings/"""
        settings = self.get_object()
        serializer = self.get_serializer(settings)
        return Response(serializer.data)
    
    def partial_update(self, request):
        """PATCH /settings/api/settings/"""
        settings = self.get_object()
        serializer = self.get_serializer(
            settings,
            data=request.data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
    
    def create(self, request):
        """POST /settings/api/settings/"""
        # Check if settings already exist
        if BusinessSettings.objects.filter(business=request.user.business).exists():
            return Response(
                {'detail': 'Settings already exist. Use PATCH to update.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(business=request.user.business)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
```

---

## 🔗 URL Configuration

```python
# settings/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BusinessSettingsViewSet

router = DefaultRouter()
router.register(r'settings', BusinessSettingsViewSet, basename='settings')

app_name = 'settings'

urlpatterns = [
    path('api/', include(router.urls)),
]
```

```python
# project/urls.py
urlpatterns = [
    # ... other urls
    path('settings/', include('settings.urls')),
]
```

---

## 🧪 Testing

### Test Cases

```python
# settings/tests.py
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from .models import BusinessSettings

class BusinessSettingsAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        # Setup user and business
        # ...
        self.client.force_authenticate(user=self.user)
    
    def test_get_settings_creates_defaults(self):
        """GET should create settings if they don't exist"""
        response = self.client.get('/settings/api/settings/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('regional', response.data)
        self.assertIn('appearance', response.data)
    
    def test_update_currency(self):
        """PATCH should update currency"""
        data = {
            'regional': {
                'currency': {
                    'code': 'GHS',
                    'symbol': '₵',
                    'name': 'Ghanaian Cedi',
                    'position': 'before',
                    'decimalPlaces': 2
                }
            }
        }
        response = self.client.patch(
            '/settings/api/settings/',
            data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['regional']['currency']['code'], 'GHS')
    
    def test_update_theme(self):
        """PATCH should update theme"""
        data = {
            'appearance': {
                'themePreset': 'emerald-green'
            }
        }
        response = self.client.patch(
            '/settings/api/settings/',
            data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data['appearance']['themePreset'],
            'emerald-green'
        )
    
    def test_invalid_theme_rejected(self):
        """Invalid theme should be rejected"""
        data = {
            'appearance': {
                'themePreset': 'invalid-theme'
            }
        }
        response = self.client.patch(
            '/settings/api/settings/',
            data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
```

---

## 🚀 Deployment Checklist

### Phase 1: Database
- [ ] Create `settings` app
- [ ] Add `BusinessSettings` model
- [ ] Run migrations
- [ ] Verify database table created

### Phase 2: API
- [ ] Create serializer
- [ ] Create viewset
- [ ] Add URL configuration
- [ ] Test endpoints with Postman/curl

### Phase 3: Auto-create
- [ ] Add signal to create settings on business creation
- [ ] Backfill existing businesses

```python
# settings/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from businesses.models import Business
from .models import BusinessSettings

@receiver(post_save, sender=Business)
def create_business_settings(sender, instance, created, **kwargs):
    """Auto-create settings when business is created"""
    if created:
        BusinessSettings.objects.create(
            business=instance,
            regional={...},  # default values
            appearance={...},
            notifications={...},
            receipt={...}
        )
```

### Phase 4: Testing
- [ ] Run unit tests
- [ ] Test with frontend
- [ ] Verify persistence
- [ ] Test multi-user scenarios

### Phase 5: Documentation
- [ ] API documentation
- [ ] Update Swagger/OpenAPI
- [ ] Deployment notes

---

## 📊 Database Migration Script

For existing businesses without settings:

```python
# settings/management/commands/create_default_settings.py
from django.core.management.base import BaseCommand
from businesses.models import Business
from settings.models import BusinessSettings

class Command(BaseCommand):
    help = 'Create default settings for businesses without settings'
    
    def handle(self, *args, **options):
        businesses = Business.objects.filter(settings__isnull=True)
        count = 0
        
        for business in businesses:
            BusinessSettings.objects.create(
                business=business,
                regional={...},  # defaults
                appearance={...},
                notifications={...},
                receipt={...}
            )
            count += 1
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully created settings for {count} businesses'
            )
        )
```

Run with:
```bash
python manage.py create_default_settings
```

---

## 🔒 Permissions

### Security Considerations:

1. **User can only access their own business settings**
   - ✅ Implemented in `get_queryset()`
   
2. **No deletion of settings**
   - ✅ DELETE method not allowed
   
3. **Validate all JSON input**
   - ✅ Implemented in serializer validators

4. **Sanitize custom text fields**
   - ⚠️ If adding custom header/footer text, sanitize for XSS

---

## ✅ Acceptance Criteria

### Must Have:
- [ ] GET endpoint returns settings or creates defaults
- [ ] PATCH endpoint updates settings
- [ ] Settings persist across sessions
- [ ] One settings record per business
- [ ] Frontend can save and retrieve settings
- [ ] Currency changes reflect in all displays

### Should Have:
- [ ] Input validation on JSON fields
- [ ] Proper error messages
- [ ] Auto-create on business registration
- [ ] Migration script for existing businesses

### Nice to Have:
- [ ] Settings history/audit log
- [ ] Rollback to previous settings
- [ ] Export/import settings

---

## 📞 Questions?

**Frontend Developer:** Has complete implementation ready  
**Backend Developer:** Use this doc to implement API  
**Timeline:** Estimated 4-8 hours for complete implementation

**Contact:** Frontend team for any clarifications

---

**Status:** 📋 SPECIFICATION COMPLETE  
**Next Step:** Backend implementation  
**Priority:** MEDIUM (feature works with temporary storage, needs persistence)
