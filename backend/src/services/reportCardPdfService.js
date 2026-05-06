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
}

function ratingBadge(doc, rating, x, y, availW) {
  if (!rating) {
    doc.font('Helvetica').fontSize(8).fillColor(MED).text('—', x, y, { width: availW });
    return;
  }
  const colors = { 'Excellent': '#15803d', 'Good': ACCENT, 'Needs Improvement': '#d97706' };
  const labels = { 'Excellent': 'Excellent', 'Good': 'Good', 'Needs Improvement': 'Needs Impr.' };
  const bg  = colors[rating] || MED;
  const lbl = labels[rating] || rating;
  const bw  = Math.min(availW - 4, 76);
  doc.rect(x, y - 1, bw, 13).fill(bg);
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(WHITE).text(lbl, x, y + 2, { width: bw, align: 'center' });
}

function targetMetBadge(doc, val, x, y) {
  if (val === null || val === undefined) {
    doc.font('Helvetica').fontSize(8).fillColor(MED).text('—', x, y, { width: 50 });
    return;
  }
  const bg  = val ? '#15803d' : '#dc2626';
  const lbl = val ? 'Yes' : 'No';
  doc.rect(x, y - 1, 36, 13).fill(bg);
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(WHITE).text(lbl, x, y + 2, { width: 36, align: 'center' });
}

function labelVal(doc, label, value, x, y, w) {
  doc.font('Helvetica').fontSize(7).fillColor(MED).text(label, x, y, { width: w });
  doc.font('Helvetica-Bold').fontSize(9).fillColor(DARK).text(value || '—', x, y + 9, { width: w });
}

