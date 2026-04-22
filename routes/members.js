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
router.get('/', async function (req, res, next) {
  try {
    var filters = {
      status:  req.query.status  || 'active',
      sport:   req.query.sport   || null,
      team_id: req.query.team_id || null,
      role:    req.query.role    || null
    };

    var members = await ClubService.getAllMembers(filters);

    // N+1: fetch teams for filter dropdown - should be a single join above
    var teams = await db.query('SELECT id, name, sport FROM teams WHERE status = "active" ORDER BY name', []);

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
  } catch (err) {
    console.log('GET /members error:', err);
    res.render('members/list', { title: 'Membres', members: [], error: 'Erreur chargement', filters: {}, teams: [] });
  }
});

// GET /members/new
router.get('/new', requireAdmin, async function (req, res, next) {
  try {
    var teams = await db.query('SELECT id, name, sport FROM teams WHERE status = "active" ORDER BY name', []);
    res.render('members/form', {
      title:   'Nouveau membre',
      member:  {},
      teams:   teams || [],
      error:   null,
      isNew:   true
    });
  } catch (err) {
    next(err);
  }
});

// POST /members - create member
router.post('/', requireAdmin, async function (req, res, next) {
  try {
    var data = req.body;

    // no server-side validation - html required attribute is the only "validation"
    // XSS: data goes straight to DB and back to EJS template

    var newId = await ClubService.createMember(data, req.session.user.email);
    req.session.flash = { type: 'success', msg: 'Membre créé avec succès' };
    res.redirect('/members/' + newId);
  } catch (err) {
    console.log('POST /members error:', err);
    try {
      var teams = await db.query('SELECT id, name FROM teams WHERE status = "active"', []);
      return res.render('members/form', {
        title:  'Nouveau membre',
        member: req.body,
        teams:  teams || [],
        error:  'Erreur lors de la création: ' + err.message,
        isNew:  true
      });
    } catch (err2) {
      next(err2);
    }
  }
});

// GET /members/:id
router.get('/:id', async function (req, res, next) {
  try {
    var id = req.params.id;
    // no validation that id is numeric
    var member = await ClubService.getMemberById(id);
    if (!member) {
      return res.status(404).send('<h1>Membre introuvable</h1><a href="/members">Retour</a>');
    }
    res.render('members/detail', {
      title:  member.first_name + ' ' + member.last_name,
      member: member
    });
  } catch (err) {
    next(err);
  }
});

// GET /members/:id/edit
router.get('/:id/edit', requireAdmin, async function (req, res, next) {
  try {
    var id = req.params.id;
    var rows = await db.query('SELECT * FROM members WHERE id = ? AND is_deleted = 0', [id]);
    if (!rows || !rows.length) return res.redirect('/members');
    var teams = await db.query('SELECT id, name, sport FROM teams WHERE status = "active" ORDER BY name', []);
    res.render('members/form', {
      title:  'Modifier membre',
      member: rows[0],
      teams:  teams || [],
      error:  null,
      isNew:  false
    });
  } catch (err) {
    next(err);
  }
});

// POST /members/:id/update
router.post('/:id/update', requireAdmin, async function (req, res, next) {
  try {
    var id   = req.params.id;
    var data = req.body;

    await ClubService.updateMember(id, data, req.session.user.email);
    req.session.flash = { type: 'success', msg: 'Membre mis à jour' };
    res.redirect('/members/' + id);
  } catch (err) {
    req.session.flash = { type: 'error', msg: 'Erreur: ' + err.message };
    res.redirect('/members/' + req.params.id);
  }
});

// POST /members/:id/delete
router.post('/:id/delete', requireAdmin, async function (req, res, next) {
  try {
    var id = req.params.id;
    await ClubService.deleteMember(id, req.session.user.email);
    req.session.flash = { type: 'success', msg: 'Membre archivé' };
    res.redirect('/members');
  } catch (err) {
    req.session.flash = { type: 'error', msg: 'Erreur suppression' };
    res.redirect('/members/' + req.params.id);
  }
});

