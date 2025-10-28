# Business Access, Invitation & Storefront Assignment Contracts

This guide documents how the frontend should interact with the backend to invite employees, onboard users via invitations, manage business memberships, and assign members to storefronts.

---

## Domain model snapshot

### `BusinessInvitation`
| Field | Type | Notes |
| --- | --- | --- |
| `id` | UUID | Invitation identifier. |
| `business` | UUID | Business the invite belongs to. |
| `email` | string | Recipient email; must be unique per open invite. |
| `role` | string (enum) | e.g. `OWNER`, `MANAGER`, `STAFF`. |
| `storefronts` | array<UUID> | Optional default storefront assignments. |
| `invited_by` | UUID | User who created the invite. |
| `token` | string | One-time acceptance token. |
| `status` | string (enum) | `PENDING`, `ACCEPTED`, `EXPIRED`, `REVOKED`. |
| `expires_at` | ISO datetime | Invite expiry. |
| `accepted_at` | ISO datetime or `null` | Populated when token redeemed. |
| `created_at` / `updated_at` | ISO datetime | Timestamps. |

### `BusinessMembership`
| Field | Type | Notes |
| --- | --- | --- |
| `id` | UUID | Membership identifier. |
| `business` | UUID | Business reference. |
| `user` | UUID | Linked user account. |
| `role` | string (enum) | Mirrors invitation role. |
| `status` | string (enum) | `ACTIVE`, `SUSPENDED`, `PENDING`. |
| `assigned_storefronts` | array<UUID> | Storefronts member can operate. |
| `created_at` / `updated_at` | ISO datetime | Audit fields. |

### `User`
| Field | Type | Notes |
| --- | --- | --- |
| `id` | UUID | Primary key. |
| `email` | string | Unique; must match invitation for employee sign-up. |
| `name` | string | Full display name. |
| `password` | string | Hashed server-side; never returned. |
| `is_active` | boolean | Controls login. |
| `phone` | string or `null` | Optional. |

---

## Core workflows

### 1. Sending an invitation
1. Authorized business owner/manager submits invite form.
2. Backend creates `BusinessInvitation` with status `PENDING`, generates `token`, emails invite.
3. Optional storefront assignments stored with invitation for later bootstrapping.

### 2. Employee account creation
1. Frontend sign-up form requires email + token (from invite link).
2. Backend validates the invitation (email match, status `PENDING`, not expired).
3. On success, backend creates `User`, links a `BusinessMembership`, marks invitation `ACCEPTED`.

### 3. Managing memberships
- Owners can view/update membership roles and statuses.
- Storefront assignments are updated via membership endpoints (not invitation after acceptance).

---

## Invitation endpoints

### List invitations
- `GET /inventory/api/businesses/<business_id>/invitations/`
- Query params: `status`, `page`.
- Response (200):
```json
{
  "count": 12,
  "next": "https://.../invitations/?page=2",
  "previous": null,
  "results": [
    {
      "id": "6bdbd7ef-4f8e-46a1-a33f-1f2b901c5bf4",
      "email": "ama@example.com",
      "role": "STAFF",
      "storefronts": ["9eafec8f-2f3b-476b-8cf4-1b07f01c5733"],
      "status": "PENDING",
      "token": null,
      "expires_at": "2025-10-31T23:59:59Z",
      "invited_by_name": "Kojo Mensah",
      "created_at": "2025-10-02T10:42:18Z"
    }
  ]
}
```
- Token omitted unless requester has `can_view_tokens`.

### Create invitation
- `POST /inventory/api/businesses/<business_id>/invitations/`
```json
{
  "email": "ama@example.com",
  "role": "STAFF",
  "storefronts": ["9eafec8f-2f3b-476b-8cf4-1b07f01c5733"],
  "send_email": true
}
```
- Responses:
  - `201 Created` with serialized invitation.
  - `400` if email invalid or already invited.
  - `403` if caller lacks permission.

### Resend invitation email
- `POST /inventory/api/invitations/<invitation_id>/resend/`
- No body required.
- Returns `202 Accepted` on queueing.

### Revoke invitation
- `POST /inventory/api/invitations/<invitation_id>/revoke/`
- Response `200` with updated status `REVOKED`.

---

## Invitation acceptance & employee sign-up

### Validate token (pre-check)
- `GET /auth/invitations/<token>/`
- Response `200`:
```json
{
  "email": "ama@example.com",
  "business_name": "Cow Lane Stores",
  "role": "STAFF",
  "expires_at": "2025-10-31T23:59:59Z"
}
```
- Errors: `404` invalid token, `410` expired, `409` already accepted.

### Complete registration
- `POST /auth/invitations/<token>/accept/`
```json
{
  "email": "ama@example.com",
  "name": "Ama Mensah",
  "password": "PlainText@123",
  "phone": "+233200000000"
}
```
- Backend auto-creates user + membership; response `201`:
```json
{
  "user": {
    "id": "f1d7e7d5-38b4-4e7c-ad39-a36b3ceaa47f",
    "email": "ama@example.com",
    "name": "Ama Mensah"
  },
  "membership": {
    "id": "54c0c4dd-1def-4599-b592-7a8b16e81da5",
    "business": "11c5a2af-0851-48ce-8e83-77a21ab2df70",
    "role": "STAFF",
    "status": "ACTIVE",
    "assigned_storefronts": ["9eafec8f-2f3b-476b-8cf4-1b07f01c5733"]
  },
  "auth": {
    "token": "generated-auth-token"
  }
}
```
- Validation errors: `400` (password strength, email mismatch).
- Security: request must use HTTPS; rate limit per IP.

