// tests/non-regression/member-lifecycle.test.js
// Non-regression tests — Member lifecycle workflow (end-to-end)
// Workflow: login → list members → create → detail → update → renew → delete
// Exigences : 5.1, 5.4

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
    { id: 1, member_id: 1, amount: 280, status: 'paid', payment_type: 'subscription', due_date: '2025-01-01' }
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

    // 3. SELECT payments WHERE member_id
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

    // 6. SELECT COUNT(*) FROM MEMBERS (member number generation)
    if (sqlUpper.includes('SELECT') && sqlUpper.includes('COUNT') && sqlUpper.includes('MEMBERS')) {
      return [{ cnt: 2 }];
    }

    // 7. SELECT members WHERE + numeric param (getMemberById / renew lookup)
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

    // 9. SELECT payments
    if (sqlUpper.includes('SELECT') && sqlUpper.includes('PAYMENTS')) {
      return PAYMENTS;
    }

    // 10. INSERT members
    if (sqlUpper.includes('INSERT') && sqlUpper.includes('MEMBERS')) {
      return { insertId: 99 };
    }

    // 11. INSERT payments
    if (sqlUpper.includes('INSERT') && sqlUpper.includes('PAYMENTS')) {
      return { insertId: 10 };
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

process.env.SESSION_SECRET = 'test-secret-nr-member';
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
// Non-regression: Member lifecycle workflow
// ============================================================

describe('Non-regression — Member lifecycle workflow', () => {

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

  // Step 2: GET /members — list members
  test('Step 2 — GET /members: list returns 200', async () => {
    const res = await request(app)
      .get('/members')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
  });

  // Step 3: POST /members — create a new member
  test('Step 3 — POST /members: create member returns 302', async () => {
    const res = await request(app)
      .post('/members')
      .set('Cookie', adminCookie)
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send([
        'first_name=Jean',
        'last_name=Dupont',
        'email=jean.dupont%40test.com',
        'phone=0600000099',
        'sport=Football',
        'status=active',
        'role=member',
        'subscription_type=annual_adult'
      ].join('&'));

    expect(res.status).toBe(302);
  });

  // Step 4: GET /members/:id — member detail
  test('Step 4 — GET /members/1: detail returns 200', async () => {
    const res = await request(app)
      .get('/members/1')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
  });

  // Step 5: POST /members/:id/update — update member
  test('Step 5 — POST /members/1/update: update returns 302', async () => {
    const res = await request(app)
      .post('/members/1/update')
      .set('Cookie', adminCookie)
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send([
        'first_name=Pierre',
        'last_name=Martin',
        'email=admin%40test.com',
        'phone=0600000001',
        'sport=Football',
        'status=active',
        'role=admin',
        'subscription_type=annual_adult'
      ].join('&'));

    expect(res.status).toBe(302);
  });

  // Step 6: POST /members/:id/renew — renew membership
  test('Step 6 — POST /members/1/renew: renew returns 302', async () => {
    const res = await request(app)
      .post('/members/1/renew')
      .set('Cookie', adminCookie)
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send('subscription_type=annual_adult&payment_method=cash');

    expect(res.status).toBe(302);
  });

  // Step 7: POST /members/:id/delete — soft delete member
  test('Step 7 — POST /members/2/delete: delete returns 302', async () => {
    const res = await request(app)
      .post('/members/2/delete')
      .set('Cookie', adminCookie)
      .set('Content-Type', 'application/x-www-form-urlencoded');

    expect(res.status).toBe(302);
  });
});
