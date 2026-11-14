const { z } = require('zod');
const { VENDOR_CATEGORIES } = require('../models/Vendor');

// NOTE: no .default() in the body schemas on purpose. The update schema is built from the
// create schema, and a default there would silently reset fields on every PATCH.
// Defaults live in the Mongoose model instead.

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

const website = z
  .string()
  .trim()
  .max(200)
  .refine((v) => v === '' || /^https?:\/\/[^\s/$.?#][^\s]*\.[^\s]+$/i.test(v), 'Website must start with http:// or https://');

const contact = z.object({
  name: z.string().trim().min(1, 'Contact name is required').max(100),
  email: z.string().trim().toLowerCase().email('Contact email is not valid').max(254).optional().or(z.literal('')),
  phone: z.string().trim().max(30).optional(),
  role: z.string().trim().max(80).optional(),
  isPrimary: z.boolean().optional(),
});

const contacts = z
  .array(contact)
  .max(10, 'At most 10 contacts')
  .refine((list) => list.filter((c) => c.isPrimary).length <= 1, 'Only one contact can be primary');

const vendorBody = z.object({
  name: z.string().trim().min(2, 'Vendor name must be at least 2 characters').max(120),
  category: z.enum(VENDOR_CATEGORIES),
  // "inactive" is only reachable through the deactivate endpoint, which enforces the contract guard.
  status: z.enum(['active', 'prospect']),
  website,
  contacts,
  notes: z.string().trim().max(2000),
});

const createVendorSchema = vendorBody.partial().required({ name: true });

const updateVendorSchema = vendorBody
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update' });

const SORTS = ['name', '-name', 'createdAt', '-createdAt', 'category', '-category', 'status', '-status'];

const listVendorsQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(100).optional(),
  category: z.enum(VENDOR_CATEGORIES).optional(),
  status: z.enum(['active', 'inactive', 'prospect']).optional(),
  sort: z.enum(SORTS).default('-createdAt'),
});

const idParams = z.object({ id: objectId });

module.exports = { createVendorSchema, updateVendorSchema, listVendorsQuery, idParams, objectId };
