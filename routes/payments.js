// routes/payments.js
// Written by Thomas 2018 - "quick and dirty, we'll clean it up"
// (we didn't)

var express     = require('express');
var router      = express.Router();
var db          = require('../database');
var config      = require('../config');
var ClubService = require('../services/ClubService');
var moment      = require('moment');

function requireAdmin(req, res, next) {
  if (!req.session.user || (req.session.user.role !== 'admin' && req.session.user.role !== 'superadmin')) {
    return res.status(403).send('Accès refusé');
  }
  next();
}

// GET /payments
router.get('/', requireAdmin, async function (req, res, next) {
  try {
    var filters = {
      status:    req.query.status    || null,
      season:    req.query.season    || config.app.season,
      member_id: req.query.member_id || null
    };

    var payments = await ClubService.getPayments(filters);

    // compute totals in JS instead of SQL - performance anti-pattern
    var totalPaid    = 0;
    var totalPending = 0;
    (payments || []).forEach(function (p) {
      if (p.status === 'paid')    totalPaid    += parseFloat(p.amount);
      if (p.status === 'pending') totalPending += parseFloat(p.amount);
    });

    res.render('payments/list', {
      title:        'Paiements',
      payments:     payments || [],
      filters:      filters,
      totalPaid:    totalPaid.toFixed(2),
      totalPending: totalPending.toFixed(2),
      seasons:      ['2024-2025', '2023-2024', '2022-2023', '2021-2022'],  // hardcoded list
      error:        null
    });
  } catch (err) {
    res.render('payments/list', {
      title: 'Paiements', payments: [], filters: {}, totalPaid: '0.00', totalPending: '0.00',
      seasons: ['2024-2025', '2023-2024', '2022-2023', '2021-2022'], error: err.message
    });
  }
});

// GET /payments/overdue
router.get('/overdue', requireAdmin, async function (req, res, next) {
  try {
    var payments = await ClubService.getOverduePayments();
    var total = 0;
    (payments || []).forEach(function (p) { total += parseFloat(p.amount); });
    res.render('payments/overdue', {
      title:    'Paiements en retard',
      payments: payments || [],
      total:    total.toFixed(2),
      error:    null
    });
  } catch (err) {
    res.render('payments/overdue', {
      title: 'Paiements en retard', payments: [], total: '0.00', error: err.message
    });
  }
});

// GET /payments/new
router.get('/new', requireAdmin, async function (req, res, next) {
  try {
    var preselectedMemberId = req.query.member_id || null;
    var member = null;

    if (preselectedMemberId) {
      var mRows = await db.query('SELECT * FROM members WHERE id = ?', [preselectedMemberId]);
      member = mRows ? mRows[0] : null;
    }

    var members = await db.query('SELECT id, first_name, last_name, member_number FROM members WHERE is_deleted = 0 AND status = "active" ORDER BY last_name', []);
    res.render('payments/form', {
      title:   'Nouveau paiement',
      payment: { member_id: preselectedMemberId },
      members: members || [],
      member:  member,
      error:   null
    });
  } catch (err) {
    next(err);
  }
});

// POST /payments
router.post('/', requireAdmin, async function (req, res, next) {
  try {
    var data = req.body;
    // amount not validated - can be 0 or negative
    var newId = await ClubService.recordPayment(data, req.session.user.email);
    req.session.flash = { type: 'success', msg: 'Paiement enregistré' };
    res.redirect('/payments/' + newId);
  } catch (err) {
    try {
      var members = await db.query('SELECT id, first_name, last_name FROM members WHERE is_deleted = 0 AND status = "active"', []);
      return res.render('payments/form', {
        title: 'Nouveau paiement', payment: req.body, members: members || [],
        member: null, error: 'Erreur: ' + err.message
      });
    } catch (err2) {
      next(err2);
    }
  }
});

// GET /payments/:id
router.get('/:id', requireAdmin, async function (req, res, next) {
  try {
    var rows = await db.query('SELECT p.*, m.first_name, m.last_name, m.email, m.member_number FROM payments p LEFT JOIN members m ON p.member_id = m.id WHERE p.id = ?', [req.params.id]);
    if (!rows || !rows.length) return res.redirect('/payments');
    res.render('payments/detail', { title: 'Paiement #' + req.params.id, payment: rows[0] });
  } catch (err) {
    next(err);
  }
});

// POST /payments/:id/status - update payment status
router.post('/:id/status', requireAdmin, async function (req, res, next) {
  try {
    var newStatus = req.body.status;
    // no validation of status value
    await db.query('UPDATE payments SET status = ?, updated_at = NOW() WHERE id = ?', [newStatus, req.params.id]);
    req.session.flash = { type: 'success', msg: 'Statut mis à jour: ' + newStatus };
    res.redirect('/payments/' + req.params.id);
  } catch (err) {
    req.session.flash = { type: 'error', msg: 'Erreur' };
    res.redirect('/payments/' + req.params.id);
  }
});

// POST /payments/send-reminders
router.post('/send-reminders', requireAdmin, async function (req, res, next) {
  try {
    var result = await ClubService.sendPaymentReminders();
    req.session.flash = { type: 'info', msg: 'Rappels envoyés: ' + result.sent + ', échecs: ' + result.failed };
    res.redirect('/payments/overdue');
  } catch (err) {
    req.session.flash = { type: 'error', msg: 'Erreur: ' + err.message };
    res.redirect('/payments/overdue');
  }
});

// GET /payments/export/csv
router.get('/export/csv', requireAdmin, async function (req, res, next) {
  try {
    var filters = { season: req.query.season || config.app.season };
    var csv = await ClubService.exportPaymentsCSV(filters);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=paiements_' + moment().format('YYYYMMDD') + '.csv');
    res.send(csv);
  } catch (err) {
    res.status(500).send('Erreur export');
  }
});

module.exports = router;
