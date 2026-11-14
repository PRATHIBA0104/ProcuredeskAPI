// Pure functions (no database) for everything derived from a contract's dates.
//
// STORED status:     draft | active | terminated | expired   (what people decided)
// EFFECTIVE status:  draft | active | expiring | expired | terminated  (what is true today)
//
// "expiring" and "expired by date" are never stored, so they cannot go stale: a contract
// stored as "active" simply becomes "expiring" and then "expired" as the calendar moves.

const DAY_MS = 24 * 60 * 60 * 1000;
const EXPIRING_WINDOW_DAYS = 90;

function effectiveStatus(contract, now = new Date()) {
  const { status, endDate } = contract;
  if (status !== 'active') return status; // draft, terminated, expired (stored) stay as they are
  const end = new Date(endDate).getTime();
  if (end < now.getTime()) return 'expired';
  if (end <= now.getTime() + EXPIRING_WINDOW_DAYS * DAY_MS) return 'expiring';
  return 'active';
}

// Whole days from now until `date` (negative when in the past).
function daysUntil(date, now = new Date()) {
  return Math.ceil((new Date(date).getTime() - now.getTime()) / DAY_MS);
}

// The last day to give notice if you do not want the contract to renew (or want to renegotiate).
function noticeDeadline(contract) {
  return new Date(new Date(contract.endDate).getTime() - (contract.noticePeriodDays || 0) * DAY_MS);
}

// Adds the computed fields to a contract (plain object or Mongoose document).
function decorate(contract, now = new Date()) {
  const c = typeof contract.toJSON === 'function' ? contract.toJSON() : { ...contract };
  const deadline = noticeDeadline(c);
  return {
    ...c,
    effectiveStatus: effectiveStatus(c, now),
    daysToExpiry: daysUntil(c.endDate, now),
    nextRenewalDate: c.renewalDate || c.endDate,
    noticeDeadline: deadline,
    daysToNoticeDeadline: daysUntil(deadline, now),
  };
}

// MongoDB conditions for filtering by EFFECTIVE status.
// Note: "active" includes "expiring" (both are in force); "expiring" is the subset ending soon.
function statusFilter(status, now = new Date()) {
  const soon = new Date(now.getTime() + EXPIRING_WINDOW_DAYS * DAY_MS);
  switch (status) {
    case 'draft':
      return { status: 'draft' };
    case 'terminated':
      return { status: 'terminated' };
    case 'active':
      return { status: 'active', endDate: { $gte: now } };
    case 'expiring':
      return { status: 'active', endDate: { $gte: now, $lte: soon } };
    case 'expired':
      return { $or: [{ status: 'expired' }, { status: 'active', endDate: { $lt: now } }] };
    default:
      return {};
  }
}

// If no annual value is given, spread the total over the contract length.
// Contracts shorter than a year keep their total (we never inflate a 6-month deal to a yearly figure).
function deriveAnnualValue(totalValue, startDate, endDate) {
  const years = (new Date(endDate) - new Date(startDate)) / (365.25 * DAY_MS);
  const annual = years >= 1 ? totalValue / years : totalValue;
  return Math.round(annual * 100) / 100;
}

// Allowed manual status changes. Dates drive everything else.
const TRANSITIONS = {
  draft: ['active', 'terminated'],
  active: ['terminated'],
  terminated: [],
  expired: [],
};

module.exports = {
  DAY_MS,
  EXPIRING_WINDOW_DAYS,
  effectiveStatus,
  daysUntil,
  noticeDeadline,
  decorate,
  statusFilter,
  deriveAnnualValue,
  TRANSITIONS,
};
