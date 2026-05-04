const PDFDocument = require('pdfkit');

const ACCENT = '#0d9488';
const DARK = '#111827';
const MED = '#4b5563';
const LIGHT = '#f8fafc';
const BORDER = '#e5e7eb';
const WHITE = '#ffffff';

const CATS = [
  { key: 'newLesson', label: 'New Lesson' },
  { key: 'sabqi', label: 'Sabqi (Recent Review)' },
  { key: 'manzil', label: 'Manzil (Long-term Review)' },
  { key: 'akhlaq', label: 'Akhlaq (Character & Behavior)' },
  { key: 'fluency', label: 'Fluency / Nazra (Recitation)' },
];
const RATINGS = ['Excellent', 'Good', 'Needs Improvement'];

function bar(doc, label, y, CW, M) {
  doc.rect(M, y, CW, 22).fill(ACCENT);
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(WHITE).text(label, M + 10, y + 7);
  return y + 22;
}

function hline(doc, y, CW, M, color = BORDER) {
  doc.moveTo(M, y).lineTo(M + CW, y).strokeColor(color).lineWidth(0.5).stroke();
}

function buildReportCardPdf(reportCard, config) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const M = 50;
    const CW = 495;
    const att = reportCard.attendance || {};
    const totalDays = att.totalDays || 0;
    const present = att.present || 0;
    const absent = att.absent || 0;
    const tardy = att.tardy || 0;
    const rate = totalDays > 0 ? ((present / totalDays) * 100).toFixed(1) + '%' : 'N/A';

    // ── HEADER ──────────────────────────────────────────────────
    doc.rect(0, 0, 595, 80).fill(ACCENT);

    doc.font('Helvetica-Bold').fontSize(16).fillColor(WHITE).text('Monthly Report Card', M, 16);
    doc.font('Helvetica').fontSize(8).fillColor('#ccfbf1')
      .text(config.organizationName || 'Al Noor Hifz Academy', M, 40)
      .text(config.address || '', M, 51)
      .text([config.phone, config.orgEmail].filter(Boolean).join('  ·  '), M, 62);

    doc.font('Helvetica-Bold').fontSize(10).fillColor(WHITE)
      .text(config.organizationName || 'Al Noor Hifz Academy', M, 22, { width: CW, align: 'right' });
    doc.font('Helvetica').fontSize(7.5).fillColor('#ccfbf1')
      .text(`EIN: ${config.ein || ''}`, M, 36, { width: CW, align: 'right' });

    // ── STUDENT INFO ─────────────────────────────────────────────
    const INFO_TOP = 94;
    const INFO_H = 66;
    doc.rect(M, INFO_TOP, CW, INFO_H).fillAndStroke(LIGHT, BORDER);

    const C1 = M + 12;
    const C2 = M + CW / 2 + 12;

    doc.font('Helvetica').fontSize(7.5).fillColor(MED)
      .text('STUDENT NAME', C1, INFO_TOP + 8)
      .text('MONTH & YEAR', C2, INFO_TOP + 8);
    doc.font('Helvetica-Bold').fontSize(11).fillColor(DARK)
      .text(reportCard.studentName || '—', C1, INFO_TOP + 20)
      .text(`${reportCard.month} ${reportCard.year}`, C2, INFO_TOP + 20);
    doc.font('Helvetica').fontSize(7.5).fillColor(MED)
      .text('TEACHER', C1, INFO_TOP + 40)
      .text('CLASS LEVEL', C2, INFO_TOP + 40);
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(DARK)
      .text(reportCard.teacherName || '—', C1, INFO_TOP + 52)
      .text(reportCard.classLevel || '—', C2, INFO_TOP + 52);

    // ── ATTENDANCE ───────────────────────────────────────────────
    let y = INFO_TOP + INFO_H + 16;
    y = bar(doc, 'ATTENDANCE SUMMARY', y, CW, M);

    const ATT_H = 44;
    doc.rect(M, y, CW, ATT_H).fillAndStroke(WHITE, BORDER);

    const attItems = [
      { label: 'Total Days', value: String(totalDays) },
      { label: 'Present', value: String(present) },
      { label: 'Absent', value: String(absent) },
      { label: 'Tardy', value: String(tardy) },
      { label: 'Attendance Rate', value: rate },
    ];

    const colW = CW / attItems.length;
    attItems.forEach((item, i) => {
      const cx = M + i * colW;
      if (i > 0) {
        doc.moveTo(cx, y).lineTo(cx, y + ATT_H).strokeColor(BORDER).lineWidth(0.5).stroke();
      }
      doc.font('Helvetica').fontSize(7.5).fillColor(MED)
        .text(item.label, cx + 2, y + 7, { width: colW - 4, align: 'center' });
      const isLow = i === 4 && totalDays > 0 && present / totalDays < 0.9;
      doc.font('Helvetica-Bold').fontSize(14).fillColor(isLow ? '#dc2626' : DARK)
        .text(item.value, cx + 2, y + 20, { width: colW - 4, align: 'center' });
    });
    y += ATT_H + 16;

    // ── PROGRESS SUMMARY ─────────────────────────────────────────
    y = bar(doc, 'PROGRESS SUMMARY', y, CW, M);

    const CAT_W = 142; const EXC_W = 72; const GOOD_W = 66; const NI_W = 88;
    const NOTES_W = CW - CAT_W - EXC_W - GOOD_W - NI_W;
    const COL_X = [M, M + CAT_W, M + CAT_W + EXC_W, M + CAT_W + EXC_W + GOOD_W, M + CAT_W + EXC_W + GOOD_W + NI_W];
    const COL_W = [CAT_W, EXC_W, GOOD_W, NI_W, NOTES_W];

    // Header row
    const TH_H = 20;
    doc.rect(M, y, CW, TH_H).fillAndStroke('#f0fdfa', BORDER);
    ['Category', 'Excellent', 'Good', 'Needs Impr.', 'Teacher Notes'].forEach((h, i) => {
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(ACCENT)
        .text(h, COL_X[i] + 4, y + 6, { width: COL_W[i] - 8, align: i === 0 ? 'left' : 'center' });
    });
    y += TH_H;

    // Data rows
    const ROW_H = 26;
    CATS.forEach((cat, ri) => {
      const ry = y + ri * ROW_H;
      doc.rect(M, ry, CW, ROW_H).fillAndStroke(ri % 2 === 0 ? WHITE : '#f9fafb', BORDER);
      COL_X.slice(1).forEach((cx) => {
        doc.moveTo(cx, ry).lineTo(cx, ry + ROW_H).strokeColor(BORDER).lineWidth(0.5).stroke();
      });
      doc.font('Helvetica').fontSize(8.5).fillColor(DARK)
        .text(cat.label, COL_X[0] + 6, ry + 9, { width: CAT_W - 10 });

      const catData = (reportCard.progress || {})[cat.key] || {};
      const sel = catData.rating || '';
      RATINGS.forEach((r, ci) => {
        const rx = COL_X[ci + 1];
        const rw = COL_W[ci + 1];
        if (sel === r) {
          doc.rect(rx + 5, ry + 4, rw - 10, ROW_H - 8).fillAndStroke(ACCENT, ACCENT);
          const lbl = r === 'Needs Improvement' ? 'N.I.' : r === 'Excellent' ? 'E' : 'G';
          doc.font('Helvetica-Bold').fontSize(8).fillColor(WHITE)
            .text(lbl, rx + 5, ry + 10, { width: rw - 10, align: 'center' });
        }
      });
      doc.font('Helvetica').fontSize(7.5).fillColor(MED)
        .text(catData.notes || '', COL_X[4] + 4, ry + 7, { width: NOTES_W - 8, height: ROW_H - 10 });
    });
    y += CATS.length * ROW_H + 16;

    // ── STARS & ACHIEVEMENTS ─────────────────────────────────────
    y = bar(doc, 'STARS & ACHIEVEMENTS', y, CW, M);
    const STAR_H = 44;
    doc.rect(M, y, CW, STAR_H).fillAndStroke(WHITE, BORDER);

    const stars = Math.max(0, Math.min(reportCard.stars || 0, 20));
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(MED).text('Stars Earned:', M + 12, y + 9);
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#f59e0b').text(String(stars), M + 95, y + 7);
    doc.font('Helvetica').fontSize(8).fillColor(MED).text('/ 10', M + 108, y + 11);

    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(MED).text('Special Achievements:', M + 12, y + 27);
    doc.font('Helvetica').fontSize(8.5).fillColor(DARK)
      .text(reportCard.achievements || '—', M + 155, y + 27, { width: CW - 165 });
    y += STAR_H + 16;

    // ── TEACHER REMARKS ──────────────────────────────────────────
    y = bar(doc, 'TEACHER REMARKS', y, CW, M);
    const REM_H = 64;
    doc.rect(M, y, CW, REM_H).fillAndStroke(WHITE, BORDER);
    doc.font('Helvetica').fontSize(9).fillColor(DARK)
      .text(reportCard.remarks || '', M + 10, y + 10, { width: CW - 20, height: REM_H - 18, lineGap: 3 });
    y += REM_H + 16;

    // ── PARENT ACKNOWLEDGEMENT ───────────────────────────────────
    y = bar(doc, 'PARENT ACKNOWLEDGEMENT', y, CW, M);
    const ACK_H = 46;
    doc.rect(M, y, CW, ACK_H).fillAndStroke(WHITE, BORDER);

    const sigY = y + 30;
    doc.moveTo(M + 20, sigY).lineTo(M + 210, sigY).strokeColor(MED).lineWidth(0.5).stroke();
    doc.font('Helvetica').fontSize(7.5).fillColor(MED).text('Parent Signature', M + 20, sigY + 4);
    doc.moveTo(M + 290, sigY).lineTo(M + 440, sigY).stroke();
    doc.font('Helvetica').fontSize(7.5).fillColor(MED).text('Date', M + 290, sigY + 4);
    y += ACK_H + 10;

    // ── FOOTER ───────────────────────────────────────────────────
    hline(doc, y, CW, M);
    const now = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    doc.font('Helvetica').fontSize(7.5).fillColor(MED)
      .text(`${config.organizationName || 'Al Noor Hifz Academy'} · ${reportCard.month} ${reportCard.year} Report Card`, M, y + 8)
      .text(`Generated on ${now}`, M, y + 8, { width: CW, align: 'right' });

    doc.end();
  });
}

module.exports = { buildReportCardPdf };
