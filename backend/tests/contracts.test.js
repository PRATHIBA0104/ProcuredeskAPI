// Integration tests against a real MongoDB. See README for TEST_MONGODB_URI.
const fs = require('fs');
const path = require('path');
const request = require('supertest');
const app = require('../src/app');
const env = require('../src/config/env');
const Vendor = require('../src/models/Vendor');
const Contract = require('../src/models/Contract');
const ActivityLog = require('../src/models/ActivityLog');
const db = require('./helpers/db');
const { registerOrg, addUser, bearer } = require('./helpers/auth');

let orgA, orgB, analyst, viewer, manager, vendorA, vendorB;

beforeAll(async () => {
  await db.connect();
  await Vendor.init();
  await Contract.init();
}, 300000);
afterAll(async () => {
  await db.disconnect();
  fs.rmSync(env.uploadDir, { recursive: true, force: true });
});

beforeEach(async () => {
  await db.clear();
  fs.rmSync(env.uploadDir, { recursive: true, force: true });
  orgA = await registerOrg('Acme Ltd', 'admin@acme.com');
  orgB = await registerOrg('Globex Pvt', 'admin@globex.com');
  analyst = await addUser(orgA.organizationId, 'analyst', 'analyst@acme.com');
  viewer = await addUser(orgA.organizationId, 'viewer', 'viewer@acme.com');
  manager = await addUser(orgA.organizationId, 'manager', 'manager@acme.com');
  vendorA = await Vendor.create({ organizationId: orgA.organizationId, name: 'Slack' });
  vendorB = await Vendor.create({ organizationId: orgB.organizationId, name: 'Zoom' });
});

// Dates are relative to "now" so the tests keep passing as the calendar moves.
const DAY = 24 * 60 * 60 * 1000;
const day = (n) => new Date(Date.now() + n * DAY);
const iso = (n) => day(n).toISOString().slice(0, 10);

const body = (over = {}) => ({
  vendorId: String(vendorA._id),
  title: 'Enterprise MSA',
  startDate: iso(-30),
  endDate: iso(335),
  totalValue: 1000000,
  ...over,
});
const post = (token, b) => request(app).post('/api/v1/contracts').set(bearer(token)).send(b);
const make = (org, vendor, over = {}) =>
  Contract.create({
    organizationId: org.organizationId,
    vendorId: vendor._id,
    title: 'Seeded',
    startDate: day(-100),
    endDate: day(200),
    totalValue: 500000,
    status: 'active',
    ...over,
  });

