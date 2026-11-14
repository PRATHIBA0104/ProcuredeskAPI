// Route-level checks with only the database lookups stubbed. Real: multer, file checks,
// disk writes, headers, role order. (The integration suite repeats the main paths against MongoDB.)
const fs = require('fs');
const path = require('path');
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const env = require('../../src/config/env');
const User = require('../../src/models/User');
const Contract = require('../../src/models/Contract');
const ActivityLog = require('../../src/models/ActivityLog');
const { signToken } = require('../../src/services/auth.service');

const ORG = new mongoose.Types.ObjectId();
const CID = '507f1f77bcf86cd799439011';
const PDF = Buffer.from('%PDF-1.7\nhello contract\n%%EOF');
let current;
let fake;

const as = (role) => {
  const user = { _id: new mongoose.Types.ObjectId(), organizationId: ORG, role, isActive: true, name: `${role} user` };
  current = { user };
  return { Authorization: `Bearer ${signToken(user)}` };
};

function makeFakeContract() {
  const documents = [];
  documents.id = (id) => documents.find((d) => String(d._id) === String(id));
  documents.pull = ({ _id }) => {
    const i = documents.findIndex((d) => String(d._id) === String(_id));
    if (i >= 0) documents.splice(i, 1);
  };
  return {
    _id: CID,
    organizationId: ORG,
    title: 'Enterprise MSA',
    documents,
    save: jest.fn(async () => documents.forEach((d) => { if (!d._id) d._id = new mongoose.Types.ObjectId(); })),
  };
}

beforeEach(() => {
  fake = makeFakeContract();
  jest.spyOn(User, 'findById').mockImplementation(async () => current.user);
  jest.spyOn(Contract, 'findOne').mockImplementation(async () => fake);
  jest.spyOn(ActivityLog, 'create').mockResolvedValue({});
});
afterEach(() => jest.restoreAllMocks());
afterAll(() => fs.rmSync(env.uploadDir, { recursive: true, force: true }));

const upload = (headers, buf, name, field = 'file') =>
  request(app).post(`/api/v1/contracts/${CID}/documents`).set(headers).attach(field, buf, name);
const orgDir = () => path.join(env.uploadDir, String(ORG));

describe('anonymous access', () => {
  test.each([
    ['get', '/api/v1/contracts'],
    ['post', '/api/v1/contracts'],
    ['get', `/api/v1/contracts/${CID}`],
    ['patch', `/api/v1/contracts/${CID}`],
    ['post', `/api/v1/contracts/${CID}/status`],
    ['post', `/api/v1/contracts/${CID}/documents`],
    ['get', `/api/v1/contracts/${CID}/documents/${CID}`],
    ['delete', `/api/v1/contracts/${CID}/documents/${CID}`],
  ])('%s %s -> 401', async (method, url) => {
    expect((await request(app)[method](url)).status).toBe(401);
  });
});

describe('roles are checked before anything else', () => {
  test('viewer cannot create, edit, change status or upload (403 even with invalid input)', async () => {
    const h = as('viewer');
    expect((await request(app).post('/api/v1/contracts').set(h).send({})).status).toBe(403);
    expect((await request(app).patch(`/api/v1/contracts/${CID}`).set(h).send({})).status).toBe(403);
    expect((await request(app).post(`/api/v1/contracts/${CID}/status`).set(h).send({})).status).toBe(403);
    expect((await upload(h, Buffer.from('MZ'), 'virus.exe')).status).toBe(403);
    expect(fake.save).not.toHaveBeenCalled();
  });
  test('analyst can edit but cannot change status or delete documents', async () => {
    const h = as('analyst');
    expect((await request(app).post(`/api/v1/contracts/${CID}/status`).set(h).send({ status: 'terminated' })).status).toBe(403);
    expect((await request(app).delete(`/api/v1/contracts/${CID}/documents/${CID}`).set(h)).status).toBe(403);
  });
});

describe('request validation', () => {
  test('bad id, empty update, bad list query, bad status value', async () => {
    const h = as('manager');
    expect((await request(app).get('/api/v1/contracts/abc').set(h)).status).toBe(400);
    expect((await request(app).patch(`/api/v1/contracts/${CID}`).set(h).send({})).status).toBe(400);
    expect((await request(app).get('/api/v1/contracts?limit=1000').set(h)).status).toBe(400);
    expect((await request(app).get('/api/v1/contracts?status=weird').set(h)).status).toBe(400);
    expect((await request(app).post(`/api/v1/contracts/${CID}/status`).set(h).send({ status: 'draft' })).status).toBe(400);
  });
  test('create lists the failing fields', async () => {
    const res = await request(app).post('/api/v1/contracts').set(as('analyst')).send({ title: 'x', totalValue: -5 });
    expect(res.status).toBe(400);
    expect(res.body.errors.map((e) => e.field)).toEqual(expect.arrayContaining(['vendorId', 'title', 'startDate', 'endDate', 'totalValue']));
  });
});

