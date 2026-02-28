const router = require('express').Router();
const { query } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Staff login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const { rows } = await query('SELECT * FROM staff WHERE email = $1 AND is_active = true', [email]);
    const staff = rows[0];
    if (!staff) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, staff.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: staff.id, email: staff.email, role: staff.role, name: staff.name },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '12h' }
    );
    res.json({ success: true, token, user: { id: staff.id, name: staff.name, email: staff.email, role: staff.role } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Change password
router.post('/change-password', async (req, res) => {
  try {
    const { email, old_password, new_password } = req.body;
    const { rows } = await query('SELECT * FROM staff WHERE email = $1', [email]);
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    const match = await bcrypt.compare(old_password, rows[0].password);
    if (!match) return res.status(401).json({ error: 'Current password is incorrect' });
    const hashed = await bcrypt.hash(new_password, 10);
    await query('UPDATE staff SET password = $1 WHERE email = $2', [hashed, email]);
    res.json({ success: true, message: 'Password changed' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
