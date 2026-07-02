# ABD Restaurant — Smart Restaurant Management System

A production-grade restaurant platform built on **Next.js 16 (App Router) +
React 19**, **Neon Postgres + Drizzle ORM**, **NextAuth v5**, Tailwind + shadcn
(base-nova) UI, and Razorpay/Cloudinary/Resend/Twilio integrations (env-guarded).

> **All 5 phases are complete.** The system is feature-complete: project setup, full
> database schema + migrations + seed, role-based auth, the admin shell, Rooms &
> Tables management (create/edit/delete, move, **merge**, **transfer**, live
> floor status), signed per-table **QR**, **menu management** with Cloudinary
> images, the full **QR customer ordering** flow (cart, item notes, live status +
> progress bar, favorites, call-waiter, request-bill, add-to-running-order,
> post-meal ratings), the **Kitchen Display System** (station routing,
> color-coded live cooking timers, rush flag, sound alerts), and a live
> **orders board** — realtime via polling.

---

## Tech stack

| Area        | Choice                                                        |
| ----------- | ------------------------------------------------------------ |
| Framework   | Next.js 16 (App Router, Server Actions, `proxy` guard)       |
| Language    | TypeScript (strict)                                          |
| Database    | Neon Postgres (serverless) + Drizzle ORM + drizzle-kit       |
| Auth        | NextAuth v5 (Auth.js), Credentials + JWT, role-based         |
| UI          | Tailwind CSS v4, shadcn/ui (base-nova), lucide-react, dark mode |
| Charts      | recharts                                                     |
| Realtime    | **Socket.IO** (custom Next server) — push, with polling fallback |
| QR          | `qrcode` + signed tokens (HMAC-SHA256)                       |
| Payments    | Razorpay (Phase 3)                                           |
| Images      | Cloudinary (Phase 2)                                         |
| Email / SMS | Resend / Twilio (Phase 4, optional)                         |

---

## Prerequisites

- Node.js 20+ (tested on 24)
- Yarn 4 (repo uses `nodeLinker: node-modules`)
- A **Neon** Postgres database — grab the *pooled* connection string from
  <https://console.neon.tech>

---

## Setup

```bash
# 1. Install dependencies
yarn install

# 2. Configure environment
cp .env.example .env
#   then edit .env and paste your Neon DATABASE_URL.
#   AUTH_SECRET / QR_SIGNING_SECRET / CRON_SECRET are pre-generated for you.

# 3. Create the database schema (choose one)
yarn db:push          # fast: push schema straight to Neon (great for dev)
#   — or —
yarn db:migrate       # apply the generated SQL migrations in ./drizzle

# 4. Seed demo data (staff logins, rooms, tables+QR, menu, inventory)
yarn db:seed

# 5. Run
yarn dev              # http://localhost:3000
```

### Demo logins (created by the seed)

| Role    | Email             | Password      |
| ------- | ----------------- | ------------- |
| Admin   | admin@abd.test    | `password123` |
| Manager | manager@abd.test  | `password123` |
| Chef    | chef@abd.test     | `password123` |
| Waiter  | waiter@abd.test   | `password123` |

---

## Environment variables

See [`.env.example`](./.env.example) for the full list. Essentials:

| Variable            | Required | Notes                                        |
| ------------------- | -------- | -------------------------------------------- |
| `DATABASE_URL`      | ✅       | Neon pooled connection string                |
| `AUTH_SECRET`       | ✅       | `openssl rand -base64 32`                     |
| `NEXT_PUBLIC_APP_URL` | ✅     | Base URL, used in QR links (`/table/<token>`) |
| `QR_SIGNING_SECRET` | ✅       | Signs table QR tokens                        |
| `CRON_SECRET`       | ✅       | Protects the demo-cleanup cron (Phase 5)     |
| Cloudinary / Razorpay / Resend / Twilio | ⭕ | Optional — features degrade gracefully when unset |

---

## Project structure

```
src/
  app/
    (admin)/            # login-required console (shared layout + sidebar)
      dashboard/  rooms/  orders/  kitchen/  menu/
      reservations/  inventory/  staff/  reports/  settings/
    (auth)/login/       # staff sign-in
    (customer)/table/[qrToken]/   # public QR landing (no login)
    api/auth/[...nextauth]/       # NextAuth handlers
  auth.ts               # full NextAuth instance (Credentials + bcrypt)
  auth.config.ts        # edge-safe config (used by proxy + auth)
  proxy.ts              # route guard (Next 16's renamed middleware)
  db/
    schema.ts           # Drizzle schema (25 tables)
    index.ts            # lazy Neon client
    seed.ts             # demo seed
  lib/
    qr.ts               # signed QR tokens + table URL
    auth-helpers.ts     # requireUser / requireRole
  components/           # shadcn UI + feature components
drizzle/                # generated SQL migrations
```

