const mongoose = require('mongoose');

const VENDOR_CATEGORIES = [
  'software',
  'cloud_infrastructure',
  'security',
  'hardware',
  'professional_services',
  'telecom',
  'marketing',
  'other',
];
const VENDOR_STATUSES = ['active', 'inactive', 'prospect'];

const contactSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Contact name is required'], trim: true, maxlength: 100 },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    maxlength: 254,
    match: [/^\S+@\S+\.\S+$/, 'Contact email is not valid'],
  },
  phone: { type: String, trim: true, maxlength: 30 },
  role: { type: String, trim: true, maxlength: 80 },
  isPrimary: { type: Boolean, default: false },
});

const vendorSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    name: { type: String, required: [true, 'Vendor name is required'], trim: true, minlength: 2, maxlength: 120 },
    // Lower-cased copy of the name, used only for the "unique within an organization" rule.
    nameKey: { type: String, required: true },
    category: { type: String, enum: VENDOR_CATEGORIES, default: 'other' },
    status: { type: String, enum: VENDOR_STATUSES, default: 'active' },
    website: { type: String, trim: true, maxlength: 200 },
    contacts: { type: [contactSchema], default: [], validate: [(v) => v.length <= 10, 'At most 10 contacts'] },
    notes: { type: String, trim: true, maxlength: 2000 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deactivatedAt: { type: Date },
  },
  { timestamps: true }
);

// Runs before validation, so create() and save() both keep nameKey in step with name.
vendorSchema.pre('validate', function setNameKey() {
  if (this.name) this.nameKey = this.name.trim().toLowerCase();
});

// A vendor name is unique per organization (two organizations may both have "Slack").
vendorSchema.index({ organizationId: 1, nameKey: 1 }, { unique: true });
vendorSchema.index({ organizationId: 1, status: 1, category: 1 });

vendorSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.nameKey;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Vendor', vendorSchema);
module.exports.VENDOR_CATEGORIES = VENDOR_CATEGORIES;
module.exports.VENDOR_STATUSES = VENDOR_STATUSES;
