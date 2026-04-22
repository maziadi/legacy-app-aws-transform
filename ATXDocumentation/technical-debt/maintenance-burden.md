# Maintenance Burden

## Overview

The Club Manager v3 codebase has accumulated significant maintenance burden through incomplete refactors, architectural shortcuts, and copy-paste coding practices over its 9-year history (2015–2024).

## Architectural Debt

### 1. Monolithic Service Layer (High Maintenance Burden)
- **File**: `services/ClubService.js` — 929 lines
- **Issue**: Single file contains ALL business logic for members, payments, teams, events, facilities, reporting, email, exports, and utilities
- **Impact**: Every feature change requires working in this single, complex file; high merge conflict risk
- **Planned Fix (Never Completed)**: Was supposed to be split into MemberService, PaymentService, TeamService, etc. in v3 refactor of 2021
- **Recommendation**: Split into domain-specific services with clear interfaces

### 2. Incomplete Route Migration (Medium Maintenance Burden)
- **Files**: `server.js` (343 lines) retains login, dashboard, profile, search, settings, import, and API routes
- **Issue**: Routes partially migrated to `routes/` directory in 2019 by Karim; never finished
- **Impact**: Duplicate login routes exist in both `server.js` and `routes/auth.js` with slightly different behavior
- **Recommendation**: Complete migration of all routes from server.js to route modules

### 3. Denormalized Database Schema (High Maintenance Burden)
- **File**: `scripts/setup_db.sql`
- **Redundant Columns**:
  - `members.full_name` (concatenation of first_name + last_name)
  - `members.age` (calculable from birth_date, becomes stale)
  - `members.team_name` (available via JOIN to teams)
  - `members.total_paid` (calculable from payments SUM)
  - `members.last_payment_date` (calculable from payments MAX)
  - `payments.member_name`, `payments.member_email` (available via JOIN)
  - `events.team_name`, `events.facility_name` (available via JOINs)
  - `events.duration_minutes` (calculable from start_date/end_date)
  - `events.result` (calculable from home_score/away_score)
  - `teams.coach_name`, `teams.coach_email` (available via JOIN)
  - `teams.current_players` (calculable from COUNT of members)
  - `bookings.facility_name`, `bookings.team_name`, `bookings.booked_by_name` (available via JOINs)
  - `bookings.duration_hours` (calculable from start_time/end_time)
  - `bookings.notes` and `bookings.booking_notes` (duplicate columns)
- **Missing Foreign Keys**: `members.team_id`, `events.team_id`, `events.facility_id`, `payments.member_id`, `bookings.facility_id`, `bookings.event_id`, `teams.coach_id` — none have FK constraints
- **Missing Indexes**: `members.renewal_date`, `members.last_name`, `payments.(status, due_date)` composite index
- **Impact**: Data integrity issues, stale data, larger query results, more complex update logic

### 4. N+1 Query Pattern (Medium Maintenance Burden)
- **Locations**:
  - `server.js` dashboard: 7 sequential nested queries
  - `ClubService.getAllMembers`: fetches latest payment for EACH member individually
  - `ClubService.getMemberById`: 4 sequential queries (member, team, payments, events)
  - `ClubService.getTeamById`: 4 sequential queries (team, members, events, coach)
  - `ClubService.getEvents`: counts participants for EACH event individually
  - `routes/facilities.js` GET /: fetches next booking for EACH facility
  - `routes/teams.js` GET /:id/stats: 6 sequential queries for stats
  - `server.js` profile: 3 sequential queries
- **Impact**: Severe performance degradation as data grows; multiple DB roundtrips per page load

## Code Duplication

### 1. Auth Middleware Duplication (Medium)
- **Centralized version**: `middleware/auth.js` (never imported by any route)
- **Duplicated in**: `server.js`, `routes/members.js`, `routes/teams.js`, `routes/events.js`, `routes/payments.js`, `routes/facilities.js`, `routes/reports.js`
- **Inconsistency**: Teams and events check for `coach` role; members, payments, facilities, and reports only check `admin`/`superadmin`
- **Impact**: Bug fixes must be applied in 7+ locations; role logic inconsistent

### 2. Utility Function Duplication (Medium)
- `formatDate()` — in ClubService.js AND helpers.js
- `formatCurrency()` — in ClubService.js AND helpers.js
- `isMembershipExpired()` — in ClubService.js AND helpers.js
- `generateMemberNumber()` — in ClubService.js AND helpers.js
- `calculateAge()` — in ClubService.createMember() AND helpers.js
- `getSubscriptionAmount()` — in helpers.js AND app.js (frontend)

### 3. Subscription Amount Constants (Medium)
- Hardcoded in: `config.js` (`config.subscriptions`), `utils/helpers.js` (`getSubscriptionAmount()`), `public/js/app.js` (`subscriptionPrices`)
- **Impact**: Price changes must be updated in 3 separate locations

### 4. Login Logic Duplication (Medium)
- Full login flow duplicated between `server.js` POST `/login` and `routes/auth.js` POST `/login`
- Slight behavioral differences (one checks `status = 'active'`, the other doesn't)
- Both contain the admin backdoor check

### 5. CSV Export Pattern (Low)
- `ClubService.exportMembersCSV` and `ClubService.exportPaymentsCSV` are near-identical patterns
- Manual CSV construction without escaping

## Callback Hell

### Nesting Depth Analysis
| Location | Max Nesting | Description |
|----------|-------------|-------------|
| `server.js` dashboard | 7 levels | 7 sequential DB queries nested in callbacks |
| `routes/teams.js` stats | 6 levels | 6 sequential stat queries |
| `ClubService.createMember` | 5 levels | COUNT → team name → INSERT → welcome email |
| `ClubService.createEvent` | 4 levels | team name → facility name → INSERT → booking |
| `ClubService.getMemberById` | 4 levels | member → team → payments → events |
| `ClubService.sendPaymentReminders` | 3 levels | getOverdue → loop → sendEmail |

- **Impact**: Code is extremely difficult to read, debug, and maintain; error handling is inconsistent
- **Recommendation**: Migrate to Promises/async-await (mysql2 supports Promise API)

## Unused/Dead Code

| Item | Location | Notes |
|------|----------|-------|
| `middleware/auth.js` | middleware/ | Exported but never imported by any route |
| `audit_log` table | setup_db.sql | Created but nothing writes to it |
| `app_settings` table | setup_db.sql | Created but server.js reads config.js instead |
| Chart.js integration | app.js line ~60 | Contains `console.log('Chart.js integration TODO')` |
| Dark mode CSS | style.css | Commented out experiment |
| `csv-parser` package | package.json | Listed but no CSV import functionality implemented |
| `express-fileupload` package | package.json | Listed but file upload routes use `multer` or are unimplemented |
| AJAX payment status | app.js | Commented out, disabled |

## Cross-References

- [Technical Debt Report](../technical-debt-report.md) — Executive summary
- [Summary](summary.md) — Debt overview
- [Outdated Components](outdated-components.md) — Version analysis
- [Remediation Plan](remediation-plan.md) — Prioritized fixes
- [Complexity Analysis](../analysis/complexity-analysis.md) — Detailed complexity metrics
- [Code Metrics](../analysis/code-metrics.md) — Lines of code breakdown