describe('POST /contracts', () => {
  test('creates a draft with sensible defaults and computed fields', async () => {
    const res = await post(orgA.token, body());
    expect(res.status).toBe(201);
    const c = res.body.contract;
    expect(c).toMatchObject({ status: 'draft', effectiveStatus: 'draft', currency: 'INR', noticePeriodDays: 30, paymentTerms: 'net_30', pricingModel: 'fixed', autoRenew: false });
    expect(c.organizationId).toBe(orgA.organizationId);
    expect(c.annualValue).toBeGreaterThan(0);
    expect(c.annualValueDerived).toBeUndefined();
    expect(c).toHaveProperty('noticeDeadline');
    expect(c).toHaveProperty('daysToExpiry');
  });

  test('keeps an explicit annual value', async () => {
    const res = await post(orgA.token, body({ annualValue: 400000 }));
    expect(res.body.contract.annualValue).toBe(400000);
  });

  test('can be created active', async () => {
    const res = await post(orgA.token, body({ status: 'active' }));
    expect(res.body.contract.effectiveStatus).toBe('active');
  });

  test('a vendor from another organization is rejected (400) and so is an unknown vendor', async () => {
    expect((await post(orgA.token, body({ vendorId: String(vendorB._id) }))).status).toBe(400);
    expect((await post(orgA.token, body({ vendorId: '507f1f77bcf86cd799439011' }))).status).toBe(400);
  });

  test('an inactive vendor cannot receive contracts', async () => {
    await Vendor.updateOne({ _id: vendorA._id }, { status: 'inactive' });
    const res = await post(orgA.token, body());
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/inactive vendor/i);
  });

  test('ignores organizationId in the body', async () => {
    const res = await post(orgB.token, body({ vendorId: String(vendorB._id), organizationId: orgA.organizationId }));
    expect(res.status).toBe(201);
    expect(res.body.contract.organizationId).toBe(orgB.organizationId);
  });

  test('validation: end before start, renewal outside the term, negative value', async () => {
    const a = await post(orgA.token, body({ endDate: iso(-60) }));
    expect(a.status).toBe(400);
    expect(a.body.errors.map((e) => e.field)).toContain('endDate');
    const b = await post(orgA.token, body({ renewalDate: iso(900) }));
    expect(b.status).toBe(400);
    expect(b.body.errors.map((e) => e.field)).toContain('renewalDate');
    expect((await post(orgA.token, body({ totalValue: -1 }))).status).toBe(400);
  });

  test('contract numbers: blank is allowed many times, duplicates are 409, another organization may reuse one', async () => {
    expect((await post(orgA.token, body({ contractNumber: '' }))).status).toBe(201);
    expect((await post(orgA.token, body({ contractNumber: '' }))).status).toBe(201);
    expect((await post(orgA.token, body({ contractNumber: 'CN-100' }))).status).toBe(201);
    const dup = await post(orgA.token, body({ contractNumber: 'CN-100' }));
    expect(dup.status).toBe(409);
    expect(dup.body.message).toMatch(/already exists/i);
    expect((await post(orgB.token, body({ vendorId: String(vendorB._id), contractNumber: 'CN-100' }))).status).toBe(201);
  });

  test('viewer cannot create; analyst can', async () => {
    expect((await post(viewer.token, body())).status).toBe(403);
    expect((await post(analyst.token, body())).status).toBe(201);
  });

  test('writes an activity log entry', async () => {
    const res = await post(orgA.token, body());
    expect(await ActivityLog.countDocuments({ entityType: 'contract', action: 'create', entityId: res.body.contract._id })).toBe(1);
  });
});

describe('GET /contracts', () => {
  let ids;
  beforeEach(async () => {
    const far = await make(orgA, vendorA, { title: 'Far away', endDate: day(200) });
    const soon = await make(orgA, vendorA, { title: 'Ends soon', endDate: day(30), contractNumber: 'CN-SOON' });
    const past = await make(orgA, vendorA, { title: 'Lapsed', startDate: day(-400), endDate: day(-10) });
    const draft = await make(orgA, vendorA, { title: 'Draft deal', status: 'draft' });
    const term = await make(orgA, vendorA, { title: 'Cancelled', status: 'terminated' });
    await make(orgB, vendorB, { title: 'Other org secret' });
    ids = { far, soon, past, draft, term };
  });
  const get = (qs = '', token = orgA.token) => request(app).get(`/api/v1/contracts${qs}`).set(bearer(token));
  const titles = (res) => res.body.data.map((c) => c.title);

  test('lists only this organization, with vendor and computed fields', async () => {
    const res = await get('?limit=100');
    expect(res.body.pagination.total).toBe(5);
    expect(titles(res)).not.toContain('Other org secret');
    const soon = res.body.data.find((c) => c.title === 'Ends soon');
    expect(soon).toMatchObject({ effectiveStatus: 'expiring', documentCount: 0 });
    expect(soon.vendor.name).toBe('Slack');
    expect(soon.daysToExpiry).toBeGreaterThanOrEqual(29);
    expect(soon.documents).toBeUndefined();
  });

  test('filters by effective status', async () => {
    expect(titles(await get('?status=active')).sort()).toEqual(['Ends soon', 'Far away']);
    expect(titles(await get('?status=expiring'))).toEqual(['Ends soon']);
    expect(titles(await get('?status=expired'))).toEqual(['Lapsed']);
    expect(titles(await get('?status=draft'))).toEqual(['Draft deal']);
    expect(titles(await get('?status=terminated'))).toEqual(['Cancelled']);
  });

  test('"endingWithin" returns only in-force contracts ending inside the window', async () => {
    expect(titles(await get('?endingWithin=60'))).toEqual(['Ends soon']);
    expect(titles(await get('?endingWithin=365')).sort()).toEqual(['Ends soon', 'Far away']);
  });

  test('sorts by end date by default, and by title', async () => {
    const byEnd = titles(await get('?limit=100'));
    expect(byEnd[0]).toBe('Lapsed');
    expect(byEnd.indexOf('Ends soon')).toBeLessThan(byEnd.indexOf('Far away'));
    expect(titles(await get('?sort=title&limit=100'))[0]).toBe('Cancelled');
  });

  test('searches by title, contract number and vendor name', async () => {
    expect(titles(await get('?search=lapsed'))).toEqual(['Lapsed']);
    expect(titles(await get('?search=CN-SOON'))).toEqual(['Ends soon']);
    expect((await get('?search=slack&limit=100')).body.pagination.total).toBe(5);
    expect((await get('?search=zoom')).body.pagination.total).toBe(0); // other organization's vendor
  });

  test('filters by vendor and paginates', async () => {
    expect((await get(`?vendorId=${vendorA._id}`)).body.pagination.total).toBe(5);
    expect((await get(`?vendorId=${vendorB._id}`)).body.pagination.total).toBe(0);
    const page = await get('?limit=2&page=3');
    expect(page.body.data).toHaveLength(1);
    expect(page.body.pagination).toEqual({ page: 3, limit: 2, total: 5, pages: 3 });
  });

  test('regex characters in search are plain text', async () => {
    expect((await get('?search=.*')).body.data).toHaveLength(0);
  });

  test('the other organization sees only its own contract', async () => {
    const res = await get('?limit=100', orgB.token);
    expect(titles(res)).toEqual(['Other org secret']);
  });
});

