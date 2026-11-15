// Database-free tests for the dashboard numbers (pure function).
const { computeSummary } = require('../../src/services/dashboard.summary');

const NOW = new Date('2026-06-01T00:00:00.000Z');
const DAY = 86400000;
const at = (n) => new Date(NOW.getTime() + n * DAY);

const vendors = [
  { _id: 'v1', name: 'Slack', category: 'software', status: 'active' },
  { _id: 'v2', name: 'AWS', category: 'cloud_infrastructure', status: 'active' },
  { _id: 'v3', name: 'Old Co', category: 'other', status: 'inactive' },
  { _id: 'v4', name: 'Prospect Inc', category: 'security', status: 'prospect' },
];
const c = (over) => ({ _id: String(Math.random()), vendorId: 'v1', title: 'T', status: 'active', startDate: at(-100), endDate: at(300), noticePeriodDays: 30, annualValue: 100, autoRenew: false, ...over });

describe('computeSummary', () => {
  test('empty organization gives zeros and empty lists', () => {
    const s = computeSummary({ vendors: [], contracts: [], activity: [] }, NOW);
    expect(s.kpis).toEqual({ activeVendors: 0, totalVendors: 0, activeContracts: 0, expiringContracts: 0, annualCommitment: 0, noticeAlerts: 0 });
    expect(s.upcomingRenewals).toEqual([]);
    expect(s.spendByCategory).toEqual([]);
    expect(s.recentActivity).toEqual([]);
  });

  test('counts vendors by status', () => {
    const s = computeSummary({ vendors, contracts: [], activity: [] }, NOW);
    expect(s.kpis.activeVendors).toBe(2);
    expect(s.kpis.totalVendors).toBe(4);
  });

  test('"in force" is active + expiring; draft, terminated and expired are excluded from value', () => {
    const contracts = [
      c({ annualValue: 100 }), // active
      c({ endDate: at(40), annualValue: 50 }), // expiring
      c({ status: 'draft', annualValue: 999 }),
      c({ status: 'terminated', annualValue: 999 }),
      c({ endDate: at(-5), annualValue: 999 }), // stored active but past end date -> expired
    ];
    const s = computeSummary({ vendors, contracts, activity: [] }, NOW);
    expect(s.kpis.activeContracts).toBe(2);
    expect(s.kpis.expiringContracts).toBe(1);
    expect(s.kpis.annualCommitment).toBe(150);
    expect(s.statusCounts).toEqual({ draft: 1, active: 1, expiring: 1, expired: 1, terminated: 1 });
  });

  test('upcoming renewals are only expiring contracts, soonest first, with notice deadline', () => {
    const contracts = [
      c({ title: 'later', endDate: at(80), noticePeriodDays: 30 }),
      c({ title: 'sooner', endDate: at(20), noticePeriodDays: 30 }),
      c({ title: 'far', endDate: at(200) }),
    ];
    const s = computeSummary({ vendors, contracts, activity: [] }, NOW);
    expect(s.upcomingRenewals.map((r) => r.title)).toEqual(['sooner', 'later']);
    const first = s.upcomingRenewals[0];
    expect(first.vendorName).toBe('Slack');
    expect(first.daysToExpiry).toBe(20);
    expect(first.daysToNoticeDeadline).toBe(-10); // notice deadline (day -10) already passed
  });

  test('notice alerts count expiring contracts whose notice deadline is within 30 days or passed', () => {
    const contracts = [
      c({ endDate: at(40), noticePeriodDays: 30 }), // deadline in 10 days -> alert
      c({ endDate: at(85), noticePeriodDays: 30 }), // deadline in 55 days -> no
      c({ endDate: at(10), noticePeriodDays: 30 }), // deadline passed -> alert
    ];
    expect(computeSummary({ vendors, contracts, activity: [] }, NOW).kpis.noticeAlerts).toBe(2);
  });

  test('spend by category sums annual value per vendor category, largest first', () => {
    const contracts = [c({ vendorId: 'v1', annualValue: 100 }), c({ vendorId: 'v2', annualValue: 500 }), c({ vendorId: 'v1', annualValue: 50 })];
    const s = computeSummary({ vendors, contracts, activity: [] }, NOW);
    expect(s.spendByCategory).toEqual([
      { category: 'cloud_infrastructure', annualValue: 500, contracts: 1 },
      { category: 'software', annualValue: 150, contracts: 2 },
    ]);
  });

  test('contract with a missing vendor falls into "other" and does not crash', () => {
    const s = computeSummary({ vendors, contracts: [c({ vendorId: 'ghost', endDate: at(10) })], activity: [] }, NOW);
    expect(s.spendByCategory[0].category).toBe('other');
    expect(s.upcomingRenewals[0].vendorName).toBe('Unknown vendor');
  });

  test('renewal list is capped at 8', () => {
    const contracts = Array.from({ length: 12 }, (_, i) => c({ endDate: at(5 + i) }));
    expect(computeSummary({ vendors, contracts, activity: [] }, NOW).upcomingRenewals).toHaveLength(8);
  });

  test('sums money without floating point drift', () => {
    const contracts = [c({ annualValue: 0.1 }), c({ annualValue: 0.2 })];
    expect(computeSummary({ vendors, contracts, activity: [] }, NOW).kpis.annualCommitment).toBe(0.3);
  });

  test('activity is passed through with only safe fields', () => {
    const activity = [{ _id: 'a', action: 'create', entityType: 'vendor', entityId: 'x', summary: 's', userName: 'U', createdAt: NOW, organizationId: 'secret', userId: 'secret' }];
    const out = computeSummary({ vendors, contracts: [], activity }, NOW).recentActivity[0];
    expect(out).not.toHaveProperty('organizationId');
    expect(out).not.toHaveProperty('userId');
    expect(out.summary).toBe('s');
  });
});
