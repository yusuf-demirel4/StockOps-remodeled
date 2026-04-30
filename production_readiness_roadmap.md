# StockOps Production Readiness Roadmap

This is the current professional roadmap for making StockOps production-ready and stronger than Cin7 for the first target market: SMB ecommerce/wholesale.

The older `implementation_plan.md` remains as historical planning context. This document is the active roadmap for production readiness, quality gates, and competitive execution.

## Current Position

| Area | Decision |
| --- | --- |
| Current status | Phase 6.4-alpha / Phase 6 hardening |
| Target market | SMB ecommerce/wholesale |
| Deployment model | Self-hosted + cloud SaaS |
| Priority | Production readiness before broad new Cin7 feature expansion |
| v1 non-goals | POS and enterprise EDI/3PL are not v1 blockers |

## Phase Overview

| Phase | Name | Primary Outcome |
| --- | --- | --- |
| 6R | Quality Gate Recovery | Restore all verification gates before more expansion |
| 7 | Production Security & Tenant Isolation | Make tenant and security boundaries production-safe |
| 8 | Inventory Correctness & Performance | Make stock data correct, fast, and scalable |
| 9 | WMS Depth | Bring warehouse workflows closer to Cin7-grade operations |
| 10 | Commercial Workflow Completion | Complete order-to-cash and purchase-to-receive workflows |
| 11 | Integration Reliability | Make ecommerce and accounting sync reliable enough for production |
| 12 | Production Deployment & Operations | Make StockOps deployable, observable, recoverable, and supportable |
| 13 | Cin7 Differentiators | Polish the advantages that make StockOps better for the target market |

## Phase 6R: Quality Gate Recovery

### Goal

Recover the project to a fully verifiable baseline before adding more feature depth.

### Why It Matters vs Cin7

Cin7 wins on operational maturity. StockOps cannot credibly compete until the build, migration, and browser regression gates are repeatable.

### Key Work

- Fix the Playwright E2E startup timeout.
- Fix the Prisma shadow database migration check path.
- Fix customer, invoice, order, status, and mobile regression paths found during verification.
- Make local and CI verification use the same required commands.
- Document required local services for database and E2E checks.

### Exit Gate

Lint, typecheck, tests, build, Prisma validate, migration check, and E2E all pass.

