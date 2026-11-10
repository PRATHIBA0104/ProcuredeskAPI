const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const User = require('../models/User');
const Organization = require('../models/Organization');
const { logActivity } = require('./activity.service');

const BCRYPT_ROUNDS = 12;

function signToken(user) {
  return jwt.sign({ role: user.role, org: String(user.organizationId) }, env.jwtSecret, {
    subject: String(user._id),
    expiresIn: env.jwtExpiresIn,
    algorithm: 'HS256',
  });
}

async function register({ organizationName, name, email, password }) {
  if (await User.exists({ email })) throw new AppError('An account with this email already exists', 409);

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const organization = await Organization.create({ name: organizationName });
  try {
    // The first user of a new organization is its admin.
    const user = await User.create({
      organizationId: organization._id,
      name,
      email,
      passwordHash,
      role: 'admin',
    });
    await logActivity(user, {
      action: 'register',
      entityType: 'user',
      entityId: user._id,
      summary: `${name} created the organization ${organizationName}`,
    });
    return { user, token: signToken(user) };
  } catch (err) {
    await Organization.deleteOne({ _id: organization._id }); // don't leave an orphan org
    throw err;
  }
}

async function login({ email, password }) {
  const user = await User.findOne({ email }).select('+passwordHash');
  // Same message for "no such user" and "wrong password" so emails can't be probed.
  const invalid = new AppError('Invalid email or password', 401);
  if (!user) {
    await bcrypt.compare(password, '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvali'); // constant-ish time
    throw invalid;
  }
  if (!(await bcrypt.compare(password, user.passwordHash))) throw invalid;
  if (!user.isActive) throw new AppError('This account has been deactivated', 403);

  user.lastLoginAt = new Date();
  await user.save();
  await logActivity(user, { action: 'login', entityType: 'user', entityId: user._id, summary: `${user.name} signed in` });
  return { user, token: signToken(user) };
}

async function updateProfile(user, changes) {
  Object.assign(user, changes);
  await user.save();
  return user;
}

async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw new AppError('Current password is incorrect', 400);
  }
  user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await user.save();
}

module.exports = { register, login, updateProfile, changePassword, signToken };
