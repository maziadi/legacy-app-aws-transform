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
app.get('/login', async function (req, res, next) {
  try {
    if (req.session.user) return res.redirect('/dashboard');
    res.render('auth/login', { error: req.query.msg || null, title: 'Connexion' });
  } catch (err) {
    next(err);
  }
});

app.post('/login', async function (req, res, next) {
  try {
    var username = req.body.username;
    var password = req.body.password;

    // no input sanitisation - XSS possible in username
    var sql = "SELECT * FROM members WHERE email = ? AND is_deleted = 0";
    var rows = await db.query(sql, [username]);
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
    db.query('UPDATE members SET last_login = NOW() WHERE id = ?', [user.id]).catch(function () {});
    console.log('Login success:', user.email, 'role:', user.role);
    res.redirect('/dashboard');
  } catch (err) {
    console.log('Login query error:', err);
    res.render('auth/login', { error: 'Erreur serveur', title: 'Connexion' });
  }
});

app.get('/logout', async function (req, res, next) {
  try {
    req.session.destroy();
    res.redirect('/login');
  } catch (err) {
    next(err);
  }
});

// ---- DASHBOARD ----
app.get('/', requireLogin, async function (req, res, next) {
  try {
    res.redirect('/dashboard');
  } catch (err) {
    next(err);
  }
});

app.get('/dashboard', requireLogin, async function (req, res, next) {
  try {
    // N+1 pattern: separate query for every dashboard widget
    // Using Promise.all since all queries are independent
    var thisMonth = new Date().getMonth() + 1;

    var [r, r2, r3, r4, recentMembers, events, birthdays] = await Promise.all([
      db.query('SELECT COUNT(*) as total FROM members WHERE is_deleted = 0 AND status = "active"', []),
      db.query('SELECT COUNT(*) as total FROM teams WHERE status = "active"', []),
      db.query('SELECT COUNT(*) as total FROM events WHERE start_date >= CURDATE() AND status != "cancelled"', []),
      db.query('SELECT COUNT(*) as total, SUM(amount) as total_amount FROM payments WHERE status = "pending" AND due_date < CURDATE()', []),
      db.query('SELECT * FROM members WHERE is_deleted = 0 ORDER BY created_at DESC LIMIT 5', []),
      db.query('SELECT e.*, t.name as team_name FROM events e LEFT JOIN teams t ON e.team_id = t.id ORDER BY e.start_date ASC LIMIT 10', []),
      db.query('SELECT first_name, last_name, birth_date FROM members WHERE MONTH(birth_date) = ? AND is_deleted = 0 AND status = "active" ORDER BY DAY(birth_date)', [thisMonth])
    ]);

    var dashData = {};
    dashData.totalMembers = r ? r[0].total : 0;
    dashData.totalTeams = r2 ? r2[0].total : 0;
    dashData.upcomingEvents = r3 ? r3[0].total : 0;
    dashData.overduePayments = r4 ? r4[0].total : 0;
    dashData.overdueAmount   = r4 ? (r4[0].total_amount || 0) : 0;
    dashData.recentMembers = recentMembers || [];
    dashData.nextEvents = events || [];
    dashData.birthdays = birthdays || [];

    res.render('dashboard_content', {
      title: 'Tableau de bord',
      data: dashData
    });
  } catch (err) {
    next(err);
  }
});

// ---- PROFILE (not moved to route file yet) ----
app.get('/profile', requireLogin, async function (req, res, next) {
  try {
    var userId = req.session.user.id;
    var rows = await db.query('SELECT * FROM members WHERE id = ?', [userId]);
    if (!rows || !rows.length) return res.redirect('/dashboard');
    var member = rows[0];
    // N+1: fetch team separately
    var teamRows = await db.query('SELECT * FROM teams WHERE id = ?', [member.team_id]);
    member.team = teamRows ? teamRows[0] : null;
    // N+1: fetch payment history separately
    var payments = await db.query('SELECT * FROM payments WHERE member_id = ? ORDER BY payment_date DESC LIMIT 10', [userId]);
    res.render('members/profile', {
      title: 'Mon Profil',
      member: member,
      payments: payments || []
    });
  } catch (err) {
    next(err);
  }
});