### Verification

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run prisma:validate`
- `npm run prisma:migrate:check`
- `npm run test:e2e --workspace @stockops/web`

## Phase 7: Production Security & Tenant Isolation

### Goal

Make security, tenant isolation, and mutation safety production-ready.

### Why It Matters vs Cin7

Cin7 has mature security controls and SOC 2 Type 2 positioning. StockOps must close the practical risk gap with strong application and database controls before production use.

### Key Work

- Apply full tenant isolation across all tenant-owned tables and data access paths.
- Expand PostgreSQL RLS coverage beyond Phase 6 tables.
- Add rate limiting for public API, auth, webhook, and mutation endpoints.
- Add security headers and production-safe CORS defaults.
- Add strict environment validation at process startup.
- Add audit diff logging for important mutations.
- Add idempotency keys for critical write APIs.
- Add webhook replay protection and clearer webhook failure records.

### Exit Gate

Tenant isolation, authorization, security header, rate-limit, webhook signature, idempotency, and audit tests pass.

### Verification

- Cross-tenant read/write attempts are rejected.
- Unauthorized roles cannot mutate restricted resources.
- Duplicate idempotent requests do not create duplicate records.
- Invalid webhook signatures are rejected.
- Rate-limited endpoints return predictable 429 responses.

## Phase 8: Inventory Correctness & Performance

### Goal

Make stock levels correct, reconcilable, and fast at real customer scale.

### Why It Matters vs Cin7

Inventory correctness is the core product promise. Cin7's advantage is mature operational inventory behavior; StockOps must not rely on in-memory stock calculations for production.

### Key Work

- Add a transactional stock balance source as the primary read model.
- Keep the stock movement ledger as the source of truth for auditability.
- Add reconciliation jobs that compare ledger totals with stock balances.
- Add reservations for confirmed sales orders before shipment.
- Add cursor pagination to list endpoints.
- Add load-tested stock APIs for large catalogs and movement history.
- Add explicit handling for concurrent stock mutations.

### Exit Gate

10,000 products, 10 warehouses, and 100,000 stock movements load with stock list p95 under 300ms.

### Verification

- Concurrent sales and purchase receives cannot corrupt balances.
- Reconciliation detects and reports mismatches.
- Paginated product, stock, order, invoice, and movement lists remain stable.
- Stock ledger remains auditable after balance updates.

## Phase 9: WMS Depth

### Goal

Upgrade warehouse workflows from basic mobile support to serious WMS operations.

### Why It Matters vs Cin7

Cin7 has a mature WMS app with receiving, picking, packing, stocktake, barcode use, and warehouse workflows. StockOps needs comparable warehouse depth while keeping the PWA advantage.

### Key Work

- Add bin locations.
- Add lot/batch tracking.
- Add serial tracking.
- Add expiry tracking.
- Add FEFO picking for expiry-sensitive products.
- Add barcode label support.
- Add partial fulfillment for pick, pack, and ship.
- Add cycle count scheduling.
- Add variance review and approval.
- Harden mobile offline queues with conflict resolution and sync status visibility.

### Exit Gate

Receive, pick, pack, ship, stocktake, and offline sync E2E scenarios pass.

### Verification

- Receive with bins and lots.
- Pick FEFO inventory.
- Partially fulfill an order.
- Complete stocktake with variance approval.
- Queue offline mobile actions and sync them without duplicate mutations.

## Phase 10: Commercial Workflow Completion

### Goal

Complete the workflows required for SMB ecommerce/wholesale operations.

### Why It Matters vs Cin7

Cin7 is useful because it connects sales, purchasing, inventory, finance, and customer workflows. StockOps must complete those loops before it can be sold as a serious replacement.

### Key Work

- Finish customers and customer account details.
- Add customer price lists and tiered pricing.
- Add tax and discount logic.
- Add multi-line sales orders.
- Add multi-line invoices.
- Add payment recording and invoice status transitions.
- Add credit notes and returns.
- Add branded invoice PDFs.
- Add CSV and XLSX exports.
- Add B2B portal ordering for customer self-service.

### Exit Gate

Order-to-cash and purchase-to-receive workflows pass in web, API, and portal surfaces.

### Verification

- Create customer to invoice payment.
- Create purchase order to receive stock.
- Create B2B portal order.
- Issue invoice PDF.
- Record partial and full payment.
- Process return and credit note.
- Export products, stock, orders, invoices, and customers.

## Phase 11: Integration Reliability

### Goal

Make ecommerce and accounting integrations reliable enough for real customers.

### Why It Matters vs Cin7

Cin7's integration breadth is a major advantage, but integration complaints are also a common buyer pain. StockOps can compete by being more transparent, testable, and recoverable.

### Key Work

- Make Shopify two-way sync production-ready.
- Make WooCommerce two-way sync production-ready.
- Add retry, backoff, dead-letter queue, and replay support.
- Add sync logs and admin-visible sync health.
- Add reconciliation between StockOps and ecommerce platforms.
- Add practical QuickBooks invoice and payment sync.
- Add practical Xero invoice and payment sync.
- Add conflict detection for externally modified records.

### Exit Gate

Integration outage, retry, replay, and reconciliation tests pass.

### Verification

- Import Shopify order.
- Push StockOps stock update to Shopify.
- Import WooCommerce order.
- Retry failed sync after provider outage.
- Replay a dead-letter sync event.
- Detect ecommerce inventory mismatch.
- Sync invoice and payment to QuickBooks or Xero.

## Phase 12: Production Deployment & Operations

### Goal

Make StockOps deployable, observable, recoverable, and supportable in production.

### Why It Matters vs Cin7

Cin7's biggest real advantage is not only features; it is operational maturity. StockOps needs production operations, not just code.

### Key Work

- Add production Docker profiles.
- Add CI/CD with required quality gates.
- Add migration deploy workflow.
- Add backup and restore procedures.
- Add restore drills against a clean database.
- Add structured logging.
- Add error tracking.
- Add metrics for API latency, database latency, queue depth, sync failures, and worker health.
- Add uptime checks and a public status page.
- Add runbooks for deploy, rollback, restore, failed migration, queue backlog, and integration outage.
- Keep self-hosted and cloud SaaS paths supported from the same artifacts.

### Exit Gate

Clean deploy, rollback, restore, and smoke checks pass.

### Verification

- Deploy from clean checkout.
- Run migrations in deploy mode.
- Roll back application version.
- Restore from backup into a clean database.
- Confirm health checks and metrics.
- Confirm worker restart does not lose queued work.
- Run production smoke tests after deploy.

## Phase 13: Cin7 Differentiators

### Goal

Polish the advantages that make StockOps the better choice for SMB ecommerce/wholesale buyers.

### Why It Matters vs Cin7

StockOps should not win by copying every Cin7 feature. It should win with lower cost, faster onboarding, source control, open APIs, modern PWA workflows, and transparent operations.

### Key Work

- Polish included AI forecasting.
- Add forecast-to-purchase-order workflow.
- Polish the open extension API.
- Complete SDK documentation for Node and Python.
- Add a self-serve onboarding wizard.
- Add contextual in-app help for critical workflows.
- Add transparent data export and account portability.
- Add buyer-demo flow showing product, receive, sale, pick, invoice, payment, B2B order, and sync visibility.

### Exit Gate

A demoable buyer journey clearly shows lower cost, faster onboarding, open APIs, and modern PWA workflows.

### Verification

- Complete guided setup from empty account.
- Generate forecast and suggested purchase order.
- Register extension webhook and receive signed event.
- Use SDK sample against local API.
- Export account data.
- Demo end-to-end buyer journey in under 15 minutes.

## Required Test Plan

The following commands are required for phase completion unless the phase explicitly documents why one is not applicable:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run prisma:validate
npm run prisma:migrate:check
npm run test:e2e --workspace @stockops/web
```

Required scenario coverage:

- Login to invoice payment.
- Purchase receive.
- Pick, pack, and ship.
- Mobile offline sync.
- B2B portal order.
- Shopify/WooCommerce sync retry.
- Tenant isolation.
- Backup restore.

## Operating Principles

- Production readiness comes before broad feature expansion.
- The first competitive wedge is SMB ecommerce/wholesale.
- POS is deferred until the market focus changes.
- Enterprise EDI/3PL is deferred until after v1 production readiness.
- Each phase is complete only when feature work, documentation, tests, migrations, and operational checks pass.
- Existing public `/v1` API contracts should remain backward compatible whenever possible.
- New work should prefer transparent, auditable, recoverable behavior over hidden automation.
