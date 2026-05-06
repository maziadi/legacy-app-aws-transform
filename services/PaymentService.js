// services/PaymentService.js
// Extracted from ClubService.js (originally by Pierre Martin, 2015)
// Extraction: Task 2.2 - cicd-pipeline spec

var db     = require('../database');
var config = require('../config');
var moment = require('moment');

var PaymentService = {};

// =====================================================================
// PAYMENT MANAGEMENT
// =====================================================================

PaymentService.getPayments = async function (filters) {
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

  var sql = 'SELECT p.*, m.first_name, m.last_name, m.email as member_email_join ' +
            'FROM payments p ' +
            'LEFT JOIN members m ON p.member_id = m.id ' +
            'WHERE ' + conditions.join(' AND ') +
            ' ORDER BY p.payment_date DESC';

  return await db.query(sql, params);
};

PaymentService.recordPayment = async function (data, createdBy) {
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

  // update member total_paid and last_payment_date - fire and forget
  db.query(
    'UPDATE members SET ' +
    'total_paid = (SELECT COALESCE(SUM(amount),0) FROM payments WHERE member_id = ? AND status = "paid"), ' +
    'last_payment_date = ? ' +
    'WHERE id = ?',
    [data.member_id, data.payment_date || moment().format('YYYY-MM-DD'), data.member_id]
  ).catch(function () {});

  return result.insertId;
};

PaymentService.getOverduePayments = async function () {
  var sql = 'SELECT p.*, m.first_name, m.last_name, m.email, m.phone ' +
            'FROM payments p JOIN members m ON p.member_id = m.id ' +
            'WHERE p.status = "pending" AND p.due_date < CURDATE() ' +
            'AND m.is_deleted = 0 ' +
            'ORDER BY p.due_date ASC';
  return await db.query(sql, []);
};

PaymentService.getPendingPayments = async function () {
  var sql = 'SELECT p.*, m.first_name, m.last_name, m.email, m.phone ' +
            'FROM payments p JOIN members m ON p.member_id = m.id ' +
            'WHERE p.status = "pending" ' +
            'AND m.is_deleted = 0 ' +
            'ORDER BY p.due_date ASC';
  return await db.query(sql, []);
};

module.exports = PaymentService;
