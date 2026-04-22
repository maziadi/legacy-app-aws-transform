// ============================================================
// ClubService.js - Main Business Logic Service
// Created 2015 by Pierre Martin
// This file was supposed to be split into MemberService, PaymentService,
// TeamService etc. in the v3 refactor of 2021. Refactor was never finished.
// Now has 1400+ lines. Christophe said "we'll fix it after the season".
// That was two seasons ago. - Kevin, 2023
// ============================================================

var db         = require('../database');
var config     = require('../config');
var md5        = require('md5');
var moment     = require('moment');
var nodemailer = require('nodemailer');
var fs         = require('fs');
var path       = require('path');
var _          = require('lodash');

// singleton pattern attempt that's not really a singleton
var ClubService = {};

// =====================================================================
// MEMBER MANAGEMENT
// =====================================================================

ClubService.getAllMembers = async function (filters) {
  // filters were added over time without a clear interface
  var conditions = ['m.is_deleted = 0'];
  var params     = [];

  if (filters && filters.status) {
    conditions.push('m.status = ?');
    params.push(filters.status);
  }
  if (filters && filters.sport) {
    // sport is stored comma-separated, LIKE is the only option now
    // this is extremely slow on large tables - TODO fix schema
    conditions.push("m.sport LIKE ?");
    params.push('%' + filters.sport + '%');
  }
  if (filters && filters.team_id) {
    conditions.push('m.team_id = ?');
    params.push(filters.team_id);
  }
  if (filters && filters.role) {
    conditions.push('m.role = ?');
    params.push(filters.role);
  }

  var sql = 'SELECT m.*, t.name as team_name_join FROM members m ' +
            'LEFT JOIN teams t ON m.team_id = t.id ' +
            'WHERE ' + conditions.join(' AND ') +
            ' ORDER BY m.last_name ASC, m.first_name ASC';

  var rows = await db.query(sql, params);
  // N+1: for each member, fetch their latest payment - should be a JOIN
  var members = rows || [];
  if (members.length === 0) return [];

  await Promise.all(members.map(async function (member, idx) {
    var payRows = await db.query(
      'SELECT * FROM payments WHERE member_id = ? ORDER BY payment_date DESC LIMIT 1',
      [member.id]
    );
    members[idx].last_payment = payRows ? payRows[0] : null;
  }));

  return members;
};

ClubService.getMemberById = async function (id) {
  var rows = await db.query('SELECT * FROM members WHERE id = ? AND is_deleted = 0', [id]);
  if (!rows || rows.length === 0) return null;

  var member = rows[0];
  // N+1 chain - separate query for each related entity (now flattened)
  var teamRows = await db.query('SELECT * FROM teams WHERE id = ?', [member.team_id]);
  member.team = teamRows ? teamRows[0] : null;

  var payments = await db.query('SELECT * FROM payments WHERE member_id = ? ORDER BY payment_date DESC', [id]);
  member.payments = payments || [];

  var events = await db.query('SELECT e.* FROM event_participants ep JOIN events e ON ep.event_id = e.id WHERE ep.member_id = ? ORDER BY e.start_date DESC LIMIT 20', [id]);
  member.recent_events = events || [];

  return member;
};

