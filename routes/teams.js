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
router.get('/', async function (req, res, next) {
  try {
    var teams = await ClubService.getAllTeams();
    res.render('teams/list', { title: 'Équipes', teams: teams || [], error: null });
  } catch (err) {
    console.log('GET /teams:', err);
    res.render('teams/list', { title: 'Équipes', teams: [], error: 'Erreur' });
  }
});

// GET /teams/new
router.get('/new', requireAdmin, async function (req, res, next) {
  try {
    // fetch coaches: members with role coach
    var coaches = await db.query('SELECT id, first_name, last_name, email FROM members WHERE role = "coach" AND is_deleted = 0 ORDER BY last_name', []);
    res.render('teams/form', {
      title:   'Nouvelle équipe',
      team:    {},
      coaches: coaches || [],
      error:   null,
      isNew:   true
    });
  } catch (err) {
    next(err);
  }
});

// POST /teams
router.post('/', requireAdmin, async function (req, res, next) {
  try {
    var newId = await ClubService.createTeam(req.body);
    req.session.flash = { type: 'success', msg: 'Équipe créée' };
    res.redirect('/teams/' + newId);
  } catch (err) {
    try {
      var coaches = await db.query('SELECT id, first_name, last_name FROM members WHERE role = "coach" AND is_deleted = 0', []);
      return res.render('teams/form', {
        title: 'Nouvelle équipe', team: req.body, coaches: coaches || [],
        error: 'Erreur: ' + err.message, isNew: true
      });
    } catch (err2) {
      next(err2);
    }
  }
});

// GET /teams/:id
router.get('/:id', async function (req, res, next) {
  try {
    var team = await ClubService.getTeamById(req.params.id);
    if (!team) return res.redirect('/teams');
    res.render('teams/detail', { title: team.name, team: team });
  } catch (err) {
    next(err);
  }
});

// GET /teams/:id/edit
router.get('/:id/edit', requireAdmin, async function (req, res, next) {
  try {
    var rows = await db.query('SELECT * FROM teams WHERE id = ?', [req.params.id]);
    if (!rows || !rows.length) return res.redirect('/teams');
    var coaches = await db.query('SELECT id, first_name, last_name FROM members WHERE role = "coach" AND is_deleted = 0', []);
    res.render('teams/form', {
      title: 'Modifier équipe', team: rows[0], coaches: coaches || [], error: null, isNew: false
    });
  } catch (err) {
    next(err);
  }
});

// POST /teams/:id/update
router.post('/:id/update', requireAdmin, async function (req, res, next) {
  try {
    await ClubService.updateTeam(req.params.id, req.body);
    req.session.flash = { type: 'success', msg: 'Équipe mise à jour' };
    res.redirect('/teams/' + req.params.id);
  } catch (err) {
    req.session.flash = { type: 'error', msg: 'Erreur: ' + err.message };
    res.redirect('/teams/' + req.params.id);
  }
});

// POST /teams/:id/delete
router.post('/:id/delete', requireAdmin, async function (req, res, next) {
  try {
    // hard delete of team - members' team_id becomes dangling FK
    await db.query('UPDATE teams SET status = "archived" WHERE id = ?', [req.params.id]);
    req.session.flash = { type: 'success', msg: 'Équipe archivée' };
    res.redirect('/teams');
  } catch (err) {
    req.session.flash = { type: 'error', msg: 'Erreur suppression' };
    res.redirect('/teams');
  }
});

// GET /teams/:id/stats - team stats (all in one messy query)
router.get('/:id/stats', async function (req, res, next) {
  try {
    var id = req.params.id;
    var rows = await db.query('SELECT * FROM teams WHERE id = ?', [id]);
    if (!rows || !rows.length) return res.redirect('/teams');
    var team = rows[0];

    // separate queries for stats - using Promise.all since they are independent
    var [rPlayed, rWins, rLosses, rDraws, rGoals] = await Promise.all([
      db.query('SELECT COUNT(*) as n FROM events WHERE team_id = ? AND status = "completed"', [id]),
      db.query('SELECT COUNT(*) as n FROM events WHERE team_id = ? AND result = "win"', [id]),
      db.query('SELECT COUNT(*) as n FROM events WHERE team_id = ? AND result = "loss"', [id]),
      db.query('SELECT COUNT(*) as n FROM events WHERE team_id = ? AND result = "draw"', [id]),
      db.query('SELECT SUM(home_score) as total FROM events WHERE team_id = ? AND status = "completed"', [id])
    ]);

    team.matchesPlayed = rPlayed ? rPlayed[0].n : 0;
    team.wins = rWins ? rWins[0].n : 0;
    team.losses = rLosses ? rLosses[0].n : 0;
    team.draws = rDraws ? rDraws[0].n : 0;
    team.goalsFor = rGoals && rGoals[0].total ? rGoals[0].total : 0;

    res.render('teams/stats', { title: 'Stats - ' + team.name, team: team });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
