function requireAuth(req, res, next) {
  if (req.session?.user) {
    req.user = { email: req.session.user.id, name: req.session.user.name, role: req.session.user.role };
    return next();
  }
  res.status(401).json({ error: 'Unauthorized — please log in' });
}

module.exports = requireAuth;