## Database scripts

| Command            | Purpose                              |
| ------------------ | ------------------------------------ |
| `yarn db:generate` | Generate SQL migration from schema   |
| `yarn db:push`     | Push schema directly to the database |
| `yarn db:migrate`  | Apply migrations                     |
| `yarn db:seed`     | Seed demo data                       |
| `yarn db:studio`   | Open Drizzle Studio                  |

---

## Deploy to Vercel

1. Push this repo to GitHub and import it in Vercel.
2. Add all env vars from `.env.example` in **Project → Settings → Environment
   Variables** (set `NEXT_PUBLIC_APP_URL` to your production URL).
3. Run `yarn db:push` (or `db:migrate`) and `yarn db:seed` against your
   production Neon branch once.
4. Deploy. The Vercel Cron for Live Demo cleanup is added in Phase 5.

---

## Roadmap

- **Phase 1 ✅** Setup, schema, auth, rooms/tables (+merge/transfer), QR
- **Phase 2 ✅** Menu management (Cloudinary), QR customer ordering (cart, notes,
  live status + progress bar, favorites, call-waiter, request-bill,
  add-to-running-order, ratings), KDS (station routing, color-coded live cooking
  timers, rush, sound alerts), live orders board — all via polling
- **Phase 3 ✅** Razorpay payments (pay-from-QR + waiter POS), split bills
  (even), tips, GST, **coupons/happy-hour**, **loyalty points**, printable
  receipts; **reservations** (no double-booking) + **waitlist** (notify-when-free)
  + pre-order; delivery order mode; Resend/Twilio adapters (env-guarded)
- **Phase 4 ✅** Inventory (recipe **auto-deduct** on order, low-stock alerts,
  **auto-disable/enable** dishes, suppliers, purchase orders, wastage/expiry);
  staff (CRUD, roles, shifts, attendance, **waiter performance**, audit log);
  **analytics dashboard** (KPIs + charts) and **reports** (margins, peak hours,
  room revenue, repeat rate, CSV/PDF export); **notifications center** (bell)
- **Phase 5 ✅** 5-minute self-clearing **Live Demo** (isolated per-session
  sandbox, countdown banner, auto-purge via **Vercel Cron**, strict data
  isolation from real data) and **PWA** (installable, offline fallback)

## Realtime (Socket.IO)

Live surfaces — **KDS**, the **orders board**, the customer **order-status** page,
and the **notification bell** — update via **WebSocket push** instead of waiting on
polling. A custom Next server ([`server.mjs`](server.mjs)) attaches a Socket.IO
server; Server Actions emit `changed` events through
[`realtime-server.ts`](src/lib/realtime-server.ts) and clients refetch via the
[`useRealtime`](src/lib/realtime-client.ts) hook. Socket rooms mirror the
data-scope isolation (`real` vs `demo:<sessionId>`), and every client keeps a slow
poll as a fallback.

> **Run it with `yarn dev` / `yarn start`** — both boot `server.mjs`. (`yarn
> dev:next` runs the plain Next dev server without sockets.)
>
> **Deployment:** WebSockets need a persistent Node process, so deploy to a Node
> host (Render, Railway, Fly, a VPS, or any container) rather than Vercel
> serverless. On Vercel, either run this as a Node service or swap the socket
> layer for a managed realtime provider (Pusher/Ably) — the app still works
> there via the polling fallback.

## Live Demo mode

Click **“Try Live Demo (5 min)”** on `/login`. This seeds an isolated sandbox
(demo rooms, tables + QR, menu, a running order, inventory), sets a
demo-session cookie, and grants full admin access for 5 minutes without signup.
Every demo row is tagged with a `session_id` + `expires_at`; a Vercel Cron
(`/api/cron/purge-demo`, every minute — see `vercel.json`) deletes expired demo
data. Real data (`session_id IS NULL`) is never touched, and demo visitors only
ever see their own session. Tune the length with `DEMO_SESSION_MINUTES`.
