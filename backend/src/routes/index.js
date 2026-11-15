const router = require('express').Router();

router.get('/health', (req, res) => res.json({ success: true, status: 'ok' }));
router.use('/auth', require('./auth.routes'));
router.use('/vendors', require('./vendor.routes'));
router.use('/contracts', require('./contract.routes'));
router.use('/dashboard', require('./dashboard.routes'));

module.exports = router;
