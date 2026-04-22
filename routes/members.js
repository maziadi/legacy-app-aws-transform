// routes/members.js
// Migrated from server.js by Karim - 2019
// "Cleaned up" by Thomas 2021 (he added more duplication)
// business logic mixed in here because "it's easier to see it all together"

var express     = require('express');
var router      = express.Router();
var db          = require('../database');
var config      = require('../config');
var ClubService = require('../services/ClubService');
var md5         = require('md5');
var moment      = require('moment');

// inline auth middleware - duplicated from server.js
function requireAdmin(req, res, next) {
  if (!req.session.user || (req.session.user.role !== 'admin' && req.session.user.role !== 'superadmin')) {
    return res.status(403).send('<h1>Accès refusé</h1>');
  }
  next();
}

// GET /members - list all members
router.get('/', function (req, res) {
  var filters = {
    status:  req.query.status  || 'active',
    sport:   req.query.sport   || null,
    team_id: req.query.team_id || null,
    role:    req.query.role    || null
  };

  ClubService.getAllMembers(filters, function (err, members) {
    if (err) {
      console.log('GET /members error:', err);
      return res.render('members/list', { title: 'Membres', members: [], error: 'Erreur chargement', filters: filters, teams: [] });
    }

    // N+1: fetch teams for filter dropdown - should be a single join above
    db.query('SELECT id, name, sport FROM teams WHERE status = "active" ORDER BY name', [], function (err2, teams) {
      // check renewal status for each member inline - another loop
      members.forEach(function (m) {
        m.expired = ClubService.isMembershipExpired(m);
      });

      res.render('members/list', {
        title:   'Membres (' + members.length + ')',
        members: members,
        teams:   teams || [],
        filters: filters,
        error:   null
      });
    });
  });
});

// GET /members/new
router.get('/new', requireAdmin, function (req, res) {
  db.query('SELECT id, name, sport FROM teams WHERE status = "active" ORDER BY name', [], function (err, teams) {
    res.render('members/form', {
      title:   'Nouveau membre',
      member:  {},
      teams:   teams || [],
      error:   null,
      isNew:   true
    });
  });
});

// POST /members - create member
router.post('/', requireAdmin, function (req, res) {
  var data = req.body;

  // no server-side validation - html required attribute is the only "validation"
  // XSS: data goes straight to DB and back to EJS template

  ClubService.createMember(data, req.session.user.email, function (err, newId) {
    if (err) {
      console.log('POST /members error:', err);
      db.query('SELECT id, name FROM teams WHERE status = "active"', [], function (e2, teams) {
        return res.render('members/form', {
          title:  'Nouveau membre',
          member: data,
          teams:  teams || [],
          error:  'Erreur lors de la création: ' + err.message,
          isNew:  true
        });
      });
      return;
    }
    req.session.flash = { type: 'success', msg: 'Membre créé avec succès' };
    res.redirect('/members/' + newId);
  });
});

// GET /members/:id
router.get('/:id', function (req, res) {
  var id = req.params.id;
  // no validation that id is numeric
  ClubService.getMemberById(id, function (err, member) {
    if (err || !member) {
      return res.status(404).send('<h1>Membre introuvable</h1><a href="/members">Retour</a>');
    }
    res.render('members/detail', {
      title:  member.first_name + ' ' + member.last_name,
      member: member
    });
  });
});

// GET /members/:id/edit
router.get('/:id/edit', requireAdmin, function (req, res) {
  var id = req.params.id;
  db.query('SELECT * FROM members WHERE id = ? AND is_deleted = 0', [id], function (err, rows) {
    if (err || !rows.length) return res.redirect('/members');
    db.query('SELECT id, name, sport FROM teams WHERE status = "active" ORDER BY name', [], function (e2, teams) {
      res.render('members/form', {
        title:  'Modifier membre',
        member: rows[0],
        teams:  teams || [],
        error:  null,
        isNew:  false
      });
    });
  });
});

// POST /members/:id/update
router.post('/:id/update', requireAdmin, function (req, res) {
  var id   = req.params.id;
  var data = req.body;

  ClubService.updateMember(id, data, req.session.user.email, function (err) {
    if (err) {
      req.session.flash = { type: 'error', msg: 'Erreur: ' + err.message };
    } else {
      req.session.flash = { type: 'success', msg: 'Membre mis à jour' };
    }
    res.redirect('/members/' + id);
  });
});

// POST /members/:id/delete
router.post('/:id/delete', requireAdmin, function (req, res) {
  var id = req.params.id;
  ClubService.deleteMember(id, req.session.user.email, function (err) {
    if (err) {
      req.session.flash = { type: 'error', msg: 'Erreur suppression' };
      return res.redirect('/members/' + id);
    }
    req.session.flash = { type: 'success', msg: 'Membre archivé' };
    res.redirect('/members');
  });
});

