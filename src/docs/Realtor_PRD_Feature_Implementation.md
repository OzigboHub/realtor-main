**SHERWIN**

*Product Requirements Document — Feature Implementation*

## **Document Control**

| Field | Detail |
| :---- | :---- |
| **Product Name** | Sherwin — Real Estate Platform |
| **Document Type** | Product Requirements Document (PRD) — Feature Implementation |
| **Version** | v1.0 |
| **Prepared By** | ISCE Digital Concept Ltd |
| **Prepared For** | Internal Engineering / Product Team |
| **Status** | Draft — for review |

# **1\. Purpose**

This PRD defines the functional and non-functional requirements for Sherwin, a role-based real estate platform. It documents what is implemented in the current backend (v1.0) as the baseline specification for engineering, QA, and future feature planning, and separates that baseline clearly from planned Phase 2 work.

# **2\. Product Overview**

Sherwin connects property seekers with vetted agents through a single platform covering discovery, verification, communication, and scheduling. An Admin must approve agents before they can list, and every interaction — from a saved favorite to a booked viewing to an in-app message — is tied to an authenticated account, giving the platform an audit trail that open classifieds lack.

# **3\. User Roles & Personas**

| Role | Description | Primary Goals |
| :---- | :---- | :---- |
| User / Buyer | A property seeker browsing, saving, and inquiring about listings. | Find a trustworthy property quickly; book a viewing; message an agent directly. |
| Agent | A vetted individual or company listing and managing properties. | List properties; manage leads, appointments, and reviews; build a visible reputation. |
| Landlord | The owner of one or more buildings is hands-off on day-to-day tenant management. | Ensure rent is collected and buildings are maintained without managing tenants directly. |
| Caretaker | Assigned by a Landlord to manage a specific building on their behalf. | Onboard tenants, collect rent, resolve maintenance issues, keep the landlord informed. |
| Tenant | Resides in a unit within a building, under a lease set up by the caretaker. | Pay rent, report maintenance issues, and track lease and payment history. |
| Admin | Platform operator managing users and agent approvals. | Approve/block accounts; maintain listing quality; monitor platform health. |
| Super Admin | Highest-privilege operator with full system access. | Manage admins; oversee platform-wide configuration and data. |

# **4\. Scope**

## **4.1 In Scope (Current Implementation — v1.0)**

* Authentication & role-based access control (User, Agent, Admin, Super Admin)

* User profile management

* Property listing creation, search/filtering, and management

* Favorites (save/unsave properties)

* Reviews and ratings on properties

* Appointment scheduling and status management

* Direct messaging between users and agents

* Role-specific dashboards (User, Agent, Admin)

* Tenancy & building management: Landlord, Caretaker, and Tenant roles; buildings, units, and leases (newly specified — see Section 5.9)

## **4.2 Out of Scope (This Version)**

* Payment processing and escrow (tracked as a Phase 2 roadmap item, not part of current implementation).

* Real-time/WebSocket messaging (current messaging is request-based, not live).

* Push notification delivery (mobile or web).

* Property valuation or mortgage calculation tools.

* Multi-language/localization support.

# **5\. Functional Requirements**

## **5.1 Auth Module**

| ID | Requirement | Access |
| :---- | :---- | :---- |
| FR-1.1 | Users can register with name, email, phone, and password, selecting a role of User or Agent. | Public |
| FR-1.2 | Agent registrations enter a pending state and require Admin/Super Admin approval before the agent can list properties. | Admin |
| FR-1.3 | Users can log in with email and password to receive a JWT access token. | Public |
| FR-1.4 | Admins/Super Admins can block or unblock any account, immediately revoking or restoring access. | Admin |

## **5.2 Users Module**

| ID | Requirement | Access |
| :---- | :---- | :---- |
| FR-2.1 | Authenticated users can view and update their own profile. | Authenticated |
| FR-2.2 | Admins can view any user's profile and the full user list. | Admin |
| FR-2.3 | Admins/Super Admins can permanently delete a user account. | Admin |

