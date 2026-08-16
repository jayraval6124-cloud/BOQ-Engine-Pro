# BOQ Engine Pro — Setup Guide

## What This Is

A production-ready civil engineering estimating platform — **Version 2: Smart Estimation Engine**

**V1 Core Modules:**
- Project management (CRUD, search, filter, audit trail)
- SOR (Schedule of Rates) database with CSV import + rate history
- Element Engine (13 construction elements, auto work item linking)
- Measurement Sheet (spreadsheet-like, formula engine, L×B×D auto calculation)
- BOQ Generator (auto-generate from measurements, approve + lock workflow)
- Abstract with charts (chapter-wise, element-wise cost breakdown)
- PDF & Excel export (professional formatted reports)
- Role-based access (Admin / Estimator / Viewer)

**V2 Smart Engine Additions:**
- Smart Project Wizard (4-step guided project creation from 8 templates)
- Element Assembly Builder (reusable work item groups with formulas)
- Auto Measurement Generator (generate rows from assembly with dimensions)
- Estimate Revision System (snapshot BOQ, compare revisions, lock history)
- Rate Analysis Module (per-item component breakup: Material/Labour/Machinery/etc.)
- Advanced BOQ Controls (item types, surcharges: GST/agency/escalation/contingency)
- Validation Engine (pre-approval checks: zero rates, duplicates, amount mismatches)
- Knowledge Base (searchable specs, formulas, regulations, notes)
- Global Search (Ctrl+K — search projects, SOR, elements, BOQs, knowledge)

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18+ |
| PostgreSQL | 14+ |
| npm | 9+ |

---

## Step 1: Install Dependencies

```bash
cd "d:/My Own Software/BOQ Engine Pro"
npm install
```

---

## Step 2: Configure Environment

Copy `.env.example` to `.env`:

```bash
copy .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/boq_engine_pro"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-a-random-32-char-string-here"
```

To generate NEXTAUTH_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Step 3: Set Up Database

Create the database in PostgreSQL first:
```sql
CREATE DATABASE boq_engine_pro;
```

Then run Prisma:
```bash
npm run db:generate
npm run db:push
npm run db:seed
```

The seed creates:
- 30+ SOR items (Gujarat 2024-25 rates)
- 13 element templates (Footing, Column, Beam, Slab, etc.)
- 9 formula library entries
- 1 sample project
- 3 user accounts (admin, estimator, viewer)

---

## Step 4: Run Development Server

```bash
npm run dev
```

Visit: **http://localhost:3000**

---

## Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@boqpro.com | admin@123 |
| Estimator | estimator@boqpro.com | estimator@123 |
| Viewer | viewer@boqpro.com | viewer@123 |

---

## Application Flow

```
Login
  └─ Dashboard (stats, recent projects, charts)
       ├─ Projects
       │    ├─ Create project (name, client, district, SOR year)
       │    ├─ View project detail (elements, measurements, BOQs, audit)
       │    └─ Edit project
       │
       ├─ SOR Database
       │    ├─ Browse SOR items (filter by district, year, chapter)
       │    ├─ Add/Edit items manually
       │    └─ Import from CSV
       │
       ├─ Element Library
       │    └─ View 13 system elements with linked work items
       │
       ├─ Formula Library
       │    ├─ View system formulas (L×B×D, Area, Steel weight, etc.)
       │    └─ Add custom formulas with live validation
       │
       ├─ Measurements
       │    ├─ Create measurement sheet for a project
       │    ├─ Spreadsheet editor (add rows, group headers)
       │    ├─ Auto-calculate quantity from L×B×D×Nos
       │    ├─ Custom formula per row
       │    └─ Manual override with flag
       │
       ├─ BOQ Generator
       │    ├─ Auto-generate from measurement sheet
       │    ├─ Rate lookup from SOR database
       │    ├─ Edit items (rate, quantity, description)
       │    ├─ Add manual items
       │    ├─ Group by chapter
       │    ├─ Approve & Lock BOQ
       │    └─ Abstract (chapter-wise + charts)
       │
       ├─ Reports
       │    ├─ Export BOQ to Excel (.xlsx)
       │    └─ Export BOQ to PDF (A4 landscape)
       │
       └─ Settings
            ├─ My Profile
            ├─ Company settings
            ├─ Change password
            └─ Audit trail
```

---

## CSV Import Format for SOR

Create a CSV file with these columns:

```csv
Item Code,Description,Unit,Rate,Chapter,Sub Chapter,Category
2.1.1,"Excavation in foundation trenches",Cum,185.00,Chapter 2 - Earthwork,2.1 Excavation,
3.2.1,"RCC M20 in footings",Cum,7850.00,Chapter 3 - Concrete Work,3.2 RCC,
```

- Go to SOR Database → select District & Year → click **Import CSV**
- Existing items (same code+district+year) are updated; rate history is saved

---

## Measurement Sheet Formula Guide

In the Formula column, you can use:

| Formula | Example |
|---------|---------|
| Standard (Nos×L×B×H) | Leave blank |
| Custom expression | `L * B * D * Nos` |
| Circular | `3.14159 * R * R * H * Nos` |
| Steel weight | `(Dia * Dia / 162) * L * Nos` |
| Triangle | `0.5 * B * H * Nos` |
| Deduction | Prefix row with `-` quantity override |

Variables recognized: `Nos`, `L`, `B`, `H`, `D`, `R`, `Dia`

Mark **M** button on a row to manually override the calculated quantity.

---

## Business Rules Implemented

- Every project must have district and SOR year
- BOQ item amount = Quantity × Rate (auto-calculated)
- Manual quantity override is flagged in BOQ
- Approved BOQ requires Admin to lock (DRAFT → APPROVED → LOCKED)
- Locked BOQ cannot be modified
- All record deletes use soft delete (deletedAt field)
- Full audit log on every create/update/delete/export/login
- Role enforcement: VIEWER = read + export only, ESTIMATOR = create/edit, ADMIN = all including delete/lock

---

## Production Deployment

1. Build: `npm run build`
2. Set `NEXTAUTH_URL` to your production domain
3. Use a proper PostgreSQL instance (Railway, Neon, Supabase, etc.)
4. Run `npm run db:migrate` (not `db:push`) in production
5. Start: `npm start`

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | NextAuth.js v5 (JWT) |
| Charts | Recharts |
| Excel Export | ExcelJS |
| PDF Export | pdf-lib |
| CSV Import | PapaParse |
| Formula Engine | math.js |
| Forms | React Hook Form + Zod |
| State | React useState / Zustand |
