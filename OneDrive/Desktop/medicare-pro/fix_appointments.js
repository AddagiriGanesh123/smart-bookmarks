const fs = require('fs');

// ── 1. Update appointments route ────────────────────────────
let routes = fs.readFileSync('backend/routes/appointments.js', 'utf8');
if (!routes.includes('requests')) {
  routes = routes.replace(
    "router.get('/',      auth.any, c.getAll);",
    `router.get('/requests',              auth.staff, c.getRequests);
router.post('/requests/:id/confirm',  auth.staff, c.confirmRequest);
router.post('/requests/:id/reject',   auth.staff, c.rejectRequest);
router.get('/',      auth.any, c.getAll);`
  );
  fs.writeFileSync('backend/routes/appointments.js', routes, 'utf8');
  console.log('routes updated');
}

// ── 2. Update appointmentController ─────────────────────────
let ctrl = fs.readFileSync('backend/controllers/appointmentController.js', 'utf8');
if (!ctrl.includes('getRequests')) {
  const extra = `
  getRequests: async (req, res) => {
    try {
      const { query } = require('../config/db');
      const { rows } = await query(\`
        SELECT ar.*, p.name AS patient_name, p.patient_id AS patient_code, p.email AS patient_email,
          s.name AS doctor_name, s.specialization AS doctor_spec
        FROM appointment_requests ar
        JOIN patients p ON p.id = ar.patient_id
        LEFT JOIN staff s ON s.id = ar.doctor_id
        WHERE ar.status = 'pending'
        ORDER BY ar.created_at DESC
      \`);
      res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
  },

  confirmRequest: async (req, res) => {
    try {
      const { query } = require('../config/db');
      const { id } = req.params;
      const staffId = req.user.id;
      const { rows } = await query('SELECT * FROM appointment_requests WHERE id=$1 AND status=$2', [id,'pending']);
      if (!rows.length) return res.status(404).json({ error: 'Not found or already handled' });
      const r = rows[0];
      const apptId = await Appointment.create({ patient_id: r.patient_id, doctor_id: r.doctor_id, appointment_date: r.requested_date, appointment_time: r.requested_time, type: 'consultation', notes: r.reason });
      await query("UPDATE appointment_requests SET status='confirmed', handled_by=$1, handled_at=NOW() WHERE id=$2", [staffId, id]);
      const { rows: doc } = await query('SELECT name, specialization FROM staff WHERE id=$1', [r.doctor_id]);
      const docName = doc[0] ? doc[0].name + ' (' + doc[0].specialization + ')' : 'Doctor';
      const replyMsg = 'Your appointment request has been CONFIRMED!\\nDoctor: ' + docName + '\\nDate: ' + r.requested_date + '\\nTime: ' + r.requested_time + '\\nPlease arrive 10 minutes early.';
      await query("INSERT INTO chat_messages (patient_id, sender_role, sender_id, message, priority) VALUES ($1,'staff',$2,$3,'normal')", [r.patient_id, staffId, replyMsg]);
      const patient = await Patient.findById(r.patient_id);
      const appt = await Appointment.findById(apptId);
      if (patient.email) notif.notifyAppointmentScheduled(patient, appt).catch(console.error);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  },

  rejectRequest: async (req, res) => {
    try {
      const { query } = require('../config/db');
      const { id } = req.params;
      const { reason } = req.body;
      const staffId = req.user.id;
      const { rows } = await query('SELECT * FROM appointment_requests WHERE id=$1 AND status=$2', [id,'pending']);
      if (!rows.length) return res.status(404).json({ error: 'Not found or already handled' });
      const r = rows[0];
      await query("UPDATE appointment_requests SET status='rejected', handled_by=$1, handled_at=NOW() WHERE id=$2", [staffId, id]);
      const replyMsg = 'Your appointment request has been declined.\\nReason: ' + (reason || 'No slot available at requested time.') + '\\nPlease request a different date/time.';
      await query("INSERT INTO chat_messages (patient_id, sender_role, sender_id, message, priority) VALUES ($1,'staff',$2,$3,'normal')", [r.patient_id, staffId, replyMsg]);
      const patient = await Patient.findById(r.patient_id);
      if (patient.email) {
        const { sendEmail } = require('../config/email');
        const html = '<p>Dear ' + patient.name + ',</p><p>Your appointment request for <b>' + r.requested_date + ' at ' + r.requested_time + '</b> has been declined.</p><p>Reason: ' + (reason||'No slot available') + '</p><p>Please log in to request a new time.</p>';
        sendEmail(patient.email, 'Appointment Request Declined - MediCare Pro', html).catch(console.error);
      }
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  },
`;
  ctrl = ctrl.replace('module.exports = {', 'module.exports = {' + extra);
  fs.writeFileSync('backend/controllers/appointmentController.js', ctrl, 'utf8');
  console.log('controller updated');
}

