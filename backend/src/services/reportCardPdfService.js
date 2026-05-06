const PDFDocument = require('pdfkit');

const ACCENT = '#0d9488';
const DARK   = '#111827';
const MED    = '#4b5563';
const LIGHT  = '#f8fafc';
const BORDER = '#e5e7eb';
const WHITE  = '#ffffff';

const M  = 32;
const CW = 531; // 595 - 2*32

// ── Helpers ──────────────────────────────────────────────────

function hline(doc, y) {
  doc.moveTo(M, y).lineTo(M + CW, y).strokeColor(BORDER).lineWidth(0.5).stroke();
}

function sectionBar(doc, label, y) {
  doc.rect(M, y, CW, 20).fill(ACCENT);
  doc.font('Helvetica-Bold').fontSize(8).fillColor(WHITE).text(label, M + 8, y + 6);
  return y + 20;
}

function ratingBadge(doc, rating, x, y, availW) {
  if (!rating) {
    doc.font('Helvetica').fontSize(8).fillColor(MED).text('—', x, y + 2, { width: availW });
    return;
  }
  const colors = { 'Excellent': '#15803d', 'Good': ACCENT, 'Needs Improvement': '#d97706' };
  const labels = { 'Excellent': 'Excellent', 'Good': 'Good', 'Needs Improvement': 'Needs Impr.' };
  const bg  = colors[rating] || MED;
  const lbl = labels[rating] || rating;
  const bw  = Math.min(availW - 4, 78);
  doc.rect(x, y, bw, 14).fill(bg);
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(WHITE).text(lbl, x, y + 3, { width: bw, align: 'center' });
}

function targetMetBadge(doc, val, x, y) {
  if (val === null || val === undefined) {
    doc.font('Helvetica').fontSize(8).fillColor(MED).text('—', x, y + 2, { width: 40 });
    return;
  }
  const bg  = val ? '#15803d' : '#dc2626';
  const lbl = val ? 'Yes' : 'No';
  doc.rect(x, y, 36, 14).fill(bg);
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(WHITE).text(lbl, x, y + 3, { width: 36, align: 'center' });
}

// Two-line labeled field (label on top, bold value below)
function labelVal(doc, label, value, x, y, w) {
  doc.font('Helvetica').fontSize(7).fillColor(MED).text(label, x, y, { width: w });
  doc.font('Helvetica-Bold').fontSize(9.5).fillColor(DARK).text(value || '—', x, y + 9, { width: w });
}

// Inline row: [label (7pt)] then [badge/value] at (labelX, badgeX, rowY)
// Used for the "Target Met | Rating | Notes" compact row
function inlineRow(doc, items, y) {
  // items = [{ label, type, value, x, w }]
  // type: 'targetmet' | 'rating' | 'text'
  items.forEach(({ label, type, value, x, w }) => {
    doc.font('Helvetica').fontSize(7).fillColor(MED).text(label + ':', x, y, { width: w });
    const vy = y + 10;
    if (type === 'targetmet') targetMetBadge(doc, value ?? null, x, vy);
    else if (type === 'rating') ratingBadge(doc, value || '', x, vy, w);
    else {
      doc.font('Helvetica').fontSize(8).fillColor(DARK).text(value || '—', x, vy + 1, { width: w });
    }
  });
}

// ── Main builder ─────────────────────────────────────────────

