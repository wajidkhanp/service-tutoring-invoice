# Noor Tutoring Invoice Manager

A full-stack web application for managing daily attendance, generating monthly invoices, and emailing parents at Al Noor Hifz Academy (operated by Momin Services of Arizona).

---

## Features

- **Dashboard** — live student and invoice counts, recent activity feed, quick-action links
- **Attendance Tracker** — daily attendance grid (Mon–Fri, Week 1–5); present by default, only absences/tardies stored; gender-grouped view (Boys/Girls/All); future dates and pre-enrollment dates locked; mobile day-stack view; per-student year history with attendance rate %
- **Students** — add, edit, and remove students with gender, join date, grade, hourly rate, and parent contact info (name, phone, email)
- **Invoice Generation** — bulk generate all invoices in one click, or create individual ad hoc invoices; restricted to past and current months only
- **PDF Invoices** — professional PDFs generated on demand with org branding and optional signature; nothing stored on disk
- **Email Delivery** — send invoices to parents via Resend with PDF attachment; available on create, bulk generate, and re-send
- **Invoice History** — period dropdown shows only months with actual invoices; download individual PDFs, bulk ZIP, CSV export
- **Settings** — edit organization info and upload invoice signature image
- **Help & FAQ** — in-app guidance covering all features including attendance
- **Staff Login** — username/password login with bcrypt hashing; 10-minute idle session timeout
- **Responsive** — desktop grid + mobile day-stack for attendance; all other pages work on phone, tablet, and desktop

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, React Router v7 |
| Backend | Node.js, Express 5 |
| PDF | PDFKit (in-memory, never written to disk) |
| Email | Resend API (HTTPS — works on Railway) |
| Auth | bcryptjs + express-session (local users file) |
| Storage | JSON flat files (no database) |
| ZIP | Archiver |
| Hosting | Railway |

---

## Project Structure

```
noor-tutoring-invoice/
├── backend/
│   ├── nodemon.json               # Ignores src/data/ to prevent session wipes on data writes
│   ├── scripts/
│   │   └── hash-password.js       # CLI tool to generate bcrypt hashes for users.json
│   ├── src/
│   │   ├── config/
│   │   │   └── users.json         # Staff user accounts (id, name, role, passwordHash)
│   │   ├── data/                  # JSON data files — Railway volume
│   │   │   ├── students.json
│   │   │   ├── invoices.json
│   │   │   ├── attendance.json    # Date-keyed; only A/T stored; date key = school day
│   │   │   ├── config.json
│   │   │   └── audit.json
│   │   ├── assets/                # Signature image — Railway volume
│   │   ├── middleware/
│   │   ├── routes/                # auth, invoices, students, attendance, settings, audit
│   │   └── services/              # pdfService, emailService, auditService, storageService,
│   │                              # attendanceService, userService
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/            # Navbar, ProtectedRoute, AuditFeed
│   │   ├── pages/                 # Dashboard, Students, Attendance, StudentAttendance,
│   │   │                          # Generate, InvoiceHistory, Settings, Help, Login
│   │   └── services/              # api.js (axios)
│   └── package.json
├── package.json                   # Root build/start scripts
└── .env.example                   # Template for required environment variables
```

---

## Attendance Data Model

Attendance is stored in `backend/src/data/attendance.json`. **Present is the default** — only absences and tardies are stored:

```json
{
  "2026-05-01": {},
  "2026-05-05": { "student-uuid-1": "A" },
  "2026-05-06": { "student-uuid-2": "T", "student-uuid-3": "A" }
}
```

- A date key existing = recorded school day
- No student entry on a school day = **Present**
- `"A"` = Absent, `"T"` = Tardy (only these two values are stored)
- Empty `{}` = all students were present that day

This keeps the file small — only exceptions are stored, not a record per student per day.

---

## User Management

User accounts are stored in `backend/src/config/users.json`. This file is part of the codebase (not on the Railway volume), so changes require a commit and redeploy.

### Default accounts

| User ID | Default Password | Role |
|---|---|---|
| `admin` | `Admin2026!` | admin |
| `wajid` | `Noor2026!` | admin |
| `tariq` | `Noor2026!` | admin |

**Change passwords after first login.**

### Adding or changing a user

**Step 1** — Generate a bcrypt hash for the new password:

```bash
cd backend
npm run hash-password -- YourNewPassword123
```

**Step 2** — Edit `backend/src/config/users.json`:

```json
[
  {
    "id": "newuser",
    "name": "Full Name",
    "role": "admin",
    "passwordHash": "<paste hash here>"
  }
]
```

