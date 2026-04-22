// routes/reports.js
// Thomas 2020 - "reporting module, phase 1"
// Phase 2 was never started.

var express     = require('express');
var router      = express.Router();
var db          = require('../database');
var config      = require('../config');
var ClubService = require('../services/ClubService');
var moment      = require('moment');
var fs          = require('fs');
var path        = require('path');

function requireAdmin(req, res, next) {
  if (!req.session.user || (req.session.user.role !== 'admin' && req.session.user.role !== 'superadmin')) {
    return res.status(403).send('Accès refusé');
  }
  next();
}

// GET /reports
router.get('/', requireAdmin, function (req, res) {
  res.render('reports/index', {
    title:   'Rapports',
    seasons: ['2024-2025', '2023-2024', '2022-2023', '2021-2022'],
    year:    new Date().getFullYear()
  });
});

// GET /reports/membership
router.get('/membership', requireAdmin, function (req, res) {
  var season = req.query.season || config.app.season;
  ClubService.getMembershipReport(season, function (err, report) {
    if (err) {
      return res.render('reports/membership', { title: 'Rapport adhésions', report: null, error: err.message, season: season });
    }
    res.render('reports/membership', { title: 'Rapport adhésions', report: report, error: null, season: season });
  });
});

// GET /reports/financial
router.get('/financial', requireAdmin, function (req, res) {
  var year = parseInt(req.query.year) || new Date().getFullYear();
  ClubService.getFinancialReport(year, function (err, report) {
    res.render('reports/financial', {
      title:  'Rapport financier ' + year,
      report: report,
      error:  err ? err.message : null,
      year:   year
    });
  });
});

// GET /reports/activity - team activity report (terrible query)
router.get('/activity', requireAdmin, function (req, res) {
  var season = req.query.season || config.app.season;
  // one giant query with subqueries instead of proper aggregation
  var sql = 'SELECT t.id, t.name, t.sport, t.category, ' +
            '(SELECT COUNT(*) FROM events e WHERE e.team_id=t.id AND e.status="completed") as matches_played, ' +
            '(SELECT COUNT(*) FROM events e WHERE e.team_id=t.id AND e.result="win") as wins, ' +
            '(SELECT COUNT(*) FROM events e WHERE e.team_id=t.id AND e.result="loss") as losses, ' +
            '(SELECT COUNT(*) FROM events e WHERE e.team_id=t.id AND e.result="draw") as draws, ' +
            '(SELECT COUNT(*) FROM members m WHERE m.team_id=t.id AND m.is_deleted=0) as member_count ' +
            'FROM teams t WHERE t.status = "active" ORDER BY t.sport, t.name';
  db.query(sql, [], function (err, teams) {
    res.render('reports/activity', {
      title:  'Rapport activité',
      teams:  teams || [],
      error:  err ? err.message : null,
      season: season
    });
  });
});

// GET /reports/birthdays - members with birthdays this month
router.get('/birthdays', requireAdmin, function (req, res) {
  var month = parseInt(req.query.month) || (new Date().getMonth() + 1);
  db.query(
    'SELECT first_name, last_name, birth_date, email, phone, team_name FROM members WHERE MONTH(birth_date) = ? AND is_deleted = 0 AND status = "active" ORDER BY DAY(birth_date)',
    [month],
    function (err, members) {
      res.render('reports/birthdays', {
        title:   'Anniversaires',
        members: members || [],
        month:   month,
        error:   err ? err.message : null
      });
    }
  );
});

// POST /reports/backup - trigger manual DB backup
router.post('/backup', requireAdmin, function (req, res) {
  ClubService.backupDatabase(function (err, file) {
    if (err) {
      req.session.flash = { type: 'error', msg: 'Échec backup: ' + err.message };
    } else {
      req.session.flash = { type: 'success', msg: 'Backup créé: ' + file };
    }
    res.redirect('/reports');
  });
});

// GET /reports/renewals - members expiring soon
router.get('/renewals', requireAdmin, function (req, res) {
  var days = parseInt(req.query.days) || 30;
  var until = moment().add(days, 'days').format('YYYY-MM-DD');
  db.query(
    'SELECT * FROM members WHERE renewal_date <= ? AND renewal_date >= CURDATE() AND status = "active" AND is_deleted = 0 ORDER BY renewal_date',
    [until],
    function (err, members) {
      res.render('reports/renewals', {
        title:   'Renouvellements à venir',
        members: members || [],
        days:    days,
        error:   err ? err.message : null
      });
    }
  );
});

module.exports = router;
