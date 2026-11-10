const ActivityLog = require('../models/ActivityLog');

// Logging must never break the real request, so failures are swallowed (but reported).
async function logActivity(user, { action, entityType, entityId, summary }) {
  try {
    await ActivityLog.create({
      organizationId: user.organizationId,
      userId: user._id,
      userName: user.name,
      action,
      entityType,
      entityId,
      summary,
    });
  } catch (err) {
    console.error('Failed to write activity log:', err.message);
  }
}

module.exports = { logActivity };
