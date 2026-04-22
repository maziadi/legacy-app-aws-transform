// routes/facilities.js - Sports facilities & booking management

var express     = require('express');
var router      = express.Router();
var db          = require('../database');
var ClubService = require('../services/ClubService');
var moment      = require('moment');

function requireAdmin(req, res, next) {
  if (!req.session.user || (req.session.user.role !== 'admin' && req.session.user.role !== 'superadmin')) {
    return res.status(403).send('Accès refusé');
  }
  next();
}

// GET /facilities
router.get('/', async function (req, res, next) {
  try {
    var facilities = await ClubService.getFacilities();
    // N+1: get next booking for each facility
    if (!facilities || facilities.length === 0) {
      return res.render('facilities/list', { title: 'Installations', facilities: [], error: null });
    }
    await Promise.all(facilities.map(async function (f, i) {
      var rows = await db.query(
        'SELECT b.*, e.title FROM bookings b LEFT JOIN events e ON b.event_id = e.id WHERE b.facility_id = ? AND b.start_time >= NOW() AND b.status != "cancelled" ORDER BY b.start_time LIMIT 1',
        [f.id]
      );
      facilities[i].next_booking = rows ? rows[0] : null;
    }));
    res.render('facilities/list', { title: 'Installations', facilities: facilities, error: null });
  } catch (err) {
    next(err);
  }
});

// GET /facilities/new
router.get('/new', requireAdmin, async function (req, res, next) {
  try {
    res.render('facilities/form', { title: 'Nouvelle installation', facility: {}, error: null, isNew: true });
  } catch (err) {
    next(err);
  }
});

// POST /facilities
router.post('/', requireAdmin, async function (req, res, next) {
  try {
    var d = req.body;
    var result = await db.query(
      'INSERT INTO facilities (name, type, capacity, address, is_available, notes, hourly_rate, contact_person, contact_phone) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)',
      [d.name, d.type, d.capacity || 0, d.address || null, d.notes || null, d.hourly_rate || 0, d.contact_person || null, d.contact_phone || null]
    );
    req.session.flash = { type: 'success', msg: 'Installation créée' };
    res.redirect('/facilities/' + result.insertId);
  } catch (err) {
    res.render('facilities/form', { title: 'Nouvelle installation', facility: req.body, error: err.message, isNew: true });
  }
});

// GET /facilities/:id
router.get('/:id', async function (req, res, next) {
  try {
    var rows = await db.query('SELECT * FROM facilities WHERE id = ?', [req.params.id]);
    if (!rows || !rows.length) return res.redirect('/facilities');
    var fac = rows[0];
    // get upcoming bookings
    var bookings = await db.query(
      'SELECT b.*, e.title as event_title, t.name as team_name FROM bookings b LEFT JOIN events e ON b.event_id=e.id LEFT JOIN teams t ON b.team_id=t.id WHERE b.facility_id=? AND b.start_time >= NOW() ORDER BY b.start_time LIMIT 20',
      [fac.id]
    );
    fac.bookings = bookings || [];
    res.render('facilities/detail', { title: fac.name, facility: fac });
  } catch (err) {
    next(err);
  }
});

// GET /facilities/:id/schedule - weekly schedule
router.get('/:id/schedule', async function (req, res, next) {
  try {
    var facilityId = req.params.id;
    var weekStart  = req.query.week ? moment(req.query.week) : moment().startOf('isoWeek');
    var weekEnd    = weekStart.clone().endOf('isoWeek');

    var rows = await db.query('SELECT * FROM facilities WHERE id = ?', [facilityId]);
    if (!rows || !rows.length) return res.redirect('/facilities');
    var bookings = await db.query(
      'SELECT b.*, e.title FROM bookings b LEFT JOIN events e ON b.event_id=e.id WHERE b.facility_id=? AND b.start_time BETWEEN ? AND ? AND b.status!="cancelled" ORDER BY b.start_time',
      [facilityId, weekStart.format('YYYY-MM-DD HH:mm:ss'), weekEnd.format('YYYY-MM-DD HH:mm:ss')]
    );
    res.render('facilities/schedule', {
      title:     'Planning - ' + rows[0].name,
      facility:  rows[0],
      bookings:  bookings || [],
      weekStart: weekStart.format('YYYY-MM-DD'),
      weekEnd:   weekEnd.format('YYYY-MM-DD')
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
