# Specialized: Database Documentation — Club Manager v3

## Database Overview

- **Engine**: MySQL (version unspecified)
- **Character Set**: utf8mb4 / utf8mb4_unicode_ci
- **Driver**: mysql2 3.9.7
- **Connection**: Pool (10 connections, localhost:3306, root user, no password)
- **Schema Source**: `scripts/setup_db.sql`

## Table Summary

| Table | Columns | Indexes | FK Constraints | Status |
|-------|---------|---------|---------------|--------|
| `members` | 35 | 4 | 0 | Active — primary entity |
| `teams` | 13 | 2 | 0 | Active |
| `events` | 21 | 3 | 0 | Active |
| `event_participants` | 4 | 2 | 0 | Active (junction) |
| `payments` | 20 | 4 | 0 | Active |
| `facilities` | 14 | 2 | 0 | Active |
| `bookings` | 17 | 3 | 0 | Active |
| `audit_log` | 10 | 0 | 0 | **Unused** — nothing writes to it |
| `app_settings` | 3 | PK | 0 | **Unused** — config.js used instead |

## Denormalization Issues

### Redundant Columns (stored but derivable from JOINs/computation)

| Table | Column | Source of Truth | Impact |
|-------|--------|----------------|--------|
| members | full_name | first_name + last_name | Stale if name updated separately |
| members | age | Calculated from birth_date | Stale immediately after save |
| members | team_name | teams.name via JOIN | Stale if team renamed |
| members | total_paid | SUM(payments.amount) | Stale if payment modified |
| members | last_payment_date | MAX(payments.payment_date) | Stale if payment modified |
| members | subscription_amount | config.subscriptions[type] | Stale if prices change |
| payments | member_name | members.first_name + last_name | Stale if member name updated |
| payments | member_email | members.email | Stale if email updated |
| events | team_name | teams.name | Stale if team renamed |
| events | facility_name | facilities.name | Stale if facility renamed |
| events | duration_minutes | end_date - start_date | Stale if dates updated |
| events | result | Derived from home_score vs away_score | Redundant |
| teams | coach_name | members.first_name + last_name | Stale if coach name changes |
| teams | coach_email | members.email | Stale |
| teams | current_players | COUNT(members WHERE team_id) | Stale, manually maintained |
| bookings | facility_name | facilities.name | Stale |
| bookings | team_name | teams.name | Stale |
| bookings | booked_by_name | Derived from booked_by | Redundant |
| bookings | duration_hours | end_time - start_time | Redundant |

### Missing Foreign Key Constraints

| Table | Column | Should Reference |
|-------|--------|-----------------|
| members | team_id | teams(id) |
| teams | coach_id | members(id) |
| events | team_id | teams(id) |
| events | facility_id | facilities(id) |
| event_participants | event_id | events(id) |
| event_participants | member_id | members(id) |
| payments | member_id | members(id) |
| bookings | facility_id | facilities(id) |
| bookings | event_id | events(id) |
| bookings | team_id | teams(id) |

### Missing Indexes

| Table | Column(s) | Query Impact |
|-------|-----------|-------------|
| members | renewal_date | Monthly renewal queries slow |
| members | last_name | Member search slow |
| payments | (status, due_date) | Overdue payment queries full table scan |
| event_participants | (event_id, member_id) UNIQUE | Duplicate participants possible |

### Legacy Columns (from Excel migration 2017)

| Table | Column | Notes |
|-------|--------|-------|
| payments | old_reference | Never used in application code |
| payments | legacy_system_id | Never used |
| payments | migrated_from_excel | Flag, never checked |
| payments | excel_row_number | Never used |

## Query Patterns

### N+1 Patterns (performance anti-pattern)
- `ClubService.getAllMembers`: 1 query for members + N queries for last payment
- `ClubService.getEvents`: 1 query for events + N queries for participant count
- `routes/facilities.js`: 1 query for facilities + N queries for next booking
- `server.js` dashboard: 7 sequential queries (not N+1 but sequential)

### String Concatenation in SQL (injection vulnerability)
- `server.js` login: email concatenated into WHERE clause
- `server.js` search: search term concatenated into LIKE clauses
- `routes/auth.js` login: email concatenated
- `ClubService.getFinancialReport`: year with parseInt() only

## Cross-References

- [Data Models](../reference/data-models.md) — Full schema documentation
- [Security Patterns](../analysis/security-patterns.md) — SQL injection details
- [Maintenance Burden](../technical-debt/maintenance-burden.md) — Schema debt
