const { z } = require('zod');

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters') // bcrypt ignores bytes past 72
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/[0-9]/, 'Password must contain a number');

const email = z.string().trim().toLowerCase().email('Enter a valid email address').max(254);

const registerSchema = z.object({
  organizationName: z.string().trim().min(2, 'Organization name is required').max(120),
  name: z.string().trim().min(2, 'Name is required').max(100),
  email,
  password,
});

const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required').max(72),
});

const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update' });

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required').max(72),
  newPassword: password,
});

module.exports = { registerSchema, loginSchema, updateProfileSchema, changePasswordSchema };
