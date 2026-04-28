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

Private — WajidKhanp

<img width="1361" height="1229" alt="Screenshot 2026-04-27 at 10 29 56 PM" src="https://github.com/user-attachments/assets/a274ca30-e78d-401b-9934-61d669a0bbd1" />
<img width="1365" height="1228" alt="Screenshot 2026-04-27 at 10 29 48 PM" src="https://github.com/user-attachments/assets/6440884b-bb93-406e-9fbb-35129a1a5be5" />
<img width="1612" height="1208" alt="Screenshot 2026-04-27 at 10 29 38 PM" src="https://github.com/user-attachments/assets/370c4f12-7d5b-4ab7-a97d-369226b8b76f" />
<img width="1358" height="1226" alt="Screenshot 2026-04-27 at 10 29 18 PM" src="https://github.com/user-attachments/assets/8924c25f-9eed-4a97-a0f2-4e9ae972ffd0" />
<img width="1361" height="1232" alt="Screenshot 2026-04-27 at 10 29 02 PM" src="https://github.com/user-attachments/assets/d28bf435-5a73-498f-97e3-2c717093cd59" />
<img width="1355" height="1228" alt="Screenshot 2026-04-27 at 10 28 53 PM" src="https://github.com/user-attachments/assets/15d4a7dd-4881-47c7-ab2b-b8bc0f5c2aa3" />
<img width="1358" height="1224" alt="Screenshot 2026-04-27 at 10 28 41 PM" src="https://github.com/user-attachments/assets/6687b576-6f15-4ad7-880a-1bd2885114d1" />
<img width="1351" height="1236" alt="Screenshot 2026-04-27 at 10 28 29 PM" src="https://github.com/user-attachments/assets/2604a8a5-293a-4810-8c75-280f52c72bf3" />
<img width="1355" height="1229" alt="Screenshot 2026-04-27 at 10 28 14 PM" src="https://github.com/user-attachments/assets/08977b4c-af7f-4222-ba9f-6153cef44663" />
<img width="1355" height="1232" alt="Screenshot 2026-04-27 at 10 28 04 PM" src="https://github.com/user-attachments/assets/bc466993-692c-4f9c-a093-2e7c03f343ea" />
<img width="1354" height="1226" alt="Screenshot 2026-04-27 at 10 27 54 PM" src="https://github.com/user-attachments/assets/8b8251e3-597b-41b1-8ea1-2dafddc55111" />
<img width="1312" height="886" alt="Screenshot 2026-04-27 at 10 27 38 PM" src="https://github.com/user-attachments/assets/c9d33432-b853-4ecb-ab3d-6d80f5f168e4" />
<img width="1319" height="891" alt="Screenshot 2026-04-27 at 10 27 28 PM" src="https://github.com/user-attachments/assets/1af6c964-4390-4c37-9ddb-348996dbf8c5" />
<img width="1316" height="893" alt="Screenshot 2026-04-27 at 10 27 19 PM" src="https://github.com/user-attachments/assets/e06bc437-23f9-45eb-b941-6b4f007c55a8" />
<img width="1313" height="885" alt="Screenshot 2026-04-27 at 10 27 06 PM" src="https://github.com/user-attachments/assets/358ea964-ae6c-4b72-b804-64491b5e05f6" />
<img width="1728" height="942" alt="Screenshot 2026-04-27 at 6 35 28 AM" src="https://github.com/user-attachments/assets/a724db7d-5e00-46c0-a937-781cc1918de4" />

