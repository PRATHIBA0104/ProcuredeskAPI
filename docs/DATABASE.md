# Database design (MongoDB)

Every business document carries `organizationId`; every query filters on it. That is the tenancy boundary.

| Collection | Fields | Indexes |
|---|---|---|
| `organizations` | `name`, timestamps | |
| `users` | `organizationId`, `name`, `email` (lower-cased), `passwordHash` (never selected by default), `role` (admin/manager/analyst/viewer), `isActive`, `lastLoginAt` | `email` unique; `organizationId` |
| `vendors` | `organizationId`, `name`, `nameKey` (lower-cased copy, hidden from API), `category`, `status` (active/inactive/prospect), `website`, `contacts[]` (name, email, phone, role, isPrimary; max 10), `notes`, `createdBy`, `deactivatedAt` | unique `(organizationId, nameKey)`; `(organizationId, status, category)` |
| `contracts` | `organizationId`, `vendorId`, `title`, `contractNumber`, `status` (draft/active/terminated/expired), `startDate`, `endDate`, `renewalDate`, `noticePeriodDays`, `autoRenew`, `totalValue`, `annualValue`, `annualValueDerived`, `currency` (INR), `pricingModel`, `paymentTerms`, `notes`, `documents[]` (originalName, storedName, mimeType, size, uploadedBy, uploadedAt), `terminatedAt`, `createdBy` | `(organizationId, vendorId, status)`; `(organizationId, endDate)`; **partial unique** `(organizationId, contractNumber)` where `contractNumber` is a string |
| `activitylogs` | `organizationId`, `userId`, `userName`, `action`, `entityType`, `entityId`, `summary`, `createdAt` | `(organizationId, createdAt desc)` |

Design decisions

* **Computed, not stored:** `expiring`, and "expired by date", are derived from `endDate` on every read so they can never go stale. Only decisions (draft, active, terminated) are stored.
* **Notice deadline** = `endDate - noticePeriodDays`, computed on read.
* **Annual value** is derived from total value and term unless the user types one (`annualValueDerived` tracks which).
* **Vendors are deactivated, never deleted**, so contract history keeps its reference.
* **Why a partial index** for `contractNumber`: a sparse compound index would still index contracts with no number as `null` and reject the second one. A partial index only covers real numbers.
* `storedName` of a document (its location on disk) is never exposed through the API.

Relationships: organization 1-n users, vendors, contracts, activity; vendor 1-n contracts; contract 1-n documents (embedded).
