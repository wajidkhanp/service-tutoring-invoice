# Noor Tutoring Invoice Manager — Handover Guide

This guide covers everything needed to fully transfer ownership and operations of the Noor Tutoring Invoice Manager to another person. Follow it top-to-bottom — each section builds on the previous.

---

## 1. What You're Handing Over

The app consists of **five external accounts** that together keep it running. The new owner needs access to all of them.

| Account | What it controls |
|---|---|
| **GitHub** | Source code — all changes go here first |
| **Railway** | Hosting, deployment, environment variables, volumes (persistent data) |
| **Google Cloud Console** | OAuth login (the "Sign in with Google" button) |
| **Resend** | Invoice email delivery |
| **Domain registrar (Squarespace / other)** | DNS records pointing the domain to Railway |

---

## 2. GitHub — Transfer the Repository

### Option A: Transfer ownership (simplest, recommended)

1. Go to [github.com/wajidkhanp/service-tutoring-invoice](https://github.com/wajidkhanp/service-tutoring-invoice)
2. Click **Settings** → **Danger Zone** → **Transfer ownership**
3. Enter the new owner's GitHub username
4. Confirm the transfer

The repo URL changes to `github.com/<new-owner>/service-tutoring-invoice`. You must update the Railway source after this (see Railway section).

### Option B: New owner forks/clones

The new owner can clone the repo and push to their own account:

```bash
git clone https://github.com/wajidkhanp/service-tutoring-invoice.git
cd service-tutoring-invoice
git remote set-url origin https://github.com/<new-owner>/<new-repo>.git
git push -u origin main
```

Then re-connect Railway to the new repo (see Railway section).

---

## 3. Railway — Transfer the Deployment

### Step 1 — Invite the new owner

1. Go to [railway.app](https://railway.app) → **Project Dashboard**
2. Click **Settings** → **Members** → **Invite Member**
3. Enter the new owner's email — grant **Owner** role
4. Once they accept, you can remove yourself

### Step 2 — If GitHub repo was transferred (Option A above)

Railway needs to re-authorize the new GitHub source:

1. Railway → your service → **Settings** → **Source**
2. Click **Disconnect** then **Connect Repository**
3. Authorize Railway to access the new owner's GitHub account
4. Select the transferred repo

### Step 3 — Hand over environment variables

The new owner needs all values in Railway → **Variables**. Share them securely (1Password, encrypted email, etc.):

| Variable | Where to find the value |
|---|---|
| `NODE_ENV` | Just set to `production` |
| `PORT` | Just set to `3001` |
| `SESSION_SECRET` | Generate new: `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | Google Cloud Console (see section 4) |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console (see section 4) |
| `GOOGLE_CALLBACK_URL` | `https://www.<domain>/auth/google/callback` |
| `FRONTEND_URL` | `https://www.<domain>` |
| `RESEND_API_KEY` | Resend dashboard (see section 5) |
| `RESEND_FROM_EMAIL` | `invoices@<domain>` |

> **Security note:** Generate a new `SESSION_SECRET` for the new owner. Never share the old one in plaintext email.

### Step 4 — Hand over volumes (data)

Railway volumes hold all student/invoice data. Two options:

**Option A — Keep existing volumes (data continuity)**

Leave the volumes attached. The new owner inherits the data automatically once they have project access.

**Option B — Export then reimport**

1. Old owner: use the app's **Invoice History → Export CSV** to download invoice data
2. Download the JSON files via Railway shell: Railway → service → **Shell**:
   ```bash
   cat /app/backend/src/data/students.json
   cat /app/backend/src/data/invoices.json
   cat /app/backend/src/data/config.json
   ```
3. Save the output. New owner can restore by writing these files back via the shell after taking ownership.

### Step 5 — Update custom domain (if domain is also being transferred)

See the Domain section (section 6) for DNS changes.

---

## 4. Google Cloud Console — Transfer OAuth

### Option A: Add new owner to existing project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Select the project used for the OAuth credentials
3. **IAM & Admin → IAM → Grant Access**
4. Enter the new owner's Google account email
5. Role: **Owner**

The new owner can then manage the OAuth credentials. They should create their own OAuth client ID and secret:

1. **APIs & Services → Credentials → + Create Credentials → OAuth 2.0 Client ID**
2. Application type: **Web application**
3. **Authorized JavaScript origins:** `https://www.<domain>`
4. **Authorized redirect URIs:** `https://www.<domain>/auth/google/callback`
5. Copy the new **Client ID** and **Client Secret** into Railway variables

### Option B: Transfer the Google Cloud project

1. **IAM & Admin → Settings → Transfer Project**
2. Enter the new owner's Google Workspace or Gmail account
3. The new owner accepts the transfer in their Cloud Console

> After transfer, the old credentials still work but the new owner controls them.

### Authorized Users (if app is in Testing mode)

If the OAuth consent screen is in **Testing** mode (not published), only explicitly listed test users can log in:

1. **APIs & Services → OAuth consent screen → Test users**
2. Add the new owner's email and any other authorized users
3. Remove old users who should no longer have access

### Consent Screen Settings

Make sure the new domain is listed under **Authorized domains** if the domain changes:

1. **APIs & Services → OAuth consent screen → Edit App**
2. Add the new domain (e.g. `newdomain.com`) under **Authorized domains**

---

## 5. Resend — Transfer Email Sending

### Option A: Invite new owner to existing Resend account

1. Go to [resend.com](https://resend.com) → **Settings → Team**
2. **Invite Member** → enter new owner's email → **Owner** role
3. New owner accepts the invite

They will have access to existing API keys and domain verification.

### Option B: New owner sets up their own Resend account

1. New owner creates account at [resend.com](https://resend.com)
2. They verify their sending domain (see DNS records below)
3. They create a new API key
4. Update Railway: `RESEND_API_KEY` and `RESEND_FROM_EMAIL`

### What to hand over

- The verified sending domain (e.g. `wajid.dev`) — or the new owner verifies their own
- The `RESEND_API_KEY` (or the new owner generates a fresh one)
- DNS records for the sending domain (see DNS section)

---

## 6. Domain — Transfer DNS Control

### If domain stays with original registrar (Squarespace, etc.)

The new owner needs access to the registrar account to manage DNS:

1. Transfer the registrar account, or
2. Create a sub-account / share login credentials securely

### If domain is being transferred to a new registrar

Standard domain transfer process:

1. Unlock the domain at current registrar
2. Get the **EPP/Auth transfer code**
3. New registrar initiates transfer using that code
4. Confirm via email (60-second window, watch spam folder)
5. Transfer takes 5–7 days

### DNS records that must exist after transfer

Once the domain resolves at the new registrar, recreate all DNS records:

| Type | Name | Value | Purpose |
|---|---|---|---|
| `CNAME` | `www` | `<railway-app>.up.railway.app` | Points to Railway |
| `TXT` | `_railway-verify.www` | `railway-verify=<value>` | Railway SSL cert |
| `TXT` | `_dmarc` | (from Resend) | Email deliverability |
| `TXT` | `resend._domainkey` | (from Resend) | DKIM email signing |

Get the Railway values from: Railway → service → **Settings → Networking → Custom Domain**
Get the Resend values from: Resend → **Domains → your domain**

---

## 7. New Domain Configuration (End-to-End)

If the new owner is setting up a completely new domain (e.g. replacing `wajid.dev` with `newdomain.com`), follow these steps in order:

### Step 1 — Add the domain in Railway

1. Railway → service → **Settings → Networking → Add Custom Domain**
2. Enter `www.newdomain.com`
3. Railway shows two DNS records — copy them (CNAME value and TXT verification value)

### Step 2 — Configure DNS at registrar

At your DNS provider, add:

```
CNAME   www                    →  <value from Railway>
TXT     _railway-verify.www    →  <value from Railway>
```

Wait 5–15 minutes for Railway to verify (shows ✅ on both records). SSL certificate is issued automatically once both are verified.

> If your registrar shows a warning about CNAME on root (`@`), use `www.newdomain.com` only. Set up a URL redirect from the root to `www` if needed.

### Step 3 — Verify the domain in Resend

1. Resend → **Domains → Add Domain** → enter `newdomain.com`
2. Resend gives you DNS records — add them at your registrar:
   ```
   TXT     resend._domainkey    →  <DKIM key from Resend>
   TXT     _dmarc               →  v=DMARC1; p=none;
   ```
3. Wait 2–10 minutes — Resend dashboard shows **Verified**

### Step 4 — Update Google OAuth

1. Google Cloud Console → **APIs & Services → Credentials**
2. Edit the OAuth 2.0 Client ID
3. **Authorized JavaScript origins** — add `https://www.newdomain.com`
4. **Authorized redirect URIs** — add `https://www.newdomain.com/auth/google/callback`
5. Save

Also update the consent screen:
- **APIs & Services → OAuth consent screen → Authorized domains** — add `newdomain.com`

### Step 5 — Update Railway environment variables

In Railway → **Variables**, update:

```
GOOGLE_CALLBACK_URL  =  https://www.newdomain.com/auth/google/callback
FRONTEND_URL         =  https://www.newdomain.com
RESEND_FROM_EMAIL    =  invoices@newdomain.com
```

> **Critical:** No trailing spaces or newlines in any value — they cause silent failures (Google OAuth encodes them as `%0A`).

### Step 6 — Deploy

Railway auto-deploys on variable changes. Verify at `https://www.newdomain.com`.

---

## 8. Secrets and Credentials Checklist

Before handover, prepare a secure document (use 1Password or similar) with:

- [ ] GitHub repo URL + new owner's access confirmed
- [ ] Railway project URL + new owner invited as Owner
- [ ] Google Cloud Console project ID + OAuth Client ID + Client Secret
- [ ] Resend API key (generate a fresh one for the new owner)
- [ ] New `SESSION_SECRET` (generated fresh — `openssl rand -base64 32`)
- [ ] Domain registrar login (or transfer initiated)
- [ ] List of authorized login emails (Google OAuth test users)

---

## 9. Post-Handover Cleanup

Once the new owner has confirmed everything works:

1. **Railway:** Remove yourself from the project members list
2. **Google Cloud Console:** Remove your email from IAM and from OAuth test users
3. **Resend:** Remove yourself from the team
4. **Domain registrar:** Remove your account access (or complete the transfer)
5. **GitHub:** Remove yourself as collaborator (or confirm transfer is complete)

---

## 10. Authorized Login Accounts

The app uses Google OAuth with restricted access. Currently authorized accounts:

- `wajidkhanp@gmail.com` (admin/developer)

To add or remove authorized users:
1. Google Cloud Console → **APIs & Services → OAuth consent screen → Test users**
2. Add or remove email addresses

If the app is published (not in Testing mode), any Google account can attempt login — restrict access in the backend middleware instead.

---

## 11. Data Backup

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

No database to export — all data is in these four JSON files on the Railway volume.

---

## 12. Contacts and Accounts Summary

| Resource | URL | Current Owner |
|---|---|---|
| GitHub repo | github.com/wajidkhanp/service-tutoring-invoice | wajidkhanp@gmail.com |
| Railway project | railway.app | wajidkhanp@gmail.com |
| Google Cloud Console | console.cloud.google.com | wajidkhanp@gmail.com |
| Resend | resend.com | wajidkhanp@gmail.com |
| Domain registrar | account.squarespace.com | wajidkhanp@gmail.com |
| Live app | https://www.wajid.dev | — |
