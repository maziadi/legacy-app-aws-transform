// routes/teams.js
var express     = require('express');
var router      = express.Router();
var db          = require('../database');
var ClubService = require('../services/ClubService');
var moment      = require('moment');

function requireAdmin(req, res, next) {
  if (!req.session.user || (req.session.user.role !== 'admin' && req.session.user.role !== 'superadmin' && req.session.user.role !== 'coach')) {
    return res.status(403).send('<h1>Accès refusé</h1>');
  }
  next();
}

// GET /teams
router.get('/', function (req, res) {
  ClubService.getAllTeams(function (err, teams) {
    if (err) {
      console.log('GET /teams:', err);
      return res.render('teams/list', { title: 'Équipes', teams: [], error: 'Erreur' });
    }
    res.render('teams/list', { title: 'Équipes', teams: teams || [], error: null });
  });
});

// GET /teams/new
router.get('/new', requireAdmin, function (req, res) {
  // fetch coaches: members with role coach
  db.query('SELECT id, first_name, last_name, email FROM members WHERE role = "coach" AND is_deleted = 0 ORDER BY last_name', [], function (err, coaches) {
    res.render('teams/form', {
      title:   'Nouvelle équipe',
      team:    {},
      coaches: coaches || [],
      error:   null,
      isNew:   true
    });
  });
});

// POST /teams
router.post('/', requireAdmin, function (req, res) {
  ClubService.createTeam(req.body, function (err, newId) {
    if (err) {
      db.query('SELECT id, first_name, last_name FROM members WHERE role = "coach" AND is_deleted = 0', [], function (e, coaches) {
        return res.render('teams/form', {
          title: 'Nouvelle équipe', team: req.body, coaches: coaches || [],
          error: 'Erreur: ' + err.message, isNew: true
        });
      });
      return;
    }
    req.session.flash = { type: 'success', msg: 'Équipe créée' };
    res.redirect('/teams/' + newId);
  });
});

// GET /teams/:id
router.get('/:id', function (req, res) {
  ClubService.getTeamById(req.params.id, function (err, team) {
    if (err || !team) return res.redirect('/teams');
    res.render('teams/detail', { title: team.name, team: team });
  });
});

// GET /teams/:id/edit
router.get('/:id/edit', requireAdmin, function (req, res) {
  db.query('SELECT * FROM teams WHERE id = ?', [req.params.id], function (err, rows) {
    if (err || !rows.length) return res.redirect('/teams');
    db.query('SELECT id, first_name, last_name FROM members WHERE role = "coach" AND is_deleted = 0', [], function (e, coaches) {
      res.render('teams/form', {
        title: 'Modifier équipe', team: rows[0], coaches: coaches || [], error: null, isNew: false
      });
    });
  });
});

// POST /teams/:id/update
router.post('/:id/update', requireAdmin, function (req, res) {
  ClubService.updateTeam(req.params.id, req.body, function (err) {
    req.session.flash = err
      ? { type: 'error', msg: 'Erreur: ' + err.message }
      : { type: 'success', msg: 'Équipe mise à jour' };
    res.redirect('/teams/' + req.params.id);
  });
});

// POST /teams/:id/delete
router.post('/:id/delete', requireAdmin, function (req, res) {
  // hard delete of team - members' team_id becomes dangling FK
  db.query('UPDATE teams SET status = "archived" WHERE id = ?', [req.params.id], function (err) {
    req.session.flash = err
      ? { type: 'error', msg: 'Erreur suppression' }
      : { type: 'success', msg: 'Équipe archivée' };
    res.redirect('/teams');
  });
});

// GET /teams/:id/stats - team stats (all in one messy query)
router.get('/:id/stats', function (req, res) {
  var id = req.params.id;
  db.query('SELECT * FROM teams WHERE id = ?', [id], function (err, rows) {
    if (err || !rows.length) return res.redirect('/teams');
    var team = rows[0];

    // separate queries for stats - should all be one query
    db.query('SELECT COUNT(*) as n FROM events WHERE team_id = ? AND status = "completed"', [id], function (e, r) {
      team.matchesPlayed = r ? r[0].n : 0;
      db.query('SELECT COUNT(*) as n FROM events WHERE team_id = ? AND result = "win"', [id], function (e, r) {
        team.wins = r ? r[0].n : 0;
        db.query('SELECT COUNT(*) as n FROM events WHERE team_id = ? AND result = "loss"', [id], function (e, r) {
          team.losses = r ? r[0].n : 0;
          db.query('SELECT COUNT(*) as n FROM events WHERE team_id = ? AND result = "draw"', [id], function (e, r) {
            team.draws = r ? r[0].n : 0;
            db.query('SELECT SUM(home_score) as total FROM events WHERE team_id = ? AND status = "completed"', [id], function (e, r) {
              team.goalsFor = r && r[0].total ? r[0].total : 0;
              res.render('teams/stats', { title: 'Stats - ' + team.name, team: team });
            });
          });
        });
      });
    });
  });
});

module.exports = router;
