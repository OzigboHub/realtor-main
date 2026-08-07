# Implementation Plan: Tenancy & Building Management Module

This document outlines the technical implementation plan for the new "Tenancy & Building Management Module" (Section 5.9) specified in the Realtor PRD.

## Goal Description
The goal is to extend the Sherwin platform to handle post-lease operations. We will introduce new entities (`Building`, `Unit`, `Lease`, `RentPayment`, and `MaintenanceRequest`) and establish a three-tier chain of responsibility involving three new user roles: `LANDLORD`, `CARETAKER`, and `TENANT`.

## Resolved Questions & Decisions
- **Tenant Onboarding**: The Tenant will register themselves on the platform first. Once registered, the Caretaker will assign them to a Unit.
- **Caretaker Assignment**: The Landlord will invite Caretakers via Email and WhatsApp. The system will need an "invitation" flow where a link is generated and sent.
- **Building vs Property**: A `Property` will continue to serve as the marketing/listing entity for search, buying, selling, and renting. A `Building` will serve as the operational management entity for post-lease tenancy. They will be kept separate to decouple the listing lifecycle from the long-term management lifecycle, though we can add an optional relation if needed in the future.

## Proposed Changes

### 1. Prisma Schema Modifications

#### [MODIFY] `prisma/schema.prisma`
- **Enums**:
  - Add `LANDLORD`, `CARETAKER`, `TENANT` to `Role`.
  - Create `RentStatus` enum (`PENDING`, `PAID`, `OVERDUE`).
  - Create `MaintenanceStatus` enum (`OPEN`, `IN_PROGRESS`, `RESOLVED`, `ESCALATED`).
  - Create `LeaseStatus` enum (`ACTIVE`, `TERMINATED`, `EXPIRED`).

- **New Models**:
  - `Building`: `id`, `name`, `address`, `description`, `landlordId` (User relation), `caretakerId` (User relation, optional).
  - `BuildingInvitation`: `id`, `buildingId`, `role` (CARETAKER), `email`, `whatsappNumber`, `token`, `status` (PENDING, ACCEPTED).
  - `Unit`: `id`, `buildingId` (Building relation), `unitNumber`, `bedrooms`, `bathrooms`, `isOccupied` (Boolean).
  - `Lease`: `id`, `unitId` (Unit relation), `tenantId` (User relation), `startDate`, `endDate`, `rentAmount`, `status`.
  - `RentPayment`: `id`, `leaseId` (Lease relation), `amount`, `dueDate`, `paidDate`, `status` (RentStatus).
  - `MaintenanceRequest`: `id`, `unitId` (Unit relation), `tenantId` (User relation), `description`, `status` (MaintenanceStatus), `createdAt`, `updatedAt`.

- **User Model Updates**:
  - Add opposite relations for the new roles (e.g., `ownedBuildings`, `managedBuildings`, `leases`, `maintenanceRequests`).

### 2. NestJS Module Generation

#### [NEW] `src/buildings/`
- Handles `FR-9.1` (Register building), `FR-9.2` & `FR-9.3` (Assign/remove caretaker).
- Implements the Caretaker invitation logic (generate link, send email/WhatsApp).
- Restricted to `LANDLORD` role.

#### [NEW] `src/units/`
- Handles unit management within a building.

#### [NEW] `src/leases/`
- Handles `FR-9.4` (Assign registered tenant to unit) and `FR-9.11` (Offboard tenant).
- Restricted to `CARETAKER` role.

#### [NEW] `src/payments/`
- Handles `FR-9.5` (Log rent payments and update status) and `FR-9.6` (Tenant view payment history).
- Access shared between `CARETAKER` (write) and `TENANT` (read).

#### [NEW] `src/maintenance/`
- Handles `FR-9.7` (Tenant submit), `FR-9.8` (Caretaker update status), and `FR-9.9` (Escalate to Landlord).
- Access shared among `TENANT` (create/read), `CARETAKER` (update), and `LANDLORD` (read escalated).

### 3. Dashboard Consolidation

#### [MODIFY] `src/dashboard/` (or role-specific controllers)
- **Landlord Dashboard (FR-9.10)**: Provide metrics for occupancy rate (calculated from Units), rent collection status (from RentPayment), and open maintenance requests across all owned buildings.
- **Caretaker Dashboard**: Overview of managed buildings, upcoming rent, and maintenance requests.
- **Tenant Dashboard**: Overview of active lease, next rent payment, and open maintenance requests.

## Verification Plan

### Automated Tests
- Write end-to-end (e2e) tests for the new REST endpoints.
- Ensure role-based access control (RBAC) tests cover:
  - Landlord cannot modify buildings they don't own.
  - Caretaker cannot manage units/leases for buildings they aren't assigned to.
  - Tenant can only view their own lease and submit maintenance requests for their specific unit.

### Manual Verification
- Seed the database with a test Landlord, Caretaker, and Tenant.
- Step through the full workflow:
  1. Landlord creates Building and invites Caretaker via Email/WhatsApp.
  2. Caretaker accepts invitation.
  3. Tenant registers on the platform.
  4. Caretaker creates Units and assigns Tenant to a Unit.
  5. Tenant logs in, views Lease, and submits a Maintenance Request.
  6. Caretaker logs Rent Payment and resolves Maintenance Request.
  7. Landlord views the consolidated dashboard metrics.
