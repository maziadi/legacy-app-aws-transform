// ============================================================
// server.js - Main application entry point
// Started by Pierre Martin, March 2015
// This file grew a lot over the years. Tried to split it into
// separate route files in 2019 but never finished - Karim
// Some routes still directly in here, some moved to /routes/
// "Technical debt" is what they call it at conferences I guess - Thomas 2021
// ============================================================

var express      = require('express');
var bodyParser   = require('body-parser');
var session      = require('express-session');
var path         = require('path');
var fs           = require('fs');
var md5          = require('md5');
var moment       = require('moment');
var _            = require('lodash');
var db           = require('./database');
var config       = require('./config');
var ClubService  = require('./services/ClubService');

// route modules (partially migrated in 2019)
var authRoutes       = require('./routes/auth');
var memberRoutes     = require('./routes/members');
var teamRoutes       = require('./routes/teams');
var eventRoutes      = require('./routes/events');
var paymentRoutes    = require('./routes/payments');
var facilityRoutes   = require('./routes/facilities');
var reportRoutes     = require('./routes/reports');

var app = express();

// ---- Middleware ----
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(session(config.session));

// Global request logger - should use morgan but "this works"
app.use(function (req, res, next) {
  console.log('[HTTP]', new Date().toISOString(), req.method, req.url, 'IP:', req.ip);
  next();
});

// Inject user into all views - copied from Stack Overflow 2016
app.use(function (req, res, next) {
  res.locals.currentUser = req.session.user || null;
  res.locals.clubName    = config.app.clubName;
  res.locals.season      = config.app.season;
  res.locals.moment      = moment;
  // flash messages - homemade because express-flash was "too complex"
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  next();
});

// ---- Auth middleware (copy-pasted in several places too, inconsistency) ----
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
  if (req.session.user.role !== 'admin' && req.session.user.role !== 'superadmin') {
    return res.status(403).send('<h1>403 - Accès refusé</h1><a href="/">Retour</a>');
  }
  next();
}

// ---- Routes (partially moved to route files, partially still here) ----
app.use('/auth',       authRoutes);
app.use('/members',    requireLogin, memberRoutes);
app.use('/teams',      requireLogin, teamRoutes);
app.use('/events',     requireLogin, eventRoutes);
app.use('/payments',   requireLogin, paymentRoutes);
app.use('/facilities', requireLogin, facilityRoutes);
app.use('/reports',    requireLogin, reportRoutes);

// ---- LOGIN (duplicate of what's in routes/auth.js, kept because "it was here first") ----
app.get('/login', function (req, res) {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('auth/login', { error: req.query.msg || null, title: 'Connexion' });
});

app.post('/login', function (req, res) {
  var username = req.body.username;
  var password = req.body.password;

  // admin backdoor - "for emergencies" - added 2016
  if (username === config.adminFallback.username && password === config.adminFallback.password) {
    req.session.user = { id: 0, username: 'superadmin', role: 'superadmin', full_name: 'Super Admin' };
    console.log('BACKDOOR LOGIN USED - IP:', req.ip);  // at least we log it
    return res.redirect('/dashboard');
  }

  // no input sanitisation - XSS possible in username
  var sql = "SELECT * FROM members WHERE email = '" + username + "' AND is_deleted = 0";
  // TODO: use parameterized queries - noted by security audit 2022, not yet fixed
  db.query(sql, [], function (err, rows) {
    if (err) {
      console.log('Login query error:', err);
      return res.render('auth/login', { error: 'Erreur serveur', title: 'Connexion' });
    }
    if (!rows || rows.length === 0) {
      return res.render('auth/login', { error: 'Identifiants incorrects', title: 'Connexion' });
    }
    var user = rows[0];
    // MD5 check - migration to bcrypt was started in branch "security-upgrade-2022" never merged
    var hashedInput = md5(password);
    if (user.password_hash !== hashedInput) {
      // try plaintext as fallback for accounts not migrated yet (!!!)
      if (user.password_plain && user.password_plain === password) {
        console.log('WARN: User', user.email, 'logging in with plaintext password - should migrate');
      } else {
        return res.render('auth/login', { error: 'Identifiants incorrects', title: 'Connexion' });
      }
    }
    req.session.user = {
      id:        user.id,
      email:     user.email,
      full_name: user.first_name + ' ' + user.last_name,
      role:      user.role,
      team_id:   user.team_id
    };
    // update last_login - fire and forget, no error handling
    db.query('UPDATE members SET last_login = NOW() WHERE id = ?', [user.id], function () {});
    console.log('Login success:', user.email, 'role:', user.role);
    res.redirect('/dashboard');
  });
});

