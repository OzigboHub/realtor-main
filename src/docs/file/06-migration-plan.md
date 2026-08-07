# 06 — Migration Plan & Rollout Roadmap

This document outlines the phased migration strategy to transition from legacy server-side procedures to the production NestJS backend API (`realtor-main`) and Next.js frontend (`realtor-web`).

---

## 1. Migration Overview & Key Objectives

- **Zero-Downtime Transition:** Existing property listings, user accounts, building records, and leases must remain continuously accessible.
- **Data Integrity:** Schema updates applied via automated Prisma migration scripts (`prisma migrate deploy`).
- **Complete Decoupling:** Next.js (`realtor-web`) transitions to a client application consuming the NestJS REST API.

---

## 2. Phased Rollout Schedule

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Phase 1     │───▶│     Phase 2     │───▶│     Phase 3     │
│ Core API & Auth │    │ Property Search │    │ Facilities &    │
│ Hardening       │    │ & Redis Cache   │    │ Tenancy Module  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                      │                      │
         ▼                      ▼                      ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Phase 4     │───▶│     Phase 5     │───▶│     Phase 6     │
│ Rent Payments & │    │ Next.js Web App │    │ Load Testing &  │
│ Paystack Hooks  │    │ API Cutover     │    │ Zero-Downtime Go│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## 3. Phase Specifications

### Phase 1: Core API & Auth Hardening
- **Objective:** Deploy NestJS core platform modules, security guards, and database schema.
- **Tasks:**
  1. Validate `prisma/schema.prisma` across PostgreSQL database.
  2. Implement global `JwtAuthGuard`, `@Roles()` guard, and `AuditInterceptor`.
  3. Deploy Auth module (`/auth/register`, `/auth/login`, `/auth/approve/:id`, `/auth/block/:id`).
  4. Enable structured logging (Pino) and health endpoints (`/health`).
- **Verification:** Unit tests and e2e authentication tests pass.

### Phase 2: Property Catalog & Search Optimization
- **Objective:** Deploy high-throughput property catalog APIs with Redis caching.
- **Tasks:**
  1. Implement `PropertiesModule`, `FavoritesModule`, and `ReviewsModule`.
  2. Create PostgreSQL composite search index (`idx_properties_search`).
  3. Connect Redis caching layer for property queries with automated cache invalidation hooks.
- **Verification:** Property search response times under 45ms (p95).

### Phase 3: Building Facilities & Tenancy Management Cutover
- **Objective:** Enable building facility management, sub-units, and lease tracking.
- **Tasks:**
  1. Deploy `BuildingsModule`, `UnitsModule`, `LeasesModule`, and `AgreementsModule`.
  2. Implement landlord tokenized caretaker invitation workflow.
  3. Configure tenant maintenance ticket progression service (`MaintenanceModule`).
- **Verification:** Landlords can register buildings, assign units, and issue tenant leases.

### Phase 4: Rent Payments & Paystack Webhooks
- **Objective:** Hardened payment processing and webhook handling.
- **Tasks:**
  1. Deploy `PaymentsModule` with Paystack payment initiation and verification.
  2. Implement `POST /payments/webhook` with HMAC-SHA512 signature verification.
  3. Set up BullMQ worker for receipt PDF rendering and email dispatch.
- **Verification:** Test payments via Paystack sandbox verify idempotency and write to `RentPayment` table.

### Phase 5: Next.js Web App (`realtor-web`) Decoupling
- **Objective:** Point frontend components to NestJS REST API endpoints.
- **Tasks:**
  1. Update frontend API client services to target `http://localhost:3000/api/v1` (or production URL).
  2. Replace server action database queries with authenticated `fetch()` calls.
  3. Implement Bearer token storage in secure HTTP-only cookies.
- **Verification:** End-to-end user journeys (registration -> login -> search -> book appointment -> pay rent) verified in browser.

### Phase 6: Load Testing & Production Launch
- **Objective:** Final security audit, load testing, and production cutover.
- **Tasks:**
  1. Execute load test simulating 5,000 concurrent users searching properties.
  2. Perform penetration test against RBAC endpoints.
  3. Switch DNS records to point to production NestJS API gateway.
- **Verification:** Zero downtime recorded, error rates < 0.01%.

---

## 4. Rollback Plan

If critical anomalies occur during Phase 5 or 6:
1. **Traffic Reversion:** Revert API gateway routes to previous stable release.
2. **Database Backward Compatibility:** Database migrations must strictly add non-breaking columns/tables.
3. **Session Preservation:** Active JWT secret is retained so users do not experience forced re-logins.