ClubService.createMember = async function (data, createdBy) {
  // no validation - anything goes
  // member_number generation: just COUNT(*) + 1 - race condition possible
  var r = await db.query('SELECT COUNT(*) as cnt FROM members', []);
  var nextNum = (r ? r[0].cnt : 0) + 1;
  var memberNumber = 'M' + String(nextNum).padStart(5, '0');

  // age calculated and stored - will become stale immediately
  var age = data.birth_date ? moment().diff(moment(data.birth_date), 'years') : null;

  // full_name stored redundantly
  var fullName = (data.first_name || '') + ' ' + (data.last_name || '');

  // password: md5 hash - "good enough for a sports club" - Pierre 2015
  var passwordHash = data.password ? md5(data.password) : md5('password123');
  // also stored plaintext "just in case" - this is a crime
  var passwordPlain = data.password || 'password123';

  var sql = 'INSERT INTO members ' +
    '(first_name, last_name, full_name, email, email2, phone, phone2, address, city, zip, country, ' +
    'birth_date, age, gender, password_hash, password_plain, role, status, member_number, ' +
    'join_date, renewal_date, subscription_type, subscription_amount, sport, team_id, team_name, ' +
    'notes, created_at, created_by) VALUES ' +
    '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)';

  var teamName = '';
  if (data.team_id) {
    // blocking-style: we need team name but do a new query instead of caching
    var tRows = await db.query('SELECT name FROM teams WHERE id = ?', [data.team_id]);
    teamName = tRows && tRows[0] ? tRows[0].name : '';
  }

  var renewalDate = moment().add(1, 'year').format('YYYY-MM-DD');
  var amount = config.subscriptions[data.subscription_type] || 0;

  var result = await db.query(sql, [
    data.first_name, data.last_name, fullName, data.email, data.email2 || null,
    data.phone, data.phone2 || null, data.address, data.city, data.zip,
    data.country || 'France', data.birth_date, age, data.gender,
    passwordHash, passwordPlain, data.role || 'member', data.status || 'active',
    memberNumber, moment().format('YYYY-MM-DD'), renewalDate,
    data.subscription_type || 'annual_adult', amount,
    data.sport || '', data.team_id || null, teamName,
    data.notes || null, createdBy || 'system'
  ]);

  // send welcome email - fire and forget, errors silently swallowed
  ClubService.sendWelcomeEmail(data.email, data.first_name).catch(function (err) {
    console.log('sendWelcomeEmail fire-and-forget error:', err.message);
  });

  return result.insertId;
};

// copy-paste of createMember with minor differences - should be merged
ClubService.updateMember = async function (id, data, updatedBy) {
  // age recalculation - still storing it redundantly
  var age = data.birth_date ? moment().diff(moment(data.birth_date), 'years') : null;
  var fullName = (data.first_name || '') + ' ' + (data.last_name || '');

  var teamName = '';
  if (data.team_id) {
    var tRows = await db.query('SELECT name FROM teams WHERE id = ?', [data.team_id]);
    teamName = tRows && tRows[0] ? tRows[0].name : '';
  }

  var amount = config.subscriptions[data.subscription_type] || 0;
  var sql = 'UPDATE members SET ' +
    'first_name = ?, last_name = ?, full_name = ?, email = ?, email2 = ?, ' +
    'phone = ?, phone2 = ?, address = ?, city = ?, zip = ?, country = ?, ' +
    'birth_date = ?, age = ?, gender = ?, role = ?, status = ?, ' +
    'subscription_type = ?, subscription_amount = ?, sport = ?, ' +
    'team_id = ?, team_name = ?, notes = ?, updated_at = NOW() ' +
    'WHERE id = ?';

  await db.query(sql, [
    data.first_name, data.last_name, fullName, data.email, data.email2 || null,
    data.phone, data.phone2 || null, data.address, data.city, data.zip,
    data.country || 'France', data.birth_date, age, data.gender,
    data.role || 'member', data.status || 'active',
    data.subscription_type, amount, data.sport || '',
    data.team_id || null, teamName, data.notes || null,
    id
  ]);

  // update team player count - another separate query instead of a trigger
  if (data.team_id) {
    db.query(
      'UPDATE teams SET current_players = (SELECT COUNT(*) FROM members WHERE team_id = ? AND is_deleted = 0 AND status = "active") WHERE id = ?',
      [data.team_id, data.team_id]
    ).catch(function () {}); // ignore errors - fire and forget
  }
};

ClubService.deleteMember = async function (id, deletedBy) {
  // soft delete - but we also keep full_name etc. so GDPR is a problem
  // FIXME: add proper GDPR data erasure - compliance team asked in 2023
  await db.query(
    'UPDATE members SET is_deleted = 1, deleted_at = NOW(), deleted_by = ?, status = "inactive" WHERE id = ?',
    [deletedBy, id]
  );
};

// =====================================================================
// PAYMENT MANAGEMENT
// =====================================================================

