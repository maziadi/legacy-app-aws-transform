# Remediation Plan

## Priority 1: Critical Security Fixes (High Severity)

### 1.1 Remove Admin Backdoor
- **Action**: ~~Delete admin backdoor from `config.js`~~ DONE — admin backdoor has been removed
- **Action**: ~~Remove backdoor checks from `server.js` POST `/login` and `routes/auth.js` POST `/login`~~ DONE
- **Complexity**: Low
- **Risk if deferred**: Unauthorized superadmin access

### 1.2 Fix SQL Injection Vulnerabilities
- **Action**: Replace string concatenation with parameterized queries in:
  - `server.js` POST `/login` (line ~101): `"SELECT * FROM members WHERE email = '" + username + "'..."`
  - `server.js` GET `/search` (line ~192): `"...LIKE '%" + q + "%'..."`
  - `routes/auth.js` POST `/login` (line ~23): `"SELECT * FROM members WHERE email = '" + username + "'..."`
  - `services/ClubService.js` `getFinancialReport()`: `"...WHERE YEAR(payment_date) = " + parseInt(year)` — parseInt provides minimal protection but is not parameterized
- **Complexity**: Low — mechanical replacement with `?` placeholders
- **Risk if deferred**: Complete database compromise

### 1.3 Remove Plaintext Password Storage
- **Action**: Remove `password_plain` column from `members` table schema
- **Action**: Remove all `password_plain` references in `ClubService.createMember()`, `ClubService.resetPassword()`, login routes
- **Action**: Remove plaintext password fallback in login flow
- **Complexity**: Low
- **Risk if deferred**: Complete credential exposure

### 1.4 Migrate from MD5 to bcrypt
- **Action**: `bcrypt` is already installed (5.0.1). Replace `md5(password)` calls with `bcrypt.hashSync(password, 10)` and `bcrypt.compareSync(password, hash)` in all authentication paths
- **Action**: Create a migration script to re-hash existing passwords (requires users to reset)
- **Complexity**: Medium — requires password migration strategy
- **Risk if deferred**: Passwords crackable via rainbow tables

### 1.5 Move Credentials to Environment Variables
- **Action**: Replace all hardcoded values in `config.js` with `process.env.*` reads
- **Action**: Create `.env.example` template file
- **Action**: Update `scripts/backup.sh` to read credentials from env
- **Action**: Add `config.js` and `.env` to `.gitignore`
- **Complexity**: Low
- **Risk if deferred**: Credential leakage through version control

## Priority 2: Runtime & Framework Upgrades (High Severity)

### 2.1 Upgrade Node.js Runtime
- **Action**: Use `AWS/nodejs-version-upgrade` transformation to upgrade from Node.js 14 to Node.js 20 LTS or 22 LTS
- **Action**: Update `engines` field in `package.json`
- **Action**: Update `NODE_VERSION` in `deploy.sh`
- **Complexity**: Medium — primarily dependency compatibility testing
- **Risk if deferred**: No security patches, missing performance improvements

### 2.2 Update npm Dependencies
- **Action**: Run `npm update` for minor/patch updates
- **Action**: Test after each major version upgrade:
  - `express` 4.17.1 → 4.21+
  - `ejs` 3.1.6 → 3.1.10+
  - `express-session` 1.17.1 → 1.18+
  - `multer` 1.4.2 → 1.4.5+
  - `nodemailer` 6.6.3 → 6.9+
- **Complexity**: Low for patch/minor, Medium for testing
- **Risk if deferred**: Known vulnerabilities in outdated packages

### 2.3 Migrate Frontend Frameworks
- **Action**: Upgrade Bootstrap 3.3.7 → 5.3+ (requires template rewrite)
- **Action**: Upgrade jQuery 2.2.4 → 3.7+ (minimal API changes)
- **Action**: Upgrade Font Awesome 4.7.0 → 6.x (icon class changes)
- **Complexity**: High — 35 EJS templates need class name updates
- **Risk if deferred**: XSS vulnerabilities, no accessibility improvements

## Priority 3: Architecture Improvements (Low Severity)

### 3.1 Centralize Auth Middleware
- **Action**: Remove all inline `requireLogin`, `requireAdmin`, `requireCoachOrAdmin` functions from route files
- **Action**: Import and use `middleware/auth.js` consistently in all routes
- **Action**: Standardize role checking logic
- **Complexity**: Low — mechanical refactor
- **Benefit**: Single source of truth for authentication/authorization

