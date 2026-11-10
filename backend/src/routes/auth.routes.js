const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/auth.controller');
const v = require('../validators/auth.validators');

// Slows down password guessing. Disabled under test so the suite isn't throttled.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { success: false, message: 'Too many attempts. Try again in a few minutes.' },
});

router.post('/register', authLimiter, validate(v.registerSchema), ctrl.register);
router.post('/login', authLimiter, validate(v.loginSchema), ctrl.login);
router.get('/me', authenticate, ctrl.me);
router.patch('/me', authenticate, validate(v.updateProfileSchema), ctrl.updateMe);
router.post('/change-password', authenticate, validate(v.changePasswordSchema), ctrl.changePassword);

module.exports = router;
