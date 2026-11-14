const router = require('express').Router();
const validate = require('../middleware/validate');
const upload = require('../middleware/upload');
const { authenticate, authorize, ROLES, WRITE_ROLES } = require('../middleware/auth');
const ctrl = require('../controllers/contract.controller');
const v = require('../validators/contract.validators');

const MANAGERS = [ROLES.ADMIN, ROLES.MANAGER];

router.use(authenticate);

router.get('/', validate(v.listContractsQuery, 'query'), ctrl.list);
router.post('/', authorize(...WRITE_ROLES), validate(v.createContractSchema), ctrl.create);
router.get('/:id', validate(v.contractIdParams, 'params'), ctrl.get);
router.patch('/:id', authorize(...WRITE_ROLES), validate(v.contractIdParams, 'params'), validate(v.updateContractSchema), ctrl.update);

// Activating or terminating changes the legal state of a deal, so it is limited to admin/manager.
router.post('/:id/status', authorize(...MANAGERS), validate(v.contractIdParams, 'params'), validate(v.changeStatusSchema), ctrl.changeStatus);

// Documents. Order matters: authorize BEFORE the upload middleware, so a viewer's file is never even read.
router.post('/:id/documents', authorize(...WRITE_ROLES), validate(v.contractIdParams, 'params'), upload, ctrl.uploadDocument);
router.get('/:id/documents/:docId', validate(v.documentParams, 'params'), ctrl.downloadDocument);
router.delete('/:id/documents/:docId', authorize(...MANAGERS), validate(v.documentParams, 'params'), ctrl.removeDocument);

module.exports = router;
