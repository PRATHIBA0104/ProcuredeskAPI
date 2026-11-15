# Testing

## What was run, and where

| Check | Result | Run by / where |
|---|---|---|
| Backend integration tests: auth (13), vendors (33), contracts (39) against real MongoDB 7.0 | All passed | Developer's machine (`npm test`) |
| Backend integration tests: dashboard (5) against real MongoDB | Written; **to be run by the developer** (`npm test`) | pending |
| Backend database-free tests (validation, auth failures, route order, upload rules, contract date logic, dashboard numbers): 122 | All passed | Development sandbox (`npm run test:unit`) |
| Frontend `next build`, ESLint, TypeScript | Clean | Development sandbox |
| Browser tests of every screen (Playwright, 15 for sign-in/profile/shell + 43 for dashboard, vendors, contracts, documents, roles) | 58 of 58 passed | Development sandbox, against a **mock API** that copies the real response shapes |
| `npm run seed` | Written and syntax-checked; **to be run by the developer** | pending |

Honest note: the sandbox has no MongoDB, so database-backed tests and the seed script were not run there. The browser tests ran against a stand-in API, so the final proof that the real frontend and real backend agree is the manual checklist below.

## Database-free unit tests (122)

* HTTP basics, security headers, 404, malformed JSON.
* Vendor validation, including "no defaults in PATCH schemas".
* Contract date logic: effective status, notice deadline, annual value derivation, status filters, transitions.
* Route order: a viewer gets 403 before validation; upload type checks (PDF/DOC/DOCX by real file content).
* Dashboard numbers: in force vs draft/terminated/expired, 90-day expiry, notice alerts, spend by category, cap of 8 renewals, floating-point sums, activity shows only safe fields.

## Integration tests (need MongoDB)

Tenant isolation (read, edit, deactivate, list, search, create with a foreign id), RBAC per role, validation errors, duplicate names/numbers, deactivate guard, contract lifecycle, document upload/download/delete including wrong types and oversize, and the dashboard (empty organization, real numbers, isolation, viewer access).

## Manual acceptance checklist (about 10 minutes, with `npm run seed` data)

1. Sign in as `admin@demo.procuredesk.in`. Dashboard shows 6 active vendors, 6 contracts in force, 3 contracts expiring, a renewals table with amber/red notice deadlines.
2. Vendors: search `sales`; filter category *Software*; sort; open *Salesforce*; see two contracts.
3. Try **Deactivate** on *Salesforce*: refused with a message. Deactivate *Infosys Consulting* (no contracts): works; **Reactivate** it.
4. Add a vendor with a bad website: field error. Add with a name that already exists: "already exists".
5. Add a contract with end date before start: field error. Create a valid draft; **Activate**; upload a PDF; download it; remove it; **Terminate**; confirm **Edit** disappears.
6. Contracts list: filter *Expiring in 90 days*; search by a vendor name.
7. Sign out; sign in as `viewer@demo.procuredesk.in`: no Add/Edit/Deactivate/Upload buttons; open `/vendors/new`: told the role is read-only.
8. Register a second organization; confirm it sees none of the first organization's data.
9. Narrow the window to a phone width: menu opens as a drawer, tables scroll inside their card.
