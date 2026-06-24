# MerchantIQ - Application Walkthrough & Overview

**MerchantIQ is an AI Financial Operating System that helps African SMEs transform every ALATPay payment into real-time business intelligence. By automating collections, monitoring cashflow, and measuring credit readiness, MerchantIQ enables merchants to make better financial decisions and build a verifiable business profile for future financing.**

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

## 📂 Core Product Pillars

### 1. ALATPay-Powered Collections
**Page**: [/collections](file:///Users/macbook/Documents/merchant-iq/src/app/(dashboard)/collections/page.tsx)  
* **Webhook Receiver**: Receives payment notifications through webhook events in the webhook route [/api/webhooks/alatpay](file:///Users/macbook/Documents/merchant-iq/src/app/api/webhooks/alatpay/route.ts) to instantly process inflows and evict cached AI insights.
* **Payment Invoices**: Generates customer invoice links (referencing `ALAT-PL-` prefixes) simulating card checkout procedures.
* **Customer Virtual Accounts**: Provisions customer-specific Wema Bank virtual accounts (starting with `801`) to auto-reconcile transfers.
* **AI Collections Assistant**: Gemini processes pending invoices to draft SMS, WhatsApp, and Email reminders.
* **Estimated Recovery**: Aggregates the total pending invoices balance as an outcome-oriented recovery target.

### 2. Real-Time Dashboard
**Page**: [/dashboard](file:///Users/macbook/Documents/merchant-iq/src/app/(dashboard)/dashboard/page.tsx)  
* **Operational Metrics**: Outlines Revenue, Expenses, Net Profit, and ALATPay payment collection growth comparisons (`+18% vs last month`).
* **Today's Priority Card**: Highlights the merchant's single highest priority action (e.g. following up on overdue invoices to extend cash runway).
* **Financial Event Timeline**: A visual event-log showcasing downstream system actions triggered in real-time by incoming payment notification webhooks.

### 3. Capital Readiness & Business Trust Score
**Page**: [/capital](file:///Users/macbook/Documents/merchant-iq/src/app/(dashboard)/capital/page.tsx)  
* **Business Trust Score (300-850)**: Standardizes consistency and cash capability.
  * *Ledger Consistency (20% weight)*
  * *Operating Cashflow (30% weight)*
  * *Outflow Stability (15% weight)*
  * *Revenue Growth (15% weight)*
  * *Underwriting Trust (20% weight)*
* **Lender Simulator**: Pre-qualifies merchants for lender tiers (Carbon, Renmoney, FairMoney). Calculates monthly repayment principal, interest, and **Payment Inflow Coverage** (evaluating how many days of average transaction inflows are required to cover the monthly debt).

### 4. Business Trust Passport
**Pages**: [/profile](file:///Users/macbook/Documents/merchant-iq/src/app/(dashboard)/profile/page.tsx) & [/public/merchant/[id]](file:///Users/macbook/Documents/merchant-iq/src/app/public/merchant/[id]/page.tsx)  
* **verifiable Profile**: A shareable public profile that summarizes a merchant's operational consistency, payment history, and financial reliability without exposing sensitive transaction data. Merchants can share this profile with lenders, suppliers, or business partners as evidence of financial discipline.

### 5. Gemini AI CFO Widget
**Routes**: [/api/ai/morning-brief](file:///Users/macbook/Documents/merchant-iq/src/app/api/ai/morning-brief/route.ts) & [/api/ai/ask-cfo](file:///Users/macbook/Documents/merchant-iq/src/app/api/ai/ask-cfo/route.ts)  
* Explains yesterday's performance, drafts priorities, and answers store queries grounded on transaction databases.

### 6. Reports Center
**Page**: [/reports](file:///Users/macbook/Documents/merchant-iq/src/app/(dashboard)/reports/page.tsx)  
* Generates CSS-styled printable audit PDFs with checkmark checklists validating runway risk, revenue trend, and credit status.

### 7. Security & Reliability
* **Authentication**: JWT session tokens signed and stored inside HTTP-only cookies (`merchantiq_auth`).
* **Webhook Idempotency**: Stores incoming event references in the database, checking for duplicates before credit scoring and bookkeeping updates to prevent double-counting.
* **Server-Side Verification**: Runs Zod and database validations on the server to prevent front-end client-side bypass.
* **Privacy-Preserving Public Profiles**: Enforces strict selective exposure, returning only score ranges and consistency percentages to third-party lenders while completely masking direct cash balances.
