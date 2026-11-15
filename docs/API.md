# API reference

Base URL `http://localhost:5000/api/v1`. JSON in, JSON out. Protected routes need `Authorization: Bearer <token>`.
Success bodies contain `"success": true`. Errors are `{ "success": false, "message": "...", "errors": [{ "field", "message" }] }` (`errors` only for validation failures).

Status codes: 400 validation, 401 not signed in / bad token, 403 role not allowed, 404 not found (also for another organization's record), 409 conflict (duplicate or rule violation), 429 rate limit, 500 server fault.

Roles: **admin**, **manager**, **analyst**, **viewer**. "Write" = admin, manager, analyst. "Manage" = admin, manager.

## Auth

| Method | Path | Access | Body / notes |
|---|---|---|---|
| POST | `/auth/register` | public | `organizationName, name, email, password` -> 201 `{ token, user, organization }`. Creates the organization and its admin. |
| POST | `/auth/login` | public | `email, password` -> `{ token, user, organization }` |
| GET | `/auth/me` | any | `{ user, organization }` |
| PATCH | `/auth/me` | any | `{ name }` |
| POST | `/auth/change-password` | any | `{ currentPassword, newPassword }` |

## Vendors

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/vendors` | any | Query: `page, limit (<=100), search, category, status, sort` (`name, -name, createdAt, -createdAt, category, status`). Returns `{ data, pagination }`; each vendor has `activeContracts` and `activeAnnualValue`. |
| POST | `/vendors` | write | `name` required; `category, status (active|prospect), website, contacts[<=10], notes`. 409 if the name exists in your organization. |
| GET | `/vendors/:id` | any | `{ vendor, contracts[] }` |
| PATCH | `/vendors/:id` | write | Any of the create fields. |
| POST | `/vendors/:id/deactivate` | manage | 409 while the vendor has contracts in force. |
| POST | `/vendors/:id/activate` | manage | Only for inactive vendors. |

## Contracts

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/contracts` | any | Query: `page, limit, search (title, number, vendor name), status (draft|active|expiring|expired|terminated), vendorId, pricingModel, endingWithin (days), sort`. Each item has computed `effectiveStatus, daysToExpiry, noticeDeadline, daysToNoticeDeadline, nextRenewalDate`. |
| POST | `/contracts` | write | `vendorId, title, startDate, endDate, totalValue` required; optional `contractNumber, status (draft|active), renewalDate, noticePeriodDays, autoRenew, annualValue, pricingModel, paymentTerms, notes`. |
| GET | `/contracts/:id` | any | Contract with `vendor` and `documents[]`. |
| PATCH | `/contracts/:id` | write | Same fields except `vendorId` and `status`. 409 when terminated. |
| POST | `/contracts/:id/status` | manage | `{ status: "active" | "terminated" }`. Allowed: draft -> active, draft/active -> terminated. |
| POST | `/contracts/:id/documents` | write | `multipart/form-data`, field `file` (PDF, DOC, DOCX, 10 MB, max 20 per contract). |
| GET | `/contracts/:id/documents/:docId` | any | Downloads the file (attachment). |
| DELETE | `/contracts/:id/documents/:docId` | manage | |

Rules: end date after start date; renewal date within the term; contract number unique per organization; no contracts for inactive vendors.
`active` filter = in force (includes `expiring`); `expiring` = in force and ending within 90 days.

## Dashboard

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/dashboard/summary` | any | `kpis { activeVendors, totalVendors, activeContracts, expiringContracts, annualCommitment, noticeAlerts }`, `statusCounts`, `spendByCategory[]`, `upcomingRenewals[]` (next 8, soonest first), `recentActivity[]` (last 8). Scoped to the caller's organization. |

## Health

`GET /health` -> `{ success: true, status: "ok" }`
