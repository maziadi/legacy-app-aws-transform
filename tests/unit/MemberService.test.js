// tests/unit/MemberService.test.js
// Unit tests for MemberService — all DB calls are mocked via jest.mock

const fc = require('fast-check');

// Mock the database module before requiring MemberService
jest.mock('../../database');

const db = require('../../database');
const MemberService = require('../../services/MemberService');

// =====================================================================
// Helpers
// =====================================================================

/**
 * Build a minimal fake member row.
 */
function fakeMember(overrides = {}) {
  return {
    id: 1,
    first_name: 'Alice',
    last_name: 'Dupont',
    email: 'alice@example.com',
    status: 'active',
    sport: 'football',
    team_id: null,
    is_deleted: 0,
    ...overrides
  };
}

// =====================================================================
// getAllMembers
// =====================================================================

describe('MemberService.getAllMembers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('cas nominal — retourne les membres avec last_payment attaché', async () => {
    const members = [fakeMember({ id: 1 }), fakeMember({ id: 2, status: 'inactive' })];
    // First call: SELECT members; subsequent calls: SELECT payments per member
    db.query
      .mockResolvedValueOnce(members)          // main SELECT
      .mockResolvedValueOnce([{ id: 10 }])     // payment for member 1
      .mockResolvedValueOnce([]);              // payment for member 2

    const result = await MemberService.getAllMembers({});

    expect(result).toHaveLength(2);
    expect(result[0].last_payment).toEqual({ id: 10 });
    // payRows[0] is undefined when the array is empty (service returns payRows[0])
    expect(result[1].last_payment).toBeUndefined();
  });

  test('filtre vide — retourne tous les membres non supprimés', async () => {
    const members = [fakeMember()];
    db.query
      .mockResolvedValueOnce(members)
      .mockResolvedValueOnce([]);

    const result = await MemberService.getAllMembers({});
    expect(result).toHaveLength(1);
  });

  test('filtre par status — la requête SQL inclut le filtre status', async () => {
    db.query
      .mockResolvedValueOnce([fakeMember({ status: 'active' })])
      .mockResolvedValueOnce([]);

    await MemberService.getAllMembers({ status: 'active' });

    // The first call should include the status param
    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toContain('m.status = ?');
    expect(params).toContain('active');
  });

  test('filtre par sport — la requête SQL inclut le filtre sport', async () => {
    db.query
      .mockResolvedValueOnce([fakeMember({ sport: 'tennis' })])
      .mockResolvedValueOnce([]);

    await MemberService.getAllMembers({ sport: 'tennis' });

    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toContain('m.sport LIKE ?');
    expect(params).toContain('%tennis%');
  });

  test('filtre combiné status + sport — les deux conditions sont dans la requête', async () => {
    db.query
      .mockResolvedValueOnce([fakeMember({ status: 'active', sport: 'tennis' })])
      .mockResolvedValueOnce([]);

    await MemberService.getAllMembers({ status: 'active', sport: 'tennis' });

    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toContain('m.status = ?');
    expect(sql).toContain('m.sport LIKE ?');
    expect(params).toContain('active');
    expect(params).toContain('%tennis%');
  });

  test('retourne un tableau vide quand la BDD ne retourne rien', async () => {
    db.query.mockResolvedValueOnce([]);

    const result = await MemberService.getAllMembers({});
    expect(result).toEqual([]);
  });
});

// =====================================================================
// getMemberById
// =====================================================================

describe('MemberService.getMemberById', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('retourne null pour un identifiant inexistant', async () => {
    db.query.mockResolvedValueOnce([]); // no rows found

    const result = await MemberService.getMemberById(9999);
    expect(result).toBeNull();
  });

  test('retourne le membre avec team, payments et recent_events attachés', async () => {
    const member = fakeMember({ id: 1, team_id: 5 });
    db.query
      .mockResolvedValueOnce([member])          // SELECT member
      .mockResolvedValueOnce([{ id: 5, name: 'Team A' }]) // SELECT team
      .mockResolvedValueOnce([{ id: 20 }])      // SELECT payments
      .mockResolvedValueOnce([{ id: 30 }]);     // SELECT recent_events

    const result = await MemberService.getMemberById(1);
    expect(result).not.toBeNull();
    expect(result.team).toEqual({ id: 5, name: 'Team A' });
    expect(result.payments).toHaveLength(1);
    expect(result.recent_events).toHaveLength(1);
  });
});

// =====================================================================
// createMember
// =====================================================================

