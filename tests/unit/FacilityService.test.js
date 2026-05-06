// tests/unit/FacilityService.test.js
// Unit tests for FacilityService — all DB calls are mocked via jest.mock

const fc = require('fast-check');

// Mock the database module before requiring FacilityService
jest.mock('../../database');

const db = require('../../database');
const FacilityService = require('../../services/FacilityService');

// =====================================================================
// checkFacilityAvailability
// =====================================================================

describe('FacilityService.checkFacilityAvailability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('retourne false en cas de conflit de réservation (conflicts > 0)', async () => {
    db.query.mockResolvedValueOnce([{ conflicts: 2 }]);

    const result = await FacilityService.checkFacilityAvailability(
      1,
      '2024-06-01 10:00:00',
      '2024-06-01 12:00:00',
      null
    );

    expect(result).toBe(false);
  });

  test('retourne true en l\'absence de conflit (conflicts === 0)', async () => {
    db.query.mockResolvedValueOnce([{ conflicts: 0 }]);

    const result = await FacilityService.checkFacilityAvailability(
      1,
      '2024-06-01 14:00:00',
      '2024-06-01 16:00:00',
      null
    );

    expect(result).toBe(true);
  });

  test('inclut la clause excludeEventId quand elle est fournie', async () => {
    db.query.mockResolvedValueOnce([{ conflicts: 0 }]);

    await FacilityService.checkFacilityAvailability(
      1,
      '2024-06-01 10:00:00',
      '2024-06-01 12:00:00',
      42
    );

    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toContain('event_id != ?');
    expect(params).toContain(42);
  });

  test('n\'inclut pas la clause excludeEventId quand elle est null', async () => {
    db.query.mockResolvedValueOnce([{ conflicts: 0 }]);

    await FacilityService.checkFacilityAvailability(
      1,
      '2024-06-01 10:00:00',
      '2024-06-01 12:00:00',
      null
    );

    const [sql] = db.query.mock.calls[0];
    expect(sql).not.toContain('event_id != ?');
  });
});

// =====================================================================
// hasTimeOverlap
// =====================================================================

describe('FacilityService.hasTimeOverlap', () => {
  test('retourne true pour des plages qui se chevauchent', () => {
    // [10:00 - 12:00] vs [11:00 - 13:00] → overlap
    expect(FacilityService.hasTimeOverlap(
      new Date('2024-06-01T10:00:00'),
      new Date('2024-06-01T12:00:00'),
      new Date('2024-06-01T11:00:00'),
      new Date('2024-06-01T13:00:00')
    )).toBe(true);
  });

  test('retourne true pour des plages identiques', () => {
    expect(FacilityService.hasTimeOverlap(
      new Date('2024-06-01T10:00:00'),
      new Date('2024-06-01T12:00:00'),
      new Date('2024-06-01T10:00:00'),
      new Date('2024-06-01T12:00:00')
    )).toBe(true);
  });

  test('retourne true quand une plage est contenue dans l\'autre', () => {
    // [10:00 - 14:00] contains [11:00 - 13:00]
    expect(FacilityService.hasTimeOverlap(
      new Date('2024-06-01T10:00:00'),
      new Date('2024-06-01T14:00:00'),
      new Date('2024-06-01T11:00:00'),
      new Date('2024-06-01T13:00:00')
    )).toBe(true);
  });

  test('retourne false pour des plages adjacentes (fin1 === début2)', () => {
    // [10:00 - 12:00] adjacent to [12:00 - 14:00] → no overlap
    expect(FacilityService.hasTimeOverlap(
      new Date('2024-06-01T10:00:00'),
      new Date('2024-06-01T12:00:00'),
      new Date('2024-06-01T12:00:00'),
      new Date('2024-06-01T14:00:00')
    )).toBe(false);
  });

  test('retourne false pour des plages disjointes', () => {
    // [10:00 - 11:00] vs [12:00 - 13:00] → no overlap
    expect(FacilityService.hasTimeOverlap(
      new Date('2024-06-01T10:00:00'),
      new Date('2024-06-01T11:00:00'),
      new Date('2024-06-01T12:00:00'),
      new Date('2024-06-01T13:00:00')
    )).toBe(false);
  });

  test('retourne false quand la plage 2 précède entièrement la plage 1', () => {
    // [14:00 - 16:00] vs [10:00 - 12:00] → no overlap
    expect(FacilityService.hasTimeOverlap(
      new Date('2024-06-01T14:00:00'),
      new Date('2024-06-01T16:00:00'),
      new Date('2024-06-01T10:00:00'),
      new Date('2024-06-01T12:00:00')
    )).toBe(false);
  });

  test('accepte des chaînes ISO en entrée', () => {
    expect(FacilityService.hasTimeOverlap(
      '2024-06-01T10:00:00',
      '2024-06-01T12:00:00',
      '2024-06-01T11:00:00',
      '2024-06-01T13:00:00'
    )).toBe(true);
  });
});

// =====================================================================
// Propriété 5 : Disponibilité d'installation
// Validates: Requirements 3.10
// =====================================================================

describe('Propriété 5 : Disponibilité d\'installation', () => {
  test(
    'hasTimeOverlap(d1, f1, d2, f2) retourne true ↔ d1 < f2 && d2 < f1',
    () => {
      fc.assert(
        fc.property(
          fc.date(),
          fc.date(),
          fc.date(),
          fc.date(),
          (d1, f1, d2, f2) => {
            const result = FacilityService.hasTimeOverlap(d1, f1, d2, f2);
            const expected = d1 < f2 && d2 < f1;
            return result === expected;
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});
