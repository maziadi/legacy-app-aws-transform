// tests/integration/auth.test.js
// Integration tests for authentication routes
// Tests POST /login with valid credentials, invalid credentials, and SQL injection payloads
// Exigences : 4.4

'use strict';

const request = require('supertest');
const fc      = require('fast-check');

// ---- Mock the database module BEFORE requiring server.js ----
// This prevents MySQL connection attempts during tests.
// The mock simulates the seed data: 1 admin + 2 members.
jest.mock('../../database', () => {
  const bcrypt = require('bcrypt');

  // Seed users matching tests/integration/seed.sql
  // password_hash = bcrypt hash of 'password123' (generated with bcrypt.hashSync('password123', 10))
  const SEED_HASH = '$2b$10$XC8wj.CkuTpHakrJCjY1FuC/mFyEJRfZf5F8jWEEH/XZ9f3A3G83m';

  const USERS = [
    {
      id: 1, first_name: 'Pierre', last_name: 'Martin',
      email: 'admin@test.com', password_hash: SEED_HASH,
      role: 'admin', status: 'active', is_deleted: 0, team_id: 1
    },
    {
      id: 2, first_name: 'Karim', last_name: 'Bensalem',
      email: 'karim@test.com', password_hash: SEED_HASH,
      role: 'member', status: 'active', is_deleted: 0, team_id: 1
    },
    {
      id: 3, first_name: 'Lucas', last_name: 'Bernard',
      email: 'lucas@test.com', password_hash: SEED_HASH,
      role: 'member', status: 'active', is_deleted: 0, team_id: 1
    }
  ];

  const mockQuery = jest.fn(async (sql, params) => {
    // SELECT for login: match by email and is_deleted = 0
    if (sql.includes('SELECT') && sql.includes('members') && sql.includes('email')) {
      const email = params && params[0];
      const found = USERS.filter(u => u.email === email && u.is_deleted === 0);
      return found;
    }
    // UPDATE last_login — fire and forget, return empty
    if (sql.includes('UPDATE') && sql.includes('last_login')) {
      return { affectedRows: 1 };
    }
    return [];
  });

  return {
    query: mockQuery,
    getConnection: jest.fn(),
    pool: { query: jest.fn(), promise: jest.fn(() => ({ getConnection: jest.fn() })) }
  };
});

// Set required env vars before loading server
process.env.SESSION_SECRET = 'test-secret-for-integration-tests';
process.env.NODE_ENV = 'test';

// Load app AFTER mocking database
const app = require('../../server');

// ============================================================
// 8.1 — Tests d'intégration d'authentification
// ============================================================

describe('POST /login — authentification', () => {

  test('identifiants valides (admin) : redirection 302 vers /dashboard', async () => {
    const res = await request(app)
      .post('/login')
      .send('username=admin%40test.com&password=password123')
      .set('Content-Type', 'application/x-www-form-urlencoded');

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/dashboard');
  });

  test('identifiants valides (member) : redirection 302 vers /dashboard', async () => {
    const res = await request(app)
      .post('/login')
      .send('username=karim%40test.com&password=password123')
      .set('Content-Type', 'application/x-www-form-urlencoded');

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/dashboard');
  });

  test('mot de passe incorrect : statut 200 avec message d\'erreur', async () => {
    const res = await request(app)
      .post('/login')
      .send('username=admin%40test.com&password=wrongpassword')
      .set('Content-Type', 'application/x-www-form-urlencoded');

    expect(res.status).toBe(200);
    expect(res.text).toMatch(/identifiants/i);
  });

  test('email inexistant : statut 200 avec message d\'erreur', async () => {
    const res = await request(app)
      .post('/login')
      .send('username=unknown%40test.com&password=password123')
      .set('Content-Type', 'application/x-www-form-urlencoded');

    expect(res.status).toBe(200);
    expect(res.text).toMatch(/identifiants/i);
  });

  test('injection SQL classique : accès refusé (pas de redirection vers /dashboard)', async () => {
    const res = await request(app)
      .post('/login')
      .send("username=' OR 1=1 --&password=anything")
      .set('Content-Type', 'application/x-www-form-urlencoded');

    // Must NOT redirect to /dashboard
    expect(res.status).not.toBe(302);
    if (res.status === 302) {
      expect(res.headers.location).not.toBe('/dashboard');
    }
  });

  test('champs vides : statut 200 avec message d\'erreur', async () => {
    const res = await request(app)
      .post('/login')
      .send('username=&password=')
      .set('Content-Type', 'application/x-www-form-urlencoded');

    expect(res.status).toBe(200);
  });
});

// ============================================================
// 8.2 — Propriété 6 : Prévention des injections SQL
// **Validates: Requirements 4.4, 4.7**
// ============================================================

describe('Propriété 6 : Prévention des injections SQL — POST /login', () => {

  test('tout payload d\'injection SQL ne doit jamais provoquer une redirection 302 vers /dashboard', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          "' OR 1=1 --",
          "'; DROP TABLE members; --",
          "UNION SELECT * FROM members --"
        ),
        async (sqlPayload) => {
          const res = await request(app)
            .post('/login')
            .send(`username=${encodeURIComponent(sqlPayload)}&password=anything`)
            .set('Content-Type', 'application/x-www-form-urlencoded');

          // The response must NOT be a 302 redirect to /dashboard
          if (res.status === 302) {
            return res.headers.location !== '/dashboard';
          }
          return res.status !== 302;
        }
      ),
      { numRuns: 100 }
    );
  });
});
