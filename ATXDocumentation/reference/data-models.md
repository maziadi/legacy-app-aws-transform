# Data Models — Club Manager v3

## Database Schema Overview

**Database**: `club_manager` (MySQL, utf8mb4/utf8mb4_unicode_ci)
**Source**: `scripts/setup_db.sql` (260 lines)
**Tables**: 8 (6 active, 2 unused)

---

## 1. `members` Table (Primary Entity)

The largest table with 30+ columns, many redundant. Grew organically from 2015 to 2023.

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| `id` | INT | PK, AUTO_INCREMENT | |
| `first_name` | VARCHAR(100) | NOT NULL | |
| `last_name` | VARCHAR(100) | NOT NULL | |
| `full_name` | VARCHAR(200) | | ⚠️ **Redundant**: always first_name + ' ' + last_name |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE | Primary login identifier |
| `email2` | VARCHAR(255) | | "For parents" — added 2018 |
| `phone` | VARCHAR(20) | | |
| `phone2` | VARCHAR(20) | | Added 2019 |
| `address` | VARCHAR(500) | | Should be normalized |
| `city` | VARCHAR(100) | | |
| `zip` | VARCHAR(10) | | |
| `country` | VARCHAR(100) | DEFAULT 'France' | |
| `birth_date` | DATE | | |
| `age` | INT | | ⚠️ **Redundant/Stale**: calculated on save, never auto-updated |
| `gender` | VARCHAR(10) | | |
| `photo` | VARCHAR(500) | | File path |
| `password_hash` | VARCHAR(255) | | MD5 hash (cryptographically broken) |
| `password_plain` | VARCHAR(255) | | ⚠️ **Security**: plaintext password storage |
| `role` | VARCHAR(50) | DEFAULT 'member' | 'member', 'coach', 'admin', 'superadmin' |
| `status` | VARCHAR(20) | DEFAULT 'active' | 'active', 'inactive' |
| `last_login` | DATETIME | | |
| `member_number` | VARCHAR(20) | UNIQUE | Format: M00001 |
| `join_date` | DATE | | |
| `renewal_date` | DATE | | ⚠️ **Missing index** (causes slow monthly queries) |
| `subscription_type` | VARCHAR(50) | | 'annual_adult', 'annual_junior', etc. |
| `subscription_amount` | DECIMAL(10,2) | | ⚠️ **Redundant**: lookup from subscription_types |
| `last_payment_date` | DATE | | ⚠️ **Redundant**: MAX(payment_date) from payments |
| `total_paid` | DECIMAL(10,2) | DEFAULT 0 | ⚠️ **Redundant**: SUM from payments |
| `sport` | VARCHAR(200) | | ⚠️ **Anti-pattern**: comma-separated values |
| `team_id` | INT | | ⚠️ **Missing FK** constraint to teams.id |
| `team_name` | VARCHAR(100) | | ⚠️ **Redundant**: available via JOIN to teams |
| `notes` | TEXT | | |
| `internal_notes` | TEXT | | |
| `emergency_contact` | VARCHAR(200) | | |
| `medical_info` | TEXT | | ⚠️ **Unencrypted** sensitive data |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |
| `updated_at` | TIMESTAMP | | |
| `created_by` | VARCHAR(100) | | |
| `is_deleted` | TINYINT(1) | DEFAULT 0 | Soft delete flag |
| `deleted_at` | TIMESTAMP | NULL | |
| `deleted_by` | VARCHAR(100) | | |

**Indexes**: `idx_email(email)`, `idx_status(status)`, `idx_team_id(team_id)`, `idx_deleted(is_deleted)`
**Missing Indexes**: `renewal_date`, `last_name` (causes slow queries)

---

## 2. `teams` Table

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| `id` | INT | PK, AUTO_INCREMENT | |
| `name` | VARCHAR(200) | NOT NULL | |
| `sport` | VARCHAR(100) | NOT NULL | |
| `category` | VARCHAR(100) | | 'U9','U11','U13','U15','U17','Senior','Veteran' |
| `coach_id` | INT | | ⚠️ **Missing FK** to members.id |
| `coach_name` | VARCHAR(200) | | ⚠️ **Redundant** |
| `coach_email` | VARCHAR(255) | | ⚠️ **Redundant** |
| `season` | VARCHAR(20) | | |
| `max_players` | INT | DEFAULT 20 | |
| `current_players` | INT | DEFAULT 0 | ⚠️ **Redundant/Stale**: manually maintained |
| `description` | TEXT | | |
| `status` | VARCHAR(20) | DEFAULT 'active' | 'active', 'archived' |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |

