# Export Automation - Backend Implementation Requirements

## Overview

Frontend implementation is complete and ready. Backend needs to implement the Export Automation API endpoints.

**Implementation Date**: October 12, 2025  
**Status**: ⚠️ Backend Pending

---

## URL Structure

Following the existing backend pattern:
```
/inventory/api/...  ← Inventory module
/sales/api/...      ← Sales module  
/reports/api/...    ← Reports module (NEW)
```

**Base URL for Export Automation**:
```
/reports/api/automation/
```

---

## Required Endpoints

### 📅 Schedule Management (`/reports/api/automation/schedules/`)

| Method | Endpoint | Purpose | Status |
|--------|----------|---------|--------|
| GET | `/reports/api/automation/schedules/` | List all schedules | ❌ Not Implemented |
| POST | `/reports/api/automation/schedules/` | Create new schedule | ❌ Not Implemented |
| GET | `/reports/api/automation/schedules/{id}/` | Get schedule details | ❌ Not Implemented |
| PUT | `/reports/api/automation/schedules/{id}/` | Update schedule (full) | ❌ Not Implemented |
| PATCH | `/reports/api/automation/schedules/{id}/` | Update schedule (partial) | ❌ Not Implemented |
| DELETE | `/reports/api/automation/schedules/{id}/` | Delete schedule | ❌ Not Implemented |
| POST | `/reports/api/automation/schedules/{id}/activate/` | Activate schedule | ❌ Not Implemented |
| POST | `/reports/api/automation/schedules/{id}/deactivate/` | Deactivate schedule | ❌ Not Implemented |
| POST | `/reports/api/automation/schedules/{id}/trigger/` | Run schedule now | ❌ Not Implemented |
| GET | `/reports/api/automation/schedules/upcoming/` | Get next 10 upcoming runs | ❌ Not Implemented |
| GET | `/reports/api/automation/schedules/overdue/` | Get overdue schedules | ❌ Not Implemented |

### 📊 Export History (`/reports/api/automation/history/`)

| Method | Endpoint | Purpose | Status |
|--------|----------|---------|--------|
| GET | `/reports/api/automation/history/` | List export history (paginated) | ❌ Not Implemented |
| GET | `/reports/api/automation/history/{id}/` | Get execution details | ❌ Not Implemented |
| GET | `/reports/api/automation/history/{id}/download/` | Download export file | ❌ Not Implemented |
| GET | `/reports/api/automation/history/statistics/` | Get export statistics | ❌ Not Implemented |
| GET | `/reports/api/automation/history/recent/` | Get last 10 exports | ❌ Not Implemented |

### 🔔 Notifications (`/reports/api/automation/notifications/`)

| Method | Endpoint | Purpose | Status |
|--------|----------|---------|--------|
| GET | `/reports/api/automation/notifications/` | Get notification settings | ❌ Not Implemented |
| PUT | `/reports/api/automation/notifications/` | Update notification settings | ❌ Not Implemented |

**Total Endpoints**: 20

---

## Data Models

### ExportSchedule

```typescript
{
  id: UUID
  business: UUID
  created_by: UUID
  name: string
  export_type: "SALES" | "CUSTOMERS" | "INVENTORY" | "FINANCIAL" | "PRODUCTS" | "STOCK_MOVEMENTS"
  format: "csv" | "excel" | "json"
  frequency: "DAILY" | "WEEKLY" | "MONTHLY"
  hour: number (0-23)
  day_of_week?: number (0-6, Monday=0)  // For WEEKLY only
  day_of_month?: number (1-28)           // For MONTHLY only
  recipients: string[]                   // Email addresses
  cc_recipients?: string[]               // Optional CC emails
  include_creator_email: boolean
  email_subject?: string
  email_message?: string
  filters?: Record<string, any>          // Export-specific filters
  is_active: boolean
  last_run_at?: datetime
  next_run_at?: datetime
  created_at: datetime
  updated_at: datetime
}
```

### ExportHistory

