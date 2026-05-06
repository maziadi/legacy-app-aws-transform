// services/EventService.js
// Extracted from ClubService.js (originally by Pierre Martin, 2015)
// Extraction: Task 2.3 - cicd-pipeline spec

var db     = require('../database');
var moment = require('moment');

var EventService = {};

// =====================================================================
// EVENT / MATCH MANAGEMENT
// =====================================================================

EventService.getEvents = async function (filters) {
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
  var events = rows || [];
  if (events.length === 0) return [];

  await Promise.all(events.map(async function (ev, i) {
    var r2 = await db.query('SELECT COUNT(*) as cnt FROM event_participants WHERE event_id = ?', [ev.id]);
    events[i].participant_count = r2 ? r2[0].cnt : 0;
  }));

  return events;
};

EventService.createEvent = async function (data, createdBy) {
  var durationMins = null;
  if (data.start_date && data.end_date) {
    durationMins = moment(data.end_date).diff(moment(data.start_date), 'minutes');
  }

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

  // auto-create facility booking if facility selected - fire and forget
  if (data.facility_id) {
    var bookingSql = 'INSERT INTO bookings (facility_id, facility_name, event_id, team_id, team_name, ' +
                     'booked_by, start_time, end_time, purpose, status, created_at) ' +
                     'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, "confirmed", NOW())';
    db.query(bookingSql, [
      data.facility_id, facilityName, result.insertId,
      data.team_id, teamName, createdBy,
      data.start_date, data.end_date, data.title
    ]).catch(function () {});
  }

  return result.insertId;
};

EventService.recordMatchResult = async function (eventId, homeScore, awayScore, notes) {
  var result = EventService.computeMatchResult(homeScore, awayScore);
  await db.query(
    'UPDATE events SET home_score = ?, away_score = ?, result = ?, status = "completed", notes = CONCAT(IFNULL(notes,""), ?) WHERE id = ?',
    [homeScore, awayScore, result, notes ? '\n' + notes : '', eventId]
  );
  return result;
};

/**
 * Pure function — no DB access.
 * Computes the match result from the two scores.
 * @param {number} homeScore
 * @param {number} awayScore
 * @returns {'win'|'loss'|'draw'}
 */
EventService.computeMatchResult = function (homeScore, awayScore) {
  if (homeScore > awayScore) return 'win';
  if (homeScore < awayScore) return 'loss';
  return 'draw';
};

module.exports = EventService;
