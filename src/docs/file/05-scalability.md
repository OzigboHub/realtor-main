# 05 — Scalability & High-Throughput Design (100k+ Scale Plan)

This document outlines the performance optimization, caching architecture, connection management, and asynchronous worker queue design required to support **100,000+ active property listings**, 500,000+ registered users, and thousands of concurrent search requests.

---

## 1. Performance SLA & Query Budgets

| Operation Class | Target Response Time (p95) | Target Response Time (p99) | Execution SLA Strategy |
|---|---|---|---|
| **Property Search API** (`GET /properties`) | < 45 ms | < 90 ms | Redis cache hit or indexed Postgres multi-column index scan |
| **Property Details** (`GET /properties/:id`) | < 15 ms | < 35 ms | Direct primary key lookup cached in Redis (TTL 10 min) |
| **Authentication / Login** (`POST /auth/login`) | < 80 ms | < 150 ms | Bcrypt cost 12 execution + JWT signing |
| **Rent Payment Webhook** (`POST /payments/webhook`) | < 30 ms | < 60 ms | Fast async acknowledgement; enqueues processing job to BullMQ |
| **Dashboard Metrics** (`GET /dashboard/*`) | < 100 ms | < 250 ms | Materialized view / Redis pre-aggregated counters |

---

## 2. Redis Caching Architecture

```
                          ┌───────────────────────────┐
                          │    GET /properties?...    │
                          └─────────────┬─────────────┘
                                        │
                         ┌──────────────▼──────────────┐
                         │   Check Redis Cache Key     │
                         │ "prop:search:<hash(query)>" │
                         └──────┬──────────────┬───────┘
                                │ Cache        │ Cache
                                │ Hit          │ Miss
                         ┌──────▼──────┐  ┌────▼──────────────┐
                         │ Return JSON │  │ Execute Postgres  │
                         │ Cache Data  │  │ Indexed Query     │
                         └─────────────┘  └────┬──────────────┘
                                               │
                                          ┌────▼──────────────┐
                                          │ Write Result to   │
                                          │ Redis (TTL 300s)  │
                                          └───────────────────┘
```

### 2.1 Cache Key Taxonomy
- **Property Search:** `prop:search:<md5_hash_of_query_params>` (TTL: 300 seconds)
- **Property Details:** `prop:detail:<propertyId>` (TTL: 600 seconds)
- **User Profile:** `user:profile:<userId>` (TTL: 900 seconds)
- **Dashboard Summary:** `dash:<role>:<userId>` (TTL: 60 seconds)

### 2.2 Cache Invalidation Policy
- **On Property Create/Update/Delete:**
  ```ts
  await redis.del(`prop:detail:${propertyId}`);
  await redis.eval("return redis.call('del', unpack(redis.call('keys', 'prop:search:*')))");
  ```

---

## 3. Database Connection Pooling (PgBouncer)

### The Serverless & Multi-Pod Connection Problem
If 10 API instances run with Prisma default pool size 10, that opens 100 direct database connections. Under peak traffic spikes, connection limits on PostgreSQL are quickly exhausted.

### Solution: PgBouncer in Transaction Mode
- PgBouncer handles client connection multiplexing.
- Application pods connect to PgBouncer port 6432.
- **Max Application Connections:** 500
- **Postgres Database Connections:** 30–50 max pool size.

---

## 4. Asynchronous Processing via BullMQ Workers

To prevent HTTP request blocking, heavy side-effects execute asynchronously via BullMQ worker queues running on dedicated worker instances:

```
[ HTTP Controller ] ──(Enqueue Job)──▶ [ Redis Queue ] ──▶ [ BullMQ Worker Pod ]
                                                                     │
                                                 ┌───────────────────┼───────────────────┐
                                                 │                   │                   │
                                          ┌──────▼──────┐     ┌──────▼──────┐     ┌──────▼──────┐
                                          │ Resend Email│     │ WhatsApp API│     │ PDF Receipt │
                                          └─────────────┘     └─────────────┘     └─────────────┘
```

### Worker Queues Breakdown
1. **`notifications-queue`**: Handles email dispatches (appointment confirmations, password resets, welcome emails) and WhatsApp messages.
2. **`rent-reminders-queue`**: Cron worker running daily at 08:00 AM; scans `rent_payments` for upcoming due dates (3 days prior) and sends tenant alerts.
3. **`lease-expiry-queue`**: Cron worker evaluating expiring leases (30 days prior) to send renewal notices to landlords and tenants.
4. **`pdf-generator-queue`**: Asynchronously renders payment receipt PDFs and uploads them to S3.

---

## 5. Media & Document Delivery (CDN & Storage)

- Property images uploaded to S3 / Cloudinary are served over a Global CDN (Cloudflare / AWS CloudFront).
- Images formatted dynamically into WebP/AVIF with responsive width variants (`800w`, `1200w`).
- Static image asset requests bypass application pods completely, ensuring zero CPU overhead for image rendering.
