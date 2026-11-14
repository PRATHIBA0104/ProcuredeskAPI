# B2B Contract Negotiation & Procurement Advisory: Scope and Effort Ledger

## 1. Objective in business terms

Mid-size companies sign dozens of software and vendor contracts and routinely overpay, auto-renew by accident, or lose track of terms. This platform acts as the working tool of an outsourced procurement team: it holds the client's vendors and contracts in one place, tracks renewals, records negotiations, and measures savings.

## 2. Assumptions (non-blocking, documented)

| # | Assumption |
|---|---|
| A1 | Multi-tenant: every record belongs to an **Organization** (the client). Users only see their own organization's data. |
| A2 | Registering creates a new Organization and its first `admin` user. Additional users are added by an admin (admin user management belongs to the remaining 55%). |
| A3 | Currency is INR (₹), formatted with the Indian digit grouping (10,00,000). Stored as plain numbers (rupees). |
| A4 | Contract documents are stored on local disk in development (`backend/uploads`), PDF/DOC/DOCX only, 10 MB limit. Cloud storage is future scope. |
| A5 | JWT is sent in an `Authorization: Bearer` header. Token lifetime 8h. No refresh tokens in v1. |
| A6 | Dates are stored in UTC; "days to expiry" is computed on read, not stored. |

## 3. Roles

| Role | Can do |
|---|---|
| `admin` | Everything inside their organization |
| `manager` | Create/edit/deactivate vendors and contracts |
| `analyst` | Create and edit vendors and contracts, cannot deactivate or delete |
| `viewer` | Read-only |

## 4. Effort model

Total project = **100 effort points (EP)**. One EP is roughly the same amount of work (model + API + UI + validation + testing). Points were assigned per feature by estimating: data model complexity, number of endpoints, UI complexity, business rules, and test surface. They are estimates, **not** measurements, and the ledger is how we track what is actually completed and verified.

### 4.1 Full feature inventory (100 EP)

| ID | Module / Feature | EP | In my 45%? |
|---|---|---|---|
| **F** | **Foundation** | **8** | |
| F1 | Monorepo, API conventions, validation, central error handling | 2 | Yes |
| F2 | Organization tenancy scoping on every query | 2 | Yes |
| F3 | App shell UI: sidebar, top bar, reusable table/form/modal/toast components | 3 | Yes |
| F4 | Activity log + development seed data | 1 | Yes |
| **M1** | **Authentication & Users** | **10** | |
| M1.1 | Register (creates organization + admin), bcrypt hashing | 2 | Yes |
| M1.2 | Login / logout with JWT | 2 | Yes |
| M1.3 | Role-based access control | 2 | Yes |
| M1.4 | Protected routes (frontend + API) | 1 | Yes |
| M1.5 | Profile view/edit, change password | 1 | Yes |
| M1.6 | Admin user management (add, change role, deactivate users) | 2 | No |
| **M2** | **Dashboard** | **8** | |
| M2.1 | KPI cards: total vendors, active contracts, annual contract value | 3 | Yes |
| M2.2 | Upcoming renewals widget | 1 | Yes |
| M2.3 | Recent activity feed | 1 | Yes |
| M2.4 | Savings KPIs (potential / proposed / realised) | 2 | No |
| M2.5 | Negotiations in progress | 1 | No |
| **M3** | **Vendor Management** | **10** | |
| M3.1 | Vendor CRUD | 4 | Yes |
| M3.2 | Category, status, contact details | 2 | Yes |
| M3.3 | Search, filter, sort, pagination | 2 | Yes |
| M3.4 | Deactivate (not delete) with guard when active contracts exist | 1 | Yes |
| M3.5 | Vendor detail page listing its contracts | 1 | Yes |
| **M4** | **Contract Management** | **14** | |
| M4.1 | Contract CRUD linked to a vendor | 4 | Yes |
| M4.2 | Document upload / download with type and size restrictions | 3 | Yes |
| M4.3 | Dates, value, payment terms, pricing model, auto-renew, notice period | 2 | Yes |
| M4.4 | Status lifecycle (draft, active, expiring, expired, terminated) with computed expiry tracking | 2 | Yes |
| M4.5 | Search, filter, sort, pagination | 2 | Yes |
| M4.6 | Renewal tracking: renewal date and notice-deadline calculation | 1 | Yes |
| **M5** | **Procurement Management** | **12** | |
| M5.1 | Procurement request CRUD | 3 | No |
| M5.2 | Request status workflow with approval | 3 | No |
| M5.3 | Vendor quotation entry | 2 | No |
| M5.4 | Quotation comparison | 2 | No |
| M5.5 | Purchase and cost records | 2 | No |
| **M6** | **Negotiation Management** | **14** | |
| M6.1 | Negotiation CRUD linked to vendor and contract | 3 | No |
| M6.2 | Offer / counteroffer history | 4 | No |
| M6.3 | Negotiation status workflow | 2 | No |
| M6.4 | Final value and savings calculation (potential / proposed / realised) | 3 | No |
| M6.5 | Outcome approval | 2 | No |
| **M7** | **Spend Analysis** | **7** | |
| M7.1 | Vendor-wise and contract-wise spend | 2 | No |
| M7.2 | Monthly and annual expenditure | 2 | No |
| M7.3 | Charts | 2 | No |
| M7.4 | Period comparisons | 1 | No |
| **M8** | **Cost Optimization** | **7** | |
| M8.1 | Savings opportunity rules | 3 | No |
| M8.2 | Procurement recommendations | 2 | No |
| M8.3 | Original vs proposed comparison | 1 | No |
| M8.4 | Realised savings tracking | 1 | No |
| **M9** | **Reports & Analytics** | **6** | |
| M9.1 | Vendor, contract, renewal, negotiation, spend, savings reports | 4 | No |
| M9.2 | CSV export | 2 | No |
| **M10** | **Notifications** | **4** | |
| M10.1 | Renewal and expiry alerts | 2 | No |
| M10.2 | Negotiation and approval notifications | 2 | No |
| | **Total** | **100** | |

