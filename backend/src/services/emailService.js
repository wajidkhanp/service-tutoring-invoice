const { Resend } = require('resend');
const { buildInvoicePdf } = require('./pdfService');

function isEmailConfigured() {
  return !!process.env.RESEND_API_KEY;
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

async function sendInvoiceEmail(invoice, config, student) {
  if (!isEmailConfigured()) {
    throw new Error('Email not configured. Add RESEND_API_KEY to environment variables.');
  }

  const recipientEmail = student.email || invoice.studentEmail;
  if (!recipientEmail) throw new Error('No email address for this student.');

  const pdfBuffer = await buildInvoicePdf(invoice, config, student);
  const fileName = `Invoice_${invoice.invoiceNumber}_${(invoice.studentName || '').replace(/\s+/g, '_')}_${invoice.month}_${invoice.year}.pdf`;
  const orgName = config.organizationName || 'Noor Tutoring';
  const fromEmail = process.env.RESEND_FROM_EMAIL || `invoices@wajid.dev`;

  const resend = new Resend(process.env.RESEND_API_KEY);

  await resend.emails.send({
    from: `${orgName} <${fromEmail}>`,
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
    attachments: [{ filename: fileName, content: pdfBuffer }],
  });
}

module.exports = { sendInvoiceEmail, isEmailConfigured };
