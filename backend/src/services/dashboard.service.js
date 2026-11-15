const Vendor = require('../models/Vendor');
const Contract = require('../models/Contract');
const ActivityLog = require('../models/ActivityLog');
const { computeSummary } = require('./dashboard.summary');

// Every query is scoped to the caller's organization: the dashboard can never show another tenant's data.
async function getSummary(organizationId, now = new Date()) {
  const [vendors, contracts, activity] = await Promise.all([
    Vendor.find({ organizationId }).select('name category status').lean(),
    Contract.find({ organizationId }).select('vendorId title status startDate endDate noticePeriodDays annualValue autoRenew').lean(),
    ActivityLog.find({ organizationId }).sort({ createdAt: -1 }).limit(8).lean(),
  ]);
  return computeSummary({ vendors, contracts, activity }, now);
}

module.exports = { getSummary };
