// These tests need NO database: they cover request validation, auth rejection,
// error format, and security headers, all of which run before any DB query.
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const { authorize } = require('../../src/middleware/auth');

describe('HTTP basics (no database)', () => {
  test('health check responds ok', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, status: 'ok' });
  });

  test('sets security headers and hides X-Powered-By', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  test('unknown route returns JSON 404', async () => {
    const res = await request(app).get('/api/v1/nope');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('malformed JSON returns 400, not 500', async () => {
    const res = await request(app).post('/api/v1/auth/login').set('Content-Type', 'application/json').send('{bad');
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/malformed/i);
  });

  describe('register validation', () => {
    const valid = { organizationName: 'Acme Ltd', name: 'Asha Rao', email: 'asha@acme.com', password: 'Passw0rdOK' };

    test.each([
      ['short password', { password: 'a1' }, 'password'],
      ['password without number', { password: 'abcdefghij' }, 'password'],
      ['password without letter', { password: '1234567890' }, 'password'],
      ['bad email', { email: 'not-an-email' }, 'email'],
      ['missing organization', { organizationName: '' }, 'organizationName'],
    ])('rejects %s with 400 and field detail', async (_label, override, field) => {
      const res = await request(app).post('/api/v1/auth/register').send({ ...valid, ...override });
      expect(res.status).toBe(400);
      expect(res.body.errors.map((e) => e.field)).toContain(field);
    });

    test('rejects NoSQL operator objects in login fields', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({ email: { $ne: '' }, password: { $ne: '' } });
      expect(res.status).toBe(400);
    });
  });

  describe('authentication rejection', () => {
    test('no token -> 401', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });

    test('garbage token -> 401', async () => {
      const res = await request(app).get('/api/v1/auth/me').set('Authorization', 'Bearer abc.def.ghi');
      expect(res.status).toBe(401);
    });

    test('token signed with wrong secret -> 401', async () => {
      const token = jwt.sign({ role: 'admin' }, 'some-other-secret-some-other-secret-1', { subject: '507f1f77bcf86cd799439011' });
      const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(401);
    });

    test('expired token -> 401', async () => {
      const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { subject: '507f1f77bcf86cd799439011', expiresIn: -10 });
      const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(401);
    });

    test('"alg: none" token -> 401', async () => {
      const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
      const token = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: '507f1f77bcf86cd799439011', role: 'admin' })}.`;
      const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(401);
    });
  });

  describe('authorize middleware', () => {
    const run = (role, allowed) => {
      let result;
      authorize(...allowed)({ user: { role } }, {}, (err) => (result = err || 'passed'));
      return result;
    };

    test('allows a listed role', () => expect(run('manager', ['admin', 'manager'])).toBe('passed'));
    test('blocks an unlisted role with 403', () => {
      const err = run('viewer', ['admin', 'manager']);
      expect(err.statusCode).toBe(403);
    });
  });
});
