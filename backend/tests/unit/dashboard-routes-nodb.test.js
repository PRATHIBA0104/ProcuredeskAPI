// The dashboard route is mounted and protected (no database needed: authentication fails first).
const request = require('supertest');
const app = require('../../src/app');

describe('GET /api/v1/dashboard/summary (no database)', () => {
  test('rejects a request without a token', async () => {
    const res = await request(app).get('/api/v1/dashboard/summary');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
  test('rejects a malformed token', async () => {
    const res = await request(app).get('/api/v1/dashboard/summary').set('Authorization', 'Bearer not.a.token');
    expect(res.status).toBe(401);
  });
});
