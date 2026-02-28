const router = require('express').Router();
const c = require('../controllers/patientController');
const auth = require('./middleware');

router.post('/portal/login', c.portalLogin);

router.get('/',        auth.staff, c.getAll);
router.get('/:id',     auth.any, c.getById);
router.post('/',       auth.staff, c.create);
router.put('/:id',     auth.staff, c.update);
router.delete('/:id',  auth.staff, c.delete);

module.exports = router;