**Indexes**: `idx_sport(sport)`, `idx_status(status)`

---

## 3. `events` Table

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| `id` | INT | PK, AUTO_INCREMENT | |
| `title` | VARCHAR(500) | NOT NULL | |
| `description` | TEXT | | |
| `event_type` | VARCHAR(50) | | 'match','training','tournament','meeting','other' |
| `sport` | VARCHAR(100) | | |
| `team_id` | INT | | ⚠️ **Missing FK** |
| `team_name` | VARCHAR(200) | | ⚠️ **Redundant** |
| `opponent_name` | VARCHAR(200) | | |
| `opponent_club` | VARCHAR(200) | | |
| `location` | VARCHAR(500) | | |
| `facility_id` | INT | | ⚠️ **Missing FK** |
| `facility_name` | VARCHAR(200) | | ⚠️ **Redundant** |
| `start_date` | DATETIME | | |
| `end_date` | DATETIME | | |
| `duration_minutes` | INT | | ⚠️ **Redundant**: calculable from dates |
| `status` | VARCHAR(20) | DEFAULT 'scheduled' | 'scheduled','completed','cancelled' |
| `home_score` | INT | | |
| `away_score` | INT | | |
| `result` | VARCHAR(20) | | ⚠️ **Redundant**: calculable from scores |
| `notes` | TEXT | | |
| `created_by` | VARCHAR(100) | | |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |

**Indexes**: `idx_team_id(team_id)`, `idx_start_date(start_date)`, `idx_status(status)`

---