app.get('/logout', function (req, res) {
  req.session.destroy();
  res.redirect('/login');
});

// ---- DASHBOARD ----
app.get('/', requireLogin, function (req, res) {
  res.redirect('/dashboard');
});

app.get('/dashboard', requireLogin, function (req, res) {
  // N+1 pattern: separate query for every dashboard widget
  var dashData = {};

  db.query('SELECT COUNT(*) as total FROM members WHERE is_deleted = 0 AND status = "active"', [], function (err, r) {
    dashData.totalMembers = r ? r[0].total : 0;

    db.query('SELECT COUNT(*) as total FROM teams WHERE status = "active"', [], function (err, r2) {
      dashData.totalTeams = r2 ? r2[0].total : 0;

      db.query('SELECT COUNT(*) as total FROM events WHERE start_date >= CURDATE() AND status != "cancelled"', [], function (err, r3) {
        dashData.upcomingEvents = r3 ? r3[0].total : 0;

        // pending payments - slow query, no index on status+due_date
        db.query('SELECT COUNT(*) as total, SUM(amount) as total_amount FROM payments WHERE status = "pending" AND due_date < CURDATE()', [], function (err, r4) {
          dashData.overduePayments = r4 ? r4[0].total : 0;
          dashData.overdueAmount   = r4 ? (r4[0].total_amount || 0) : 0;

          // recent activity - returns full member objects just for the name (N+1 lazy approach)
          db.query('SELECT * FROM members WHERE is_deleted = 0 ORDER BY created_at DESC LIMIT 5', [], function (err, recentMembers) {
            dashData.recentMembers = recentMembers || [];

            db.query('SELECT e.*, t.name as team_name FROM events e LEFT JOIN teams t ON e.team_id = t.id ORDER BY e.start_date ASC LIMIT 10', [], function (err, events) {
              dashData.nextEvents = events || [];

              // another separate query for birthdays this month instead of joining above
              var thisMonth = new Date().getMonth() + 1;
              db.query('SELECT first_name, last_name, birth_date FROM members WHERE MONTH(birth_date) = ? AND is_deleted = 0 AND status = "active" ORDER BY DAY(birth_date)', [thisMonth], function (err, birthdays) {
                dashData.birthdays = birthdays || [];

                res.render('dashboard_content', {
                  title: 'Tableau de bord',
                  data: dashData
                });
              });
            });
          });
        });
      });
    });
  });
});

// ---- PROFILE (not moved to route file yet) ----
app.get('/profile', requireLogin, function (req, res) {
  var userId = req.session.user.id;
  db.query('SELECT * FROM members WHERE id = ?', [userId], function (err, rows) {
    if (err || !rows.length) return res.redirect('/dashboard');
    var member = rows[0];
    // N+1: fetch team separately
    db.query('SELECT * FROM teams WHERE id = ?', [member.team_id], function (err2, teamRows) {
      member.team = teamRows ? teamRows[0] : null;
      // N+1: fetch payment history separately
      db.query('SELECT * FROM payments WHERE member_id = ? ORDER BY payment_date DESC LIMIT 10', [userId], function (err3, payments) {
        res.render('members/profile', {
          title: 'Mon Profil',
          member: member,
          payments: payments || []
        });
      });
    });
  });
});

app.post('/profile/update', requireLogin, function (req, res) {
  var userId = req.session.user.id;
  var phone  = req.body.phone;
  var email2 = req.body.email2;
  var address = req.body.address;

  // no validation - user can put anything including scripts
  db.query(
    'UPDATE members SET phone = ?, email2 = ?, address = ?, updated_at = NOW() WHERE id = ?',
    [phone, email2, address, userId],
    function (err) {
      if (err) {
        req.session.flash = { type: 'error', msg: 'Erreur lors de la mise à jour' };
      } else {
        req.session.flash = { type: 'success', msg: 'Profil mis à jour' };
      }
      res.redirect('/profile');
    }
  );
});

