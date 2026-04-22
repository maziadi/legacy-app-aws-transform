# Components — Club Manager v3

## Component Overview

The application consists of the following major components organized by layer:

## 1. Entry Point — `server.js` (343 lines)

**Responsibilities:**
- Express application initialization and middleware configuration
- Session management setup
- View engine configuration (EJS)
- Static file serving (public/)
- Global request logging
- User injection into view locals
- Route mounting for all 7 route modules
- Inline routes: login/logout, dashboard, profile, search, settings, CSV import, stats API, 404/500 handlers
- Server startup on configurable port (default 3000)

**Exports:** `module.exports = app` (Express application instance)

**Key Issues:**
- Contains duplicate login routes (also in routes/auth.js)
- Dashboard route has 7 nested callbacks (N+1 pattern)
- SQL injection in login and search endpoints
- Inline auth middleware (duplicated from middleware/auth.js)

## 2. Configuration — `config.js` (95 lines)

**Responsibilities:**
- Database connection settings (host, user, password, port, pool size)
- Session configuration (secret, cookie settings)
- SMTP email settings (host, port, credentials)
- Application settings (port, club name, season, paths)
- Subscription pricing constants
- Admin backdoor credentials
- Server filesystem paths
- Feature flags (all hardcoded booleans)

**Exports:** `module.exports = config` (configuration object)

**Key Issues:**
- All credentials hardcoded (DB root with empty password, SMTP password, admin backdoor)
- Session secret never rotated ("ClubManager_Session_Secret_2015_NeverChange")
- `multipleStatements: true` enables SQL multi-statement injection risk
- Season manually updated each year

## 3. Database Layer — `database.js` (79 lines)

**Responsibilities:**
- MySQL connection pool creation via mysql2
- Global `query(sql, params, callback)` function
- Connection getter for transactions (`getConnection`)
- SQL debug logging (always-on in production)
- Connection validation on startup

**Exports:** `{ query, getConnection, pool }`

**Key Issues:**
- Always logs truncated SQL to console (performance/security concern)
- Direct pool exposure allows inconsistent access patterns
- No Promise/async-await support despite mysql2 capability
- Startup connection failure doesn't exit process

## 4. Business Logic — `services/ClubService.js` (929 lines)

**Responsibilities:**
- **Member Management**: getAllMembers, getMemberById, createMember, updateMember, deleteMember
- **Payment Management**: getPayments, recordPayment, getOverduePayments, getPendingPayments, sendPaymentReminders
- **Team Management**: getAllTeams, getTeamById, createTeam, updateTeam
- **Event Management**: getEvents, createEvent, recordMatchResult
- **Facility Management**: getFacilities, checkFacilityAvailability, getBookings
- **Reporting**: getMembershipReport, getFinancialReport, getDashboardStats
- **Email**: getTransporter, sendEmail, sendWelcomeEmail, sendPaymentReceipt, sendEventReminder
- **Export**: exportMembersCSV, exportPaymentsCSV
- **Utilities**: formatDate, formatCurrency, generateMemberNumber, resetPassword, isMembershipExpired, checkRenewals, backupDatabase

**Exports:** `module.exports = ClubService` (object with all methods)

**Key Issues:**
- Monolithic: 929 lines covering 9 domains in a single file
- N+1 query patterns in most methods
- Callback hell with up to 5 levels of nesting
- MD5 password hashing
- Plaintext password storage
- Fire-and-forget email sending (errors swallowed)
- Creates new SMTP transport on every email call
- Manual CSV generation without escaping
- Shell execution for database backup with credentials in command

## 5. Route Modules (7 files)

### `routes/auth.js` (79 lines)
- GET/POST `/auth/login` — duplicate of server.js login
- GET `/auth/logout`
- GET/POST `/auth/forgot-password` — password reset

### `routes/members.js` (270 lines)
- GET `/members` — list with filters
- GET/POST `/members/new`, `/members` — create
- GET `/members/:id` — detail view
- GET/POST `/members/:id/edit`, `/members/:id/update` — update
- POST `/members/:id/delete` — soft delete
- POST `/members/:id/renew` — membership renewal (business logic in route!)
- GET `/members/:id/certificate` — text certificate
- GET `/members/export/csv` — CSV export
- POST `/members/send-reminders` — renewal email reminders

### `routes/teams.js` (125 lines)
- GET `/teams` — list all teams
- GET/POST `/teams/new`, `/teams` — create
- GET `/teams/:id` — detail with members and events
- GET/POST `/teams/:id/edit`, `/teams/:id/update` — update
- POST `/teams/:id/delete` — archive (status change)
- GET `/teams/:id/stats` — team match statistics (6 nested queries)