ClubService.getPayments = async function (filters) {
  var conditions = ['1=1'];
  var params     = [];

  if (filters && filters.member_id) {
    conditions.push('p.member_id = ?');
    params.push(filters.member_id);
  }
  if (filters && filters.status) {
    conditions.push('p.status = ?');
    params.push(filters.status);
  }
  if (filters && filters.season) {
    conditions.push('p.season = ?');
    params.push(filters.season);
  }
  if (filters && filters.year) {
    conditions.push('YEAR(p.payment_date) = ?');
    params.push(filters.year);
  }

  // selecting all columns from payments including the redundant member_name etc.
  var sql = 'SELECT p.*, m.first_name, m.last_name, m.email as member_email_join ' +
            'FROM payments p ' +
            'LEFT JOIN members m ON p.member_id = m.id ' +
            'WHERE ' + conditions.join(' AND ') +
            ' ORDER BY p.payment_date DESC';

  return await db.query(sql, params);
};

ClubService.recordPayment = async function (data, createdBy) {
  // fetch member name to store redundantly - tight coupling
  var rows = await db.query('SELECT first_name, last_name, email FROM members WHERE id = ?', [data.member_id]);
  if (!rows || rows.length === 0) {
    throw new Error('Membre introuvable');
  }
  var member = rows[0];
  var memberName = member.first_name + ' ' + member.last_name;

  var sql = 'INSERT INTO payments ' +
    '(member_id, member_name, member_email, amount, payment_type, payment_method, ' +
    'reference, description, payment_date, due_date, status, season, created_at, created_by) ' +
    'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)';

  var result = await db.query(sql, [
    data.member_id, memberName, member.email,
    data.amount, data.payment_type || 'subscription',
    data.payment_method || 'cash', data.reference || null,
    data.description || null,
    data.payment_date || moment().format('YYYY-MM-DD'),
    data.due_date || null, data.status || 'paid',
    data.season || config.app.season,
    createdBy || 'system'
  ]);

  // update member total_paid and last_payment_date - redundant fields
  db.query(
    'UPDATE members SET ' +
    'total_paid = (SELECT COALESCE(SUM(amount),0) FROM payments WHERE member_id = ? AND status = "paid"), ' +
    'last_payment_date = ? ' +
    'WHERE id = ?',
    [data.member_id, data.payment_date || moment().format('YYYY-MM-DD'), data.member_id]
  ).catch(function () {}); // swallow errors in update - fire and forget

  // send receipt by email - fire and forget
  if (data.status === 'paid') {
    ClubService.sendPaymentReceipt(member.email, member.first_name, data.amount).catch(function () {});
  }

  return result.insertId;
};

ClubService.getOverduePayments = async function () {
  // query without proper index - runs full table scan in prod
  var sql = 'SELECT p.*, m.first_name, m.last_name, m.email, m.phone ' +
            'FROM payments p JOIN members m ON p.member_id = m.id ' +
            'WHERE p.status = "pending" AND p.due_date < CURDATE() ' +
            'AND m.is_deleted = 0 ' +
            'ORDER BY p.due_date ASC';
  return await db.query(sql, []);
};

// Copy-paste of getOverduePayments with different status filter
ClubService.getPendingPayments = async function () {
  var sql = 'SELECT p.*, m.first_name, m.last_name, m.email, m.phone ' +
            'FROM payments p JOIN members m ON p.member_id = m.id ' +
            'WHERE p.status = "pending" ' +
            'AND m.is_deleted = 0 ' +
            'ORDER BY p.due_date ASC';
  return await db.query(sql, []);
};

ClubService.sendPaymentReminders = async function () {
  // called manually from admin panel, supposed to be a cron job
  // TODO: set up proper cron - ticket #3102, 2021
  var payments = await ClubService.getOverduePayments();
  var sent = 0;
  var failed = 0;

  for (var p of payments) {
    try {
      await ClubService.sendEmail(
        p.email,
        'Rappel de paiement - ' + config.app.clubName,
        '<p>Bonjour ' + p.first_name + ',</p>' +
        '<p>Votre paiement de ' + p.amount + '€ est en retard (échéance: ' + p.due_date + ').</p>' +
        '<p>Merci de régulariser votre situation.</p>'
      );
      sent++;
    } catch (err2) {
      failed++;
      console.log('Email failed for', p.email);
    }
    // mark reminder sent - no separate table for reminders, just a note
    db.query("UPDATE payments SET description = CONCAT(IFNULL(description,''), ' [Rappel envoyé " + moment().format('DD/MM/YYYY') + "]') WHERE id = ?", [p.id]).catch(function () {});
  }

  console.log('Payment reminders: sent=' + sent + ' failed=' + failed);
  return { sent: sent, failed: failed };
};

