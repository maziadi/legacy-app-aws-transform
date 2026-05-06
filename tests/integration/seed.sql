-- ============================================================
-- Integration Test Seed Data — PostgreSQL
-- 1 admin, 2 members, 1 team, 2 payments (1 overdue)
-- password_hash = bcrypt hash of 'password123'
-- ============================================================

-- Team
INSERT INTO teams (id, name, sport, category, season, max_players, current_players, status)
VALUES (1, 'Seniors A', 'Football', 'Senior', '2023-2024', 22, 3, 'active');

-- Members
-- Admin: password = 'password123'
INSERT INTO members (
  id, first_name, last_name, full_name, email, phone,
  password_hash, role, status, member_number,
  join_date, renewal_date, subscription_type, subscription_amount,
  sport, team_id, team_name, is_deleted, created_by
) VALUES (
  1, 'Pierre', 'Martin', 'Pierre Martin', 'admin@test.com', '0612345678',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'admin', 'active', 'M00001',
  '2023-09-01', '2025-08-31', 'annual_adult', 280,
  'Football', 1, 'Seniors A', 0, 'system'
);

-- Member 1 (active, valid subscription)
INSERT INTO members (
  id, first_name, last_name, full_name, email, phone,
  password_hash, role, status, member_number,
  join_date, renewal_date, subscription_type, subscription_amount,
  sport, team_id, team_name, is_deleted, created_by
) VALUES (
  2, 'Karim', 'Bensalem', 'Karim Bensalem', 'karim@test.com', '0623456789',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'member', 'active', 'M00002',
  '2023-09-01', '2025-08-31', 'annual_adult', 280,
  'Football', 1, 'Seniors A', 0, 'admin@test.com'
);

-- Member 2 (active, expired subscription)
INSERT INTO members (
  id, first_name, last_name, full_name, email, phone,
  password_hash, role, status, member_number,
  join_date, renewal_date, subscription_type, subscription_amount,
  sport, team_id, team_name, is_deleted, created_by
) VALUES (
  3, 'Lucas', 'Bernard', 'Lucas Bernard', 'lucas@test.com', '0634567890',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'member', 'active', 'M00003',
  '2022-09-01', '2023-08-31', 'annual_adult', 280,
  'Football', 1, 'Seniors A', 0, 'admin@test.com'
);

-- Payments
-- Payment 1: paid (on time)
INSERT INTO payments (
  id, member_id, member_name, member_email,
  amount, payment_type, payment_method, description,
  payment_date, due_date, status, season, created_by
) VALUES (
  1, 2, 'Karim Bensalem', 'karim@test.com',
  280.00, 'subscription', 'cash', 'Cotisation annuelle adulte 2023-2024',
  '2023-09-15', '2023-10-01', 'paid', '2023-2024', 'admin@test.com'
);

-- Payment 2: pending and overdue (due_date in the past)
INSERT INTO payments (
  id, member_id, member_name, member_email,
  amount, payment_type, payment_method, description,
  payment_date, due_date, status, season, created_by
) VALUES (
  2, 3, 'Lucas Bernard', 'lucas@test.com',
  280.00, 'subscription', 'cash', 'Cotisation annuelle adulte 2023-2024',
  NULL, '2023-10-01', 'pending', '2023-2024', 'admin@test.com'
);

-- Facility for booking tests
INSERT INTO facilities (id, name, type, capacity, is_available, hourly_rate)
VALUES (1, 'Stade Municipal', 'field', 500, 1, 0.00);
