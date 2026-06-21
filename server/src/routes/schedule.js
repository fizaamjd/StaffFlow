const express = require('express');
const ctrl = require('../controllers/scheduleController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect, authorize('manager'));

router.post('/generate', ctrl.generate);
router.post('/publish', ctrl.publish);
router.get('/recommend', ctrl.recommend);

module.exports = router;
