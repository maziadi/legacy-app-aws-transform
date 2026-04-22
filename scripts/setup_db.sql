-- ============================================================
-- Club Manager - Database Setup Script
-- Version: 3.1 (last touched 2023)
-- Run as: mysql -u root -p < setup_db.sql
-- WARNING: drops existing database!
-- NOTE: no migration versioning, just re-run this and lose all data
-- ============================================================

DROP DATABASE IF EXISTS club_manager;
CREATE DATABASE club_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE club_manager;

-- ============================================================
-- MEMBERS TABLE
-- Grew organically from 2015 to 2023 - many redundant columns
-- TODO: normalize this into member_profiles, member_subscriptions etc. - never done
-- ============================================================
CREATE TABLE members (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  -- name stored 3 ways because different parts of app use different columns
  first_name          VARCHAR(100)  NOT NULL,
  last_name           VARCHAR(100)  NOT NULL,
  full_name           VARCHAR(200),           -- redundant: always first+last
  email               VARCHAR(255)  NOT NULL UNIQUE,
  email2              VARCHAR(255),            -- added 2018 "for parents"
  phone               VARCHAR(20),
  phone2              VARCHAR(20),             -- added 2019
  address             VARCHAR(500),            -- should be normalized
  city                VARCHAR(100),
  zip                 VARCHAR(10),
  country             VARCHAR(100) DEFAULT 'France',
  birth_date          DATE,
  age                 INT,                     -- STALE: recalculated on save, never auto-updated
  gender              VARCHAR(10),
  photo               VARCHAR(500),
  -- passwords: migration to bcrypt planned in 2022, abandoned
  password_hash       VARCHAR(255),            -- MD5 (terrible)
  password_plain      VARCHAR(255),            -- plaintext "backup" (!!)
  role                VARCHAR(50) DEFAULT 'member',  -- should be FK to roles table
  status              VARCHAR(20) DEFAULT 'active',
  last_login          DATETIME,
  member_number       VARCHAR(20) UNIQUE,
  join_date           DATE,
  renewal_date        DATE,
  subscription_type   VARCHAR(50),
  subscription_amount DECIMAL(10,2),           -- redundant: from subscription_types lookup
  last_payment_date   DATE,                    -- redundant: max(payment_date) from payments
  total_paid          DECIMAL(10,2) DEFAULT 0, -- redundant: sum from payments
  sport               VARCHAR(200),            -- comma-separated (!!) should be junction table
  team_id             INT,                     -- no FK constraint added because "it was forgotten" 2015
  team_name           VARCHAR(100),            -- redundant: should join teams
  notes               TEXT,
  internal_notes      TEXT,
  emergency_contact   VARCHAR(200),
  medical_info        TEXT,                    -- stored unencrypted
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP,
  created_by          VARCHAR(100),
  -- soft delete added in v2 (2018)
  is_deleted          TINYINT(1) DEFAULT 0,
  deleted_at          TIMESTAMP NULL,
  deleted_by          VARCHAR(100),

  INDEX idx_email      (email),
  INDEX idx_status     (status),
  INDEX idx_team_id    (team_id),
  INDEX idx_deleted    (is_deleted)
  -- missing: index on renewal_date (causes slow queries monthly)
  -- missing: index on last_name (causes slow member search)
);

-- ============================================================
-- TEAMS TABLE
-- redundant coach columns because "it's faster than joining"
-- ============================================================
CREATE TABLE teams (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(200) NOT NULL,
  sport           VARCHAR(100) NOT NULL,
  category        VARCHAR(100),              -- 'U9','U11','U13','U15','U17','Senior','Veteran'
  coach_id        INT,                       -- no FK constraint
  coach_name      VARCHAR(200),              -- redundant
  coach_email     VARCHAR(255),              -- redundant
  season          VARCHAR(20),
  max_players     INT DEFAULT 20,
  current_players INT DEFAULT 0,             -- manually maintained, often wrong
  description     TEXT,
  status          VARCHAR(20) DEFAULT 'active',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_sport  (sport),
  INDEX idx_status (status)
);

-- ============================================================
-- EVENTS TABLE
-- team_name and facility_name stored redundantly for "quick access"
-- ============================================================
CREATE TABLE events (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  title            VARCHAR(500) NOT NULL,
  description      TEXT,
  event_type       VARCHAR(50),               -- 'match','training','tournament','meeting','other'
  sport            VARCHAR(100),
  team_id          INT,
  team_name        VARCHAR(200),              -- redundant
  opponent_name    VARCHAR(200),
  opponent_club    VARCHAR(200),
  location         VARCHAR(500),
  facility_id      INT,
  facility_name    VARCHAR(200),              -- redundant
  start_date       DATETIME,
  end_date         DATETIME,
  duration_minutes INT,                       -- redundant: calculable
  status           VARCHAR(20) DEFAULT 'scheduled',
  home_score       INT,
  away_score       INT,
  result           VARCHAR(20),               -- redundant: calculable from scores
  notes            TEXT,
  created_by       VARCHAR(100),
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_team_id    (team_id),
  INDEX idx_start_date (start_date),
  INDEX idx_status     (status)
);

