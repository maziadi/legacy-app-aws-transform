-- ============================================================
-- Club Manager - Sample Data Seed
-- Run AFTER setup_db.sql
-- mysql -u root -p club_manager < seed.sql
-- ============================================================
USE club_manager;

-- ============================================================
-- FACILITIES
-- ============================================================
INSERT INTO facilities (name, type, capacity, address, is_available, hourly_rate, contact_person, contact_phone, color_code) VALUES
('Stade Municipal Villejuif', 'field',   500, 'Rue des Sports, 94800 Villejuif',         1, 0.00,  'M. Dupont (Mairie)',     '01 45 67 89 00', '#28a745'),
('Gymnase Jean Moulin',       'gym',      200, '5 Av. Jean Moulin, 94800 Villejuif',       1, 15.00, 'Mme Leblanc',            '01 45 67 89 01', '#007bff'),
('Salle de réunion Club',     'room',      30, '12 Rue des Sports, 94800 Villejuif',       1, 0.00,  'Secrétariat club',       '01 45 67 89 02', '#6c757d'),
('Terrain annexe B',          'field',    100, 'Impasse du Stade, 94800 Villejuif',        1, 0.00,  'M. Dupont (Mairie)',     '01 45 67 89 00', '#ffc107'),
('Piscine Municipale',        'pool',     150, 'Bd Henri Barbusse, 94800 Villejuif',       0, 25.00, 'Mme Garcia (Mairie)',    '01 45 67 89 05', '#17a2b8');

-- ============================================================
-- TEAMS
-- ============================================================
INSERT INTO teams (name, sport, category, coach_name, coach_email, season, max_players, current_players, status) VALUES
('U9 Football',      'Football', 'U9',     'Laurent Boucher',  'l.boucher@asc-villejuif.fr',   '2023-2024', 16, 14, 'active'),
('U11 Football A',   'Football', 'U11',    'Marc Renard',      'm.renard@asc-villejuif.fr',    '2023-2024', 16, 15, 'active'),
('U11 Football B',   'Football', 'U11',    'Marc Renard',      'm.renard@asc-villejuif.fr',    '2023-2024', 16, 13, 'active'),
('U13 Football',     'Football', 'U13',    'Patrick Faure',    'p.faure@asc-villejuif.fr',     '2023-2024', 18, 17, 'active'),
('U15 Football',     'Football', 'U15',    'Sophie Morin',     's.morin@asc-villejuif.fr',     '2023-2024', 18, 16, 'active'),
('U17 Football',     'Football', 'U17',    'David Lambert',    'd.lambert@asc-villejuif.fr',   '2023-2024', 20, 19, 'active'),
('Seniors A',        'Football', 'Senior', 'Pierre Martin',    'p.martin@asc-villejuif.fr',    '2023-2024', 22, 21, 'active'),
('Seniors B',        'Football', 'Senior', 'Thomas Girard',    't.girard@asc-villejuif.fr',    '2023-2024', 22, 18, 'active'),
('Vétérans',         'Football', 'Veteran','Jean-Pierre Blanc', 'jp.blanc@asc-villejuif.fr',   '2023-2024', 20, 15, 'active'),
('U13 Basket',       'Basket',   'U13',    'Amina Diallo',     'a.diallo@asc-villejuif.fr',    '2023-2024', 12, 11, 'active'),
('Seniors Basket F', 'Basket',   'Senior', 'Nadia Benali',     'n.benali@asc-villejuif.fr',    '2023-2024', 12, 10, 'active'),
('Natation Loisir',  'Natation', 'Loisir', 'Éric Roux',        'e.roux@asc-villejuif.fr',      '2023-2024', 25, 22, 'active');

