const Report = require('../models/Report');
const Patient = require('../models/Patient');
const notif = require('./notificationController');
const PDFDocument = require('pdfkit');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/chat/'),
  filename: (req, file, cb) => cb(null, `report_${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

module.exports = {
  upload: upload.single('file'),

  getAll: async (req, res) => {
    try { res.json(await Report.findAll(req.query)); }
    catch (err) { res.status(500).json({ error: err.message }); }
  },

  getById: async (req, res) => {
    try {
      const r = await Report.findById(req.params.id);
      if (!r) return res.status(404).json({ error: 'Not found' });
      res.json(r);
    } catch (err) { res.status(500).json({ error: err.message }); }
  },

  create: async (req, res) => {
    try {
      const data = { ...req.body };
      if (req.file) data.file_path = req.file.path;
      const id = await Report.create(data);
      const report = await Report.findById(id);
      const patient = await Patient.findById(report.patient_id);
      notif.notifyReportReady(patient, report).catch(console.error);
      res.status(201).json({ success: true, id });
    } catch (err) { res.status(500).json({ error: err.message }); }
  },

  update: async (req, res) => {
    try {
      await Report.update(req.params.id, req.body);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  },

  generatePDF: async (req, res) => {
    try {
      const report = await Report.findById(req.params.id);
      if (!report) return res.status(404).json({ error: 'Not found' });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="report_${report.id}.pdf"`);
      const doc = new PDFDocument({ margin: 0, size: 'A4' });
      doc.pipe(res);
      doc.rect(0, 0, 595, 110).fill('#1a73e8');
      doc.fontSize(26).fillColor('#ffffff').font('Helvetica-Bold').text('MediCare Pro', 40, 30);
      doc.fontSize(11).fillColor('#c8e0ff').font('Helvetica').text('Hospital Management System  |  Confidential Medical Report', 40, 62);
      doc.roundedRect(430, 25, 130, 28, 6).fill('#ffffff');
      doc.fontSize(10).fillColor('#1a73e8').font('Helvetica-Bold').text(`Report #${report.id}`, 435, 33);
      doc.roundedRect(430, 60, 130, 24, 5).fill('#1557b0');
      doc.fontSize(9).fillColor('#ffffff').font('Helvetica').text(`Date: ${new Date(report.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}`, 438, 67);
      doc.rect(30, 125, 535, 80).fill('#f0f7ff').stroke('#1a73e8');
      doc.fontSize(10).fillColor('#1a73e8').font('Helvetica-Bold').text('PATIENT INFORMATION', 45, 135);
      doc.moveTo(45, 148).lineTo(265, 148).lineWidth(1).stroke('#1a73e8');
      doc.fontSize(11).fillColor('#333').font('Helvetica-Bold').text('Patient Name:', 45, 155);
      doc.font('Helvetica').text(report.patient_name || 'N/A', 145, 155);
      doc.font('Helvetica-Bold').text('Patient ID:', 45, 172);
      doc.font('Helvetica').text(report.patient_code || 'N/A', 145, 172);
      doc.font('Helvetica-Bold').text('Doctor:', 310, 155);
      doc.font('Helvetica').text(report.doctor_name || 'N/A', 370, 155);
      doc.font('Helvetica-Bold').text('Report Date:', 310, 172);
      doc.font('Helvetica').text(new Date(report.created_at).toLocaleDateString('en-IN'), 390, 172);
      doc.rect(30, 220, 535, 50).fill('#1a73e8');
      doc.fontSize(16).fillColor('#ffffff').font('Helvetica-Bold').text(report.title || 'Medical Report', 45, 232);
      doc.fontSize(10).fillColor('#c8e0ff').font('Helvetica').text(`Type: ${report.report_type}`, 45, 252);
      const statusColor = report.status === 'reviewed' ? '#22c55e' : report.status === 'pending' ? '#f59e0b' : '#6366f1';
      doc.roundedRect(460, 228, 90, 24, 5).fill(statusColor);
      doc.fontSize(10).fillColor('#ffffff').font('Helvetica-Bold').text(report.status?.toUpperCase(), 468, 235);
      let y = 290;
      function drawSection(title, content) {
        if (!content) return;
        doc.rect(30, y, 535, 28).fill('#e8f0fe');
        doc.circle(45, y + 14, 6).fill('#1a73e8');
        doc.fontSize(12).fillColor('#1a73e8').font('Helvetica-Bold').text(title, 58, y + 8);
        y += 35;
        const textHeight = doc.heightOfString(content, { width: 495, fontSize: 11 }) + 20;
        doc.rect(30, y, 535, textHeight).fill('#ffffff').stroke('#e2e8f0');
        doc.fontSize(11).fillColor('#444').font('Helvetica').text(content, 45, y + 10, { width: 495 });
        y += textHeight + 15;
      }
      drawSection('Description', report.description);
      drawSection('Findings', report.findings);
      drawSection('Recommendations', report.recommendations);
      doc.rect(0, 780, 595, 62).fill('#1a73e8');
      doc.fontSize(9).fillColor('#ffffff').font('Helvetica').text('This document is confidential and intended solely for the patient and authorized medical personnel.', 40, 790, { align: 'center', width: 515 });
      doc.fontSize(8).fillColor('#c8e0ff').text(`Generated by MediCare Pro  •  ${new Date().toLocaleString()}  •  Unauthorized disclosure is prohibited`, 40, 810, { align: 'center', width: 515 });
      doc.end();
    } catch (err) { res.status(500).json({ error: err.message }); }
  },
};
