# 💳 In-App Payment Architecture & Financial Monetization Strategy — Realtor Platform

This document details the **7 Financial Payment Streams** built into the **Realtor Platform** via Stripe and Paystack integration. It outlines how payments flow across all 5 user roles (Buyers, Tenants, Agents, Landlords, Caretakers), how funds are split or held in escrow, and how the platform owner collects recurring revenue and commission fees.

---

## 🏗️ 1. Platform Payment Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      1. AI SUBSCRIPTIONS & CREDITS                      │
│   Payer: All Users (Tenant, Buyer, Agent, Landlord, Caretaker)          │
│   Flow: Direct Payment ➔ Platform Account                              │
│   Platform Cut: 100% Direct Revenue ($2.99 – $14.99/mo)                │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   2. ONLINE RENT PAYMENTS & AUTO-PAY                    │
│   Payer: Tenants ➔ Recipient: Landlords / Caretakers                     │
│   Flow: Tenant Payment ➔ Platform Split ➔ Landlord Bank Account         │
│   Platform Cut: 1.5% Convenience Fee or Flat $3.00 (₦500) per rent      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                3. RENTAL APPLICATION & BACKGROUND FEES                  │
│   Payer: Prospective Renters                                            │
│   Flow: Applicant Payment ➔ Screening Verification Engine               │
│   Platform Cut: 30% – 50% Profit Margin per application ($30 – $50)    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              4. PROPERTY HOLD DEPOSITS & ESCROW PAYMENTS                │
│   Payer: Renters / Home Buyers                                          │
│   Flow: Tenant Deposit ➔ Platform Escrow ➔ Released to Landlord/Agent   │
│   Platform Cut: 1% – 2% Escrow Facilitation Fee                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                 5. MAINTENANCE DISPATCH & VENDOR PAYOUTS                │
│   Payer: Landlords / Caretakers ➔ Recipient: Repair Contractors         │
│   Flow: Work Order Payment ➔ Contractor Payout                          │
│   Platform Cut: 5% – 10% Marketplace Commission                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│               6. FEATURED LISTINGS & AGENT PROMOTION BOOSTS             │
│   Payer: Real Estate Agents & Landlords                                 │
│   Flow: Agent Payment ➔ Top Search Spot / Featured Badge                │
│   Platform Cut: 100% Direct Revenue ($15 – $100 / listing)             │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                 7. CARETAKER SLA MANAGEMENT COMMISSIONS                 │
│   Payer: Landlords ➔ Recipient: Caretakers                              │
│   Flow: Automated percentage deduction from collected monthly rent      │
│   Platform Cut: Automated Split Fee via Stripe Connect / Paystack       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 💵 2. Detailed Breakdown of The 7 Payment Streams

### Payment Stream 1: AI Subscription & Credit Packages (Prepaid SaaS)
* **Payer**: All user roles (Buyers, Tenants, Agents, Landlords, Caretakers).
* **What is paid**: Monthly AI credit subscriptions (`STARTER` $2.99 / ₦4,500, `PRO` $7.99 / ₦12,000, `UNLIMITED` $14.99 / ₦22,500).
* **Payment Flow**: Stripe Checkout Session or Paystack Standard Popup.
* **Platform Profit**: **100% Direct Platform Revenue** (minus ~1.5%–2.9% payment gateway processing fee).

---

### Payment Stream 2: Online Rent Payments & Recurring Auto-Pay
* **Payer**: Tenants paying monthly or annual property rent.
* **Recipient**: Landlords / Caretakers.
* **Payment Flow**: Tenant pays via Tenant Dashboard (`/dashboard/tenant`). Funds are processed via Stripe or Paystack Dedicated NUBAN Virtual Accounts and deposited into the Landlord's bank account.
* **Platform Profit**: The platform collects a **Convenience / Processing Fee** (e.g., 1.5% of rent volume or flat ₦500 / $3.00 per transaction).

---

### Payment Stream 3: Rental Application & Tenant Screening Fees
* **Payer**: Prospective tenants applying for high-demand rental listings.
* **Payment Amount**: $30 – $50 / ₦10,000 – ₦25,000 per application.
* **Payment Flow**: Prior to submitting an application modal, the tenant completes online checkout. The system automatically triggers credit, income, and background verification.
* **Platform Profit**: **30% – 50% Net Margin** per rental application.

---

### Payment Stream 4: Property Hold Deposits & Escrow Payments
* **Payer**: Home buyers or renters securing a property.
* **Payment Amount**: 5% – 10% holding deposit or 1-month caution deposit.
* **Payment Flow**: Payment is processed and locked in **Platform Escrow**. Upon digital lease/contract execution, funds are automatically released to the Landlord/Agent.
* **Platform Profit**: The platform collects a **1% – 2% Escrow Facilitation Fee**.

---

### Payment Stream 5: Maintenance Dispatch & Repair Vendor Payouts
* **Payer**: Caretakers or Landlords dispatching maintenance work orders.
* **Recipient**: Verified local repair contractors (plumbers, electricians, painters).
* **Payment Flow**: Caretaker approves the AI-estimated work order and pays via the Caretaker Dashboard (`/dashboard/caretaker`).
* **Platform Profit**: The platform retains a **5% – 10% Marketplace Commission** on contractor payouts.

---

### Payment Stream 6: Featured Property Listings & Agent Profile Boosts
* **Payer**: Real Estate Agents, Brokers, and Landlords.
* **Payment Amount**: $15 – $100 / ₦20,000 – ₦100,000 per boosted listing.
* **Payment Flow**: Agent selects a 7-day, 14-day, or 30-day boost package to pin their property listing to the top of city search results with a gold `FEATURED` badge.
* **Platform Profit**: **100% Direct Platform Revenue**.

---

### Payment Stream 7: Caretaker Management SLA Commissions
* **Payer**: Landlords employing professional Caretakers.
* **Recipient**: Caretakers / Property Managers.
* **Payment Flow**: When a tenant pays monthly rent, the backend automatically splits payouts using **Stripe Connect** or **Paystack Transfer API** (sending e.g., 90% to Landlord, 10% to Caretaker).
* **Platform Profit**: Automated platform transfer commission fee.

---

## 🛠️ 3. Current Codebase Implementation Status

| Payment Module | Backend Implementation Status | Database Schema |
| :--- | :--- | :--- |
| **AI Subscriptions** | `src/ai/ai-subscription.service.ts` (Stripe & Paystack) | `UserAiSubscription` table |
| **Rent Payments** | `src/payments/payments.service.ts` | `RentPayment` & `Lease` tables |
| **User Roles & Auth** | `src/auth/auth.service.ts` (Super Admin, Admin, Agent, Landlord, Caretaker, Tenant, User) | `User` table (`Role` enum) |
| **Notifications** | `src/notifications/notifications.service.ts` | `Notification` table |