function sectionRow(doc, label, value, x, y, labelW, valW) {
  doc.font('Helvetica').fontSize(7.5).fillColor(MED).text(label + ':', x, y, { width: labelW });
  doc.font('Helvetica').fontSize(8.5).fillColor(DARK).text(value || '—', x + labelW + 4, y, { width: valW });
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

    const progress  = reportCard.progress || {};
    const nlData    = progress.newLesson || {};
    const sbData    = progress.sabqi     || {};
    const mzData    = progress.manzil    || {};
    const akData    = progress.akhlaq    || {};

    // ── HEADER ────────────────────────────────────────────────
    doc.rect(0, 0, 595, 78).fill(ACCENT);

    doc.font('Helvetica-Bold').fontSize(16).fillColor(WHITE)
      .text('Monthly Report Card', M, 16);

    doc.font('Helvetica-Bold').fontSize(10).fillColor(WHITE)
      .text(config.organizationName || 'Al Noor Hifz Academy', M, 22, { width: CW, align: 'right' });
    doc.font('Helvetica').fontSize(7).fillColor('#ccfbf1')
      .text(config.address || '', M, 36, { width: CW, align: 'right' })
      .text([config.phone, config.orgEmail].filter(Boolean).join('  ·  '), M, 46, { width: CW, align: 'right' });

    // ── STUDENT INFO ──────────────────────────────────────────
    const INFO_Y = 88;
    doc.rect(M, INFO_Y, CW, 60).fillAndStroke(LIGHT, BORDER);

    const C1 = M + 12;
    const C2 = M + CW / 2 + 12;

    doc.font('Helvetica').fontSize(7.5).fillColor(MED)
      .text('STUDENT NAME', C1, INFO_Y + 8)
      .text('MONTH & YEAR',  C2, INFO_Y + 8);
    doc.font('Helvetica-Bold').fontSize(11).fillColor(DARK)
      .text(reportCard.studentName || '—', C1, INFO_Y + 20)
      .text(`${reportCard.month} ${reportCard.year}`, C2, INFO_Y + 20);
    doc.font('Helvetica').fontSize(7.5).fillColor(MED)
      .text('TEACHER',     C1, INFO_Y + 40)
      .text('CLASS LEVEL', C2, INFO_Y + 40);
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(DARK)
      .text(reportCard.teacherName || '—', C1, INFO_Y + 52)
      .text(reportCard.classLevel  || '—', C2, INFO_Y + 52);

    // ── ATTENDANCE ────────────────────────────────────────────
    const ATT_Y = 160;
    sectionBar(doc, 'ATTENDANCE', ATT_Y);

    const ATT_BOX_Y = ATT_Y + 20;
    doc.rect(M, ATT_BOX_Y, CW, 36).fillAndStroke(WHITE, BORDER);

    const attItems = [
      { label: 'Class Days', value: String(totalDays) },
      { label: 'Present',    value: String(present)   },
      { label: 'Absent',     value: String(absent)    },
      { label: 'Tardy',      value: String(tardy)     },
      { label: 'Att. Rate',  value: rate              },
    ];
    const colW = CW / attItems.length;
    attItems.forEach((item, i) => {
      const cx = M + i * colW;
      if (i > 0) {
        doc.moveTo(cx, ATT_BOX_Y).lineTo(cx, ATT_BOX_Y + 36).strokeColor(BORDER).lineWidth(0.5).stroke();
      }
      doc.font('Helvetica').fontSize(7).fillColor(MED)
        .text(item.label, cx + 2, ATT_BOX_Y + 5, { width: colW - 4, align: 'center' });
      const isLow = i === 4 && totalDays > 0 && present / totalDays < 0.9;
      doc.font('Helvetica-Bold').fontSize(14).fillColor(isLow ? '#dc2626' : DARK)
        .text(item.value, cx + 2, ATT_BOX_Y + 16, { width: colW - 4, align: 'center' });
    });

    // ── NEW LESSON ────────────────────────────────────────────
    const NL_Y = 228;
    sectionBar(doc, 'NEW LESSON', NL_Y);

    const NL_BOX_Y = NL_Y + 20;
    doc.rect(M, NL_BOX_Y, CW, 70).fillAndStroke(WHITE, BORDER);

    // Row 1: 3 numeric fields
    const nlColW = CW / 3;
    labelVal(doc, 'Target Lines',       nlData.targetLines       || '', M + 8,              NL_BOX_Y + 6, nlColW - 16);
    labelVal(doc, 'Lines Completed',    nlData.linesCompleted    || '', M + nlColW + 8,      NL_BOX_Y + 6, nlColW - 16);
    labelVal(doc, 'Days Without Lesson', nlData.daysWithoutLesson || '', M + nlColW * 2 + 8, NL_BOX_Y + 6, nlColW - 16);

    // Row 2: Target Met + Rating
    doc.font('Helvetica').fontSize(7).fillColor(MED).text('Target Met:', M + 8, NL_BOX_Y + 34);
    targetMetBadge(doc, nlData.targetMet ?? null, M + 8, NL_BOX_Y + 44);
    doc.font('Helvetica').fontSize(7).fillColor(MED).text('Rating:', M + 70, NL_BOX_Y + 34);
    ratingBadge(doc, nlData.rating || '', M + 70, NL_BOX_Y + 44, 100);

    // Row 3: Notes
    doc.font('Helvetica').fontSize(7).fillColor(MED).text('Notes:', M + 8, NL_BOX_Y + 58);
    doc.font('Helvetica').fontSize(8).fillColor(DARK).text(nlData.notes || '—', M + 40, NL_BOX_Y + 58, { width: CW - 50 });

    // ── SABQI ─────────────────────────────────────────────────
    const SB_Y = 330;
    sectionBar(doc, 'SABQI', SB_Y);

    const SB_BOX_Y = SB_Y + 20;
    doc.rect(M, SB_BOX_Y, CW, 58).fillAndStroke(WHITE, BORDER);

    // Row 1: 2 fields
    const sbColW = CW / 2;
    labelVal(doc, 'Recited Days',     sbData.recitedDays     || '', M + 8,           SB_BOX_Y + 6, sbColW - 16);
    labelVal(doc, 'Not Recited Days', sbData.notRecitedDays  || '', M + sbColW + 8,  SB_BOX_Y + 6, sbColW - 16);

    // Row 2: Target Met + Rating
    doc.font('Helvetica').fontSize(7).fillColor(MED).text('Target Met:', M + 8, SB_BOX_Y + 32);
    targetMetBadge(doc, sbData.targetMet ?? null, M + 8, SB_BOX_Y + 42);
    doc.font('Helvetica').fontSize(7).fillColor(MED).text('Rating:', M + 70, SB_BOX_Y + 32);
    ratingBadge(doc, sbData.rating || '', M + 70, SB_BOX_Y + 42, 100);

    // Row 3: Notes
    doc.font('Helvetica').fontSize(7).fillColor(MED).text('Notes:', M + 8, SB_BOX_Y + 47);
    doc.font('Helvetica').fontSize(8).fillColor(DARK).text(sbData.notes || '—', M + 40, SB_BOX_Y + 47, { width: CW - 50 });

    // ── MANZIL ────────────────────────────────────────────────
    const MZ_Y = 420;
    sectionBar(doc, 'MANZIL', MZ_Y);

    const MZ_BOX_Y = MZ_Y + 20;
    doc.rect(M, MZ_BOX_Y, CW, 78).fillAndStroke(WHITE, BORDER);

    // Row 1: Target Ajza + Target Met
    doc.font('Helvetica').fontSize(7).fillColor(MED).text('Target Ajza / Week:', M + 8, MZ_BOX_Y + 6);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(DARK).text(mzData.targetAjza || '—', M + 8, MZ_BOX_Y + 15, { width: 140 });
    doc.font('Helvetica').fontSize(7).fillColor(MED).text('Target Met:', M + 160, MZ_BOX_Y + 6);
    targetMetBadge(doc, mzData.targetMet ?? null, M + 160, MZ_BOX_Y + 15);

    // Row 2: Week grid
    const wkColW = CW / 4;
    [
      { label: 'Week 1', val: mzData.week1 },
      { label: 'Week 2', val: mzData.week2 },
      { label: 'Week 3', val: mzData.week3 },
      { label: 'Week 4', val: mzData.week4 },
    ].forEach((wk, i) => {
      const wx = M + i * wkColW;
      if (i > 0) {
        doc.moveTo(wx, MZ_BOX_Y + 30).lineTo(wx, MZ_BOX_Y + 55).strokeColor(BORDER).lineWidth(0.5).stroke();
      }
      doc.font('Helvetica').fontSize(7).fillColor(MED).text(wk.label, wx + 6, MZ_BOX_Y + 32, { width: wkColW - 12 });
      doc.font('Helvetica-Bold').fontSize(9).fillColor(DARK).text(wk.val || '—', wx + 6, MZ_BOX_Y + 42, { width: wkColW - 12 });
    });

    // Row 3: Rating + Notes
    doc.font('Helvetica').fontSize(7).fillColor(MED).text('Rating:', M + 8, MZ_BOX_Y + 60);
    ratingBadge(doc, mzData.rating || '', M + 8, MZ_BOX_Y + 68, 100);
    doc.font('Helvetica').fontSize(7).fillColor(MED).text('Notes:', M + 120, MZ_BOX_Y + 60);
    doc.font('Helvetica').fontSize(8).fillColor(DARK).text(mzData.notes || '—', M + 152, MZ_BOX_Y + 60, { width: CW - 162 });

    // ── AKHLAQ ────────────────────────────────────────────────
    const AK_Y = 510;
    sectionBar(doc, 'AKHLAQ (CHARACTER & BEHAVIOR)', AK_Y);

    const AK_BOX_Y = AK_Y + 20;
    doc.rect(M, AK_BOX_Y, CW, 36).fillAndStroke(WHITE, BORDER);

    doc.font('Helvetica').fontSize(7).fillColor(MED).text('Rating:', M + 8, AK_BOX_Y + 6);
    ratingBadge(doc, akData.rating || '', M + 8, AK_BOX_Y + 16, 100);
    doc.font('Helvetica').fontSize(7).fillColor(MED).text('Notes:', M + 120, AK_BOX_Y + 6);
    doc.font('Helvetica').fontSize(8).fillColor(DARK).text(akData.notes || '—', M + 152, AK_BOX_Y + 6, { width: CW - 162 });

    // ── STARS & ACHIEVEMENTS ──────────────────────────────────
    const ST_Y = 558;
    sectionBar(doc, 'STARS & ACHIEVEMENTS', ST_Y);

    const ST_BOX_Y = ST_Y + 20;
    doc.rect(M, ST_BOX_Y, CW, 30).fillAndStroke(WHITE, BORDER);

    const stars = Math.max(0, Math.min(reportCard.stars || 0, 20));
    doc.font('Helvetica').fontSize(7.5).fillColor(MED).text('Stars Earned:', M + 10, ST_BOX_Y + 10);
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#f59e0b').text(String(stars), M + 90, ST_BOX_Y + 7);
    doc.font('Helvetica').fontSize(8).fillColor(MED).text('/ 20', M + 104, ST_BOX_Y + 11);

    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(MED).text('Special Achievements:', M + 145, ST_BOX_Y + 10);
    doc.font('Helvetica').fontSize(8.5).fillColor(DARK)
      .text(reportCard.achievements || '—', M + 265, ST_BOX_Y + 10, { width: CW - 275 });

    // ── TEACHER REMARKS ───────────────────────────────────────
    const RM_Y = 620;
    sectionBar(doc, 'TEACHER REMARKS', RM_Y);

    const RM_BOX_Y = RM_Y + 20;
    doc.rect(M, RM_BOX_Y, CW, 55).fillAndStroke(WHITE, BORDER);
    doc.font('Helvetica').fontSize(9).fillColor(DARK)
      .text(reportCard.remarks || '', M + 10, RM_BOX_Y + 10, { width: CW - 20, height: 44, lineGap: 3 });

    // ── PARENT ACKNOWLEDGEMENT ────────────────────────────────
    const PA_Y = 707;
    sectionBar(doc, 'PARENT ACKNOWLEDGEMENT', PA_Y);

    const PA_BOX_Y = PA_Y + 20;
    doc.rect(M, PA_BOX_Y, CW, 36).fillAndStroke(WHITE, BORDER);

    const sigY = PA_BOX_Y + 26;
    doc.moveTo(M + 16, sigY).lineTo(M + 200, sigY).strokeColor(MED).lineWidth(0.5).stroke();
    doc.font('Helvetica').fontSize(7).fillColor(MED).text('Parent Signature', M + 16, sigY + 3);
    doc.moveTo(M + 270, sigY).lineTo(M + 420, sigY).strokeColor(MED).lineWidth(0.5).stroke();
    doc.font('Helvetica').fontSize(7).fillColor(MED).text('Date', M + 270, sigY + 3);

    // ── FOOTER ────────────────────────────────────────────────
    const FT_Y = 775;
    hline(doc, FT_Y);
    const now = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    doc.font('Helvetica').fontSize(7.5).fillColor(MED)
      .text(`${config.organizationName || 'Al Noor Hifz Academy'} · ${reportCard.month} ${reportCard.year} Report Card`, M, FT_Y + 6)
      .text(`Generated on ${now}`, M, FT_Y + 6, { width: CW, align: 'right' });

    doc.end();
  });
}

module.exports = { buildReportCardPdf };
