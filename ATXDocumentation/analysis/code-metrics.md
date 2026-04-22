# Code Metrics — Club Manager v3

## Lines of Code Summary

| Category | Files | Lines | % of Total |
|----------|-------|-------|-----------|
| JavaScript (backend) | 13 | 2,906 | 50.9% |
| EJS Templates | 35 | ~1,500 | 26.3% |
| SQL Scripts | 2 | 452 | 7.9% |
| JavaScript (frontend) | 1 | 110 | 1.9% |
| CSS | 1 | 94 | 1.6% |
| Shell Scripts | 2 | 103 | 1.8% |
| Configuration (JSON) | 2 | ~540 | 9.5% |
| **Total** | **56** | **~5,705** | **100%** |

## Lines of Code by File (Backend JavaScript)

| File | Lines | Domain |
|------|-------|--------|
| `services/ClubService.js` | 929 | Business logic (all domains) |
| `server.js` | 343 | Entry point, middleware, inline routes |
| `routes/members.js` | 270 | Member management |
| `routes/payments.js` | 152 | Payment management |
| `utils/helpers.js` | 147 | Utility functions (unused) |
| `routes/events.js` | 142 | Event management |
| `routes/teams.js` | 125 | Team management |
| `routes/reports.js` | 122 | Reporting |
| `routes/facilities.js` | 102 | Facility management |
| `config.js` | 95 | Configuration |
| `routes/auth.js` | 79 | Authentication |
| `database.js` | 79 | Database layer |
| `middleware/auth.js` | 42 | Auth middleware (unused) |

## File Count by Type

| Extension | Count | Notes |
|-----------|-------|-------|
| `.js` (backend) | 13 | All CommonJS modules |
| `.ejs` | 35 | Server-side templates |
| `.css` | 1 | Single stylesheet |
| `.js` (frontend) | 1 | jQuery-based |
| `.sql` | 2 | Schema + seed data |
| `.sh` | 2 | Deploy + backup scripts |
| `.json` | 2 | package.json + lock file |
| `.md` | 1 | README |

## Function Count per Module

| Module | Functions/Methods | Lines per Function (avg) |
|--------|------------------|-------------------------|
| `ClubService.js` | 35 | ~26 |
| `server.js` | 17 route handlers + 2 middleware | ~16 |
| `routes/members.js` | 10 route handlers + 1 middleware | ~25 |
| `routes/payments.js` | 8 route handlers + 1 middleware | ~16 |
| `routes/events.js` | 7 route handlers + 1 middleware | ~17 |
| `routes/teams.js` | 7 route handlers + 1 middleware | ~15 |
| `routes/reports.js` | 7 route handlers + 1 middleware | ~14 |
| `routes/facilities.js` | 5 route handlers + 1 middleware | ~16 |
| `routes/auth.js` | 5 route handlers | ~14 |
| `utils/helpers.js` | 17 utility functions | ~6 |
| `middleware/auth.js` | 3 functions | ~10 |
| `database.js` | 2 functions + startup logic | ~20 |
| `config.js` | 0 (configuration object) | — |

## View Templates by Module

| Directory | Templates | Description |
|-----------|-----------|-------------|
| `views/` (root) | 5 | layout, dashboard (2), search, settings |
| `views/reports/` | 6 | index, membership, financial, activity, birthdays, renewals |
| `views/members/` | 4 | list, detail, form, profile |
| `views/teams/` | 4 | list, detail, form, stats |
| `views/events/` | 4 | list, detail, form, calendar |
| `views/facilities/` | 4 | list, detail, form, schedule |
| `views/payments/` | 4 | list, detail, form, overdue |
| `views/auth/` | 2 | login, forgot |
| `views/admin/` | 1 | import |
| `views/partials/` | 1 | navbar |

## Dependency Count

| Type | Count |
|------|-------|
| npm runtime dependencies | 13 |
| npm dev dependencies | 0 |
| CDN dependencies | 3 (Bootstrap, jQuery, Font Awesome) |
| Node.js built-in modules | 3 (path, fs, child_process) |
| System dependencies | 3 (MySQL, SMTP, PM2) |

## Cross-References

- [Complexity Analysis](complexity-analysis.md) — Code complexity hotspots
- [Dependency Analysis](dependency-analysis.md) — Dependency mapping
- [Program Structure](../reference/program-structure.md) — File tree
