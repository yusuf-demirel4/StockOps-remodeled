# StockOps — Implementation Plan v2

> Replaces `implementation_plan.md`. Same product vision, completely different sequencing.
> The old plan optimised for *feature parity with Cin7*. This one optimises for *trustworthiness, then real users, then differentiation*.

---

## Mission

Build the inventory + order management system that a Turkish small business owner can run their entire day on, trusts not to lose data, and would call us angry if it went down.

That's the real bar. "Beat Cin7" is a marketing line we'll earn the right to use later, not the goal we plan against today.

---

## Operating principles

These govern every decision in every phase. When in doubt, fall back to them.

1. **Trust before features.** A form that silently doesn't save, a button that goes nowhere, a PDF that looks like 2008 — each of these is worse than the feature not existing. Ship fewer surfaces, but make every surface true.
2. **One customer beats ten phases.** Until someone uses StockOps for their actual inventory and would be upset if it went down, every roadmap item is theoretical. Get to that person fast. Let their reality dictate the next sprint.
3. **Narrow then deepen.** Hide everything that isn't ready. Make the visible surface excellent. Resist the urge to ship a feature "for completeness" — completeness is what you have *after* depth, not how you achieve it.
4. **Truth in errors.** When something fails, the user should see what failed and what to do. No generic Turkish strings. No silent rejections. No 500 pages without an error code.
5. **The wedge, not the parity.** We don't compete with Cin7 on feature count. We compete on three things they're weakest at: real-time stock, transparent costing, painless accounting handoff. Everything else is parity-or-skip.
6. **Test the boring stuff.** The bugs that kill products are silent writes, dropped jobs, mis-rounded totals. Tests cost a day, the bug they prevent costs a customer. Always pay the day.
7. **Default to honesty.** When the demo is in a known-broken state, the homepage says so. When a feature is half-built, it shows "Coming soon" instead of an empty page that suggests the user's data went missing.

---

## Phase 0 — Stabilise (Weeks 1–2)

**Goal:** Make the deployed product truthful. No silent failures, no dead links, no half-finished surfaces masquerading as features.

**Why first:** Right now BUG-1 means the entire database mode silently drops writes. A user creating their first product would think it worked, reload, and find an empty list. They'd never come back. Until this and a small set of related issues are fixed, every other phase is built on sand.

**Done when:**
- All mutations write to Postgres successfully.
- All form failures show a real error message to the user, not a generic toast.
- A CI workflow runs on every push and catches a regression in any of the five core flows before it reaches production.
- Every nav item either works fully or is hidden behind a feature flag with a "Coming soon" placeholder.

### 0.1 — Fix the RLS write path

The phase-7 hardening migration applied `FORCE ROW LEVEL SECURITY` with `WITH CHECK` policies that reference `current_setting('app.current_organization_id')`. The Prisma client never sets this. Result: every INSERT silently denies because the WITH CHECK evaluates to NULL.

Two acceptable fixes — pick one and commit:

**Option A (pragmatic, recommended for now):** drop FORCE everywhere. The app already filters by `organizationId` in every repository function. The Vercel-side auth context guarantees a single org per request. RLS becomes defence-in-depth that activates only if a non-superuser role is later introduced.

  - Apply migration `20260502210000_disable_force_rls` (already written in `packages/db/prisma/migrations/`).
  - Document the trade-off in `packages/db/README.md`.

**Option B (defensible long-term):** keep FORCE, add a Prisma middleware that runs `SET LOCAL app.current_organization_id = $1` at the start of every transaction.

  - Modify `packages/db/src/client.ts` to expose `getPrismaForOrg(orgId)`.
  - Update `apps/web/src/lib/repository.ts` and `apps/web/src/lib/auth.ts` so every code path that gets the prisma client passes the org context.
  - Verify with Transaction pooler: `SET LOCAL` works inside a transaction even on pgbouncer transaction mode, but every Prisma call that needs the setting must be wrapped in `prisma.$transaction(async tx => …)`.

