// Integration tests against a real (in-memory) MongoDB. Run with: npm test
const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const User = require('../src/models/User');
const Organization = require('../src/models/Organization');
const db = require('./helpers/db');

const payload = { organizationName: 'Acme Ltd', name: 'Asha Rao', email: 'asha@acme.com', password: 'Passw0rdOK' };

beforeAll(db.connect, 300000); // generous: first run may download a MongoDB binary
afterEach(db.clear);
afterAll(db.disconnect);

describe('POST /auth/register', () => {
  test('creates organization + admin user and returns a token', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.role).toBe('admin');
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(await Organization.countDocuments()).toBe(1);
  });

  test('stores a bcrypt hash, never the plain password', async () => {
    await request(app).post('/api/v1/auth/register').send(payload);
    const user = await User.findOne({ email: payload.email }).select('+passwordHash');
    expect(user.passwordHash).not.toContain(payload.password);
    expect(await bcrypt.compare(payload.password, user.passwordHash)).toBe(true);
  });

  test('rejects a duplicate email with 409 and leaves no orphan organization', async () => {
    await request(app).post('/api/v1/auth/register').send(payload);
    const res = await request(app).post('/api/v1/auth/register').send(payload);
    expect(res.status).toBe(409);
    expect(await Organization.countDocuments()).toBe(1);
  });

  test('email is case-insensitive', async () => {
    await request(app).post('/api/v1/auth/register').send(payload);
    const res = await request(app).post('/api/v1/auth/register').send({ ...payload, email: 'ASHA@ACME.COM' });
    expect(res.status).toBe(409);
  });
});

describe('POST /auth/login', () => {
  beforeEach(() => request(app).post('/api/v1/auth/register').send(payload));

  test('logs in with correct credentials', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: payload.email, password: payload.password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  test('wrong password and unknown email give the same 401 message', async () => {
    const a = await request(app).post('/api/v1/auth/login').send({ email: payload.email, password: 'WrongPass1' });
    const b = await request(app).post('/api/v1/auth/login').send({ email: 'nobody@x.com', password: 'WrongPass1' });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body.message).toBe(b.body.message);
  });

  test('deactivated user cannot log in', async () => {
    await User.updateOne({ email: payload.email }, { isActive: false });
    const res = await request(app).post('/api/v1/auth/login').send({ email: payload.email, password: payload.password });
    expect(res.status).toBe(403);
  });
});

describe('GET/PATCH /auth/me and change-password', () => {
  let token;
  beforeEach(async () => {
    const res = await request(app).post('/api/v1/auth/register').send(payload);
    token = res.body.token;
  });
  const auth = () => ({ Authorization: `Bearer ${token}` });

  test('returns the current user', async () => {
    const res = await request(app).get('/api/v1/auth/me').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(payload.email);
    expect(res.body.organization.name).toBe('Acme Ltd');
  });

  test('updates profile name', async () => {
    const res = await request(app).patch('/api/v1/auth/me').set(auth()).send({ name: 'Asha R' });
    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('Asha R');
  });

  test('cannot escalate role through profile update', async () => {
    const res = await request(app).patch('/api/v1/auth/me').set(auth()).send({ role: 'viewer', name: 'Asha R' });
    expect(res.status).toBe(200);
    const user = await User.findOne({ email: payload.email });
    expect(user.role).toBe('admin'); // unchanged; "role" is ignored, not applied
  });

  test('changes password and old one stops working', async () => {
    const ok = await request(app)
      .post('/api/v1/auth/change-password')
      .set(auth())
      .send({ currentPassword: payload.password, newPassword: 'NewPassw0rd' });
    expect(ok.status).toBe(200);
    const oldLogin = await request(app).post('/api/v1/auth/login').send({ email: payload.email, password: payload.password });
    const newLogin = await request(app).post('/api/v1/auth/login').send({ email: payload.email, password: 'NewPassw0rd' });
    expect(oldLogin.status).toBe(401);
    expect(newLogin.status).toBe(200);
  });

  test('rejects change-password with wrong current password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/change-password')
      .set(auth())
      .send({ currentPassword: 'WrongPass1', newPassword: 'NewPassw0rd' });
    expect(res.status).toBe(400);
  });

  test('token stops working once the user is deactivated', async () => {
    await User.updateOne({ email: payload.email }, { isActive: false });
    const res = await request(app).get('/api/v1/auth/me').set(auth());
    expect(res.status).toBe(401);
  });
});
