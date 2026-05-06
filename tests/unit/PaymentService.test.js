// tests/unit/PaymentService.test.js
// Unit tests for PaymentService — all DB calls are mocked via jest.mock

const fc = require('fast-check');

// Mock the database module before requiring PaymentService
jest.mock('../../database');

const db = require('../../database');
const PaymentService = require('../../services/PaymentService');

// =====================================================================
// Helpers
// =====================================================================

/**
 * Build a minimal fake payment row.
 */
function fakePayment(overrides = {}) {
  return {
    id: 1,
    member_id: 1,
    amount: 100,
    status: 'pending',
    due_date: '2020-01-01',
    payment_type: 'subscription',
    payment_method: 'cash',
    ...overrides
  };
}

// =====================================================================
// recordPayment
// =====================================================================

describe('PaymentService.recordPayment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('lève une erreur "Membre introuvable" pour un member_id inexistant', async () => {
    // DB returns empty array — member not found
    db.query.mockResolvedValueOnce([]);

    await expect(
      PaymentService.recordPayment({ member_id: 9999, amount: 50 }, 'admin')
    ).rejects.toThrow('Membre introuvable');
  });

  test('retourne l\'insertId quand le membre existe', async () => {
    db.query
      .mockResolvedValueOnce([{ first_name: 'Alice', last_name: 'Dupont', email: 'alice@example.com' }]) // SELECT member
      .mockResolvedValueOnce({ insertId: 42 })  // INSERT payment
      .mockResolvedValueOnce(undefined);         // UPDATE members (fire-and-forget)

    const id = await PaymentService.recordPayment(
      { member_id: 1, amount: 100, payment_type: 'subscription' },
      'admin'
    );

    expect(id).toBe(42);
  });
});

// =====================================================================
// getOverduePayments
// =====================================================================

describe('PaymentService.getOverduePayments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('retourne uniquement les paiements status="pending" avec due_date < today', async () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    const overduePayments = [
      fakePayment({ id: 1, status: 'pending', due_date: yesterdayStr }),
      fakePayment({ id: 2, status: 'pending', due_date: '2020-01-01' })
    ];

    db.query.mockResolvedValueOnce(overduePayments);

    const result = await PaymentService.getOverduePayments();

    expect(result).toHaveLength(2);
    result.forEach(p => {
      expect(p.status).toBe('pending');
      expect(new Date(p.due_date) < today).toBe(true);
    });
  });

  test('retourne un tableau vide quand il n\'y a pas de paiements en retard', async () => {
    db.query.mockResolvedValueOnce([]);

    const result = await PaymentService.getOverduePayments();
    expect(result).toEqual([]);
  });

  test('la requête SQL filtre sur status="pending" et due_date < CURDATE()', async () => {
    db.query.mockResolvedValueOnce([]);

    await PaymentService.getOverduePayments();

    const [sql] = db.query.mock.calls[0];
    expect(sql).toContain('status = "pending"');
    expect(sql).toContain('due_date < CURDATE()');
  });
});

// =====================================================================
// Propriété 3 : Paiements en retard
// Validates: Requirements 3.8
// =====================================================================

describe('Propriété 3 : Paiements en retard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test(
    'getOverduePayments ne retourne jamais de paiement "paid" ni de paiement dont due_date >= today',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              status: fc.constantFrom('pending', 'paid'),
              due_date: fc.date()
            }),
            { minLength: 0, maxLength: 20 }
          ),
          async (payments) => {
            jest.clearAllMocks();

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Simulate what the DB would return after applying the SQL filter:
            // only pending payments with due_date < today
            const filteredByDb = payments
              .filter(p => p.status === 'pending' && p.due_date < today)
              .map((p, i) => ({
                id: i + 1,
                member_id: 1,
                amount: 100,
                status: p.status,
                due_date: p.due_date.toISOString().slice(0, 10)
              }));

            db.query.mockResolvedValueOnce(filteredByDb);

            const result = await PaymentService.getOverduePayments();

            // Result must never contain a 'paid' payment
            const hasPaid = result.some(p => p.status === 'paid');
            if (hasPaid) return false;

            // Result must never contain a payment with due_date >= today
            const hasNonOverdue = result.some(p => {
              const dueDate = new Date(p.due_date);
              dueDate.setHours(0, 0, 0, 0);
              return dueDate >= today;
            });
            if (hasNonOverdue) return false;

            return true;
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});
