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
router.get('/', function (req, res) {
  ClubService.getFacilities(function (err, facilities) {
    // N+1: get next booking for each facility
    var done = 0;
    if (!facilities || facilities.length === 0) {
      return res.render('facilities/list', { title: 'Installations', facilities: [], error: null });
    }
    facilities.forEach(function (f, i) {
      db.query(
        'SELECT b.*, e.title FROM bookings b LEFT JOIN events e ON b.event_id = e.id WHERE b.facility_id = ? AND b.start_time >= NOW() AND b.status != "cancelled" ORDER BY b.start_time LIMIT 1',
        [f.id],
        function (e, rows) {
          facilities[i].next_booking = rows ? rows[0] : null;
          done++;
          if (done === facilities.length) {
            res.render('facilities/list', { title: 'Installations', facilities: facilities, error: null });
          }
        }
      );
    });
  });
});

// GET /facilities/new
router.get('/new', requireAdmin, function (req, res) {
  res.render('facilities/form', { title: 'Nouvelle installation', facility: {}, error: null, isNew: true });
});

// POST /facilities
router.post('/', requireAdmin, function (req, res) {
  var d = req.body;
  db.query(
    'INSERT INTO facilities (name, type, capacity, address, is_available, notes, hourly_rate, contact_person, contact_phone) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)',
    [d.name, d.type, d.capacity || 0, d.address || null, d.notes || null, d.hourly_rate || 0, d.contact_person || null, d.contact_phone || null],
    function (err, result) {
      if (err) {
        return res.render('facilities/form', { title: 'Nouvelle installation', facility: d, error: err.message, isNew: true });
      }
      req.session.flash = { type: 'success', msg: 'Installation créée' };
      res.redirect('/facilities/' + result.insertId);
    }
  );
});

// GET /facilities/:id
router.get('/:id', function (req, res) {
  db.query('SELECT * FROM facilities WHERE id = ?', [req.params.id], function (err, rows) {
    if (err || !rows.length) return res.redirect('/facilities');
    var fac = rows[0];
    // get upcoming bookings
    db.query(
      'SELECT b.*, e.title as event_title, t.name as team_name FROM bookings b LEFT JOIN events e ON b.event_id=e.id LEFT JOIN teams t ON b.team_id=t.id WHERE b.facility_id=? AND b.start_time >= NOW() ORDER BY b.start_time LIMIT 20',
      [fac.id],
      function (e, bookings) {
        fac.bookings = bookings || [];
        res.render('facilities/detail', { title: fac.name, facility: fac });
      }
    );
  });
});

// GET /facilities/:id/schedule - weekly schedule
router.get('/:id/schedule', function (req, res) {
  var facilityId = req.params.id;
  var weekStart  = req.query.week ? moment(req.query.week) : moment().startOf('isoWeek');
  var weekEnd    = weekStart.clone().endOf('isoWeek');

  db.query('SELECT * FROM facilities WHERE id = ?', [facilityId], function (err, rows) {
    if (!rows || !rows.length) return res.redirect('/facilities');
    db.query(
      'SELECT b.*, e.title FROM bookings b LEFT JOIN events e ON b.event_id=e.id WHERE b.facility_id=? AND b.start_time BETWEEN ? AND ? AND b.status!="cancelled" ORDER BY b.start_time',
      [facilityId, weekStart.format('YYYY-MM-DD HH:mm:ss'), weekEnd.format('YYYY-MM-DD HH:mm:ss')],
      function (e, bookings) {
        res.render('facilities/schedule', {
          title:     'Planning - ' + rows[0].name,
          facility:  rows[0],
          bookings:  bookings || [],
          weekStart: weekStart.format('YYYY-MM-DD'),
          weekEnd:   weekEnd.format('YYYY-MM-DD')
        });
      }
    );
  });
});

module.exports = router;
