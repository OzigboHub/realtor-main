# Realtor Platform — NestJS Backend & Next.js Frontend Specification

**Status:** Technical Specification & System Design  
**Source System:** `realtor-web` — Next.js 16 App Router, React 19, Tailwind CSS  
**Target Backend:** Standalone NestJS 11 REST API (`realtor-main`), security-hardened, sized for 100,000+ active properties, users, leases, buildings, and payment transactions  
**Database:** PostgreSQL 16 + Prisma 7 ORM with PgBouncer connection pooling  

---

## Why This Specification Exists

The Realtor platform enables seamless interaction between property buyers/renters, real estate agents, landlords, caretakers, and system administrators. Business operations range from listing discovery and virtual appointments to full facility management, building units, leases, rent collection via Paystack, maintenance tickets, and messaging.

This documentation suite specifies the target architecture, full API contracts, security models, database schemas, performance/scaling design, and migration roadmap for the NestJS backend and Next.js frontend.

---

## Document Navigation Guide

| # | Document | Primary Focus & Target Audience |
|---|---|---|
| 1 | [01-architecture.md](./01-architecture.md) | High-level system topology, runtime stack, modular architecture, layering rules, and cross-cutting concerns |
| 2 | [02-functional-map.md](./02-functional-map.md) | Exhaustive REST API contract mapping across all 15 domain modules, roles, input DTOs, and state workflows |
| 3 | [03-security.md](./03-security.md) | Threat model, RBAC matrix (7 roles), JWT auth & revocation, PII protection, and webhook signature validation |
| 4 | [04-data-model.md](./04-data-model.md) | Prisma 7 schema definitions (15 models, 13 enums), entity relationship diagrams, database indexes, and retention rules |
| 5 | [05-scalability.md](./05-scalability.md) | 100k+ property search scaling strategy, Redis caching, PgBouncer transaction pooling, and BullMQ background tasks |
| 6 | [06-migration-plan.md](./06-migration-plan.md) | 6-phase rollout strategy for API hardening, frontend integration, data migration, and zero-downtime deployment |

---

## Scope & Functional Domains

The target backend platform encompasses **15 primary domain modules**:

| Domain | Key Models / Entities | Key Responsibilities & Capabilities |
|---|---|---|
| **Identity & Auth** | `User` | Registration, JWT login, Google OAuth 2.0, agent approval flow, user blocking/unblocking, password reset |
| **User Management** | `User` | Profile updates, role assignment, user directory management, avatar upload |
| **Properties** | `Property` | Property listings CRUD, multi-criteria filtering (price, category, location, amenities), status lifecycle |
| **Favorites** | `Favorite` | User property bookmarking and personal wishlist management |
| **Reviews & Ratings** | `Review` | Property rating (1–5 stars) and user feedback comments |
| **Appointments** | `Appointment` | Inspection booking between users & agents, status scheduling (PENDING, CONFIRMED, CANCELED, COMPLETED) |
| **Direct Messaging** | `Message` | Real-time / async chat between buyers, renters, agents, and landlords |
| **Building Management** | `Building`, `BuildingInvitation` | Landlord building portfolio, caretaker assignments, tokenized invitations |
| **Management Agreements**| `ManagementAgreement` | Formal landlord-caretaker agreements (rent collection, maintenance, full management) |
| **Unit Management** | `Unit` | Sub-division of buildings into distinct residential/commercial rental units & occupancy tracking |
| **Tenancy & Leases** | `Lease` | Tenant lease contracts, lease lifecycle (ACTIVE, TERMINATED, EXPIRED), rent calculation |
| **Rent & Payments** | `RentPayment` | Payment tracking, Paystack gateway integration, payment initiation, callback verification, receipts |
| **Maintenance** | `MaintenanceRequest` | Tenant maintenance tickets, caretaker assignment, ticket status progression (OPEN, IN_PROGRESS, RESOLVED) |
| **Notifications** | `Notification` | System notifications, email alerts via Resend/Nodemailer, WhatsApp notifications via API |
| **Audit & Governance** | `AuditLog` | Automated audit trail for all system mutations, IP tracking, role logging, state change diffs |

---

## Non-Negotiable Engineering Principles

1. **Deny by Default Security:** Every REST endpoint must carry explicit `@Roles(...)` or `@Public()` decorators. Uncertified routes are rejected by global guards.
2. **Strict Data Ownership:** Tenant and landlord queries are scoped at the repository level to prevent unauthorized access across accounts.
3. **Revocable Session Tokens:** Short-lived JWT access tokens paired with server-side session state for instant user revocation upon block or credential change.
4. **Server-Side Financial Integrity:** Rent and payment amounts are calculated from server-stored leases and fee structures. Client-provided payment amounts are strictly prohibited.
5. **Transactional Audit Logging:** Critical database mutations write an `AuditLog` entry within the same database transaction.
6. **Bounded Pagination:** All list endpoints enforce mandatory pagination with a hard limit of `take: 100` to prevent memory overload.
7. **Idempotency on External Hooks:** Paystack payment webhooks process event IDs idempotently to prevent duplicate payment crediting.
