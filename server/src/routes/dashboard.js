const express = require('express');
const ctrl = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/manager', authorize('manager'), ctrl.manager);
router.get('/employee', ctrl.employee);

module.exports = router;
