// tests/non-regression/payment-workflow.test.js
// Non-regression tests — Payment workflow (end-to-end)
// Workflow: login → create payment → detail → update status → export CSV
// Exigences : 5.2, 5.4

'use strict';

const request = require('supertest');

// ---- Mock the database module BEFORE requiring server.js ----
jest.mock('../../database', () => {
  const SEED_HASH = '$2b$10$XC8wj.CkuTpHakrJCjY1FuC/mFyEJRfZf5F8jWEEH/XZ9f3A3G83m';

  const USERS = [
    {
      id: 1, first_name: 'Pierre', last_name: 'Martin',
      email: 'admin@test.com', password_hash: SEED_HASH,
      role: 'admin', status: 'active', is_deleted: 0, team_id: 1,
      member_number: 'M00001', renewal_date: '2099-01-01',
      sport: 'Football', phone: '0600000001', join_date: '2020-01-01'
    },
    {
      id: 2, first_name: 'Karim', last_name: 'Bensalem',
      email: 'karim@test.com', password_hash: SEED_HASH,
      role: 'member', status: 'active', is_deleted: 0, team_id: 1,
      member_number: 'M00002', renewal_date: '2099-01-01',
      sport: 'Football', phone: '0600000002', join_date: '2021-01-01'
    }
  ];

  const TEAMS = [
    { id: 1, name: 'Seniors A', sport: 'Football', status: 'active' }
  ];

  const PAYMENTS = [
    {
      id: 1, member_id: 1, amount: 280, status: 'paid',
      payment_type: 'subscription', due_date: '2025-01-01',
      first_name: 'Pierre', last_name: 'Martin',
      email: 'admin@test.com', member_number: 'M00001',
      payment_date: '2025-01-01', payment_method: 'cash',
      season: '2024-2025', member_name: 'Pierre Martin',
      member_email: 'admin@test.com'
    }
  ];

  const mockQuery = jest.fn(async (sql, params) => {
    const sqlUpper = sql.toUpperCase();

    // 1. Login by email (most specific — check first)
    if (
      sqlUpper.includes('SELECT') &&
      sqlUpper.includes('MEMBERS') &&
      sqlUpper.includes('EMAIL') &&
      params && params[0] && typeof params[0] === 'string' && params[0].includes('@')
    ) {
      const email = params[0];
      return USERS.filter(u => u.email === email && u.is_deleted === 0);
    }

    // 2. UPDATE last_login
    if (sqlUpper.includes('UPDATE') && sqlUpper.includes('LAST_LOGIN')) {
      return { affectedRows: 1 };
    }

    // 3. SELECT payments detail (FROM PAYMENTS — GET /payments/:id or list)
    // Check this BEFORE the MEMBER_ID check since the JOIN query contains MEMBER_ID
    if (sqlUpper.includes('SELECT') && sqlUpper.includes('FROM PAYMENTS')) {
      return PAYMENTS;
    }

    // 3b. SELECT payments WHERE member_id (N+1 in getAllMembers)
    if (sqlUpper.includes('SELECT') && sqlUpper.includes('PAYMENTS') && sqlUpper.includes('MEMBER_ID')) {
      return [];
    }

    // 4. SELECT FROM MEMBERS M + LEFT JOIN (getAllMembers)
    if (sqlUpper.includes('SELECT') && sqlUpper.includes('FROM MEMBERS M') && sqlUpper.includes('LEFT JOIN')) {
      return USERS;
    }

    // 5. SELECT teams
    if (sqlUpper.includes('SELECT') && sqlUpper.includes('TEAMS')) {
      return TEAMS;
    }

    // 6. SELECT COUNT(*) FROM MEMBERS
    if (sqlUpper.includes('SELECT') && sqlUpper.includes('COUNT') && sqlUpper.includes('MEMBERS')) {
      return [{ cnt: 2 }];
    }

    // 7. SELECT members WHERE + numeric param
    if (
      sqlUpper.includes('SELECT') &&
      sqlUpper.includes('MEMBERS') &&
      sqlUpper.includes('WHERE') &&
      params && params[0] !== undefined
    ) {
      const id = params[0];
      if (!isNaN(parseInt(id))) {
        return USERS.filter(u => u.id === parseInt(id) && u.is_deleted === 0);
      }
      return [];
    }

    // 8. SELECT members fallback
    if (sqlUpper.includes('SELECT') && sqlUpper.includes('MEMBERS')) {
      return USERS;
    }

    // 9. SELECT payments (detail or list)
    if (sqlUpper.includes('SELECT') && sqlUpper.includes('PAYMENTS')) {
      return PAYMENTS;
    }

    // 10. INSERT members
    if (sqlUpper.includes('INSERT') && sqlUpper.includes('MEMBERS')) {
      return { insertId: 99 };
    }

    // 11. INSERT payments
    if (sqlUpper.includes('INSERT') && sqlUpper.includes('PAYMENTS')) {
      return { insertId: 1 };
    }

    // 12. UPDATE members
    if (sqlUpper.includes('UPDATE') && sqlUpper.includes('MEMBERS')) {
      return { affectedRows: 1 };
    }

    // 13. UPDATE payments
    if (sqlUpper.includes('UPDATE') && sqlUpper.includes('PAYMENTS')) {
      return { affectedRows: 1 };
    }

    // 14. DELETE / soft delete members
    if (sqlUpper.includes('DELETE') && sqlUpper.includes('MEMBERS')) {
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

process.env.SESSION_SECRET = 'test-secret-nr-payment';
process.env.NODE_ENV = 'test';

const app = require('../../server');

// ============================================================
// Helper: obtain an authenticated session cookie via POST /login
// ============================================================

async function loginAs(email, password) {
  const res = await request(app)
    .post('/login')
    .send(`username=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`)
    .set('Content-Type', 'application/x-www-form-urlencoded');

  const cookies = res.headers['set-cookie'];
  if (!cookies || cookies.length === 0) {
    throw new Error(`Login failed for ${email}: no session cookie returned (status ${res.status})`);
  }
  return Array.isArray(cookies) ? cookies.join('; ') : cookies;
}

// ============================================================
// Non-regression: Payment workflow
// ============================================================

describe('Non-regression — Payment workflow', () => {

  let adminCookie;

  beforeAll(async () => {
    adminCookie = await loginAs('admin@test.com', 'password123');
  });

  // Step 1: Login as admin
  test('Step 1 — Login as admin: POST /login → 302 redirect', async () => {
    const res = await request(app)
      .post('/login')
      .send('username=admin%40test.com&password=password123')
      .set('Content-Type', 'application/x-www-form-urlencoded');

    expect(res.status).toBe(302);
  });

  // Step 2: POST /payments — create a payment
  test('Step 2 — POST /payments: create payment returns 302', async () => {
    const res = await request(app)
      .post('/payments')
      .set('Cookie', adminCookie)
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send([
        'member_id=1',
        'amount=280',
        'payment_type=subscription',
        'payment_method=cash',
        'payment_date=2025-01-01',
        'status=paid'
      ].join('&'));

    expect(res.status).toBe(302);
  });

  // Step 3: GET /payments/:id — payment detail
  test('Step 3 — GET /payments/1: detail returns 200', async () => {
    const res = await request(app)
      .get('/payments/1')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
  });

  // Step 4: POST /payments/:id/status — update payment status
  test('Step 4 — POST /payments/1/status: update status returns 302', async () => {
    const res = await request(app)
      .post('/payments/1/status')
      .set('Cookie', adminCookie)
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send('status=paid');

    expect(res.status).toBe(302);
  });

  // Step 5: GET /payments/export/csv — export CSV
  test('Step 5 — GET /payments/export/csv: export returns 200 with text/csv', async () => {
    const res = await request(app)
      .get('/payments/export/csv')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
  });
});