```typescript
{
  id: UUID
  schedule?: UUID                        // Null for manual exports
  business: UUID
  triggered_by: UUID
  export_type: "SALES" | "CUSTOMERS" | "INVENTORY" | "FINANCIAL" | "PRODUCTS" | "STOCK_MOVEMENTS"
  format: "csv" | "excel" | "json"
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "EMAILED"
  trigger: "SCHEDULED" | "MANUAL" | "API"
  file_path?: string
  file_size?: number                     // In bytes
  filters?: Record<string, any>
  error_message?: string
  started_at: datetime
  completed_at?: datetime
  emailed_at?: datetime
  created_at: datetime
}
```

### ExportStatistics

```typescript
{
  total_exports: number
  successful_exports: number
  failed_exports: number
  total_file_size: number                // In bytes
  success_rate: number                   // Percentage
  last_export_at?: datetime
  active_schedules: number
}
```

### ExportNotificationSettings

```typescript
{
  business: UUID
  enable_notifications: boolean
  notify_on_success: boolean
  notify_on_failure: boolean
  default_recipients: string[]           // Email addresses
  cc_recipients?: string[]               // Optional CC emails
  updated_at: datetime
}
```

---

## Request/Response Examples

### Create Daily Schedule

**Request**:
```http
POST /reports/api/automation/schedules/
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "Daily Sales Report",
  "export_type": "SALES",
  "format": "excel",
  "frequency": "DAILY",
  "hour": 8,
  "recipients": ["accounting@company.com"],
  "include_creator_email": true,
  "filters": {
    "start_date": "2024-01-01",
    "end_date": "2024-12-31"
  },
  "is_active": true
}
```

**Response** (201 Created):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "business": "123e4567-e89b-12d3-a456-426614174000",
  "created_by": "987fcdeb-51a2-43d7-8912-abcdef123456",
  "name": "Daily Sales Report",
  "export_type": "SALES",
  "format": "excel",
  "frequency": "DAILY",
  "hour": 8,
  "day_of_week": null,
  "day_of_month": null,
  "recipients": ["accounting@company.com"],
  "cc_recipients": [],
  "include_creator_email": true,
  "email_subject": null,
  "email_message": null,
  "filters": {
    "start_date": "2024-01-01",
    "end_date": "2024-12-31"
  },
  "is_active": true,
  "last_run_at": null,
  "next_run_at": "2024-10-13T08:00:00Z",
  "created_at": "2024-10-12T10:30:00Z",
  "updated_at": "2024-10-12T10:30:00Z"
}
```

### List Export History (Paginated)

**Request**:
```http
GET /reports/api/automation/history/?page=1&page_size=20&status=COMPLETED&export_type=SALES
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "count": 45,
  "next": "/reports/api/automation/history/?page=2&page_size=20",
  "previous": null,
  "results": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440111",
      "schedule": "550e8400-e29b-41d4-a716-446655440000",
      "business": "123e4567-e89b-12d3-a456-426614174000",
      "triggered_by": "987fcdeb-51a2-43d7-8912-abcdef123456",
      "export_type": "SALES",
      "format": "excel",
      "status": "COMPLETED",
      "trigger": "SCHEDULED",
      "file_path": "/exports/2024/10/sales_export_660e8400.xlsx",
      "file_size": 245760,
      "filters": {},
      "error_message": null,
      "started_at": "2024-10-12T08:00:00Z",
      "completed_at": "2024-10-12T08:02:15Z",
      "emailed_at": "2024-10-12T08:02:30Z",
      "created_at": "2024-10-12T08:00:00Z"
    }
    // ... more results
  ]
}
```

### Get Export Statistics

**Request**:
```http
GET /reports/api/automation/history/statistics/
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "total_exports": 127,
  "successful_exports": 120,
  "failed_exports": 7,
  "total_file_size": 52428800,
  "success_rate": 94.49,
  "last_export_at": "2024-10-12T08:02:15Z",
  "active_schedules": 5
}
```

### Download Export File

**Request**:
```http
GET /reports/api/automation/history/660e8400-e29b-41d4-a716-446655440111/download/
Authorization: Bearer {token}
```

**Response** (200 OK):
```http
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="sales_export_2024-10-12.xlsx"
Content-Length: 245760