describe('GET /contracts/:id', () => {
  test('returns the contract with vendor, documents and computed fields', async () => {
    const c = await make(orgA, vendorA, { noticePeriodDays: 45, endDate: day(100) });
    const res = await request(app).get(`/api/v1/contracts/${c._id}`).set(bearer(viewer.token));
    expect(res.status).toBe(200);
    expect(res.body.contract.vendor.name).toBe('Slack');
    expect(res.body.contract.documents).toEqual([]);
    expect(res.body.contract.daysToNoticeDeadline).toBeGreaterThanOrEqual(54);
    expect(res.body.contract.daysToNoticeDeadline).toBeLessThanOrEqual(56);
  });
  test('404 for another organization, 400 for a bad id', async () => {
    const c = await make(orgB, vendorB);
    expect((await request(app).get(`/api/v1/contracts/${c._id}`).set(bearer(orgA.token))).status).toBe(404);
    expect((await request(app).get('/api/v1/contracts/abc').set(bearer(orgA.token))).status).toBe(400);
  });
});

describe('PATCH /contracts/:id', () => {
  const patch = (id, token, b) => request(app).patch(`/api/v1/contracts/${id}`).set(bearer(token)).send(b);

  test('updates only what is sent', async () => {
    const c = await make(orgA, vendorA, { paymentTerms: 'net_60', pricingModel: 'subscription' });
    const res = await patch(c._id, analyst.token, { notes: 'Renegotiate in Q2' });
    expect(res.status).toBe(200);
    expect(res.body.contract).toMatchObject({ notes: 'Renegotiate in Q2', paymentTerms: 'net_60', pricingModel: 'subscription', status: 'active' });
  });

  test('a calculated annual value follows the total; one the user set does not', async () => {
    const derived = (await post(orgA.token, body({ totalValue: 1000000, startDate: iso(-30), endDate: iso(700) }))).body.contract;
    const bumped = await patch(derived._id, analyst.token, { totalValue: 2000000 });
    expect(bumped.body.contract.annualValue).toBeGreaterThan(derived.annualValue);

    const manual = (await post(orgA.token, body({ annualValue: 111 }))).body.contract;
    const after = await patch(manual._id, analyst.token, { totalValue: 9000000 });
    expect(after.body.contract.annualValue).toBe(111);
  });

  test('moving only the start date past the end date is 400', async () => {
    const c = await make(orgA, vendorA);
    const res = await patch(c._id, analyst.token, { startDate: iso(400) });
    expect(res.status).toBe(400);
  });

  test('vendorId and status in the body are ignored', async () => {
    const c = await make(orgA, vendorA);
    const res = await patch(c._id, analyst.token, { notes: 'x', vendorId: String(vendorB._id), status: 'terminated' });
    expect(res.status).toBe(200);
    expect(res.body.contract.vendorId).toBe(String(vendorA._id));
    expect(res.body.contract.status).toBe('active');
  });

  test('contract number clash is 409; clearing a number with "" works', async () => {
    await make(orgA, vendorA, { contractNumber: 'CN-1' });
    const c = await make(orgA, vendorA, { contractNumber: 'CN-2' });
    expect((await patch(c._id, analyst.token, { contractNumber: 'CN-1' })).status).toBe(409);
    const cleared = await patch(c._id, analyst.token, { contractNumber: '' });
    expect(cleared.status).toBe(200);
    expect(cleared.body.contract.contractNumber).toBeUndefined();
  });

  test('a terminated contract is read-only (409)', async () => {
    const c = await make(orgA, vendorA, { status: 'terminated' });
    expect((await patch(c._id, analyst.token, { notes: 'x' })).status).toBe(409);
  });

  test('viewer 403, other organization 404', async () => {
    const mine = await make(orgA, vendorA);
    const theirs = await make(orgB, vendorB);
    expect((await patch(mine._id, viewer.token, { notes: 'x' })).status).toBe(403);
    expect((await patch(theirs._id, orgA.token, { notes: 'hacked' })).status).toBe(404);
    expect((await Contract.findById(theirs._id)).notes).toBeUndefined();
  });
});

