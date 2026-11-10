const router = require('express').Router();

router.get('/health', (req, res) => res.json({ success: true, status: 'ok' }));
router.use('/auth', require('./auth.routes'));

module.exports = router;
