const { sendPushNotification } = require('../config/firebase');
const { query } = require('../config/db');
const { sendEmail } = require('../config/email');
const templates = require('../../notifications/templates');

async function notify(patient, templateKey, ...args) {
  const tmpl = templates[templateKey](patient, ...args);
  let status = 'pending';

  // Push notification
  if (patient.fcm_token) {
    const result = await sendPushNotification(patient.fcm_token, tmpl.title, tmpl.body, { type: tmpl.type });
    status = result.success ? 'sent' : 'failed';
  }

  // Email notification
  if (patient.email) {
    const emailHtml = buildEmailHtml(tmpl.title, tmpl.body, patient.name);
    await sendEmail(patient.email, tmpl.title, emailHtml);
  }

  await query(
    'INSERT INTO notification_logs (patient_id, type, title, message, status) VALUES ($1,$2,$3,$4,$5)',
    [patient.id, tmpl.type, tmpl.title, tmpl.body, status]
  );
  return { ...tmpl, status };
}

function buildEmailHtml(title, body, patientName) {
  return `
  <!DOCTYPE html>
  <html>
  <head><meta charset="UTF-8"></head>
  <body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb;padding:30px 0;">
      <tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a73e8,#0d47a1);padding:35px 40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:26px;letter-spacing:1px;">🏥 MediCare Pro</h1>
              <p style="color:#c8e0ff;margin:6px 0 0;font-size:13px;">Hospital Management System</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:35px 40px;">
              <p style="color:#555;font-size:15px;margin:0 0 10px;">Dear <b style="color:#1a73e8;">${patientName}</b>,</p>
              <div style="background:#f0f7ff;border-left:4px solid #1a73e8;border-radius:6px;padding:18px 20px;margin:20px 0;">
                <h2 style="color:#1a73e8;margin:0 0 8px;font-size:18px;">${title}</h2>
                <p style="color:#444;margin:0;font-size:14px;line-height:1.7;">${body}</p>
              </div>
              <p style="color:#777;font-size:13px;margin:20px 0 0;">If you have any questions, please contact us at your nearest MediCare Pro center.</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#1a73e8;padding:20px 40px;text-align:center;">
              <p style="color:#c8e0ff;margin:0;font-size:12px;">© 2026 MediCare Pro. All rights reserved.</p>
              <p style="color:#c8e0ff;margin:4px 0 0;font-size:11px;">This is an automated message. Please do not reply.</p>
            </td>
          </tr>

        </table>
      </td></tr>
    </table>
  </body>
  </html>`;
}

module.exports = {
  notifyRegistration:          (p)    => notify(p, 'PATIENT_REGISTERED'),
  notifyAppointmentScheduled:  (p, a) => notify(p, 'APPOINTMENT_SCHEDULED', a),
  notifyAppointmentCancelled:  (p, a) => notify(p, 'APPOINTMENT_CANCELLED', a),
  notifyReportReady:           (p, r) => notify(p, 'REPORT_READY', r),
  notifyBillGenerated:         (p, b) => notify(p, 'BILL_GENERATED', b),
  notifyPaymentReceived:       (p, b) => notify(p, 'PAYMENT_RECEIVED', b),
  saveFcmToken: async (req, res) => {
    try {
      const { patient_id, fcm_token } = req.body;
      await query('UPDATE patients SET fcm_token = $1 WHERE id = $2', [fcm_token, patient_id]);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  },
  getLogs: async (req, res) => {
    try {
      const { patient_id } = req.query;
      let sql = 'SELECT * FROM notification_logs ORDER BY created_at DESC LIMIT 100';
      let params = [];
      if (patient_id) {
        sql = 'SELECT * FROM notification_logs WHERE patient_id = $1 ORDER BY created_at DESC LIMIT 50';
        params = [patient_id];
      }
      const { rows } = await query(sql, params);
      res.json({ rows });
    } catch (err) { res.status(500).json({ error: err.message }); }
  },
};