describe('POST /contracts/:id/status', () => {
  const change = (id, token, status) => request(app).post(`/api/v1/contracts/${id}/status`).set(bearer(token)).send({ status });

  test('a manager can activate a draft, then terminate it', async () => {
    const c = await make(orgA, vendorA, { status: 'draft' });
    const a = await change(c._id, manager.token, 'active');
    expect(a.status).toBe(200);
    expect(a.body.contract.status).toBe('active');
    const t = await change(c._id, manager.token, 'terminated');
    expect(t.body.contract.status).toBe('terminated');
    expect(t.body.contract.terminatedAt).toBeTruthy();
  });

  test('illegal moves are 409: terminated -> active, active -> active', async () => {
    const dead = await make(orgA, vendorA, { status: 'terminated' });
    expect((await change(dead._id, manager.token, 'active')).status).toBe(409);
    const live = await make(orgA, vendorA);
    expect((await change(live._id, manager.token, 'active')).status).toBe(409);
  });

  test('cannot activate a draft whose end date has already passed', async () => {
    const c = await make(orgA, vendorA, { status: 'draft', startDate: day(-400), endDate: day(-10) });
    const res = await change(c._id, manager.token, 'active');
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/end date/i);
  });

  test('analyst and viewer get 403; another organization gets 404', async () => {
    const c = await make(orgA, vendorA, { status: 'draft' });
    expect((await change(c._id, analyst.token, 'active')).status).toBe(403);
    expect((await change(c._id, viewer.token, 'active')).status).toBe(403);
    expect((await change(c._id, orgB.token, 'active')).status).toBe(404);
    expect((await Contract.findById(c._id)).status).toBe('draft');
  });

  test('terminating frees the vendor to be deactivated; a lapsed contract never blocked it', async () => {
    const live = await make(orgA, vendorA);
    const lapsed = await make(orgA, vendorA, { startDate: day(-400), endDate: day(-10) });
    const blocked = await request(app).post(`/api/v1/vendors/${vendorA._id}/deactivate`).set(bearer(orgA.token));
    expect(blocked.status).toBe(409);
    expect(blocked.body.message).toMatch(/1 active contract/);
    await change(live._id, manager.token, 'terminated');
    const ok = await request(app).post(`/api/v1/vendors/${vendorA._id}/deactivate`).set(bearer(orgA.token));
    expect(ok.status).toBe(200);
    expect(lapsed).toBeTruthy();
  });
});

