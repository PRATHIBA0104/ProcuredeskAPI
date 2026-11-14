const mongoose = require('mongoose');

const CONTRACT_STATUSES = ['draft', 'active', 'terminated', 'expired'];
const PRICING_MODELS = ['fixed', 'subscription', 'per_seat', 'usage_based', 'milestone'];
const PAYMENT_TERMS = ['advance', 'net_15', 'net_30', 'net_45', 'net_60', 'net_90', 'milestone_based'];

const documentSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true },
    storedName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: 'uploadedAt', updatedAt: false } }
);

// "Expiring soon" is NOT a stored status: it is computed from endDate when read,
// so it can never go stale.
const contractSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    title: { type: String, required: [true, 'Contract title is required'], trim: true, minlength: 2, maxlength: 150 },
    contractNumber: { type: String, trim: true, maxlength: 60 },
    status: { type: String, enum: CONTRACT_STATUSES, default: 'draft' },
    startDate: { type: Date, required: [true, 'Start date is required'] },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
      validate: {
        validator(value) {
          return !this.startDate || value > this.startDate;
        },
        message: 'End date must be after the start date',
      },
    },
    renewalDate: { type: Date },
    noticePeriodDays: { type: Number, default: 30, min: 0, max: 730 },
    autoRenew: { type: Boolean, default: false },
    totalValue: { type: Number, required: [true, 'Total contract value is required'], min: 0 },
    annualValue: { type: Number, min: 0 },
    currency: { type: String, default: 'INR', enum: ['INR'] },
    pricingModel: { type: String, enum: PRICING_MODELS, default: 'fixed' },
    paymentTerms: { type: String, enum: PAYMENT_TERMS, default: 'net_30' },
    notes: { type: String, trim: true, maxlength: 2000 },
    documents: { type: [documentSchema], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

contractSchema.index({ organizationId: 1, vendorId: 1, status: 1 });
contractSchema.index({ organizationId: 1, endDate: 1 });
// Contract numbers are optional but unique per organization when present.
// NOTE: `sparse` is wrong here: in a compound index it still indexes documents that have
// organizationId but no contractNumber (as null), so a second number-less contract would clash.
// A partial index only covers documents where contractNumber is really a string.
contractSchema.index(
  { organizationId: 1, contractNumber: 1 },
  { unique: true, partialFilterExpression: { contractNumber: { $type: 'string' } } }
);

contractSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Contract', contractSchema);
module.exports.CONTRACT_STATUSES = CONTRACT_STATUSES;
module.exports.PRICING_MODELS = PRICING_MODELS;
module.exports.PAYMENT_TERMS = PAYMENT_TERMS;
