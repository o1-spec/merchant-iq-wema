# MerchantIQ - Application Walkthrough & Overview

**MerchantIQ is an AI Financial Operating System built on ALATPay that transforms everyday payment activity into actionable financial intelligence and measurable credit readiness for African SMEs.**

---

## 💡 Why This Matters
Many SMEs already receive digital payments but lack tools that transform transaction data into actionable financial intelligence. Cashflow surprises, unrecorded sales, and manual collection follow-ups make it difficult to prove creditworthiness. MerchantIQ closes this gap by turning payment activity into real-time insights, collection automation, and alternative credit signals, enabling merchants to grow with confidence.

---

## 🏗️ Technical Stack & Architecture
* **Frontend Framework**: Next.js 16 (App Router) built with React 19.
* **Database & ORM**: PostgreSQL (Supabase) connected via Prisma ORM.
* **Styling**: Tailwind CSS (version 4) for premium dark/light interfaces.
* **AI Engine**: Google Gemini API for explaining risks, cost-savings advice, collection reminders, and answering grounded store questions.
* **Authentication**: Session-based JSON Web Token (JWT) cookies (`merchantiq_auth`).

### Event-Driven Architecture Flow
MerchantIQ operates as an event-driven system reacting instantly to incoming payment notifications:

```text
ALATPay Payment Event
          │
          ▼
Webhook Receiver
          │
          ▼
Transaction Ledger Update
          │
 ┌────────┴────────┐
 ▼                 ▼
Analytics Engine   AI Cache Refresh
 │                 │
 ▼                 ▼
Business Trust     Gemini CFO
 Score Calculation  (Brief Invalidation)
 │                 │
 └────────┬────────┘
          ▼
Merchant Dashboard
```

---

## 🤖 AI & Analytics Layer Separation of Concerns

To ensure maximum accuracy and technical credibility, calculations are handled deterministically, while the AI model is reserved for translation and natural language generation.

```text
Analytics Engine (Deterministic)
           ↓
       Calculates
• Cash runway forecasts
• 30-day cash projections
• Business Trust Score (300-850)
• Payment Inflow Coverage ratio
• Top revenue & expense categories

       Gemini CFO (Generative)
           ↓
        Explains
• Inflow & outflow risks
• Actionable cost recommendations
• Personalized collections reminders
• Daily morning business briefs
• Natural language Q&A about the store
```

---

## 📂 The Merchant Journey (Core Product Flow)

### 1. Collect Payments
* **Webhook Receiver**: Receives payment notifications through webhook events in the webhook route [/api/webhooks/alatpay](file:///Users/macbook/Documents/merchant-iq/src/app/api/webhooks/alatpay/route.ts) to instantly process inflows and evict cached AI insights.
* **Payment Invoices**: Generates customer invoice links (referencing `ALAT-PL-` prefixes) simulating card checkout procedures.
* **Customer Virtual Accounts**: Provisions customer-specific Wema Bank virtual accounts (starting with `801`) to auto-reconcile transfers.

### 2. Automate Receivables
* **AI Collections Assistant**: Gemini processes pending invoices to draft SMS, WhatsApp, and Email reminders.
* **Estimated Recovery**: Aggregates the total pending invoices balance as an outcome-oriented recovery target.

### 3. Understand Cashflow
* **Operational Metrics**: Outlines Revenue, Expenses, Net Profit, and ALATPay payment collection growth comparisons (`+18% vs last month`).
* **Financial Event Timeline**: A visual event-log showcasing downstream system actions triggered in real-time by incoming payment notification webhooks.

### 4. AI CFO
* **Computed Insights**: The analytics engine computes cash runway, forecasts, and financial metrics.
* **Generative CFO**: Gemini uses these computed insights together with transaction history to generate a Morning Brief, identify a single "Today's Priority" action card, and answer grounded financial questions.

### 5. Measure Trust Score
* **Business Trust Score (300-850)**: Calculates an internal Trust Score (300–850) that estimates a merchant's financial consistency and credit readiness using transaction behavior, cashflow stability, and growth trends.

### 6. Simulate Financing
* **Lender Simulator**: Pre-qualifies merchants for lender tiers (Carbon, Renmoney, FairMoney).
* **Scenario Repayments**: Enables merchants to simulate repayment scenarios and determine how many days of average sales are required to comfortably cover each monthly repayment.

### 7. Share Trust Passport
* **Business Trust Passport**: Generates a shareable public profile that summarizes a merchant's financial consistency, Trust Score, and credit readiness while protecting sensitive balances and transaction details. Merchants can share this profile with lenders, suppliers, or partners as evidence of business reliability.

---

## 🔒 Security, Reliability & Compliance
* **Authentication**: JWT session tokens signed and stored inside HTTP-only cookies (`merchantiq_auth`).
* **Webhook Idempotency**: Stores incoming event references in the database, checking for duplicates before credit scoring and bookkeeping updates to prevent double-counting.
* **Server-Side Verification**: Runs Zod and database validations on the server to prevent front-end client-side bypass.
* **Privacy-Preserving Public Profiles**: Enforces strict selective exposure, returning only score ranges and consistency percentages to third-party lenders while completely masking direct cash balances.
