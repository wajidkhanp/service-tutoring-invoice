# Plan: Daily Progress Tracker + Report Card Integration + Progress Graphs

**Created:** 2026-05-05  
**Status:** Planned — not yet started

---

## Overview

Extend the app so teachers log student progress each day (New Lesson memorized, Sabqi recitation, Manzil recitation). That data auto-populates the monthly report card at month end, and a graphs page shows month-on-month memorization progress per student.

```
Daily Class Log (attendance + progress per day)
        ↓  aggregates at month end
Report Card (pre-filled fields, teacher reviews/adjusts)
        ↓  stored per student
Student Progress Graph (month-on-month visualization)
```

---

## UX Flow — What the Teacher Does Each Day

The existing Attendance page becomes the **Daily Class Log**:

1. Open **Attendance** → select today's date
2. Mark each student P / A / T (same as now)
3. For each **present** student, tap **"Log Progress"** → slide-up panel with 3 sections:

**New Lesson:**
- Surah dropdown (1–114 with Arabic + English name)
- From Ayah → To Ayah (number inputs)
- Lines count (auto-calculated or manual override)

**Sabqi:**
- Single toggle: Did student recite Sabqi today? **Yes / No**

**Manzil:**
- Did student recite Manzil today? **Yes / No**
- If Yes → Juzz dropdown (1–30) + Surah dropdown (filtered to that juzz)

Save closes the panel. Teacher moves to next student.

---

## Data Structure

### New file: `backend/src/data/daily_progress.json`

```json
{
  "2026-05-05": {
    "student-uuid-1": {
      "newLesson": {
        "surahNumber": 67,
        "surahName": "Al-Mulk",
        "fromAyah": 1,
        "toAyah": 10,
        "lines": 8
      },
      "sabqi": true,
      "manzil": {
        "recited": true,
        "juzzNumber": 29,
        "surahNumber": 67,
        "surahName": "Al-Mulk"
      }
    }
  }
}
```

### Static Quran reference: `frontend/src/data/quranData.js`

- 114 surahs: number, Arabic name, English name, juzz number(s)
- 30 juzz with their surahs listed
- Baked into frontend bundle — no API call needed

---

## Report Card Auto-Population

When a report card is opened/generated for Month X, the backend aggregates
`daily_progress.json` for that month and pre-fills:

| Report Card Field          | Computed From                                  |
|----------------------------|------------------------------------------------|
| New Lesson → Lines Completed | Sum of all daily `newLesson.lines`            |
| New Lesson → Surahs covered  | Unique surahs logged that month               |
| New Lesson → Days Without Lesson | Present days with no `newLesson` entry   |
| Sabqi → Recited Days         | Count of days where `sabqi: true`             |
| Sabqi → Not Recited Days     | Present days where `sabqi: false`             |
| Manzil → Week 1/2/3/4        | Juzz recited, grouped by calendar week        |

Teacher sees pre-filled fields, can adjust, adds ratings/notes, saves.
Pre-filled values are never silently overwritten — they show a "from logs" indicator.

---

## Progress Graph

**Route:** `/students/:id/progress` (tab on student page or standalone)

**Library:** Recharts (React-native, ~50KB gzip)

**Charts:**
- Bar chart: Lines memorized per month (last 6–12 months)
- Progress bar: Total Juzz / Surahs memorized out of 30 / 114
- Sabqi consistency: % of days recited per month (line chart)

---

## Files to Build / Edit

| File | Action | Purpose |
|------|--------|---------|
| `frontend/src/data/quranData.js` | **New** | Static Quran reference (surahs, juzz) |
| `backend/src/data/daily_progress.json` | **New** | Empty `{}` default storage |
| `backend/src/services/dailyProgressService.js` | **New** | Get/set daily progress; aggregate by month |
| `backend/src/routes/dailyProgress.js` | **New** | REST endpoints for daily progress |
| `backend/src/services/storageService.js` | Edit | Add `daily_progress.json` to DEFAULTS |
| `backend/src/routes/reportCards.js` | Edit | Call aggregator to pre-fill on create/fetch |
| `backend/src/index.js` | Edit | Mount daily progress router |
| `frontend/src/pages/Attendance.jsx` | Edit | Add "Log Progress" button per student row |
| `frontend/src/components/ProgressLogPanel.jsx` | **New** | Slide-up panel (New Lesson / Sabqi / Manzil) |
| `frontend/src/pages/StudentProgress.jsx` | **New** | Graphs page per student |
| `frontend/src/services/api.js` | Edit | Add 3–4 new API calls |
| `frontend/src/App.jsx` | Edit | Add `/students/:id/progress` route |

**New npm dependency:** `recharts`

---

## Backend API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/daily-progress?date=&studentId=` | Fetch one student's progress for a date |
| `POST` | `/api/daily-progress` | Save progress for a student on a date |
| `GET` | `/api/daily-progress/month?year=&month=&studentId=` | Aggregate month data (for report card + graphs) |

All routes: `requireAuth` middleware.

---

## Implementation Order

1. `quranData.js` — static reference data (surahs + juzz)
2. Backend: `storageService` → `dailyProgressService` → routes → `index.js`
3. Report card aggregation in `reportCards.js`
4. Frontend: `ProgressLogPanel` component
5. Frontend: Hook panel into `Attendance.jsx` ("Log Progress" button)
6. Frontend: Report card pre-fill indicator
7. Frontend: `StudentProgress.jsx` graphs page + route
8. Add `recharts` to `package.json`

**Estimated effort:** ~2 days of focused development

---

## Design Principles

- Mobile-first: the progress panel is a bottom sheet on mobile, side panel on desktop
- Teacher enters data fast: defaults, smart dropdowns (filter by juzz), one-tap Sabqi toggle
- Nothing is auto-saved silently — every save requires a deliberate tap
- Report card fields show a small "auto-filled" chip so teacher knows the source