---

## Membership management endpoints

### List memberships
- `GET /inventory/api/businesses/<business_id>/memberships/`
- Supports `search` (name/email), `role`, `status`, `page`.
- Response:
```json
{
  "count": 8,
  "results": [
    {
      "id": "54c0c4dd-1def-4599-b592-7a8b16e81da5",
      "user": {
        "id": "f1d7e7d5-38b4-4e7c-ad39-a36b3ceaa47f",
        "name": "Ama Mensah",
        "email": "ama@example.com",
        "status": "ACTIVE"
      },
      "role": "STAFF",
      "status": "ACTIVE",
      "assigned_storefronts": [
        {
          "id": "9eafec8f-2f3b-476b-8cf4-1b07f01c5733",
          "name": "Cow Lane Store"
        }
      ],
      "created_at": "2025-10-02T10:45:00Z"
    }
  ]
}
```

### Update role or status
- `PATCH /inventory/api/memberships/<membership_id>/`
```json
{
  "role": "MANAGER",
  "status": "ACTIVE"
}
```
- Responses: `200` success, `400` invalid transition, `403` insufficient rights.

### Assign storefronts
- `PUT /inventory/api/memberships/<membership_id>/storefronts/`
```json
{
  "storefronts": [
    "9eafec8f-2f3b-476b-8cf4-1b07f01c5733",
    "0f18bc61-373e-41f0-b65f-6d2ed9a51732"
  ]
}
```
- Backend replaces assignments atomically.
- Response `200` with updated membership.
- `409` if storefront belongs to different business.

### Remove membership
- `DELETE /inventory/api/memberships/<membership_id>/`
- Converts member to `SUSPENDED` or hard deletes depending on policy.
- Response `204` or `200` with updated status.

---

## Supporting lookup endpoints

### Storefront options for assignment
- `GET /inventory/api/businesses/<business_id>/storefront-options/`
- Response array of `{ "id": UUID, "name": string, "status": "ACTIVE" }`.

### Role catalogue
- `GET /inventory/api/roles/`
- Returns available role values and descriptions for dropdown population.

---

## Frontend form requirements

### Invite form (image reference)
- Fields to capture:
  - `full_name` (optional, used for email salutation only).
  - `work_email` → maps to `email`.
  - `role` dropdown → must map to backend role enum.
  - `storefronts` multi-select (IDs).
  - `send_email` checkbox (if false, front-end still receives token to copy).
- Submit to invitation create endpoint.
- After success, refresh invitation list (`GET`).

### Employee roster list
- Use membership list endpoint.
- Surface columns: `name`, `email`, `role`, `status`, `storefronts`.
- “Assign storefronts” button should open modal using storefront assignment endpoint.

### Manage actions
- `Resend invite` → calls resend endpoint.
- `Revoke` → call revoke endpoint, then refetch list.
- `Manage` (edit role/status/storefronts) → call membership patch/put endpoints.

---

## Validation & error handling

| Endpoint | Error | Condition | Suggested UI response |
| --- | --- | --- | --- |
| Invite create | `400 email` | Existing active invite | Show “This email already has a pending invitation.” |
| Invite create | `409` | Email already a member | Display “User already belongs to this business.” |
| Accept invite | `410` | Expired token | Guide user to request resend. |
| Membership update | `403` | Caller lacks admin rights | Show toast “You don’t have permission to edit members.” |
| Storefront assign | `409` | Storefront outside business | Disable selection in UI once list fetched. |

---

## TypeScript helper interfaces (optional)

```ts
export interface BusinessInvitation {
  id: string;
  business: string;
  email: string;
  role: 'OWNER' | 'MANAGER' | 'STAFF';
  storefronts: string[];
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
  expires_at: string;
  created_at: string;
  invited_by_name: string;
}

export interface Membership {
  id: string;
  business: string;
  role: 'OWNER' | 'MANAGER' | 'STAFF';
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING';
  user: {
    id: string;
    name: string;
    email: string;
    status: 'ACTIVE' | 'INACTIVE';
  };
  assigned_storefronts: Array<{ id: string; name: string }>;
  created_at: string;
}
```

---

## Next steps
- Confirm enum values (`role`, `status`) with backend constants before hard-coding.
- Ensure invitation emails supply the acceptance URL: `<frontend-host>/accept-invite?token=<token>`.
- Coordinate with backend on any custom email templates or extra metadata (phone, job title).
- After mutations (create/update/delete), refetch page 1 to keep pagination in sync.

---

## Employee account creation vs general signup

Two backend entry points exist for creating user accounts:

1. `POST /auth/users/` – for owners or standalone users initiating a new business. This route ignores invitations, creates only the `User`, and requires separate steps to join a business.
2. `POST /auth/invitations/<token>/accept/` – for employees joining via invitation. It validates the invitation token and email, marks the invitation accepted, creates the `User`, and establishes the corresponding `BusinessMembership` in a single transaction.

Frontend implications when the user chooses the *Employee* option:

- Require the invite token (either embedded in the acceptance URL or pasted by the user). Use `GET /auth/invitations/<token>/` to prefill the email and show the business/role.
- Submit the registration form to the accept endpoint; do not call `POST /auth/users/` for invited employees, otherwise the membership will not be created and the signup will fail.
- If the token is invalid, expired, or already used, surface the API error (`404`, `410`, or `409`) and prompt the user to request a fresh invitation.
