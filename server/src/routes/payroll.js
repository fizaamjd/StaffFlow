const express = require('express');
const ctrl = require('../controllers/payrollController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/', ctrl.summary);
router.get('/trend', ctrl.trend);

module.exports = router;
