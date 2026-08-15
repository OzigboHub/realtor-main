# Production Deployment Guide — Realtor Platform

This document details the step-by-step instructions for deploying the **Realtor Platform** to production.

---

## 🏗️ Deployment Architecture

```
┌──────────────────────────────────────┐
│       Frontend: Next.js (Vercel)     │
│       https://realtor-app.vercel.app  │
└──────────────────┬───────────────────┘
                   │ HTTP / REST API (JWT)
                   ▼
┌──────────────────────────────────────┐
│     Backend: NestJS (Railway/Render) │
│     https://api.realtor-app.com       │
└──────────────────┬───────────────────┘
                   │ PostgreSQL Protocol
                   ▼
┌──────────────────────────────────────┐
│    Database: PostgreSQL (Neon DB)    │
│    ep-late-surf-...us-east-1.neon.tech│
└──────────────────┘
```

---

## 1. Database Deployment (Neon PostgreSQL)

1. Database is hosted on **Neon DB** (Cloud Native PostgreSQL).
2. Run database migration / schema push to sync production tables:
   ```bash
   npx prisma db push
   ```
3. Seed production initial roles / super admin user (optional):
   ```bash
   npx prisma db seed
   ```

---

## 2. Backend Deployment (NestJS on Railway / Render)

### Recommended Provider: Railway or Render

1. Create a new Web Service pointing to the `realtor-main` directory.
2. Build Command:
   ```bash
   npm run build
   ```
3. Start Command:
   ```bash
   npm run start:prod
   ```
4. Set Environment Variables in deployment settings:

```env
NODE_ENV="production"
PORT="1234"
DATABASE_URL="postgresql://username:password@your-host-pooler.aws.neon.tech/neondb?sslmode=require&pgbouncer=true"

JWT_SECRET="your_secure_jwt_secret_hex_string"

CORS_ORIGIN="https://realtor-app.vercel.app"
FRONTEND_URL="https://realtor-app.vercel.app"

# AI & Payments
GEMINI_API_KEY="your_gemini_api_key_here"
STRIPE_SECRET_KEY="sk_live_or_test_your_stripe_secret_key"
STRIPE_PUBLISHABLE_KEY="pk_live_or_test_your_stripe_publishable_key"

# Email & Media Storage
MAIL_PROVIDER="resend"
RESEND_API_KEY="your_resend_api_key_here"

# Media Storage (Cloudinary & S3)
CLOUDINARY_CLOUD_NAME="your_cloudinary_cloud_name"
CLOUDINARY_API_KEY="your_cloudinary_api_key"
CLOUDINARY_API_SECRET="your_cloudinary_api_secret"

# Optional AWS S3 Storage Config (Alternative to Cloudinary)
STORAGE_PROVIDER="CLOUDINARY" # Options: CLOUDINARY, S3, LOCAL
AWS_ACCESS_KEY_ID="your_aws_access_key"
AWS_SECRET_ACCESS_KEY="your_aws_secret_key"
AWS_S3_BUCKET="realtor-media-bucket"
AWS_REGION="us-east-1"
```

> **Note**: If `CLOUDINARY_*` or `AWS_*` variables are omitted, the application automatically defaults to **Local Disk Fallback**, storing files in `./uploads` and serving them at `http://localhost:1234/uploads/...`.


---

## 3. Frontend Deployment (Next.js on Vercel)

1. Connect your repository to **Vercel**.
2. Root Directory: Select `realtor-web`.
3. Framework Preset: Next.js.
4. Set Environment Variables:

```env
NEXT_PUBLIC_API_URL="https://api.realtor-app.com/api/v1"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_or_test_your_stripe_publishable_key"
```

5. Click **Deploy**. Vercel will build and assign an SSL production domain.

---

## 4. Post-Deployment Verification Check

- [x] Test registration & JWT login flow.
- [x] Test AI Property Search Assistant (`/properties` widget).
- [x] Test AI Subscription Upgrade flow (`/pricing` page) via Stripe & Paystack test checkout.
- [x] Test Landlord building registration & caretaker agreement assignment.
- [x] Test Tenant lease viewing & rent payment initiation.
- [x] Test Super Admin Audit Log inspector (`/dashboard/admin?tab=audit`).
