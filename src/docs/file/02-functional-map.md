# 02 — Comprehensive Functional Map & API Contract

This document specifies the complete REST API contract for the Realtor platform NestJS backend API (`realtor-main`).

Base URL: `/api/v1`

---

## Module Index

1. [Auth Module](#1-auth-module)
2. [Users Module](#2-users-module)
3. [Properties Module](#3-properties-module)
4. [Favorites Module](#4-favorites-module)
5. [Reviews Module](#5-reviews-module)
6. [Appointments Module](#6-appointments-module)
7. [Messages Module](#7-messages-module)
8. [Buildings Module](#8-buildings-module)
9. [Units Module](#9-units-module)
10. [Leases Module](#10-leases-module)
11. [Management Agreements Module](#11-management-agreements-module)
12. [Payments Module](#12-payments-module)
13. [Maintenance Module](#13-maintenance-module)
14. [Dashboard & Analytics Module](#14-dashboard--analytics-module)
15. [Platform Services (Audit, Upload, Health, Notifications)](#15-platform-services)

---

## 1. Auth Module

Manages registration, credential-based login, agent approvals, user blocking/unblocking, password reset, and OAuth logins.

| Method | Route Path | Access / Role | Description |
|---|---|---|---|
| `POST` | `/auth/register` | Public | Register new user account (`USER`, `AGENT`, `LANDLORD`, `TENANT`). Agents set to `PENDING`. |
| `POST` | `/auth/login` | Public | Authenticate email/password credentials, return JWT access token & profile. |
| `GET` | `/auth/google` | Public | Initiates Google OAuth 2.0 authentication flow. |
| `GET` | `/auth/google/callback` | Public | Google OAuth callback handler; returns JWT token on success. |
| `PATCH` | `/auth/approve/:id` | `ADMIN`, `SUPER_ADMIN` | Approve a pending `AGENT` registration. Updates status to `APPROVED`. |
| `PATCH` | `/auth/block/:id` | `ADMIN`, `SUPER_ADMIN` | Block a user account (`isBlocked: true`), revoking active tokens. |
| `PATCH` | `/auth/unblock/:id` | `ADMIN`, `SUPER_ADMIN` | Restore access to a blocked user account (`isBlocked: false`). |
| `POST` | `/auth/forgot-password` | Public | Generates password reset token and dispatches reset link via email. |
| `POST` | `/auth/reset-password` | Public | Validates reset token and updates user password. |

---

## 2. Users Module

Manages user profiles, role assignments, and directory queries.

| Method | Route Path | Access / Role | Description |
|---|---|---|---|
| `GET` | `/users/me` | Authenticated | Retrieve current user profile details from JWT context. |
| `PATCH` | `/users/update` | Authenticated | Update current user profile info (name, phone, bio, profileImage). |
| `GET` | `/users` | `ADMIN`, `SUPER_ADMIN` | List all registered users with optional role & status filtering. |
| `GET` | `/users/:id` | `ADMIN`, `SUPER_ADMIN` | Retrieve single user record by unique ID. |
| `PATCH` | `/users/:id/role` | `SUPER_ADMIN` | Change a user's system role (`Role` enum). |
| `DELETE` | `/users/:id` | `SUPER_ADMIN` | Delete user record. |

---

## 3. Properties Module

Handles property listings catalog, multi-criteria search, image management, and listing status updates.

| Method | Route Path | Access / Role | Description |
|---|---|---|---|
| `POST` | `/properties` | `AGENT`, `LANDLORD`, `ADMIN` | Create a new property listing. |
| `GET` | `/properties` | Public | Search & list properties with filter parameters. |
| `GET` | `/properties/featured` | Public | Retrieve featured or highlighted property listings. |
| `GET` | `/properties/:id` | Public | Fetch full property listing details by ID. |
| `PATCH` | `/properties/:id` | `AGENT` (owner), `ADMIN` | Update property details, images, or pricing. |
| `DELETE` | `/properties/:id` | `AGENT` (owner), `ADMIN` | Delete property listing. |
| `PATCH` | `/properties/:id/status` | `AGENT` (owner), `ADMIN` | Update property listing status (`PUBLISHED`, `UNLISTED`, `ARCHIVED`). |

### Property Search Filter Parameters
`GET /properties?category=APARTMENT&listingType=RENT&priceMin=500000&priceMax=2000000&location=Lagos&bedrooms=3&page=1&limit=20`

---

## 4. Favorites Module

Enables users to bookmark and manage their personal property wishlists.

| Method | Route Path | Access / Role | Description |
|---|---|---|---|
| `POST` | `/favorites/:propertyId` | Authenticated | Add property to user's favorites list. |
| `DELETE` | `/favorites/:propertyId` | Authenticated | Remove property from user's favorites list. |
| `GET` | `/favorites` | Authenticated | Retrieve all bookmarked properties for the logged-in user. |

---

## 5. Reviews Module

Enables rating and feedback comments on properties.

| Method | Route Path | Access / Role | Description |
|---|---|---|---|
| `POST` | `/reviews` | Authenticated | Submit property review (rating 1–5 stars and comment). |
| `GET` | `/reviews/property/:propertyId` | Public | List all reviews submitted for a given property. |
| `DELETE` | `/reviews/:id` | Author, `ADMIN` | Remove review entry. |

---

## 6. Appointments Module

Inspection scheduling between property seekers and listing agents/landlords.

| Method | Route Path | Access / Role | Description |
|---|---|---|---|
| `POST` | `/appointments` | Authenticated | Book property inspection appointment. |
| `GET` | `/appointments/my-appointments` | Authenticated | Fetch appointments for the logged-in user. |
| `GET` | `/appointments/agent` | `AGENT`, `LANDLORD` | Fetch incoming inspection requests for agent's properties. |
| `PATCH` | `/appointments/:id/status` | `AGENT`, `LANDLORD`, Admin | Transition appointment status (`PENDING` → `CONFIRMED` / `CANCELED` / `COMPLETED`). |

---

## 7. Messages Module

Provides asynchronous messaging between buyers/renters and agents/landlords.

| Method | Route Path | Access / Role | Description |
|---|---|---|---|
| `POST` | `/messages/send` | Authenticated | Send message to target user or agent. |
| `GET` | `/messages/conversation/:userId` | Authenticated | Retrieve message thread with a specific user. |
| `GET` | `/messages/conversations` | Authenticated | List all active conversation threads for logged-in user. |
| `PATCH` | `/messages/read/:conversationId` | Authenticated | Mark conversation messages as read. |

---

## 8. Buildings Module

Facility management portfolio for landlords and caretakers.

| Method | Route Path | Access / Role | Description |
|---|---|---|---|
| `POST` | `/buildings` | `LANDLORD`, `ADMIN` | Register building facility record. |
| `GET` | `/buildings` | `LANDLORD`, `CARETAKER`, `ADMIN` | List buildings managed by user. |
| `GET` | `/buildings/:id` | `LANDLORD`, `CARETAKER`, `ADMIN` | Get building details, units, and management status. |
| `POST` | `/buildings/:id/invite` | `LANDLORD`, `ADMIN` | Issue caretaker invitation link/token. |
| `POST` | `/buildings/invitations/accept` | Authenticated | Accept building caretaker invitation via token. |

---

## 9. Units Module

Sub-unit management within building facilities.

| Method | Route Path | Access / Role | Description |
|---|---|---|---|
| `POST` | `/units` | `LANDLORD`, `CARETAKER`, `ADMIN` | Add unit to building facility. |
| `GET` | `/units/building/:buildingId` | `LANDLORD`, `CARETAKER`, `ADMIN` | List all units in a specific building. |
| `GET` | `/units/:id` | `LANDLORD`, `CARETAKER`, `ADMIN` | Fetch unit details and occupancy status. |
| `PATCH` | `/units/:id` | `LANDLORD`, `CARETAKER`, `ADMIN` | Update unit specs (bedrooms, unitNumber, occupancy). |

---

## 10. Leases Module

Tenancy contracts, active leases, and renewal/termination workflows.

| Method | Route Path | Access / Role | Description |
|---|---|---|---|
| `POST` | `/leases` | `LANDLORD`, `CARETAKER`, `ADMIN` | Create lease agreement for tenant and unit. |
| `GET` | `/leases` | `LANDLORD`, `CARETAKER`, `ADMIN` | List lease agreements across portfolio. |
| `GET` | `/leases/my-lease` | `TENANT` | Fetch current active lease details for logged-in tenant. |
| `PATCH` | `/leases/:id/terminate` | `LANDLORD`, `ADMIN` | Terminate lease agreement (`status: TERMINATED`). |

---

## 11. Management Agreements Module

Legal/operational management agreements between landlords and building caretakers.

| Method | Route Path | Access / Role | Description |
|---|---|---|---|
| `POST` | `/agreements` | `LANDLORD`, `ADMIN` | Create caretaker management agreement. |
| `GET` | `/agreements/building/:buildingId` | `LANDLORD`, `CARETAKER`, `ADMIN` | List agreements for building. |
| `PATCH` | `/agreements/:id/status` | `LANDLORD`, `ADMIN` | Update agreement status (`ACTIVE`, `EXPIRED`, `TERMINATED`). |

---

## 12. Payments Module

Rent collection, Paystack gateway integration, receipts, and revenue reporting.

| Method | Route Path | Access / Role | Description |
|---|---|---|---|
| `POST` | `/payments/initiate` | `TENANT` | Initialize Paystack rent payment transaction. |
| `GET` | `/payments/verify/:reference` | Authenticated | Verify transaction status with Paystack API. |
| `POST` | `/payments/webhook` | Public (Signature Verified) | Paystack webhook handler for automated payment confirmation. |
| `GET` | `/payments/lease/:leaseId` | `TENANT`, `LANDLORD`, `ADMIN` | List rent payment history for a specific lease. |

---

## 13. Maintenance Module

Tenant service ticket submission and resolution tracking.

| Method | Route Path | Access / Role | Description |
|---|---|---|---|
| `POST` | `/maintenance` | `TENANT` | Submit maintenance request ticket for leased unit. |
| `GET` | `/maintenance` | `TENANT`, `CARETAKER`, `LANDLORD` | Fetch maintenance tickets. |
| `PATCH` | `/maintenance/:id/status` | `CARETAKER`, `LANDLORD`, `ADMIN` | Transition ticket status (`OPEN` → `IN_PROGRESS` → `RESOLVED` / `ESCALATED`). |

---

## 14. Dashboard & Analytics Module

Role-based metric aggregation.

| Method | Route Path | Access / Role | Description |
|---|---|---|---|
| `GET` | `/dashboard/agent` | `AGENT` | Agent metrics (active listings, inquiries, appointments). |
| `GET` | `/dashboard/landlord` | `LANDLORD` | Landlord portfolio metrics (buildings, occupancy rate, rent collected). |
| `GET` | `/dashboard/tenant` | `TENANT` | Tenant dashboard (rent due date, lease status, maintenance tickets). |
| `GET` | `/dashboard/admin` | `ADMIN`, `SUPER_ADMIN` | System overview metrics (total users, pending agents, revenue logs). |

---

## 15. Platform Services

| Module | Method | Route Path | Access | Description |
|---|---|---|---|---|
| **Audit** | `GET` | `/audit` | `SUPER_ADMIN` | Query security audit log entries. |
| **Upload** | `POST` | `/upload/image` | Authenticated | Upload property or avatar image file. |
| **Upload** | `POST` | `/upload/document` | Authenticated | Upload PDF/Doc attachment file for leases/properties. |
| **Health** | `GET` | `/health` | Public | Liveness and readiness probe for load balancers. |