-- ============================================================
-- MEMBERS (admin + sample members)
-- password_hash is MD5('password123') = 482c811da5d5b4bc6d497ffa98491e38
-- password_plain stored because old migration script did this
-- ============================================================
INSERT INTO members (first_name, last_name, full_name, email, phone, address, city, zip, birth_date, age, gender, password_hash, password_plain, role, status, member_number, join_date, renewal_date, subscription_type, subscription_amount, sport, team_id, team_name, created_by) VALUES

-- Admin
('Pierre', 'Martin', 'Pierre Martin', 'admin@asc-villejuif.fr', '06 12 34 56 78',
 '12 Rue des Sports', 'Villejuif', '94800', '1978-04-15', 45, 'M',
 '482c811da5d5b4bc6d497ffa98491e38', 'password123',
 'admin', 'active', 'M00001', '2015-09-01', '2024-08-31', 'annual_adult', 280, 'Football', 7, 'Seniors A', 'system'),

-- Coaches
('Marc', 'Renard', 'Marc Renard', 'm.renard@asc-villejuif.fr', '06 23 45 67 89',
 '34 Av. de la République', 'Villejuif', '94800', '1980-07-22', 43, 'M',
 '482c811da5d5b4bc6d497ffa98491e38', 'password123',
 'coach', 'active', 'M00002', '2016-09-01', '2024-08-31', 'annual_adult', 280, 'Football', 2, 'U11 Football A', 'system'),

('Sophie', 'Morin', 'Sophie Morin', 's.morin@asc-villejuif.fr', '06 34 56 78 90',
 '8 Rue Victor Hugo', 'L''Haÿ-les-Roses', '94240', '1985-02-10', 38, 'F',
 '482c811da5d5b4bc6d497ffa98491e38', 'password123',
 'coach', 'active', 'M00003', '2017-09-01', '2024-08-31', 'annual_adult', 280, 'Football', 5, 'U15 Football', 'system'),

('Amina', 'Diallo', 'Amina Diallo', 'a.diallo@asc-villejuif.fr', '06 45 67 89 01',
 '55 Bd de Stalingrad', 'Villejuif', '94800', '1988-11-30', 35, 'F',
 '482c811da5d5b4bc6d497ffa98491e38', 'password123',
 'coach', 'active', 'M00004', '2018-09-01', '2024-08-31', 'annual_adult', 280, 'Basket', 10, 'U13 Basket', 'system'),

-- Regular members - Football Seniors A
('Karim', 'Bensalem', 'Karim Bensalem', 'k.bensalem@gmail.com', '06 56 78 90 12',
 '22 Rue Pasteur', 'Vitry-sur-Seine', '94400', '1995-06-18', 28, 'M',
 '482c811da5d5b4bc6d497ffa98491e38', 'password123',
 'member', 'active', 'M00005', '2019-09-01', '2024-08-31', 'annual_adult', 280, 'Football', 7, 'Seniors A', 'admin@asc-villejuif.fr'),

('Thomas', 'Girard', 'Thomas Girard', 't.girard@gmail.com', '06 67 89 01 23',
 '15 Rue de la Paix', 'Villejuif', '94800', '1992-09-05', 31, 'M',
 '482c811da5d5b4bc6d497ffa98491e38', 'password123',
 'coach', 'active', 'M00006', '2018-09-01', '2024-08-31', 'annual_adult', 280, 'Football', 8, 'Seniors B', 'admin@asc-villejuif.fr'),

('Lucas', 'Bernard', 'Lucas Bernard', 'l.bernard@hotmail.fr', '06 78 90 12 34',
 '3 Allée des Roses', 'Chevilly-Larue', '94550', '1998-03-25', 25, 'M',
 '482c811da5d5b4bc6d497ffa98491e38', 'password123',
 'member', 'active', 'M00007', '2021-09-01', '2024-08-31', 'annual_adult', 280, 'Football', 7, 'Seniors A', 'admin@asc-villejuif.fr'),

