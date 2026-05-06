-- ============================================================
-- Integration Test Schema — PostgreSQL
-- Compatible with the MySQL schema used in production.
-- Used by GitHub Actions service container (postgres:15).
-- ============================================================

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS event_participants;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS facilities;
DROP TABLE IF EXISTS members;
DROP TABLE IF EXISTS teams;

-- ============================================================
-- TEAMS
-- ============================================================
CREATE TABLE teams (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(200) NOT NULL,
  sport           VARCHAR(100) NOT NULL,
  category        VARCHAR(100),
  coach_id        INT,
  coach_name      VARCHAR(200),
  coach_email     VARCHAR(255),
  season          VARCHAR(20),
  max_players     INT DEFAULT 20,
  current_players INT DEFAULT 0,
  description     TEXT,
  status          VARCHAR(20) DEFAULT 'active',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- MEMBERS
-- ============================================================
CREATE TABLE members (
  id                  SERIAL PRIMARY KEY,
  first_name          VARCHAR(100)  NOT NULL,
  last_name           VARCHAR(100)  NOT NULL,
  full_name           VARCHAR(200),
  email               VARCHAR(255)  NOT NULL UNIQUE,
  email2              VARCHAR(255),
  phone               VARCHAR(20),
  phone2              VARCHAR(20),
  address             VARCHAR(500),
  city                VARCHAR(100),
  zip                 VARCHAR(10),
  country             VARCHAR(100) DEFAULT 'France',
  birth_date          DATE,
  age                 INT,
  gender              VARCHAR(10),
  photo               VARCHAR(500),
  password_hash       VARCHAR(255),
  password_plain      VARCHAR(255),
  role                VARCHAR(50) DEFAULT 'member',
  status              VARCHAR(20) DEFAULT 'active',
  last_login          TIMESTAMP,
  member_number       VARCHAR(20) UNIQUE,
  join_date           DATE,
  renewal_date        DATE,
  subscription_type   VARCHAR(50),
  subscription_amount DECIMAL(10,2),
  last_payment_date   DATE,
  total_paid          DECIMAL(10,2) DEFAULT 0,
  sport               VARCHAR(200),
  team_id             INT,
  team_name           VARCHAR(100),
  notes               TEXT,
  internal_notes      TEXT,
  emergency_contact   VARCHAR(200),
  medical_info        TEXT,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP,
  created_by          VARCHAR(100),
  is_deleted          SMALLINT DEFAULT 0,
  deleted_at          TIMESTAMP,
  deleted_by          VARCHAR(100)
);

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE payments (
  id              SERIAL PRIMARY KEY,
  member_id       INT,
  member_name     VARCHAR(200),
  member_email    VARCHAR(255),
  amount          DECIMAL(10,2) NOT NULL,
  payment_type    VARCHAR(50),
  payment_method  VARCHAR(50),
  reference       VARCHAR(100),
  description     VARCHAR(500),
  payment_date    DATE,
  due_date        DATE,
  status          VARCHAR(20) DEFAULT 'paid',
  season          VARCHAR(20),
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP,
  created_by      VARCHAR(100),
  old_reference          VARCHAR(100),
  legacy_system_id       VARCHAR(50),
  migrated_from_excel    SMALLINT DEFAULT 0,
  excel_row_number       INT
);

-- ============================================================
-- FACILITIES
-- ============================================================
CREATE TABLE facilities (
  id                     SERIAL PRIMARY KEY,
  name                   VARCHAR(200) NOT NULL,
  type                   VARCHAR(100),
  capacity               INT DEFAULT 0,
  address                VARCHAR(500),
  is_available           SMALLINT DEFAULT 1,
  notes                  TEXT,
  hourly_rate            DECIMAL(10,2) DEFAULT 0,
  maintenance_notes      TEXT,
  last_maintenance_date  DATE,
  contact_person         VARCHAR(200),
  contact_phone          VARCHAR(50),
  opening_hours          VARCHAR(200),
  color_code             VARCHAR(10)
);

-- ============================================================
-- EVENTS
-- ============================================================
CREATE TABLE events (
  id               SERIAL PRIMARY KEY,
  title            VARCHAR(500) NOT NULL,
  description      TEXT,
  event_type       VARCHAR(50),
  sport            VARCHAR(100),
  team_id          INT,
  team_name        VARCHAR(200),
  opponent_name    VARCHAR(200),
  opponent_club    VARCHAR(200),
  location         VARCHAR(500),
  facility_id      INT,
  facility_name    VARCHAR(200),
  start_date       TIMESTAMP,
  end_date         TIMESTAMP,
  duration_minutes INT,
  status           VARCHAR(20) DEFAULT 'scheduled',
  home_score       INT,
  away_score       INT,
  result           VARCHAR(20),
  notes            TEXT,
  created_by       VARCHAR(100),
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- BOOKINGS
-- ============================================================
CREATE TABLE bookings (
  id              SERIAL PRIMARY KEY,
  facility_id     INT,
  facility_name   VARCHAR(200),
  event_id        INT,
  team_id         INT,
  team_name       VARCHAR(200),
  booked_by       VARCHAR(100),
  booked_by_name  VARCHAR(200),
  start_time      TIMESTAMP,
  end_time        TIMESTAMP,
  duration_hours  DECIMAL(4,2),
  purpose         TEXT,
  status          VARCHAR(20) DEFAULT 'confirmed',
  cost            DECIMAL(10,2) DEFAULT 0,
  paid            SMALLINT DEFAULT 0,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes           TEXT,
  booking_notes   TEXT
);

-- ============================================================
-- EVENT_PARTICIPANTS
-- ============================================================
CREATE TABLE event_participants (
  id         SERIAL PRIMARY KEY,
  event_id   INT NOT NULL,
  member_id  INT NOT NULL,
  added_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
