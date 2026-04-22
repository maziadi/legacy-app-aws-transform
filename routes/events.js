// routes/events.js - Matches, training sessions, tournaments
// Created Karim 2019 / Updated Kevin 2022 (added result recording)

var express     = require('express');
var router      = express.Router();
var db          = require('../database');
var ClubService = require('../services/ClubService');
var moment      = require('moment');

function requireAdmin(req, res, next) {
  if (!req.session.user || (req.session.user.role !== 'admin' && req.session.user.role !== 'superadmin' && req.session.user.role !== 'coach')) {
    return res.status(403).send('Accès refusé');
  }
  next();
}

// GET /events
router.get('/', async function (req, res, next) {
  try {
    var filters = {
      team_id:    req.query.team_id    || null,
      event_type: req.query.event_type || null,
      sport:      req.query.sport      || null,
      from_date:  req.query.from       || moment().startOf('month').format('YYYY-MM-DD'),
      to_date:    req.query.to         || moment().endOf('month').format('YYYY-MM-DD')
    };

    var events = await ClubService.getEvents(filters);
    var teams = await db.query('SELECT id, name, sport FROM teams WHERE status = "active" ORDER BY name', []);
    res.render('events/list', {
      title:  'Événements',
      events: events || [],
      teams:  teams  || [],
      filters: filters,
      error:  null
    });
  } catch (err) {
    res.render('events/list', {
      title: 'Événements', events: [], teams: [], filters: {}, error: err.message
    });
  }
});

// GET /events/calendar - simple text calendar view
router.get('/calendar', async function (req, res, next) {
  try {
    var month = req.query.month || moment().format('YYYY-MM');
    var start = moment(month + '-01').format('YYYY-MM-DD');
    var end   = moment(month + '-01').endOf('month').format('YYYY-MM-DD');
    var events = await db.query(
      'SELECT * FROM events WHERE start_date BETWEEN ? AND ? AND status != "cancelled" ORDER BY start_date',
      [start, end]
    );
    res.render('events/calendar', {
      title:  'Calendrier - ' + month,
      events: events || [],
      month:  month
    });
  } catch (err) {
    next(err);
  }
});

// GET /events/new
router.get('/new', requireAdmin, async function (req, res, next) {
  try {
    // 3 separate queries for dropdowns - should be one roundtrip
    var teams = await db.query('SELECT id, name, sport FROM teams WHERE status = "active"', []);
    var facilities = await db.query('SELECT id, name, type FROM facilities WHERE is_available = 1', []);
    res.render('events/form', {
      title: 'Nouvel événement', event: {}, teams: teams || [],
      facilities: facilities || [], error: null, isNew: true
    });
  } catch (err) {
    next(err);
  }
});

// POST /events
router.post('/', requireAdmin, async function (req, res, next) {
  try {
    var newId = await ClubService.createEvent(req.body, req.session.user.email);
    req.session.flash = { type: 'success', msg: 'Événement créé' };
    res.redirect('/events/' + newId);
  } catch (err) {
    try {
      var teams = await db.query('SELECT id, name FROM teams WHERE status = "active"', []);
      var facilities = await db.query('SELECT id, name FROM facilities', []);
      return res.render('events/form', {
        title: 'Nouvel événement', event: req.body, teams: teams || [],
        facilities: facilities || [], error: err.message, isNew: true
      });
    } catch (err2) {
      next(err2);
    }
  }
});

// GET /events/:id
router.get('/:id', async function (req, res, next) {
  try {
    var rows = await db.query('SELECT e.*, t.name as team_name_j, f.name as facility_name_j FROM events e LEFT JOIN teams t ON e.team_id=t.id LEFT JOIN facilities f ON e.facility_id=f.id WHERE e.id=?', [req.params.id]);
    if (!rows || !rows.length) return res.redirect('/events');
    var ev = rows[0];
    // N+1: get participants separately
    var participants = await db.query('SELECT m.id, m.first_name, m.last_name, m.photo FROM event_participants ep JOIN members m ON ep.member_id=m.id WHERE ep.event_id=?', [ev.id]);
    ev.participants = participants || [];
    res.render('events/detail', { title: ev.title, event: ev });
  } catch (err) {
    next(err);
  }
});

// POST /events/:id/result - record match result
router.post('/:id/result', requireAdmin, async function (req, res, next) {
  try {
    var homeScore = parseInt(req.body.home_score) || 0;
    var awayScore = parseInt(req.body.away_score) || 0;
    var result = await ClubService.recordMatchResult(req.params.id, homeScore, awayScore, req.body.notes);
    req.session.flash = { type: 'success', msg: 'Résultat enregistré: ' + result };
    res.redirect('/events/' + req.params.id);
  } catch (err) {
    req.session.flash = { type: 'error', msg: 'Erreur: ' + err.message };
    res.redirect('/events/' + req.params.id);
  }
});

// POST /events/:id/cancel
router.post('/:id/cancel', requireAdmin, async function (req, res, next) {
  try {
    await db.query('UPDATE events SET status = "cancelled" WHERE id = ?', [req.params.id]);
    // also cancel the booking - fire and forget
    db.query('UPDATE bookings SET status = "cancelled" WHERE event_id = ?', [req.params.id]).catch(function () {});
    req.session.flash = { type: 'success', msg: 'Événement annulé' };
    res.redirect('/events');
  } catch (err) {
    req.session.flash = { type: 'error', msg: 'Erreur' };
    res.redirect('/events');
  }
});

// POST /events/:id/participants - add participant
router.post('/:id/participants', requireAdmin, async function (req, res, next) {
  try {
    var memberId = req.body.member_id;
    var eventId  = req.params.id;
    // no duplicate check
    await db.query('INSERT IGNORE INTO event_participants (event_id, member_id, added_at) VALUES (?, ?, NOW())', [eventId, memberId]);
    req.session.flash = { type: 'success', msg: 'Participant ajouté' };
    res.redirect('/events/' + eventId);
  } catch (err) {
    req.session.flash = { type: 'error', msg: 'Erreur ajout participant' };
    res.redirect('/events/' + req.params.id);
  }
});

module.exports = router;
