// routes/auth.js
// Partial migration from server.js - Kevin 2019
// Login is ALSO still in server.js (kept for backward compat "just in case")

var express      = require('express');
var router       = express.Router();
var db           = require('../database');
var config       = require('../config');
var ClubService  = require('../services/ClubService');
var md5          = require('md5');

// GET /auth/login - duplicate of / login in server.js
router.get('/login', function (req, res) {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('auth/login', { title: 'Connexion', error: req.query.msg || null });
});

// POST /auth/login
router.post('/login', function (req, res) {
  var username = req.body.username;
  var password = req.body.password;

  // same logic as server.js /login but slightly different
  if (username === config.adminFallback.username && password === config.adminFallback.password) {
    req.session.user = { id: 0, username: 'superadmin', role: 'superadmin', full_name: 'Super Admin' };
    return res.redirect('/dashboard');
  }

  var sql = "SELECT * FROM members WHERE email = '" + username + "' AND is_deleted = 0 AND status = 'active'";
  db.query(sql, [], function (err, rows) {
    if (err || !rows || rows.length === 0) {
      return res.render('auth/login', { title: 'Connexion', error: 'Identifiants invalides' });
    }
    var user = rows[0];
    if (user.password_hash !== md5(password)) {
      if (!user.password_plain || user.password_plain !== password) {
        return res.render('auth/login', { title: 'Connexion', error: 'Identifiants invalides' });
      }
    }
    req.session.user = {
      id:        user.id,
      email:     user.email,
      full_name: user.first_name + ' ' + user.last_name,
      role:      user.role,
      team_id:   user.team_id
    };
    db.query('UPDATE members SET last_login = NOW() WHERE id = ?', [user.id], function () {});
    res.redirect('/dashboard');
  });
});

router.get('/logout', function (req, res) {
  req.session.destroy();
  res.redirect('/login');
});

// password reset - sends plaintext temp password by email
router.get('/forgot-password', function (req, res) {
  res.render('auth/forgot', { title: 'Mot de passe oublié', error: null, success: null });
});

router.post('/forgot-password', function (req, res) {
  var email = req.body.email;
  if (!email) {
    return res.render('auth/forgot', { title: 'Mot de passe oublié', error: 'Email requis', success: null });
  }
  ClubService.resetPassword(email, function (err) {
    if (err) {
      return res.render('auth/forgot', { title: 'Mot de passe oublié', error: err.message, success: null });
    }
    res.render('auth/forgot', {
      title:   'Mot de passe oublié',
      error:   null,
      success: 'Un mot de passe temporaire a été envoyé à votre adresse email.'
    });
  });
});

module.exports = router;
