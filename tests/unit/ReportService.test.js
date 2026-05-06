// tests/unit/ReportService.test.js
// Unit tests for ReportService — all DB calls are mocked via jest.mock

// Mock the database module before requiring ReportService
jest.mock('../../database');

const db = require('../../database');
const ReportService = require('../../services/ReportService');

// =====================================================================
// getFinancialReport
// =====================================================================

describe('ReportService.getFinancialReport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('cas nominal — retourne un rapport financier avec données mensuelles', async () => {
    const summary = {
      total_collected: 5000,
      total_pending: 1200,
      total_overdue: 300,
      total_transactions: 42,
      subscription_revenue: 4000,
      equipment_revenue: 1000
    };
    const monthly = [
      { month: 1, total: 500 },
      { month: 2, total: 600 }
    ];
    db.query
      .mockResolvedValueOnce([summary])  // main SELECT
      .mockResolvedValueOnce(monthly);   // monthly breakdown

    const result = await ReportService.getFinancialReport(2024);

    expect(result).not.toBeNull();
    expect(result.total_collected).toBe(5000);
    expect(result.monthly).toHaveLength(2);
    expect(result.monthly[0].month).toBe(1);
  });

  test('utilise des requêtes paramétrées — year est passé via parseInt, pas par concaténation', async () => {
    db.query
      .mockResolvedValueOnce([{ total_collected: 0, total_pending: 0, total_overdue: 0, total_transactions: 0, subscription_revenue: 0, equipment_revenue: 0 }])
      .mockResolvedValueOnce([]);

    await ReportService.getFinancialReport('2023');

    // Both queries must use parameterized placeholders (?)
    const [sql1, params1] = db.query.mock.calls[0];
    const [sql2, params2] = db.query.mock.calls[1];

    expect(sql1).toContain('?');
    expect(sql2).toContain('?');

    // The year must be passed as parseInt(year), not concatenated into the SQL string
    expect(params1[0]).toBe(parseInt('2023'));
    expect(params2[0]).toBe(parseInt('2023'));

    // The SQL string itself must NOT contain the year value directly
    expect(sql1).not.toContain('2023');
    expect(sql2).not.toContain('2023');
  });

  test('year sous forme de chaîne est converti en entier via parseInt', async () => {
    db.query
      .mockResolvedValueOnce([{ total_collected: 0, total_pending: 0, total_overdue: 0, total_transactions: 0, subscription_revenue: 0, equipment_revenue: 0 }])
      .mockResolvedValueOnce([]);

    await ReportService.getFinancialReport('2022');

    const [, params1] = db.query.mock.calls[0];
    const [, params2] = db.query.mock.calls[1];

    // parseInt('2022') === 2022 (number, not string)
    expect(typeof params1[0]).toBe('number');
    expect(params1[0]).toBe(2022);
    expect(typeof params2[0]).toBe('number');
    expect(params2[0]).toBe(2022);
  });

  test('monthly est un tableau vide quand aucun paiement pour l\'année', async () => {
    db.query
      .mockResolvedValueOnce([{ total_collected: 0, total_pending: 0, total_overdue: 0, total_transactions: 0, subscription_revenue: 0, equipment_revenue: 0 }])
      .mockResolvedValueOnce([]);

    const result = await ReportService.getFinancialReport(2020);

    expect(Array.isArray(result.monthly)).toBe(true);
    expect(result.monthly).toHaveLength(0);
  });
});
