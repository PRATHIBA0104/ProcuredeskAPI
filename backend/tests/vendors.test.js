// Integration tests against a real MongoDB. See README for TEST_MONGODB_URI.
const request = require('supertest');
const app = require('../src/app');
const Vendor = require('../src/models/Vendor');
const Contract = require('../src/models/Contract');
const ActivityLog = require('../src/models/ActivityLog');
const db = require('./helpers/db');
const { registerOrg, addUser, bearer } = require('./helpers/auth');

let orgA, orgB, analyst, viewer, manager;

beforeAll(async () => {
  await db.connect();
  await Vendor.init(); // make sure the unique index exists before tests rely on it
  await Contract.init();
}, 300000);
afterAll(db.disconnect);

beforeEach(async () => {
  await db.clear();
  orgA = await registerOrg('Acme Ltd', 'admin@acme.com');
  orgB = await registerOrg('Globex Pvt', 'admin@globex.com');
  analyst = await addUser(orgA.organizationId, 'analyst', 'analyst@acme.com');
  viewer = await addUser(orgA.organizationId, 'viewer', 'viewer@acme.com');
  manager = await addUser(orgA.organizationId, 'manager', 'manager@acme.com');
});

const post = (token, body) => request(app).post('/api/v1/vendors').set(bearer(token)).send(body);
const makeContract = (vendor, org, over = {}) =>
  Contract.create({
    organizationId: org.organizationId,
    vendorId: vendor._id,
    title: 'MSA',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    totalValue: 1000000,
    annualValue: 1000000,
    status: 'active',
    ...over,
  });

describe('POST /vendors', () => {
  test('creates a vendor with defaults, owned by the caller organization', async () => {
    const res = await post(orgA.token, { name: '  Slack Technologies ' });
    expect(res.status).toBe(201);
    expect(res.body.vendor.name).toBe('Slack Technologies');
    expect(res.body.vendor.status).toBe('active');
    expect(res.body.vendor.category).toBe('other');
    expect(res.body.vendor.organizationId).toBe(orgA.organizationId);
    expect(res.body.vendor.nameKey).toBeUndefined();
  });

  test('stores contacts and website', async () => {
    const res = await post(orgA.token, {
      name: 'Zoom',
      category: 'software',
      website: 'https://zoom.us',
      contacts: [{ name: 'Priya', email: 'priya@zoom.us', isPrimary: true }],
    });
    expect(res.status).toBe(201);
    expect(res.body.vendor.contacts).toHaveLength(1);
    expect(res.body.vendor.contacts[0].email).toBe('priya@zoom.us');
  });

  test('400 with field details for invalid input', async () => {
    const res = await post(orgA.token, { name: 'x', category: 'bogus' });
    expect(res.status).toBe(400);
    expect(res.body.errors.map((e) => e.field)).toEqual(expect.arrayContaining(['name', 'category']));
  });

  test('ignores organizationId in the body (cannot create in another organization)', async () => {
    const res = await post(orgB.token, { name: 'Sneaky', organizationId: orgA.organizationId });
    expect(res.status).toBe(201);
    expect(res.body.vendor.organizationId).toBe(orgB.organizationId);
    expect(await Vendor.countDocuments({ organizationId: orgA.organizationId })).toBe(0);
  });

  test('duplicate name in the same organization is 409, case-insensitive', async () => {
    await post(orgA.token, { name: 'Slack' });
    const res = await post(orgA.token, { name: ' slack ' });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already exists/i);
  });

  test('the same name is allowed in a different organization', async () => {
    await post(orgA.token, { name: 'Slack' });
    const res = await post(orgB.token, { name: 'Slack' });
    expect(res.status).toBe(201);
  });

  test('writes an activity log entry', async () => {
    const res = await post(orgA.token, { name: 'Slack' });
    const log = await ActivityLog.findOne({ entityType: 'vendor', action: 'create', entityId: res.body.vendor._id });
    expect(log).toBeTruthy();
    expect(log.summary).toMatch(/Slack/);
  });
});