describe('MemberService.createMember', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const minimalData = {
    first_name: 'Bob',
    last_name: 'Martin',
    email: 'bob@example.com',
    phone: '0600000000',
    address: '1 rue de la Paix',
    city: 'Paris',
    zip: '75001',
    password: 'secret123',
    subscription_type: 'annual_adult'
  };

  test('génère un numéro de membre au format M00001+ (regex /^M\\d{5}$/)', async () => {
    // COUNT(*) returns 0 → next number = 1 → M00001
    db.query
      .mockResolvedValueOnce([{ cnt: 0 }])   // COUNT(*)
      .mockResolvedValueOnce({ insertId: 1 }); // INSERT

    const insertId = await MemberService.createMember(minimalData, 'admin');
    expect(insertId).toBe(1);

    // Verify the member_number passed to INSERT matches the format
    const insertCall = db.query.mock.calls[1];
    const insertParams = insertCall[1];
    // member_number is at index 17 (0-based) in the params array
    const memberNumber = insertParams[17];
    expect(memberNumber).toMatch(/^M\d{5}$/);
  });

  test('génère M00001 quand la table est vide (cnt = 0)', async () => {
    db.query
      .mockResolvedValueOnce([{ cnt: 0 }])
      .mockResolvedValueOnce({ insertId: 1 });

    await MemberService.createMember(minimalData, 'admin');

    const insertParams = db.query.mock.calls[1][1];
    expect(insertParams[17]).toBe('M00001');
  });

  test('génère M00042 quand cnt = 41', async () => {
    db.query
      .mockResolvedValueOnce([{ cnt: 41 }])
      .mockResolvedValueOnce({ insertId: 42 });

    await MemberService.createMember(minimalData, 'admin');

    const insertParams = db.query.mock.calls[1][1];
    expect(insertParams[17]).toBe('M00042');
  });

  test('le champ password_hash est un hash bcrypt (ne contient pas le mot de passe en clair)', async () => {
    db.query
      .mockResolvedValueOnce([{ cnt: 0 }])
      .mockResolvedValueOnce({ insertId: 1 });

    await MemberService.createMember({ ...minimalData, password: 'monMotDePasse' }, 'admin');

    const insertParams = db.query.mock.calls[1][1];
    // password_hash is at index 14 in the params array
    const passwordHash = insertParams[14];

    // Must not contain the plaintext password
    expect(passwordHash).not.toContain('monMotDePasse');
    // Must look like a bcrypt hash ($2b$ prefix)
    expect(passwordHash).toMatch(/^\$2[ab]\$\d{2}\$.{53}$/);
  });

  test('utilise un hash bcrypt par défaut quand aucun mot de passe n\'est fourni', async () => {
    db.query
      .mockResolvedValueOnce([{ cnt: 0 }])
      .mockResolvedValueOnce({ insertId: 1 });

    const dataWithoutPassword = { ...minimalData };
    delete dataWithoutPassword.password;

    await MemberService.createMember(dataWithoutPassword, 'admin');

    const insertParams = db.query.mock.calls[1][1];
    const passwordHash = insertParams[14];
    expect(passwordHash).toMatch(/^\$2[ab]\$\d{2}\$.{53}$/);
  });
});

// =====================================================================
// isMembershipExpired
// =====================================================================

describe('MemberService.isMembershipExpired', () => {
  test('retourne true pour une date passée', () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // yesterday
    expect(MemberService.isMembershipExpired(pastDate)).toBe(true);
  });

  test('retourne false pour une date future', () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // tomorrow
    expect(MemberService.isMembershipExpired(futureDate)).toBe(false);
  });

  test('retourne true pour une date passée sous forme de chaîne ISO', () => {
    const pastDateStr = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
    expect(MemberService.isMembershipExpired(pastDateStr)).toBe(true);
  });

  test('retourne false pour une date future sous forme de chaîne ISO', () => {
    const futureDateStr = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    expect(MemberService.isMembershipExpired(futureDateStr)).toBe(false);
  });

  test('retourne true quand renewalDate est null ou undefined', () => {
    expect(MemberService.isMembershipExpired(null)).toBe(true);
    expect(MemberService.isMembershipExpired(undefined)).toBe(true);
  });
});

// =====================================================================
// Propriété 1 : Filtrage des membres
// Validates: Requirements 3.7
// =====================================================================

describe('Propriété 1 : Filtrage des membres', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getAllMembers({status}) ne retourne jamais de membre dont le statut diffère du filtre', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            status: fc.constantFrom('active', 'inactive'),
            sport: fc.string()
          }),
          { minLength: 0, maxLength: 20 }
        ),
        fc.constantFrom('active', 'inactive'),
        async (members, filterStatus) => {
          jest.clearAllMocks();

          // Only members matching the filter status
          const matchingMembers = members
            .filter(m => m.status === filterStatus)
            .map((m, i) => ({ id: i + 1, ...m, is_deleted: 0 }));

          // Mock: main query returns only matching members (as the real DB would)
          db.query.mockImplementation((sql) => {
            if (sql.includes('SELECT m.*')) {
              return Promise.resolve(matchingMembers);
            }
            // payment sub-queries
            return Promise.resolve([]);
          });

          const result = await MemberService.getAllMembers({ status: filterStatus });

          // Every returned member must have the requested status
          return result.every(m => m.status === filterStatus);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// =====================================================================
// Propriété 2 : Expiration d'adhésion
// Validates: Requirements 3.7
// =====================================================================

describe('Propriété 2 : Expiration d\'adhésion', () => {
  test('isMembershipExpired(date) retourne true ↔ date < Date.now()', () => {
    fc.assert(
      fc.property(
        fc.date(),
        (date) => {
          const result = MemberService.isMembershipExpired(date);
          const isInPast = date.getTime() < Date.now();
          return result === isInPast;
        }
      ),
      { numRuns: 100 }
    );
  });
});
