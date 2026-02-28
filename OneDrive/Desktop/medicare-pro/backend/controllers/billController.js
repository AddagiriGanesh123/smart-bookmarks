const Bill = require('../models/Bill');
const Patient = require('../models/Patient');
const notif = require('./notificationController');
const PDFDocument = require('pdfkit');

module.exports = {
  getAll: async (req, res) => {
    try { res.json(await Bill.findAll(req.query)); }
    catch (err) { res.status(500).json({ error: err.message }); }
  },

  getById: async (req, res) => {
    try {
      const b = await Bill.findById(req.params.id);
      if (!b) return res.status(404).json({ error: 'Not found' });
      res.json(b);
    } catch (err) { res.status(500).json({ error: err.message }); }
  },

  create: async (req, res) => {
    try {
      const { items = [], ...billData } = req.body;
      const result = await Bill.create(billData, items);
      const bill = await Bill.findById(result.id);
      const patient = await Patient.findById(bill.patient_id);
      notif.notifyBillGenerated(patient, bill).catch(console.error);
      res.status(201).json({ success: true, ...result });
    } catch (err) { res.status(500).json({ error: err.message }); }
  },

  recordPayment: async (req, res) => {
    try {
      const { paid_amount, payment_method } = req.body;
      const status = await Bill.updatePayment(req.params.id, paid_amount, payment_method);
      if (status === 'paid') {
        const bill = await Bill.findById(req.params.id);
        const patient = await Patient.findById(bill.patient_id);
        notif.notifyPaymentReceived(patient, bill).catch(console.error);
      }
      res.json({ success: true, status });
    } catch (err) { res.status(500).json({ error: err.message }); }
  },

  generatePDF: async (req, res) => {
    try {
      const bill = await Bill.findById(req.params.id);
      if (!bill) return res.status(404).json({ error: 'Not found' });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="invoice_${bill.bill_number}.pdf"`);

      const doc = new PDFDocument({ margin: 0, size: 'A4' });
      doc.pipe(res);

      // ── Top banner ──
      doc.rect(0, 0, 595, 120).fill('#1a73e8');
      doc.rect(0, 100, 595, 20).fill('#1557b0');

      // Hospital name
      doc.fontSize(28).fillColor('#ffffff').font('Helvetica-Bold').text('MediCare Pro', 40, 28);
      doc.fontSize(11).fillColor('#c8e0ff').font('Helvetica').text('Hospital Management System', 40, 62);
      doc.fontSize(10).fillColor('#c8e0ff').text('Quality Healthcare, Trusted Always', 40, 78);

      // INVOICE label
      doc.fontSize(32).fillColor('#ffffff').font('Helvetica-Bold').text('INVOICE', 380, 25);
      doc.roundedRect(390, 68, 165, 26, 5).fill('#ffffff');
      doc.fontSize(12).fillColor('#1a73e8').font('Helvetica-Bold').text(`#${bill.bill_number}`, 395, 75);

      // ── Bill To + Date card ──
      doc.rect(30, 135, 250, 100).fill('#f0f7ff').stroke('#1a73e8');
      doc.fontSize(9).fillColor('#1a73e8').font('Helvetica-Bold').text('BILL TO', 45, 145);
      doc.moveTo(45, 156).lineTo(265, 156).lineWidth(1).stroke('#1a73e8');
      doc.fontSize(14).fillColor('#222').font('Helvetica-Bold').text(bill.patient_name, 45, 162);
      doc.fontSize(10).fillColor('#555').font('Helvetica').text(`Patient ID: ${bill.patient_code}`, 45, 182);
      if (bill.phone) doc.text(`Phone: ${bill.phone}`, 45, 197);
      if (bill.email) doc.text(`Email: ${bill.email}`, 45, 212);

      doc.rect(315, 135, 250, 100).fill('#f0f7ff').stroke('#1a73e8');
      doc.fontSize(9).fillColor('#1a73e8').font('Helvetica-Bold').text('INVOICE DETAILS', 330, 145);
      doc.moveTo(330, 156).lineTo(550, 156).lineWidth(1).stroke('#1a73e8');
      doc.fontSize(10).fillColor('#555').font('Helvetica-Bold').text('Invoice Date:', 330, 162);
      doc.font('Helvetica').text(new Date(bill.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), 430, 162);
      if (bill.due_date) {
        doc.font('Helvetica-Bold').text('Due Date:', 330, 180);
        doc.font('Helvetica').text(new Date(bill.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), 430, 180);
      }
      doc.font('Helvetica-Bold').text('Status:', 330, 198);
      const statusColor = bill.status === 'paid' ? '#22c55e' : bill.status === 'partial' ? '#f59e0b' : '#ef4444';
      doc.roundedRect(390, 194, 70, 20, 4).fill(statusColor);
      doc.fontSize(9).fillColor('#ffffff').font('Helvetica-Bold').text(bill.status.toUpperCase(), 393, 199);

      // ── Table header ──
      let y = 255;
      doc.rect(30, y, 535, 28).fill('#1a73e8');
      doc.fontSize(11).fillColor('#ffffff').font('Helvetica-Bold');
      doc.text('Description', 45, y + 8, { width: 230 });
      doc.text('Qty', 285, y + 8, { width: 50, align: 'center' });
      doc.text('Unit Price', 345, y + 8, { width: 90, align: 'right' });
      doc.text('Total', 455, y + 8, { width: 90, align: 'right' });
      y += 32;

      // ── Table rows ──
      (bill.items || []).forEach((item, idx) => {
        const rowColor = idx % 2 === 0 ? '#f8faff' : '#ffffff';
        doc.rect(30, y - 4, 535, 24).fill(rowColor).stroke('#e2e8f0');
        doc.fontSize(10).fillColor('#333').font('Helvetica');
        doc.text(item.description, 45, y, { width: 230 });
        doc.text(String(item.quantity), 285, y, { width: 50, align: 'center' });
        doc.text(`₹${parseFloat(item.unit_price).toFixed(2)}`, 345, y, { width: 90, align: 'right' });
        doc.fillColor('#1a73e8').font('Helvetica-Bold').text(`₹${parseFloat(item.total).toFixed(2)}`, 455, y, { width: 90, align: 'right' });
        y += 24;
      });

      // ── Totals section ──
      y += 15;
      doc.rect(340, y, 225, 1).fill('#1a73e8');
      y += 10;

      const drawRow = (label, value, highlight = false) => {
        if (highlight) {
          doc.rect(340, y - 3, 225, 24).fill('#1a73e8');
          doc.fontSize(13).fillColor('#ffffff').font('Helvetica-Bold');
          doc.text(label, 350, y, { width: 100 });
          doc.text(`₹${parseFloat(value).toFixed(2)}`, 450, y, { width: 100, align: 'right' });
          y += 28;
        } else {
          doc.fontSize(10).fillColor('#555').font('Helvetica').text(label, 350, y, { width: 100 });
          doc.fillColor('#333').font('Helvetica-Bold').text(`₹${parseFloat(value).toFixed(2)}`, 450, y, { width: 100, align: 'right' });
          y += 18;
        }
      };

      drawRow('Subtotal:', bill.subtotal);
      if (parseFloat(bill.tax) > 0) drawRow('Tax:', bill.tax);
      if (parseFloat(bill.discount) > 0) drawRow('Discount:', bill.discount);
      if (parseFloat(bill.paid_amount) > 0) drawRow('Paid:', bill.paid_amount);
      y += 5;
      drawRow('TOTAL:', bill.total, true);

      // ── Thank you note ──
      y += 25;
      doc.rect(30, y, 535, 50).fill('#f0f7ff').stroke('#1a73e8');
      doc.fontSize(12).fillColor('#1a73e8').font('Helvetica-Bold').text('Thank you for choosing MediCare Pro!', 30, y + 10, { align: 'center', width: 535 });
      doc.fontSize(10).fillColor('#555').font('Helvetica').text('For queries, contact us at your nearest MediCare Pro center.', 30, y + 28, { align: 'center', width: 535 });

      // ── Footer ──
      doc.rect(0, 780, 595, 62).fill('#1a73e8');
      doc.fontSize(9).fillColor('#ffffff').font('Helvetica').text('MediCare Pro — Quality Healthcare, Trusted Always', 40, 790, { align: 'center', width: 515 });
      doc.fontSize(8).fillColor('#c8e0ff').text(`Generated on ${new Date().toLocaleString()}  •  This is a computer-generated invoice`, 40, 810, { align: 'center', width: 515 });

      doc.end();
    } catch (err) { res.status(500).json({ error: err.message }); }
  },
};
