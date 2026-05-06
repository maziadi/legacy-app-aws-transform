// services/FacilityService.js
// Extracted from ClubService.js (originally by Pierre Martin, 2015)
// Extraction: Task 2.4 - cicd-pipeline spec

var db = require('../database');

var FacilityService = {};

// =====================================================================
// FACILITY MANAGEMENT
// =====================================================================

FacilityService.getFacilities = async function () {
  return await db.query('SELECT * FROM facilities ORDER BY type, name', []);
};

FacilityService.checkFacilityAvailability = async function (facilityId, startTime, endTime, excludeEventId) {
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

FacilityService.getBookings = async function (filters) {
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

/**
 * Pure function — no DB access.
 * Returns true if the two time ranges overlap.
 * Overlap condition: start1 < end2 AND start2 < end1
 * Adjacent ranges (end1 === start2) are NOT considered overlapping.
 * @param {Date|string|number} start1
 * @param {Date|string|number} end1
 * @param {Date|string|number} start2
 * @param {Date|string|number} end2
 * @returns {boolean}
 */
FacilityService.hasTimeOverlap = function (start1, end1, start2, end2) {
  var s1 = new Date(start1).getTime();
  var e1 = new Date(end1).getTime();
  var s2 = new Date(start2).getTime();
  var e2 = new Date(end2).getTime();
  return s1 < e2 && s2 < e1;
};

module.exports = FacilityService;
