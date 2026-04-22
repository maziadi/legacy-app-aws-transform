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
router.get('/', requireAdmin, function (req, res) {
  var filters = {
    status:    req.query.status    || null,
    season:    req.query.season    || config.app.season,
    member_id: req.query.member_id || null
  };

  ClubService.getPayments(filters, function (err, payments) {
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
      error:        err ? err.message : null
    });
  });
});

// GET /payments/overdue
router.get('/overdue', requireAdmin, function (req, res) {
  ClubService.getOverduePayments(function (err, payments) {
    var total = 0;
    (payments || []).forEach(function (p) { total += parseFloat(p.amount); });
    res.render('payments/overdue', {
      title:    'Paiements en retard',
      payments: payments || [],
      total:    total.toFixed(2),
      error:    err ? err.message : null
    });
  });
});

// GET /payments/new
router.get('/new', requireAdmin, function (req, res) {
  var preselectedMemberId = req.query.member_id || null;
  var member = null;

  function renderForm() {
    db.query('SELECT id, first_name, last_name, member_number FROM members WHERE is_deleted = 0 AND status = "active" ORDER BY last_name', [], function (e, members) {
      res.render('payments/form', {
        title:   'Nouveau paiement',
        payment: { member_id: preselectedMemberId },
        members: members || [],
        member:  member,
        error:   null
      });
    });
  }

  if (preselectedMemberId) {
    db.query('SELECT * FROM members WHERE id = ?', [preselectedMemberId], function (e, rows) {
      member = rows ? rows[0] : null;
      renderForm();
    });
  } else {
    renderForm();
  }
});

// POST /payments
router.post('/', requireAdmin, function (req, res) {
  var data = req.body;

  // amount not validated - can be 0 or negative
  ClubService.recordPayment(data, req.session.user.email, function (err, newId) {
    if (err) {
      db.query('SELECT id, first_name, last_name FROM members WHERE is_deleted = 0 AND status = "active"', [], function (e, members) {
        return res.render('payments/form', {
          title: 'Nouveau paiement', payment: data, members: members || [],
          member: null, error: 'Erreur: ' + err.message
        });
      });
      return;
    }
    req.session.flash = { type: 'success', msg: 'Paiement enregistré' };
    res.redirect('/payments/' + newId);
  });
});

// GET /payments/:id
router.get('/:id', requireAdmin, function (req, res) {
  db.query('SELECT p.*, m.first_name, m.last_name, m.email, m.member_number FROM payments p LEFT JOIN members m ON p.member_id = m.id WHERE p.id = ?', [req.params.id], function (err, rows) {
    if (err || !rows.length) return res.redirect('/payments');
    res.render('payments/detail', { title: 'Paiement #' + req.params.id, payment: rows[0] });
  });
});

// POST /payments/:id/status - update payment status
router.post('/:id/status', requireAdmin, function (req, res) {
  var newStatus = req.body.status;
  // no validation of status value
  db.query('UPDATE payments SET status = ?, updated_at = NOW() WHERE id = ?', [newStatus, req.params.id], function (err) {
    req.session.flash = err
      ? { type: 'error', msg: 'Erreur' }
      : { type: 'success', msg: 'Statut mis à jour: ' + newStatus };
    res.redirect('/payments/' + req.params.id);
  });
});

// POST /payments/send-reminders
router.post('/send-reminders', requireAdmin, function (req, res) {
  ClubService.sendPaymentReminders(function (err, result) {
    if (err) {
      req.session.flash = { type: 'error', msg: 'Erreur: ' + err.message };
    } else {
      req.session.flash = { type: 'info', msg: 'Rappels envoyés: ' + result.sent + ', échecs: ' + result.failed };
    }
    res.redirect('/payments/overdue');
  });
});

// GET /payments/export/csv
router.get('/export/csv', requireAdmin, function (req, res) {
  var filters = { season: req.query.season || config.app.season };
  ClubService.exportPaymentsCSV(filters, function (err, csv) {
    if (err) return res.status(500).send('Erreur export');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=paiements_' + moment().format('YYYYMMDD') + '.csv');
    res.send(csv);
  });
});

module.exports = router;