### 4.2 Selected individual scope

| Block | EP |
|---|---|
| Foundation (F1 to F4) | 8 |
| M1 Authentication, excluding M1.6 | 8 |
| M2 Dashboard, M2.1 to M2.3 | 5 |
| M3 Vendor Management, all | 10 |
| M4 Contract Management, all | 14 |
| **Total** | **45** |

**Why this slice is coherent:** it is a complete vertical product on its own. A client can sign up, add vendors, record contracts with documents, and see renewal risk on a dashboard. It is the data foundation that Procurement, Negotiation, Spend and Optimization all depend on, so the other 55% can be built on top without rework.

**Honest caveat:** Negotiation is the heart of the project title, and in this split it sits in the remaining 55%. The Contract model is designed with the fields negotiations need (`totalValue`, `annualValue`, `pricingModel`, `noticePeriodDays`), so it plugs in cleanly. If your assignment wants Negotiation in your 45%, the swap would be: drop M4.2 document upload (3) + M2 dashboard (5) + M3.5 (1) and add M6.1, M6.2, M6.3 (9). Tell me and I will rebalance the ledger. I'll proceed with the slice above in the meantime.

### 4.3 First working release (milestones)

1. **M-A** Auth + tenancy + app shell: register, login, protected dashboard shell.
2. **M-B** Vendors end to end.
3. **M-C** Contracts end to end, including upload.
4. **M-D** Dashboard from real data, seed data, final testing, documentation.

## 5. Dependencies

```
Foundation -> Auth -> Vendors -> Contracts -> Dashboard
                         \--------^ (contracts reference vendors)
```

## 6. Main workflows

1. Sign up, creating an organization and its admin user, then log in.
2. Add a vendor, assign a category, add contacts.
3. Add a contract to a vendor with dates, value, payment terms, renewal settings, then upload the signed document.
4. Dashboard shows contracts nearing renewal and their notice deadlines.
5. Deactivate a vendor (blocked while it still has active contracts).

## 7. Architecture

```
Browser (Next.js, React, Tailwind)
   |  fetch + Bearer JWT
   v
Express REST API  /api/v1/*
   |  routes -> validators -> controllers -> services -> Mongoose models
   v
MongoDB  (every document carries organizationId)
```

Request pipeline: `helmet` -> `cors` -> rate limiter -> JSON parser -> route -> `authenticate` (JWT) -> `authorize(roles)` -> validator (zod) -> controller -> service -> model. Errors are thrown as `AppError` and handled by one central error middleware that returns `{ success:false, message, errors? }` and never leaks stack traces in production.

