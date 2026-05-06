// services/TeamService.js
// Extracted from ClubService.js (originally by Pierre Martin, 2015)
// Extraction: Task 2.5 - cicd-pipeline spec

var db     = require('../database');
var config = require('../config');

var TeamService = {};

// =====================================================================
// TEAM MANAGEMENT
// =====================================================================

TeamService.getAllTeams = async function () {
  var sql = 'SELECT t.*, ' +
            'COUNT(m.id) as real_player_count, ' +
            'u.first_name as coach_first, u.last_name as coach_last ' +
            'FROM teams t ' +
            'LEFT JOIN members m ON m.team_id = t.id AND m.is_deleted = 0 AND m.status = "active" ' +
            'LEFT JOIN members u ON u.id = t.coach_id ' +
            'WHERE t.status = "active" ' +
            'GROUP BY t.id ' +
            'ORDER BY t.sport, t.category';
  return await db.query(sql, []);
};

TeamService.getTeamById = async function (id) {
  var rows = await db.query('SELECT * FROM teams WHERE id = ?', [id]);
  if (!rows || !rows.length) return null;
  var team = rows[0];

  var members = await db.query(
    'SELECT * FROM members WHERE team_id = ? AND is_deleted = 0 ORDER BY last_name',
    [id]
  );
  team.members = members || [];

  var events = await db.query(
    'SELECT * FROM events WHERE team_id = ? ORDER BY start_date DESC LIMIT 20',
    [id]
  );
  team.events = events || [];

  if (team.coach_id) {
    var coachRows = await db.query('SELECT first_name, last_name, email, phone FROM members WHERE id = ?', [team.coach_id]);
    team.coach = coachRows ? coachRows[0] : null;
  } else {
    team.coach = null;
  }

  return team;
};

TeamService.createTeam = async function (data) {
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

TeamService.updateTeam = async function (id, data) {
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

module.exports = TeamService;
