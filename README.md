# VAAHAN – Institutional Campus Bus Facility & Fleet Tracking System

VAAHAN is a modern, real-time campus transit and institutional bus facility management platform built for students, drivers, and transport administrators.

---

## 🌟 Key Features

### 🎓 Student Portal
- **Student Registration & Transport Allocation:** Multi-step wizard with PRN validation, shift selection, official route selection, designated pickup stop allocation, and fee receipt upload.
- **Pass Expiry & Razorpay Renewal:** Real-time bus pass status tracking, validity expiry reminders, and ₹1.00 Test Mode pass renewals powered by Razorpay and Supabase Edge Functions.
- **Live GPS Bus Tracking:** Interactive Leaflet / OpenStreetMap transit map showing moving bus position, road curvature interpolation, designated pickup stop highlights (★), current/next stop telemetry, and sequential Stop Progress Timeline.
- **Real-Time Notifications:** Push alerts for Transit Events (Driver Ready, Trip Started, Approaching Stop, Stop Reached, Trip Completed, and Pass Expiry).

### 🚌 Driver Portal
- **Route & Shift Trip Initialization:** Outbound (`TO_COLLEGE`) and Inbound (`RETURNING_HOME`) trip dispatching with bus capacity checks and student manifest previews.
- **Dual Telemetry Modes:** Real-time hardware GPS streaming or realistic simulated demonstration runs along official road geometries.
- **Sequential Stop Check-In:** Ordered stop progression tracking preserving circular routes (e.g. repeated junction stops like Dwarka Stop on CIDCO).
- **🚨 Driver SOS Emergency Beacon:** Instant emergency signal dispatch with accidental click confirmation, reason classification, live device coordinates, and real-time administrator acknowledgment/resolution feedback.

### 🛡️ Admin Transport Control
- **Student Verification & Approvals:** Review registrations, inspect fee receipts, verify PRNs, and grant transportation access.
- **Pass Expiry & Renewals Management:** Monitor active passes, identify expiring/expired students, and track digital payment logs.
- **Active Trips Live Fleet Map:** Multi-bus live monitoring across Morning and General shifts.
- **Official Routes & Stops:** Authoritative 5 official college routes with 1-based sequential stop ordering and pickup eligibility toggles.
- **Driver & Fleet Management:** Institutional driver credentials, license records, and bus fleet maintenance operations.
- **🚨 SOS Emergency Triage Dashboard:** High-visibility emergency beacon triage with one-click direct phone dialer (`tel:`), live map location pin modal, and complete acknowledge/resolve audit workflow.

---

## 🛠️ Technology Stack

- **Frontend:** React 19, TypeScript, Vite, TailwindCSS v4, Motion, Lucide Icons
- **Mapping & Geolocation:** Leaflet, OpenStreetMap, Custom SVG Markers & Dynamic Road Curvature Interpolation
- **Backend & Database:** Supabase (PostgreSQL, Row Level Security, Realtime Subscriptions, Database Functions/RPCs)
- **Serverless Edge Functions:** Deno runtime on Supabase Edge Functions for Razorpay order generation and signature verification
- **Payments:** Razorpay Standard Checkout SDK
- **Deployment:** Vercel

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm, pnpm, or yarn
- Supabase project credentials

### 1. Clone & Install
```bash
git clone https://github.com/pra77a8/Vaahan.git
cd Vaahan
npm install
```

### 2. Configure Environment Variables
Copy the template and fill in your Supabase credentials:
```bash
cp .env.example .env
```

Edit `.env`:
```ini
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-publishable-anon-key>
```

### 3. Run Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production
```bash
npm run build
```

---

## ☁️ Deployment on Vercel

1. Push your repository to GitHub.
2. In the [Vercel Dashboard](https://vercel.com/new), click **Add New Project** and import `Vaahan`.
3. In **Environment Variables**, configure:
   - `VITE_SUPABASE_URL`: Your Supabase Project URL.
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Public Key.
4. Click **Deploy**. Vercel will automatically build the project with Vite using the included `vercel.json` rewrite configuration.

---

## 🗄️ Database & Migrations

All PostgreSQL migrations (001 to 025) and Edge Functions are located in the `supabase/` directory:
- `supabase/migrations/`: Complete schema, official route seeds, RLS policies, triggers, and RPC functions.
- `supabase/functions/`: Serverless Edge Functions (`create-driver-account`, `create-razorpay-order`, `verify-razorpay-payment`).

---

## 📄 License
Educational Institutional License · K.K. Wagh Education Society & E-Yantra.
