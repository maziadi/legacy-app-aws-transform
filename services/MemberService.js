// services/MemberService.js
// Extracted from ClubService.js (originally by Pierre Martin, 2015)
// Extraction: Task 2.1 - cicd-pipeline spec

var db     = require('../database');
var config = require('../config');
var bcrypt = require('bcrypt');
var moment = require('moment');

var MemberService = {};

// =====================================================================
// MEMBER MANAGEMENT
// =====================================================================

MemberService.getAllMembers = async function (filters) {
  var conditions = ['m.is_deleted = 0'];
  var params     = [];

  if (filters && filters.status) {
    conditions.push('m.status = ?');
    params.push(filters.status);
  }
  if (filters && filters.sport) {
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

MemberService.getMemberById = async function (id) {
  var rows = await db.query('SELECT * FROM members WHERE id = ? AND is_deleted = 0', [id]);
  if (!rows || rows.length === 0) return null;

  var member = rows[0];
  var teamRows = await db.query('SELECT * FROM teams WHERE id = ?', [member.team_id]);
  member.team = teamRows ? teamRows[0] : null;

  var payments = await db.query('SELECT * FROM payments WHERE member_id = ? ORDER BY payment_date DESC', [id]);
  member.payments = payments || [];

  var events = await db.query('SELECT e.* FROM event_participants ep JOIN events e ON ep.event_id = e.id WHERE ep.member_id = ? ORDER BY e.start_date DESC LIMIT 20', [id]);
  member.recent_events = events || [];

  return member;
};

MemberService.createMember = async function (data, createdBy) {
  var r = await db.query('SELECT COUNT(*) as cnt FROM members', []);
  var nextNum = (r ? r[0].cnt : 0) + 1;
  var memberNumber = 'M' + String(nextNum).padStart(5, '0');

  var age = data.birth_date ? moment().diff(moment(data.birth_date), 'years') : null;
  var fullName = (data.first_name || '') + ' ' + (data.last_name || '');
  var passwordHash = data.password ? await bcrypt.hash(data.password, 10) : await bcrypt.hash('password123', 10);

  var sql = 'INSERT INTO members ' +
    '(first_name, last_name, full_name, email, email2, phone, phone2, address, city, zip, country, ' +
    'birth_date, age, gender, password_hash, role, status, member_number, ' +
    'join_date, renewal_date, subscription_type, subscription_amount, sport, team_id, team_name, ' +
    'notes, created_at, created_by) VALUES ' +
    '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)';

  var teamName = '';
  if (data.team_id) {
    var tRows = await db.query('SELECT name FROM teams WHERE id = ?', [data.team_id]);
    teamName = tRows && tRows[0] ? tRows[0].name : '';
  }

  var renewalDate = moment().add(1, 'year').format('YYYY-MM-DD');
  var amount = config.subscriptions[data.subscription_type] || 0;

  var result = await db.query(sql, [
    data.first_name, data.last_name, fullName, data.email, data.email2 || null,
    data.phone, data.phone2 || null, data.address, data.city, data.zip,
    data.country || 'France', data.birth_date, age, data.gender,
    passwordHash, data.role || 'member', data.status || 'active',
    memberNumber, moment().format('YYYY-MM-DD'), renewalDate,
    data.subscription_type || 'annual_adult', amount,
    data.sport || '', data.team_id || null, teamName,
    data.notes || null, createdBy || 'system'
  ]);

  return result.insertId;
};

MemberService.updateMember = async function (id, data, updatedBy) {
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

  if (data.team_id) {
    db.query(
      'UPDATE teams SET current_players = (SELECT COUNT(*) FROM members WHERE team_id = ? AND is_deleted = 0 AND status = "active") WHERE id = ?',
      [data.team_id, data.team_id]
    ).catch(function () {});
  }
};

MemberService.deleteMember = async function (id, deletedBy) {
  await db.query(
    'UPDATE members SET is_deleted = 1, deleted_at = NOW(), deleted_by = ?, status = "inactive" WHERE id = ?',
    [deletedBy, id]
  );
};

MemberService.generateMemberNumber = async function () {
  var r = await db.query('SELECT MAX(CAST(SUBSTRING(member_number,2) AS UNSIGNED)) as maxn FROM members', []);
  var next = (r && r[0].maxn ? r[0].maxn : 0) + 1;
  return 'M' + String(next).padStart(5, '0');
};

/**
 * Pure function — no DB access.
 * Returns true if the given renewalDate is in the past (membership expired).
 * @param {Date|string|number} renewalDate
 * @returns {boolean}
 */
MemberService.isMembershipExpired = function (renewalDate) {
  if (!renewalDate) return true;
  return new Date(renewalDate).getTime() < Date.now();
};

module.exports = MemberService;
