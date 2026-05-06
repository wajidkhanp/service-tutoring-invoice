import { useState, useEffect } from 'react';
import { SURAHS, JUZZ_LIST, getSurah, getSurahsForJuzz, surahLabel, surahShortLabel } from '../data/quranData';
import { BookOpen, RotateCcw, Book } from 'lucide-react';

const DOW = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${DOW[date.getDay()]}, ${MON[m - 1]} ${d}, ${y}`;
}

export default function ProgressLogPanel({ student, dateStr, initialProgress, onSave, onClose }) {
  // New Lesson
  const [nlSurah, setNlSurah]       = useState('');
  const [nlFrom,  setNlFrom]        = useState('');
  const [nlTo,    setNlTo]          = useState('');
  const [nlLines, setNlLines]       = useState('');

  // Sabqi
  const [sabqi, setSabqi] = useState(null); // true | false | null

  // Manzil
  const [manzilRecited, setManzilRecited] = useState(null); // true | false | null
  const [manzilJuzz,    setManzilJuzz]    = useState('');
  const [manzilSurah,   setManzilSurah]   = useState('');

  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  // Seed from existing data when panel opens
  useEffect(() => {
    const p = initialProgress || {};
    setNlSurah(p.newLesson?.surahNumber ? String(p.newLesson.surahNumber) : '');
    setNlFrom(p.newLesson?.fromAyah    ? String(p.newLesson.fromAyah)    : '');
    setNlTo(p.newLesson?.toAyah        ? String(p.newLesson.toAyah)      : '');
    setNlLines(p.newLesson?.lines      ? String(p.newLesson.lines)       : '');
    setSabqi(p.sabqi !== undefined ? p.sabqi : null);
    setManzilRecited(p.manzil?.recited !== undefined ? p.manzil.recited : null);
    setManzilJuzz(p.manzil?.juzzNumber  ? String(p.manzil.juzzNumber)  : '');
    setManzilSurah(p.manzil?.surahNumber ? String(p.manzil.surahNumber) : '');
  }, [initialProgress]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const data = {};

      if (nlSurah) {
        const s = getSurah(Number(nlSurah));
        data.newLesson = {
          surahNumber: Number(nlSurah),
          surahName:   s?.name || '',
          fromAyah:    nlFrom  ? Number(nlFrom)  : null,
          toAyah:      nlTo    ? Number(nlTo)    : null,
          lines:       nlLines ? Number(nlLines) : 0,
        };
      } else {
        data.newLesson = null;
      }

      data.sabqi = sabqi;

      if (manzilRecited !== null) {
        data.manzil = {
          recited:     manzilRecited,
          juzzNumber:  manzilRecited && manzilJuzz  ? Number(manzilJuzz)  : null,
          surahNumber: manzilRecited && manzilSurah ? Number(manzilSurah) : null,
          surahName:   manzilRecited && manzilSurah ? (getSurah(Number(manzilSurah))?.name || null) : null,
        };
      } else {
        data.manzil = null;
      }

      await onSave(data);
      onClose();
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const manzilSurahOptions = manzilJuzz ? getSurahsForJuzz(Number(manzilJuzz)) : [];

  return (
    <div className="prog-backdrop" onClick={onClose}>
      <div className="prog-panel" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="prog-header">
          <div>
            <div className="prog-header-name">{student.name}</div>
            <div className="prog-header-date">{formatDate(dateStr)}</div>
          </div>
          <button className="prog-close" onClick={onClose} type="button">×</button>
        </div>

        <div className="prog-body">
          {error && <div className="alert alert-error" style={{ marginBottom: '0.75rem' }}>{error}</div>}

          {/* ── NEW LESSON ─────────────────────────────── */}
          <div className="prog-section">
            <div className="prog-section-title"><BookOpen size={14}/>New Lesson</div>
            <div className="prog-section-desc">Which Surah did the student memorise today?</div>

            <div className="prog-field">
              <label>Surah</label>
              <select value={nlSurah} onChange={(e) => { setNlSurah(e.target.value); setNlFrom(''); setNlTo(''); setNlLines(''); }}>
                <option value="">— No new lesson today —</option>
                {SURAHS.map((s) => (
                  <option key={s.number} value={s.number}>{surahLabel(s)}</option>
                ))}
              </select>
            </div>

            {nlSurah && (
              <div className="prog-field-row">
                <div className="prog-field">
                  <label>From Ayah</label>
                  <input type="number" min="1" placeholder="1" value={nlFrom} onChange={(e) => setNlFrom(e.target.value)} />
                </div>
                <div className="prog-field">
                  <label>To Ayah</label>
                  <input type="number" min="1" placeholder={getSurah(Number(nlSurah))?.ayahs || ''} value={nlTo} onChange={(e) => setNlTo(e.target.value)} />
                </div>
                <div className="prog-field">
                  <label>Lines</label>
                  <input type="number" min="0" placeholder="0" value={nlLines} onChange={(e) => setNlLines(e.target.value)} />
                </div>
              </div>
            )}
          </div>

          {/* ── SABQI ──────────────────────────────────── */}
          <div className="prog-section">
            <div className="prog-section-title"><RotateCcw size={14}/>Sabqi</div>
            <div className="prog-section-desc">Did the student recite their recent memorisation today?</div>
            <div className="prog-yn-row">
              <button
                type="button"
                className={`prog-yn-btn prog-yn-yes${sabqi === true ? ' prog-yn-active' : ''}`}
                onClick={() => setSabqi(sabqi === true ? null : true)}
              >
                Yes
              </button>
              <button
                type="button"
                className={`prog-yn-btn prog-yn-no${sabqi === false ? ' prog-yn-active' : ''}`}
                onClick={() => setSabqi(sabqi === false ? null : false)}
              >
                No
              </button>
            </div>
          </div>

          {/* ── MANZIL ─────────────────────────────────── */}
          <div className="prog-section">
            <div className="prog-section-title"><Book size={14}/>Manzil</div>
            <div className="prog-section-desc">Did the student recite a previously memorised Juzz today?</div>
            <div className="prog-yn-row">
              <button
                type="button"
                className={`prog-yn-btn prog-yn-yes${manzilRecited === true ? ' prog-yn-active' : ''}`}
                onClick={() => setManzilRecited(manzilRecited === true ? null : true)}
              >
                Yes
              </button>
              <button
                type="button"
                className={`prog-yn-btn prog-yn-no${manzilRecited === false ? ' prog-yn-active' : ''}`}
                onClick={() => setManzilRecited(manzilRecited === false ? null : false)}
              >
                No
              </button>
            </div>

            {manzilRecited === true && (
              <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <div className="prog-field">
                  <label>Juzz</label>
                  <select value={manzilJuzz} onChange={(e) => { setManzilJuzz(e.target.value); setManzilSurah(''); }}>
                    <option value="">— Select Juzz —</option>
                    {JUZZ_LIST.map((j) => <option key={j} value={j}>Juzz {j}</option>)}
                  </select>
                </div>
                {manzilJuzz && (
                  <div className="prog-field">
                    <label>Surah <span style={{ fontWeight: 400, color: 'var(--gray-500)' }}>(optional)</span></label>
                    <select value={manzilSurah} onChange={(e) => setManzilSurah(e.target.value)}>
                      <option value="">— Full Juzz —</option>
                      {manzilSurahOptions.map((s) => (
                        <option key={s.number} value={s.number}>{surahShortLabel(s)}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="prog-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Progress'}
          </button>
        </div>
      </div>
    </div>
  );
}
