// Route-level checks that never reach the database: only the user lookup is stubbed.
// They prove the order of middleware: authenticate -> authorize -> validate -> controller.
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const User = require('../../src/models/User');
const { signToken } = require('../../src/services/auth.service');

const ORG = new mongoose.Types.ObjectId();
const VALID_ID = '507f1f77bcf86cd799439011';

function tokenFor(role) {
  const user = { _id: new mongoose.Types.ObjectId(), organizationId: ORG, role, isActive: true, name: `${role} user` };
  return { user, token: signToken(user) };
}

let current;
beforeEach(() => {
  jest.spyOn(User, 'findById').mockImplementation(async () => current.user);
});
afterEach(() => jest.restoreAllMocks());

const as = (role) => {
  current = tokenFor(role);
  return { Authorization: `Bearer ${current.token}` };
};

describe('authorization happens before validation', () => {
  test('viewer POST with a totally invalid body is 403, not 400', async () => {
    const res = await request(app).post('/api/v1/vendors').set(as('viewer')).send({ nonsense: true });
    expect(res.status).toBe(403);
  });
  test('viewer PATCH is 403', async () => {
    const res = await request(app).patch(`/api/v1/vendors/${VALID_ID}`).set(as('viewer')).send({ notes: 'x' });
    expect(res.status).toBe(403);
  });
  test('analyst and viewer cannot deactivate or activate (403)', async () => {
    for (const role of ['analyst', 'viewer']) {
      for (const action of ['deactivate', 'activate']) {
        const res = await request(app).post(`/api/v1/vendors/${VALID_ID}/${action}`).set(as(role));
        expect(res.status).toBe(403);
      }
    }
  });
});

describe('input validation reaches the client as 400 with details', () => {
  test('analyst POST with a bad body lists the failing fields', async () => {
    const res = await request(app).post('/api/v1/vendors').set(as('analyst')).send({ name: 'x', category: 'bogus' });
    expect(res.status).toBe(400);
    expect(res.body.errors.map((e) => e.field)).toEqual(expect.arrayContaining(['name', 'category']));
  });
  test('malformed id in the URL is 400', async () => {
    const res = await request(app).get('/api/v1/vendors/abc').set(as('viewer'));
    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe('id');
  });
  test('malformed id on PATCH is 400', async () => {
    const res = await request(app).patch('/api/v1/vendors/abc').set(as('analyst')).send({ notes: 'x' });
    expect(res.status).toBe(400);
  });
  test('empty PATCH body is 400', async () => {
    const res = await request(app).patch(`/api/v1/vendors/${VALID_ID}`).set(as('analyst')).send({});
    expect(res.status).toBe(400);
  });
  test('bad list query values are 400', async () => {
    for (const qs of ['limit=1000', 'sort=passwordHash', 'category=bogus', 'page=0', 'status=deleted']) {
      const res = await request(app).get(`/api/v1/vendors?${qs}`).set(as('viewer'));
      expect(res.status).toBe(400);
    }
  });
});

describe('a deactivated account is rejected', () => {
  test('401 when the user is inactive', async () => {
    const headers = as('admin');
    current.user.isActive = false;
    const res = await request(app).get('/api/v1/vendors').set(headers);
    expect(res.status).toBe(401);
  });
});