app.post('/profile/update', requireLogin, async function (req, res, next) {
  try {
    var userId = req.session.user.id;
    var phone  = req.body.phone;
    var email2 = req.body.email2;
    var address = req.body.address;

    // no validation - user can put anything including scripts
    await db.query(
      'UPDATE members SET phone = ?, email2 = ?, address = ?, updated_at = NOW() WHERE id = ?',
      [phone, email2, address, userId]
    );
    req.session.flash = { type: 'success', msg: 'Profil mis à jour' };
    res.redirect('/profile');
  } catch (err) {
    req.session.flash = { type: 'error', msg: 'Erreur lors de la mise à jour' };
    res.redirect('/profile');
  }
});

// ---- SEARCH (global, not in any route file) ----
app.get('/search', requireLogin, async function (req, res, next) {
  try {
    var q = req.query.q || '';
    if (!q) return res.render('search', { title: 'Recherche', results: [], q: '' });

    // direct string concat - SQL injection vulnerability
    // "search doesn't need to be secure, it's internal" - Pierre 2015
    var searchPattern = '%' + q + '%';
    var sql = "SELECT id, first_name, last_name, email, member_number, status, role " +
              "FROM members WHERE is_deleted = 0 AND (" +
              "first_name LIKE ? OR " +
              "last_name LIKE ? OR " +
              "email LIKE ? OR " +
              "member_number LIKE ?" +
              ") LIMIT 50";

    var members = await db.query(sql, [searchPattern, searchPattern, searchPattern, searchPattern]);
    res.render('search', { title: 'Recherche', results: members || [], q: q });
  } catch (err) {
    console.log('Search error:', err);
    res.render('search', { title: 'Recherche', results: [], q: req.query.q || '', error: 'Erreur de recherche' });
  }
});

// ---- SETTINGS (admin only, never finished) ----
app.get('/settings', requireAdmin, async function (req, res, next) {
  try {
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
  } catch (err) {
    next(err);
  }
});

app.post('/settings', requireAdmin, async function (req, res, next) {
  try {
    // settings are in config.js (file), not DB, so "saving" just shows a message
    // was supposed to be moved to DB in v3 - never done
    req.session.flash = { type: 'warning', msg: 'Modification des paramètres non implémentée (voir config.js)' };
    res.redirect('/settings');
  } catch (err) {
    next(err);
  }
});

// ---- IMPORT CSV (admin tool, always been here, never moved) ----
app.get('/admin/import', requireAdmin, async function (req, res, next) {
  try {
    res.render('admin/import', { title: 'Import CSV', result: null });
  } catch (err) {
    next(err);
  }
});

app.post('/admin/import', requireAdmin, async function (req, res, next) {
  try {
    // TODO: implement real CSV import - it was supposed to replace the Excel paste hack
    // For now, redirects to the manual form
    req.session.flash = { type: 'info', msg: 'Import CSV non disponible. Utilisez la saisie manuelle.' };
    res.redirect('/members/new');
  } catch (err) {
    next(err);
  }
});

// ---- STATS API (used by dashboard JS charts, quick and dirty) ----
app.get('/api/stats/members-by-sport', requireLogin, async function (req, res, next) {
  try {
    // sport stored as comma-separated string - terrible design, hard to query properly
    var rows = await db.query('SELECT sport, COUNT(*) as cnt FROM members WHERE is_deleted = 0 AND status = "active" GROUP BY sport ORDER BY cnt DESC', []);
    res.json(rows || []);
  } catch (err) {
    res.json({ error: err.message });
  }
});

app.get('/api/stats/payments-monthly', requireLogin, async function (req, res, next) {
  try {
    var year = req.query.year || new Date().getFullYear();
    var rows = await db.query(
      'SELECT MONTH(payment_date) as month, SUM(amount) as total FROM payments WHERE YEAR(payment_date) = ? AND status = "paid" GROUP BY MONTH(payment_date)',
      [year]
    );
    res.json(rows || []);
  } catch (err) {
    res.json({ error: err.message });
  }
});

// catch-all 404 - very basic
app.use(function (req, res) {
  console.log('404:', req.url);
  res.status(404).send('<h1>404 - Page non trouvée</h1><a href="/dashboard">Retour accueil</a>');
});

// global error handler - handles errors from async routes forwarded via next(err)
app.use(function (err, req, res, next) {
  console.log('UNHANDLED ERROR:', err.message);
  console.log(err.stack);
  // return JSON for API routes, HTML for page routes
  if (req.path.startsWith('/api/')) {
    return res.status(500).json({ error: 'Internal server error' });
  }
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
