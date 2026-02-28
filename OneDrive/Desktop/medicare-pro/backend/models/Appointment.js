const { query } = require('../config/db');

class Appointment {
  static async findAll({ patient_id, doctor_id, status, date, page = 1, limit = 20 } = {}) {
    page = parseInt(page); limit = parseInt(limit);
    const offset = (page - 1) * limit;
    const conditions = ['1=1'], params = [];
    let i = 1;
    if (patient_id) { conditions.push(`a.patient_id = $${i++}`); params.push(patient_id); }
    if (doctor_id)  { conditions.push(`a.doctor_id = $${i++}`); params.push(doctor_id); }
    if (status)     { conditions.push(`a.status = $${i++}`); params.push(status); }
    if (date)       { conditions.push(`a.appointment_date = $${i++}`); params.push(date); }
    const where = conditions.join(' AND ');

    const { rows } = await query(
      `SELECT a.*, p.name AS patient_name, p.patient_id AS patient_code, p.phone AS patient_phone,
              s.name AS doctor_name
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       LEFT JOIN staff s ON a.doctor_id = s.id
       WHERE ${where} ORDER BY a.appointment_date DESC, a.appointment_time DESC
       LIMIT $${i++} OFFSET $${i}`,
      [...params, limit, offset]
    );
    const { rows: cnt } = await query(
      `SELECT COUNT(*)::int AS total FROM appointments a WHERE ${where}`, params
    );
    return { rows, total: cnt[0].total, page, pages: Math.ceil(cnt[0].total / limit) };
  }

  static async findById(id) {
    const { rows } = await query(
      `SELECT a.*, p.name AS patient_name, p.patient_id AS patient_code, s.name AS doctor_name
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       LEFT JOIN staff s ON a.doctor_id = s.id
       WHERE a.id = $1`, [id]
    );
    return rows[0] || null;
  }

  static async create(data) {
    const { rows } = await query(
      `INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, type, notes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [data.patient_id, data.doctor_id || null, data.appointment_date, data.appointment_time,
       data.type || 'consultation', data.notes || null]
    );
    return rows[0].id;
  }

  static async update(id, data) {
    const allowed = ['doctor_id','appointment_date','appointment_time','type','status','notes'];
    const fields = [], values = [];
    let i = 1;
    allowed.forEach(f => { if (data[f] !== undefined) { fields.push(`${f} = $${i++}`); values.push(data[f]); } });
    if (!fields.length) return false;
    values.push(id);
    await query(`UPDATE appointments SET ${fields.join(', ')} WHERE id = $${i}`, values);
    return true;
  }
}

module.exports = Appointment;
