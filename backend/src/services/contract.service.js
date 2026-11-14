const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const env = require('../config/env');
const Contract = require('../models/Contract');
const Vendor = require('../models/Vendor');
const AppError = require('../utils/AppError');
const { logActivity } = require('./activity.service');
const { decorate, statusFilter, DAY_MS, TRANSITIONS } = require('./contractStatus');
const { detectFileType, sanitizeFilename } = require('../utils/fileValidation');

const MAX_DOCUMENTS = 20;
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Tenancy rule, as for vendors: every query includes organizationId and a foreign
// contract is reported as "not found".
async function findOwned(organizationId, id) {
  const contract = await Contract.findOne({ _id: id, organizationId });
  if (!contract) throw new AppError('Contract not found', 404);
  return contract;
}

async function assertNumberFree(organizationId, contractNumber, exceptId) {
  if (!contractNumber) return;
  const filter = { organizationId, contractNumber };
  if (exceptId) filter._id = { $ne: exceptId };
  if (await Contract.exists(filter)) throw new AppError('A contract with this number already exists', 409);
}

// '' means "no number": store it as absent so the unique index only sees real numbers.
function normalise(body) {
  const out = { ...body };
  if (out.contractNumber === '') out.contractNumber = undefined;
  return out;
}

async function list(organizationId, q, now = new Date()) {
  const conditions = [{ organizationId }];
  if (q.status) conditions.push(statusFilter(q.status, now));
  if (q.vendorId) conditions.push({ vendorId: q.vendorId });
  if (q.pricingModel) conditions.push({ pricingModel: q.pricingModel });
  if (q.endingWithin) {
    conditions.push({ status: 'active', endDate: { $gte: now, $lte: new Date(now.getTime() + q.endingWithin * DAY_MS) } });
  }
  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search), 'i');
    const vendorIds = (await Vendor.find({ organizationId, name: rx }).select('_id').lean()).map((v) => v._id);
    conditions.push({ $or: [{ title: rx }, { contractNumber: rx }, { vendorId: { $in: vendorIds } }] });
  }
  const filter = { $and: conditions };

  const direction = q.sort.startsWith('-') ? -1 : 1;
  const sortSpec = { [q.sort.replace('-', '')]: direction, _id: 1 };

  const [items, total] = await Promise.all([
    Contract.find(filter)
      .sort(sortSpec)
      .collation({ locale: 'en', strength: 2 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .populate('vendorId', 'name category status')
      .lean(),
    Contract.countDocuments(filter),
  ]);

  const data = items.map(({ vendorId, __v, annualValueDerived, documents, ...c }) =>
    decorate({
      ...c,
      vendorId: vendorId?._id,
      vendor: vendorId ? { _id: vendorId._id, name: vendorId.name, category: vendorId.category, status: vendorId.status } : null,
      documentCount: (documents || []).length,
    }, now)
  );
  return { data, pagination: { page: q.page, limit: q.limit, total, pages: Math.max(1, Math.ceil(total / q.limit)) } };
}

async function create(user, body) {
  const data = normalise(body);
  const vendor = await Vendor.findOne({ _id: data.vendorId, organizationId: user.organizationId });
  if (!vendor) throw new AppError('Selected vendor does not exist', 400);
  if (vendor.status === 'inactive') throw new AppError('Cannot add a contract to an inactive vendor. Reactivate the vendor first.', 409);
  await assertNumberFree(user.organizationId, data.contractNumber);

  const contract = await Contract.create({ ...data, organizationId: user.organizationId, createdBy: user._id });
  await logActivity(user, { action: 'create', entityType: 'contract', entityId: contract._id, summary: `${user.name} added contract ${contract.title} for ${vendor.name}` });
  return decorate(contract);
}

async function getById(organizationId, id) {
  const contract = await findOwned(organizationId, id);
  const vendor = await Vendor.findOne({ _id: contract.vendorId, organizationId }).select('name category status').lean();
  return { ...decorate(contract), vendor };
}

async function update(user, id, changes) {
  const contract = await findOwned(user.organizationId, id);
  if (contract.status === 'terminated') throw new AppError('A terminated contract can no longer be edited', 409);
  const data = normalise(changes);
  if (data.contractNumber) await assertNumberFree(user.organizationId, data.contractNumber, contract._id);

  // If the user sets annualValue themselves we stop recalculating it; otherwise it follows value/dates.
  if (data.annualValue !== undefined) contract.annualValueDerived = false;
  Object.assign(contract, data);
  await contract.save(); // save() so the cross-field date rules and annual-value derivation run
  await logActivity(user, { action: 'update', entityType: 'contract', entityId: contract._id, summary: `${user.name} updated contract ${contract.title}` });
  return decorate(contract);
}

async function changeStatus(user, id, newStatus, now = new Date()) {
  const contract = await findOwned(user.organizationId, id);
  if (!TRANSITIONS[contract.status].includes(newStatus)) {
    throw new AppError(`A ${contract.status} contract cannot be changed to ${newStatus}`, 409);
  }
  if (newStatus === 'active' && contract.endDate < now) {
    throw new AppError('Cannot activate a contract whose end date has already passed', 409);
  }
  contract.status = newStatus;
  if (newStatus === 'terminated') contract.terminatedAt = now;
  await contract.save();
  const verb = newStatus === 'active' ? 'activated' : 'terminated';
  await logActivity(user, { action: 'update', entityType: 'contract', entityId: contract._id, summary: `${user.name} ${verb} contract ${contract.title}` });
  return decorate(contract);
}

// ---- documents -------------------------------------------------------------------------

const docDir = (organizationId) => path.join(env.uploadDir, String(organizationId));

async function addDocument(user, id, file) {
  if (!file) throw new AppError('No file uploaded. Send it in a form field named "file".', 400);
  const contract = await findOwned(user.organizationId, id);
  if (contract.documents.length >= MAX_DOCUMENTS) throw new AppError(`A contract can hold at most ${MAX_DOCUMENTS} documents`, 409);

  const type = detectFileType(file.buffer, file.originalname);
  if (!type) throw new AppError('The file content does not match its type. Upload a real PDF, DOC or DOCX file.', 400);

  // The name on disk is random and chosen by us: the client's file name never touches the file system.
  const storedName = `${crypto.randomUUID()}${type.ext}`;
  const dir = docDir(user.organizationId);
  await fs.mkdir(dir, { recursive: true });
  const fullPath = path.join(dir, storedName);
  await fs.writeFile(fullPath, file.buffer, { flag: 'wx' });

  try {
    contract.documents.push({
      originalName: sanitizeFilename(file.originalname),
      storedName,
      mimeType: type.mime,
      size: file.buffer.length,
      uploadedBy: user._id,
    });
    await contract.save();
  } catch (err) {
    await fs.rm(fullPath, { force: true }); // don't leave an orphan file if the database write failed
    throw err;
  }
  const doc = contract.documents[contract.documents.length - 1];
  await logActivity(user, { action: 'upload', entityType: 'document', entityId: contract._id, summary: `${user.name} uploaded ${doc.originalName} to contract ${contract.title}` });
  return doc;
}

async function getDocument(organizationId, id, docId) {
  const contract = await findOwned(organizationId, id);
  const doc = contract.documents.id(docId);
  if (!doc) throw new AppError('Document not found', 404);
  return { doc, filePath: path.join(docDir(organizationId), doc.storedName) };
}

async function removeDocument(user, id, docId) {
  const contract = await findOwned(user.organizationId, id);
  const doc = contract.documents.id(docId);
  if (!doc) throw new AppError('Document not found', 404);
  const filePath = path.join(docDir(user.organizationId), doc.storedName);
  const name = doc.originalName;
  contract.documents.pull({ _id: doc._id });
  await contract.save();
  await fs.rm(filePath, { force: true });
  await logActivity(user, { action: 'update', entityType: 'document', entityId: contract._id, summary: `${user.name} removed ${name} from contract ${contract.title}` });
}

module.exports = { list, create, getById, update, changeStatus, addDocument, getDocument, removeDocument, MAX_DOCUMENTS };