// ── 3. Update index.html appointments page ───────────────────
let html = fs.readFileSync('frontend/index.html', 'utf8');
if (!html.includes('appt-requests-section')) {
  html = html.replace(
    '<table class="data-table" id="appts-table">',
    `<div id="appt-requests-section" style="margin-bottom:24px;display:none">
        <h3 style="color:#1a237e;margin-bottom:12px;font-size:16px">Pending Appointment Requests</h3>
        <table class="data-table" id="appt-requests-table">
          <thead><tr><th>Patient</th><th>Doctor</th><th>Date</th><th>Time</th><th>Reason</th><th>Actions</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
      <h3 style="color:#1a237e;margin-bottom:12px;font-size:16px">All Appointments</h3>
      <table class="data-table" id="appts-table">`
  );
  fs.writeFileSync('frontend/index.html', html, 'utf8');
  console.log('index.html updated');
}

// ── 4. Update app.js loadAppointments ────────────────────────
let js = fs.readFileSync('frontend/js/app.js', 'utf8');
if (!js.includes('loadApptRequests')) {
  const reqCode = `
async function loadApptRequests() {
  const data = await api('/appointments/requests');
  const section = document.getElementById('appt-requests-section');
  const tbody = document.querySelector('#appt-requests-table tbody');
  if (!Array.isArray(data) || !data.length) { if(section) section.style.display='none'; return; }
  if(section) section.style.display='block';
  tbody.innerHTML = data.map(r => \`
    <tr>
      <td><b>\${r.patient_code}</b> \${r.patient_name}</td>
      <td>\${r.doctor_name || 'Any'} \${r.doctor_spec ? '('+r.doctor_spec+')' : ''}</td>
      <td>\${r.requested_date}</td>
      <td>\${r.requested_time}</td>
      <td>\${r.reason || '–'}</td>
      <td>
        <button class="btn-success btn-sm" onclick="confirmApptRequest(\${r.id})">Confirm</button>
        <button class="btn-danger btn-sm" onclick="rejectApptRequest(\${r.id})">Reject</button>
      </td>
    </tr>\`).join('');
}

async function confirmApptRequest(id) {
  if (!confirm('Confirm this appointment request? Patient will be notified by email.')) return;
  const data = await api('/appointments/requests/'+id+'/confirm', {method:'POST'});
  if (data?.success) { toast('Appointment confirmed! Patient notified.'); loadApptRequests(); loadAppointments(); }
  else toast(data?.error || 'Error', 'error');
}

async function rejectApptRequest(id) {
  const reason = prompt('Reason for rejection (optional):', 'No slot available at requested time');
  if (reason === null) return;
  const data = await api('/appointments/requests/'+id+'/reject', {method:'POST', body:JSON.stringify({reason})});
  if (data?.success) { toast('Request rejected. Patient notified.'); loadApptRequests(); }
  else toast(data?.error || 'Error', 'error');
}
`;
  js = js.replace('async function loadAppointments()', reqCode + '\nasync function loadAppointments()');
  
  // Also call loadApptRequests inside loadAppointments
  js = js.replace(
    'async function loadAppointments() {\n  const data = await api',
    'async function loadAppointments() {\n  loadApptRequests();\n  const data = await api'
  );
  fs.writeFileSync('frontend/js/app.js', js, 'utf8');
  console.log('app.js updated');
}

console.log('ALL DONE');
