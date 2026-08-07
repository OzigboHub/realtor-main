# 01 — Target Architecture Specification

## 1. System Topology & Architecture

```
                          ┌──────────────────────────────┐
   Next.js App Router ───▶│                              │
   (realtor-web)          │      API Gateway / WAF       │  Rate limiting, TLS termination,
   Mobile Clients ───────▶│                              │  CORS, bot protection
   Paystack Webhooks ────▶└──────────────┬───────────────┘
                                         │
                          ┌──────────────▼───────────────┐
                          │      NestJS API (N pods)     │  Stateless, horizontally scalable
                          │  ┌────────────────────────┐  │
                          │  │ Guards → Interceptors  │  │  Auth, roles, audit logging,
                          │  │ → Controllers          │  │  validation, serialization
                          │  │ → Services (Domain)    │  │
                          │  │ → Repositories (Prisma)│  │
                          │  └────────────────────────┘  │
                          └───┬────────┬────────┬────────┘
                              │        │        │
               ┌──────────────▼─┐  ┌───▼────┐  ┌▼─────────────┐
               │ PostgreSQL     │  │ Redis  │  │ Cloudinary / │
               │ Primary +      │  │ Cache  │  │ S3 Storage   │
               │ Read Replica   │  │ Queue  │  │ Image & Doc  │
               │ (via PgBouncer)│  │ Rate   │  │ Attachments  │
               └────────────────┘  └────┬───┘  └──────────────┘
                                        │
                          ┌─────────────▼──────────────┐
                          │  Worker Pods (BullMQ)      │
                          │  Email, WhatsApp, Receipts,│
                          │  Lease Expiry Reminders    │
                          └────────────────────────────┘
```

**Architectural Model:** The Next.js web application (`realtor-web`) operates as a decoupled frontend client, delegating all domain logic, data persistence, and security enforcement to the standalone NestJS REST API (`realtor-main`).

---

## 2. Technical Stack & Runtime Choices

| Layer / Concern | Technology Selection | Justification & Architectural Role |
|---|---|---|
| **API Framework** | NestJS 11 + Fastify Adapter | High throughput (~2x Express), structured dependency injection module tree |
| **Language** | TypeScript 5.x (Strict Mode) | Full type safety across DTOs, domain models, and service interfaces |
| **Database ORM** | Prisma 7 | Type-safe query building, migration engine, and schema definition |
| **Connection Pooling** | PgBouncer (Transaction Mode) | Prevents connection exhaustion across multiple application server instances |
| **Cache & Queue** | Redis (Valkey / Upstash) | High-speed cache for property searches, session invalidation, and rate limiting |
| **Background Jobs** | BullMQ | Asynchronous job execution for email notifications, WhatsApp alerts, and rent reminders |
| **Request Validation** | `class-validator` + `class-transformer` | Global strict DTO validation pipe with automatic payload trimming |
| **Auth & Security** | `@nestjs/passport`, Passport-JWT | Standardized JWT authorization guards, Google OAuth strategy |
| **API Documentation** | `@nestjs/swagger` | Auto-generated OpenAPI 3.0 documentation for frontend and mobile integration |
| **Logging** | Pino / Winston Structured Logging | Formatted JSON logs enriched with request IDs for observability |
| **Environment Config** | `@nestjs/config` + Zod Validation | Validated configuration schema loaded at application startup |

---

## 3. Architecture Layering Rules

```
Controller    ──────▶ HTTP interface only. Receives DTOs, invokes Services, returns DTO responses.
     │
Service       ──────▶ Contains domain logic, state machine transitions, transactions, and business rules.
     │
Repository    ──────▶ Interacts directly with PrismaService. Injects user context for multi-tenant scoping.
     │
Prisma / DB   ──────▶ PostgreSQL database queries via transaction-pooled connections.
```

### Mandated Coding Standards

1. **No Direct Prisma Access in Controllers:** Controllers must depend strictly on domain services and never inject `PrismaService`.
2. **DTO Scoping & Serialization:** Repositories and services must map raw database records into sanitized DTOs before returning data to controllers.
3. **Explicit State Machines:** State transitions (e.g. Appointment statuses, Lease states, Maintenance statuses) must execute through domain service state machine methods rather than inline conditional branches.

---

## 4. Module Map (`realtor-main/src`)

```
src/
├── main.ts                       # Application bootstrap, Swagger setup, global pipes
├── app.module.ts                 # Core application root module
│
├── common/                       # Shared utilities, decorators, guards, filters
│   ├── decorators/               # @Public(), @Roles(), @CurrentUser()
│   ├── guards/                   # JwtAuthGuard, RolesGuard
│   ├── interceptors/             # AuditInterceptor, TransformInterceptor
│   ├── filters/                  # HttpExceptionFilter
│   └── pipes/                    # Strict ValidationPipe, PaginationPipe
│
├── prisma/                       # Database service & transaction provider
│   ├── prisma.module.ts
│   └── prisma.service.ts
│
├── auth/                         # Authentication & identity management
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── strategies/               # JwtStrategy, GoogleStrategy
│
├── users/                        # Profile and user account administration
├── properties/                   # Property catalog, search & filtering
├── favorites/                    # User favorite property bookmarks
├── reviews/                      # Property review ratings & comments
├── appointments/                 # Inspection appointment booking
├── messages/                     # Direct messaging between users & agents
├── buildings/                    # Building facility management & invitations
├── units/                        # Building units management
├── leases/                       # Tenancy lease agreements & lifecycle
├── agreements/                   # Landlord-caretaker management agreements
├── payments/                     # Rent payments & Paystack gateway integration
├── maintenance/                  # Maintenance ticket requests & tracking
├── notifications/                # Multi-channel notification delivery
├── mail/                         # Email notification dispatching
├── whatsapp/                     # WhatsApp API messaging integration
├── audit/                        # Automated security audit trail logging
├── upload/                       # Media and document upload management
├── health/                       # Health check readiness & liveness probes
└── dashboard/                    # Role-specific administrative dashboard metrics
```

---

## 5. Cross-Cutting Component Specification

### 5.1 Authentication & Authorization Pipeline
- **`JwtAuthGuard`**: Intercepts requests, validates Bearer JWT signatures against JWT secret, checks token blacklists, and attaches payload to `request.user`.
- **`RolesGuard`**: Reads metadata attached by `@Roles(...)` decorator and checks whether `user.role` satisfies requirements.

### 5.2 Audit Logging System
- **`AuditInterceptor`**: Automatically captures write operations (`POST`, `PUT`, `PATCH`, `DELETE`), logging user identity, IP address, target entity type, entity ID, previous state, and updated state into `AuditLog`.

### 5.3 Request Validation & Response Standardisation
- Global `ValidationPipe` configured with:
  ```ts
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  ```
- Standardized API Response format across all endpoints:
  ```json
  {
    "success": true,
    "data": { ... },
    "meta": { "page": 1, "limit": 20, "total": 150 },
    "timestamp": "2026-08-07T17:20:00.000Z"
  }
  ```
