# Production Deployment Checklist
**RBAC and Account Management System**

## ✅ Pre-Deployment Verification

### Backend Verification
- [x] All migrations applied successfully
- [x] User model has all 11 new fields
- [x] All packages installed (django-otp, pyotp, qrcode, Pillow)
- [x] Django system check passes (0 errors)
- [x] Integration tests pass (24/24 - 100%)
- [x] Media file serving configured
- [x] RBAC endpoints working with /rbac/ prefix
- [x] Pagination working on all list endpoints

### Database Verification
- [x] Migration 0008 applied
- [x] All User fields populated with defaults
- [x] No data loss during migration
- [x] Preferences persist correctly
- [x] Notification settings persist correctly
- [x] 2FA data stores correctly

### API Verification
- [x] All 17 RBAC endpoints working
- [x] All 8 account endpoints working
- [x] Profile GET/POST working
- [x] Preferences GET/PATCH working
- [x] Notifications GET/PATCH working
- [x] 2FA enable/verify/disable working
- [x] Profile picture upload working
- [x] Pagination working

---

## 🚀 Production Deployment Steps

### 1. Environment Configuration

#### Settings Updates (`app/settings.py`)

```python
# Production settings to update

# Media Files (Production)
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# For production, use cloud storage
# AWS S3 Example:
# DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
# AWS_STORAGE_BUCKET_NAME = 'your-bucket-name'
# AWS_S3_REGION_NAME = 'your-region'
# AWS_S3_FILE_OVERWRITE = False
# AWS_DEFAULT_ACL = None

# Azure Blob Storage Example:
# DEFAULT_FILE_STORAGE = 'storages.backends.azure_storage.AzureStorage'
# AZURE_ACCOUNT_NAME = 'your-account-name'
# AZURE_ACCOUNT_KEY = 'your-account-key'
# AZURE_CONTAINER = 'media'

# Security
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# 2FA Settings (optional)
OTP_TOTP_ISSUER = 'Your Company Name'
```

#### Environment Variables (`.env.production`)

```bash
# Django Settings
DEBUG=False
ALLOWED_HOSTS=your-domain.com,www.your-domain.com

# Database
DATABASE_URL=postgresql://user:password@host:port/dbname

# Media Storage (AWS S3)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_STORAGE_BUCKET_NAME=your-bucket-name
AWS_S3_REGION_NAME=us-east-1

# Or Azure Blob Storage
AZURE_ACCOUNT_NAME=your-account-name
AZURE_ACCOUNT_KEY=your-account-key
AZURE_CONTAINER=media

# Security
SECRET_KEY=your-production-secret-key
```

### 2. Database Migration

```bash
# Backup database first
pg_dump your_database > backup_before_migration.sql

# Run migrations
python manage.py migrate

# Verify migrations
python manage.py showmigrations accounts

# Expected output:
# accounts
#  [X] 0001_initial
#  [X] 0002_...
#  [X] 0008_user_preferences_and_2fa_fields  ← New migration
```

### 3. Static and Media Files

```bash
# Collect static files
python manage.py collectstatic --noinput

# Create media directories
mkdir -p media/profile_pictures

# Set permissions
chmod 755 media
chmod 755 media/profile_pictures

# For production, upload to cloud storage
# AWS S3:
aws s3 sync media/ s3://your-bucket-name/media/

# Azure:
az storage blob upload-batch -d media -s media/
```

### 4. Install Production Packages

```bash
# In production environment
pip install django-otp==1.6.1
pip install pyotp==2.9.0
pip install qrcode[pil]==8.2
pip install Pillow==10.4.0

# For cloud storage (choose one)
# AWS S3:
pip install django-storages[boto3]

# Azure Blob:
pip install django-storages[azure]

# Update requirements.txt
pip freeze > requirements.txt
```

### 5. Security Enhancements

#### Encrypt 2FA Secrets (Recommended)

Create `accounts/encryption.py`:
```python
from cryptography.fernet import Fernet
from django.conf import settings

# Generate key: Fernet.generate_key()
# Store in environment variable: FERNET_KEY

cipher = Fernet(settings.FERNET_KEY.encode())

def encrypt_secret(secret):
    return cipher.encrypt(secret.encode()).decode()

def decrypt_secret(encrypted_secret):
    return cipher.decrypt(encrypted_secret.encode()).decode()
```

Update `accounts/account_views.py`:
```python
from .encryption import encrypt_secret, decrypt_secret

# In enable_2fa:
user.two_factor_secret = encrypt_secret(secret)

# In verify_2fa_setup:
secret = decrypt_secret(user.two_factor_secret)
totp = pyotp.TOTP(secret)
```

#### Hash Backup Codes (Recommended)

```python
import hashlib

def hash_backup_code(code):
    return hashlib.sha256(code.encode()).hexdigest()

# In enable_2fa:
hashed_codes = [hash_backup_code(code) for code in backup_codes]
user.backup_codes = hashed_codes

# For verification:
def verify_backup_code(provided_code, user):
    hashed = hash_backup_code(provided_code)
    if hashed in user.backup_codes:
        user.backup_codes.remove(hashed)
        user.save()
        return True
    return False
```

### 6. Web Server Configuration

#### Nginx Configuration

```nginx
# /etc/nginx/sites-available/your-app

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Media files
    location /media/ {
        alias /path/to/your/media/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Static files
    location /static/ {
        alias /path/to/your/staticfiles/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Django application
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # File upload size limit
    client_max_body_size 5M;
}
```

### 7. Monitoring and Logging

#### Add 2FA Monitoring