describe('role-based access', () => {
  test('viewer can read but not create or edit', async () => {
    const created = await post(orgA.token, { name: 'Slack' });
    const id = created.body.vendor._id;
    expect((await request(app).get('/api/v1/vendors').set(bearer(viewer.token))).status).toBe(200);
    expect((await request(app).get(`/api/v1/vendors/${id}`).set(bearer(viewer.token))).status).toBe(200);
    expect((await post(viewer.token, { name: 'Nope' })).status).toBe(403);
    const patch = await request(app).patch(`/api/v1/vendors/${id}`).set(bearer(viewer.token)).send({ notes: 'x' });
    expect(patch.status).toBe(403);
  });

  test('analyst can create and edit but not deactivate', async () => {
    const created = await post(analyst.token, { name: 'Zoom' });
    expect(created.status).toBe(201);
    const id = created.body.vendor._id;
    const patch = await request(app).patch(`/api/v1/vendors/${id}`).set(bearer(analyst.token)).send({ notes: 'ok' });
    expect(patch.status).toBe(200);
    const deact = await request(app).post(`/api/v1/vendors/${id}/deactivate`).set(bearer(analyst.token));
    expect(deact.status).toBe(403);
  });

  test('manager can deactivate and reactivate', async () => {
    const id = (await post(orgA.token, { name: 'Zoom' })).body.vendor._id;
    const d = await request(app).post(`/api/v1/vendors/${id}/deactivate`).set(bearer(manager.token));
    expect(d.status).toBe(200);
    const a = await request(app).post(`/api/v1/vendors/${id}/activate`).set(bearer(manager.token));
    expect(a.status).toBe(200);
    expect(a.body.vendor.status).toBe('active');
  });
});

describe('tenant isolation', () => {
  let id;
  beforeEach(async () => {
    id = (await post(orgA.token, { name: 'Confidential Vendor' })).body.vendor._id;
  });

  test('another organization cannot read, edit, deactivate or activate the vendor (404, not 403)', async () => {
    const get = await request(app).get(`/api/v1/vendors/${id}`).set(bearer(orgB.token));
    const patch = await request(app).patch(`/api/v1/vendors/${id}`).set(bearer(orgB.token)).send({ notes: 'hacked' });
    const deact = await request(app).post(`/api/v1/vendors/${id}/deactivate`).set(bearer(orgB.token));
    const act = await request(app).post(`/api/v1/vendors/${id}/activate`).set(bearer(orgB.token));
    expect([get.status, patch.status, deact.status, act.status]).toEqual([404, 404, 404, 404]);
    const untouched = await Vendor.findById(id);
    expect(untouched.notes).toBeUndefined();
    expect(untouched.status).toBe('active');
  });

  test("another organization's list never includes the vendor", async () => {
    const res = await request(app).get('/api/v1/vendors').set(bearer(orgB.token));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
    expect(res.body.pagination.total).toBe(0);
  });

  test('searching cannot reveal another organization\'s vendors', async () => {
    const res = await request(app).get('/api/v1/vendors?search=Confidential').set(bearer(orgB.token));
    expect(res.body.data).toHaveLength(0);
  });
});

