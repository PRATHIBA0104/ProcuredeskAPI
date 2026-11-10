const mongoose = require('mongoose');

// An append-only record of who did what. Feeds the dashboard "recent activity" feed.
const activityLogSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    action: { type: String, required: true, enum: ['create', 'update', 'deactivate', 'upload', 'login', 'register'] },
    entityType: { type: String, required: true, enum: ['vendor', 'contract', 'document', 'user'] },
    entityId: { type: mongoose.Schema.Types.ObjectId },
    summary: { type: String, required: true, maxlength: 300 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

activityLogSchema.index({ organizationId: 1, createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
