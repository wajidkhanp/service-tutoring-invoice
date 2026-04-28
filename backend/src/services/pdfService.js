const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function formatDate(isoDate) {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatLongDate(isoDate) {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// Returns a Buffer containing the PDF bytes — nothing is written to disk.
function buildInvoicePdf(invoice, config, student = {}) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const invoiceDate = invoice.createdAt || new Date().toISOString();
    const monthName = invoice.month || new Date(invoiceDate).toLocaleString('en-US', { month: 'long' });
    const year = invoice.year || new Date(invoiceDate).getFullYear();

    const accent = '#0d9488';
    const dark = '#111827';
    const mediumGray = '#4b5563';
    const lightGray = '#f8fafc';

    const company = config.organizationName || 'Noor Tutoring';
    const representative = config.representative || 'Tariq Khalil';

    doc
      .fillColor(accent)
      .fontSize(20)
      .text('Noor Tutoring Monthly Invoice', { align: 'center' });

    doc
      .moveDown(0.5)
      .fillColor(mediumGray)
      .fontSize(9)
      .text(company, { align: 'center' })
      .text(config.address || '', { align: 'center' })
      .text(`Phone: ${config.phone || ''} · Email: ${config.orgEmail || ''}`, { align: 'center' })
      .text(`EIN: ${config.ein || ''}`, { align: 'center' });

    const separatorY = doc.y + 10;
    doc.moveTo(50, separatorY).lineTo(545, separatorY).strokeColor(accent).lineWidth(1).stroke();

    const invoiceMetaX = 360;
    const invoiceMetaTop = separatorY + 12;
    doc.rect(invoiceMetaX, invoiceMetaTop, 180, 90).fill(lightGray);

    doc.fillColor(dark).fontSize(14).text('INVOICE', invoiceMetaX + 14, invoiceMetaTop + 12);
    doc.fontSize(9).fillColor(mediumGray).text('Invoice #', invoiceMetaX + 14, invoiceMetaTop + 36);
    doc.fillColor(dark).text(invoice.invoiceNumber.toString(), invoiceMetaX + 14, doc.y + 2);
    doc.fillColor(mediumGray).text('Invoice Date', invoiceMetaX + 14, doc.y + 8);
    doc.fillColor(dark).text(formatLongDate(invoiceDate), invoiceMetaX + 14, doc.y + 2);
    doc.fillColor(mediumGray).text('Due Date', invoiceMetaX + 14, doc.y + 8);
    doc.fillColor(dark).text(formatDate(invoice.dueDate), invoiceMetaX + 14, doc.y + 2);

    doc.moveDown(1);

    const billToTop = invoiceMetaTop + 110;
    const studentEmail = student.email || invoice.studentEmail || '';
    const studentAddress = student.address || '';
    const studentGrade = student.grade || '';
    const fieldLeft = 50;
    let currentY = billToTop + 18;

    doc.fillColor(accent).fontSize(12).text('Student Name:', fieldLeft, currentY);
    doc.fontSize(12).fillColor(dark).text(invoice.studentName, fieldLeft + 100, currentY);

    currentY += 18;
    doc.fillColor(accent).fontSize(12).text('Email:', fieldLeft, currentY);
    doc.fillColor(dark).fontSize(12).text(studentEmail || 'N/A', fieldLeft + 100, currentY);

    currentY += 18;
    doc.fillColor(accent).fontSize(12).text('Address:', fieldLeft, currentY);
    doc.fillColor(dark).fontSize(12).text(studentAddress || 'N/A', fieldLeft + 100, currentY, { width: 500 });

    currentY += 18;
    doc.fillColor(accent).fontSize(12).text('Grade:', fieldLeft, currentY);
    doc.fillColor(dark).fontSize(12).text(studentGrade || 'N/A', fieldLeft + 100, currentY);

    const tableTop = Math.max(currentY + 36, 260);
    const column = { description: 50, hours: 330, rate: 395, amount: 470 };

    doc.rect(50, tableTop, 495, 26).fill(accent);
    doc.fillColor('#ffffff').fontSize(10)
      .text('Description', column.description + 4, tableTop + 8)
      .text('Hours', column.hours + 4, tableTop + 8)
      .text('Rate', column.rate + 4, tableTop + 8)
      .text('Amount', column.amount + 4, tableTop + 8);

    const rowY = tableTop + 36;
    doc.fillColor(dark).fontSize(10)
      .text(invoice.description, column.description + 4, rowY, { width: 260, lineGap: 4 })
      .text(invoice.hours.toString(), column.hours + 4, rowY)
      .text(formatCurrency(invoice.rate), column.rate + 4, rowY)
      .text(formatCurrency(invoice.amount), column.amount + 4, rowY);

    const invoiceBottomY = rowY + 60;
    doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(50, invoiceBottomY - 15).lineTo(545, invoiceBottomY - 15).stroke();

    doc.fontSize(10).fillColor(mediumGray).text('Subtotal', column.rate + 4, invoiceBottomY);
    doc.fillColor(dark).text(formatCurrency(invoice.amount), column.amount + 4, invoiceBottomY);
    doc.fontSize(10).fillColor(mediumGray).text('Total Due', column.rate + 4, invoiceBottomY + 18);
    doc.font('Helvetica-Bold').fillColor(dark).text(formatCurrency(invoice.amount), column.amount + 4, invoiceBottomY + 18).font('Helvetica');

    const notesTop = invoiceBottomY + 60;
    doc.fillColor(accent).fontSize(12).text('Notes', 50, notesTop);
    doc.fontSize(9).fillColor(mediumGray).text(
      invoice.notes ||
        'This invoice covers one month (4 weeks) of tutoring for the subjects listed above. Tutoring services are provided by tutors under Momin Services of Arizona (Noor Tutoring). Payment can be made through ESA/ClassWallet or other approved methods.',
      50, doc.y + 6, { width: 495, lineGap: 4 }
    );

    const signatureTop = doc.y + 24;
    const signaturePath = path.join(__dirname, '../assets/signature.png');
    if (fs.existsSync(signaturePath)) {
      try { doc.image(signaturePath, 50, signatureTop, { width: 120 }); } catch (_) {}
    } else {
      doc.strokeColor(mediumGray).lineWidth(0.5).moveTo(50, signatureTop + 40).lineTo(180, signatureTop + 40).stroke();
    }

    doc.fontSize(10).fillColor(dark).text('Tariq Khalil', 50, signatureTop + 60);
    doc.fontSize(9).fillColor(mediumGray).text('(Noor Tutoring Representative)', 50, doc.y + 2);

    const footerTop = signatureTop + 90;
    doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(50, footerTop).lineTo(545, footerTop).stroke();
    doc.fontSize(9).fillColor(mediumGray)
      .text(`Prepared by ${representative}`, 50, footerTop + 10)
      .text(`Generated by ${invoice.createdBy}`, 50, doc.y + 4)
      .text(`Generated on ${formatLongDate(invoiceDate)}`, 50, doc.y + 4);

    doc.end();
  });
}

module.exports = { buildInvoicePdf };
