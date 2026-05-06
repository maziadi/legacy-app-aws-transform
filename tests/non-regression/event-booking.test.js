// tests/non-regression/event-booking.test.js
// Non-regression tests — Event booking workflow (end-to-end)
// Workflow: login → create event with facility → detail → cancel
// Exigences : 5.3, 5.4

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

  const EVENTS = [
    {
      id: 5, title: 'Match Seniors A', event_type: 'match',
      sport: 'Football', team_id: 1, team_name: 'Seniors A',
      facility_id: 1, facility_name: 'Terrain Principal',
      start_date: '2025-06-01 10:00:00', end_date: '2025-06-01 12:00:00',
      status: 'scheduled', team_name_j: 'Seniors A', facility_name_j: 'Terrain Principal'
    }
  ];

  const FACILITIES = [
    { id: 1, name: 'Terrain Principal', type: 'field', is_available: 1 }
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

    // 15. SELECT events (list or detail with LEFT JOIN)
    if (sqlUpper.includes('SELECT') && sqlUpper.includes('EVENTS')) {
      return EVENTS;
    }

    // 16. INSERT events
    if (sqlUpper.includes('INSERT') && sqlUpper.includes('EVENTS')) {
      return { insertId: 5 };
    }

    // 17. UPDATE events (cancel or result)
    if (sqlUpper.includes('UPDATE') && sqlUpper.includes('EVENTS')) {
      return { affectedRows: 1 };
    }

    // 18. SELECT facilities
    if (sqlUpper.includes('SELECT') && sqlUpper.includes('FACILITIES')) {
      return FACILITIES;
    }

    // 19. INSERT bookings (fire-and-forget in createEvent)
    if (sqlUpper.includes('INSERT') && sqlUpper.includes('BOOKINGS')) {
      return { insertId: 20 };
    }

    // 20. UPDATE bookings (fire-and-forget in cancel)
    if (sqlUpper.includes('UPDATE') && sqlUpper.includes('BOOKINGS')) {
      return { affectedRows: 1 };
    }

    // 21. SELECT event_participants (detail page N+1)
    if (sqlUpper.includes('SELECT') && sqlUpper.includes('EVENT_PARTICIPANTS')) {
      return [];
    }

    // 22. SELECT COUNT(*) for event participants
    if (sqlUpper.includes('SELECT') && sqlUpper.includes('COUNT') && sqlUpper.includes('EVENT_PARTICIPANTS')) {
      return [{ cnt: 0 }];
    }

    return [];
  });

  return {
    query: mockQuery,
    getConnection: jest.fn(),
    pool: { query: jest.fn(), promise: jest.fn(() => ({ getConnection: jest.fn() })) }
  };
});

process.env.SESSION_SECRET = 'test-secret-nr-event';
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
// Non-regression: Event booking workflow
// ============================================================

describe('Non-regression — Event booking workflow', () => {

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

  // Step 2: POST /events — create event with facility
  test('Step 2 — POST /events: create event with facility returns 302', async () => {
    const res = await request(app)
      .post('/events')
      .set('Cookie', adminCookie)
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send([
        'title=Match+Seniors+A',
        'event_type=match',
        'event_date=2025-06-01',
        'start_date=2025-06-01+10%3A00%3A00',
        'end_date=2025-06-01+12%3A00%3A00',
        'facility_id=1',
        'team_id=1',
        'sport=Football'
      ].join('&'));

    expect(res.status).toBe(302);
  });

  // Step 3: GET /events/:id — event detail
  test('Step 3 — GET /events/5: detail returns 200', async () => {
    const res = await request(app)
      .get('/events/5')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
  });

  // Step 4: POST /events/:id/cancel — cancel event (should redirect 302)
  test('Step 4 — POST /events/5/cancel: cancellation succeeds with 302 redirect', async () => {
    const res = await request(app)
      .post('/events/5/cancel')
      .set('Cookie', adminCookie)
      .set('Content-Type', 'application/x-www-form-urlencoded');

    expect(res.status).toBe(302);
  });

  // Verify cancellation redirects to /events list
  test('Step 4b — POST /events/5/cancel: redirect location is /events', async () => {
    const res = await request(app)
      .post('/events/5/cancel')
      .set('Cookie', adminCookie)
      .set('Content-Type', 'application/x-www-form-urlencoded');

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/events');
  });
});
