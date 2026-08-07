# 03 — Target Security Model & Threat Matrix

This document outlines the security specifications, Role-Based Access Control (RBAC) matrix, threat model, and cryptographic standards enforced across the Realtor platform API (`realtor-main`).

---

## 1. Threat Model & Risk Analysis

| Threat Vectors | Impacted Assets | Mitigation Strategy |
|---|---|---|
| **Horizontal Privilege Escalation** | Tenant Leases, Rent Payments, Building Data | Repository-level tenant scoping filters (`WHERE landlordId = user.id`) |
| **Unauthorized Property Deletion** | Property Listings | Ownership verification guard (`agentId === user.id` OR `role === ADMIN`) |
| **Rent Amount Tampering** | Payment Transactions | Payment initiation derives amount strictly from database `Lease.rentAmount` |
| **Fake Webhook Injection** | Financial Receipts | Paystack `x-paystack-signature` HMAC-SHA512 verification |
| **Stale Token Hijacking** | User Accounts | Token blacklist check in Redis on every request + account block revokes session |
| **PII Data Leakage** | Lease Attachments, IDs | Cloudinary / S3 private ACLs with temporary presigned URLs |
| **Mass Assignment Vulnerabilities** | System User Roles | ValidationPipe configured with `forbidNonWhitelisted: true` |

---

## 2. Role-Based Access Control (RBAC) Matrix

The system enforces **7 discrete roles** via the `@Roles(...)` decorator:

| Domain / Resource | `USER` | `AGENT` | `LANDLORD` | `CARETAKER` | `TENANT` | `ADMIN` | `SUPER_ADMIN` |
|---|---|---|---|---|---|---|---|
| **Property Search & View** | READ | READ | READ | READ | READ | READ | READ |
| **Property CRUD** | - | CREATE, UPDATE, DELETE (Own) | CREATE, UPDATE, DELETE (Own) | - | - | FULL | FULL |
| **Agent Approval** | - | - | - | - | - | EXECUTE | EXECUTE |
| **User Blocking / Unblocking** | - | - | - | - | - | EXECUTE | EXECUTE |
| **Building Portfolio** | - | - | FULL (Own) | READ (Assigned) | - | READ | FULL |
| **Caretaker Invitations** | - | - | CREATE, REVOKE | - | - | READ | FULL |
| **Unit Management** | - | - | FULL | CREATE, UPDATE | - | READ | FULL |
| **Leases Management** | - | - | CREATE, TERMINATE | READ | READ (Own) | READ | FULL |
| **Rent Payments** | - | - | READ (Own Buildings) | - | INITIATE | READ | FULL |
| **Maintenance Requests** | - | - | READ, UPDATE | UPDATE | CREATE, READ (Own) | READ | FULL |
| **Audit Logs** | - | - | - | - | - | - | READ |

---

## 3. Authentication Architecture & Token Revocation

### 3.1 Token Lifecycles
- **Access Tokens:** Signed JWT containing `sub` (userId), `email`, `role`. Expiration: 15 minutes.
- **Refresh Tokens:** Opaque cryptographically random tokens stored in database with 7-day expiration.

### 3.2 Instant Revocation Mechanism
When an admin blocks a user (`PATCH /auth/block/:id`) or a user changes password:
1. User account record sets `isBlocked: true`.
2. Active user session key is pushed to Redis revocation set `bl:user:<userId>`.
3. `JwtAuthGuard` checks Redis on every request; if key exists, request is rejected with `401 Unauthorized`.

---

## 4. Financial Security & Payment Webhooks

### 4.1 Paystack Webhook Verification Algorithm
All incoming webhook calls (`POST /payments/webhook`) must pass HMAC SHA512 signature validation before processing:

```ts
const hash = crypto
  .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
  .update(JSON.stringify(request.body))
  .digest('hex');

if (hash !== request.headers['x-paystack-signature']) {
  throw new UnauthorizedException('Invalid payment webhook signature');
}
```

### 4.2 Idempotency Guard
Every payment event carries a unique `data.id`. Webhook handler records `event_id` in Redis. If duplicate webhook is received, processing is safely bypassed (`200 OK`).

---

## 5. Passwords & Data Protection Standards

- **Password Hashing:** `bcrypt` with cost factor of 12.
- **TLS Protocol:** TLS 1.3 enforced for all external HTTPS endpoints.
- **Media Access Control:** Private S3 buckets; media attachments (lease PDFs, government IDs) served via presigned URLs with 15-minute expiration.
