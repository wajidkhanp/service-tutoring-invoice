const express = require('express');
const archiver = require('archiver');
const { v4: uuidv4 } = require('uuid');
const { readJson, writeJson } = require('../services/storageService');
const requireAuth = require('../middleware/requireAuth');
const { appendEvent } = require('../services/auditService');
const { buildInvoicePdf } = require('../services/pdfService');
const { sendInvoiceEmail } = require('../services/emailService');

const router = express.Router();
const INVOICES_FILE = 'invoices.json';
const CONFIG_FILE = 'config.json';
const STUDENTS_FILE = 'students.json';

function loadInvoices() { return readJson(INVOICES_FILE); }
function saveInvoices(invoices) { writeJson(INVOICES_FILE, invoices); }
function loadConfig() { return readJson(CONFIG_FILE); }
function saveConfig(config) { writeJson(CONFIG_FILE, config); }
function loadStudents() { return readJson(STUDENTS_FILE); }
function findStudentById(id) { return loadStudents().find((s) => s.id === id) || null; }

function pdfFileName(invoice) {
  const name = (invoice.studentName || 'Student').replace(/\s+/g, '_');
  return `${invoice.invoiceNumber}_${name}_${invoice.month}_${invoice.year}.pdf`;
}

router.use(requireAuth);

router.get('/', (req, res) => {
  let invoices = loadInvoices();
  const { month, year } = req.query;
  if (month) invoices = invoices.filter((inv) => inv.month === month);
  if (year)  invoices = invoices.filter((inv) => String(inv.year) === String(year));
  invoices = invoices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ invoices });
});