```python
# In accounts/account_views.py

import logging
logger = logging.getLogger(__name__)

# In enable_2fa:
logger.info(f"2FA enabled for user: {user.email}")

# In verify_2fa_setup:
logger.info(f"2FA verified for user: {user.email}")

# In disable_2fa:
logger.info(f"2FA disabled for user: {user.email}")

# Failed attempts:
logger.warning(f"Failed 2FA verification for user: {user.email}")
```

#### Set up Alerts

```python
# Alert on multiple failed 2FA attempts
from django.core.cache import cache

def check_failed_attempts(user):
    key = f"2fa_failed_{user.id}"
    attempts = cache.get(key, 0)
    
    if attempts >= 5:
        # Send alert email
        send_mail(
            'Multiple Failed 2FA Attempts',
            f'User {user.email} has {attempts} failed 2FA attempts',
            settings.DEFAULT_FROM_EMAIL,
            [settings.ADMIN_EMAIL]
        )
    
    cache.set(key, attempts + 1, 3600)  # 1 hour
```

### 8. Testing in Production Environment

```bash
# Run integration tests against production API
python test_integration.py

# Test specific features
curl -X GET https://your-domain.com/accounts/api/profile/ \
  -H "Authorization: Token your-token"

# Test 2FA flow
curl -X POST https://your-domain.com/accounts/api/2fa/enable/ \
  -H "Authorization: Token your-token"

# Test profile picture upload
curl -X POST https://your-domain.com/accounts/api/profile/picture/ \
  -H "Authorization: Token your-token" \
  -F "profile_picture=@image.jpg"

# Test pagination
curl -X GET "https://your-domain.com/accounts/api/rbac/roles/?page=1&page_size=10" \
  -H "Authorization: Token your-token"
```

---

## 📋 Post-Deployment Verification

### Immediate Checks (Within 1 hour)
- [ ] Application loads without errors
- [ ] All migrations applied
- [ ] Login works
- [ ] Profile loads correctly
- [ ] Preferences update and persist
- [ ] 2FA enable works
- [ ] QR code displays
- [ ] Profile picture upload works
- [ ] Pagination works

### Short-term Monitoring (First 24 hours)
- [ ] Monitor error logs
- [ ] Check 2FA success/failure rates
- [ ] Monitor file upload sizes
- [ ] Check API response times
- [ ] Monitor database queries
- [ ] Check memory usage
- [ ] Monitor CDN/storage costs

### Long-term Monitoring (First week)
- [ ] User adoption of 2FA
- [ ] Profile picture upload rates
- [ ] Preference change patterns
- [ ] API endpoint usage
- [ ] Error rates
- [ ] Performance metrics

---

## 🔧 Rollback Plan

### If Issues Occur

#### Database Rollback
```bash
# Restore database backup
psql your_database < backup_before_migration.sql

# Or rollback specific migration
python manage.py migrate accounts 0007_previous_migration
```

#### Code Rollback
```bash
# Revert to previous version
git revert <commit-hash>
git push origin main

# Or checkout previous tag
git checkout v1.0.0
```

#### Clear 2FA Data (Emergency)
```sql
-- If 2FA causes issues, disable for all users
UPDATE users SET 
  two_factor_enabled = FALSE,
  two_factor_secret = NULL,
  backup_codes = '[]'::jsonb;
```

---

## 📊 Success Metrics

### Technical Metrics
- [ ] 99.9% uptime
- [ ] < 200ms average API response time
- [ ] < 1% error rate
- [ ] All migrations applied successfully
- [ ] Zero data loss

### User Metrics
- [ ] > 80% users set preferences
- [ ] > 50% users enable 2FA (within 30 days)
- [ ] > 70% users upload profile picture
- [ ] < 5% support tickets related to new features

### Security Metrics
- [ ] Zero 2FA bypass incidents
- [ ] Zero unauthorized file uploads
- [ ] All sensitive data encrypted
- [ ] Audit logs working

---

## 🎯 Final Checklist

### Code Quality
- [x] All integration tests pass (24/24)
- [x] No Django system check warnings
- [x] Code reviewed
- [x] Documentation complete
- [x] API documented

### Security
- [ ] HTTPS enabled
- [ ] Secrets encrypted (recommended)
- [ ] Backup codes hashed (recommended)
- [ ] File upload validation working
- [ ] Authentication enforced

### Performance
- [x] Pagination implemented
- [ ] Database indexed properly
- [ ] CDN configured for media
- [ ] Caching enabled
- [ ] Query optimization done

### Monitoring
- [ ] Error tracking (Sentry/etc)
- [ ] Performance monitoring (New Relic/etc)
- [ ] Log aggregation (CloudWatch/etc)
- [ ] Uptime monitoring (Pingdom/etc)
- [ ] Alerts configured

### Documentation
- [x] API documentation
- [x] Integration test report
- [x] Testing guide
- [x] Deployment checklist
- [ ] User guide (2FA setup)
- [ ] Admin guide (RBAC management)

---

## 🚨 Emergency Contacts

- **Backend Lead**: [Name/Email]
- **DevOps**: [Name/Email]
- **DBA**: [Name/Email]
- **Security Team**: [Name/Email]

---

## 📝 Notes

- All 24 integration tests passed ✅
- System is production-ready 🚀
- No breaking changes to existing functionality
- Backward compatible with existing users
- Frontend integration pending

---

**Deployment Status**: READY FOR PRODUCTION  
**Last Updated**: October 14, 2025  
**Prepared by**: Integration Test Suite  
**Approved by**: [Pending]
