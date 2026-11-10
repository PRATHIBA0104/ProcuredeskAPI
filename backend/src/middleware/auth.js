const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');

// Reads "Authorization: Bearer <token>", verifies it, and loads the user from the DB.
// Loading from the DB (not trusting the token alone) means a deactivated user or a
// changed role takes effect immediately.
const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) throw new AppError('Authentication required', 401);

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
  } catch {
    throw new AppError('Invalid or expired token', 401);
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw new AppError('Account not found or deactivated', 401);

  req.user = user;
  req.organizationId = user.organizationId; // every query must be scoped by this
  next();
});

// authorize('admin', 'manager') allows only those roles through.
const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) return next(new AppError('Authentication required', 401));
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };

const ROLES = Object.freeze({
  ADMIN: 'admin',
  MANAGER: 'manager',
  ANALYST: 'analyst',
  VIEWER: 'viewer',
});
const WRITE_ROLES = [ROLES.ADMIN, ROLES.MANAGER, ROLES.ANALYST];

module.exports = { authenticate, authorize, ROLES, WRITE_ROLES };