// ── CSV export ───────────────────────────────────────────────
router.get('/export/csv', (req, res) => {
  let invoices = loadInvoices();
  const { month, year } = req.query;
  if (month) invoices = invoices.filter((inv) => inv.month === month);
  if (year)  invoices = invoices.filter((inv) => String(inv.year) === String(year));
  invoices = invoices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const escape = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
  const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('en-US') : '';

  const headers = ['Invoice #', 'Student', 'Description', 'Month', 'Year', 'Hours', 'Rate', 'Amount', 'Due Date', 'Status', 'Created'];
  const rows = invoices.map((inv) => [
    inv.invoiceNumber,
    escape(inv.studentName),
    escape(inv.description),
    inv.month,
    inv.year,
    inv.hours,
    inv.rate,
    inv.amount,
    fmtDate(inv.dueDate),
    inv.status,
    fmtDate(inv.createdAt),
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const fileName = month && year ? `invoices_${month}_${year}.csv` : 'invoices.csv';

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.send(csv);
});

// ── Create single invoice record ─────────────────────────────
router.post('/generate', async (req, res, next) => {
  try {
    const { studentId, studentName, description, hours, rate, dueDate, month, year, sendEmail } = req.body;
    const invoiceHours = Number(hours);
    const invoiceRate = Number(rate);

    if (!studentId || !studentName || !description) {
      return res.status(400).json({ error: 'Student, description, and amount fields are required.' });
    }
    if (Number.isNaN(invoiceHours) || invoiceHours <= 0) {
      return res.status(400).json({ error: 'Hours must be a positive number.' });
    }
    if (Number.isNaN(invoiceRate) || invoiceRate < 0) {
      return res.status(400).json({ error: 'Rate must be a valid number.' });
    }

    const config = loadConfig();
    const invoiceNumber = config.nextInvoiceNumber || 1000;
    const now = new Date().toISOString();
    const invoiceMonth = month || new Date(now).toLocaleString('en-US', { month: 'long' });
    const invoiceYear = year || new Date(now).getFullYear();

    const invoice = {
      id: uuidv4(),
      invoiceNumber,
      studentId,
      studentName,
      description: description.trim(),
      hours: invoiceHours,
      rate: invoiceRate,
      amount: Number((invoiceHours * invoiceRate).toFixed(2)),
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      month: invoiceMonth,
      year: Number(invoiceYear),
      date: now,
      status: 'generated',
      createdAt: now,
      createdBy: req.user.email,
    };

    const invoices = loadInvoices();
    invoices.unshift(invoice);
    saveInvoices(invoices);
    saveConfig({ ...config, nextInvoiceNumber: invoiceNumber + 1 });

    appendEvent('invoice_generated', `${req.user.email} created invoice ${invoiceNumber} for ${studentName}`, req.user.email);

    let emailSent = false;
    let emailError = null;
    if (sendEmail) {
      try {
        const student = findStudentById(studentId) || {};
        await sendInvoiceEmail(invoice, config, student);
        emailSent = true;
        appendEvent('invoice_emailed', `${req.user.email} emailed invoice ${invoiceNumber} to ${student.email || ''}`, req.user.email);
      } catch (err) {
        emailError = err.message;
      }
    }

    res.status(201).json({
      invoice: { ...invoice, downloadUrl: `/api/invoices/${invoice.invoiceNumber}/download` },
      emailSent,
      emailError,
    });
  } catch (err) {
    next(err);
  }
});

// ── Bulk create invoice records ──────────────────────────────
router.post('/generate-all', async (req, res, next) => {
  try {
    const { month, year, sendEmail } = req.body;
    if (!month || !year) {
      return res.status(400).json({ error: 'Month and year are required for batch generation.' });
    }

    const config = loadConfig();
    const invoices = loadInvoices();
    const students = loadStudents().filter((s) => s.active !== false);
    if (students.length === 0) {
      return res.status(400).json({ error: 'No active students found for batch generation.' });
    }

    let invoiceNumber = config.nextInvoiceNumber || 1000;
    let created = 0;
    let skipped = 0;
    let totalAmount = 0;
    const createdPairs = [];

    for (const student of students) {
      const alreadyExists = invoices.some(
        (inv) => inv.studentId === student.id && inv.month === month && String(inv.year) === String(year)
      );
      if (alreadyExists) { skipped++; continue; }

      const now = new Date().toISOString();
      const hours = Number(student.hours) || 40;
      const rate = Number(student.rate) || 0;
      const amount = Number((hours * rate).toFixed(2));
      const description = student.notes?.trim() || `4 weeks of tutoring for ${student.name}`;
      const dueDate = new Date(new Date(now).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const invoiceRecord = {
        id: uuidv4(),
        invoiceNumber,
        studentId: student.id,
        studentName: student.name,
        description,
        hours,
        rate,
        amount,
        dueDate,
        month,
        year: Number(year),
        date: now,
        status: 'generated',
        createdAt: now,
        createdBy: req.user.email,
      };

      invoices.unshift(invoiceRecord);
      createdPairs.push({ invoice: invoiceRecord, student });
      totalAmount += amount;
      invoiceNumber++;
      created++;
    }

    saveInvoices(invoices);
    if (created > 0) {
      saveConfig({ ...config, nextInvoiceNumber: invoiceNumber });
      appendEvent('invoice_bulk', `${req.user.email} created ${created} invoice records for ${month} ${year}`, req.user.email);
    }

    let emailed = 0;
    const emailErrors = [];
    if (sendEmail && createdPairs.length > 0) {
      for (const { invoice, student } of createdPairs) {
        try {
          await sendInvoiceEmail(invoice, config, student);
          emailed++;
        } catch (err) {
          emailErrors.push(`${invoice.studentName}: ${err.message}`);
        }
      }
      if (emailed > 0) {
        appendEvent('invoice_bulk_emailed', `${req.user.email} emailed ${emailed} invoices for ${month} ${year}`, req.user.email);
      }
    }

    res.json({ summary: { created, skipped, totalAmount, month, year, emailed, emailErrors } });
  } catch (err) {
    next(err);
  }
});

// ── Stream ZIP of PDFs generated on the fly ─────────────────
router.get('/zip/:year/:month', async (req, res, next) => {
  try {
    const { year, month } = req.params;
    const invoices = loadInvoices().filter(
      (inv) => inv.month === month && String(inv.year) === String(year)
    );

    if (invoices.length === 0) {
      return res.status(404).json({ error: 'No invoices found for that month.' });
    }

    const config = loadConfig();

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="invoices_${month}_${year}.zip"`);

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.on('error', (err) => next(err));
    archive.pipe(res);

    for (const invoice of invoices) {
      const student = findStudentById(invoice.studentId) || {};
      const pdfBuffer = await buildInvoicePdf(invoice, config, student);
      archive.append(pdfBuffer, { name: pdfFileName(invoice) });
    }

    await archive.finalize();
  } catch (err) {
    next(err);
  }
});

// ── Re-send email for an existing invoice ───────────────────
router.post('/:invoiceNumber/email', async (req, res, next) => {
  try {
    const invoiceNumber = Number(req.params.invoiceNumber);
    const invoice = loadInvoices().find((inv) => inv.invoiceNumber === invoiceNumber);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });

    const config = loadConfig();
    const student = findStudentById(invoice.studentId) || {};

    await sendInvoiceEmail(invoice, config, student);
    appendEvent('invoice_emailed', `${req.user.email} emailed invoice ${invoiceNumber} to ${student.email || ''}`, req.user.email);

    res.json({ message: 'Email sent successfully.' });
  } catch (err) {
    if (err.message.includes('Gmail not configured') || err.message.includes('No email address')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

// ── Stream single PDF generated on the fly ───────────────────
router.get('/:invoiceNumber/download', async (req, res, next) => {
  try {
    const invoiceNumber = Number(req.params.invoiceNumber);
    const invoice = loadInvoices().find((inv) => inv.invoiceNumber === invoiceNumber);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });

    const config = loadConfig();
    const student = findStudentById(invoice.studentId) || {};
    const pdfBuffer = await buildInvoicePdf(invoice, config, student);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${pdfFileName(invoice)}"`);
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