function buildReportCardPdf(reportCard, config) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({ size: 'A4', margin: M });
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const att       = reportCard.attendance || {};
    const totalDays = att.totalDays || 0;
    const present   = att.present   || 0;
    const absent    = att.absent    || 0;
    const tardy     = att.tardy     || 0;
    const rate      = totalDays > 0 ? ((present / totalDays) * 100).toFixed(1) + '%' : 'N/A';

    const progress = reportCard.progress || {};
    const nlData   = progress.newLesson || {};
    const sbData   = progress.sabqi     || {};
    const mzData   = progress.manzil    || {};
    const akData   = progress.akhlaq    || {};

    // ── HEADER ────────────────────────────────────────────────
    doc.rect(0, 0, 595, 76).fill(ACCENT);
    doc.font('Helvetica-Bold').fontSize(16).fillColor(WHITE).text('Monthly Report Card', M, 16);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(WHITE)
      .text(config.organizationName || 'Al Noor Hifz Academy', M, 22, { width: CW, align: 'right' });
    doc.font('Helvetica').fontSize(7).fillColor('#ccfbf1')
      .text(config.address || '', M, 36, { width: CW, align: 'right' })
      .text([config.phone, config.orgEmail].filter(Boolean).join('  ·  '), M, 46, { width: CW, align: 'right' });

    // ── STUDENT INFO ──────────────────────────────────────────
    let y = 86;
    const INFO_H = 62;
    doc.rect(M, y, CW, INFO_H).fillAndStroke(LIGHT, BORDER);

    const C1 = M + 14;
    const C2 = M + CW / 2 + 14;
    doc.font('Helvetica').fontSize(7.5).fillColor(MED)
      .text('STUDENT NAME', C1, y + 8)
      .text('MONTH & YEAR', C2, y + 8);
    doc.font('Helvetica-Bold').fontSize(11).fillColor(DARK)
      .text(reportCard.studentName || '—', C1, y + 20)
      .text(`${reportCard.month} ${reportCard.year}`, C2, y + 20);
    doc.font('Helvetica').fontSize(7.5).fillColor(MED)
      .text('TEACHER',     C1, y + 42)
      .text('CLASS LEVEL', C2, y + 42);
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(DARK)
      .text(reportCard.teacherName || '—', C1, y + 53)
      .text(reportCard.classLevel  || '—', C2, y + 53);
    y += INFO_H + 10;

    // ── ATTENDANCE ────────────────────────────────────────────
    y = sectionBar(doc, 'ATTENDANCE', y);
    const ATT_H = 38;
    doc.rect(M, y, CW, ATT_H).fillAndStroke(WHITE, BORDER);

    const attItems = [
      { label: 'Class Days', value: String(totalDays) },
      { label: 'Present',    value: String(present)   },
      { label: 'Absent',     value: String(absent)    },
      { label: 'Tardy',      value: String(tardy)     },
      { label: 'Att. Rate',  value: rate              },
    ];
    const attColW = CW / attItems.length;
    attItems.forEach((item, i) => {
      const cx = M + i * attColW;
      if (i > 0) doc.moveTo(cx, y).lineTo(cx, y + ATT_H).strokeColor(BORDER).lineWidth(0.5).stroke();
      doc.font('Helvetica').fontSize(7).fillColor(MED)
        .text(item.label, cx + 2, y + 6, { width: attColW - 4, align: 'center' });
      const isLow = i === 4 && totalDays > 0 && present / totalDays < 0.9;
      doc.font('Helvetica-Bold').fontSize(14).fillColor(isLow ? '#dc2626' : DARK)
        .text(item.value, cx + 2, y + 18, { width: attColW - 4, align: 'center' });
    });
    y += ATT_H + 10;

    // ── NEW LESSON ────────────────────────────────────────────
    y = sectionBar(doc, 'NEW LESSON', y);
    const NL_H = 62;
    doc.rect(M, y, CW, NL_H).fillAndStroke(WHITE, BORDER);

    // Row 1: 3 numeric fields
    const nlColW = CW / 3;
    labelVal(doc, 'Target Lines',        nlData.targetLines        || '', M + 8,              y + 6, nlColW - 16);
    labelVal(doc, 'Lines Completed',     nlData.linesCompleted     || '', M + nlColW + 8,      y + 6, nlColW - 16);
    labelVal(doc, 'Days Without Lesson', nlData.daysWithoutLesson  || '', M + nlColW * 2 + 8, y + 6, nlColW - 16);

    // Row 2: Target Met | Rating | Notes  (all inline)
    inlineRow(doc, [
      { label: 'Target Met', type: 'targetmet', value: nlData.targetMet ?? null, x: M + 8,   w: 42  },
      { label: 'Rating',     type: 'rating',    value: nlData.rating   || '',    x: M + 58,  w: 90  },
      { label: 'Notes',      type: 'text',      value: nlData.notes    || '',    x: M + 158, w: CW - 170 },
    ], y + 36);
    y += NL_H + 10;

    // ── SABQI ─────────────────────────────────────────────────
    y = sectionBar(doc, 'SABQI', y);
    const SB_H = 58;
    doc.rect(M, y, CW, SB_H).fillAndStroke(WHITE, BORDER);

    // Row 1: 2 fields
    const sbColW = CW / 2;
    labelVal(doc, 'Recited Days',     sbData.recitedDays    || '', M + 8,          y + 6, sbColW - 16);
    labelVal(doc, 'Not Recited Days', sbData.notRecitedDays || '', M + sbColW + 8, y + 6, sbColW - 16);

    // Row 2: Target Met | Rating | Notes
    inlineRow(doc, [
      { label: 'Target Met', type: 'targetmet', value: sbData.targetMet ?? null, x: M + 8,   w: 42  },
      { label: 'Rating',     type: 'rating',    value: sbData.rating   || '',    x: M + 58,  w: 90  },
      { label: 'Notes',      type: 'text',      value: sbData.notes    || '',    x: M + 158, w: CW - 170 },
    ], y + 32);
    y += SB_H + 10;

    // ── MANZIL ────────────────────────────────────────────────
    y = sectionBar(doc, 'MANZIL', y);
    const MZ_H = 88;
    doc.rect(M, y, CW, MZ_H).fillAndStroke(WHITE, BORDER);

    // Row 1: Target Ajza + Target Met
    labelVal(doc, 'Target Ajza / Week', mzData.targetAjza || '', M + 8, y + 6, 140);
    doc.font('Helvetica').fontSize(7).fillColor(MED).text('Target Met:', M + 160, y + 6, { width: 80 });
    targetMetBadge(doc, mzData.targetMet ?? null, M + 160, y + 16);

    // Row 2: 4-column week grid
    const wkY = y + 34;
    const wkColW = CW / 4;
    hline(doc, wkY - 2);
    [
      { label: 'Week 1', val: mzData.week1 },
      { label: 'Week 2', val: mzData.week2 },
      { label: 'Week 3', val: mzData.week3 },
      { label: 'Week 4', val: mzData.week4 },
    ].forEach((wk, i) => {
      const wx = M + i * wkColW;
      if (i > 0) doc.moveTo(wx, wkY - 2).lineTo(wx, wkY + 26).strokeColor(BORDER).lineWidth(0.5).stroke();
      doc.font('Helvetica').fontSize(7).fillColor(MED).text(wk.label, wx + 6, wkY + 2, { width: wkColW - 12 });
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(DARK).text(wk.val || '—', wx + 6, wkY + 12, { width: wkColW - 12 });
    });
    hline(doc, wkY + 28);

    // Row 3: Rating | Notes
    inlineRow(doc, [
      { label: 'Rating', type: 'rating', value: mzData.rating || '', x: M + 8,   w: 90  },
      { label: 'Notes',  type: 'text',   value: mzData.notes  || '', x: M + 108, w: CW - 120 },
    ], y + 64);
    y += MZ_H + 10;

    // ── AKHLAQ ────────────────────────────────────────────────
    y = sectionBar(doc, 'AKHLAQ (CHARACTER & BEHAVIOR)', y);
    const AK_H = 38;
    doc.rect(M, y, CW, AK_H).fillAndStroke(WHITE, BORDER);

    inlineRow(doc, [
      { label: 'Rating', type: 'rating', value: akData.rating || '', x: M + 8,   w: 90  },
      { label: 'Notes',  type: 'text',   value: akData.notes  || '', x: M + 108, w: CW - 120 },
    ], y + 10);
    y += AK_H + 8;

    // ── STARS & ACHIEVEMENTS ──────────────────────────────────
    y = sectionBar(doc, 'STARS & ACHIEVEMENTS', y);
    const ST_H = 32;
    doc.rect(M, y, CW, ST_H).fillAndStroke(WHITE, BORDER);

    const stars = Math.max(0, Math.min(reportCard.stars || 0, 20));
    doc.font('Helvetica').fontSize(7.5).fillColor(MED).text('Stars Earned:', M + 10, y + 9);
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#f59e0b').text(String(stars), M + 88, y + 6);
    doc.font('Helvetica').fontSize(8).fillColor(MED).text('/ 20', M + 103, y + 10);
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(MED).text('Special Achievements:', M + 148, y + 9);
    doc.font('Helvetica').fontSize(8.5).fillColor(DARK)
      .text(reportCard.achievements || '—', M + 268, y + 9, { width: CW - 278 });
    y += ST_H + 8;

    // ── TEACHER REMARKS ───────────────────────────────────────
    y = sectionBar(doc, 'TEACHER REMARKS', y);
    const RM_H = 56;
    doc.rect(M, y, CW, RM_H).fillAndStroke(WHITE, BORDER);
    doc.font('Helvetica').fontSize(9).fillColor(DARK)
      .text(reportCard.remarks || '', M + 10, y + 10, { width: CW - 20, height: RM_H - 18, lineGap: 3 });
    y += RM_H + 8;

    // ── PARENT ACKNOWLEDGEMENT ────────────────────────────────
    y = sectionBar(doc, 'PARENT ACKNOWLEDGEMENT', y);
    const PA_H = 38;
    doc.rect(M, y, CW, PA_H).fillAndStroke(WHITE, BORDER);
    const sigY = y + 28;
    doc.moveTo(M + 16, sigY).lineTo(M + 200, sigY).strokeColor(MED).lineWidth(0.5).stroke();
    doc.font('Helvetica').fontSize(7).fillColor(MED).text('Parent Signature', M + 16, sigY + 3);
    doc.moveTo(M + 280, sigY).lineTo(M + 430, sigY).strokeColor(MED).lineWidth(0.5).stroke();
    doc.font('Helvetica').fontSize(7).fillColor(MED).text('Date', M + 280, sigY + 3);
    y += PA_H + 8;

    // ── FOOTER ────────────────────────────────────────────────
    hline(doc, y);
    const now = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    doc.font('Helvetica').fontSize(7.5).fillColor(MED)
      .text(`${config.organizationName || 'Al Noor Hifz Academy'} · ${reportCard.month} ${reportCard.year} Report Card`, M, y + 6)
      .text(`Generated on ${now}`, M, y + 6, { width: CW, align: 'right' });

    doc.end();
  });
}

module.exports = { buildReportCardPdf };
