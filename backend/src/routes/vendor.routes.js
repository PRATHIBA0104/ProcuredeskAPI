const router = require('express').Router();
const validate = require('../middleware/validate');
const { authenticate, authorize, ROLES, WRITE_ROLES } = require('../middleware/auth');
const ctrl = require('../controllers/vendor.controller');
const v = require('../validators/vendor.validators');

const MANAGERS = [ROLES.ADMIN, ROLES.MANAGER];

router.use(authenticate); // every vendor route requires a signed-in user

// Reading: any role (including viewer). Writing: authorize() runs BEFORE validation,
// so a viewer gets 403 regardless of what they send.
router.get('/', validate(v.listVendorsQuery, 'query'), ctrl.list);
router.post('/', authorize(...WRITE_ROLES), validate(v.createVendorSchema), ctrl.create);
router.get('/:id', validate(v.idParams, 'params'), ctrl.get);
router.patch('/:id', authorize(...WRITE_ROLES), validate(v.idParams, 'params'), validate(v.updateVendorSchema), ctrl.update);
router.post('/:id/deactivate', authorize(...MANAGERS), validate(v.idParams, 'params'), ctrl.deactivate);
router.post('/:id/activate', authorize(...MANAGERS), validate(v.idParams, 'params'), ctrl.activate);

module.exports = router;
