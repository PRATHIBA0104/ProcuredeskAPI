const Vendor = require('../models/Vendor');
const Contract = require('../models/Contract');
const AppError = require('../utils/AppError');
const { logActivity } = require('./activity.service');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// EVERY query below includes organizationId. That is the tenancy rule: a user can only ever
// reach their own organization's vendors. A vendor from another organization is reported as
// "not found" (404), never "forbidden", so its existence is not revealed.
async function findOwned(organizationId, id) {
  const vendor = await Vendor.findOne({ _id: id, organizationId });
  if (!vendor) throw new AppError('Vendor not found', 404);
  return vendor;
}

async function assertNameFree(organizationId, name, exceptId) {
  const filter = { organizationId, nameKey: name.trim().toLowerCase() };
  if (exceptId) filter._id = { $ne: exceptId };
  if (await Vendor.exists(filter)) throw new AppError('A vendor with this name already exists', 409);
}

async function list(organizationId, { page, limit, search, category, status, sort }) {
  const filter = { organizationId };
  if (category) filter.category = category;
  if (status) filter.status = status;
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: rx }, { 'contacts.name': rx }, { 'contacts.email': rx }];
  }

  const direction = sort.startsWith('-') ? -1 : 1;
  const field = sort.replace('-', '');
  const sortSpec = { [field]: direction, _id: 1 }; // _id keeps paging stable when values tie

  const [items, total] = await Promise.all([
    Vendor.find(filter)
      .sort(sortSpec)
      .collation({ locale: 'en', strength: 2 }) // case-insensitive sorting by name
      .skip((page - 1) * limit)
      .limit(limit)
      .lean({ virtuals: false }),
    Vendor.countDocuments(filter),
  ]);

  // Attach each vendor's active-contract count and annual value in ONE query.
  const stats = items.length
    ? await Contract.aggregate([
        { $match: { organizationId, vendorId: { $in: items.map((v) => v._id) }, status: 'active' } },
        { $group: { _id: '$vendorId', activeContracts: { $sum: 1 }, annualValue: { $sum: { $ifNull: ['$annualValue', 0] } } } },
      ])
    : [];
  const byVendor = new Map(stats.map((s) => [String(s._id), s]));

  const data = items.map(({ nameKey, __v, ...v }) => ({
    ...v,
    activeContracts: byVendor.get(String(v._id))?.activeContracts || 0,
    activeAnnualValue: byVendor.get(String(v._id))?.annualValue || 0,
  }));

  return { data, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } };
}

async function create(user, body) {
  await assertNameFree(user.organizationId, body.name);
  // organizationId and createdBy come from the verified token, never from the request body.
  const vendor = await Vendor.create({ ...body, organizationId: user.organizationId, createdBy: user._id });
  await logActivity(user, { action: 'create', entityType: 'vendor', entityId: vendor._id, summary: `${user.name} added vendor ${vendor.name}` });
  return vendor;
}

async function getById(organizationId, id) {
  const vendor = await findOwned(organizationId, id);
  const contracts = await Contract.find({ organizationId, vendorId: vendor._id })
    .select('title contractNumber status startDate endDate annualValue totalValue')
    .sort({ endDate: 1 })
    .lean();
  return { vendor, contracts };
}

async function update(user, id, changes) {
  const vendor = await findOwned(user.organizationId, id);
  if (vendor.status === 'inactive' && changes.status) {
    throw new AppError('Use the activate action to reactivate an inactive vendor', 400);
  }
  if (changes.name) await assertNameFree(user.organizationId, changes.name, vendor._id);
  Object.assign(vendor, changes);
  await vendor.save(); // save() (not updateOne) so the nameKey hook and validators run
  await logActivity(user, { action: 'update', entityType: 'vendor', entityId: vendor._id, summary: `${user.name} updated vendor ${vendor.name}` });
  return vendor;
}

async function deactivate(user, id) {
  const vendor = await findOwned(user.organizationId, id);
  if (vendor.status === 'inactive') throw new AppError('Vendor is already inactive', 409);

  const activeContracts = await Contract.countDocuments({ organizationId: user.organizationId, vendorId: vendor._id, status: 'active' });
  if (activeContracts > 0) {
    throw new AppError(
      `Cannot deactivate: this vendor still has ${activeContracts} active contract${activeContracts > 1 ? 's' : ''}. Terminate or let them expire first.`,
      409
    );
  }
  vendor.status = 'inactive';
  vendor.deactivatedAt = new Date();
  await vendor.save();
  await logActivity(user, { action: 'deactivate', entityType: 'vendor', entityId: vendor._id, summary: `${user.name} deactivated vendor ${vendor.name}` });
  return vendor;
}

async function activate(user, id) {
  const vendor = await findOwned(user.organizationId, id);
  if (vendor.status !== 'inactive') throw new AppError('Vendor is not inactive', 409);
  vendor.status = 'active';
  vendor.deactivatedAt = undefined;
  await vendor.save();
  await logActivity(user, { action: 'activate', entityType: 'vendor', entityId: vendor._id, summary: `${user.name} reactivated vendor ${vendor.name}` });
  return vendor;
}

module.exports = { list, create, getById, update, deactivate, activate };
