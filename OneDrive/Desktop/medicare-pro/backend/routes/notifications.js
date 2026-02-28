const router = require('express').Router();
const c = require('../controllers/notificationController');
const auth = require('./middleware');

router.post('/fcm-token', c.saveFcmToken);
router.get('/logs',       auth.any, c.getLogs);

module.exports = router;
