const router = require('express').Router();
const c = require('../controllers/reportController');
const auth = require('./middleware');

router.get('/',            auth.any, c.getAll);
router.get('/:id',         auth.any, c.getById);
router.get('/:id/pdf',     auth.any, c.generatePDF);
router.post('/',           auth.staff, c.upload, c.create);
router.put('/:id',         auth.staff, c.update);

module.exports = router;
