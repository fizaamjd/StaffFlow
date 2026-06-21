const express = require('express');
const ctrl = require('../controllers/employeeController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// self-service first (so /me isn't treated as :id)
router.patch('/me', ctrl.updateMe);

router.get('/', authorize('manager'), ctrl.list);
router.post('/', authorize('manager'), ctrl.create);
router.get('/:id', authorize('manager'), ctrl.get);
router.patch('/:id', authorize('manager'), ctrl.update);
router.delete('/:id', authorize('manager'), ctrl.remove);

module.exports = router;