('Kevin', 'Nguyen', 'Kevin Nguyen', 'k.nguyen@gmail.com', '06 89 01 23 45',
 '18 Rue du Château', 'Villejuif', '94800', '1997-12-01', 26, 'M',
 '482c811da5d5b4bc6d497ffa98491e38', 'password123',
 'member', 'active', 'M00008', '2020-09-01', '2024-08-31', 'annual_adult', 280, 'Football', 7, 'Seniors A', 'admin@asc-villejuif.fr'),

('Sébastien', 'Petit', 'Sébastien Petit', 's.petit@orange.fr', '06 90 12 34 56',
 '7 Impasse du Moulin', 'L''Haÿ-les-Roses', '94240', '1993-08-14', 30, 'M',
 '482c811da5d5b4bc6d497ffa98491e38', 'password123',
 'member', 'active', 'M00009', '2019-09-01', '2024-08-31', 'annual_adult', 280, 'Football', 7, 'Seniors A', 'admin@asc-villejuif.fr'),

('Mohamed', 'Cherif', 'Mohamed Cherif', 'm.cherif@gmail.com', '07 01 23 45 67',
 '29 Av. Lénine', 'Villejuif', '94800', '1996-01-20', 27, 'M',
 '482c811da5d5b4bc6d497ffa98491e38', 'password123',
 'member', 'active', 'M00010', '2022-09-01', '2024-08-31', 'annual_adult', 280, 'Football', 8, 'Seniors B', 'admin@asc-villejuif.fr'),

-- Juniors
('Noah', 'Leroy', 'Noah Leroy', 'parent.leroy@gmail.com', '06 11 22 33 44',
 '40 Rue Gambetta', 'Villejuif', '94800', '2010-04-08', 13, 'M',
 '482c811da5d5b4bc6d497ffa98491e38', 'password123',
 'member', 'active', 'M00011', '2023-09-01', '2024-08-31', 'annual_junior', 150, 'Football', 4, 'U13 Football', 'admin@asc-villejuif.fr'),

('Emma', 'Rousseau', 'Emma Rousseau', 'parent.rousseau@free.fr', '06 22 33 44 55',
 '61 Bd Maxime Gorki', 'Villejuif', '94800', '2008-07-15', 15, 'F',
 '482c811da5d5b4bc6d497ffa98491e38', 'password123',
 'member', 'active', 'M00012', '2022-09-01', '2024-08-31', 'annual_junior', 150, 'Football', 5, 'U15 Football', 'admin@asc-villejuif.fr'),

('Léo', 'Fontaine', 'Léo Fontaine', 'j.fontaine@gmail.com', '06 33 44 55 66',
 '9 Cité des Fleurs', 'Arcueil', '94110', '2006-11-03', 17, 'M',
 '482c811da5d5b4bc6d497ffa98491e38', 'password123',
 'member', 'active', 'M00013', '2021-09-01', '2024-08-31', 'annual_junior', 150, 'Football', 6, 'U17 Football', 'admin@asc-villejuif.fr'),

-- Basket members
('Fatima', 'Traore', 'Fatima Traore', 'f.traore@gmail.com', '06 44 55 66 77',
 '14 Rue Marat', 'Vitry-sur-Seine', '94400', '1990-05-22', 33, 'F',
 '482c811da5d5b4bc6d497ffa98491e38', 'password123',
 'member', 'active', 'M00014', '2020-09-01', '2024-08-31', 'annual_adult', 280, 'Basket', 11, 'Seniors Basket F', 'admin@asc-villejuif.fr'),

('Nadia', 'Benali', 'Nadia Benali', 'n.benali@asc-villejuif.fr', '06 55 66 77 88',
 '33 Av. Paul Vaillant-Couturier', 'Villejuif', '94800', '1986-09-18', 37, 'F',
 '482c811da5d5b4bc6d497ffa98491e38', 'password123',
 'coach', 'active', 'M00015', '2019-09-01', '2024-08-31', 'annual_adult', 280, 'Basket', 11, 'Seniors Basket F', 'system'),

