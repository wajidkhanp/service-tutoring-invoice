const nodemailer = require('nodemailer');
const { buildInvoicePdf } = require('./pdfService');

function isEmailConfigured() {
  return (
    process.env.GMAIL_USER &&
    process.env.GMAIL_APP_PASSWORD &&
    process.env.GMAIL_APP_PASSWORD !== 'your-app-password'
  );
}

function createTransport() {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    family: 4,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

async function sendInvoiceEmail(invoice, config, student) {
  if (!isEmailConfigured()) {
    throw new Error('Gmail not configured. Add GMAIL_USER and GMAIL_APP_PASSWORD to .env');
  }

  const recipientEmail = student.email || invoice.studentEmail;
  if (!recipientEmail) throw new Error('No email address for this student.');

  const pdfBuffer = await buildInvoicePdf(invoice, config, student);
  const fileName = `Invoice_${invoice.invoiceNumber}_${(invoice.studentName || '').replace(/\s+/g, '_')}_${invoice.month}_${invoice.year}.pdf`;
  const orgName = config.organizationName || 'Noor Tutoring';

  await createTransport().sendMail({
    from: `"${orgName}" <${process.env.GMAIL_USER}>`,
    to: recipientEmail,
    subject: `Invoice #${invoice.invoiceNumber} — ${invoice.studentName} — ${invoice.month} ${invoice.year}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;color:#111827">
        <p>Dear Parent/Guardian,</p>
        <p>Please find attached the invoice for <strong>${invoice.studentName}</strong> for <strong>${invoice.month} ${invoice.year}</strong>.</p>
        <table style="border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:4px 16px 4px 0;color:#6b7280;font-size:14px">Invoice #</td><td style="font-size:14px">${invoice.invoiceNumber}</td></tr>
          <tr><td style="padding:4px 16px 4px 0;color:#6b7280;font-size:14px">Amount Due</td><td style="font-size:14px;font-weight:700">$${Number(invoice.amount).toFixed(2)}</td></tr>
          ${invoice.dueDate ? `<tr><td style="padding:4px 16px 4px 0;color:#6b7280;font-size:14px">Due Date</td><td style="font-size:14px">${formatDate(invoice.dueDate)}</td></tr>` : ''}
        </table>
        <p style="font-size:14px;color:#4b5563">Payment can be made through ESA/ClassWallet or other approved methods.</p>
        <p style="font-size:14px">Thank you,<br/><strong>${config.representative || 'Tariq Khalil'}</strong><br/>${orgName}</p>
      </div>
    `,
    attachments: [{ filename: fileName, content: pdfBuffer, contentType: 'application/pdf' }],
  });
}

module.exports = { sendInvoiceEmail, isEmailConfigured };
