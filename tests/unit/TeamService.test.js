// tests/unit/TeamService.test.js
// Unit tests for TeamService — all DB calls are mocked via jest.mock

// Mock the database module before requiring TeamService
jest.mock('../../database');

const db = require('../../database');
const TeamService = require('../../services/TeamService');

// =====================================================================
// Helpers
// =====================================================================

function fakeTeam(overrides = {}) {
  return {
    id: 1,
    name: 'Équipe A',
    sport: 'football',
    category: 'senior',
    coach_id: null,
    status: 'active',
    ...overrides
  };
}

// =====================================================================
// getAllTeams
// =====================================================================

describe('TeamService.getAllTeams', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('cas nominal — retourne un tableau de teams', async () => {
    const teams = [fakeTeam({ id: 1 }), fakeTeam({ id: 2, name: 'Équipe B', sport: 'tennis' })];
    db.query.mockResolvedValueOnce(teams);

    const result = await TeamService.getAllTeams();

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Équipe A');
    expect(result[1].name).toBe('Équipe B');
  });

  test('retourne un tableau vide quand la BDD ne retourne rien', async () => {
    db.query.mockResolvedValueOnce([]);

    const result = await TeamService.getAllTeams();

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });

  test('la requête SQL cible la table teams avec status active', async () => {
    db.query.mockResolvedValueOnce([fakeTeam()]);

    await TeamService.getAllTeams();

    const [sql] = db.query.mock.calls[0];
    expect(sql).toContain('teams');
    expect(sql.toLowerCase()).toContain('active');
  });
});

// =====================================================================
// getTeamById
// =====================================================================

describe('TeamService.getTeamById', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('retourne null pour un identifiant inexistant', async () => {
    db.query.mockResolvedValueOnce([]); // no rows found

    const result = await TeamService.getTeamById(9999);

    expect(result).toBeNull();
  });

  test('retourne l\'équipe avec members, events et coach attachés', async () => {
    const team = fakeTeam({ id: 1, coach_id: 10 });
    db.query
      .mockResolvedValueOnce([team])                          // SELECT team
      .mockResolvedValueOnce([{ id: 5, last_name: 'Dupont' }]) // SELECT members
      .mockResolvedValueOnce([{ id: 20, title: 'Match' }])    // SELECT events
      .mockResolvedValueOnce([{ first_name: 'Jean', last_name: 'Coach' }]); // SELECT coach

    const result = await TeamService.getTeamById(1);

    expect(result).not.toBeNull();
    expect(result.members).toHaveLength(1);
    expect(result.events).toHaveLength(1);
    expect(result.coach).toEqual({ first_name: 'Jean', last_name: 'Coach' });
  });

  test('coach est null quand l\'équipe n\'a pas de coach_id', async () => {
    const team = fakeTeam({ id: 1, coach_id: null });
    db.query
      .mockResolvedValueOnce([team])  // SELECT team
      .mockResolvedValueOnce([])      // SELECT members
      .mockResolvedValueOnce([]);     // SELECT events
    // No coach query expected when coach_id is null

    const result = await TeamService.getTeamById(1);

    expect(result).not.toBeNull();
    expect(result.coach).toBeNull();
  });

  test('utilise une requête paramétrée avec l\'id fourni', async () => {
    db.query.mockResolvedValueOnce([]); // not found

    await TeamService.getTeamById(42);

    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toContain('?');
    expect(params).toContain(42);
  });
});
