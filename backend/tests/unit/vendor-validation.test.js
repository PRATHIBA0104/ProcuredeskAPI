// No database needed: tests request validation rules and Mongoose schema validation.
const request = require('supertest');
const app = require('../../src/app');
const Vendor = require('../../src/models/Vendor');
const Contract = require('../../src/models/Contract');
const v = require('../../src/validators/vendor.validators');

describe('vendor routes reject anonymous access', () => {
  test.each([
    ['get', '/api/v1/vendors'],
    ['post', '/api/v1/vendors'],
    ['get', '/api/v1/vendors/507f1f77bcf86cd799439011'],
    ['patch', '/api/v1/vendors/507f1f77bcf86cd799439011'],
    ['post', '/api/v1/vendors/507f1f77bcf86cd799439011/deactivate'],
    ['post', '/api/v1/vendors/507f1f77bcf86cd799439011/activate'],
  ])('%s %s -> 401', async (method, url) => {
    const res = await request(app)[method](url);
    expect(res.status).toBe(401);
  });
});

describe('create / update body schemas', () => {
  test('create requires a name', () => {
    expect(v.createVendorSchema.safeParse({ category: 'software' }).success).toBe(false);
  });

  test('create does NOT inject defaults (so PATCH can never reset fields)', () => {
    const parsed = v.createVendorSchema.parse({ name: 'Slack' });
    expect(parsed).toEqual({ name: 'Slack' });
  });

  test('update with only one field keeps the others absent', () => {
    expect(v.updateVendorSchema.parse({ notes: 'hello' })).toEqual({ notes: 'hello' });
  });

  test('update with no fields is rejected', () => {
    expect(v.updateVendorSchema.safeParse({}).success).toBe(false);
  });

  test('"inactive" cannot be set through create or update', () => {
    expect(v.createVendorSchema.safeParse({ name: 'Slack', status: 'inactive' }).success).toBe(false);
    expect(v.updateVendorSchema.safeParse({ status: 'inactive' }).success).toBe(false);
  });

  test('organizationId and createdBy in the body are stripped', () => {
    const parsed = v.createVendorSchema.parse({ name: 'Slack', organizationId: '507f1f77bcf86cd799439011', createdBy: 'x' });
    expect(parsed.organizationId).toBeUndefined();
    expect(parsed.createdBy).toBeUndefined();
  });

  test('rejects unknown category, bad website, javascript: URLs, two primary contacts', () => {
    expect(v.createVendorSchema.safeParse({ name: 'Slack', category: 'bogus' }).success).toBe(false);
    expect(v.createVendorSchema.safeParse({ name: 'Slack', website: 'slack' }).success).toBe(false);
    expect(v.createVendorSchema.safeParse({ name: 'Slack', website: 'javascript:alert(1)' }).success).toBe(false);
    expect(
      v.createVendorSchema.safeParse({
        name: 'Slack',
        contacts: [{ name: 'A', isPrimary: true }, { name: 'B', isPrimary: true }],
      }).success
    ).toBe(false);
  });

  test('accepts a complete valid vendor, empty website allowed', () => {
    const ok = v.createVendorSchema.safeParse({
      name: '  Slack Technologies ',
      category: 'software',
      status: 'prospect',
      website: 'https://slack.com',
      contacts: [{ name: 'Priya', email: 'Priya@Slack.com', isPrimary: true }],
    });
    expect(ok.success).toBe(true);
    expect(ok.data.name).toBe('Slack Technologies');
    expect(ok.data.contacts[0].email).toBe('priya@slack.com');
    expect(v.createVendorSchema.safeParse({ name: 'Slack', website: '' }).success).toBe(true);
  });
});

describe('list query schema', () => {
  test('applies defaults and coerces numbers', () => {
    const q = v.listVendorsQuery.parse({ page: '2', limit: '25' });
    expect(q).toMatchObject({ page: 2, limit: 25, sort: '-createdAt' });
  });
  test('caps limit at 100 and rejects unknown sort fields', () => {
    expect(v.listVendorsQuery.safeParse({ limit: '1000' }).success).toBe(false);
    expect(v.listVendorsQuery.safeParse({ sort: 'passwordHash' }).success).toBe(false);
    expect(v.listVendorsQuery.safeParse({ page: '0' }).success).toBe(false);
  });
  test('rejects operator objects such as ?search[$ne]=x', () => {
    expect(v.listVendorsQuery.safeParse({ search: { $ne: '' } }).success).toBe(false);
  });
});

describe('id params', () => {
  test('rejects a non-ObjectId id with 400 (after auth, so check the schema directly)', () => {
    expect(v.idParams.safeParse({ id: 'abc' }).success).toBe(false);
    expect(v.idParams.safeParse({ id: '507f1f77bcf86cd799439011' }).success).toBe(true);
  });
});

describe('Mongoose schema validation (no connection needed)', () => {
  const org = '507f1f77bcf86cd799439011';

  test('Vendor derives nameKey from name', async () => {
    const vendor = new Vendor({ organizationId: org, name: '  Slack Technologies ' });
    await vendor.validate();
    expect(vendor.nameKey).toBe('slack technologies');
    expect(vendor.category).toBe('other');
    expect(vendor.status).toBe('active');
    expect(vendor.toJSON().nameKey).toBeUndefined();
  });

  test('Vendor requires a name', async () => {
    await expect(new Vendor({ organizationId: org }).validate()).rejects.toThrow(/name/i);
  });

  test('Contract requires dates and value, and endDate must follow startDate', async () => {
    const base = { organizationId: org, vendorId: org, title: 'MSA 2026', totalValue: 1000000 };
    await expect(new Contract({ ...base }).validate()).rejects.toThrow(/start date/i);
    await expect(
      new Contract({ ...base, startDate: '2026-06-01', endDate: '2026-05-01' }).validate()
    ).rejects.toThrow(/after the start date/i);
    const ok = new Contract({ ...base, startDate: '2026-01-01', endDate: '2026-12-31' });
    await expect(ok.validate()).resolves.toBeUndefined();
    expect(ok.status).toBe('draft');
    expect(ok.currency).toBe('INR');
  });

  test('contract number uniqueness uses a partial index, so number-less contracts never clash', () => {
    const idx = Contract.schema.indexes().find(([keys]) => keys.contractNumber === 1);
    expect(idx).toBeTruthy();
    expect(idx[1].unique).toBe(true);
    expect(idx[1].sparse).toBeUndefined();
    expect(idx[1].partialFilterExpression).toEqual({ contractNumber: { $type: 'string' } });
  });

  test('Contract rejects negative money and unknown status', async () => {
    const base = { organizationId: org, vendorId: org, title: 'MSA', startDate: '2026-01-01', endDate: '2026-12-31' };
    await expect(new Contract({ ...base, totalValue: -5 }).validate()).rejects.toThrow();
    await expect(new Contract({ ...base, totalValue: 5, status: 'bogus' }).validate()).rejects.toThrow();
  });
});