**Step 3** — Commit and push. Railway auto-deploys:

```bash
git add backend/src/config/users.json
git commit -m "Add user: newuser"
git push
```

### Session timeout

Sessions expire after **10 minutes of inactivity**. Every page visit resets the timer. On expiry the user is redirected to the login page.

---

## Local Development

### Prerequisites

- Node.js 18+
- A Resend account with API key and verified domain (for email features)

### 1. Clone the repo

```bash
git clone https://github.com/wajidkhanp/service-tutoring-invoice.git
cd service-tutoring-invoice
```

### 2. Configure environment variables

```bash
cp .env.example backend/.env
```

Edit `backend/.env`:

```env
PORT=3001
SESSION_SECRET=any-random-32-char-string

FRONTEND_URL=http://localhost:5173

RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=invoices@yourdomain.com
```

### 3. Install and run

```bash
npm install --prefix backend
npm install --prefix frontend

# Terminal 1 — backend (nodemon watches src/, ignores src/data/)
npm run dev:backend

# Terminal 2 — frontend
npm run dev:frontend
```

Open [http://localhost:5173](http://localhost:5173) and log in with a user from `users.json`.

---

## Production Deployment (Railway)

### Overview

The backend serves the built React frontend in production — one process, one service, no separate static host.

### Step 1 — Create a Railway project

1. Go to [railway.app](https://railway.app) → **New Project → Deploy from GitHub repo**
2. Select this repo
3. Railway detects `package.json` — click **Deploy**

### Step 2 — Set environment variables

Railway → your service → **Variables** tab:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `3001` |
| `SESSION_SECRET` | random 32-char string (`openssl rand -base64 32`) |
| `RESEND_API_KEY` | from Resend dashboard |
| `RESEND_FROM_EMAIL` | `invoices@yourdomain.com` |

### Step 3 — Add persistent volumes

Without volumes, all data is wiped on every deploy.

Railway → your service → **Volumes** → **Add Volume** (do this twice):

| Mount Path | Purpose |
|---|---|
| `/app/backend/src/data` | Student, invoice, attendance, config, audit JSON files |
| `/app/backend/src/assets` | Signature image |

### Step 4 — Set build and start commands

Railway → **Settings → Deploy**:
- **Build command:** `npm run build`
- **Start command:** `npm start`

### Step 5 — Add a custom domain

Railway → **Settings → Networking → Add Custom Domain** → enter `www.yourdomain.com`

Add the two DNS records Railway gives you:

```
CNAME   www                    →  xxxx.up.railway.app
TXT     _railway-verify.www    →  railway-verify=xxxxxxxxxxxx
```

Wait 5–10 minutes for Railway to show both as ✅ and issue the SSL cert.

---

## Email Setup (Resend)

Railway blocks all outbound SMTP ports. Resend sends over HTTPS (port 443) which works.

1. Go to [resend.com](https://resend.com) → sign up (free: 3,000 emails/month)
2. **Domains → Add Domain** → enter your domain → add the DNS records Resend gives you
3. **API Keys → Create API Key** → copy the key
4. Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` in Railway variables

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `PORT` | Yes | Backend port (default: 3001) |
| `NODE_ENV` | Yes (prod) | Set to `production` on Railway |
| `SESSION_SECRET` | Yes | Random string for session signing (min 32 chars) |
| `RESEND_API_KEY` | Yes | Resend API key (starts with `re_`) |
| `RESEND_FROM_EMAIL` | Yes | From address for invoice emails |

---

## Data Storage

All runtime data is stored as JSON files in `backend/src/data/` (mounted as a Railway volume in production):

| File | Contents |
|---|---|
| `students.json` | Student records (name, gender, joinDate, rate, parent contacts) |
| `invoices.json` | Invoice records (no PDFs stored) |
| `attendance.json` | Date-keyed attendance — only A/T exceptions stored |
| `config.json` | Org info and next invoice number |
| `audit.json` | Audit log events |

User accounts are stored separately in `backend/src/config/users.json` (part of the codebase, not the volume).

PDFs are generated fresh on every download — nothing is written to the server disk.

---

## Monthly Cost

| Service | Cost |
|---|---|
| Railway Hobby plan | $5.00/mo |
| Resend free tier (3,000 emails/mo) | $0.00/mo |
| Domain (e.g. wajid.dev) | ~$1.20/mo |
| **Total** | **~$6.20/mo** |

---

## License

Private — Noor Tutoring / Momin Services of Arizona.