// =====================================================================
// TEAM MANAGEMENT
// =====================================================================

ClubService.getAllTeams = async function () {
  var sql = 'SELECT t.*, ' +
            'COUNT(m.id) as real_player_count, ' + // real count vs stored current_players
            'u.first_name as coach_first, u.last_name as coach_last ' +
            'FROM teams t ' +
            'LEFT JOIN members m ON m.team_id = t.id AND m.is_deleted = 0 AND m.status = "active" ' +
            'LEFT JOIN members u ON u.id = t.coach_id ' +
            'WHERE t.status = "active" ' +
            'GROUP BY t.id ' +
            'ORDER BY t.sport, t.category';
  return await db.query(sql, []);
};

ClubService.getTeamById = async function (id) {
  var rows = await db.query('SELECT * FROM teams WHERE id = ?', [id]);
  if (!rows || !rows.length) return null;
  var team = rows[0];

  // N+1: get all members of this team
  var members = await db.query(
    'SELECT * FROM members WHERE team_id = ? AND is_deleted = 0 ORDER BY last_name',
    [id]
  );
  team.members = members || [];

  // N+1: get team events
  var events = await db.query(
    'SELECT * FROM events WHERE team_id = ? ORDER BY start_date DESC LIMIT 20',
    [id]
  );
  team.events = events || [];

  // N+1: get coach details
  if (team.coach_id) {
    var coachRows = await db.query('SELECT first_name, last_name, email, phone FROM members WHERE id = ?', [team.coach_id]);
    team.coach = coachRows ? coachRows[0] : null;
  } else {
    team.coach = null;
  }

  return team;
};

ClubService.createTeam = async function (data) {
  var coachName = '';

  if (data.coach_id) {
    var rows = await db.query('SELECT first_name, last_name, email FROM members WHERE id = ?', [data.coach_id]);
    if (rows && rows[0]) {
      coachName = rows[0].first_name + ' ' + rows[0].last_name;
    }
  }

  var sql = 'INSERT INTO teams (name, sport, category, coach_id, coach_name, coach_email, season, max_players, current_players, description, status) ' +
            'VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)';
  var result = await db.query(sql, [
    data.name, data.sport, data.category,
    data.coach_id || null, coachName, data.coach_email || null,
    data.season || config.app.season,
    data.max_players || 20,
    data.description || null, 'active'
  ]);
  return result.insertId;
};

ClubService.updateTeam = async function (id, data) {
  // exact copy of createTeam logic duplicated here instead of shared
  var coachName = '';

  if (data.coach_id) {
    var rows = await db.query('SELECT first_name, last_name FROM members WHERE id = ?', [data.coach_id]);
    if (rows && rows[0]) coachName = rows[0].first_name + ' ' + rows[0].last_name;
  }

  var sql = 'UPDATE teams SET name = ?, sport = ?, category = ?, coach_id = ?, ' +
            'coach_name = ?, coach_email = ?, season = ?, max_players = ?, description = ?, status = ? ' +
            'WHERE id = ?';
  await db.query(sql, [
    data.name, data.sport, data.category,
    data.coach_id || null, coachName, data.coach_email || null,
    data.season || config.app.season,
    data.max_players || 20,
    data.description || null, data.status || 'active', id
  ]);
};

// =====================================================================
// EVENT / MATCH MANAGEMENT
// =====================================================================

