const { query } = require('../config/db');
module.exports = {
  getPatientList: async (req, res) => {
    try {
      const { rows } = await query(`
        SELECT p.id, p.patient_id, p.name, p.phone,
          COUNT(CASE WHEN cm.sender_role = 'patient' AND cm.is_read = false THEN 1 END)::int AS unread_count,
          MAX(cm.created_at) AS last_message_at,
          (SELECT message FROM chat_messages WHERE patient_id = p.id ORDER BY created_at DESC LIMIT 1) AS last_message,
          (SELECT priority FROM chat_messages WHERE patient_id = p.id AND sender_role = 'patient' AND is_read = false ORDER BY CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 WHEN 'low' THEN 4 END LIMIT 1) AS highest_priority
        FROM patients p
        LEFT JOIN chat_messages cm ON cm.patient_id = p.id
        WHERE p.is_active = true
        GROUP BY p.id, p.patient_id, p.name, p.phone
        ORDER BY unread_count DESC, last_message_at DESC NULLS LAST
      `);
      res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
  },
  getMessages: async (req, res) => {
    try {
      const { rows } = await query(`
        SELECT cm.*, s.name AS staff_name FROM chat_messages cm
        LEFT JOIN staff s ON s.id = cm.sender_id
        WHERE cm.patient_id = $1 ORDER BY cm.created_at ASC
      `, [req.params.patientId]);
      res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
  },
  sendMessage: async (req, res) => {
    try {
      const { patient_id, message, priority = 'normal' } = req.body;
      const senderRole = req.user.role === 'patient' ? 'patient' : 'staff';
      const senderId = senderRole === 'staff' ? req.user.id : null;
      const pid = senderRole === 'patient' ? req.user.id : patient_id;
      const { rows } = await query(
        `INSERT INTO chat_messages (patient_id, sender_role, sender_id, message, priority) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [pid, senderRole, senderId, message, priority]
      );
      res.json(rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
  },
  markRead: async (req, res) => {
    try {
      await query(`UPDATE chat_messages SET is_read = true WHERE patient_id = $1 AND sender_role = 'patient' AND is_read = false`, [req.params.patientId]);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  },
  getUnreadForPatient: async (req, res) => {
    try {
      const pid = req.user.id;
      const { rows } = await query(`SELECT COUNT(*)::int AS unread FROM chat_messages WHERE patient_id = $1 AND sender_role = 'staff' AND is_read = false`, [pid]);
      await query(`UPDATE chat_messages SET is_read = true WHERE patient_id = $1 AND sender_role = 'staff'`, [pid]);
      res.json({ unread: rows[0].unread });
    } catch (err) { res.status(500).json({ error: err.message }); }
  },
  requestAppointment: async (req, res) => {
    try {
      const { doctor_id, requested_date, requested_time, reason } = req.body;
      const pid = req.user.id;
      const { rows: docRows } = await query('SELECT name, specialization FROM staff WHERE id = $1', [doctor_id]);
      if (!docRows.length) return res.status(404).json({ error: 'Doctor not found' });
      const doc = docRows[0];
      const msgText = `📅 Appointment Request\nDoctor: ${doc.name} (${doc.specialization})\nDate: ${requested_date}\nTime: ${requested_time}\nReason: ${reason || 'General consultation'}`;
      const { rows: msgRows } = await query(`INSERT INTO chat_messages (patient_id, sender_role, message, priority) VALUES ($1,'patient',$2,'high') RETURNING *`, [pid, msgText]);
      await query(`INSERT INTO appointment_requests (patient_id, doctor_id, requested_date, requested_time, reason, chat_message_id) VALUES ($1,$2,$3,$4,$5,$6)`, [pid, doctor_id, requested_date, requested_time, reason || '', msgRows[0].id]);
      res.json({ success: true, message: msgRows[0] });
    } catch (err) { res.status(500).json({ error: err.message }); }
  },
  getDoctors: async (req, res) => {
    try {
      const { rows } = await query(`SELECT id, name, specialization FROM staff WHERE role = 'doctor' AND is_active = true ORDER BY name`);
      res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
  },
  getTotalUnread: async (req, res) => {
    try {
      const { rows } = await query(`SELECT COUNT(*)::int AS total FROM chat_messages WHERE sender_role = 'patient' AND is_read = false`);
      res.json({ total: rows[0].total });
    } catch (err) { res.status(500).json({ error: err.message }); }
  }
};
