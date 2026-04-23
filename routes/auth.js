// routes/auth.js
// Partial migration from server.js - Kevin 2019
// Login is ALSO still in server.js (kept for backward compat "just in case")

var express      = require('express');
var router       = express.Router();
var db           = require('../database');
var ClubService  = require('../services/ClubService');
var bcrypt       = require('bcrypt');

// GET /auth/login - duplicate of / login in server.js
router.get('/login', async function (req, res, next) {
  try {
    if (req.session.user) return res.redirect('/dashboard');
    res.render('auth/login', { title: 'Connexion', error: req.query.msg || null });
  } catch (err) {
    next(err);
  }
});

// POST /auth/login
router.post('/login', async function (req, res, next) {
  try {
    var username = req.body.username;
    var password = req.body.password;

    var sql = "SELECT * FROM members WHERE email = ? AND is_deleted = 0 AND status = 'active'";
    var rows = await db.query(sql, [username]);
    if (!rows || rows.length === 0) {
      return res.render('auth/login', { title: 'Connexion', error: 'Identifiants invalides' });
    }
    var user = rows[0];
    if (!(await bcrypt.compare(password, user.password_hash))) {
      return res.render('auth/login', { title: 'Connexion', error: 'Identifiants invalides' });
    }
    req.session.user = {
      id:        user.id,
      email:     user.email,
      full_name: user.first_name + ' ' + user.last_name,
      role:      user.role,
      team_id:   user.team_id
    };
    db.query('UPDATE members SET last_login = NOW() WHERE id = ?', [user.id]).catch(function () {});
    res.redirect('/dashboard');
  } catch (err) {
    next(err);
  }
});

router.get('/logout', async function (req, res, next) {
  try {
    req.session.destroy();
    res.redirect('/login');
  } catch (err) {
    next(err);
  }
});

// password reset - sends plaintext temp password by email
router.get('/forgot-password', async function (req, res, next) {
  try {
    res.render('auth/forgot', { title: 'Mot de passe oublié', error: null, success: null });
  } catch (err) {
    next(err);
  }
});

router.post('/forgot-password', async function (req, res, next) {
  try {
    var email = req.body.email;
    if (!email) {
      return res.render('auth/forgot', { title: 'Mot de passe oublié', error: 'Email requis', success: null });
    }
    await ClubService.resetPassword(email);
    res.render('auth/forgot', {
      title:   'Mot de passe oublié',
      error:   null,
      success: 'Un mot de passe temporaire a été envoyé à votre adresse email.'
    });
  } catch (err) {
    if (err.message === 'Email non trouvé') {
      return res.render('auth/forgot', { title: 'Mot de passe oublié', error: err.message, success: null });
    }
    next(err);
  }
});

module.exports = router;