[Binary file data]
```

---

## Query Parameters

### Schedule List (`GET /reports/api/automation/schedules/`)

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `is_active` | boolean | Filter by active status | `?is_active=true` |
| `export_type` | string | Filter by export type | `?export_type=SALES` |
| `frequency` | string | Filter by frequency | `?frequency=DAILY` |

### History List (`GET /reports/api/automation/history/`)

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `page` | integer | Page number (default: 1) | `?page=2` |
| `page_size` | integer | Results per page (default: 20) | `?page_size=50` |
| `status` | string | Filter by status | `?status=COMPLETED` |
| `export_type` | string | Filter by export type | `?export_type=SALES` |
| `trigger` | string | Filter by trigger type | `?trigger=MANUAL` |
| `schedule` | UUID | Filter by schedule ID | `?schedule={uuid}` |
| `start_date` | date | Filter from date | `?start_date=2024-10-01` |
| `end_date` | date | Filter to date | `?end_date=2024-10-31` |

---

## Business Logic Requirements

### Schedule Validation

1. **Frequency-specific fields**:
   - DAILY: No `day_of_week` or `day_of_month`
   - WEEKLY: Requires `day_of_week` (0-6)
   - MONTHLY: Requires `day_of_month` (1-28)

2. **Email validation**:
   - All recipients must be valid email addresses
   - At least one recipient required

3. **Hour validation**:
   - Must be 0-23
   - Represents UTC time

### Next Run Calculation

```python
def calculate_next_run(schedule):
    if schedule.frequency == "DAILY":
        next_run = datetime.now().replace(hour=schedule.hour, minute=0)
        if next_run < datetime.now():
            next_run += timedelta(days=1)
    
    elif schedule.frequency == "WEEKLY":
        current_day = datetime.now().weekday()
        days_ahead = schedule.day_of_week - current_day
        if days_ahead <= 0:
            days_ahead += 7
        next_run = datetime.now() + timedelta(days=days_ahead)
        next_run = next_run.replace(hour=schedule.hour, minute=0)
    
    elif schedule.frequency == "MONTHLY":
        next_run = datetime.now().replace(
            day=schedule.day_of_month,
            hour=schedule.hour,
            minute=0
        )
        if next_run < datetime.now():
            # Move to next month
            if next_run.month == 12:
                next_run = next_run.replace(year=next_run.year + 1, month=1)
            else:
                next_run = next_run.replace(month=next_run.month + 1)
    
    return next_run
```

### Export Execution

1. Update schedule's `last_run_at` and calculate new `next_run_at`
2. Create ExportHistory record with status="PENDING"
3. Process export asynchronously (Celery task recommended)
4. Update ExportHistory status to "PROCESSING"
5. Generate export file
6. Save file and update `file_path`, `file_size`
7. Update status to "COMPLETED" or "FAILED"
8. If enabled and successful, send email notification
9. Update `emailed_at` timestamp

### File Storage

- Store files in secure location (e.g., `/media/exports/{year}/{month}/`)
- Include business ID in path for isolation
- Auto-cleanup old exports (e.g., delete after 30 days)
- Implement access control (user can only download their business exports)

### Email Notifications

Send email when:
- Export completes successfully (if `notify_on_success=true`)
- Export fails (if `notify_on_failure=true`)

Email should include:
- Export name and type
- Status (Success/Failed)
- Download link (if successful)
- Error message (if failed)
- Recipients: `recipients` + `cc_recipients` + creator (if `include_creator_email=true`)

---

## Permissions

### Required Permissions

- `reports.view_exportschedule` - View schedules
- `reports.add_exportschedule` - Create schedules
- `reports.change_exportschedule` - Edit schedules
- `reports.delete_exportschedule` - Delete schedules
- `reports.view_exporthistory` - View export history
- `reports.download_export` - Download export files

### Business Isolation

- Users can only access their own business's exports
- Filter all queries by `business=request.user.business`
- Validate schedule/history ownership before operations

---

## Celery Tasks (Recommended)

```python
@shared_task
def execute_scheduled_export(schedule_id):
    """
    Execute a scheduled export
    """
    schedule = ExportSchedule.objects.get(id=schedule_id)
    history = ExportHistory.objects.create(
        schedule=schedule,
        business=schedule.business,
        triggered_by=schedule.created_by,
        export_type=schedule.export_type,
        format=schedule.format,
        status="PROCESSING",
        trigger="SCHEDULED",
    )
    
    try:
        # Generate export based on type
        file_path = generate_export(schedule)
        
        history.file_path = file_path
        history.file_size = os.path.getsize(file_path)
        history.status = "COMPLETED"
        history.completed_at = timezone.now()
        history.save()
        
        # Send email if enabled
        if should_send_notification(schedule, success=True):
            send_export_email(history)
            history.emailed_at = timezone.now()
            history.save()
    
    except Exception as e:
        history.status = "FAILED"
        history.error_message = str(e)
        history.completed_at = timezone.now()
        history.save()
        
        # Send failure notification
        if should_send_notification(schedule, success=False):
            send_failure_email(history)


