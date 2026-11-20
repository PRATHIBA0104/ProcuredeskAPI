# ProcureDesk: B2B Contract Negotiation and Procurement Advisory

A multi-tenant web app for a procurement advisory team to keep an organization's **vendors**, **contracts** and **renewal deadlines** in one place. This repository holds the **first 45% of the full product**: the foundation, authentication, vendor management, contract management (with document upload) and a live dashboard. The remaining 55% is documented in [docs/FUTURE_SCOPE.md](docs/FUTURE_SCOPE.md).

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, Tailwind CSS 4 (TypeScript) |
| Backend | Node.js, Express 5 (separate REST API) |
| Database | MongoDB with Mongoose |
| Auth | JWT (HS256, 8 h), bcrypt (12 rounds), role-based access control |
| Tests | Jest, Supertest, Playwright (UI checks) |

## 1. Run it (step by step)

You need **Node.js 20 or newer** and **MongoDB 7** running locally (Windows: the MongoDB Community Server service; or Docker: `docker run -d --name procurement-mongo -p 27017:27017 mongo:7`).

### 1.1 Backend (terminal 1)

```powershell
cd backend
npm install
Copy-Item .env.example .env
```

Open `backend\.env` and set `JWT_SECRET` to a long random value (at least 32 characters). Generate one with:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Then load the demo data and start the API:

```powershell
npm run seed      # optional but recommended: creates a demo organization
npm run dev       # API on http://localhost:5000
```

Check it: open http://localhost:5000/api/v1/health. You should see `{"success":true,"status":"ok"}`.

### 1.2 Frontend (terminal 2)

```powershell
cd frontend
npm install
Copy-Item .env.local.example .env.local
npm run dev       # app on http://localhost:3000
```

### 1.3 Sign in

Open http://localhost:3000.

* **With demo data:** `admin@demo.procuredesk.in` / `Demo@12345`. Also `manager@`, `analyst@` and `viewer@` at the same domain, same password, to see how each role is restricted.
* **From scratch:** click **Create an organization account**. You become the admin of a new, empty organization.

### 1.4 Run the tests

```powershell
cd backend
npm test          # all tests (needs MongoDB running); runs one after another on purpose
npm run test:unit # only the tests that need no database
```

Run `npm test` on its own, not together with another `jest` command: the suites share one test database.

## 2. What the app does (feature tour)

The home page (`/`) is a public customer onboarding landing page: what the product does, the path from sign-up to a first renewal alert, what you need to have ready, who can do what, and an FAQ. After registering, an empty dashboard shows a "Get started" checklist whose ticks come from your real data (vendors and contracts), and which disappears once all steps are done or for read-only users.

Follow this order the first time; each step shows one feature.

1. **Create an account.** Register with an organization name, your name, email and a password (8+ characters, a letter and a number). Errors appear next to each field.
2. **Dashboard.** Four live figures (active vendors, contracts in force, annual commitment in rupees, contracts expiring within 90 days), an *Upcoming renewals* table showing each contract's **notice deadline** (amber within 30 days, red once passed), contracts by status, annual spend by vendor category, and recent activity. A new organization shows zeros and helpful empty states.
3. **Add a vendor.** *Vendors → Add vendor*: name (unique within your organization), category, status, website and up to 10 contacts with one primary.
4. **Browse vendors.** Search by vendor or contact, filter by category and status, sort, page through results. Each row shows the vendor's active contracts and annual value.
5. **Vendor page.** Contacts, notes and every contract with that vendor (with the status that is true today). **Edit** changes details. **Deactivate** is blocked while the vendor has contracts in force, with a clear message; **Reactivate** brings it back. (Vendors are never deleted, to keep history.)
6. **Add a contract.** *Contracts → Add contract*: vendor, title, optional unique number, start and end dates, optional renewal date, notice period, auto-renew, total and annual value (annual is calculated if you leave it empty), pricing model and payment terms. Date rules are checked (end after start, renewal inside the term).
7. **Contract page.** Terms, commercials and a banner for the **notice deadline** (the last day to give notice or renegotiate). **Activate** a draft; **Terminate** (final, no more edits).
8. **Documents.** Upload the signed PDF, DOC or DOCX (10 MB limit, real file content is checked, not just the extension), download it back under its original name, remove it.
9. **Contracts list.** Search by title, number or vendor; filter *Active*, *Expiring in 90 days*, *Draft*, *Expired*, *Terminated*; sort by end date or value. Status is computed from the dates, so a contract becomes *Expiring* and then *Expired* by itself.
10. **Roles.** A *viewer* can read everything but sees no Add, Edit, Upload, Deactivate or Terminate controls, and the API refuses those calls even if sent by hand. Analysts can add and edit; only admins and managers can deactivate vendors, activate or terminate contracts and delete documents.
11. **Profile.** Change your name and your password.
12. **Privacy between organizations.** Everything is scoped to your organization. Another organization's vendor or contract looks "not found", never "forbidden".

## 3. Project layout

```
backend/   Express API: routes -> validation (zod) -> controllers -> services -> models
frontend/  Next.js app: app/ (pages), components/, context/, lib/ (API client, formatting)
docs/      SCOPE.md (effort ledger), API.md, DATABASE.md, TESTING.md, CONTRIBUTION.md, FUTURE_SCOPE.md
```

## 4. Security measures

* Passwords hashed with bcrypt (12 rounds); never returned by the API.
* JWT signed with a secret that must be 32+ characters (the server refuses to start otherwise). Every request re-loads the user, so deactivating a user or changing a role takes effect immediately.
* Role checks run **before** input validation, so a forbidden request never reveals validation details.
* `organizationId` always comes from the verified token, never from the request body; every query includes it.
* Input validated with zod on every write; unknown fields are dropped; MongoDB operators in input are rejected.
* Uploads: PDF/DOC/DOCX only, 10 MB, extension **and** magic-byte check, random stored file name outside any public folder, served only through an authenticated endpoint as a download.
* helmet security headers, CORS allowlist, rate limiting, JSON body limit, generic error messages for server faults.
* `.env`, uploaded documents and `node_modules` are git-ignored.

## 5. Known limitations (honest list)

* The sign-in token is kept in `localStorage` so a refresh keeps you signed in. A script injected into the page could read it. The app renders no raw HTML and the API sets strict headers, but a production system would move to an httpOnly cookie with CSRF protection.
* No password reset by email and no admin screen to invite users yet (users beyond the first admin can only be created in the database or by the seed). Planned as M1.6.
* The dashboard totals are computed in application memory from the organization's records. Fine up to several thousand contracts; beyond that it should become a MongoDB aggregation or cached figures.
* The vendor picker on the contract form loads the first 100 active vendors.
* On a contract edit, optional fields cannot be cleared back to empty (renewal date, annual value); this needs an explicit "clear" in the API.
* Uploaded files live on the server's disk. Production should use object storage and virus scanning.
* `npm audit` reports moderate advisories in development tooling; do not run `npm audit fix --force` (it can break the Next.js setup).
* Currency is INR only; dates are shown in UTC calendar days.

## 6. More documentation

[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) (deploy to Vercel + Render + Atlas) · [docs/postman](docs/postman) (Postman collection: import it, run Login first) · [docs/SCOPE.md](docs/SCOPE.md) (scope, effort ledger, assumptions) · [docs/API.md](docs/API.md) · [docs/DATABASE.md](docs/DATABASE.md) · [docs/TESTING.md](docs/TESTING.md) · [docs/CONTRIBUTION.md](docs/CONTRIBUTION.md) · [docs/FUTURE_SCOPE.md](docs/FUTURE_SCOPE.md)