-- member with expired subscription
('Julien', 'Marchand', 'Julien Marchand', 'j.marchand@gmail.com', '06 66 77 88 99',
 '2 Rue du Progrès', 'Villejuif', '94800', '1988-12-30', 35, 'M',
 '482c811da5d5b4bc6d497ffa98491e38', 'password123',
 'member', 'active', 'M00016', '2019-09-01', '2023-08-31', 'annual_adult', 280, 'Football', 8, 'Seniors B', 'admin@asc-villejuif.fr'),

-- inactive member
('Antoine', 'Simon', 'Antoine Simon', 'a.simon@yahoo.fr', '06 77 88 99 00',
 '50 Rue Robespierre', 'Ivry-sur-Seine', '94200', '1983-02-14', 41, 'M',
 '482c811da5d5b4bc6d497ffa98491e38', 'password123',
 'member', 'inactive', 'M00017', '2017-09-01', '2022-08-31', 'annual_adult', 280, 'Football', NULL, NULL, 'admin@asc-villejuif.fr');

-- Update coach_id in teams now that we have member IDs
UPDATE teams SET coach_id = 1  WHERE id = 7;  -- Pierre -> Seniors A
UPDATE teams SET coach_id = 2  WHERE id = 2;  -- Marc -> U11 A
UPDATE teams SET coach_id = 2  WHERE id = 3;  -- Marc -> U11 B
UPDATE teams SET coach_id = 3  WHERE id = 5;  -- Sophie -> U15
UPDATE teams SET coach_id = 4  WHERE id = 10; -- Amina -> U13 Basket
UPDATE teams SET coach_id = 6  WHERE id = 8;  -- Thomas -> Seniors B
UPDATE teams SET coach_id = 15 WHERE id = 11; -- Nadia -> Seniors Basket F

