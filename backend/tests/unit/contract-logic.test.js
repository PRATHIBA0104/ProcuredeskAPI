// No database needed: date/status logic, file checks, request schemas and model rules.
const {
  effectiveStatus,
  daysUntil,
  noticeDeadline,
  decorate,
  statusFilter,
  deriveAnnualValue,
  TRANSITIONS,
  DAY_MS,
} = require('../../src/services/contractStatus');
const { detectFileType, sanitizeFilename, hasAllowedExtension } = require('../../src/utils/fileValidation');
const v = require('../../src/validators/contract.validators');
const Contract = require('../../src/models/Contract');

const NOW = new Date('2026-11-14T00:00:00Z');
const inDays = (d) => new Date(NOW.getTime() + d * DAY_MS);
const ORG = '507f1f77bcf86cd799439011';

describe('effectiveStatus (computed, never stored)', () => {
  test('an active contract moves active -> expiring -> expired as the calendar moves', () => {
    expect(effectiveStatus({ status: 'active', endDate: inDays(200) }, NOW)).toBe('active');
    expect(effectiveStatus({ status: 'active', endDate: inDays(91) }, NOW)).toBe('active');
    expect(effectiveStatus({ status: 'active', endDate: inDays(90) }, NOW)).toBe('expiring');
    expect(effectiveStatus({ status: 'active', endDate: inDays(1) }, NOW)).toBe('expiring');
    expect(effectiveStatus({ status: 'active', endDate: NOW }, NOW)).toBe('expiring'); // ends today = still in force
    expect(effectiveStatus({ status: 'active', endDate: inDays(-1) }, NOW)).toBe('expired');
  });
  test('draft and terminated never change with the date', () => {
    expect(effectiveStatus({ status: 'draft', endDate: inDays(-100) }, NOW)).toBe('draft');
    expect(effectiveStatus({ status: 'terminated', endDate: inDays(30) }, NOW)).toBe('terminated');
  });
});

describe('date helpers', () => {
  test('daysUntil counts whole days, negative in the past', () => {
    expect(daysUntil(inDays(6), NOW)).toBe(6);
    expect(daysUntil(inDays(-3), NOW)).toBe(-3);
  });
  test('noticeDeadline = end date minus notice period', () => {
    const d = noticeDeadline({ endDate: new Date('2027-01-31T00:00:00Z'), noticePeriodDays: 30 });
    expect(d.toISOString().slice(0, 10)).toBe('2027-01-01');
  });
  test('decorate adds computed fields and falls back to endDate for the renewal date', () => {
    const c = decorate({ status: 'active', endDate: inDays(45), noticePeriodDays: 30 }, NOW);
    expect(c.effectiveStatus).toBe('expiring');
    expect(c.daysToExpiry).toBe(45);
    expect(c.daysToNoticeDeadline).toBe(15);
    expect(c.nextRenewalDate).toEqual(c.endDate);
    const withRenewal = decorate({ status: 'active', endDate: inDays(45), renewalDate: inDays(40), noticePeriodDays: 0 }, NOW);
    expect(withRenewal.nextRenewalDate).toEqual(inDays(40));
  });
  test('a missed notice deadline shows as negative days', () => {
    const c = decorate({ status: 'active', endDate: inDays(10), noticePeriodDays: 30 }, NOW);
    expect(c.daysToNoticeDeadline).toBe(-20);
  });
});

describe('statusFilter (MongoDB conditions)', () => {
  test('active means in force (includes expiring); expiring is the subset ending within 90 days', () => {
    expect(statusFilter('active', NOW)).toEqual({ status: 'active', endDate: { $gte: NOW } });
    expect(statusFilter('expiring', NOW)).toEqual({ status: 'active', endDate: { $gte: NOW, $lte: inDays(90) } });
  });
  test('expired covers both stored-expired and active-but-past-end', () => {
    expect(statusFilter('expired', NOW)).toEqual({ $or: [{ status: 'expired' }, { status: 'active', endDate: { $lt: NOW } }] });
  });
  test('draft, terminated and unknown', () => {
    expect(statusFilter('draft', NOW)).toEqual({ status: 'draft' });
    expect(statusFilter('terminated', NOW)).toEqual({ status: 'terminated' });
    expect(statusFilter(undefined, NOW)).toEqual({});
  });
});

describe('annual value derivation', () => {
  test('spreads the total over multi-year contracts', () => {
    const a = deriveAnnualValue(3000000, new Date('2026-01-01'), new Date('2029-01-01'));
    expect(Math.abs(a - 1000000)).toBeLessThan(2000);
  });
  test('keeps the total for contracts shorter than a year (never inflates)', () => {
    expect(deriveAnnualValue(600000, new Date('2026-01-01'), new Date('2026-07-01'))).toBe(600000);
  });
});

