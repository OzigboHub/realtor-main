# 04 — Target Data Model & Database Specification

This document details the relational database schema, Prisma 7 models, entity relationships, database indexes, and database mapping for the Realtor platform.

Database Provider: **PostgreSQL 16**  
Mapped Table Conventions: Lowercase plural snake_case via `@map("...")`

---

## 1. Entity Relationship Diagram (ERD Overview)

```
                       ┌──────────────┐
                       │     User     │
                       └──────┬───────┘
                              │
      ┌───────────────────────┼───────────────────────┐
      │                       │                       │
┌─────▼──────┐         ┌──────▼───────┐        ┌──────▼───────┐
│  Property  │         │   Building   │        │ Appointment  │
└─────┬──────┘         └──────┬───────┘        └──────────────┘
      │                       │
┌─────▼──────┐         ┌──────▼───────┐
│  Favorite  │         │     Unit     │
└────────────┘         └──────┬───────┘
                              │
                       ┌──────▼───────┐
                       │    Lease     │
                       └──────┬───────┘
                              │
                       ┌──────▼───────┐
                       │ RentPayment  │
                       └──────────────┘
```

---

## 2. Models & Fields Specification

### 2.1 Identity & User Management (`users`)

#### Model: `User`
| Field | Type | Attributes | Description |
|---|---|---|---|
| `id` | String | `@id @default(uuid())` | Primary key UUID |
| `name` | String | - | Full display name |
| `email` | String | `@unique` | Unique email address |
| `password` | String | - | Bcrypt hashed password |
| `role` | Role | `@default(USER)` | System role enum |
| `isBlocked` | Boolean | `@default(false)` | Account suspension flag |
| `status` | Status | `@default(APPROVED)` | Agent approval status (`PENDING`, `APPROVED`, `REJECTED`) |
| `profileImage` | String? | - | Profile avatar URL |
| `phone` | String? | - | Contact telephone number |
| `bio` | String? | - | Biography or agency summary |
| `googleId` | String? | `@unique` | Google OAuth account ID |
| `createdAt` | DateTime | `@default(now())` | Creation timestamp |
| `updatedAt` | DateTime | `@updatedAt` | Modification timestamp |

---

### 2.2 Property Catalog (`properties`, `favorites`, `reviews`)

#### Model: `Property`
| Field | Type | Attributes | Description |
|---|---|---|---|
| `id` | String | `@id @default(uuid())` | Primary key UUID |
| `title` | String | - | Listing title |
| `description` | String | - | Detailed description |
| `price` | Float | - | Listing price / rent fee |
| `type` | String | - | Property type string |
| `location` | String | - | Location address/city |
| `category` | PropertyCategory | `@default(APARTMENT)` | Enum (`HOUSE`, `APARTMENT`, `LAND`, `COMMERCIAL`) |
| `purpose` | ListingPurpose | `@default(RENT)` | Enum (`SALE`, `RENT`) |
| `status` | String | `@default("PUBLISHED")` | Listing lifecycle status |
| `imageUrls` | String[] | - | Array of gallery image URLs |
| `documents` | String[] | - | Document attachment links |
| `bedrooms` | Int? | - | Bedroom count |
| `bathrooms` | Int? | - | Bathroom count |
| `toilets` | Int? | - | Toilet count |
| `amenities` | String[] | `@default([])` | Array of amenity tags |
| `available` | Boolean | `@default(true)` | Listing availability status |
| `agentId` | String | - | Foreign key to `User.id` |
| `country` | String? | - | Country location |
| `latitude` | Float? | - | Geolocation latitude |
| `longitude` | Float? | - | Geolocation longitude |

#### Model: `Favorite`
| Field | Type | Attributes | Description |
|---|---|---|---|
| `id` | String | `@id @default(uuid())` | Primary key UUID |
| `userId` | String | - | Foreign key to `User.id` |
| `propertyId` | String | - | Foreign key to `Property.id` |
| `createdAt` | DateTime | `@default(now())` | Bookmark timestamp |
| **Indexes** | - | `@@unique([userId, propertyId])` | Prevents duplicate user bookmarks |

#### Model: `Review`
| Field | Type | Attributes | Description |
|---|---|---|---|
| `id` | String | `@id @default(uuid())` | Primary key UUID |
| `rating` | Int | - | Star rating (1 to 5) |
| `comment` | String? | - | Review comment text |
| `userId` | String | - | Foreign key to `User.id` |
| `propertyId` | String | - | Foreign key to `Property.id` |

---

### 2.3 Facilities & Tenancy Management (`buildings`, `units`, `leases`, `rent_payments`, `maintenance_requests`)

#### Model: `Building`
- Fields: `id`, `name`, `address`, `description`, `landlordId` (FK to User), `caretakerId` (FK to User), `createdAt`, `updatedAt`.

#### Model: `BuildingInvitation`
- Fields: `id`, `buildingId` (FK to Building), `email`, `whatsappNumber`, `token` (`@unique`), `status` (`PENDING`, `ACCEPTED`).

#### Model: `ManagementAgreement`
- Fields: `id`, `buildingId` (FK to Building), `scope` (`RENT_COLLECTION`, `RENT_AND_MAINTENANCE`, `FULL_MANAGEMENT`), `startDate`, `endDate`, `managementFee`, `feeType`, `status` (`ACTIVE`, `EXPIRED`, `TERMINATED`).

#### Model: `Unit`
- Fields: `id`, `buildingId` (FK to Building), `unitNumber`, `bedrooms`, `bathrooms`, `isOccupied` (`Boolean @default(false)`).

#### Model: `Lease`
- Fields: `id`, `unitId` (FK to Unit), `tenantId` (FK to User), `startDate`, `endDate`, `rentAmount`, `status` (`ACTIVE`, `TERMINATED`, `EXPIRED`).

#### Model: `RentPayment`
- Fields: `id`, `leaseId` (FK to Lease), `amount`, `dueDate`, `paidDate`, `status` (`PENDING`, `PAID`, `OVERDUE`).

#### Model: `MaintenanceRequest`
- Fields: `id`, `unitId` (FK to Unit), `tenantId` (FK to User), `description`, `status` (`OPEN`, `IN_PROGRESS`, `RESOLVED`, `ESCALATED`).

---

### 2.4 Platform Services (`appointments`, `messages`, `notifications`, `audit_logs`)

#### Model: `Appointment`
- Fields: `id`, `propertyId`, `userId`, `date`, `message`, `status` (`PENDING`, `CONFIRMED`, `CANCELED`, `COMPLETED`).

#### Model: `Message`
- Fields: `id`, `senderId`, `receiverId`, `content`, `createdAt`.

#### Model: `Notification`
- Fields: `id`, `userId`, `event`, `message`, `isRead`, `metadata`.

#### Model: `AuditLog`
- Fields: `id`, `action`, `module`, `entityType`, `entityId`, `performedBy`, `userRole`, `ipAddress`, `userAgent`, `method`, `url`, `prevValue`, `newValue`, `status`, `failReason`, `createdAt`.

---

## 3. Database Indexes & Query Optimizations

```sql
-- Composite index for property search performance
CREATE INDEX idx_properties_search ON properties (location, category, purpose, available, price);

-- Index for agent listing queries
CREATE INDEX idx_properties_agent ON properties (agentId);

-- Composite index for tenant lease queries
CREATE INDEX idx_leases_tenant_status ON leases (tenantId, status);

-- Composite index for unit occupancy tracking
CREATE INDEX idx_units_building_occupied ON units (buildingId, isOccupied);

-- Index for payment verification
CREATE INDEX idx_rent_payments_lease_status ON rent_payments (leaseId, status);
```
