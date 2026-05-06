// tests/integration/db-helper.js
// Helper that applies schema migrations and seed data via the `pg` driver
// before integration tests. Used when TEST_DB_URL is set (CI with PostgreSQL
// service container). When TEST_DB_URL is not set, the helper is a no-op so
// tests can still run against a mocked DB layer.

const fs   = require('fs');
const path = require('path');

let pgClient = null;

/**
 * Connect to the PostgreSQL test database and apply schema + seed.
 * Call this in a beforeAll() hook.
 */
async function setupTestDb() {
  const dbUrl = process.env.TEST_DB_URL;
  if (!dbUrl) {
    // No PostgreSQL URL configured — skip DB setup (unit-test mode)
    return;
  }

  const { Client } = require('pg');
  pgClient = new Client({ connectionString: dbUrl });
  await pgClient.connect();

  const schemaPath = path.join(__dirname, 'setup-db.sql');
  const seedPath   = path.join(__dirname, 'seed.sql');

  const schema = fs.readFileSync(schemaPath, 'utf8');
  const seed   = fs.readFileSync(seedPath, 'utf8');

  await pgClient.query(schema);
  await pgClient.query(seed);
}

/**
 * Disconnect from the PostgreSQL test database.
 * Call this in an afterAll() hook.
 */
async function teardownTestDb() {
  if (pgClient) {
    await pgClient.end();
    pgClient = null;
  }
}

/**
 * Execute a raw SQL query against the test database.
 * Returns the rows array.
 */
async function queryTestDb(sql, params = []) {
  if (!pgClient) {
    throw new Error('Test DB not connected. Call setupTestDb() first.');
  }
  const result = await pgClient.query(sql, params);
  return result.rows;
}

/**
 * Reset the test data by re-running the seed script.
 * Useful between tests that mutate data.
 */
async function resetSeed() {
  if (!pgClient) return;
  const seedPath = path.join(__dirname, 'seed.sql');
  const seed     = fs.readFileSync(seedPath, 'utf8');
  await pgClient.query(seed);
}

module.exports = {
  setupTestDb,
  teardownTestDb,
  queryTestDb,
  resetSeed,
};