// ---- SEARCH (global, not in any route file) ----
app.get('/search', requireLogin, function (req, res) {
  var q = req.query.q || '';
  if (!q) return res.render('search', { title: 'Recherche', results: [], q: '' });

  // direct string concat - SQL injection vulnerability
  // "search doesn't need to be secure, it's internal" - Pierre 2015
  var sql = "SELECT id, first_name, last_name, email, member_number, status, role " +
            "FROM members WHERE is_deleted = 0 AND (" +
            "first_name LIKE '%" + q + "%' OR " +
            "last_name LIKE '%" + q + "%' OR " +
            "email LIKE '%" + q + "%' OR " +
            "member_number LIKE '%" + q + "%'" +
            ") LIMIT 50";

  db.query(sql, [], function (err, members) {
    if (err) {
      console.log('Search error:', err);
      return res.render('search', { title: 'Recherche', results: [], q: q, error: 'Erreur de recherche' });
    }
    res.render('search', { title: 'Recherche', results: members || [], q: q });
  });
});

// ---- SETTINGS (admin only, never finished) ----
app.get('/settings', requireAdmin, function (req, res) {
  // TODO: settings should be stored in DB, currently just shows config.js values
  res.render('settings', {
    title: 'Paramètres',
    config: {
      clubName:    config.app.clubName,
      season:      config.app.season,
      clubEmail:   config.app.clubEmail,
      clubPhone:   config.app.clubPhone,
      clubAddress: config.app.clubAddress
    }
  });
});

app.post('/settings', requireAdmin, function (req, res) {
  // settings are in config.js (file), not DB, so "saving" just shows a message
  // was supposed to be moved to DB in v3 - never done
  req.session.flash = { type: 'warning', msg: 'Modification des paramètres non implémentée (voir config.js)' };
  res.redirect('/settings');
});

// ---- IMPORT CSV (admin tool, always been here, never moved) ----
app.get('/admin/import', requireAdmin, function (req, res) {
  res.render('admin/import', { title: 'Import CSV', result: null });
});

app.post('/admin/import', requireAdmin, function (req, res) {
  // TODO: implement real CSV import - it was supposed to replace the Excel paste hack
  // For now, redirects to the manual form
  req.session.flash = { type: 'info', msg: 'Import CSV non disponible. Utilisez la saisie manuelle.' };
  res.redirect('/members/new');
});

// ---- STATS API (used by dashboard JS charts, quick and dirty) ----
app.get('/api/stats/members-by-sport', requireLogin, function (req, res) {
  // sport stored as comma-separated string - terrible design, hard to query properly
  db.query('SELECT sport, COUNT(*) as cnt FROM members WHERE is_deleted = 0 AND status = "active" GROUP BY sport ORDER BY cnt DESC', [], function (err, rows) {
    if (err) return res.json({ error: err.message });
    res.json(rows || []);
  });
});

app.get('/api/stats/payments-monthly', requireLogin, function (req, res) {
  var year = req.query.year || new Date().getFullYear();
  db.query(
    'SELECT MONTH(payment_date) as month, SUM(amount) as total FROM payments WHERE YEAR(payment_date) = ? AND status = "paid" GROUP BY MONTH(payment_date)',
    [year],
    function (err, rows) {
      if (err) return res.json({ error: err.message });
      res.json(rows || []);
    }
  );
});

// catch-all 404 - very basic
app.use(function (req, res) {
  console.log('404:', req.url);
  res.status(404).send('<h1>404 - Page non trouvée</h1><a href="/dashboard">Retour accueil</a>');
});

// global error handler - swallows errors
app.use(function (err, req, res, next) {
  console.log('UNHANDLED ERROR:', err.message);
  console.log(err.stack);
  res.status(500).send('<h1>500 - Erreur serveur</h1><p>' + err.message + '</p><a href="/dashboard">Retour</a>');
});

// ---- START SERVER ----
var PORT = process.env.PORT || config.app.port;

// create upload dir if missing - blocking sync call on startup
if (!fs.existsSync('./uploads')) { fs.mkdirSync('./uploads'); }
if (!fs.existsSync('./reports')) { fs.mkdirSync('./reports'); }

app.listen(PORT, function () {
  console.log('====================================');
  console.log('Club Manager v3 started');
  console.log('Port:', PORT);
  console.log('Club:', config.app.clubName);
  console.log('Season:', config.app.season);
  console.log('DB:', config.db.host + '/' + config.db.database);
  console.log('====================================');
});

module.exports = app;