## **5.3 Properties Module**

| ID | Requirement | Access |
| :---- | :---- | :---- |
| FR-3.1 | Agents can create a new property listing. | Agent |
| FR-3.2 | Any visitor can browse and search all listings, filterable by type, price range, and location. | Public |
| FR-3.3 | Any visitor can view a single property's full detail page. | Public |
| FR-3.4 | Agents (own listings) and Admins can edit or delete a property listing. | Agent / Admin |

Supported filters: type, priceRange, location — e.g. /properties?type=apartment\&priceRange=100000-300000\&location=Lagos.

## **5.4 Favorites Module**

| ID | Requirement | Access |
| :---- | :---- | :---- |
| FR-4.1 | Users can add a property to a personal favorites list. | User |
| FR-4.2 | Users can remove a property from favorites. | User |
| FR-4.3 | Users can view their full list of favorited properties. | User |

## **5.5 Reviews Module**

| ID | Requirement | Access |
| :---- | :---- | :---- |
| FR-5.1 | Users can submit a 1–5 star rating with a comment on a property. | User |
| FR-5.2 | Any visitor can view all reviews on a property. | Public |
| FR-5.3 | A user can edit or delete their own review; Admins can delete any review. | User (owner) / Admin |

## **5.6 Appointments Module**

| ID | Requirement | Access |
| :---- | :---- | :---- |
| FR-6.1 | Users can schedule a property viewing with a date and an optional message. | User |
| FR-6.2 | Users and Agents can view their own appointments. | Authenticated |
| FR-6.3 | Agents/Admins can update an appointment's status: pending, confirmed, canceled, or completed. | Agent / Admin |
| FR-6.4 | Users/Admins can cancel an appointment. | User / Admin |

## **5.7 Messages Module**

| ID | Requirement | Access |
| :---- | :---- | :---- |
| FR-7.1 | Authenticated users can send a message to another user or agent, optionally tied to a property. | Authenticated |
| FR-7.2 | Users can view all messages within a specific conversation. | Authenticated |
| FR-7.3 | Users can view a list of all their conversations. | Authenticated |
| FR-7.4 | A message owner can delete their own message. | Owner |

## **5.8 Dashboard Module**

| ID | Requirement | Access |
| :---- | :---- | :---- |
| FR-8.1 | The User dashboard surfaces favorites, appointments, and recent messages. | User |
| FR-8.2 | The Agent dashboard surfaces listed properties, appointments, messages, and reviews. | Agent |
| FR-8.3 | The Admin dashboard surfaces all users, pending agent approvals, and platform-wide analytics (total properties, appointments, messages). | Admin |

## **5.9 Tenancy & Building Management Module (New)**

This module extends Sherwin beyond search-and-rent into post-lease operations. It introduces three new entities — Building, Unit, and Lease — and a three-tier chain of responsibility: a Landlord owns buildings and appoints a Caretaker per building; the Caretaker onboards Tenants, collects rent, and handles maintenance day-to-day; the Landlord sees roll-up reporting without managing tenants directly.

| ID | Requirement | Access |
| :---- | :---- | :---- |
| FR-9.1 | Landlords can register a Building with an address, unit count, and per-unit details. | Landlord |
| FR-9.2 | Landlords can assign a Caretaker to manage a specific Building. | Landlord |
| FR-9.3 | Landlords can reassign or remove a Caretaker from a Building at any time. | Landlord |
| FR-9.4 | Caretakers can onboard a Tenant and assign them to a Unit within a Building they manage. | Caretaker |
| FR-9.5 | Caretakers can log rent payments and update status (paid, pending, overdue) per Tenant. | Caretaker |
| FR-9.6 | Tenants can view their lease details, rent due date, and full payment history. | Tenant |
| FR-9.7 | Tenants can submit maintenance requests tied to their Unit. | Tenant |
| FR-9.8 | Caretakers can view, update the status of, and resolve maintenance requests for their Building(s). | Caretaker |
| FR-9.9 | Caretakers can escalate unresolved or major maintenance issues to the Landlord. | Caretaker |
| FR-9.10 | Landlords can view a consolidated dashboard across all owned Buildings: occupancy rate, rent collection status, and open maintenance requests. | Landlord |
| FR-9.11 | Caretakers can offboard a Tenant (lease end or eviction), freeing the Unit for reassignment. | Caretaker |

