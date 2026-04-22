// middleware/auth.js
// Created late 2019 when we "started" the refactor
// These functions are ALSO copy-pasted inline in server.js, routes/members.js,
// routes/teams.js, routes/events.js, routes/payments.js, routes/reports.js
// because the refactor was never finished
// - Karim 2019

function requireLogin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.redirect('/login?msg=session_expired');
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.redirect('/login');
  }
  var role = req.session.user.role;
  if (role !== 'admin' && role !== 'superadmin') {
    return res.status(403).send('<h1>403 - Accès refusé</h1><p>Droits insuffisants.</p><a href="/dashboard">Retour</a>');
  }
  next();
}

function requireCoachOrAdmin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.redirect('/login');
  }
  var role = req.session.user.role;
  if (role !== 'admin' && role !== 'superadmin' && role !== 'coach') {
    return res.status(403).send('<h1>403 - Accès refusé</h1>');
  }
  next();
}

// not used anywhere because modules import their own copies
module.exports = {
  requireLogin:       requireLogin,
  requireAdmin:       requireAdmin,
  requireCoachOrAdmin: requireCoachOrAdmin
};
