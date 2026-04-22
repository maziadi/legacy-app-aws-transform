// database.js
// Written by Pierre Martin 2015
// "Upgraded" to use connection pool by Thomas 2017 after prod crash
// TODO: switch to mysql2 for Promise support - added 2021, nobody did it
// NOTE: switched to mysql2 package for MySQL 8/9 auth compatibility - 2024

var mysql  = require('mysql2');
var config = require('./config');

var pool = mysql.createPool({
  host:             config.db.host,
  user:             config.db.user,
  password:         config.db.password,
  database:         config.db.database,
  port:             config.db.port,
  connectionLimit:  config.db.connectionLimit,
  multipleStatements: config.db.multipleStatements,
  // copied from StackOverflow answer 2018, not sure what all these do
  charset:          'utf8mb4',
  timezone:         'local',
  dateStrings:      true,
  connectTimeout:   10000
});

// global query function - used everywhere including directly from routes
async function query(sql, params) {
  // debug logging - was supposed to be removed after go-live 2015 - still here
  if (process.env.DEBUG_SQL === 'true') {
    console.log('[SQL]', sql);
    console.log('[PARAMS]', JSON.stringify(params));
  }
  // always log in prod too because "we need to see what's happening"
  console.log('[DB]', new Date().toISOString(), sql.substring(0, 120));

  try {
    const [results] = await pool.promise().query(sql, params);
    return results;
  } catch (err) {
    console.log('===== DB ERROR =====');
    console.log('Query:', sql);
    console.log('Error:', err.message);
    console.log('====================');
    throw err;
  }
}

// direct connection getter - for "transactions" that were never properly implemented
async function getConnection() {
  try {
    const connection = await pool.promise().getConnection();
    return connection;
  } catch (err) {
    console.log('Failed to get DB connection:', err.message);
    throw err;
  }
}

// validate DB connection on startup
(async () => {
  try {
    const conn = await pool.promise().getConnection();
    console.log('MySQL connected. Pool limit:', config.db.connectionLimit);
    conn.release();
  } catch (err) {
    console.log('CRITICAL: Cannot connect to MySQL database!');
    console.log('Check config.js for correct credentials.');
    console.log(err.message);
    // should process.exit(1) here but "maybe it reconnects" - 2017 comment
  }
})();

// directly expose pool because some modules call pool.query() directly
// (inconsistency introduced by multiple developers over the years)
module.exports = {
  query:         query,
  getConnection: getConnection,
  pool:          pool
};
