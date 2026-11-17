# My 45%: contribution report

## Scope delivered

A complete vertical slice a client can use end to end: sign up, add vendors, record contracts with documents, and see renewal risk on a dashboard. It is also the data foundation the remaining 55% builds on.

| Block | EP | What it contains |
|---|---|---|
| Foundation F1 to F4 | 8 | Monorepo, API conventions, validation, error handling; tenancy on every query; app shell and reusable UI kit (table, forms, dialogs, toasts, pagination); activity log and seed data |
| Authentication M1.1 to M1.5 | 8 | Register (organization + admin), login, JWT, role-based access, protected routes, profile, change password |
| Dashboard M2.1 to M2.3 | 5 | KPI cards, upcoming renewals with notice deadlines, status breakdown, spend by category, recent activity |
| Vendor management M3 | 10 | CRUD, categories/status/contacts, search/filter/sort/pagination, deactivate guard, vendor detail with contracts |
| Contract management M4 | 14 | CRUD linked to vendor, dates/value rules, lifecycle (draft/active/terminated, computed expiring/expired), notice deadline, document upload/download/delete, search and status filters |
| **Total** | **45** | |

Effort points are weighted by model complexity, number of endpoints, UI complexity, business rules and test surface, not by pages or lines of code (see SCOPE.md section 4).

## Verification status of the 45 EP

All 45 EP are verified: the full backend suite (auth, vendors, contracts, dashboard) passes on a real MongoDB 7.0 and the seed script runs; the app shell, vendors UI, contracts UI and dashboard pass build, lint, type check and browser tests.

## Notable engineering decisions

* **Tenant isolation by construction:** `organizationId` is taken from the verified token, never from the request; foreign records are reported as "not found". Tested for every vendor and contract operation and for the dashboard.
* **Authorization before validation** so a forbidden request learns nothing about the data model.
* **Computed status** (expiring/expired) instead of stored flags that go stale.
* **Real bugs found and fixed by tests:** a sparse index that blocked a second contract without a number; date rollover (30 Feb accepted as 2 March); a PATCH schema default that would silently reset fields; an annual value that overwrote the user's own figure; a hydration mismatch in the app shell found by the browser tests.
* **Pure functions for business rules** (contract dates, dashboard numbers) so they are unit-tested without a database.

## What I did not do (and say so)

Admin user management, procurement requests, negotiation workflow, spend analysis, optimization, reports and notifications are not in this 45%. See FUTURE_SCOPE.md.
