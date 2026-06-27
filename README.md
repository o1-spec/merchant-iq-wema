# MerchantIQ - AI Financial Operating System for ALATPay

**MerchantIQ** is an AI-powered alternative underwriting and financial intelligence platform built on top of **Wema Bank's ALATPay infrastructure**. It acts as a financial passport for underserved SMEs in Nigeria, transforming their raw, everyday transaction data into a verifiable, bankable Credit Readiness profile.

---

## 🌟 The Core Vision: Alternative Credit Underwriting
Small and medium businesses in Nigeria generate significant sales but are regularly locked out of formal credit systems because they lack audited statements or traditional credit scores.

MerchantIQ bridges this gap:
1. **Verifiable Inflows**: Merchants route their payment links and customer transactions via ALATPay.
2. **Cryptographic Validation**: Incoming payment notifications are cryptographically verified using raw-body HMAC signature checking, ensuring the ledger is built from verified banking notifications rather than self-reported figures.
3. **Credit Readiness Metrics**: Sourced transaction volumes compute a real-time **MerchantIQ Trust Score** (scaled from 300 to 850) and a **Credit Readiness Score** (percentage-based health index).
4. **Business Trust Passport**: Generates a shareable, verifiable financial profile that micro-lenders can use to approve credit lines.

---

## 🛠️ Implemented Modules

### 1. ALATPay Billing & Invoice Center
* **Payment Invoices**: Generate custom checkout payment links directly for client emails or WhatsApp.
* **Customer Virtual Accounts**: Provision dedicated, persistent virtual wallets (Wema/ALAT) for recurring buyers to automate reconciliation.
* **Guest Checkout Experience**: Fully styled, secure checkout page accepting transfer and card methods with real-time feedback.

### 2. Live Webhook Ingestion Pipeline
* **Cryptographic Verification**: Enforces signature checks using `x-signature` raw-body HMAC-SHA256 Base64 hashing. Note: `x-signature` is required in production/live mode, while for local demo mode, the simulator generates the correct header server-side.
* **Status Normalization**: Evaluates payment statuses case-insensitively, accepting `"completed"`, `"successful"`, and `"success"` as valid ingestion triggers.
* **ACID Transactions**: Direct database updates match invoice orders or virtual wallets, updating runway days instantly.

### 3. Interactive Analytics Dashboard
* **Cash Runway safety Gauge**: Tracks operating runway ranges (Green/Strong, Orange/Moderate, Red/Critical).
* **SVG Forecast Sparkline**: Renders interactive vector charts tracing projected 30-day runway trends.
* **Webhook Activity Timeline**: Glowing activity feeds with pulsate (`animate-ping`) markers that react to live webhook events.

### 4. AI CFO Invoicing Recovery Nudge
* Displays an **"AI Nudge"** sparkles action button next to pending items.
* Parses Gemini LLM output into tailored tab selectors (**WhatsApp**, **SMS**, and **Email** drafts) with copy actions.

### 5. Bank Statement CSV Parser
* Drag-and-drop CSV statements from non-integrated legacy banks.
* Gemini maps irregular columns dynamically, saving a repeatable parsing layout template.

### 6. Capital & Credit Readiness Center
* Evaluates alternative borrowing metrics, risk levels, and monthly revenue capacity.
* Includes loan stress simulators assessing interest, terms, and repayment margins.

---

## ⚡ Technical API Workflow

```text
  [ Merchant Auth ]
          ↓
  [ Create Payment Link / Virtual Wallet ]
          ↓
  [ Customer Triggers Simulator Checkout ]
          ↓
  [ Signed HMAC Webhook Posted to /api/webhooks/alatpay ]
          ↓
  [ Ledger & Cash Runway Updated ]
          ↓
  [ Credit Readiness & Trust Score Recalculated ]
          ↓
  [ AI CFO Invoicing Nudges & Morning Brief Generated ]
          ↓
  [ Verifiable Business Trust Passport Shared ]
```

---

## ⚙️ Environment Configuration

Set up these keys in your `.env` file or hosting environment (e.g. Vercel):

```properties
# Database connection strings (PostgreSQL/Supabase)
DATABASE_URL="postgresql://username:password@host:port/dbname?pgbouncer=true"
DIRECT_URL="postgresql://username:password@host:port/dbname"

# Session JWT Authentication Secret
JWT_SECRET="secure-long-string-key"

# Gemini API Key (For CFO AI Ingestion & Recovery drafts)
GEMINI_API_KEY="AIzaSy..."

# Public Host Origin URL (Defaults to request origin if left blank)
NEXT_PUBLIC_APP_URL="https://your-project.vercel.app"

# ALATPay Keys
ALATPAY_PUBLIC_KEY="43f69..."
ALATPAY_SECRET_KEY="ded75..."
ALATPAY_WEBHOOK_SECRET="38051..."
ALATPAY_BUSINESS_ID="05a96..."
```

---

## 🚀 Quickstart & Local Installation

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Prisma Client & Database
```bash
npx prisma generate
npx prisma db push
```

### 3. Run Development Server
```bash
npm run dev
```

### 4. Seed Simulated Demo Data
To test the interactive dashboard without making actual live Wema transactions, call the simulation seeding endpoint:
```bash
curl -X POST http://localhost:3000/api/demo/seed
```
This loads structured transaction data into Supabase, instantly populating your cash charts, runway estimates, and lenders matches!

---

## 💡 Judges Q&A Cheat Sheet

* **Why ALATPay?**
  We integrate directly with Wema Bank's ALATPay network to leverage their virtual account systems and webhook triggers to compile bankable ledgers for Nigerian SMEs.
* **Why Gemini?**
  Gemini translates static transaction histories into real-time advisory briefs, drafts collections reminders, and automatically parses bank CSV statement columns.
* **How are transactions protected?**
  Incoming webhook bodies are verified against an HMAC-SHA256 signature calculated with a private secret key shared only between Wema Bank's portal and our backend.
* **Why would a lender trust this?**
  Lenders can verify that every transaction logged inside the merchant's Trust Passport is tied to a cryptographically signed webhook confirmation from Wema Bank.
* **How is the Credit Readiness Score calculated?**
  It is a weighted, proprietary rating evaluating cashflow volume, runway days, revenue variance, and payment history consistency.
