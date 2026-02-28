const { query } = require('../config/db');

class Report {
  static async findAll({ patient_id, doctor_id, status, page = 1, limit = 20 } = {}) {
    page = parseInt(page); limit = parseInt(limit);
    const offset = (page - 1) * limit;
    const conditions = ['1=1'], params = [];
    let i = 1;
    if (patient_id) { conditions.push(`r.patient_id = $${i++}`); params.push(patient_id); }
    if (doctor_id)  { conditions.push(`r.doctor_id = $${i++}`); params.push(doctor_id); }
    if (status)     { conditions.push(`r.status = $${i++}`); params.push(status); }
    const where = conditions.join(' AND ');

    const { rows } = await query(
      `SELECT r.*, p.name AS patient_name, p.patient_id AS patient_code, s.name AS doctor_name
       FROM reports r
       JOIN patients p ON r.patient_id = p.id
       LEFT JOIN staff s ON r.doctor_id = s.id
       WHERE ${where} ORDER BY r.created_at DESC LIMIT $${i++} OFFSET $${i}`,
      [...params, limit, offset]
    );
    const { rows: cnt } = await query(
      `SELECT COUNT(*)::int AS total FROM reports r WHERE ${where}`, params
    );
    return { rows, total: cnt[0].total, page, pages: Math.ceil(cnt[0].total / limit) };
  }

  static async findById(id) {
    const { rows } = await query(
      `SELECT r.*, p.name AS patient_name, p.patient_id AS patient_code, p.email, p.phone,
              s.name AS doctor_name
       FROM reports r
       JOIN patients p ON r.patient_id = p.id
       LEFT JOIN staff s ON r.doctor_id = s.id
       WHERE r.id = $1`, [id]
    );
    return rows[0] || null;
  }

  static async create(data) {
    const { rows } = await query(
      `INSERT INTO reports (patient_id, doctor_id, report_type, title, description, findings, recommendations, file_path, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [data.patient_id, data.doctor_id || null, data.report_type, data.title,
       data.description || null, data.findings || null, data.recommendations || null,
       data.file_path || null, data.status || 'pending']
    );
    return rows[0].id;
  }

  static async update(id, data) {
    const allowed = ['doctor_id','report_type','title','description','findings','recommendations','file_path','status'];
    const fields = [], values = [];
    let i = 1;
    allowed.forEach(f => { if (data[f] !== undefined) { fields.push(`${f} = $${i++}`); values.push(data[f]); } });
    if (!fields.length) return false;
    values.push(id);
    await query(`UPDATE reports SET ${fields.join(', ')} WHERE id = $${i}`, values);
    return true;
  }
}

module.exports = Report;
