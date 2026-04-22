# Validation Criteria — Club Manager v3

## Success Criteria for Migration

### Security Criteria (Must Pass — Phase 1 & 5)

| ID | Criterion | Verification Method |
|----|-----------|-------------------|
| SEC-01 | All SQL queries use parameterized queries (`?` placeholders) | `grep` for string concatenation in SQL; no `+` or template literals in query strings |
| SEC-02 | No plaintext passwords stored in database | `password_plain` column removed from schema; no references in code |
| SEC-03 | All password hashing uses bcrypt with salt rounds ≥ 10 | `grep` for `md5` imports returns 0; bcrypt.hash/compare used |
| SEC-04 | Admin backdoor completely removed | No `adminFallback` in config; no backdoor check in login handlers |
| SEC-05 | All credentials stored in environment variables | No hardcoded passwords, secrets, or API keys in source files |
| SEC-06 | CSRF protection enabled on all POST routes | CSRF middleware active; all forms include CSRF token |
| SEC-07 | HTTPS enabled for all traffic | HTTP redirects to HTTPS; no `http://` URLs in config |
| SEC-08 | TLS verification enabled for SMTP | `rejectUnauthorized` not set to `false` |
| SEC-09 | Input validation on all user-facing routes | Express-validator or equivalent on all POST handlers |
| SEC-10 | Error messages do not expose internal details | Generic error pages for users; detailed logs server-side only |

### Architecture Criteria (Phase 2-4)

| ID | Criterion | Verification Method |
|----|-----------|-------------------|
| ARCH-01 | Auth middleware centralized in `middleware/auth.js` | No inline `requireLogin`/`requireAdmin` functions in route files |
| ARCH-02 | ClubService.js split into ≥ 5 domain services | `services/` directory contains MemberService, PaymentService, TeamService, EventService, EmailService (minimum) |
| ARCH-03 | All inline routes moved from server.js | `server.js` contains only middleware setup and route mounting; no route handler logic |
| ARCH-04 | Duplicate login route removed | Login handled in exactly one location (routes/auth.js) |
| ARCH-05 | All async operations use Promise/async-await | No callback-style `function(err, result)` patterns; no nested callbacks |
| ARCH-06 | No duplicate utility functions | Each utility function defined in exactly one location |
| ARCH-07 | Subscription amounts defined in single location | Only `config.js` (or DB) contains pricing; no hardcoded values in routes or frontend |

### Database Criteria (Phase 6)

| ID | Criterion | Verification Method |
|----|-----------|-------------------|
| DB-01 | Redundant columns removed | `full_name`, `team_name` (on members), `member_name`, `age`, `result`, `duration_minutes`, `current_players`, `coach_name` columns no longer in schema |
| DB-02 | Foreign key constraints added | All relationship columns (team_id, member_id, facility_id, event_id, coach_id) have FK constraints |
| DB-03 | Missing indexes added | Indexes on `members.renewal_date`, `members.last_name`, composite `payments(status, due_date)` |
| DB-04 | UNIQUE constraint on event_participants | `(event_id, member_id)` is UNIQUE |
| DB-05 | `multipleStatements` disabled | `config.db.multipleStatements` is `false` or removed |
| DB-06 | Legacy Excel columns removed | `old_reference`, `legacy_system_id`, `migrated_from_excel`, `excel_row_number` removed from payments |

### Testing Criteria (Phase 7)

| ID | Criterion | Verification Method |
|----|-----------|-------------------|
| TEST-01 | Test framework installed and configured | `npm test` script exists and executes |
| TEST-02 | Unit tests for all service methods | Each public method in each service has ≥ 1 test |
| TEST-03 | Integration tests for all routes | Each Express route has ≥ 1 integration test |
| TEST-04 | SQL injection tests pass | Parameterized queries prevent all injection attempts |
| TEST-05 | Authentication/authorization tests pass | Unauthenticated access blocked; role-based access enforced |

### Deployment Criteria (Phase 7)

| ID | Criterion | Verification Method |
|----|-----------|-------------------|
| DEP-01 | CI/CD pipeline configured | Automated deployment on push to main branch |
| DEP-02 | Health check endpoint exists | `GET /health` returns 200 with status |
| DEP-03 | Rollback strategy defined | Previous version can be restored within defined period |
| DEP-04 | No hardcoded server IPs in scripts | `deploy.sh` uses environment variables or CI/CD config |

### Frontend Criteria (Phase 8)

| ID | Criterion | Verification Method |
|----|-----------|-------------------|
| FE-01 | Bootstrap 5.x loaded | CDN URL points to Bootstrap 5.x |
| FE-02 | jQuery 3.7+ loaded | CDN URL points to jQuery 3.7+ |
| FE-03 | All templates use Bootstrap 5 classes | No `panel`, `glyphicon`, `col-xs-*` classes remain |
| FE-04 | All pages render correctly | Visual inspection of all 35 templates |

### Functional Regression Criteria

| ID | Criterion | Verification Method |
|----|-----------|-------------------|
| FUNC-01 | Member CRUD operations work | Create, read, update, soft-delete member |
| FUNC-02 | Payment recording and tracking work | Record, list, filter, overdue detection |
| FUNC-03 | Team management works | Create, update, archive, stats display |
| FUNC-04 | Event/match management works | Create, record results, cancel, participants |
| FUNC-05 | Facility booking works | Create, check availability, schedule view |
| FUNC-06 | Reports generate correctly | Membership, financial, activity, birthdays, renewals |
| FUNC-07 | Email sending works | Welcome, receipt, reminder emails sent |
| FUNC-08 | CSV export works | Members and payments export with proper escaping |
| FUNC-09 | Dashboard loads without errors | All 7 data widgets display correct data |
| FUNC-10 | Search returns correct results | Member search by name/email/number |

## Cross-References

- [Component Order](component-order.md) — Migration sequencing
- [Test Specifications](test-specifications.md) — Detailed test cases
- [Remediation Plan](../technical-debt/remediation-plan.md) — Fix priorities
- [Security Patterns](../analysis/security-patterns.md) — Vulnerabilities to fix
