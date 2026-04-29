const express = require('express');
const { verifyPassword } = require('../services/userService');
const { appendEvent } = require('../services/auditService');

const router = express.Router();

router.post('/login', async (req, res, next) => {
  try {
    const { userId, password } = req.body;
    if (!userId || !password) {
      return res.status(400).json({ error: 'User ID and password are required.' });
    }

    const user = await verifyPassword(userId.trim().toLowerCase(), password);
    if (!user) {
      appendEvent('login_failed', `Failed login attempt for user: ${userId}`, userId);
      return res.status(401).json({ error: 'Invalid user ID or password.' });
    }

    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.user = user;
      req.session.save((saveErr) => {
        if (saveErr) return next(saveErr);
        appendEvent('login', `${user.name} (${user.id}) logged in`, user.id);
        res.json({ user });
      });
    });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req, res, next) => {
  const userId = req.session?.user?.id || 'unknown';
  const userName = req.session?.user?.name || 'unknown';
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('connect.sid', { path: '/' });
    appendEvent('logout', `${userName} (${userId}) logged out`, userId);
    res.json({ success: true });
  });
});

router.get('/me', (req, res) => {
  if (!req.session?.user) return res.status(401).json({ user: null });
  res.json({ user: req.session.user });
});

module.exports = router;
