# Patterns — Club Manager v3

## Design Patterns Identified

### 1. Partial MVC Pattern
- **Model**: MySQL tables accessed via database.js; business logic in ClubService.js (acts as both model and service)
- **View**: 35 EJS templates with server-side rendering
- **Controller**: Express route handlers in routes/*.js and server.js
- **Assessment**: Incomplete — business logic leaks into routes, and there is no formal model layer. ClubService acts as a "fat service" combining data access and business logic.

### 2. Module Pattern (CommonJS)
- All files use `module.exports` and `require()` for module loading
- Clean module boundaries exist for routes and database layer
- Inconsistent: some modules export objects (ClubService, config), others export router instances

### 3. Connection Pool Pattern
- `database.js` implements a MySQL connection pool via mysql2
- Shared across all application code through module require
- Appropriate for a single-server deployment

### 4. Middleware Pipeline Pattern (Express)
- Request flows through middleware chain: body-parser → session → request logger → user injection → route handlers
- Auth middleware applied at route mount level and inline in route files
- Global error handler at the end of the chain

### 5. Configuration Singleton Pattern
- `config.js` exports a single configuration object
- All modules import and share the same config instance
- **Anti-pattern**: Hardcoded values instead of environment variables

### 6. Service Locator (Implicit)
- ClubService serves as a centralized service that all route modules import
- Routes "locate" business logic by importing ClubService
- **Anti-pattern**: Single monolithic service instead of domain-specific services

## Anti-Patterns Identified

### 1. N+1 Query Anti-Pattern (Pervasive)
- **Description**: Executing one query to get a list, then N additional queries to enrich each result
- **Locations**:
  - `ClubService.getAllMembers()`: fetches payment for each member in a loop
  - `ClubService.getEvents()`: counts participants for each event in a loop
  - `server.js` dashboard: 7 sequential queries instead of one combined query
  - `routes/facilities.js`: fetches next booking for each facility
  - `routes/teams.js` stats: 6 sequential stat queries
  - `server.js` profile: 3 chained queries for member, team, payments
- **Impact**: O(N) database roundtrips per page load; severe degradation as data grows

### 2. Callback Hell Anti-Pattern
- **Description**: Deeply nested callbacks without error propagation
- **Examples**:
  - Dashboard: 7 levels of nesting
  - Team stats: 6 levels
  - ClubService.createMember: 5 levels
- **Impact**: Unreadable code, inconsistent error handling, difficult debugging

### 3. Denormalized Data Anti-Pattern
- **Description**: Storing redundant computed/derived values in the database
- **Examples**: `members.full_name`, `members.age`, `members.team_name`, `payments.member_name`, `events.team_name`, `events.result`, `teams.coach_name`, `teams.current_players`, `bookings.facility_name`
- **Impact**: Data becomes stale; update anomalies; larger table sizes; more complex write logic

### 4. Copy-Paste Code Anti-Pattern
- **Auth middleware**: Duplicated in 7 files with slight variations
- **Utility functions**: `formatDate`, `formatCurrency`, `isMembershipExpired` in 2-3 locations
- **Subscription amounts**: Hardcoded in 3 separate files (config.js, helpers.js, app.js)
- **Login logic**: Full login flow in both server.js and routes/auth.js
- **CSV export**: Nearly identical pattern in exportMembersCSV and exportPaymentsCSV
- **Impact**: Bug fixes must be applied in multiple locations; inconsistent behavior

### 5. Fire-and-Forget Anti-Pattern
- **Description**: Executing async operations and ignoring their results/errors
- **Examples**:
  - Email sending: `ClubService.sendWelcomeEmail()` called without callback handling
  - Redundant data updates: `UPDATE teams SET current_players = ...` with `function () {}`
  - Last login update: `db.query('UPDATE members SET last_login...', ..., function () {})`
  - Booking creation in event creation: errors swallowed
- **Impact**: Silent failures; data inconsistency; no error visibility

### 6. String Concatenation SQL Anti-Pattern
- **Description**: Building SQL queries via string concatenation with user input
- **Examples**:
  - `server.js` login: `"SELECT * FROM members WHERE email = '" + username + "'"`
  - `server.js` search: `"...LIKE '%" + q + "%'"`
  - `routes/auth.js` login: same pattern
  - `ClubService.js` financial report: `"...YEAR(payment_date) = " + parseInt(year)`
- **Impact**: SQL injection vulnerability

### 7. God Object Anti-Pattern
- **Description**: ClubService.js is a single object containing ALL business logic (929 lines)
- **Domains mixed**: Members, payments, teams, events, facilities, reports, email, CSV export, database backup, utility functions
- **Impact**: High coupling, difficult to test, high merge conflict probability

### 8. Hardcoded Configuration Anti-Pattern
- **Description**: Environment-specific values embedded in source code
- **Examples**: Database credentials, SMTP credentials, admin backdoor password, session secret, server IP, filesystem paths, club name, subscription prices, season
- **Impact**: Secrets in version control; cannot deploy to different environments without code changes

### 9. Missing Abstraction Anti-Pattern
- **Description**: Related functionality not abstracted into reusable components
- **Examples**:
  - No email template system (HTML strings built inline)
  - No input validation layer
  - No centralized error handling in services
  - No pagination for list queries
  - No caching layer
- **Impact**: Code repetition, inconsistent behavior, scalability issues

## Cross-References

- [System Overview](system-overview.md) — Architecture overview
- [Components](components.md) — Component details
- [Dependencies](dependencies.md) — Dependency mapping
- [Complexity Analysis](../analysis/complexity-analysis.md) — Code complexity metrics
- [Maintenance Burden](../technical-debt/maintenance-burden.md) — Technical debt details
