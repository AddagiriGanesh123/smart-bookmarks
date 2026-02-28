require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const app = express();

// Ensure uploads dir exists
const uploadsDir = path.join(__dirname, '../uploads/chat');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/patients',      require('./routes/patients'));
app.use('/api/appointments',  require('./routes/appointments'));
app.use('/api/reports',       require('./routes/reports'));
app.use('/api/bills',         require('./routes/bills'));
app.use('/api/chat',          require('./routes/chat'));
app.use('/api/notifications', require('./routes/notifications'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// SPA fallback
app.get('/portal', (req, res) => res.sendFile(path.join(__dirname, '../frontend/portal.html')));
app.get('/login',  (req, res) => res.sendFile(path.join(__dirname, '../frontend/login.html')));
app.get('*',       (req, res) => res.sendFile(path.join(__dirname, '../frontend/index.html')));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🏥 MediCare Pro running on port ${PORT}`);
  console.log(`   Dashboard: http://localhost:${PORT}`);
  console.log(`   Portal:    http://localhost:${PORT}/portal`);
  console.log(`   API:       http://localhost:${PORT}/api/health\n`);
});

module.exports = app;
