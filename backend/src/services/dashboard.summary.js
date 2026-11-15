// Pure function (no database): turns an organization's vendors, contracts and activity into the
// dashboard numbers. Kept separate from the database code so it can be unit-tested exactly.
const { effectiveStatus, daysUntil, noticeDeadline, DAY_MS, EXPIRING_WINDOW_DAYS } = require('./contractStatus');

const RENEWAL_LIST_SIZE = 8;
const NOTICE_ALERT_DAYS = 30;

function round2(n) {
  return Math.round(n * 100) / 100;
}

function computeSummary({ vendors, contracts, activity }, now = new Date()) {
  const vendorById = new Map(vendors.map((v) => [String(v._id), v]));

  const statusCounts = { draft: 0, active: 0, expiring: 0, expired: 0, terminated: 0 };
  const byCategory = new Map();
  let annualCommitment = 0;
  let inForce = 0;
  const upcoming = [];

  for (const c of contracts) {
    const status = effectiveStatus(c, now);
    statusCounts[status] += 1;
    const isInForce = status === 'active' || status === 'expiring';
    if (!isInForce) continue;

    inForce += 1;
    const annual = c.annualValue || 0;
    annualCommitment += annual;

    const vendor = vendorById.get(String(c.vendorId));
    const category = vendor ? vendor.category : 'other';
    const row = byCategory.get(category) || { category, annualValue: 0, contracts: 0 };
    row.annualValue += annual;
    row.contracts += 1;
    byCategory.set(category, row);

    if (status === 'expiring') {
      const deadline = noticeDeadline(c);
      upcoming.push({
        _id: c._id,
        title: c.title,
        vendorId: c.vendorId,
        vendorName: vendor ? vendor.name : 'Unknown vendor',
        endDate: c.endDate,
        daysToExpiry: daysUntil(c.endDate, now),
        noticeDeadline: deadline,
        daysToNoticeDeadline: daysUntil(deadline, now),
        annualValue: annual,
        autoRenew: Boolean(c.autoRenew),
        effectiveStatus: status,
      });
    }
  }

  upcoming.sort((a, b) => new Date(a.endDate) - new Date(b.endDate));

  return {
    asOf: now.toISOString(),
    expiringWindowDays: EXPIRING_WINDOW_DAYS,
    kpis: {
      activeVendors: vendors.filter((v) => v.status === 'active').length,
      totalVendors: vendors.length,
      activeContracts: inForce, // in force = active + expiring
      expiringContracts: statusCounts.expiring,
      annualCommitment: round2(annualCommitment),
      // notice deadline falling in the next 30 days (or already passed while the contract is still in force)
      noticeAlerts: upcoming.filter((u) => u.daysToNoticeDeadline <= NOTICE_ALERT_DAYS).length,
    },
    statusCounts,
    spendByCategory: [...byCategory.values()]
      .map((r) => ({ ...r, annualValue: round2(r.annualValue) }))
      .sort((a, b) => b.annualValue - a.annualValue),
    upcomingRenewals: upcoming.slice(0, RENEWAL_LIST_SIZE),
    recentActivity: activity.map((a) => ({
      _id: a._id,
      action: a.action,
      entityType: a.entityType,
      entityId: a.entityId,
      summary: a.summary,
      userName: a.userName,
      createdAt: a.createdAt,
    })),
  };
}

module.exports = { computeSummary, RENEWAL_LIST_SIZE, NOTICE_ALERT_DAYS, DAY_MS };