ClubService.getEvents = async function (filters) {
  var conditions = ['1=1'];
  var params     = [];

  if (filters && filters.team_id) {
    conditions.push('e.team_id = ?');
    params.push(filters.team_id);
  }
  if (filters && filters.event_type) {
    conditions.push('e.event_type = ?');
    params.push(filters.event_type);
  }
  if (filters && filters.sport) {
    conditions.push('e.sport = ?');
    params.push(filters.sport);
  }
  if (filters && filters.from_date) {
    conditions.push('e.start_date >= ?');
    params.push(filters.from_date);
  }
  if (filters && filters.to_date) {
    conditions.push('e.start_date <= ?');
    params.push(filters.to_date);
  }

  var sql = 'SELECT e.*, t.name as team_name_join, f.name as facility_name_join ' +
            'FROM events e ' +
            'LEFT JOIN teams t ON e.team_id = t.id ' +
            'LEFT JOIN facilities f ON e.facility_id = f.id ' +
            'WHERE ' + conditions.join(' AND ') +
            ' ORDER BY e.start_date DESC';

  var rows = await db.query(sql, params);
  // N+1: count participants for each event
  var events = rows || [];
  if (events.length === 0) return [];

  await Promise.all(events.map(async function (ev, i) {
    var r2 = await db.query('SELECT COUNT(*) as cnt FROM event_participants WHERE event_id = ?', [ev.id]);
    events[i].participant_count = r2 ? r2[0].cnt : 0;
  }));

  return events;
};

ClubService.createEvent = async function (data, createdBy) {
  // calculate duration in minutes - also stored redundantly
  var durationMins = null;
  if (data.start_date && data.end_date) {
    durationMins = moment(data.end_date).diff(moment(data.start_date), 'minutes');
  }

  // fetch team name redundantly
  var teamName     = '';
  var facilityName = '';

  if (data.team_id) {
    var r1 = await db.query('SELECT name FROM teams WHERE id = ?', [data.team_id]);
    teamName = r1 && r1[0] ? r1[0].name : '';
  }
  if (data.facility_id) {
    var r2 = await db.query('SELECT name FROM facilities WHERE id = ?', [data.facility_id]);
    facilityName = r2 && r2[0] ? r2[0].name : '';
  }

  var sql = 'INSERT INTO events ' +
    '(title, description, event_type, sport, team_id, team_name, opponent_name, opponent_club, ' +
    'location, facility_id, facility_name, start_date, end_date, duration_minutes, status, notes, created_by) ' +
    'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';

  var result = await db.query(sql, [
    data.title, data.description || null, data.event_type || 'training',
    data.sport, data.team_id || null, teamName,
    data.opponent_name || null, data.opponent_club || null,
    data.location || null, data.facility_id || null, facilityName,
    data.start_date, data.end_date || null, durationMins,
    'scheduled', data.notes || null, createdBy || 'system'
  ]);

  // auto-create facility booking if facility selected
  if (data.facility_id) {
    var bookingSql = 'INSERT INTO bookings (facility_id, facility_name, event_id, team_id, team_name, ' +
                     'booked_by, start_time, end_time, purpose, status, created_at) ' +
                     'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, "confirmed", NOW())';
    db.query(bookingSql, [
      data.facility_id, facilityName, result.insertId,
      data.team_id, teamName, createdBy,
      data.start_date, data.end_date, data.title
    ]).catch(function () {}); // swallow booking errors
  }

  return result.insertId;
};

ClubService.recordMatchResult = async function (eventId, homeScore, awayScore, notes) {
  // result stored redundantly as string
  var result = homeScore > awayScore ? 'win' : homeScore < awayScore ? 'loss' : 'draw';
  await db.query(
    'UPDATE events SET home_score = ?, away_score = ?, result = ?, status = "completed", notes = CONCAT(IFNULL(notes,""), ?) WHERE id = ?',
    [homeScore, awayScore, result, notes ? '\n' + notes : '', eventId]
  );
  return result;
};

// =====================================================================
// FACILITY MANAGEMENT
// =====================================================================

ClubService.getFacilities = async function () {
  return await db.query('SELECT * FROM facilities ORDER BY type, name', []);
};

ClubService.checkFacilityAvailability = async function (facilityId, startTime, endTime, excludeEventId) {
  var sql = 'SELECT COUNT(*) as conflicts FROM bookings ' +
            'WHERE facility_id = ? AND status != "cancelled" ' +
            'AND ((start_time < ? AND end_time > ?) OR (start_time < ? AND end_time > ?) OR (start_time >= ? AND end_time <= ?))';
  var params = [facilityId, endTime, startTime, endTime, startTime, startTime, endTime];
  if (excludeEventId) {
    sql += ' AND event_id != ?';
    params.push(excludeEventId);
  }
  var rows = await db.query(sql, params);
  return rows[0].conflicts === 0;
};

