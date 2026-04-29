# Noor Tutoring Invoice Manager

A full-stack web application for generating, managing, and emailing monthly invoices for tutoring students. Built for **Noor Tutoring** (operated by Momin Services of Arizona).

---

## Features

- **Dashboard** — live student and invoice counts, recent activity audit feed
- **Students** — add, edit, and remove students with per-student hourly rate, default hours, grade, and notes
- **Invoice Generation** — bulk generate all invoices in one click, or create individual ad hoc invoices
- **PDF Invoices** — professional PDFs generated on demand with org branding and optional signature; nothing stored on disk
- **Email Delivery** — send invoices to parents via Resend with PDF attachment; available on create, bulk generate, and re-send
- **Invoice History** — browse by month/year, download individual PDFs, bulk ZIP download, CSV export
- **Settings** — edit organization info and upload invoice signature image
- **Help & FAQ** — in-app guidance covering all features
- **Staff Login** — username/password login with bcrypt hashing; 10-minute idle session timeout; no external auth provider needed
- **Responsive** — works on desktop, tablet, and mobile

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
│   ├── scripts/
│   │   └── hash-password.js   # CLI tool to generate bcrypt hashes for users.json
│   ├── src/
│   │   ├── config/
│   │   │   └── users.json     # Staff user accounts (id, name, role, passwordHash)
│   │   ├── data/              # JSON data files (invoices, students, config, audit) — Railway volume
│   │   ├── assets/            # Signature image — Railway volume
│   │   ├── middleware/
│   │   ├── routes/            # auth, invoices, students, settings, audit
│   │   └── services/          # pdfService, emailService, auditService, storageService, userService
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/        # Navbar, ProtectedRoute, AuditFeed
│   │   ├── pages/             # Dashboard, Students, Generate, InvoiceHistory, Settings, Help, Login
│   │   └── services/          # api.js (axios)
│   └── package.json
├── package.json               # Root build/start scripts
└── .env.example               # Template for required environment variables
```

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

Copy the output hash.

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

### Roles

The `role` field is stored in the session and shown in the navbar. Currently all roles have equal access. Reserved for future role-based access control.

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

# Terminal 1
cd backend && node src/index.js

# Terminal 2
cd frontend && npm run dev
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

Railway → your service → **Variables** tab. Add all of the following:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `3001` |
| `SESSION_SECRET` | random 32-char string (`openssl rand -base64 32`) |
| `RESEND_API_KEY` | from Resend dashboard |
| `RESEND_FROM_EMAIL` | `invoices@yourdomain.com` |

> ⚠️ No Google OAuth variables are needed. Auth is handled entirely by the local `users.json` file.

### Step 3 — Add persistent volumes

Without volumes, all invoice/student data is wiped on every deploy.

Railway → your service → **Volumes** → **Add Volume** (do this twice):

| Mount Path | Purpose |
|---|---|
| `/app/backend/src/data` | Invoice, student, config, audit JSON files |
| `/app/backend/src/assets` | Signature image |

### Step 4 — Set build and start commands

Railway → **Settings → Deploy**:
- **Build command:** `npm run build`
- **Start command:** `npm start`

### Step 5 — Add a custom domain

Railway → **Settings → Networking → Add Custom Domain** → enter `www.yourdomain.com`

Railway will show two DNS records to add:

```
CNAME   www                    →  xxxx.up.railway.app
TXT     _railway-verify.www    →  railway-verify=xxxxxxxxxxxx
```

> ⚠️ Both records must be added. The CNAME connects traffic; the TXT proves domain ownership so Railway can provision the SSL certificate.

Add them in your DNS provider, then wait 5–10 minutes for Railway to show both as ✅ and issue the SSL cert.

> **Root domain redirect:** If your DNS provider does not support CNAME on `@`, use `www.yourdomain.com` only and set up a URL redirect from the bare domain to `www`.

---

## Email Setup (Resend)

Railway blocks all outbound SMTP ports. Resend sends over HTTPS (port 443) which works.

### 1. Create a Resend account

Go to [resend.com](https://resend.com) → sign up (free: 3,000 emails/month).

### 2. Verify your sending domain

Resend → **Domains → Add Domain** → enter your domain (e.g. `yourdomain.com`)

Resend will give you DNS records to add (TXT + CNAME). Add them in your DNS provider. Verification takes 2–10 minutes.

### 3. Create an API key

Resend → **API Keys → Create API Key** → copy the key (starts with `re_`)

### 4. Set Railway variables

```
RESEND_API_KEY     = re_xxxxxxxxxxxx
RESEND_FROM_EMAIL  = invoices@yourdomain.com
```

---

## DNS Configuration (Complete Reference)

### DNS Provider (Squarespace / Cloudflare / etc.)

| Type | Name | Value | Purpose |
|---|---|---|---|
| `CNAME` | `www` | `xxxx.up.railway.app` | Points traffic to Railway |
| `TXT` | `_railway-verify.www` | `railway-verify=xxxx...` | Railway SSL verification |
| `TXT` | `_dmarc` | (from Resend) | Email deliverability |
| `TXT` | `resend._domainkey` | (from Resend) | Email signing (DKIM) |

### New Domain Setup (end-to-end)

Follow this order when pointing a new domain at the app:

1. **Railway** → service → **Settings → Networking → Add Custom Domain** → get CNAME + TXT values
2. **DNS provider** → add CNAME and TXT records → wait for Railway ✅ and SSL cert
3. **Resend** → **Domains → Add Domain** → add DKIM + DMARC records → wait for Verified
4. **Railway Variables** → update `RESEND_FROM_EMAIL` to `invoices@newdomain.com`

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
| `students.json` | Student records |
| `invoices.json` | Invoice records (no PDFs stored) |
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

## Screenshots

<img width="1361" height="1229" alt="Dashboard" src="https://github.com/user-attachments/assets/a274ca30-e78d-401b-9934-61d669a0bbd1" />
<img width="1365" height="1228" alt="Students" src="https://github.com/user-attachments/assets/6440884b-bb93-406e-9fbb-35129a1a5be5" />
<img width="1612" height="1208" alt="Generate" src="https://github.com/user-attachments/assets/370c4f12-7d5b-4ab7-a97d-369226b8b76f" />
<img width="1358" height="1226" alt="Invoice History" src="https://github.com/user-attachments/assets/8924c25f-9eed-4a97-a0f2-4e9ae972ffd0" />
<img width="1361" height="1232" alt="Settings" src="https://github.com/user-attachments/assets/d28bf435-5a73-498f-97e3-2c717093cd59" />

---

## License

Private — Noor Tutoring / Momin Services of Arizona.
