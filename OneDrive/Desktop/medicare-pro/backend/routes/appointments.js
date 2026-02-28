const router = require('express').Router();
const c = require('../controllers/appointmentController');
const auth = require('./middleware');

router.get('/requests',               auth.staff, c.getRequests);
router.post('/requests/:id/confirm',  auth.staff, c.confirmRequest);
router.post('/requests/:id/reject',   auth.staff, c.rejectRequest);

router.get('/',      auth.any, c.getAll);
router.get('/:id',   auth.any, c.getById);
router.post('/',     auth.staff, c.create);
router.put('/:id',   auth.staff, c.update);

module.exports = router;