describe('status transitions', () => {
  test('only forward moves are allowed', () => {
    expect(TRANSITIONS.draft).toEqual(['active', 'terminated']);
    expect(TRANSITIONS.active).toEqual(['terminated']);
    expect(TRANSITIONS.terminated).toEqual([]);
  });
});

describe('file validation', () => {
  const pdf = Buffer.from('%PDF-1.7\n...');
  const docx = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from('rest')]);
  const doc = Buffer.concat([Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]), Buffer.from('rest')]);

  test('accepts real PDF, DOCX and DOC content with matching extensions', () => {
    expect(detectFileType(pdf, 'MSA.PDF')).toEqual({ ext: '.pdf', mime: 'application/pdf' });
    expect(detectFileType(docx, 'terms.docx').ext).toBe('.docx');
    expect(detectFileType(doc, 'old.doc').ext).toBe('.doc');
  });
  test('rejects a mismatch between extension and content', () => {
    expect(detectFileType(Buffer.from('MZ executable'), 'virus.pdf')).toBeNull();
    expect(detectFileType(pdf, 'x.docx')).toBeNull();
    expect(detectFileType(Buffer.from('plain text'), 'notes.pdf')).toBeNull();
  });
  test('rejects other extensions and tiny or non-buffer input', () => {
    expect(detectFileType(pdf, 'run.exe')).toBeNull();
    expect(detectFileType(pdf, 'noextension')).toBeNull();
    expect(detectFileType(Buffer.from('%PD'), 'a.pdf')).toBeNull();
    expect(detectFileType('%PDF-', 'a.pdf')).toBeNull();
  });
  test('extension check is case-insensitive and rejects double-extension tricks', () => {
    expect(hasAllowedExtension('a.PDF')).toBe(true);
    expect(hasAllowedExtension('a.pdf.exe')).toBe(false);
    expect(hasAllowedExtension('a.exe.pdf')).toBe(true); // allowed by name; the content check decides
    expect(detectFileType(Buffer.from('MZ'), 'a.exe.pdf')).toBeNull();
  });
  test('sanitizeFilename strips folders and control characters', () => {
    expect(sanitizeFilename('../../etc/passwd.pdf')).toBe('passwd.pdf');
    expect(sanitizeFilename('C:\\Users\\me\\contract.pdf')).toBe('contract.pdf');
    expect(sanitizeFilename('bad\u0000name<>.pdf')).toBe('badname.pdf');
    expect(sanitizeFilename('')).toBe('document');
    expect(sanitizeFilename('a'.repeat(300) + '.pdf').length).toBeLessThanOrEqual(150);
  });
});

describe('contract request schemas', () => {
  const valid = { vendorId: ORG, title: 'Enterprise MSA', startDate: '2026-04-01', endDate: '2027-03-31', totalValue: 1000000 };

  test('create parses dates into Date objects and injects no defaults', () => {
    const p = v.createContractSchema.parse(valid);
    expect(p.startDate).toBeInstanceOf(Date);
    expect(Object.keys(p).sort()).toEqual(['endDate', 'startDate', 'title', 'totalValue', 'vendorId']);
  });
  test('create requires vendor, title, dates and total value', () => {
    for (const key of ['vendorId', 'title', 'startDate', 'endDate', 'totalValue']) {
      const { [key]: _omit, ...rest } = valid;
      expect(v.createContractSchema.safeParse(rest).success).toBe(false);
    }
  });
  test('rejects end date on or before start date', () => {
    expect(v.createContractSchema.safeParse({ ...valid, endDate: '2026-04-01' }).success).toBe(false);
    expect(v.createContractSchema.safeParse({ ...valid, endDate: '2026-01-01' }).success).toBe(false);
  });
  test('rejects impossible and malformed dates', () => {
    for (const bad of ['2026-02-30', '2026-13-01', 'tomorrow', '', '01/04/2026', null]) {
      expect(v.createContractSchema.safeParse({ ...valid, startDate: bad }).success).toBe(false);
    }
  });
  test('rejects negative or non-numeric money, and numbers sent as strings', () => {
    expect(v.createContractSchema.safeParse({ ...valid, totalValue: -1 }).success).toBe(false);
    expect(v.createContractSchema.safeParse({ ...valid, totalValue: '1000' }).success).toBe(false);
    expect(v.createContractSchema.safeParse({ ...valid, annualValue: -5 }).success).toBe(false);
  });
  test('rejects bad enums, "terminated"/"expired" on create, and a malformed vendorId', () => {
    expect(v.createContractSchema.safeParse({ ...valid, pricingModel: 'bogus' }).success).toBe(false);
    expect(v.createContractSchema.safeParse({ ...valid, paymentTerms: 'whenever' }).success).toBe(false);
    expect(v.createContractSchema.safeParse({ ...valid, status: 'terminated' }).success).toBe(false);
    expect(v.createContractSchema.safeParse({ ...valid, vendorId: 'abc' }).success).toBe(false);
  });
  test('organizationId and createdBy in the body are stripped', () => {
    const p = v.createContractSchema.parse({ ...valid, organizationId: ORG, createdBy: ORG });
    expect(p.organizationId).toBeUndefined();
    expect(p.createdBy).toBeUndefined();
  });
  test('update cannot change vendorId or status, and an empty update is rejected', () => {
    expect(v.updateContractSchema.parse({ notes: 'x', vendorId: ORG, status: 'active' })).toEqual({ notes: 'x' });
    expect(v.updateContractSchema.safeParse({}).success).toBe(false);
  });
  test('status endpoint only accepts active or terminated', () => {
    expect(v.changeStatusSchema.safeParse({ status: 'terminated' }).success).toBe(true);
    expect(v.changeStatusSchema.safeParse({ status: 'draft' }).success).toBe(false);
    expect(v.changeStatusSchema.safeParse({ status: 'expired' }).success).toBe(false);
  });
  test('list query defaults, coercion and limits', () => {
    expect(v.listContractsQuery.parse({})).toMatchObject({ page: 1, limit: 10, sort: 'endDate' });
    expect(v.listContractsQuery.parse({ endingWithin: '60' }).endingWithin).toBe(60);
    expect(v.listContractsQuery.safeParse({ endingWithin: '5000' }).success).toBe(false);
    expect(v.listContractsQuery.safeParse({ status: 'bogus' }).success).toBe(false);
    expect(v.listContractsQuery.safeParse({ sort: 'documents' }).success).toBe(false);
    expect(v.listContractsQuery.safeParse({ vendorId: { $ne: null } }).success).toBe(false);
  });
});