## 4. `event_participants` Table (Junction)

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| `id` | INT | PK, AUTO_INCREMENT | |
| `event_id` | INT | NOT NULL | ⚠️ **Missing FK**, no UNIQUE constraint |
| `member_id` | INT | NOT NULL | ⚠️ **Missing FK** |
| `added_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |

**Indexes**: `idx_event_id(event_id)`, `idx_member_id(member_id)`
**Missing**: UNIQUE constraint on `(event_id, member_id)` — duplicates possible (mitigated by INSERT IGNORE in code)

---

## 5. `payments` Table

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| `id` | INT | PK, AUTO_INCREMENT | |
| `member_id` | INT | | ⚠️ **Missing FK** |
| `member_name` | VARCHAR(200) | | ⚠️ **Redundant** |
| `member_email` | VARCHAR(255) | | ⚠️ **Redundant** |
| `amount` | DECIMAL(10,2) | NOT NULL | No validation (can be 0 or negative) |
| `payment_type` | VARCHAR(50) | | 'subscription','equipment','event_fee','penalty','other' |
| `payment_method` | VARCHAR(50) | | 'cash','check','card','transfer' |
| `reference` | VARCHAR(100) | | Check/transfer reference |
| `description` | VARCHAR(500) | | Also used for reminder notes (appended) |
| `payment_date` | DATE | | |
| `due_date` | DATE | | |
| `status` | VARCHAR(20) | DEFAULT 'paid' | 'paid','pending' |
| `season` | VARCHAR(20) | | |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |
| `updated_at` | TIMESTAMP | NULL | |
| `created_by` | VARCHAR(100) | | |
| `old_reference` | VARCHAR(100) | | ⚠️ **Legacy**: Excel migration column |
| `legacy_system_id` | VARCHAR(50) | | ⚠️ **Legacy**: Excel migration column |
| `migrated_from_excel` | TINYINT(1) | DEFAULT 0 | ⚠️ **Legacy**: Excel migration flag |
| `excel_row_number` | INT | | ⚠️ **Legacy**: Excel migration column |

**Indexes**: `idx_member_id(member_id)`, `idx_status(status)`, `idx_season(season)`, `idx_payment_date(payment_date)`
**Missing Index**: Composite `(status, due_date)` — causes slow overdue payment queries

---

## 6. `facilities` Table

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| `id` | INT | PK, AUTO_INCREMENT | |
| `name` | VARCHAR(200) | NOT NULL | |
| `type` | VARCHAR(100) | | 'field','gym','pool','court','room' |
| `capacity` | INT | DEFAULT 0 | |
| `address` | VARCHAR(500) | | |
| `is_available` | TINYINT(1) | DEFAULT 1 | |
| `notes` | TEXT | | |
| `hourly_rate` | DECIMAL(10,2) | DEFAULT 0 | |
| `maintenance_notes` | TEXT | | Added 2019 |
| `last_maintenance_date` | DATE | | Added 2019 |
| `contact_person` | VARCHAR(200) | | |
| `contact_phone` | VARCHAR(50) | | |
| `opening_hours` | VARCHAR(200) | | Added 2021 for unbuilt feature |
| `color_code` | VARCHAR(10) | | For calendar display |

**Indexes**: `idx_type(type)`, `idx_available(is_available)`

---

## 7. `bookings` Table

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| `id` | INT | PK, AUTO_INCREMENT | |
| `facility_id` | INT | | ⚠️ **Missing FK** |
| `facility_name` | VARCHAR(200) | | ⚠️ **Redundant** |
| `event_id` | INT | | |
| `team_id` | INT | | |
| `team_name` | VARCHAR(200) | | ⚠️ **Redundant** |
| `booked_by` | VARCHAR(100) | | |
| `booked_by_name` | VARCHAR(200) | | ⚠️ **Redundant** |
| `start_time` | DATETIME | | |
| `end_time` | DATETIME | | |
| `duration_hours` | DECIMAL(4,2) | | ⚠️ **Redundant**: calculable |
| `purpose` | TEXT | | |
| `status` | VARCHAR(20) | DEFAULT 'confirmed' | |
| `cost` | DECIMAL(10,2) | DEFAULT 0 | |
| `paid` | TINYINT(1) | DEFAULT 0 | |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |
| `notes` | TEXT | | |
| `booking_notes` | TEXT | | ⚠️ **Duplicate** of notes column |

**Indexes**: `idx_facility_id(facility_id)`, `idx_start_time(start_time)`, `idx_event_id(event_id)`

---

## 8. `audit_log` Table (UNUSED)

Created for change tracking but abandoned after 3 months. No application code writes to this table.

| Column | Type | Notes |
|--------|------|-------|
| `id` | INT | PK |
| `user_id` | INT | |
| `user_email` | VARCHAR(255) | |
| `action` | VARCHAR(100) | |
| `table_name` | VARCHAR(100) | |
| `record_id` | INT | |
| `old_values` | TEXT | |
| `new_values` | TEXT | |
| `ip_address` | VARCHAR(50) | |
| `created_at` | TIMESTAMP | |

---

## 9. `app_settings` Table (UNUSED)

Created in v3 but server reads `config.js` instead. Contains 3 initial rows never updated by application.

| Column | Type | Notes |
|--------|------|-------|
| `setting_key` | VARCHAR(100) | PK |
| `setting_value` | TEXT | |
| `updated_at` | TIMESTAMP | ON UPDATE |

**Initial data**: club_name, season, club_email

---

## Entity Relationships (Conceptual)

```
members ──┬── 1:N ──→ payments (via member_id, NO FK)
          ├── N:M ──→ events (via event_participants, NO FK)
          └── N:1 ──→ teams (via team_id, NO FK)

teams ────┬── 1:N ──→ events (via team_id, NO FK)
          └── 1:1 ──→ members as coach (via coach_id, NO FK)

events ───── 1:1 ──→ bookings (via event_id, NO FK)

facilities ── 1:N ──→ bookings (via facility_id, NO FK)
```

**⚠️ No foreign key constraints exist anywhere in the schema.** Referential integrity is entirely application-dependent.

## Cross-References

- [Program Structure](program-structure.md) — File tree
- [Interfaces](interfaces.md) — API contracts
- [Modules](api-reference.md) — Module organization
- [Maintenance Burden](../technical-debt/maintenance-burden.md) — Schema debt