Pick option A for Phase 0. Move to option B only if a second tenant or an external user with their own DB role enters the picture. Don't build option B preemptively.

### 0.2 — Surface real errors

`apps/web/src/lib/actions.ts → actionErrorMessage()` currently maps everything that isn't a Zod error to a generic Turkish string. Replace with:

- Specific messages for known Prisma error codes (`P2002 unique constraint`, `P2025 not found`, `P2003 FK violation`).
- For unknown errors: log full error to the server (`console.error` is fine for now, structured logging in 0.4) and return a message containing a request-scoped error ID the user can quote in support.
- Add an `error.code` discriminator to `ActionState` so the client can render different UI per code.

Add a single error toast component to `apps/web/src/components/ui.tsx` that any form can render via `actionState.message + actionState.code`.

### 0.3 — End-to-end CI

Create `.github/workflows/ci.yml`:

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_PASSWORD: ci, POSTGRES_DB: stockops_ci }
        ports: ["5432:5432"]
        options: --health-cmd "pg_isready" --health-interval 10s
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run prisma:migrate:deploy
        env: { DATABASE_URL: "postgresql://postgres:ci@localhost:5432/stockops_ci" }
      - run: npm run prisma:seed
        env: { DATABASE_URL: "postgresql://postgres:ci@localhost:5432/stockops_ci" }
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - run: npm run test:e2e
        env: { DATABASE_URL: "postgresql://postgres:ci@localhost:5432/stockops_ci" }
