# Component Migration Order — Club Manager v3

## Recommended Migration Sequence

The following order is based on dependency analysis — components are migrated from leaf dependencies to dependent modules, ensuring each change can be validated before the next.

---

### Phase 1: Configuration & Infrastructure

#### 1.1 `config.js` → Environment Variables
- **Priority**: Critical (security)
- **Dependencies**: None (leaf module)
- **Action**: Replace all hardcoded values with `process.env.*`, create `.env.example`, add to `.gitignore`
- **Validation**: Application starts with env vars; no secrets in source code

#### 1.2 `database.js` → Promise-based with Parameterized Queries
- **Priority**: Critical (security + modernization)
- **Dependencies**: config.js (already migrated in 1.1)
- **Action**: Use `mysql2/promise` API, remove callback wrapper, add proper error handling
- **Validation**: All queries execute successfully; no callback-style query calls remain

---

### Phase 2: Shared Infrastructure

#### 2.1 `middleware/auth.js` → Centralize and Remove Duplicates
- **Priority**: High (code quality)
- **Dependencies**: None (standalone module)
- **Action**: Consolidate all 7+ copies of auth middleware into single module; standardize role checks; import from all route files
- **Validation**: All route files import from `middleware/auth.js`; no inline auth functions remain

#### 2.2 `utils/helpers.js` → Consolidate Duplicates from ClubService
- **Priority**: Medium (code quality)
- **Dependencies**: config.js
- **Action**: Remove duplicated functions from ClubService.js; have both use helpers.js; remove subscription amount duplication
- **Validation**: No duplicate function definitions; single source of truth for utilities

---

### Phase 3: Service Layer Decomposition

#### 3.1 `services/ClubService.js` → Split into Domain Services
- **Priority**: High (maintainability)
- **Dependencies**: database.js (migrated to Promise), config.js, helpers.js
- **Target Services**:
  - `services/MemberService.js` — member CRUD, numbers, expiration checks
  - `services/PaymentService.js` — payment CRUD, overdue, reminders
  - `services/TeamService.js` — team CRUD, player counts
  - `services/EventService.js` — event CRUD, match results, participants
  - `services/FacilityService.js` — facility CRUD, availability, bookings
  - `services/ReportService.js` — membership/financial/activity reports
  - `services/EmailService.js` — transport singleton, templates, sending
- **Validation**: ClubService.js deleted; all routes updated to use new services; all existing functionality preserved

---

### Phase 4: Route Layer

#### 4.1 `routes/*` → Use Centralized Middleware + Input Validation
- **Priority**: High (security + quality)
- **Dependencies**: middleware/auth.js (centralized), new service modules
- **Action**: Remove inline auth, add input validation (express-validator), use new service imports, convert to async/await
- **Validation**: All routes use centralized auth; all inputs validated; no string-concatenated SQL

#### 4.2 `server.js` → Remove Inline Routes
- **Priority**: Medium (maintainability)
- **Dependencies**: All routes migrated
- **Action**: Move dashboard, profile, search, settings, import, API routes to appropriate route files; remove duplicate login; clean up to only middleware and route mounting
- **Validation**: server.js < 80 lines; no route handlers inline

---

### Phase 5: Security Fixes

#### 5.1 Password Hashing → bcrypt
- **Priority**: Critical (security)
- **Dependencies**: MemberService migrated
- **Action**: Replace MD5 with bcrypt; remove `password_plain` column; create password migration script
- **Validation**: No MD5 imports; no plaintext password storage; login works with bcrypt

#### 5.2 Remove Admin Backdoor
- **Priority**: Critical (security)
- **Action**: ~~Delete admin backdoor and all references~~ DONE — admin backdoor has been removed
- **Validation**: No backdoor credentials in codebase

#### 5.3 Add CSRF Protection
- **Priority**: High (security)
- **Action**: Add CSRF middleware; update all form templates with CSRF tokens
- **Validation**: All POST forms include CSRF token; requests without token are rejected

#### 5.4 Enable HTTPS
- **Priority**: High (security)
- **Action**: Configure TLS certificates; redirect HTTP to HTTPS; update baseUrl
- **Validation**: All traffic encrypted; HTTP redirects to HTTPS

---

### Phase 6: Database Normalization

#### 6.1 Remove Redundant Columns
- **Priority**: Medium (data quality)
- **Dependencies**: Service layer migrated (uses JOINs instead)
- **Action**: Create migration script; remove full_name, team_name, member_name, age, result, duration_minutes, current_players, etc.
- **Validation**: No stale data; all queries use JOINs

#### 6.2 Add Foreign Key Constraints
- **Action**: Add FK constraints for all relationship columns
- **Validation**: Referential integrity enforced at DB level

#### 6.3 Add Missing Indexes
- **Action**: Add indexes on renewal_date, last_name, (status, due_date)
- **Validation**: Query performance improved for common queries

---

### Phase 7: Testing & CI/CD

#### 7.1 Add Test Suite
- **Priority**: High (quality)
- **Action**: Install Jest/Mocha; write unit tests for services; write integration tests for routes
- **Validation**: `npm test` passes; >70% coverage

#### 7.2 Set Up CI/CD
- **Action**: Replace deploy.sh with automated pipeline; add health checks; add rollback
- **Validation**: Automated deployments; zero-downtime updates

---

### Phase 8: Frontend Upgrade

#### 8.1 `views/` → Bootstrap 5 Migration
- **Priority**: Medium (security + UX)
- **Dependencies**: All backend changes complete and tested
- **Action**: Update CDN links; update all 35 templates for Bootstrap 5 class names; update jQuery to 3.7+
- **Validation**: All pages render correctly; no Bootstrap 3 classes remain

---

## Dependency-Based Order Summary

```
Phase 1: config.js → database.js (leaf dependencies first)
Phase 2: middleware/auth.js → utils/helpers.js (shared infrastructure)
Phase 3: ClubService.js → 7 domain services (core business logic)
Phase 4: routes/* → server.js (consumers of services)
Phase 5: Security fixes (bcrypt, backdoor, CSRF, HTTPS)
Phase 6: Database normalization (after app code updated)
Phase 7: Tests and CI/CD (after code stabilized)
Phase 8: Frontend upgrade (lowest risk, largest change)
```

## Cross-References

- [Test Specifications](test-specifications.md) — Test cases for validation
- [Validation Criteria](validation-criteria.md) — Success criteria
- [Remediation Plan](../technical-debt/remediation-plan.md) — Prioritized fixes
- [Dependencies](../architecture/dependencies.md) — Dependency graph