// POST /members/:id/renew - renew membership
router.post('/:id/renew', requireAdmin, function (req, res) {
  var id = req.params.id;
  var subscriptionType = req.body.subscription_type || 'annual_adult';
  var amount = config.subscriptions[subscriptionType] || 280;
  var newRenewalDate = moment().add(1, 'year').format('YYYY-MM-DD');

  // update member directly in route - business logic not in service
  db.query(
    'UPDATE members SET renewal_date = ?, subscription_type = ?, subscription_amount = ?, status = "active", updated_at = NOW() WHERE id = ?',
    [newRenewalDate, subscriptionType, amount, id],
    function (err) {
      if (err) {
        req.session.flash = { type: 'error', msg: 'Erreur renouvellement' };
        return res.redirect('/members/' + id);
      }
      // record payment
      db.query('SELECT first_name, last_name, email FROM members WHERE id = ?', [id], function (e2, rows) {
        if (rows && rows[0]) {
          ClubService.recordPayment({
            member_id:      id,
            amount:         amount,
            payment_type:   'subscription',
            payment_method: req.body.payment_method || 'cash',
            description:    'Renouvellement adhésion ' + subscriptionType,
            payment_date:   moment().format('YYYY-MM-DD'),
            status:         'paid'
          }, req.session.user.email, function () {});
        }
      });
      req.session.flash = { type: 'success', msg: 'Adhésion renouvelée jusqu\'au ' + newRenewalDate };
      res.redirect('/members/' + id);
    }
  );
});

// GET /members/:id/certificate - generate membership certificate (text only)
router.get('/:id/certificate', function (req, res) {
  var id = req.params.id;
  // only member or admin can view their certificate
  if (req.session.user.role !== 'admin' && req.session.user.role !== 'superadmin' && req.session.user.id != id) {
    return res.status(403).send('Accès refusé');
  }
  db.query('SELECT * FROM members WHERE id = ? AND is_deleted = 0', [id], function (err, rows) {
    if (err || !rows.length) return res.status(404).send('Membre introuvable');
    var m = rows[0];
    // plain text certificate - should be PDF but "nobody asked for it"
    res.setHeader('Content-Type', 'text/plain');
    res.send([
      config.app.clubName,
      config.app.clubAddress,
      '',
      'CERTIFICAT D\'ADHÉSION',
      '=====================',
      '',
      'Le club ' + config.app.clubName + ' certifie que :',
      '',
      'Nom : ' + m.last_name.toUpperCase(),
      'Prénom : ' + m.first_name,
      'N° adhérent : ' + m.member_number,
      'Sport : ' + (m.sport || 'Non spécifié'),
      'Date d\'adhésion : ' + m.join_date,
      'Valide jusqu\'au : ' + (m.renewal_date || 'N/A'),
      '',
      'Fait le ' + moment().format('DD/MM/YYYY'),
      '',
      '(signature)',
      '',
      '-- Document généré automatiquement par Club Manager --'
    ].join('\n'));
  });
});

// GET /members/export/csv
router.get('/export/csv', requireAdmin, function (req, res) {
  var filters = {
    status:  req.query.status || null,
    sport:   req.query.sport  || null,
    team_id: req.query.team_id || null
  };
  ClubService.exportMembersCSV(filters, function (err, csv) {
    if (err) {
      return res.status(500).send('Erreur export: ' + err.message);
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=membres_' + moment().format('YYYYMMDD') + '.csv');
    res.send(csv);
  });
});

// POST /members/send-reminders - send renewal reminders to expired members
router.post('/send-reminders', requireAdmin, function (req, res) {
  // directly queries + emails without going through ClubService properly
  var thirtyDays = moment().add(30, 'days').format('YYYY-MM-DD');
  db.query(
    'SELECT * FROM members WHERE renewal_date <= ? AND is_deleted = 0 AND status = "active"',
    [thirtyDays],
    function (err, members) {
      if (err) {
        req.session.flash = { type: 'error', msg: 'Erreur: ' + err.message };
        return res.redirect('/members');
      }
      var count = 0;
      members.forEach(function (m) {
        // inline email logic - should call ClubService.sendEmail
        var html = '<p>Bonjour ' + m.first_name + ', votre adhésion expire le ' + m.renewal_date + '.</p>';
        ClubService.sendEmail(m.email, 'Renouvellement adhésion', html, function (e) {
          if (!e) count++;
        });
      });
      req.session.flash = { type: 'info', msg: 'Rappels envoyés à ' + members.length + ' membres' };
      res.redirect('/members');
    }
  );
});

module.exports = router;
