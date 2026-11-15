// Loads a demo organization so the app can be explored straight away.
//   npm run seed
// Safe to run again: it replaces ONLY the demo organization's data. Refuses to run in production.
const bcrypt = require('bcryptjs');
const env = require('../src/config/env');
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const Organization = require('../src/models/Organization');
const User = require('../src/models/User');
const Vendor = require('../src/models/Vendor');
const Contract = require('../src/models/Contract');
const ActivityLog = require('../src/models/ActivityLog');

const DEMO_ORG = 'Demo Industries Pvt Ltd';
const DEMO_PASSWORD = 'Demo@12345';
const DAY = 86400000;
const at = (n) => new Date(Date.now() + n * DAY);

const USERS = [
  { name: 'Aarav Mehta', email: 'admin@demo.procuredesk.in', role: 'admin' },
  { name: 'Diya Nair', email: 'manager@demo.procuredesk.in', role: 'manager' },
  { name: 'Kabir Shah', email: 'analyst@demo.procuredesk.in', role: 'analyst' },
  { name: 'Isha Rao', email: 'viewer@demo.procuredesk.in', role: 'viewer' },
];

const VENDORS = [
  { name: 'Amazon Web Services India', category: 'cloud_infrastructure', status: 'active', website: 'https://aws.amazon.com', contacts: [{ name: 'Rohit Kulkarni', email: 'rohit@aws.example.com', role: 'Account manager', isPrimary: true }] },
  { name: 'Salesforce', category: 'software', status: 'active', website: 'https://www.salesforce.com', contacts: [{ name: 'Neha Iyer', email: 'neha@salesforce.example.com', role: 'Renewals', isPrimary: true }] },
  { name: 'Slack Technologies', category: 'software', status: 'active', website: 'https://slack.com', contacts: [] },
  { name: 'CrowdStrike', category: 'security', status: 'active', website: 'https://www.crowdstrike.com', contacts: [{ name: 'Vikram Sethi', email: 'vikram@crowdstrike.example.com', role: 'Sales engineer', isPrimary: true }] },
  { name: 'Dell Technologies', category: 'hardware', status: 'active', website: 'https://www.dell.com', contacts: [] },
  { name: 'Airtel Business', category: 'telecom', status: 'active', contacts: [] },
  { name: 'Infosys Consulting', category: 'professional_services', status: 'prospect', notes: 'Under evaluation for the ERP rollout.', contacts: [] },
  { name: 'Legacy Print Co', category: 'other', status: 'inactive', notes: 'Replaced by digital workflow.', contacts: [] },
];

// [vendor name, title, number, status, startOffset, endOffset, total, noticeDays, autoRenew, pricing, payment]
const CONTRACTS = [
  ['Amazon Web Services India', 'AWS Enterprise Agreement', 'DEMO-001', 'active', -300, 430, 18000000, 60, true, 'usage_based', 'net_30'],
  ['Salesforce', 'Salesforce CRM Licences', 'DEMO-002', 'active', -330, 35, 4800000, 45, true, 'per_seat', 'net_45'],
  ['Slack Technologies', 'Slack Business+ Subscription', 'DEMO-003', 'active', -340, 25, 1260000, 30, true, 'subscription', 'advance'],
  ['CrowdStrike', 'Endpoint Security Suite', 'DEMO-004', 'active', -200, 160, 3600000, 60, false, 'per_seat', 'net_30'],
  ['Dell Technologies', 'Laptop Refresh Programme', 'DEMO-005', 'active', -100, 265, 9500000, 30, false, 'fixed', 'net_60'],
  ['Airtel Business', 'Leased Line and SIP Trunks', 'DEMO-006', 'active', -350, 80, 2400000, 90, true, 'subscription', 'net_15'],
  ['Salesforce', 'Salesforce Analytics Add-on', null, 'draft', 10, 375, 1500000, 30, false, 'subscription', 'net_30'],
  ['Legacy Print Co', 'Managed Print Services', 'DEMO-007', 'terminated', -700, -60, 600000, 30, false, 'fixed', 'net_30'],
  ['Slack Technologies', 'Slack Pilot (2024)', 'DEMO-008', 'active', -800, -20, 300000, 30, false, 'subscription', 'advance'],
];

async function main() {
  if (env.nodeEnv === 'production') throw new Error('Refusing to seed in production');
  await connectDB(env.mongoUri);
  await Promise.all([Vendor.init(), Contract.init(), User.init()]);

  const existing = await Organization.findOne({ name: DEMO_ORG });
  if (existing) {
    const filter = { organizationId: existing._id };
    await Promise.all([Contract.deleteMany(filter), Vendor.deleteMany(filter), ActivityLog.deleteMany(filter), User.deleteMany(filter)]);
    await Organization.deleteOne({ _id: existing._id });
  }

  const org = await Organization.create({ name: DEMO_ORG });
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const users = await User.insertMany(USERS.map((u) => ({ ...u, organizationId: org._id, passwordHash })));
  const admin = users[0];

  const vendors = {};
  for (const v of VENDORS) {
    const doc = await Vendor.create({ ...v, organizationId: org._id, createdBy: admin._id, deactivatedAt: v.status === 'inactive' ? at(-60) : undefined });
    vendors[v.name] = doc;
  }

  for (const [vendor, title, number, status, s, e, total, notice, autoRenew, pricingModel, paymentTerms] of CONTRACTS) {
    await Contract.create({
      organizationId: org._id,
      vendorId: vendors[vendor]._id,
      title,
      contractNumber: number || undefined,
      status,
      startDate: at(s),
      endDate: at(e),
      totalValue: total,
      noticePeriodDays: notice,
      autoRenew,
      pricingModel,
      paymentTerms,
      terminatedAt: status === 'terminated' ? at(-60) : undefined,
      createdBy: admin._id,
    });
  }

  await ActivityLog.insertMany([
    { organizationId: org._id, userId: admin._id, userName: admin.name, action: 'register', entityType: 'user', entityId: admin._id, summary: `${admin.name} created ${DEMO_ORG}` },
    { organizationId: org._id, userId: admin._id, userName: admin.name, action: 'create', entityType: 'vendor', summary: `${admin.name} loaded demo vendors and contracts` },
  ]);

  console.log(`Seeded "${DEMO_ORG}": ${USERS.length} users, ${VENDORS.length} vendors, ${CONTRACTS.length} contracts.`);
  console.log(`Sign in as admin@demo.procuredesk.in / ${DEMO_PASSWORD}  (also manager@, analyst@, viewer@ with the same password)`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
