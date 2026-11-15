// Integration tests against a real MongoDB (see README for TEST_MONGODB_URI).
const request = require('supertest');
const app = require('../src/app');
const Vendor = require('../src/models/Vendor');
const Contract = require('../src/models/Contract');
const db = require('./helpers/db');
const { registerOrg, addUser, bearer } = require('./helpers/auth');

const DAY = 86400000;
const iso = (n) => new Date(Date.now() + n * DAY).toISOString().slice(0, 10);
let orgA, orgB;

beforeAll(async () => {
  await db.connect();
  await Vendor.init();
  await Contract.init();
}, 300000);
afterAll(() => db.disconnect());
beforeEach(async () => {
  await db.clear();
  orgA = await registerOrg('Acme Ltd', 'admin@acme.com');
  orgB = await registerOrg('Globex Pvt', 'admin@globex.com');
});

const get = (token) => request(app).get('/api/v1/dashboard/summary').set(bearer(token));

describe('GET /dashboard/summary', () => {
  test('requires authentication', async () => {
    expect((await request(app).get('/api/v1/dashboard/summary')).status).toBe(401);
  });

  test('a new organization gets zeros (only its registration is in the activity feed)', async () => {
    const res = await get(orgA.token);
    expect(res.status).toBe(200);
    expect(res.body.kpis).toEqual({ activeVendors: 0, totalVendors: 0, activeContracts: 0, expiringContracts: 0, annualCommitment: 0, noticeAlerts: 0 });
    expect(res.body.upcomingRenewals).toEqual([]);
  });

  test('reflects real vendors and contracts created through the API', async () => {
    const v = await request(app).post('/api/v1/vendors').set(bearer(orgA.token)).send({ name: 'Slack', category: 'software' });
    const vendorId = v.body.vendor._id;
    const mk = (title, end, total) =>
      request(app).post('/api/v1/contracts').set(bearer(orgA.token)).send({ vendorId, title, status: 'active', startDate: iso(-300), endDate: iso(end), totalValue: total, annualValue: total });
    expect((await mk('Far', 300, 1000)).status).toBe(201);
    expect((await mk('Soon', 30, 500)).status).toBe(201);

    const res = await get(orgA.token);
    expect(res.body.kpis.activeVendors).toBe(1);
    expect(res.body.kpis.activeContracts).toBe(2);
    expect(res.body.kpis.expiringContracts).toBe(1);
    expect(res.body.kpis.annualCommitment).toBe(1500);
    expect(res.body.upcomingRenewals.map((r) => r.title)).toEqual(['Soon']);
    expect(res.body.spendByCategory[0]).toMatchObject({ category: 'software', annualValue: 1500, contracts: 2 });
    expect(res.body.recentActivity.length).toBeGreaterThan(0);
  });

  test('tenant isolation: another organization never sees these numbers or activity', async () => {
    const v = await request(app).post('/api/v1/vendors').set(bearer(orgA.token)).send({ name: 'Secret Vendor' });
    await request(app).post('/api/v1/contracts').set(bearer(orgA.token)).send({ vendorId: v.body.vendor._id, title: 'Secret Deal', status: 'active', startDate: iso(-10), endDate: iso(20), totalValue: 9999 });
    const res = await get(orgB.token);
    expect(res.body.kpis.totalVendors).toBe(0);
    expect(res.body.kpis.annualCommitment).toBe(0);
    expect(JSON.stringify(res.body)).not.toMatch(/Secret/);
  });

  test('every role, including viewer, can read the dashboard', async () => {
    const viewer = await addUser(orgA.organizationId, 'viewer', 'viewer@acme.com');
    expect((await get(viewer.token)).status).toBe(200);
  });
});
