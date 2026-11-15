const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/dashboard.controller');

router.use(authenticate); // any signed-in role may read the dashboard of their own organization
router.get('/summary', ctrl.summary);

module.exports = router;
