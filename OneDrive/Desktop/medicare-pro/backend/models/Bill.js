const { query, pool } = require('../config/db');

class Bill {
  static async findAll({ patient_id, status, page = 1, limit = 20 } = {}) {
    page = parseInt(page); limit = parseInt(limit);
    const offset = (page - 1) * limit;
    const conditions = ['1=1'], params = [];
    let i = 1;
    if (patient_id) { conditions.push(`b.patient_id = $${i++}`); params.push(patient_id); }
    if (status)     { conditions.push(`b.status = $${i++}`); params.push(status); }
    const where = conditions.join(' AND ');

    const { rows } = await query(
      `SELECT b.*, p.name AS patient_name, p.patient_id AS patient_code
       FROM bills b JOIN patients p ON b.patient_id = p.id
       WHERE ${where} ORDER BY b.created_at DESC LIMIT $${i++} OFFSET $${i}`,
      [...params, limit, offset]
    );
    const { rows: cnt } = await query(
      `SELECT COUNT(*)::int AS total FROM bills b WHERE ${where}`, params
    );
    return { rows, total: cnt[0].total, page, pages: Math.ceil(cnt[0].total / limit) };
  }

  static async findById(id) {
    const { rows } = await query(
      `SELECT b.*, p.name AS patient_name, p.patient_id AS patient_code, p.email, p.phone, p.address
       FROM bills b JOIN patients p ON b.patient_id = p.id WHERE b.id = $1`, [id]
    );
    if (!rows[0]) return null;
    const { rows: items } = await query('SELECT * FROM bill_items WHERE bill_id = $1 ORDER BY id', [id]);
    return { ...rows[0], items };
  }

  static async create(data, items = []) {
    const billNumber = await Bill.generateBillNumber();
    const subtotal = items.reduce((s, i) => s + (parseFloat(i.quantity || 1) * parseFloat(i.unit_price)), 0);
    const tax = parseFloat(data.tax) || 0;
    const discount = parseFloat(data.discount) || 0;
    const total = subtotal + tax - discount;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `INSERT INTO bills (bill_number, patient_id, appointment_id, subtotal, tax, discount, total, status, due_date, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
        [billNumber, data.patient_id, data.appointment_id || null, subtotal, tax, discount, total,
         data.status || 'pending', data.due_date || null, data.notes || null]
      );
      const billId = rows[0].id;
      for (const item of items) {
        const itemTotal = parseFloat(item.quantity || 1) * parseFloat(item.unit_price);
        await client.query(
          'INSERT INTO bill_items (bill_id, description, quantity, unit_price, total) VALUES ($1,$2,$3,$4,$5)',
          [billId, item.description, item.quantity || 1, item.unit_price, itemTotal]
        );
      }
      await client.query('COMMIT');
      return { id: billId, bill_number: billNumber, total };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async updatePayment(id, paid_amount, payment_method) {
    const bill = await Bill.findById(id);
    paid_amount = parseFloat(paid_amount);
    let status = 'pending';
    if (paid_amount >= parseFloat(bill.total)) status = 'paid';
    else if (paid_amount > 0) status = 'partial';
    await query(
      'UPDATE bills SET paid_amount = $1, payment_method = $2, status = $3 WHERE id = $4',
      [paid_amount, payment_method, status, id]
    );
    return status;
  }

  static async generateBillNumber() {
    const { rows } = await query(
      `SELECT MAX(CAST(SUBSTRING(bill_number FROM 5) AS INTEGER)) AS max FROM bills WHERE bill_number LIKE 'BILL%'`
    );
    return `BILL${String((rows[0].max || 0) + 1).padStart(6, '0')}`;
  }
}

module.exports = Bill;
