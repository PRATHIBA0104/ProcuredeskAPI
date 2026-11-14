const asyncHandler = require('../utils/asyncHandler');
const vendorService = require('../services/vendor.service');

exports.list = asyncHandler(async (req, res) => {
  const result = await vendorService.list(req.organizationId, req.query);
  res.json({ success: true, ...result });
});

exports.create = asyncHandler(async (req, res) => {
  const vendor = await vendorService.create(req.user, req.body);
  res.status(201).json({ success: true, vendor });
});

exports.get = asyncHandler(async (req, res) => {
  const { vendor, contracts } = await vendorService.getById(req.organizationId, req.params.id);
  res.json({ success: true, vendor, contracts });
});

exports.update = asyncHandler(async (req, res) => {
  const vendor = await vendorService.update(req.user, req.params.id, req.body);
  res.json({ success: true, vendor });
});

exports.deactivate = asyncHandler(async (req, res) => {
  const vendor = await vendorService.deactivate(req.user, req.params.id);
  res.json({ success: true, vendor });
});

exports.activate = asyncHandler(async (req, res) => {
  const vendor = await vendorService.activate(req.user, req.params.id);
  res.json({ success: true, vendor });
});