-- event_participants: junction table added in v2
CREATE TABLE event_participants (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  event_id   INT NOT NULL,
  member_id  INT NOT NULL,
  added_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- no UNIQUE constraint, duplicates possible
  INDEX idx_event_id  (event_id),
  INDEX idx_member_id (member_id)
);

-- ============================================================
-- PAYMENTS TABLE
-- member_name and member_email stored redundantly
-- legacy columns from Excel migration 2017 never removed
-- ============================================================
CREATE TABLE payments (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  member_id       INT,
  member_name     VARCHAR(200),              -- redundant
  member_email    VARCHAR(255),              -- redundant
  amount          DECIMAL(10,2) NOT NULL,
  payment_type    VARCHAR(50),               -- 'subscription','equipment','event_fee','penalty','other'
  payment_method  VARCHAR(50),               -- 'cash','check','card','transfer'
  reference       VARCHAR(100),
  description     VARCHAR(500),
  payment_date    DATE,
  due_date        DATE,
  status          VARCHAR(20) DEFAULT 'paid',
  season          VARCHAR(20),
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NULL,
  created_by      VARCHAR(100),
  -- legacy Excel migration columns - never cleaned up
  old_reference          VARCHAR(100),
  legacy_system_id       VARCHAR(50),
  migrated_from_excel    TINYINT(1) DEFAULT 0,
  excel_row_number       INT,

  INDEX idx_member_id   (member_id),
  INDEX idx_status      (status),
  INDEX idx_season      (season),
  INDEX idx_payment_date(payment_date)
  -- missing index on (status, due_date) causes slow overdue queries
);

-- ============================================================
-- FACILITIES TABLE
-- columns added by different people at different times
-- ============================================================
CREATE TABLE facilities (
  id                     INT AUTO_INCREMENT PRIMARY KEY,
  name                   VARCHAR(200) NOT NULL,
  type                   VARCHAR(100),        -- 'field','gym','pool','court','room'
  capacity               INT DEFAULT 0,
  address                VARCHAR(500),
  is_available           TINYINT(1) DEFAULT 1,
  notes                  TEXT,
  hourly_rate            DECIMAL(10,2) DEFAULT 0,
  -- added in 2019 without coordination with existing columns
  maintenance_notes      TEXT,
  last_maintenance_date  DATE,
  contact_person         VARCHAR(200),
  contact_phone          VARCHAR(50),
  -- added 2021 for "smart booking" feature that was never built
  opening_hours          VARCHAR(200),
  color_code             VARCHAR(10),         -- for calendar display

  INDEX idx_type      (type),
  INDEX idx_available (is_available)
);

-- ============================================================
-- BOOKINGS TABLE
-- duration_hours redundant, booking_notes/notes duplication
-- ============================================================
CREATE TABLE bookings (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  facility_id     INT,
  facility_name   VARCHAR(200),              -- redundant
  event_id        INT,
  team_id         INT,
  team_name       VARCHAR(200),              -- redundant
  booked_by       VARCHAR(100),
  booked_by_name  VARCHAR(200),              -- redundant
  start_time      DATETIME,
  end_time        DATETIME,
  duration_hours  DECIMAL(4,2),              -- redundant: calculable
  purpose         TEXT,
  status          VARCHAR(20) DEFAULT 'confirmed',
  cost            DECIMAL(10,2) DEFAULT 0,
  paid            TINYINT(1) DEFAULT 0,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes           TEXT,
  booking_notes   TEXT,                      -- added later, duplicates notes (!!)

  INDEX idx_facility_id (facility_id),
  INDEX idx_start_time  (start_time),
  INDEX idx_event_id    (event_id)
);

-- ============================================================
-- AUDIT_LOG: was supposed to track all changes
-- abandoned after 3 months because "it was too slow"
-- table still exists, nothing writes to it
-- ============================================================
CREATE TABLE audit_log (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT,
  user_email  VARCHAR(255),
  action      VARCHAR(100),
  table_name  VARCHAR(100),
  record_id   INT,
  old_values  TEXT,
  new_values  TEXT,
  ip_address  VARCHAR(50),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- APP_SETTINGS: added in v3 but server.js still reads config.js
-- so this table is mostly unused
-- ============================================================
CREATE TABLE app_settings (
  setting_key   VARCHAR(100) PRIMARY KEY,
  setting_value TEXT,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO app_settings (setting_key, setting_value) VALUES
('club_name',    'ASC Villejuif Football'),
('season',       '2023-2024'),
('club_email',   'contact@asc-villejuif.fr');