// POST /members/:id/renew - renew membership
router.post('/:id/renew', requireAdmin, async function (req, res, next) {
  try {
    var id = req.params.id;
    var subscriptionType = req.body.subscription_type || 'annual_adult';
    var amount = config.subscriptions[subscriptionType] || 280;
    var newRenewalDate = moment().add(1, 'year').format('YYYY-MM-DD');

    // update member directly in route - business logic not in service
    await db.query(
      'UPDATE members SET renewal_date = ?, subscription_type = ?, subscription_amount = ?, status = "active", updated_at = NOW() WHERE id = ?',
      [newRenewalDate, subscriptionType, amount, id]
    );

    // record payment
    var rows = await db.query('SELECT first_name, last_name, email FROM members WHERE id = ?', [id]);
    if (rows && rows[0]) {
      ClubService.recordPayment({
        member_id:      id,
        amount:         amount,
        payment_type:   'subscription',
        payment_method: req.body.payment_method || 'cash',
        description:    'Renouvellement adhésion ' + subscriptionType,
        payment_date:   moment().format('YYYY-MM-DD'),
        status:         'paid'
      }, req.session.user.email).catch(function () {});
    }
    req.session.flash = { type: 'success', msg: 'Adhésion renouvelée jusqu\'au ' + newRenewalDate };
    res.redirect('/members/' + id);
  } catch (err) {
    req.session.flash = { type: 'error', msg: 'Erreur renouvellement' };
    res.redirect('/members/' + req.params.id);
  }
});

// GET /members/:id/certificate - generate membership certificate (text only)
router.get('/:id/certificate', async function (req, res, next) {
  try {
    var id = req.params.id;
    // only member or admin can view their certificate
    if (req.session.user.role !== 'admin' && req.session.user.role !== 'superadmin' && req.session.user.id != id) {
      return res.status(403).send('Accès refusé');
    }
    var rows = await db.query('SELECT * FROM members WHERE id = ? AND is_deleted = 0', [id]);
    if (!rows || !rows.length) return res.status(404).send('Membre introuvable');
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
  } catch (err) {
    next(err);
  }
});

// GET /members/export/csv
router.get('/export/csv', requireAdmin, async function (req, res, next) {
  try {
    var filters = {
      status:  req.query.status || null,
      sport:   req.query.sport  || null,
      team_id: req.query.team_id || null
    };
    var csv = await ClubService.exportMembersCSV(filters);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=membres_' + moment().format('YYYYMMDD') + '.csv');
    res.send(csv);
  } catch (err) {
    res.status(500).send('Erreur export: ' + err.message);
  }
});

// POST /members/send-reminders - send renewal reminders to expired members
router.post('/send-reminders', requireAdmin, async function (req, res, next) {
  try {
    // directly queries + emails without going through ClubService properly
    var thirtyDays = moment().add(30, 'days').format('YYYY-MM-DD');
    var members = await db.query(
      'SELECT * FROM members WHERE renewal_date <= ? AND is_deleted = 0 AND status = "active"',
      [thirtyDays]
    );
    var count = 0;
    await Promise.all(members.map(async function (m) {
      // inline email logic - should call ClubService.sendEmail
      var html = '<p>Bonjour ' + m.first_name + ', votre adhésion expire le ' + m.renewal_date + '.</p>';
      try {
        await ClubService.sendEmail(m.email, 'Renouvellement adhésion', html);
        count++;
      } catch (e) {
        // continue on failure
      }
    }));
    req.session.flash = { type: 'info', msg: 'Rappels envoyés à ' + members.length + ' membres' };
    res.redirect('/members');
  } catch (err) {
    req.session.flash = { type: 'error', msg: 'Erreur: ' + err.message };
    res.redirect('/members');
  }
});

module.exports = router;