-- ============================================================
-- PAYMENTS
-- ============================================================
INSERT INTO payments (member_id, member_name, member_email, amount, payment_type, payment_method, description, payment_date, status, season, created_by, migrated_from_excel) VALUES
(1,  'Pierre Martin',    'admin@asc-villejuif.fr',     280.00, 'subscription', 'transfer', 'Cotisation annuelle adulte 2023-2024', '2023-09-05', 'paid', '2023-2024', 'system', 0),
(2,  'Marc Renard',      'm.renard@asc-villejuif.fr',  280.00, 'subscription', 'check',    'Cotisation annuelle adulte 2023-2024', '2023-09-10', 'paid', '2023-2024', 'system', 0),
(3,  'Sophie Morin',     's.morin@asc-villejuif.fr',   280.00, 'subscription', 'transfer', 'Cotisation annuelle adulte 2023-2024', '2023-09-03', 'paid', '2023-2024', 'system', 0),
(5,  'Karim Bensalem',   'k.bensalem@gmail.com',       280.00, 'subscription', 'cash',     'Cotisation annuelle adulte 2023-2024', '2023-09-15', 'paid', '2023-2024', 'admin@asc-villejuif.fr', 0),
(6,  'Thomas Girard',    't.girard@gmail.com',          280.00, 'subscription', 'cash',     'Cotisation annuelle adulte 2023-2024', '2023-09-12', 'paid', '2023-2024', 'admin@asc-villejuif.fr', 0),
(7,  'Lucas Bernard',    'l.bernard@hotmail.fr',        280.00, 'subscription', 'card',     'Cotisation annuelle adulte 2023-2024', '2023-09-18', 'paid', '2023-2024', 'admin@asc-villejuif.fr', 0),
(8,  'Kevin Nguyen',     'k.nguyen@gmail.com',          280.00, 'subscription', 'transfer', 'Cotisation annuelle adulte 2023-2024', '2023-09-20', 'paid', '2023-2024', 'admin@asc-villejuif.fr', 0),
(9,  'Sébastien Petit',  's.petit@orange.fr',           280.00, 'subscription', 'check',    'Cotisation annuelle adulte 2023-2024', '2023-09-22', 'paid', '2023-2024', 'admin@asc-villejuif.fr', 0),
(10, 'Mohamed Cherif',   'm.cherif@gmail.com',          280.00, 'subscription', 'cash',     'Cotisation annuelle adulte 2023-2024', '2023-10-01', 'paid', '2023-2024', 'admin@asc-villejuif.fr', 0),
(11, 'Noah Leroy',       'parent.leroy@gmail.com',      150.00, 'subscription', 'check',    'Cotisation annuelle junior 2023-2024', '2023-09-08', 'paid', '2023-2024', 'admin@asc-villejuif.fr', 0),
(12, 'Emma Rousseau',    'parent.rousseau@free.fr',     150.00, 'subscription', 'cash',     'Cotisation annuelle junior 2023-2024', '2023-09-14', 'paid', '2023-2024', 'admin@asc-villejuif.fr', 0),
(13, 'Léo Fontaine',     'j.fontaine@gmail.com',        150.00, 'subscription', 'transfer', 'Cotisation annuelle junior 2023-2024', '2023-09-25', 'paid', '2023-2024', 'admin@asc-villejuif.fr', 0),
(14, 'Fatima Traore',    'f.traore@gmail.com',           280.00, 'subscription', 'card',     'Cotisation annuelle adulte 2023-2024', '2023-09-30', 'paid', '2023-2024', 'admin@asc-villejuif.fr', 0),
(15, 'Nadia Benali',     'n.benali@asc-villejuif.fr',  280.00, 'subscription', 'transfer', 'Cotisation annuelle adulte 2023-2024', '2023-09-05', 'paid', '2023-2024', 'system', 0),
-- pending/overdue
(16, 'Julien Marchand',  'j.marchand@gmail.com',        280.00, 'subscription', 'cash',     'Cotisation annuelle adulte 2023-2024', '2023-09-01', 'pending', '2023-2024', 'admin@asc-villejuif.fr', 0),
-- equipment fees
(5,  'Karim Bensalem',   'k.bensalem@gmail.com',         45.00, 'equipment',    'cash',     'Licence FFF 2023-2024', '2023-09-15', 'paid', '2023-2024', 'admin@asc-villejuif.fr', 0),
(7,  'Lucas Bernard',    'l.bernard@hotmail.fr',          45.00, 'equipment',    'cash',     'Licence FFF 2023-2024', '2023-09-18', 'paid', '2023-2024', 'admin@asc-villejuif.fr', 0),
-- migrated from Excel (legacy data)
(1,  'Pierre Martin',    'admin@asc-villejuif.fr',     250.00, 'subscription', 'cash',     'Cotisation 2022-2023 (import Excel)', '2022-09-05', 'paid', '2022-2023', 'system', 1),
(5,  'Karim Bensalem',   'k.bensalem@gmail.com',       250.00, 'subscription', 'cash',     'Cotisation 2022-2023 (import Excel)', '2022-09-15', 'paid', '2022-2023', 'system', 1);