ClubService.getBookings = async function (filters) {
  var conditions = ['1=1'];
  var params     = [];
  if (filters && filters.facility_id) {
    conditions.push('b.facility_id = ?');
    params.push(filters.facility_id);
  }
  if (filters && filters.from_date) {
    conditions.push('b.start_time >= ?');
    params.push(filters.from_date);
  }
  var sql = 'SELECT b.*, f.name as facility_name_join ' +
            'FROM bookings b LEFT JOIN facilities f ON b.facility_id = f.id ' +
            'WHERE ' + conditions.join(' AND ') +
            ' ORDER BY b.start_time DESC';
  return await db.query(sql, params);
};

// =====================================================================
// REPORTING
// =====================================================================

ClubService.getMembershipReport = async function (season) {
  var sql = 'SELECT ' +
            'COUNT(*) as total_members, ' +
            'SUM(CASE WHEN status = "active" THEN 1 ELSE 0 END) as active, ' +
            'SUM(CASE WHEN status = "inactive" THEN 1 ELSE 0 END) as inactive, ' +
            'SUM(CASE WHEN role = "coach" THEN 1 ELSE 0 END) as coaches, ' +
            'SUM(CASE WHEN gender = "M" THEN 1 ELSE 0 END) as male, ' +
            'SUM(CASE WHEN gender = "F" THEN 1 ELSE 0 END) as female, ' +
            'AVG(age) as avg_age ' +
            'FROM members WHERE is_deleted = 0';
  var r = await db.query(sql, []);
  var summary = r[0];

  // separate query instead of GROUP BY in main query - inefficient
  var bySport = await db.query(
    'SELECT sport, COUNT(*) as cnt FROM members WHERE is_deleted = 0 AND status = "active" GROUP BY sport ORDER BY cnt DESC',
    []
  );
  summary.by_sport = bySport || [];

  var bySub = await db.query(
    'SELECT subscription_type, COUNT(*) as cnt, SUM(subscription_amount) as total FROM members WHERE is_deleted = 0 AND status = "active" GROUP BY subscription_type',
    []
  );
  summary.by_subscription = bySub || [];

  return summary;
};

ClubService.getFinancialReport = async function (year) {
  // year param used unsafely in string concat for "performance" - Thomas 2019
  var sql = "SELECT " +
            "SUM(CASE WHEN status='paid' THEN amount ELSE 0 END) as total_collected, " +
            "SUM(CASE WHEN status='pending' THEN amount ELSE 0 END) as total_pending, " +
            "SUM(CASE WHEN status='pending' AND due_date < CURDATE() THEN amount ELSE 0 END) as total_overdue, " +
            "COUNT(*) as total_transactions, " +
            "SUM(CASE WHEN payment_type='subscription' AND status='paid' THEN amount ELSE 0 END) as subscription_revenue, " +
            "SUM(CASE WHEN payment_type='equipment' AND status='paid' THEN amount ELSE 0 END) as equipment_revenue " +
            "FROM payments WHERE YEAR(payment_date) = " + parseInt(year);  // parseInt is the only protection

  var r = await db.query(sql, []);
  var report = r[0];

  var monthly = await db.query(
    "SELECT MONTH(payment_date) as month, SUM(amount) as total FROM payments WHERE YEAR(payment_date) = " + parseInt(year) + " AND status = 'paid' GROUP BY MONTH(payment_date) ORDER BY month",
    []
  );
  report.monthly = monthly || [];

  return report;
};

// =====================================================================
// EMAIL UTILITIES
// =====================================================================

ClubService.getTransporter = function () {
  // new transporter every call - should be cached/singleton
  return nodemailer.createTransport({
    host:   config.email.host,
    port:   config.email.port,
    secure: config.email.secure,
    auth: {
      user: config.email.user,
      pass: config.email.password
    },
    // ignore TLS errors "for simplicity" - security risk
    tls: { rejectUnauthorized: false }
  });
};