### 3.2 Split ClubService into Domain Services
- **Action**: Create separate service modules:
  - `services/MemberService.js` — member CRUD, member numbers, membership checks
  - `services/PaymentService.js` — payment CRUD, overdue tracking, reminders
  - `services/TeamService.js` — team CRUD, player count management
  - `services/EventService.js` — event CRUD, match results, participants
  - `services/FacilityService.js` — facility CRUD, availability checking, bookings
  - `services/ReportService.js` — membership/financial/activity reports
  - `services/EmailService.js` — email transport, templates, sending
- **Complexity**: Medium — requires careful extraction while maintaining existing behavior
- **Benefit**: Reduced file complexity, better separation of concerns

### 3.3 Complete Route Migration from server.js
- **Action**: Move dashboard, profile, search, settings, import, and API routes to appropriate route modules
- **Action**: Remove duplicate login routes (keep routes/auth.js version)
- **Complexity**: Low
- **Benefit**: Clean server.js focused on middleware and route mounting

### 3.4 Migrate to async/await
- **Action**: `mysql2` supports `.promise()` API natively
- **Action**: Convert all callback-based DB queries to async/await
- **Action**: Convert route handlers to use async/await with proper error handling
- **Complexity**: Medium — systematic conversion of all query patterns
- **Benefit**: Eliminates callback hell, improves readability and error handling

### 3.5 Normalize Database Schema
- **Action**: Remove redundant columns (full_name, team_name, member_name, age, current_players, etc.)
- **Action**: Add foreign key constraints
- **Action**: Add missing indexes (renewal_date, last_name, composite indexes)
- **Action**: Create migration script for data cleanup
- **Action**: Convert `sport` column from comma-separated to junction table
- **Complexity**: High — requires data migration and application code changes
- **Benefit**: Data integrity, simpler queries, reduced storage

### 3.6 Add Input Validation
- **Action**: Add validation library (e.g., `express-validator` or `joi`)
- **Action**: Validate all user inputs in route handlers before passing to services
- **Action**: Add CSRF protection (e.g., `csurf` or `csrf-csrf`)
- **Complexity**: Medium
- **Benefit**: Prevents XSS, data corruption, and CSRF attacks

### 3.7 Add Test Suite
- **Action**: Install test framework (e.g., Jest or Mocha)
- **Action**: Write unit tests for ClubService methods
- **Action**: Write integration tests for Express routes
- **Action**: Configure `npm test` script
- **Complexity**: High — no existing tests to build on
- **Benefit**: Regression prevention, safe refactoring

### 3.8 Set Up CI/CD Pipeline
- **Action**: Replace `deploy.sh` with proper CI/CD (GitHub Actions, AWS CodePipeline, etc.)
- **Action**: Add health check endpoint
- **Action**: Add rollback strategy
- **Action**: Enable HTTPS (TLS certificate + reverse proxy)
- **Complexity**: Medium
- **Benefit**: Reliable deployments, automated testing, zero-downtime updates

## Remediation Sequence

The recommended order of remediation ensures each phase builds safely on the previous:

1. **Phase 1**: Security fixes (1.1–1.5) — addresses critical vulnerabilities
2. **Phase 2**: Node.js upgrade (2.1) — use AWS/nodejs-version-upgrade transformation
3. **Phase 3**: Dependency updates (2.2) — update npm packages
4. **Phase 4**: Auth centralization (3.1) + route migration (3.3)
5. **Phase 5**: Service decomposition (3.2) + async/await migration (3.4)
6. **Phase 6**: Database normalization (3.5) + input validation (3.6)
7. **Phase 7**: Test suite (3.7) + CI/CD (3.8)
8. **Phase 8**: Frontend framework upgrade (2.3) — largest change, saved for last

## Cross-References

- [Technical Debt Report](../technical-debt-report.md) — Executive summary
- [Summary](summary.md) — Debt overview
- [Outdated Components](outdated-components.md) — Version analysis
- [Maintenance Burden](maintenance-burden.md) — Architectural issues
- [Migration Component Order](../migration/component-order.md) — Migration sequencing