```

Add five Playwright e2e tests in `apps/web/e2e/`:

- `auth.spec.ts` — sign in with valid creds → dashboard renders. Sign in with invalid → error banner.
- `product-create.spec.ts` — sign in → create product → reload → product visible in list.
- `purchase-receive.spec.ts` — create PO → receive → stock balance increases by quantity.
- `sale-confirm.spec.ts` — create SO → confirm → stock balance decreases by quantity.
- `invoice-pay.spec.ts` — create invoice → record payment → status moves to PAID.

Each test uses a fresh seed, runs against the CI Postgres, and asserts the row state in the database directly via Prisma where useful. These five tests would have caught BUG-1 the day it shipped.

### 0.4 — Hide unfinished surfaces

Audit every nav item. For each one, classify as:

- **Ready:** complete user journey works end-to-end against real data.
- **Hide:** doesn't fully work — wrap behind `process.env.NEXT_PUBLIC_FEATURE_<NAME> === 'true'` and exclude from the sidebar by default.
- **Stub:** intentionally part of the v1 surface but only a "coming soon" page.

Based on what I've observed:

| Nav item | Classification |
|---|---|
| Dashboard | Ready |
| Onboarding | Ready (it's a docs page) |
| Ürünler (Products) | Ready after 0.1 |
| Stok (Inventory) | Ready after 0.1 |
| Müşteriler (Customers) | Ready after 0.1 |
| Siparişler (Orders) | Ready after 0.1 |
| Faturalar (Invoices) | Ready after 0.1 + PDF polish (0.5) |
| Tedarikçiler (Suppliers) | Ready after 0.1 |
| Üretim (Manufacturing) | **Hide** — BOM workflow not battle-tested |
| Kredi Notları (Credit Notes) | Stub — show "Coming in v1.1" |
| Analitik (Analytics) | **Hide** — chart bug, sparse data |
| Tahmin (Forecasting) | **Hide** — needs sales history; v2 wedge work |
| Raporlar (Reports) | **Hide** — listing is fine, individual reports unverified |
| Developers | Stub — link to OpenAPI but don't show webhook subs UI yet |
| Kullanıcılar (Users) | Ready after 0.1 |
| Ayarlar (Settings) | Ready after 0.1 |
| /mobile/* | **Hide** entirely until Phase 4 |

Hide doesn't mean delete — it means flagged off in production. Code keeps living in the repo. Goal is what the *user* sees, not what exists.

### 0.5 — Invoice PDF polish pass

Right now the PDF is HTML with inline styles, auto-prints on load, and looks like a 2008 print preview. For a tax-relevant document, that's a problem.

- Replace the auto-print with a dedicated "Yazdır" button.
- Add the organisation's tax ID (Vergi No) and address (already on Customer + Organization models — pull them).
- Use proper Turkish tax invoice layout: serial number prefix (e.g. `2026/A/000123`), tax breakdown by KDV rate, "yalnız" amount in words.
- Render via `puppeteer` or `@react-pdf/renderer` to produce real PDF, not HTML-as-PDF. (Keep current HTML version as `/print` fallback.)

Don't get fancy. Goal is "an accountant accepts this without complaint."

### 0.6 — Status page that tells the truth

`/status` currently fetches from a `/v1/status` endpoint that may or may not exist. Make it real:

- Add `/api/health/detailed` returning DB connectivity + last migration applied + queue health.
- `/status` page renders this. Public, no auth.
- Public mention on `/sign-in` of "demo mode" or "live" so prospects know what they're looking at.

### Phase 0 acceptance gates

Don't move to Phase 1 until **all** of these are green:

- [ ] BUG-1 fixed and confirmed via end-to-end test.
- [ ] CI runs on every commit, takes < 5 minutes, fails on a real regression.
- [ ] Every nav item the user sees in production works fully.
- [ ] Manual QA pass against `QA-NOTES.md` shows zero P0/P1 bugs.
- [ ] Vercel deployment has had 0 server-error pages for 7 consecutive days under self-traffic.

---

## Phase 1 — One Persona, Flawless (Weeks 3–8)

**Goal:** Pick a single, very specific customer profile and make their entire daily workflow flawless.

**Why this:** Software is bottomless. You can polish forever in a vacuum. Anchoring to one persona forces you to *finish* in their direction, instead of optimising imaginary use cases.

### 1.1 The persona

**Profile:** Small Turkish e-commerce shop, 200–2,000 SKUs, two warehouses (main + showroom), one Shopify store, sells primarily B2C plus occasional B2B, books with their accountant monthly.

**Daily flow we own:**
1. Morning — open dashboard, see overnight Shopify orders, see critical stock, see what to receive today.
2. Midday — incoming PO arrives, receive against the PO, stock updates, label printed.
3. Afternoon — confirm picked sales orders, mark shipped, capture tracking number.
4. End of day — generate invoices for shipped orders, send to customer.
5. Month-end — export sales + invoices CSV to the accountant.

**This is the slice.** Everything outside it gets the "Coming soon" treatment until Phase 3.

### 1.2 What we polish in this slice

For each step in the daily flow, audit the current state and either fix or ship:

**Sign-in & dashboard:**
- Replace the demo-mode prefill flag with a "Try the demo" link on `/sign-in` that creates a sandbox tenant on the fly. Real tenants don't see demo creds at all.
- Dashboard "İş kuyruğu" card needs to actually link to the queue (today it's a number, no click target).
- Show "Bugün gelen siparişler" specifically — orders received in the last 24h that need confirmation. Most-actionable thing first.

**Products list:**
- Search box that hits Postgres ILIKE on SKU/name/barcode. Today there's no search.
- Pagination — current page returns all rows. At 2,000 SKUs this becomes the slow page.
- Row-level "stoktaki miktar" column — today you have to drill into Inventory to see it.

**Stock movement:**
- Audit the entire movement form. Current camera/scanner UI is half-finished and shows on desktop. Hide on desktop.
- Add a "negatif stok izin verme" toggle on Settings, default ON. With it on, OUTBOUND/SALE/TRANSFER movements that would drive stock below zero are rejected with a clear message ("Showroom'da yalnızca 4 adet var; 5 çıkış yapılamaz.").
- Audit log entry per movement, visible from the product detail.

**Sales order lifecycle:**
- Make the status timeline visible (DRAFT → CONFIRMED → PICKING → PACKED → SHIPPED → DELIVERED). Today it's a dropdown.
- Confirming a SO must check stock availability across all lines and either confirm or fail with line-level messages.
- Pick list generation is in the schema. Wire it: confirming an order auto-creates a PickList; picker UI ticks off lines.
- Ship: capture carrier, tracking number, weight, package count. Current form has the fields — wire the action.

**Purchase order receive:**
- Today's "receive" is binary — full receipt or nothing. Real PO receipts are partial. Add quantity-received per line.
- On receive, increment InventoryLayer with the unit cost from the PO line. This is what makes FIFO costing real later — we'll need this data.
- Email/notification on receipt? Not yet — don't gold-plate.

**Invoice flow:**
- Auto-generate invoice from a SHIPPED sales order with one click ("Fatura kes"). Today it's a separate manual form.
- Invoice numbering: ensure sequential, gap-free per organisation per fiscal year (`2026/A/000001` etc.).
- Payment recording: the form is there, audit it. Add bank reference field, payment method enum.
- Invoice PDF (from 0.5) downloadable from list and detail.

**Month-end export:**
- `/api/export/sales-monthly?from=…&to=…` — sales orders + invoices + payments in one CSV.
- Format aligned with what Turkish accountants actually import (e.g. Logo, Mikro, Luca).
- Test by running it through one of those tools.

### 1.3 Shopify integration, focused

Already scaffolded in `packages/integrations/shopify/`. Make it real for *one* shop:

- OAuth install flow at `/settings/integrations/shopify`.
- Webhook endpoints for `orders/create`, `orders/updated`, `orders/cancelled`, `inventory_levels/update`.
- Map Shopify order → StockOps SalesOrder with status DRAFT.
- Reverse: when StockOps marks a SO SHIPPED with tracking, fulfilment back to Shopify.
- Reconciliation cron that runs nightly, compares Shopify inventory levels vs StockOps stock, flags mismatches in a sync log.
- The sync-log surface in the UI (today only the model exists) gets a basic page: last sync, mismatches, button to re-trigger.

Don't add WooCommerce yet. Don't add multi-shop. Don't add product mapping rules. One shop, end-to-end.

### 1.4 What we explicitly do NOT do in Phase 1

- BOM / manufacturing
- Multi-currency
- Variants beyond the simplest case (one variant per SKU)
- Mobile / PWA / barcode scanning
- AI forecasting
- Public API / SDK
- B2B portal
- Custom reports / report builder
- 2FA, SAML, SSO

Every one of these has tickets and lots of work behind it. None of them earn revenue from our persona until everything else above works.

### Phase 1 acceptance gates

- [ ] You personally run the full daily flow against the live deployment, with one Shopify store connected, end to end without any "oh that's broken" moments. Three days in a row.
- [ ] A non-developer Turkish small business owner you find can complete sign-up → import → daily flow with no help. (You can fix bugs after, but no live coaching.)
- [ ] Performance: every page in the daily flow renders < 1.5s p95 against a tenant with 1,000 products + 500 orders.
- [ ] Audit log shows every meaningful action with actor + IP + diff.

---

## Phase 2 — One Real Customer (Weeks 9–14)

**Goal:** A single Turkish small business runs their actual inventory on StockOps and pays you something.

**Why this is its own phase:** Going from "polished demo" to "production used by a stranger" surfaces an entirely new class of issues. Currency rounding, edge cases in customer data, weird character encodings, tax exemptions, the supplier who emails an Excel sheet with merged cells. You can't simulate this in advance.

### 2.1 Find the customer

Not a friend. Not a "design partner." Someone who would actually be inconvenienced if their current tool went away. Practical search:

- Post in Turkish e-commerce / Shopify communities offering free use during early access in exchange for honest feedback.
- Reach out to small Shopify merchants on Trendyol or Hepsiburada who clearly have inventory pain.
- Don't pitch features. Pitch "free for the first 6 months, in exchange for 30 minutes a week of your time."

Aim for one yes from someone who has 200+ active SKUs and processes 10+ orders/day.

### 2.2 Onboarding pack

Before they sign up, you need:

- A migration import: CSV upload for products, customers, opening stock balances. Test with their real data.
- A sign-up flow that creates a tenant, generates a SESSION_SECRET-equivalent per-tenant secret if needed, and lands them on a guided onboarding (which already exists at `/onboarding`).
- A "support" channel that's real — WhatsApp, Slack Connect, whatever they prefer. Be reachable.

### 2.3 Reliability minimums for a real customer

- Daily Postgres backups via Supabase Point-in-Time Recovery (Pro tier — yes, time to pay for it).
- Uptime monitoring on `/api/health` via UptimeRobot or BetterStack, free tier is fine, page on 5min downtime.
- Sentry on the web app for unhandled errors. `apps/web` has no error tracking right now. Add it.
- Rate limit on `/sign-in` to defeat password spray. Vercel WAF or Upstash ratelimit middleware.
- Email transport via Resend (cheapest sane option). Wire it for password reset and invoice send.

### 2.4 Trust-building rituals

These don't sound technical but matter more than features at this stage:

- **A weekly call** with the customer for the first month. Notes go into a shared doc.
- **A bug → fix → deploy cadence under 24 hours.** Every bug they file gets acknowledged within 4 hours.
- **A status page** they can subscribe to. (We built `/status` in Phase 0.)
- **A monthly summary email** of what changed: features added, bugs fixed, quiet things. Builds confidence.

### 2.5 What customer-2 will tell you

You won't ship anything new in Phase 2 except what the customer asks for. That's the rule. No proactive features. Every line of code maps to a customer ticket or an internal stability fix.

If the first customer asks for something you also believe in (transparent FIFO costing per movement, real-time stock on a wall display, accounting export to Mikro), great — that becomes a Phase 3 candidate. If they ask for something out-of-wedge (reservation system, complex variants, manufacturing), note it but don't build it yet.

### Phase 2 acceptance gates

- [ ] One paying customer for at least 30 consecutive days.
- [ ] Zero data-loss incidents.
- [ ] Mean time-to-acknowledge a customer ticket under 4 hours.
- [ ] You'd be embarrassed to turn the service off without warning.

---

## Phase 3 — The Wedge (Weeks 15–22)

**Goal:** Make StockOps obviously better at three things Cin7 is weakest at, so a prospect can compare and pick us in 60 seconds.

**The three wedges:**

### 3.1 Real-time stock visibility

Cin7 users complain about page-refresh stock. We have materialised views and the WebSocket scaffolding. Wire it:

- WebSocket server (in `apps/api` or via Vercel Edge — pick one) that broadcasts `stock.changed` events per organisation.
- Client subscription in the inventory page so the table updates live as orders are confirmed and POs are received.
- A "wall display" mode (`/inventory/wall`) optimised for a TV in the warehouse: high contrast, large text, auto-scrolling critical-stock list.
- Refresh strategy: optimistic UI updates on the actor's tab, broadcast on commit, rollback on error.

When a prospect sees their stock numbers tick down in real-time on the screen behind them as orders come in from Shopify, they don't care that we don't have BOM yet.

### 3.2 Transparent costing

Cin7's costing is a black box. Ours doesn't have to be.

- For every product, a "Cost trail" tab showing every InventoryLayer (received batch with unit cost, date, supplier, remaining qty).
- For every sale, the COGS calculation visible: which layers were depleted, weighted average, total COGS for the line.
- A monthly P&L view that ties revenue, COGS, and gross margin per product / per category, sourced from real movements rather than estimates.
- WAC vs FIFO toggle per product (default WAC for simplicity, FIFO for higher-margin items).

This is your strongest moat. Accountants love it because the audit trail is reproducible. Owners love it because they finally see why a product they think is profitable actually isn't.

### 3.3 Accounting handoff that just works

The Turkish accounting market runs on Logo, Mikro, Luca, and Paraşüt. Pick one — Paraşüt is the most modern and has an API — and integrate end-to-end:

- OAuth connect at `/settings/integrations/parasut`.
- One-click "Bu ayı Paraşüt'e gönder" that pushes invoices, payments, and stock movements.
- Reverse: pull in supplier invoices to reconcile against received POs.
- A reconciliation report: what's in StockOps but not yet in accounting, what's in accounting that doesn't match StockOps.

Once this works, an accountant can stop double-keying. That's the wedge that gets you from "interesting tool" to "we cancel Cin7 next month."

### 3.4 What stays out of Phase 3

- BOM / manufacturing — second persona's problem
- Mobile WMS — Phase 4 if customers ask
- AI forecasting — never until you have 6 months of real data per customer
- Plugin runtime / public extension API — never until 10+ paying customers ask

### Phase 3 acceptance gates

- [ ] First customer renews their subscription voluntarily.
- [ ] One competitive head-to-head vs Cin7 with a prospect, decided in our favour, with at least one of the three wedges cited as the deciding factor.
- [ ] A new prospect signs up because of the costing transparency demo.

---

## Phase 4 — Second Persona (Weeks 23–34)

**Goal:** Pick a second customer profile that unlocks an existing scaffolded module, and make that module real.

Don't pick the second persona until Phase 3 is in production with at least 3 paying customers from Phase 2's profile. Two customers is statistically meaningless; three is when you start seeing patterns.

**Likely candidates:**

### 4.1 Multi-warehouse food / FMCG distributor

Triggers:
- FEFO (first-expiry-first-out) costing in addition to FIFO/WAC.
- Lot/serial tracking — schema is there, UI isn't.
- Multi-warehouse transfers with in-transit visibility — partly there, audit and finish.
- Supplier price tier rules.

Skip this if: nobody asks. Don't pre-build.

### 4.2 Manufacturer with simple BOM

Triggers:
- BOM editor (already scaffolded — needs polish).
- Manufacturing order workflow: consume raw materials, produce finished good, COGS-aware.
- Production cost roll-up.

Skip this if: nobody asks. Same rule.

### 4.3 Mobile-heavy operation (warehouse picker, stocktake)

Triggers:
- The `/mobile/*` PWA that's already scaffolded.
- Camera barcode scanning that actually works (Permissions-Policy is already wired for `/mobile/*`).
- Offline mode + sync queue for spotty Wi-Fi warehouses.

Skip this if: nobody asks. Same rule.

Pick **one** based on customer signal, not gut. Make it as polished as the Phase 1 persona is. Each new persona gets 8–12 weeks; don't try to do two in parallel.

---

## Phase 5+ — Earned territory

Everything in the original `implementation_plan.md` lives here:

- BOM + manufacturing (only if 4.2 demand materialises)
- Public extension API (only if 10+ customers ask)
- AI forecasting (only after 6 months of real data per customer)
- Multi-currency + i18n (only after international customers)
- B2B portal (only if 20%+ of customers also serve B2B)

Don't sequence these in advance. They're optionality, not roadmap. Customer pull pulls them off the shelf.

---

## Risk register

Things that can sink this plan, with mitigations.

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Phase 0 takes longer than 2 weeks because more silent bugs surface | Medium | Medium | Time-box stabilisation to 3 weeks max. After that, ship and triage in production. |
| Can't find a real first customer | High | High | Cast wider — go after Trendyol/Hepsiburada sellers, post in `r/eticaret`, message 50 small Shopify shops. Persistence wins. |
| First customer demands feature outside the wedge | Medium | Medium | Negotiate. Either it's already in scope, or you defer. Don't build off-wedge under pressure. |
| Supabase free tier exhausted (storage, bandwidth, connection limits) | Medium | Medium | Move to Pro ($25/mo) before customer #1 lands. Budget. |
| Vercel costs spike with WebSocket / heavy traffic | Low | Medium | Move WebSocket to a small VPS (Hetzner €4/mo) if needed. Vercel doesn't have to do everything. |
| You burn out before customer #1 | High | Critical | Sustainable cadence. Two weeks of stabilisation, then sprints with rest weekends. The plan is months long; pace accordingly. |
| Cin7 ships a feature that closes one of your wedges | Low | Medium | They won't move fast. Their wedges are theirs to lose, not ours to win. Stay focused. |

---

## Decision log (append-only)

When you make a non-obvious decision, log it here with date and rationale. Future-you will thank past-you.

```
[2026-05-02] Replaced implementation_plan.md with v2.
  Reason: original plan optimised for feature parity with Cin7; reality is we
  don't yet trustably do anything end-to-end. Stabilise → one customer → wedge.

[2026-05-02] Chose RLS Option A (drop FORCE) over Option B (Prisma middleware).
  Reason: app-layer filtering already enforces tenant isolation; Option B is
  significant effort that adds value only when a non-superuser DB role exists.
  Revisit if a multi-org self-serve flow ships.

[2026-05-10] Wrapped Credit Notes nav item behind NEXT_PUBLIC_FEATURE_CREDIT_NOTES.
  Reason: plan classifies it as "Stub — Coming in v1.1". Hiding it prevents users
  from accessing an unverified surface. The page code stays in the repo unchanged.

[2026-05-10] Added SESSION_SECRET to CI e2e job environment.
  Reason: demo-mode session cookies are HMAC-signed using SESSION_SECRET. Without
  it, loginAsDemoUser() in Playwright would produce unsigned cookies that the
  middleware rejects, causing every protected-page test to redirect to /sign-in.
  The CI value is a fixed string, not a real secret — it only signs test sessions.

[2026-05-10] Added NEXT_PUBLIC_FEATURE_* documentation to .env.example.
  Reason: without explicit defaults, a fresh deployment could accidentally show
  experimental surfaces if a previous developer had the env var set locally.
  All feature flags now default to empty (hidden).

[2026-05-10] Phase 0 Vercel 7-day uptime gate waived.
  Reason: user confirmed the app is being migrated away from Vercel. The gate
  cannot be measured on a platform being decommissioned. All other Phase 0 gates
  are green.
```

---

## Glossary of cuts

Things from the original plan that are deliberately not in v2, with date to revisit:

- BOM + Manufacturing → only after a real manufacturer asks
- Public extension API → only after 10+ paying customers
- AI demand forecasting → only after 6 months of real per-customer data
- Mobile WMS / PWA → only after a warehouse-heavy customer asks
- Multi-currency → only after first international customer
- B2B portal → only if 20%+ customers ask
- 2FA / SAML / SSO → only if an enterprise prospect asks
- Real-time WebSocket on dashboard widgets → in scope as Phase 3 wedge
- Materialised stock view → already built, keep
- Costing (WAC + FIFO) → already in schema, surface in Phase 3 wedge
- Account portability export → already built, keep
- Audit logging → already built, polish in Phase 0
- Webhook inbox + sync logs → already built, surface in Phase 1.3

---

## How to read this plan day-to-day

When you sit down to code, the question to ask isn't "what feature do I build?" It's:

1. Am I in the current phase's gate?
2. Does what I'm about to do unblock the gate?
3. If not, write it down and don't build it.

The plan is short and concrete on purpose. Resist the temptation to expand it back into 974 lines of phases. Phases 4 and 5 are deliberately vague — they'll be defined by customer reality, not by what we imagine today.

---

*Last revised 2026-05-02. Revise when a phase ships or a customer teaches you something the plan didn't predict.*