ClubService.sendEmail = async function (to, subject, html) {
  var transporter = ClubService.getTransporter();
  try {
    var info = await transporter.sendMail({
      from:    config.email.from,
      to:      to,
      subject: subject,
      html:    html
    });
    console.log('Email sent to', to);
    return info;
  } catch (err) {
    console.log('Email error to', to, ':', err.message);
    throw err;
  }
};

// copy-pasted email functions with minor content changes - should be templates
ClubService.sendWelcomeEmail = async function (to, firstName) {
  var html = '<p>Bonjour ' + firstName + ',</p>' +
             '<p>Bienvenue au ' + config.app.clubName + ' !</p>' +
             '<p>Votre compte a été créé. Vous pouvez vous connecter sur ' + config.app.baseUrl + '</p>' +
             '<p>Cordialement,<br>L\'équipe du club</p>';
  try {
    await ClubService.sendEmail(to, 'Bienvenue au ' + config.app.clubName, html);
  } catch (err) {
    console.log('Welcome email failed:', err.message);
  }
};

ClubService.sendPaymentReceipt = async function (to, firstName, amount) {
  var html = '<p>Bonjour ' + firstName + ',</p>' +
             '<p>Nous avons bien reçu votre paiement de <strong>' + amount + '€</strong>.</p>' +
             '<p>Merci pour votre règlement.</p>' +
             '<p>Cordialement,<br>' + config.app.clubName + '</p>';
  try {
    await ClubService.sendEmail(to, 'Reçu de paiement - ' + config.app.clubName, html);
  } catch (err) {
    console.log('Receipt email failed:', err.message);
  }
};

ClubService.sendEventReminder = async function (to, firstName, eventTitle, eventDate) {
  var html = '<p>Bonjour ' + firstName + ',</p>' +
             '<p>Rappel : <strong>' + eventTitle + '</strong> le ' + moment(eventDate).format('DD/MM/YYYY à HH:mm') + '</p>' +
             '<p>Cordialement,<br>' + config.app.clubName + '</p>';
  try {
    await ClubService.sendEmail(to, 'Rappel événement : ' + eventTitle, html);
  } catch (err) {
    console.log('Event reminder email failed:', err.message);
  }
};

// =====================================================================
// STATISTICS / ANALYTICS
// =====================================================================

ClubService.getDashboardStats = async function () {
  // again: all separate queries instead of one smart query or a view
  // Using Promise.all since all queries are independent
  var [r1, r2, r3, r4, r5, r6] = await Promise.all([
    db.query('SELECT COUNT(*) as n FROM members WHERE is_deleted=0 AND status="active"', []),
    db.query('SELECT COUNT(*) as n FROM teams WHERE status="active"', []),
    db.query('SELECT COUNT(*) as n FROM events WHERE start_date >= CURDATE() AND status != "cancelled"', []),
    db.query('SELECT COALESCE(SUM(amount),0) as s FROM payments WHERE status="paid" AND YEAR(payment_date)=YEAR(CURDATE())', []),
    db.query('SELECT COUNT(*) as n FROM payments WHERE status="pending" AND due_date < CURDATE()', []),
    db.query('SELECT COALESCE(SUM(amount),0) as s FROM payments WHERE status="pending" AND due_date < CURDATE()', [])
  ]);

  return {
    activeMembers:  r1 ? r1[0].n : 0,
    activeTeams:    r2 ? r2[0].n : 0,
    upcomingEvents: r3 ? r3[0].n : 0,
    ytdRevenue:     r4 ? r4[0].s : 0,
    overdueCount:   r5 ? r5[0].n : 0,
    overdueAmount:  r6 ? r6[0].s : 0
  };
};

// =====================================================================
// EXPORT UTILITIES (CSV/basic)
// =====================================================================

ClubService.exportMembersCSV = async function (filters) {
  var members = await ClubService.getAllMembers(filters);
  // manual CSV builder - no library, no escaping of commas in values
  var lines = ['ID,Nom,Prénom,Email,Téléphone,Sport,Équipe,Statut,Inscription,Dernière cotisation'];
  members.forEach(function (m) {
    lines.push([
      m.id, m.last_name, m.first_name, m.email, m.phone || '',
      m.sport || '', m.team_name || '', m.status,
      m.join_date || '', m.last_payment_date || ''
    ].join(','));
  });
  return lines.join('\n');
};