-- ============================================================
-- EVENTS (sample matches and training sessions)
-- ============================================================
INSERT INTO events (title, event_type, sport, team_id, team_name, opponent_name, opponent_club, facility_id, facility_name, start_date, end_date, duration_minutes, status, home_score, away_score, result, created_by) VALUES
('Entraînement Seniors A',     'training', 'Football', 7, 'Seniors A',     NULL,           NULL,                       1, 'Stade Municipal Villejuif', '2024-01-09 19:00:00', '2024-01-09 21:00:00', 120, 'completed', NULL, NULL, NULL, 'admin@asc-villejuif.fr'),
('Match Seniors A vs Cachan',  'match',    'Football', 7, 'Seniors A',     'Équipe A',     'US Cachan Football',        1, 'Stade Municipal Villejuif', '2024-01-13 15:00:00', '2024-01-13 17:00:00', 90,  'completed', 2,    1,    'win', 'admin@asc-villejuif.fr'),
('Entraînement U15',           'training', 'Football', 5, 'U15 Football',  NULL,           NULL,                       4, 'Terrain annexe B',         '2024-01-10 17:30:00', '2024-01-10 19:00:00', 90,  'completed', NULL, NULL, NULL, 'admin@asc-villejuif.fr'),
('Match U15 vs Kremlin-Bicêtre','match',   'Football', 5, 'U15 Football',  'U15',          'Entente Kremlin-Bicêtre',   4, 'Terrain annexe B',         '2024-01-14 10:00:00', '2024-01-14 12:00:00', 90,  'completed', 1,    1,    'draw', 'admin@asc-villejuif.fr'),
('Entraînement Basket F',      'training', 'Basket',   11,'Seniors Basket F', NULL,         NULL,                       2, 'Gymnase Jean Moulin',       '2024-01-11 20:00:00', '2024-01-11 22:00:00', 120, 'completed', NULL, NULL, NULL, 'admin@asc-villejuif.fr'),
('Tournoi U13 Football',       'tournament','Football', 4, 'U13 Football',  NULL,           NULL,                       1, 'Stade Municipal Villejuif', '2024-01-20 09:00:00', '2024-01-20 17:00:00', 480, 'scheduled', NULL, NULL, NULL, 'admin@asc-villejuif.fr'),
('Entraînement Seniors A',     'training', 'Football', 7, 'Seniors A',     NULL,           NULL,                       1, 'Stade Municipal Villejuif', '2024-01-16 19:00:00', '2024-01-16 21:00:00', 120, 'scheduled', NULL, NULL, NULL, 'admin@asc-villejuif.fr'),
('Match Seniors A vs Arcueil', 'match',    'Football', 7, 'Seniors A',     'Équipe 1',     'AS Arcueil',                1, 'Stade Municipal Villejuif', '2024-01-20 15:00:00', '2024-01-20 17:00:00', 90,  'scheduled', NULL, NULL, NULL, 'admin@asc-villejuif.fr'),
('AG Annuelle Club',           'meeting',  'Football', NULL, NULL,          NULL,           NULL,                       3, 'Salle de réunion Club',    '2024-02-01 19:00:00', '2024-02-01 21:00:00', 120, 'scheduled', NULL, NULL, NULL, 'admin@asc-villejuif.fr'),
('Match Seniors B vs Ivry',    'match',    'Football', 8, 'Seniors B',     'Réserve',      'CS Ivry',                   1, 'Stade Municipal Villejuif', '2024-01-21 11:00:00', '2024-01-21 13:00:00', 90,  'scheduled', NULL, NULL, NULL, 'admin@asc-villejuif.fr');

-- ============================================================
-- BOOKINGS
-- ============================================================
INSERT INTO bookings (facility_id, facility_name, event_id, team_id, team_name, booked_by, start_time, end_time, purpose, status, cost) VALUES
(1, 'Stade Municipal Villejuif', 2,  7, 'Seniors A',     'admin@asc-villejuif.fr', '2024-01-13 15:00:00', '2024-01-13 17:00:00', 'Match Seniors A vs Cachan',  'confirmed', 0),
(1, 'Stade Municipal Villejuif', 8,  7, 'Seniors A',     'admin@asc-villejuif.fr', '2024-01-20 15:00:00', '2024-01-20 17:00:00', 'Match Seniors A vs Arcueil', 'confirmed', 0),
(2, 'Gymnase Jean Moulin',       5,  11,'Seniors Basket F','admin@asc-villejuif.fr','2024-01-11 20:00:00', '2024-01-11 22:00:00', 'Entraînement Basket',        'confirmed', 30),
(1, 'Stade Municipal Villejuif', 6,  4, 'U13 Football',  'admin@asc-villejuif.fr', '2024-01-20 09:00:00', '2024-01-20 17:00:00', 'Tournoi U13',                 'confirmed', 0);