describe('documents', () => {
  const PDF = Buffer.from('%PDF-1.7\nsigned contract body\n%%EOF');
  let contract;
  beforeEach(async () => {
    contract = await make(orgA, vendorA);
  });
  const up = (token, buf, name, id = contract._id) =>
    request(app).post(`/api/v1/contracts/${id}/documents`).set(bearer(token)).attach('file', buf, name);
  const binary = (r, cb) => {
    const chunks = [];
    r.on('data', (c) => chunks.push(c));
    r.on('end', () => cb(null, Buffer.concat(chunks)));
  };

  test('upload stores the file on disk and the record in the contract, without exposing the disk name', async () => {
    const res = await up(analyst.token, PDF, 'Signed MSA.pdf');
    expect(res.status).toBe(201);
    expect(res.body.document).toMatchObject({ originalName: 'Signed MSA.pdf', mimeType: 'application/pdf', size: PDF.length });
    expect(res.body.document.storedName).toBeUndefined();

    const files = fs.readdirSync(path.join(env.uploadDir, orgA.organizationId));
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/^[0-9a-f-]{36}\.pdf$/);

    const detail = await request(app).get(`/api/v1/contracts/${contract._id}`).set(bearer(viewer.token));
    expect(detail.body.contract.documents).toHaveLength(1);
    expect(JSON.stringify(detail.body)).not.toMatch(/[0-9a-f-]{36}\.pdf/);
    expect(await ActivityLog.countDocuments({ action: 'upload', entityId: contract._id })).toBe(1);

    const list = await request(app).get('/api/v1/contracts').set(bearer(viewer.token));
    expect(list.body.data.find((c) => c.title === 'Seeded').documentCount).toBe(1);
  });

  test('rejects wrong type, fake content and files over 10 MB', async () => {
    expect((await up(analyst.token, Buffer.from('MZ'), 'virus.exe')).status).toBe(400);
    expect((await up(analyst.token, Buffer.from('plain text'), 'fake.pdf')).status).toBe(400);
    const big = Buffer.concat([Buffer.from('%PDF-'), Buffer.alloc(11 * 1024 * 1024)]);
    expect((await up(analyst.token, big, 'huge.pdf')).status).toBe(400);
    const stored = await Contract.findById(contract._id);
    expect(stored.documents).toHaveLength(0);
  });

  test('a viewer can download the exact file as an attachment', async () => {
    const doc = (await up(analyst.token, PDF, 'Signed MSA.pdf')).body.document;
    const res = await request(app).get(`/api/v1/contracts/${contract._id}/documents/${doc._id}`).set(bearer(viewer.token)).buffer(true).parse(binary);
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="Signed MSA\.pdf"/);
    expect(res.body.equals(PDF)).toBe(true);
  });

  test('viewers cannot upload; analysts cannot delete', async () => {
    expect((await up(viewer.token, PDF, 'a.pdf')).status).toBe(403);
    const doc = (await up(analyst.token, PDF, 'a.pdf')).body.document;
    const res = await request(app).delete(`/api/v1/contracts/${contract._id}/documents/${doc._id}`).set(bearer(analyst.token));
    expect(res.status).toBe(403);
  });

  test('another organization cannot upload to, download from or delete from the contract (404)', async () => {
    const doc = (await up(analyst.token, PDF, 'secret.pdf')).body.document;
    expect((await up(orgB.token, PDF, 'x.pdf')).status).toBe(404);
    const dl = await request(app).get(`/api/v1/contracts/${contract._id}/documents/${doc._id}`).set(bearer(orgB.token));
    expect(dl.status).toBe(404);
    const del = await request(app).delete(`/api/v1/contracts/${contract._id}/documents/${doc._id}`).set(bearer(orgB.token));
    expect(del.status).toBe(404);
    expect((await Contract.findById(contract._id)).documents).toHaveLength(1);
  });

  test('a manager can delete: the record and the file both go', async () => {
    const doc = (await up(analyst.token, PDF, 'a.pdf')).body.document;
    const res = await request(app).delete(`/api/v1/contracts/${contract._id}/documents/${doc._id}`).set(bearer(manager.token));
    expect(res.status).toBe(200);
    expect((await Contract.findById(contract._id)).documents).toHaveLength(0);
    expect(fs.readdirSync(path.join(env.uploadDir, orgA.organizationId))).toHaveLength(0);
    const again = await request(app).get(`/api/v1/contracts/${contract._id}/documents/${doc._id}`).set(bearer(viewer.token));
    expect(again.status).toBe(404);
  });

  test('a document can still be added to a terminated contract record? No: uploads are allowed, edits are not', async () => {
    const dead = await make(orgA, vendorA, { status: 'terminated' });
    expect((await up(analyst.token, PDF, 'termination-letter.pdf', dead._id)).status).toBe(201);
  });
});
