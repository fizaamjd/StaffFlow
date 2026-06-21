const express = require('express');
const ctrl = require('../controllers/authController');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/register', validate(ctrl.schemas.registerSchema), ctrl.register);
router.post('/login', validate(ctrl.schemas.loginSchema), ctrl.login);
router.post('/logout', ctrl.logout);
router.get('/me', protect, ctrl.me);
router.patch('/password', protect, ctrl.updatePassword);

module.exports = router;