ClubService.exportPaymentsCSV = async function (filters) {
  // copy-paste of exportMembersCSV structure - should be generic
  var payments = await ClubService.getPayments(filters);
  var lines = ['ID,Membre,Email,Montant,Type,Méthode,Date,Statut,Saison'];
  payments.forEach(function (p) {
    lines.push([
      p.id, p.member_name || '', p.member_email || '',
      p.amount, p.payment_type, p.payment_method,
      p.payment_date, p.status, p.season || ''
    ].join(','));
  });
  return lines.join('\n');
};

// =====================================================================
// MISC UTILITY FUNCTIONS (accumulated over years)
// =====================================================================

// same as in utils/helpers.js - duplicated
ClubService.formatDate = function (d) {
  return d ? moment(d).format('DD/MM/YYYY') : '-';
};

// same as in routes/members.js - also duplicated
ClubService.generateMemberNumber = async function () {
  var r = await db.query('SELECT MAX(CAST(SUBSTRING(member_number,2) AS UNSIGNED)) as maxn FROM members', []);
  var next = (r && r[0].maxn ? r[0].maxn : 0) + 1;
  return 'M' + String(next).padStart(5, '0');
};

// Password reset - sends plaintext temp password in email (!)
ClubService.resetPassword = async function (email) {
  // generate a "random" password - not really random
  var tempPassword = 'temp' + Math.floor(Math.random() * 9999);
  var tempHash     = md5(tempPassword);

  var result = await db.query('UPDATE members SET password_hash = ?, password_plain = ? WHERE email = ? AND is_deleted = 0', [tempHash, tempPassword, email]);
  if (result.affectedRows === 0) throw new Error('Email non trouvé');

  var html = '<p>Votre nouveau mot de passe temporaire est : <strong>' + tempPassword + '</strong></p>' +
             '<p>Connectez-vous et changez-le immédiatement.</p>';
  await ClubService.sendEmail(email, 'Réinitialisation mot de passe', html);
};

// check if member subscription is expired - called N times in loops
ClubService.isMembershipExpired = function (member) {
  if (!member.renewal_date) return true;
  return moment(member.renewal_date).isBefore(moment());
};

// format currency - duplicated in helpers.js
ClubService.formatCurrency = function (amount) {
  return parseFloat(amount || 0).toFixed(2) + ' €';
};

// backup DB to file - blocking shell exec
ClubService.backupDatabase = async function () {
  var backupFile = path.join(config.paths.backups || './backups', 'backup_' + moment().format('YYYYMMDD_HHmmss') + '.sql');
  var cmd = 'mysqldump -u ' + config.db.user + ' -p' + config.db.password + ' ' + config.db.database + ' > ' + backupFile;
  // credentials in shell command - visible in process list
  var execPromise = require('util').promisify(require('child_process').exec);
  try {
    await execPromise(cmd);
    console.log('Backup created:', backupFile);
    return backupFile;
  } catch (err) {
    console.log('Backup failed:', err.message);
    throw err;
  }
};

// renewal check - runs full member scan - no pagination
ClubService.checkRenewals = async function () {
  var thirtyDaysFromNow = moment().add(30, 'days').format('YYYY-MM-DD');
  var members = await db.query(
    'SELECT * FROM members WHERE renewal_date <= ? AND renewal_date >= CURDATE() AND status = "active" AND is_deleted = 0',
    [thirtyDaysFromNow]
  );
  var notified = 0;
  await Promise.all(members.map(async function (m) {
    var html = '<p>Bonjour ' + m.first_name + ',</p>' +
               '<p>Votre adhésion expire le ' + m.renewal_date + '. Pensez à renouveler votre cotisation.</p>';
    try {
      await ClubService.sendEmail(m.email, 'Renouvellement adhésion - ' + config.app.clubName, html);
      notified++;
    } catch (err) {
      // silently continue on email failure
    }
  }));
  return { checked: members.length, notified: notified };
};

module.exports = ClubService;