Note: a Caretaker may be assigned to more than one Building, but each Building has exactly one active Caretaker at a time. A Tenant belongs to exactly one Unit under an active Lease.

# **6\. Non-Functional Requirements**

| Category | Requirement |
| :---- | :---- |
| **Security** | JWT-based authentication on every protected route; role checks enforced at the API layer, not just the UI. |
| **Data Integrity** | Relational schema in PostgreSQL via Prisma, enforcing foreign-key integrity between users, properties, appointments, reviews, and messages. |
| **Access Control** | Four-tier role model (User, Agent, Admin, Super Admin) with least-privilege access on every endpoint. |
| **Scalability** | Modular NestJS service structure so new modules (payments, notifications, analytics) can be added without touching existing modules. |
| **Auditability** | Agent approval, blocking, and moderation actions are performed by identifiable Admin/Super Admin accounts. |
| **Availability** | Public-facing endpoints (search, property detail, reviews) require no authentication, minimizing friction for property seekers. |

# **7\. Technical Architecture**

Sherwin's backend is built as a modular NestJS application, using Prisma as the ORM against a PostgreSQL database, with JWT bearer-token authentication on every protected route.

| Layer | Technology |
| :---- | :---- |
| **Backend Framework** | NestJS |
| **ORM** | Prisma |
| **Database** | PostgreSQL |
| **Authentication** | JWT (JSON Web Tokens) |
| **API Style** | RESTful, versioned at /api/v1 |
| **API Contract** | OpenAPI 3.0.1 specification |

# **8\. Roles & Access Matrix**

Access control is enforced at the API layer via four roles, in ascending order of privilege:

* User — view, favorite, review, schedule visit, send message

* Agent — manage own properties, view appointments, reply to messages

* Landlord — register buildings, assign/reassign caretakers, view consolidated reports

* Caretaker — onboard/offboard tenants, collect rent, manage maintenance for assigned building(s)

* Tenant — view lease and payment history, submit maintenance requests

* Admin — approve/block users, manage all data

* Super Admin — full system access, including admin management

# **9\. Future Features (Phase 2 Roadmap)**

The following are planned but not yet implemented. They are listed here to inform architecture decisions in v1.0 so that Phase 2 can be added without rework.

| Planned Feature | Description | Phase |
| :---- | :---- | :---- |
| AI Property Recommendation Engine | Suggest similar or personalized properties using user behavior and property metadata. | Phase 2 |
| Wallet & Payment Integration | Deposit/hold payments for bookings; Stripe/Paystack/PayPal integration with webhook handling. | Phase 2 |
| Push Notifications | Notify users of appointment updates and new messages in real time. | Phase 2 |
| Real-Time Chat | WebSocket-based live messaging between users and agents, replacing poll-based updates. | Phase 2 |
| Agent Analytics | Property views, inquiries, conversion rates, and ratings, with CSV/visual exports. | Phase 2 |

# **10\. Success Metrics**

* Agent approval turnaround time (time from registration to Admin decision)

* Ratio of scheduled appointments that reach "completed" status

* Average response time on in-app messages

* Listings per active agent, and reviews per listing

* Growth in verified agents vs. total registered agents

* Rent collection rate per building, and average time from due date to payment

* Average maintenance request resolution time per caretaker

* Escalation rate — share of maintenance requests that reach the landlord vs. those resolved by the caretaker