const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const notif = require('./notificationController');
const { query } = require('../config/db');
const { sendEmail } = require('../config/email');

module.exports = {

  getRequests: async (req, res) => {
    try {
      const { rows } = await query(`
        SELECT ar.*, p.name AS patient_name, p.patient_id AS patient_code, p.email AS patient_email,
          s.name AS doctor_name, s.specialization AS doctor_spec
        FROM appointment_requests ar
        JOIN patients p ON p.id = ar.patient_id
        LEFT JOIN staff s ON s.id = ar.doctor_id
        WHERE ar.status = 'pending'
        ORDER BY ar.created_at DESC
      `);
      res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
  },

  confirmRequest: async (req, res) => {
    try {
      const { id } = req.params;
      const staffId = req.user.id;
      const { rows } = await query('SELECT * FROM appointment_requests WHERE id=$1 AND status=$2', [id, 'pending']);
      if (!rows.length) return res.status(404).json({ error: 'Not found or already handled' });
      const r = rows[0];
      const apptId = await Appointment.create({
        patient_id: r.patient_id, doctor_id: r.doctor_id,
        appointment_date: r.requested_date, appointment_time: r.requested_time,
        type: 'consultation', notes: r.reason,
      });
      await query("UPDATE appointment_requests SET status='approved', handled_by=$1, handled_at=NOW() WHERE id=$2", [staffId, id]);
      const { rows: doc } = await query('SELECT name, specialization FROM staff WHERE id=$1', [r.doctor_id]);
      const docName = doc[0] ? doc[0].name + ' (' + doc[0].specialization + ')' : 'Your Doctor';
      const chatMsg = 'Your appointment has been CONFIRMED!\nDoctor: ' + docName + '\nDate: ' + r.requested_date + '\nTime: ' + r.requested_time + '\nPlease arrive 10 minutes early.';
      await query("INSERT INTO chat_messages (patient_id, sender_role, sender_id, message, priority) VALUES ($1,'staff',$2,$3,'normal')", [r.patient_id, staffId, chatMsg]);
      const patient = await Patient.findById(r.patient_id);
      if (patient.email) {
        const html = '<p>Dear <b>' + patient.name + '</b>,</p><p>Your appointment is <b style="color:green">CONFIRMED</b>!</p><p>Doctor: ' + docName + '<br>Date: ' + r.requested_date + '<br>Time: ' + r.requested_time + '</p><p>Please arrive 10 minutes early.</p>';
        sendEmail(patient.email, 'Appointment Confirmed - MediCare Pro', html).catch(console.error);
      }
      const appt = await Appointment.findById(apptId);
      notif.notifyAppointmentScheduled(patient, appt).catch(console.error);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  },

  rejectRequest: async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const staffId = req.user.id;
      const { rows } = await query('SELECT * FROM appointment_requests WHERE id=$1 AND status=$2', [id, 'pending']);
      if (!rows.length) return res.status(404).json({ error: 'Not found or already handled' });
      const r = rows[0];
      await query("UPDATE appointment_requests SET status='rejected', handled_by=$1, handled_at=NOW() WHERE id=$2", [staffId, id]);
      const rejectReason = reason || 'No slot available at the requested time.';
      const chatMsg = 'Your appointment request for ' + r.requested_date + ' at ' + r.requested_time + ' has been declined.\nReason: ' + rejectReason + '\nPlease request a different time.';
      await query("INSERT INTO chat_messages (patient_id, sender_role, sender_id, message, priority) VALUES ($1,'staff',$2,$3,'normal')", [r.patient_id, staffId, chatMsg]);
      const patient = await Patient.findById(r.patient_id);
      if (patient.email) {
        const html = '<p>Dear <b>' + patient.name + '</b>,</p><p>Your appointment request for <b>' + r.requested_date + ' at ' + r.requested_time + '</b> has been <b style="color:red">declined</b>.</p><p>Reason: ' + rejectReason + '</p><p>Please log in to request a new appointment.</p>';
        sendEmail(patient.email, 'Appointment Request Declined - MediCare Pro', html).catch(console.error);
      }
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  },

  getAll: async (req, res) => {
    try { res.json(await Appointment.findAll(req.query)); }
    catch (err) { res.status(500).json({ error: err.message }); }
  },

  getById: async (req, res) => {
    try {
      const a = await Appointment.findById(req.params.id);
      if (!a) return res.status(404).json({ error: 'Not found' });
      res.json(a);
    } catch (err) { res.status(500).json({ error: err.message }); }
  },

  create: async (req, res) => {
    try {
      const id = await Appointment.create(req.body);
      const appt = await Appointment.findById(id);
      const patient = await Patient.findById(appt.patient_id);
      notif.notifyAppointmentScheduled(patient, appt).catch(console.error);
      res.status(201).json({ success: true, id });
    } catch (err) { res.status(500).json({ error: err.message }); }
  },

  update: async (req, res) => {
    try {
      const appt = await Appointment.findById(req.params.id);
      if (!appt) return res.status(404).json({ error: 'Not found' });
      await Appointment.update(req.params.id, req.body);
      if (req.body.status === 'cancelled') {
        const patient = await Patient.findById(appt.patient_id);
        notif.notifyAppointmentCancelled(patient, appt).catch(console.error);
      }
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  },

};