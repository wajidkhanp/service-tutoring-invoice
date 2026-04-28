const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { appendEvent } = require('../services/auditService');

const router = express.Router();

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL,
}, (accessToken, refreshToken, profile, done) => {
  const user = {
    id: profile.id,
    name: profile.displayName,
    email: profile.emails?.[0]?.value,
    avatar: profile.photos?.[0]?.value,
    lastLogin: new Date().toISOString(),
  };
  return done(null, user);
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
  prompt: 'select_account',
}));

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: `${process.env.FRONTEND_URL}/login?error=auth_failed` }),
  (req, res, next) => {
    console.log('AUTH CALLBACK:', { authenticated: req.isAuthenticated(), sessionID: req.sessionID, user: req.user?.email });
    appendEvent('login', `${req.user.email} logged in`, req.user.email);
    req.session.save((err) => {
      if (err) return next(err);
      res.redirect(process.env.FRONTEND_URL || 'http://localhost:5173');
    });
  }
);

router.get('/me', (req, res) => {
  console.log('/auth/me:', { authenticated: req.isAuthenticated(), sessionID: req.sessionID, user: req.user?.email });
  if (!req.isAuthenticated()) return res.status(401).json({ user: null });
  res.json({ user: req.user });
});

router.post('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);

    req.session.destroy((destroyErr) => {
      if (destroyErr) return next(destroyErr);
      res.clearCookie('connect.sid', { path: '/' });

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const googleLogoutUrl = `https://accounts.google.com/Logout?continue=https://appengine.google.com/_ah/logout?continue=${encodeURIComponent(`${frontendUrl}/login`)}`;

      res.json({ success: true, googleLogoutUrl });
    });
  });
});

module.exports = router;
