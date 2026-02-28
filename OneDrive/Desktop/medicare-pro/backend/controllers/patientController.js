const Patient = require('../models/Patient');
const notif = require('./notificationController');
const jwt = require('jsonwebtoken');

module.exports = {
  getAll: async (req, res) => {
    try { res.json(await Patient.findAll(req.query)); }
    catch (err) { res.status(500).json({ error: err.message }); }
  },

  getById: async (req, res) => {
    try {
      const p = await Patient.findById(req.params.id);
      if (!p) return res.status(404).json({ error: 'Patient not found' });
      res.json(p);
    } catch (err) { res.status(500).json({ error: err.message }); }
  },

  create: async (req, res) => {
    try {
      const { id, patient_id } = await Patient.create(req.body);
      const patient = await Patient.findById(id);
      notif.notifyRegistration(patient).catch(console.error);
      res.status(201).json({ success: true, id, patient_id });
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
      res.status(500).json({ error: err.message });
    }
  },

  update: async (req, res) => {
    try {
      await Patient.update(req.params.id, req.body);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  },

  delete: async (req, res) => {
    try {
      await Patient.delete(req.params.id);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  },

  portalLogin: async (req, res) => {
    try {
      const { patient_id, password } = req.body;
      const patient = await Patient.verifyPortalLogin(patient_id, password);
      if (!patient) return res.status(401).json({ error: 'Invalid credentials' });
      const token = jwt.sign(
        { id: patient.id, patient_id: patient.patient_id, role: 'patient' },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '7d' }
      );
      res.json({ success: true, token, patient: { id: patient.id, name: patient.name, patient_id: patient.patient_id } });
    } catch (err) { res.status(500).json({ error: err.message }); }
  },
};
