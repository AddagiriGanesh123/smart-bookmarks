const { query } = require('../config/db');
const bcrypt = require('bcryptjs');

class Patient {
  static async findAll({ search = '', page = 1, limit = 20 } = {}) {
    page = parseInt(page); limit = parseInt(limit);
    const offset = (page - 1) * limit;
    const like = `%${search}%`;
    const { rows } = await query(
      `SELECT id, patient_id, name, email, phone, date_of_birth, gender, blood_group, is_active, created_at
       FROM patients
       WHERE name ILIKE $1 OR patient_id ILIKE $2 OR phone ILIKE $3 OR email ILIKE $4
       ORDER BY created_at DESC LIMIT $5 OFFSET $6`,
      [like, like, like, like, limit, offset]
    );
    const { rows: countRows } = await query(
      `SELECT COUNT(*)::int AS total FROM patients WHERE name ILIKE $1 OR patient_id ILIKE $2 OR phone ILIKE $3 OR email ILIKE $4`,
      [like, like, like, like]
    );
    const total = countRows[0].total;
    return { rows, total, page, pages: Math.ceil(total / limit) };
  }

  static async findById(id) {
    const { rows } = await query('SELECT * FROM patients WHERE id = $1', [id]);
    return rows[0] || null;
  }

  static async findByPatientId(patientId) {
    const { rows } = await query('SELECT * FROM patients WHERE patient_id = $1', [patientId]);
    return rows[0] || null;
  }

  static async create(data) {
    const patientId = await Patient.generatePatientId();
    const portalPassword = data.portal_password ? await bcrypt.hash(data.portal_password, 10) : null;
    const { rows } = await query(
      `INSERT INTO patients (patient_id, name, email, phone, date_of_birth, gender, blood_group,
        address, emergency_contact_name, emergency_contact_phone, portal_password)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [patientId, data.name, data.email || null, data.phone, data.date_of_birth || null,
       data.gender || null, data.blood_group || null, data.address || null,
       data.emergency_contact_name || null, data.emergency_contact_phone || null, portalPassword]
    );
    return { id: rows[0].id, patient_id: patientId };
  }

  static async update(id, data) {
    const allowed = ['name','email','phone','date_of_birth','gender','blood_group','address',
                     'emergency_contact_name','emergency_contact_phone','fcm_token','is_active'];
    const fields = [], values = [];
    let i = 1;
    allowed.forEach(f => {
      if (data[f] !== undefined) { fields.push(`${f} = $${i++}`); values.push(data[f]); }
    });
    if (!fields.length) return false;
    values.push(id);
    await query(`UPDATE patients SET ${fields.join(', ')} WHERE id = $${i}`, values);
    return true;
  }

  static async delete(id) {
    await query('UPDATE patients SET is_active = false WHERE id = $1', [id]);
    return true;
  }

  static async generatePatientId() {
    const { rows } = await query(
      `SELECT MAX(CAST(SUBSTRING(patient_id FROM 4) AS INTEGER)) AS max FROM patients WHERE patient_id LIKE 'MED%'`
    );
    const next = (rows[0].max || 1000) + 1;
    return `MED${next}`;
  }

  static async verifyPortalLogin(patientId, password) {
    const patient = await Patient.findByPatientId(patientId);
    if (!patient || !patient.portal_password) return null;
    const match = await bcrypt.compare(password, patient.portal_password);
    return match ? patient : null;
  }
}

module.exports = Patient;
