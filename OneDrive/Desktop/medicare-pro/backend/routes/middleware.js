const jwt = require('jsonwebtoken');
function verifyToken(req) {
  const header = req.headers.authorization;
  const queryToken = req.query.token;
  const token = header ? (header.startsWith('Bearer ') ? header.slice(7) : header) : queryToken;
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'secret');
  } catch {
    return null;
  }
}
// Staff or admin only
exports.staff = (req, res, next) => {
  const decoded = verifyToken(req);
  if (!decoded || decoded.role === 'patient') return res.status(401).json({ error: 'Unauthorized' });
  req.user = decoded;
  next();
};
// Any authenticated user (staff or patient)
exports.any = (req, res, next) => {
  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ error: 'Unauthorized' });
  req.user = decoded;
  next();
};