describe('Contract model rules (no connection needed)', () => {
  const base = { organizationId: ORG, vendorId: ORG, title: 'MSA', startDate: '2026-01-01', endDate: '2027-01-01', totalValue: 2400000 };

  test('derives annual value when none is given', async () => {
    const c = new Contract(base);
    await c.validate();
    expect(c.annualValueDerived).toBe(true);
    expect(c.annualValue).toBeGreaterThan(0);
    expect(c.annualValue).toBeLessThanOrEqual(2400000);
  });
  test('a new contract created WITH an annual value keeps it', async () => {
    const c = new Contract({ ...base, annualValue: 500000 });
    await c.validate();
    expect(c.annualValue).toBe(500000);
    expect(c.annualValueDerived).toBe(false);
  });
  test('toJSON hides internals but keeps computed money fields', async () => {
    const c = new Contract(base);
    await c.validate();
    const json = c.toJSON();
    expect(json.annualValueDerived).toBeUndefined();
    expect(json.__v).toBeUndefined();
    expect(json.annualValue).toBeDefined();
  });
  test('renewal date must fall between start and end', async () => {
    await expect(new Contract({ ...base, renewalDate: '2025-12-01' }).validate()).rejects.toThrow(/renewal date/i);
    await expect(new Contract({ ...base, renewalDate: '2027-02-01' }).validate()).rejects.toThrow(/renewal date/i);
    await expect(new Contract({ ...base, renewalDate: '2026-12-01' }).validate()).resolves.toBeUndefined();
  });
  test('moving ONLY the start date past the end date is caught on an existing contract', async () => {
    const existing = Contract.hydrate({ ...base, startDate: new Date('2026-01-01'), endDate: new Date('2027-01-01') });
    existing.startDate = new Date('2027-06-01');
    await expect(existing.validate()).rejects.toThrow(/after the start date/i);
  });
  test('a derived annual value follows the dates when they change; a user-set one does not', async () => {
    const derived = Contract.hydrate({ ...base, startDate: new Date('2026-01-01'), endDate: new Date('2028-01-01'), annualValue: 1200000, annualValueDerived: true });
    derived.endDate = new Date('2030-01-01');
    await derived.validate();
    expect(derived.annualValue).toBeLessThan(1200000);

    const manual = Contract.hydrate({ ...base, startDate: new Date('2026-01-01'), endDate: new Date('2028-01-01'), annualValue: 777, annualValueDerived: false });
    manual.endDate = new Date('2030-01-01');
    await manual.validate();
    expect(manual.annualValue).toBe(777);
  });
  test('document JSON never exposes the stored file name', async () => {
    const c = new Contract({ ...base, documents: [{ originalName: 'a.pdf', storedName: 'secret-uuid.pdf', mimeType: 'application/pdf', size: 5 }] });
    await c.validate();
    expect(JSON.stringify(c.toJSON())).not.toMatch(/secret-uuid/);
  });
});
