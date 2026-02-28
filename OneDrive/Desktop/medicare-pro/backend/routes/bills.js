const router = require('express').Router();
const c = require('../controllers/billController');
const auth = require('./middleware');

router.get('/',                   auth.any, c.getAll);
router.get('/:id',                auth.any, c.getById);
router.get('/:id/pdf',            auth.any, c.generatePDF);
router.post('/',                  auth.staff, c.create);
router.post('/:id/payment',       auth.staff, c.recordPayment);

module.exports = router;