### `routes/events.js` (142 lines)
- GET `/events` — list with filters
- GET `/events/calendar` — monthly calendar view
- GET/POST `/events/new`, `/events` — create
- GET `/events/:id` — detail with participants
- POST `/events/:id/result` — record match result
- POST `/events/:id/cancel` — cancel event and linked booking
- POST `/events/:id/participants` — add participant

### `routes/payments.js` (152 lines)
- GET `/payments` — list with filters and totals
- GET `/payments/overdue` — overdue payments
- GET/POST `/payments/new`, `/payments` — record payment
- GET `/payments/:id` — payment detail
- POST `/payments/:id/status` — update status
- POST `/payments/send-reminders` — send overdue reminders
- GET `/payments/export/csv` — CSV export

### `routes/facilities.js` (102 lines)
- GET `/facilities` — list with next bookings
- GET/POST `/facilities/new`, `/facilities` — create
- GET `/facilities/:id` — detail with upcoming bookings
- GET `/facilities/:id/schedule` — weekly schedule view

### `routes/reports.js` (122 lines)
- GET `/reports` — report index
- GET `/reports/membership` — membership statistics
- GET `/reports/financial` — financial summary
- GET `/reports/activity` — team activity report
- GET `/reports/birthdays` — birthday list by month
- GET `/reports/renewals` — upcoming renewals
- POST `/reports/backup` — trigger manual DB backup

## 6. Middleware — `middleware/auth.js` (42 lines)

**Exports:** `{ requireLogin, requireAdmin, requireCoachOrAdmin }`

**Key Issue:** Created in 2019 but **never imported by any route module**. Every route file has its own inline copy of these functions.

## 7. Utilities — `utils/helpers.js` (147 lines)

**Exports:** 17 utility functions (formatDate, formatDateTime, formatCurrency, generateMemberNumber, isValidEmail, truncate, capitalize, capitalizeName, calculateAge, isMembershipExpired, daysUntilRenewal, formatPhone, sportLabelClass, getCurrentSeason, sanitize, padNumber, getSubscriptionAmount)

**Key Issue:** Many functions duplicated in ClubService.js and route files. The helpers module exists but is never imported in any backend file.

## 8. Frontend Assets

### `public/js/app.js` (110 lines)
- jQuery-based client-side functionality
- Auto-dismiss alerts, form validation, subscription price auto-fill, phone formatting
- Tooltip initialization, dropdown fixes, search minimum length check
- Incomplete Chart.js integration placeholder

### `public/css/style.css` (94 lines)
- Bootstrap 3 overrides (navbar, panels, tables)
- Dashboard KPI card styles
- Print and mobile media queries
- Various accumulated CSS hacks

## 9. View Templates (35 EJS files)

| Directory | Files | Purpose |
|-----------|-------|---------|
| `views/` | `layout.ejs`, `dashboard.ejs`, `dashboard_content.ejs`, `search.ejs`, `settings.ejs` | Layout, dashboard, search, settings |
| `views/auth/` | `login.ejs`, `forgot.ejs` | Authentication |
| `views/admin/` | `import.ejs` | CSV import (stub) |
| `views/members/` | `list.ejs`, `detail.ejs`, `form.ejs`, `profile.ejs` | Member CRUD |
| `views/teams/` | `list.ejs`, `detail.ejs`, `form.ejs`, `stats.ejs` | Team CRUD and stats |
| `views/events/` | `list.ejs`, `detail.ejs`, `form.ejs`, `calendar.ejs` | Event CRUD and calendar |
| `views/facilities/` | `list.ejs`, `detail.ejs`, `form.ejs`, `schedule.ejs` | Facility CRUD and schedule |
| `views/payments/` | `list.ejs`, `detail.ejs`, `form.ejs`, `overdue.ejs` | Payment CRUD |
| `views/reports/` | `index.ejs`, `membership.ejs`, `financial.ejs`, `activity.ejs`, `birthdays.ejs`, `renewals.ejs` | Reports |
| `views/partials/` | `navbar.ejs` | Shared navigation bar |

## 10. Scripts

| Script | Lines | Purpose |
|--------|-------|---------|
| `scripts/setup_db.sql` | 260 | Database schema creation (drops existing DB!) |
| `scripts/seed.sql` | 192 | Sample data for development/testing |
| `scripts/deploy.sh` | 58 | Manual rsync deployment to production |
| `scripts/backup.sh` | 45 | Manual MySQL backup (should be cron, never set up) |

## Cross-References

- [System Overview](system-overview.md) — Architecture and technology stack
- [Dependencies](dependencies.md) — Internal and external dependency mapping
- [Patterns](patterns.md) — Design patterns and anti-patterns
- [Program Structure](../reference/program-structure.md) — Full file tree
- [Interfaces](../reference/interfaces.md) — API documentation