describe('document upload restrictions', () => {
  test('rejects a disallowed extension before reading the file', async () => {
    const res = await upload(as('analyst'), Buffer.from('MZ...'), 'virus.exe');
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/only pdf, doc and docx/i);
  });
  test('rejects content that does not match the extension', async () => {
    const res = await upload(as('analyst'), Buffer.from('just some text'), 'fake.pdf');
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/does not match/i);
    expect(fs.existsSync(orgDir())).toBe(false); // nothing was written to disk
  });
  test('rejects files over 10 MB', async () => {
    const big = Buffer.concat([Buffer.from('%PDF-'), Buffer.alloc(11 * 1024 * 1024)]);
    const res = await upload(as('analyst'), big, 'huge.pdf');
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/too large/i);
  });
  test('rejects a request with no file, and a file in the wrong form field', async () => {
    const h = as('analyst');
    expect((await request(app).post(`/api/v1/contracts/${CID}/documents`).set(h)).status).toBe(400);
    expect((await upload(h, PDF, 'a.pdf', 'attachment')).status).toBe(400);
  });
});

describe('document upload, download and removal', () => {
  test('stores the file under a random name inside the organization folder', async () => {
    const res = await upload(as('analyst'), PDF, 'Enterprise MSA.pdf');
    expect(res.status).toBe(201);
    expect(res.body.document).toMatchObject({ originalName: 'Enterprise MSA.pdf', mimeType: 'application/pdf', size: PDF.length });

    const stored = fake.documents[0].storedName;
    expect(stored).toMatch(/^[0-9a-f-]{36}\.pdf$/); // random uuid, never the client's name
    expect(fs.readFileSync(path.join(orgDir(), stored)).equals(PDF)).toBe(true);
  });

  test('a path-traversal file name cannot escape: it is sanitised and the disk name is random', async () => {
    const res = await upload(as('analyst'), PDF, '../../evil.pdf');
    expect(res.status).toBe(201);
    expect(res.body.document.originalName).toBe('evil.pdf');
    const written = fs.readdirSync(orgDir());
    expect(written.every((f) => /^[0-9a-f-]{36}\.pdf$/.test(f))).toBe(true);
    expect(fs.existsSync(path.join(env.uploadDir, 'evil.pdf'))).toBe(false);
    expect(fs.existsSync(path.join(env.uploadDir, '..', 'evil.pdf'))).toBe(false);
  });

  test('a viewer can download: attachment header, original name, exact bytes', async () => {
    await upload(as('analyst'), PDF, 'Enterprise MSA.pdf');
    const doc = fake.documents[0];
    const res = await request(app).get(`/api/v1/contracts/${CID}/documents/${doc._id}`).set(as('viewer')).buffer(true).parse((r, cb) => {
      const chunks = [];
      r.on('data', (c) => chunks.push(c));
      r.on('end', () => cb(null, Buffer.concat(chunks)));
    });
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="Enterprise MSA\.pdf"/);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.body.equals(PDF)).toBe(true);
  });

  test('unknown document id is 404; missing file on disk is 404', async () => {
    const h = as('viewer');
    expect((await request(app).get(`/api/v1/contracts/${CID}/documents/${new mongoose.Types.ObjectId()}`).set(h)).status).toBe(404);
    fake.documents.push({ _id: new mongoose.Types.ObjectId(), originalName: 'gone.pdf', storedName: 'does-not-exist.pdf', mimeType: 'application/pdf', size: 1 });
    expect((await request(app).get(`/api/v1/contracts/${CID}/documents/${fake.documents[0]._id}`).set(h)).status).toBe(404);
  });

  test('a manager can remove a document and its file is deleted', async () => {
    await upload(as('analyst'), PDF, 'a.pdf');
    const doc = fake.documents[0];
    const file = path.join(orgDir(), doc.storedName);
    expect(fs.existsSync(file)).toBe(true);
    const res = await request(app).delete(`/api/v1/contracts/${CID}/documents/${doc._id}`).set(as('manager'));
    expect(res.status).toBe(200);
    expect(fake.documents).toHaveLength(0);
    expect(fs.existsSync(file)).toBe(false);
  });

  test('if saving to the database fails, the just-written file is cleaned up', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {}); // the server logs this error on purpose
    fake.save.mockRejectedValueOnce(new Error('db down'));
    const before = fs.existsSync(orgDir()) ? fs.readdirSync(orgDir()).length : 0;
    const res = await upload(as('analyst'), PDF, 'a.pdf');
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Internal server error'); // internals are not leaked
    const after = fs.existsSync(orgDir()) ? fs.readdirSync(orgDir()).length : 0;
    expect(after).toBe(before);
  });

  test('a contract holds at most 20 documents', async () => {
    for (let i = 0; i < 20; i += 1) fake.documents.push({ _id: new mongoose.Types.ObjectId(), originalName: `${i}.pdf`, storedName: `${i}.pdf`, mimeType: 'application/pdf', size: 1 });
    const res = await upload(as('analyst'), PDF, 'one-more.pdf');
    expect(res.status).toBe(409);
  });
});