@periodic_task(run_every=crontab(minute='*/10'))
def check_pending_exports():
    """
    Check for schedules that need to run
    """
    now = timezone.now()
    pending_schedules = ExportSchedule.objects.filter(
        is_active=True,
        next_run_at__lte=now
    )
    
    for schedule in pending_schedules:
        execute_scheduled_export.delay(schedule.id)
        schedule.last_run_at = now
        schedule.next_run_at = calculate_next_run(schedule)
        schedule.save()
```

---

## Testing Endpoints

Use these curl commands to test:

```bash
# List schedules
curl -H "Authorization: Bearer {token}" \
  http://localhost:8000/reports/api/automation/schedules/

# Create schedule
curl -X POST -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","export_type":"SALES","format":"csv","frequency":"DAILY","hour":8,"recipients":["test@example.com"],"include_creator_email":true,"is_active":true}' \
  http://localhost:8000/reports/api/automation/schedules/

# Get statistics
curl -H "Authorization: Bearer {token}" \
  http://localhost:8000/reports/api/automation/history/statistics/

# List history
curl -H "Authorization: Bearer {token}" \
  http://localhost:8000/reports/api/automation/history/?page=1&page_size=20
```

---

## Frontend Implementation Status

✅ **Complete** - Frontend is fully implemented and waiting for backend:

- Type definitions (168 lines)
- API service layer (186 lines)
- Redux state management (580 lines)
- 5 UI components (~1,505 lines)
- Routes and navigation
- Full CRUD operations
- File download handling
- Pagination support
- Error handling

**Total**: ~2,900 lines of production-ready code

---

## Priority Implementation Order

### Phase 1 (MVP - Week 1)
1. Schedule CRUD endpoints
2. Basic export execution (Sales report only)
3. History list endpoint
4. Statistics endpoint

### Phase 2 (Week 2)
5. File download endpoint
6. Email notifications
7. Activate/Deactivate endpoints
8. Trigger endpoint (run now)

### Phase 3 (Week 3)
9. Additional export types (Customers, Inventory)
10. Notification settings endpoints
11. Upcoming/overdue endpoints
12. Advanced filters

---

## Documentation References

- [Quick Reference](./EXPORT-AUTOMATION-QUICK-REFERENCE.md) - API endpoints
- [Implementation Plan](./EXPORT-AUTOMATION-IMPLEMENTATION-PLAN.md) - Frontend guide
- [Complete Summary](./EXPORT-AUTOMATION-COMPLETE-SUMMARY.md) - Full implementation

---

## Contact

For questions or clarifications, refer to the frontend implementation in:
- `src/services/exportAutomationService.ts`
- `src/types/exports.ts`
- `src/store/slices/exportAutomationSlice.ts`
