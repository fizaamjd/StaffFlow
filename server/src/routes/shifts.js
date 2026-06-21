const express = require('express');
const ctrl = require('../controllers/shiftController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/', ctrl.list);
router.get('/:id', ctrl.get);
router.post('/:id/respond', ctrl.respond); // employee confirm/decline
router.post('/', authorize('manager'), ctrl.create);
router.patch('/:id', authorize('manager'), ctrl.update);
router.delete('/:id', authorize('manager'), ctrl.remove);

module.exports = router;
