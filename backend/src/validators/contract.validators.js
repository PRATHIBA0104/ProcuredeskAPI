const { z } = require('zod');
const { PRICING_MODELS, PAYMENT_TERMS } = require('../models/Contract');
const { objectId } = require('./vendor.validators');

// As with vendors: no .default() in body schemas (the update schema is derived from the
// create schema, and defaults would silently overwrite fields on PATCH). Defaults live in the model.

// Accepts "2026-04-01" or a full ISO timestamp and returns a Date.
const isoDate = z
  .string()
  .trim()
  .refine((v) => {
    if (!/^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:?\d{2})?)?$/.test(v) || Number.isNaN(Date.parse(v))) return false;
    // JavaScript quietly turns 2026-02-30 into 2 March. For plain dates, reject anything that rolls over.
    if (v.length === 10) return new Date(v).toISOString().slice(0, 10) === v;
    return true;
  }, 'Enter a valid date (YYYY-MM-DD)')
  .transform((v) => new Date(v));

const money = (label) =>
  z
    .number({ error: `${label} must be a number` })
    .min(0, `${label} cannot be negative`)
    .max(1e12, `${label} is too large`);

const contractBody = z.object({
  vendorId: objectId,
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(150),
  contractNumber: z.string().trim().max(60), // '' means "no number" and is stored as absent
  status: z.enum(['draft', 'active']), // later changes go through the status endpoint
  startDate: isoDate,
  endDate: isoDate,
  renewalDate: isoDate,
  noticePeriodDays: z.number().int().min(0).max(730),
  autoRenew: z.boolean(),
  totalValue: money('Total value'),
  annualValue: money('Annual value'),
  pricingModel: z.enum(PRICING_MODELS),
  paymentTerms: z.enum(PAYMENT_TERMS),
  notes: z.string().trim().max(2000),
});

const createContractSchema = contractBody
  .partial()
  .required({ vendorId: true, title: true, startDate: true, endDate: true, totalValue: true })
  .superRefine((v, ctx) => {
    if (v.startDate && v.endDate && v.endDate <= v.startDate) {
      ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'End date must be after the start date' });
    }
  });

// vendorId cannot be changed after creation, and status has its own endpoint.
const updateContractSchema = contractBody
  .omit({ vendorId: true, status: true })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update' });

const changeStatusSchema = z.object({ status: z.enum(['active', 'terminated']) });

const SORTS = ['endDate', '-endDate', 'startDate', '-startDate', 'totalValue', '-totalValue', 'title', '-title', 'createdAt', '-createdAt'];

const listContractsQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(100).optional(),
  status: z.enum(['draft', 'active', 'expiring', 'expired', 'terminated']).optional(),
  vendorId: objectId.optional(),
  pricingModel: z.enum(PRICING_MODELS).optional(),
  // contracts in force that end within the next N days (used for renewal views)
  endingWithin: z.coerce.number().int().min(1).max(730).optional(),
  sort: z.enum(SORTS).default('endDate'),
});

const contractIdParams = z.object({ id: objectId });
const documentParams = z.object({ id: objectId, docId: objectId });

module.exports = {
  createContractSchema,
  updateContractSchema,
  changeStatusSchema,
  listContractsQuery,
  contractIdParams,
  documentParams,
};
