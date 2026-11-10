const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/auth.service');
const Organization = require('../models/Organization');

const sessionPayload = async ({ user, token }) => {
  const organization = await Organization.findById(user.organizationId).select('name');
  return { success: true, token, user, organization };
};

exports.register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  res.status(201).json(await sessionPayload(result));
});

exports.login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  res.json(await sessionPayload(result));
});

exports.me = asyncHandler(async (req, res) => {
  const organization = await Organization.findById(req.user.organizationId).select('name');
  res.json({ success: true, user: req.user, organization });
});

exports.updateMe = asyncHandler(async (req, res) => {
  const user = await authService.updateProfile(req.user, req.body);
  res.json({ success: true, user });
});

exports.changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword(req.user._id, req.body);
  res.json({ success: true, message: 'Password updated' });
});
