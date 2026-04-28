# Noor Tutoring Invoice Manager

A full-stack web application for generating, managing, and emailing monthly invoices for tutoring students. Built for **Noor Tutoring** (operated by Momin Services of Arizona).

---

## Features

- **Dashboard** — live student and invoice counts, recent activity audit feed
- **Students** — add, edit, and remove students with per-student hourly rate, default hours, grade, and notes
- **Invoice Generation** — bulk generate invoices for all students in one click, or create individual ad hoc invoices
- **PDF Invoices** — professional PDFs generated on demand with org branding and optional signature; nothing stored on disk
- **Email Delivery** — send invoices directly to parents via Gmail with PDF attachment; available on create, bulk generate, and re-send
- **Invoice History** — browse by month/year, download individual PDFs, bulk ZIP download, CSV export
- **Settings** — edit organization info and upload invoice signature image
- **Help & FAQ** — in-app guidance covering all features
- **Google OAuth** — secure single sign-on, restricted to authorized accounts
- **Responsive** — works on desktop, tablet, and mobile

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, React Router v7 |
| Backend | Node.js, Express 5 |
| PDF | PDFKit (in-memory, never written to disk) |
| Email | Nodemailer + Gmail App Password |
| Auth | Passport.js + Google OAuth 2.0 |
| Storage | JSON flat files (no database) |
| ZIP | Archiver |

---

## Project Structure

```
noor-tutoring-invoice/
├── backend/
│   ├── src/
│   │   ├── data/              # JSON data files (invoices, students, config, audit)
│   │   ├── assets/            # Signature image (gitignored after upload)
│   │   ├── middleware/
│   │   ├── routes/            # auth, invoices, students, settings, audit
│   │   └── services/          # pdfService, emailService, auditService, storageService
│   ├── .env                   # Secret config — never committed
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/        # Navbar, ProtectedRoute, AuditFeed
│   │   ├── pages/             # Dashboard, Students, Generate, InvoiceHistory, Settings, Help, Login
│   │   └── services/          # api.js (axios)
│   └── package.json
├── package.json               # Root scripts for build and start
└── .env.example               # Template for required environment variables
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Google Cloud project with OAuth 2.0 credentials
- A Gmail account with an [App Password](https://myaccount.google.com/apppasswords) for email sending

### 1. Clone the repo

```bash
git clone https://github.com/wajidkhanp/service-tutoring-invoice.git
cd service-tutoring-invoice
```

### 2. Configure environment variables

```bash
cp .env.example backend/.env
```

Edit `backend/.env` and fill in all values:

```env
PORT=3001
SESSION_SECRET=your-random-secret

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback

FRONTEND_URL=http://localhost:5173

GMAIL_USER=you@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
```

### 3. Install dependencies

```bash
npm install --prefix backend
npm install --prefix frontend
```

### 4. Run in development

In two terminals:

```bash
# Terminal 1 — backend
cd backend && node src/index.js

# Terminal 2 — frontend
cd frontend && npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Production Deployment

The backend serves the built frontend in production mode — a single process, no separate static host needed.

```bash
# Build frontend
npm run build --prefix frontend

# Start production server
NODE_ENV=production node backend/src/index.js
```

Set `GOOGLE_CALLBACK_URL` to your production domain (e.g. `https://yourdomain.com/auth/google/callback`) and update the authorized redirect URI in Google Cloud Console.

---

## Environment Variables Reference

| Variable | Description |
|---|---|
| `PORT` | Backend port (default: 3001) |
| `SESSION_SECRET` | Random string for session signing |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_CALLBACK_URL` | OAuth redirect URI |
| `FRONTEND_URL` | Frontend origin for CORS (dev only) |
| `GMAIL_USER` | Gmail address used to send invoices |
| `GMAIL_APP_PASSWORD` | Gmail App Password (16 chars, not your account password) |

---

## Data Storage

All data is stored as JSON files in `backend/src/data/`:

| File | Contents |
|---|---|
| `students.json` | Student records |
| `invoices.json` | Invoice records (no PDFs stored) |
| `config.json` | Org info and next invoice number |
| `audit.json` | Audit log events |

PDFs are generated fresh on every download request — nothing is written to the server disk.

---

## License

Private — Noor Tutoring / Momin Services of Arizona.
