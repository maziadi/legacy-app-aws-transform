// services/ReportService.js
// Extracted from ClubService.js (originally by Pierre Martin, 2015)
// Extraction: Task 2.5 - cicd-pipeline spec

var db = require('../database');

var ReportService = {};

// =====================================================================
// REPORTING / STATISTICS
// =====================================================================

ReportService.getMembershipReport = async function (season) {
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

ReportService.getFinancialReport = async function (year) {
  var sql = "SELECT " +
            "SUM(CASE WHEN status='paid' THEN amount ELSE 0 END) as total_collected, " +
            "SUM(CASE WHEN status='pending' THEN amount ELSE 0 END) as total_pending, " +
            "SUM(CASE WHEN status='pending' AND due_date < CURDATE() THEN amount ELSE 0 END) as total_overdue, " +
            "COUNT(*) as total_transactions, " +
            "SUM(CASE WHEN payment_type='subscription' AND status='paid' THEN amount ELSE 0 END) as subscription_revenue, " +
            "SUM(CASE WHEN payment_type='equipment' AND status='paid' THEN amount ELSE 0 END) as equipment_revenue " +
            "FROM payments WHERE YEAR(payment_date) = ?";

  var r = await db.query(sql, [parseInt(year)]);
  var report = r[0];

  var monthly = await db.query(
    "SELECT MONTH(payment_date) as month, SUM(amount) as total FROM payments WHERE YEAR(payment_date) = ? AND status = 'paid' GROUP BY MONTH(payment_date) ORDER BY month",
    [parseInt(year)]
  );
  report.monthly = monthly || [];

  return report;
};

ReportService.getDashboardStats = async function () {
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

module.exports = ReportService;
