# Noor Tutoring Invoice Manager — Handover Guide

This guide covers everything needed to fully transfer ownership and operations of the Noor Tutoring Invoice Manager to another person. Follow it top-to-bottom — each section builds on the previous.

---

## 1. What You're Handing Over

The app consists of **four external accounts** that together keep it running. The new owner needs access to all of them.

| Account | What it controls |
|---|---|
| **GitHub** | Source code — all changes go here first |
| **Railway** | Hosting, deployment, environment variables, volumes (persistent data) |
| **Resend** | Invoice email delivery |
| **Domain registrar (Squarespace / other)** | DNS records pointing the domain to Railway |

> **Note:** There is no Google Cloud or OAuth dependency. Login is handled entirely by a local `users.json` file committed to the repo.

---

## 2. GitHub — Transfer the Repository

### Option A: Transfer ownership (simplest, recommended)

1. Go to [github.com/wajidkhanp/service-tutoring-invoice](https://github.com/wajidkhanp/service-tutoring-invoice)
2. Click **Settings** → **Danger Zone** → **Transfer ownership**
3. Enter the new owner's GitHub username
4. Confirm the transfer

The repo URL changes to `github.com/<new-owner>/service-tutoring-invoice`. Update the Railway source after this (see Railway section).

### Option B: New owner forks/clones

```bash
git clone https://github.com/wajidkhanp/service-tutoring-invoice.git
cd service-tutoring-invoice
git remote set-url origin https://github.com/<new-owner>/<new-repo>.git
git push -u origin main
```

Then re-connect Railway to the new repo.

---

## 3. Railway — Transfer the Deployment

### Step 1 — Invite the new owner

1. Go to [railway.app](https://railway.app) → **Project Dashboard**
2. Click **Settings** → **Members** → **Invite Member**
3. Enter the new owner's email — grant **Owner** role
4. Once they accept, you can remove yourself

### Step 2 — If GitHub repo was transferred

Railway needs to re-authorize the new source:

1. Railway → your service → **Settings → Source**
2. Click **Disconnect** then **Connect Repository**
3. Authorize Railway to access the new owner's GitHub account
4. Select the transferred repo

### Step 3 — Hand over environment variables

The new owner needs all values in Railway → **Variables**. Share them securely (1Password, encrypted email, etc.):

| Variable | Where to find / what to set |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `3001` |
| `SESSION_SECRET` | Generate new: `openssl rand -base64 32` |
| `RESEND_API_KEY` | Resend dashboard |
| `RESEND_FROM_EMAIL` | `invoices@<domain>` |

> **Security note:** Generate a fresh `SESSION_SECRET` for the new owner. Never share the old one in plaintext.

### Step 4 — Hand over volumes (data)

Railway volumes hold all student/invoice data at `/app/backend/src/data`.

**Option A — Keep existing volumes (recommended for continuity)**

Leave the volumes attached. The new owner inherits the data once they have project access.

**Option B — Export then re-import**

1. Use the app's **Invoice History → Export CSV** to download invoice data
2. Download raw JSON via Railway shell:
   ```bash
   cat /app/backend/src/data/students.json
   cat /app/backend/src/data/invoices.json
   cat /app/backend/src/data/config.json
   cat /app/backend/src/data/audit.json
   ```
3. New owner restores via Railway shell after taking ownership

### Step 5 — Update custom domain if being transferred

See Section 6.

---

## 4. User Management — Adding / Removing Login Access

Login is controlled by `backend/src/config/users.json` in the repository. There is no external auth provider.

### Current users

| User ID | Name | Role |
|---|---|---|
| `admin` | Administrator | admin |
| `wajid` | Wajid Khan | admin |
| `tariq` | Tariq Khalil | admin |

### Adding a new user

**Step 1** — Generate a bcrypt hash for their password (run from the `backend` directory):

```bash
npm run hash-password -- TheirPassword123
```

Copy the hash output.

**Step 2** — Add an entry to `backend/src/config/users.json`:

```json
{
  "id": "newuser",
  "name": "Full Name",
  "role": "admin",
  "passwordHash": "<paste hash here>"
}
```

**Step 3** — Commit and push. Railway auto-deploys:

```bash
git add backend/src/config/users.json
git commit -m "Add user: newuser"
git push
```

### Removing a user

Delete their entry from `users.json`, commit, and push. They will not be able to log in after the next deploy.

### Changing a password

Generate a new hash with `npm run hash-password`, replace the `passwordHash` value in `users.json`, commit, and push.

### Session timeout

Sessions expire after **10 minutes of inactivity**. Every page visit resets the timer. Logout is also available from the navbar at any time. All login, logout, and failed login attempts are recorded in `audit.json`.

---

## 5. Resend — Transfer Email Sending

### Option A: Invite new owner to existing Resend account

1. Go to [resend.com](https://resend.com) → **Settings → Team**
2. **Invite Member** → enter new owner's email → **Owner** role
3. New owner accepts the invite

### Option B: New owner sets up their own Resend account

1. New owner creates account at [resend.com](https://resend.com)
2. They verify their sending domain (see DNS section)
3. They create a new API key
4. Update Railway: `RESEND_API_KEY` and `RESEND_FROM_EMAIL`

---

## 6. Domain — Transfer DNS Control

### If domain stays with original registrar (Squarespace, etc.)

Share registrar login credentials securely, or transfer ownership of the account.

### If domain is moving to a new registrar

1. Unlock the domain at the current registrar
2. Get the **EPP/Auth transfer code**
3. New registrar initiates transfer using that code
4. Confirm via email — transfer takes 5–7 days

### DNS records that must exist after transfer

| Type | Name | Value | Purpose |
|---|---|---|---|
| `CNAME` | `www` | `<railway-app>.up.railway.app` | Points to Railway |
| `TXT` | `_railway-verify.www` | `railway-verify=<value>` | Railway SSL cert |
| `TXT` | `_dmarc` | (from Resend) | Email deliverability |
| `TXT` | `resend._domainkey` | (from Resend) | DKIM email signing |

Get Railway values from: Railway → service → **Settings → Networking → Custom Domain**
Get Resend values from: Resend → **Domains → your domain**

---

## 7. New Domain Configuration (End-to-End)

If the new owner is setting up a completely new domain (e.g. replacing `wajid.dev` with `newdomain.com`), follow these steps in order:

### Step 1 — Add the domain in Railway

1. Railway → service → **Settings → Networking → Add Custom Domain**
2. Enter `www.newdomain.com`
3. Copy the CNAME value and TXT verification value shown

### Step 2 — Configure DNS

At your DNS provider, add:

```
CNAME   www                    →  <value from Railway>
TXT     _railway-verify.www    →  <value from Railway>
```

Wait 5–15 minutes. Railway shows ✅ on both records and issues the SSL certificate.

> If your registrar doesn't support CNAME on root (`@`), use `www.newdomain.com` only and add a URL redirect from the bare domain to `www`.

### Step 3 — Verify sending domain in Resend

1. Resend → **Domains → Add Domain** → enter `newdomain.com`
2. Add the DNS records Resend provides:
   ```
   TXT     resend._domainkey    →  <DKIM key from Resend>
   TXT     _dmarc               →  v=DMARC1; p=none;
   ```
3. Wait 2–10 minutes — Resend dashboard shows **Verified**

### Step 4 — Update Railway variables

```
RESEND_FROM_EMAIL  =  invoices@newdomain.com
```

> No Google OAuth variables are needed — auth is local.

### Step 5 — Deploy

Railway auto-deploys on variable save. Verify at `https://www.newdomain.com`.

---

## 8. Secrets and Credentials Checklist

Before handover, prepare a secure document (use 1Password or similar) with:

- [ ] GitHub repo URL + new owner's access confirmed
- [ ] Railway project URL + new owner invited as Owner
- [ ] New `SESSION_SECRET` (generated fresh — `openssl rand -base64 32`)
- [ ] Resend API key (generate a fresh one for the new owner)
- [ ] Domain registrar login (or transfer initiated)
- [ ] Updated `backend/src/config/users.json` with the new owner's user account

---

## 9. Post-Handover Cleanup

Once the new owner has confirmed everything works:

1. **Railway:** Remove yourself from the project members list
2. **Resend:** Remove yourself from the team
3. **Domain registrar:** Remove your account access (or complete the transfer)
4. **GitHub:** Remove yourself as collaborator (or confirm transfer is complete)
5. **users.json:** Remove your own user ID if you should no longer have app access — commit and push

---

## 10. Data Backup

Before any major handover or migration:

1. Railway → service → **Shell**
2. Run:
   ```bash
   cat /app/backend/src/data/students.json
   cat /app/backend/src/data/invoices.json
   cat /app/backend/src/data/config.json
   cat /app/backend/src/data/audit.json
   ```
3. Save each output to local files

No database to export — all runtime data is in these four JSON files on the Railway volume.

User accounts are in `backend/src/config/users.json` in the repository — already backed up via git.

---

## 11. Contacts and Accounts Summary

| Resource | URL | Current Owner |
|---|---|---|
| GitHub repo | github.com/wajidkhanp/service-tutoring-invoice | wajidkhanp@gmail.com |
| Railway project | railway.app | wajidkhanp@gmail.com |
| Resend | resend.com | wajidkhanp@gmail.com |
| Domain registrar | account.squarespace.com | wajidkhanp@gmail.com |
| Live app | https://www.wajid.dev | — |
