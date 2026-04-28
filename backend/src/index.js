require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/students');
const invoiceRoutes = require('./routes/invoices');
const auditRoutes = require('./routes/audit');
const settingsRoutes = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 3001;

const isProd = process.env.NODE_ENV === 'production';

app.use(cors({
  origin: isProd ? false : (process.env.FRONTEND_URL || 'http://localhost:5173'),
  credentials: true,
}));

app.use(express.json());

if (isProd) {
  app.set('trust proxy', 1);
}

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProd,
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  },
}));

app.use(passport.initialize());
app.use(passport.session());

app.use('/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/settings', settingsRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve Vite build in production — must come after all API routes
if (isProd) {
  const distPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
  app.use(express.static(distPath));
  app.use((_req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`Noor Tutoring backend running on http://localhost:${PORT}`);
});