describe('GET /vendors (pagination, search, filter, sort)', () => {
  beforeEach(async () => {
    const names = ['Adobe', 'Atlassian', 'AWS', 'Datadog', 'GitHub', 'Google Cloud', 'Microsoft', 'Okta', 'Salesforce', 'Slack', 'Snowflake', 'Zoom'];
    for (const [i, name] of names.entries()) {
      await Vendor.create({
        organizationId: orgA.organizationId,
        name,
        category: ['AWS', 'Google Cloud', 'Snowflake'].includes(name) ? 'cloud_infrastructure' : 'software',
        status: name === 'Okta' ? 'prospect' : 'active',
        contacts: name === 'Slack' ? [{ name: 'Rahul Mehta', email: 'rahul@slack.com' }] : [],
        createdAt: new Date(2026, 0, i + 1),
      });
    }
  });
  const get = (qs = '') => request(app).get(`/api/v1/vendors${qs}`).set(bearer(orgA.token));

  test('paginates', async () => {
    const res = await get('?limit=5&page=3');
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination).toEqual({ page: 3, limit: 5, total: 12, pages: 3 });
  });

  test('sorts by name ascending and descending, case-insensitively', async () => {
    const asc = await get('?sort=name&limit=100');
    expect(asc.body.data.map((v) => v.name).slice(0, 3)).toEqual(['Adobe', 'Atlassian', 'AWS']);
    const desc = await get('?sort=-name&limit=1');
    expect(desc.body.data[0].name).toBe('Zoom');
  });

  test('searches by name (any case) and by contact name', async () => {
    expect((await get('?search=CLOUD')).body.data.map((v) => v.name)).toEqual(['Google Cloud']);
    expect((await get('?search=rahul')).body.data.map((v) => v.name)).toEqual(['Slack']);
  });

  test('treats regex characters in search as plain text', async () => {
    const res = await get('?search=.*');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  test('filters by category and status, and combines filters', async () => {
    expect((await get('?category=cloud_infrastructure')).body.pagination.total).toBe(3);
    expect((await get('?status=prospect')).body.data.map((v) => v.name)).toEqual(['Okta']);
    expect((await get('?category=software&status=active')).body.pagination.total).toBe(8);
  });

  test('400 for invalid query values', async () => {
    expect((await get('?limit=1000')).status).toBe(400);
    expect((await get('?sort=passwordHash')).status).toBe(400);
    expect((await get('?category=bogus')).status).toBe(400);
  });

  test('includes active contract count and annual value per vendor', async () => {
    const slack = await Vendor.findOne({ name: 'Slack' });
    await makeContract(slack, orgA, { annualValue: 500000 });
    await makeContract(slack, orgA, { annualValue: 250000, title: 'Add-on' });
    await makeContract(slack, orgA, { status: 'terminated', title: 'Old', annualValue: 999 });
    const res = await get('?search=Slack');
    expect(res.body.data[0].activeContracts).toBe(2);
    expect(res.body.data[0].activeAnnualValue).toBe(750000);
    expect((await get('?search=Zoom')).body.data[0].activeContracts).toBe(0);
  });
});

describe('GET /vendors/:id', () => {
  test('returns the vendor with its contracts', async () => {
    const vendor = await Vendor.create({ organizationId: orgA.organizationId, name: 'Slack' });
    await makeContract(vendor, orgA, { title: 'Enterprise Grid' });
    const res = await request(app).get(`/api/v1/vendors/${vendor._id}`).set(bearer(orgA.token));
    expect(res.status).toBe(200);
    expect(res.body.vendor.name).toBe('Slack');
    expect(res.body.contracts).toHaveLength(1);
    expect(res.body.contracts[0].title).toBe('Enterprise Grid');
  });

  test('400 for a malformed id, 404 for an unknown id', async () => {
    expect((await request(app).get('/api/v1/vendors/abc').set(bearer(orgA.token))).status).toBe(400);
    const res = await request(app).get('/api/v1/vendors/507f1f77bcf86cd799439011').set(bearer(orgA.token));
    expect(res.status).toBe(404);
  });
});

describe('PATCH /vendors/:id', () => {
  test('updates only the fields sent (other fields are not reset)', async () => {
    const id = (await post(orgA.token, { name: 'Zoom', category: 'software', status: 'prospect' })).body.vendor._id;
    const res = await request(app).patch(`/api/v1/vendors/${id}`).set(bearer(orgA.token)).send({ notes: 'Renewal in March' });
    expect(res.status).toBe(200);
    expect(res.body.vendor.notes).toBe('Renewal in March');
    expect(res.body.vendor.category).toBe('software');
    expect(res.body.vendor.status).toBe('prospect');
  });

  test('renaming keeps uniqueness: 409 on a clash, allowed when only the case changes', async () => {
    await post(orgA.token, { name: 'Slack' });
    const id = (await post(orgA.token, { name: 'Zoom' })).body.vendor._id;
    const clash = await request(app).patch(`/api/v1/vendors/${id}`).set(bearer(orgA.token)).send({ name: 'SLACK' });
    expect(clash.status).toBe(409);
    const recase = await request(app).patch(`/api/v1/vendors/${id}`).set(bearer(orgA.token)).send({ name: 'ZOOM' });
    expect(recase.status).toBe(200);
    expect(recase.body.vendor.name).toBe('ZOOM');
  });

  test('cannot set status to inactive through PATCH', async () => {
    const id = (await post(orgA.token, { name: 'Zoom' })).body.vendor._id;
    const res = await request(app).patch(`/api/v1/vendors/${id}`).set(bearer(orgA.token)).send({ status: 'inactive' });
    expect(res.status).toBe(400);
  });

  test('an inactive vendor cannot change status through PATCH (must use activate)', async () => {
    const id = (await post(orgA.token, { name: 'Zoom' })).body.vendor._id;
    await request(app).post(`/api/v1/vendors/${id}/deactivate`).set(bearer(orgA.token));
    const res = await request(app).patch(`/api/v1/vendors/${id}`).set(bearer(orgA.token)).send({ status: 'active' });
    expect(res.status).toBe(400);
  });

  test('empty body is 400', async () => {
    const id = (await post(orgA.token, { name: 'Zoom' })).body.vendor._id;
    expect((await request(app).patch(`/api/v1/vendors/${id}`).set(bearer(orgA.token)).send({})).status).toBe(400);
  });
});

describe('deactivate / activate', () => {
  test('is blocked while the vendor has an active contract', async () => {
    const vendor = await Vendor.create({ organizationId: orgA.organizationId, name: 'Slack' });
    await makeContract(vendor, orgA);
    const res = await request(app).post(`/api/v1/vendors/${vendor._id}/deactivate`).set(bearer(orgA.token));
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/active contract/i);
    expect((await Vendor.findById(vendor._id)).status).toBe('active');
  });

  test('succeeds when only terminated/expired/draft contracts remain, then can be reactivated', async () => {
    const vendor = await Vendor.create({ organizationId: orgA.organizationId, name: 'Slack' });
    await makeContract(vendor, orgA, { status: 'terminated' });
    await makeContract(vendor, orgA, { status: 'expired', title: 'Old' });
    await makeContract(vendor, orgA, { status: 'draft', title: 'Draft' });
    const d = await request(app).post(`/api/v1/vendors/${vendor._id}/deactivate`).set(bearer(orgA.token));
    expect(d.status).toBe(200);
    expect(d.body.vendor.status).toBe('inactive');
    expect(d.body.vendor.deactivatedAt).toBeTruthy();
    const a = await request(app).post(`/api/v1/vendors/${vendor._id}/activate`).set(bearer(orgA.token));
    expect(a.status).toBe(200);
    expect(a.body.vendor.status).toBe('active');
    expect(a.body.vendor.deactivatedAt).toBeUndefined();
  });

  test('another organization\'s active contract does not block this organization', async () => {
    const mine = await Vendor.create({ organizationId: orgA.organizationId, name: 'Slack' });
    const theirs = await Vendor.create({ organizationId: orgB.organizationId, name: 'Slack' });
    await makeContract(theirs, orgB);
    const res = await request(app).post(`/api/v1/vendors/${mine._id}/deactivate`).set(bearer(orgA.token));
    expect(res.status).toBe(200);
  });

  test('deactivating twice is 409; activating an active vendor is 409', async () => {
    const id = (await post(orgA.token, { name: 'Zoom' })).body.vendor._id;
    expect((await request(app).post(`/api/v1/vendors/${id}/activate`).set(bearer(orgA.token))).status).toBe(409);
    await request(app).post(`/api/v1/vendors/${id}/deactivate`).set(bearer(orgA.token));
    expect((await request(app).post(`/api/v1/vendors/${id}/deactivate`).set(bearer(orgA.token))).status).toBe(409);
  });

  test('writes activity log entries', async () => {
    const id = (await post(orgA.token, { name: 'Zoom' })).body.vendor._id;
    await request(app).post(`/api/v1/vendors/${id}/deactivate`).set(bearer(orgA.token));
    expect(await ActivityLog.countDocuments({ entityId: id, action: 'deactivate' })).toBe(1);
  });
});

describe('contract number uniqueness (index behaviour)', () => {
  test('many contracts without a number are allowed; duplicate numbers are not; other organizations may reuse a number', async () => {
    const mine = await Vendor.create({ organizationId: orgA.organizationId, name: 'Slack' });
    const theirs = await Vendor.create({ organizationId: orgB.organizationId, name: 'Slack' });

    await makeContract(mine, orgA, { title: 'No number 1' });
    await makeContract(mine, orgA, { title: 'No number 2' });
    await makeContract(mine, orgA, { title: 'No number 3' });

    await makeContract(mine, orgA, { title: 'Numbered', contractNumber: 'CN-001' });
    await expect(makeContract(mine, orgA, { title: 'Clash', contractNumber: 'CN-001' })).rejects.toMatchObject({ code: 11000 });

    await expect(makeContract(theirs, orgB, { title: 'Other org', contractNumber: 'CN-001' })).resolves.toBeTruthy();
  });
});
