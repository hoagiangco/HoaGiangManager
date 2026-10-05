# HoaGiangManager security and modernization plan

## Objective

Evolve the current application as a modular monolith without rewriting it. Protect data and administrative operations first, make maintenance workflows atomic second, then build monthly management on reliable source data.

## Delivery rules

- Ship small, reversible pull requests.
- Run database changes on staging and verify a restore before production.
- Keep UI permission checks for usability, but treat server authorization as the source of truth.
- Use expand/backfill/verify/cutover for schema migrations.
- Do not add AI-generated reporting until deterministic report snapshots are available.

## Phase 0 — Baseline and data safety

- [ ] Create a sanitized staging database.
- [ ] Restore the latest production backup into staging and record the restore time.
- [x] Add repeatable `typecheck` and unit-test commands.
- [ ] Add CI for install, typecheck, lint, tests, and production build.
- [ ] Add API characterization tests for login, permissions, and maintenance completion.

Exit criteria: a backup can be restored, CI is green, and critical flows have a reproducible smoke test.

## Phase 1 — Security and authorization

- [x] Introduce named backend permissions and a centralized permission guard.
- [x] Protect Staff, User, Department, Device Category, Event Type, Location, Media, administrative Maintenance, Work Plan, and Weekly Schedule APIs.
- [x] Stop trusting client-supplied `isAdmin`, `createdBy`, and `userId` values in Work Plan and Weekly Schedule mutations.
- [x] Remove the JWT fallback and reject weak/placeholder secrets.
- [x] Replace the shared staff password with a cryptographically random temporary password.
- [x] Require staff-created accounts to change their temporary password.
- [x] Count failed logins and temporarily lock accounts.
- [ ] Move bearer tokens from localStorage to Secure, HttpOnly, SameSite cookies with CSRF protection.
- [ ] Add persistent security audit events.
- [x] Replace implicit database TLS behavior with explicit SSL mode and CA configuration.
- [ ] Migrate remaining one-off legacy database scripts to the shared TLS policy before using them in production.
- [x] Disable public self-registration by default for internal deployments.

Deployment prerequisite: run `2026-09-08_add_must_change_password.sql` before deploying application code.

Known temporary exception: `PUT /api/device-reminder-plans/:id` still supports the legacy maintenance execution flow. It must be restricted to administrators immediately after Phase 2 replaces that flow with purpose-built batch endpoints.

## Phase 2 — Atomic maintenance workflow

- [ ] Add one server endpoint each for batch start, complete, cancel, and reschedule.
- [ ] Execute Event, next-due-date, MaintenanceRound, and report-link changes in one database transaction.
- [ ] Add row locking and an idempotency key.
- [ ] Test 100-device completion, forced rollback, and safe retry.
- [ ] Remove per-device mutation loops from the Maintenance page.
- [ ] Lock generic reminder-plan update to `maintenance.manage`.

Exit criteria: one batch action uses one HTTP request; partial completion and duplicate retries are impossible.

## Phase 3 — Data integrity

- [ ] Create MaintenanceBatch, MaintenanceRound, and MaintenanceRoundItem entities.
- [ ] Dual-write and backfill relationships currently stored in JSON Metadata.
- [ ] Validate orphan and mismatch counts before switching reads to foreign keys.
- [ ] Repair sequences once in a migration and remove runtime `MAX(ID)`/`setval` workarounds.
- [ ] Normalize statuses and add measured indexes based on `EXPLAIN ANALYZE`.

## Phase 4 — API and performance

- [ ] Add shared request schemas and consistent success/error envelopes.
- [ ] Add pagination and filters to Events and other unbounded lists.
- [ ] Replace dashboard list downloads with an aggregate summary endpoint.
- [ ] Set query, payload-size, and response-time budgets.

## Phase 5 — Frontend decomposition

- [ ] Split Maintenance into feature components, hooks, and testable domain functions.
- [ ] Split Damage Reports and its workflow integrations.
- [ ] Preserve behavior and Bootstrap styling during the refactor.
- [ ] Add end-to-end tests for login, damage reports, and maintenance.

## Phase 6 — Platform upgrade

- [ ] Upgrade Next.js 14 to 15 and stabilize.
- [ ] Audit/replace `next-pwa` and custom webpack behavior.
- [ ] Upgrade Next.js 15 to 16 and migrate `next lint` to ESLint CLI.
- [ ] Audit imports and remove unused migration-era dependencies.

## Phase 7 — Monthly management MVP

- [ ] Add MonthlyPeriod, ManagementNote, EmployeeReview, MonthlyReportSnapshot, and MonthlyPlanItem.
- [ ] Aggregate existing Damage Report, Event, Maintenance, and Work Plan data without duplicating entry.
- [ ] Let the manager review evidence and make the final ABC decision.
- [ ] Close the month transactionally and store an immutable snapshot.
- [ ] Generate the next-month draft from unfinished work, recurring work, and due maintenance.
- [ ] Export using the organization's approved templates.

## Verification commands

```powershell
npm run typecheck
npm test
npm run build
```

The SQL migration is intentionally not executed automatically. Apply it to staging first:

```powershell
node scripts/run-sql-migration.js 2026-09-08_add_must_change_password.sql
```
