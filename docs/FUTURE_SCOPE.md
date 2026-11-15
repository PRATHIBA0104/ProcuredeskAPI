# Remaining 55%: future development plan

The data model already carries the fields these modules need (`totalValue`, `annualValue`, `pricingModel`, `paymentTerms`, `noticePeriodDays`, `autoRenew`), so they plug in without rework.

| Module | EP | Outline | Builds on |
|---|---|---|---|
| M1.6 Admin user management | 2 | Invite/add users, change roles, deactivate users; password reset by email | users, RBAC |
| M2.4 / M2.5 Dashboard extensions | 3 | Savings KPIs (potential, proposed, realised); negotiations in progress | negotiations |
| M5 Procurement | 12 | Purchase requests, approval workflow, quotes comparison, purchase orders | vendors |
| M6 Negotiation | 14 | Negotiation cases per contract, targets and benchmarks, offers and counter-offers, clause library, outcome and savings tracking | contracts |
| M7 Spend analysis | 7 | Spend ingestion, categories, trends, maverick spend, vendor concentration | contracts, vendors |
| M8 Cost optimization | 7 | Overlap and unused-licence detection, consolidation suggestions, savings opportunities | spend |
| M9 Reports | 6 | Exportable renewal, spend and savings reports (PDF/CSV), scheduled reports | all |
| M10 Notifications | 4 | Email/in-app alerts before notice deadlines and expiries | contracts |
| **Total** | **55** | | |

Technical hardening for production: httpOnly cookie sessions with CSRF protection, object storage and virus scanning for documents, MongoDB aggregation or caching for dashboard totals, audit-log viewer, CI pipeline, and end-to-end tests against the real stack.