### Collections (this scope)

| Collection | Key fields |
|---|---|
| `organizations` | name, createdAt |
| `users` | organizationId, name, email (unique), passwordHash, role, isActive |
| `vendors` | organizationId, name, category, status (active/inactive/prospect), website, contacts[], notes |
| `contracts` | organizationId, vendorId, title, contractNumber, status, startDate, endDate, renewalDate, noticePeriodDays, autoRenew, totalValue, annualValue, currency, pricingModel, paymentTerms, documents[] |
| `activitylogs` | organizationId, userId, action, entityType, entityId, summary |

### API endpoints (this scope), all under `/api/v1`

| Method | Path | Access |
|---|---|---|
| POST | `/auth/register`, `/auth/login` | public |
| GET | `/auth/me` | any authenticated |
| PATCH | `/auth/me`, `/auth/change-password` | any authenticated |
| GET/POST | `/vendors` | read: all, write: admin, manager, analyst |
| GET/PATCH | `/vendors/:id` | read: all, write: admin, manager, analyst |
| POST | `/vendors/:id/deactivate` | admin, manager |
| GET/POST | `/contracts` | read: all, write: admin, manager, analyst |
| GET/PATCH | `/contracts/:id` | read: all, write: admin, manager, analyst |
| POST/GET | `/contracts/:id/documents`, `/contracts/:id/documents/:docId` | upload: write roles, download: all |
| GET | `/dashboard/summary` | all |

### Frontend routes

`/login`, `/register`, `/dashboard`, `/vendors`, `/vendors/new`, `/vendors/[id]`, `/contracts`, `/contracts/new`, `/contracts/[id]`, `/profile`

## 8. Progress ledger (updated as work is verified)

| Feature | Status | Verified |
|---|---|---|
| Scope and effort ledger | Complete | n/a |
| F1 Monorepo, API conventions, validation, error handling | Complete | Yes: 17 database-free tests pass (validation, 401 paths incl. `alg:none`/expired/wrong-secret tokens, 403 role check, 404, malformed JSON, security headers, NoSQL-operator rejection); server fails fast without secret or database |
| F2 Organization tenancy | Complete | Yes: isolation tests (read, edit, deactivate, list, search, create-with-foreign-id) pass on a real MongoDB 7.0 |
| M1.1 to M1.5 Auth (register, login, JWT, RBAC, profile, change password) | Complete | Yes: 13 integration tests pass against a real MongoDB 7.0 (run by the developer), plus 17 database-free tests |
| F3 App shell | Not started | No |
| M3 Vendors backend (CRUD, categories, contacts, search/filter/sort/pagination, deactivate guard, detail with contracts) | Complete | Yes: all 33 integration tests pass on the developer's MongoDB 7.0, plus 32 database-free tests |
| M3 Vendors UI | Not started | No |
| M4 Contracts backend (CRUD, document upload/download, dates and values, status lifecycle, computed expiry and notice deadline) | Implemented, awaiting DB verification | Partly: 74 database-free tests pass (status logic, file checks, request rules, model rules, upload/download/delete with real disk writes); 39 integration tests in `contracts.test.js` still need running |
| M4 Contracts UI | Not started | No |
| M2.1 to M2.3 Dashboard | Not started | No |
| F4 Seed + activity log | Model and logger written; seed not started | No |

| Effort ledger | Planned EP | Completed and verified EP |
|---|---|---|
| Whole project | 100 | 17 |
| My individual scope | 45 | 17 (F1 = 2, F2 = 2, Auth M1.1 to M1.5 = 8, Vendors backend = 5) |

**Crediting rule:** each feature's points cover model, API, UI and tests. Where a feature has both a backend and a UI, the backend is credited at half its points once its tests pass, and the other half when the UI is built and checked. Vendors (10 points) is therefore credited 5 now.

## 9. Remaining 55% (future development scope)

M1.6 Admin user management, M2.4 and M2.5 savings and negotiation KPIs, M5 Procurement (12), M6 Negotiation (14), M7 Spend Analysis (7), M8 Cost Optimization (7), M9 Reports (6), M10 Notifications (4). Total 55 EP.
