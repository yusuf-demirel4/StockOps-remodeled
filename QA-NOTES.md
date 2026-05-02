# StockOps QA Notes

**Date:** 2026-05-02
**URL:** https://stockops-theta.vercel.app
**Mode:** database (Supabase Postgres via Transaction pooler at port 6543)
**Tester:** Claude (browser-driven, logged in as eren@example.com / Owner)

---

## Severity scale

- **P0** — blocks core workflow, data loss, or security hole
- **P1** — feature partially broken, but workaround exists
- **P2** — UX issue, polish, edge case
- **P3** — nice-to-have / future improvement

---

## P0 — Blockers

### BUG-1 — Every mutation silently fails in Postgres mode (FORCE RLS)
**Where:** All `INSERT`/`UPDATE` paths after Phase 7 hardening migration.
**Symptom:** Form submits, no error shown, but row never lands in DB. Reproduced creating a product `QA-PROD-001` — list still shows only the 3 seeded rows after page reload.
**Root cause:** `20260501070000_phase_7_security_hardening` ran `ALTER TABLE … FORCE ROW LEVEL SECURITY` plus `FOR ALL USING/WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true))`. The Prisma client (`packages/db/src/client.ts`) never executes `SET app.current_organization_id`. With FORCE on, even the pooler superuser must satisfy the policy, so `WITH CHECK` evaluates to NULL → DENY → row silently dropped.
**Fix:** Created migration `20260502210000_disable_force_rls` that issues `NO FORCE ROW LEVEL SECURITY` on every tenant table. App enforces tenant isolation at the query level via `where: { organizationId }` in every repository function, so dropping FORCE doesn't open a leak in practice. **User must apply with `npx prisma migrate deploy`.**
**Status:** Migration written, awaiting apply.

### BUG-2 — Server-side error swallowed instead of surfaced to user
**Symptom:** When mutation fails (e.g., RLS denial), the form shows no error banner. User has no feedback; thinks save worked.
**Where:** `apps/web/src/lib/actions.ts → runMutation` catches `error` and returns `failure(error)` — but ZodError messages and Prisma error messages are mapped to generic Turkish strings. The actual underlying DB error never reaches the UI.
**Fix:** When `error.code === 'P2025'` or `'P2002'` etc., surface a precise message; for unknown errors include error.code in the toast (sanitized). Consider logging full error server-side for debugging.
**Status:** Recommendation only.

---

## ✅ Verified working

- **Auth:**
  - Sign-in with valid creds → dashboard renders.
  - Sign-out clears the session, returns to /sign-in.
  - Invalid creds → generic "E-posta veya şifre hatalı." (no info leak about which field is wrong).
  - Already-signed-in users redirected away from /sign-in.
  - Cross-instance sessions hold via HMAC + SESSION_SECRET.
- **Listing pages render with seeded data:** Dashboard, Products, Inventory, Suppliers, Customers, Orders, Invoices, Credit Notes, Manufacturing, Analytics, Forecasting, Reports, Developers, Users, Settings.
- **Security headers:** CSP, HSTS, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy, no x-powered-by — all set.
- **Health endpoint:** `/api/health` returns `{status:"ok",mode:"database",…}`.
- **Connection pool stability:** After switching to Transaction pooler (port 6543), no more EMAXCONNESSION across rapid navigation.

---

## Pending QA (blocked on BUG-1 fix)

- Products: create / edit / deactivate / variants
- Inventory: stock movement / transfer / stocktake / insufficient-stock validation
- Customers: full CRUD
- Suppliers: edit / delete
- Sales orders: create → confirm → pick → pack → ship → deliver
- Purchase orders: create → receive
- Invoices: create → issue → payment → PDF render
- Credit notes
- Manufacturing: BOM creation → MO start → consume → complete
- Reports: run a report, CSV export
- Forecasting: run a forecast, smart PO suggestion
- Settings: warehouse CRUD, currency/locale, exchange rate refresh
- Users: invite, role change, delete
- Developers: webhook subscription, account portability export

---

## P2 / P3 — observed during preliminary walkthrough

- **Analytics → "Kategoriye göre stok" chart renders empty** even though products have categories. Likely a missing data point in the chart config.
- **Inventory page exposes a `Kamera`/scanner UI on desktop** — non-mobile pages also show the camera button. Permissions-Policy denies camera here, so clicking it is a dead-end. Hide on non-mobile breakpoints, or route mobile workflows to /mobile/*.
- **Default form values** (e.g., `Vade (gün)` = 30 in customer create) are good defaults, but the field shows pre-filled before user types — could confuse if they expect blank. Minor.
- **`Kamera`/`Durdur` controls in product create form** display in the camera area `>>1.00<<`. Looks like a debug placeholder — should be hidden until camera is started.
