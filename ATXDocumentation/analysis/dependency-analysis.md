# Dependency Analysis — Club Manager v3

## Internal Dependency Map

### Layer Architecture (Intended vs Actual)

**Intended layering:**
```
Routes → Service → Database → Config
```

**Actual layering (with violations):**
```
Routes ──→ Service ──→ Database ──→ Config
  │                       ↑
  └───── direct access ───┘  (layering violation)
```

Multiple routes bypass ClubService and query database.js directly:
- `routes/members.js` — renewal logic, team fetching for dropdowns
- `routes/teams.js` — stats queries, team archival, coach fetching
- `routes/events.js` — event detail, calendar, cancellation, participant addition
- `routes/payments.js` — payment detail, status update, member listing for forms
- `routes/facilities.js` — all facility creation and schedule queries
- `routes/reports.js` — activity report, birthday list, renewal list

### Module Import Frequency

| Module | Imported By (count) |
|--------|-------------------|
| `database.js` | 9 modules (server.js + 7 routes + ClubService) |
| `config.js` | 6 modules (server.js, database.js, ClubService, auth, members, payments, reports + helpers.js) |
| `ClubService.js` | 8 modules (server.js + 7 routes) |
| `express` | 8 modules (server.js + 7 routes) |
| `moment` | 8 modules (server.js, ClubService, 5 routes, helpers.js) |
| `md5` | 3 modules (server.js, auth.js, ClubService.js) |
| `lodash` | 2 modules (server.js, ClubService.js) |
| `nodemailer` | 1 module (ClubService.js only) |

## External Dependency Analysis

### Version Currency Assessment

| Package | Installed | Latest Stable | Gap | Risk |
|---------|-----------|--------------|-----|------|
| `express` | 4.17.1 (2019) | 4.21+ (2024) | ~5 years | Medium — security patches |
| `mysql2` | 3.9.7 (2024) | 3.11+ | Minor | Low |
| `ejs` | 3.1.6 (2021) | 3.1.10+ | ~3 years | Medium — prototype pollution fixes |
| `body-parser` | 1.19.0 (2019) | 1.20+ | ~5 years | Medium |
| `express-session` | 1.17.1 (2020) | 1.18+ | ~4 years | Medium — session security |
| `bcrypt` | 5.0.1 (2021) | 5.1+ | ~3 years | Low (but NOT USED!) |
| `moment` | 2.29.1 (2020) | 2.30+ (maint. mode) | ~4 years | Medium — recommend replacement |
| `lodash` | 4.17.21 (2021) | 4.17.21 | Current | Low |
| `multer` | 1.4.2 (2019) | 1.4.5+ | ~5 years | Medium — file upload security |
| `nodemailer` | 6.6.3 (2021) | 6.9+ | ~3 years | Medium |
| `csv-parser` | 3.0.0 (2020) | 3.0.0 | Current | Low (unused) |
| `md5` | 2.3.0 (2017) | 2.3.0 | Current | High (should not use for passwords) |
| `express-fileupload` | 1.2.1 (2020) | 1.5+ | ~4 years | Medium (unused) |

### CDN Dependencies

| Library | Installed | Latest | EOL Status |
|---------|-----------|--------|------------|
| Bootstrap | 3.3.7 | 5.3+ | **EOL** (Jul 2019) |
| jQuery | 2.2.4 | 3.7+ | **EOL/Unmaintained** |
| Font Awesome | 4.7.0 | 6.5+ | Superseded |

### Dependency Usage Analysis

| Status | Packages |
|--------|----------|
| **Actively used** | express, mysql2, ejs, body-parser, express-session, moment, lodash, nodemailer, md5 |
| **Installed but unused** | bcrypt (never imported), csv-parser (import stub), express-fileupload (never imported), multer (never imported) |
| **Should be removed** | md5 (replace with bcrypt for password hashing) |

### Transitive Dependencies

The `package-lock.json` locks transitive dependencies. Key concerns:
- `express` 4.17.1 pulls in older `qs`, `cookie`, `send` packages
- `nodemailer` 6.6.3 has its own SMTP handling dependencies
- `mysql2` 3.9.7 includes `lru-cache` and protocol parsers

## Circular Dependency Check

**Result: No circular dependencies detected.**

The dependency graph is a DAG (directed acyclic graph):
- `config.js` → no imports
- `database.js` → config.js only
- `ClubService.js` → database.js, config.js (no circular)
- `routes/*` → ClubService, database, config (no circular)
- `server.js` → all routes (no circular)

## Cross-References

- [Code Metrics](code-metrics.md) — File and line statistics
- [Complexity Analysis](complexity-analysis.md) — Code complexity
- [Security Patterns](security-patterns.md) — Security vulnerabilities
- [Dependencies](../architecture/dependencies.md) — Architecture dependency view
- [Outdated Components](../technical-debt/outdated-components.md) — Version details
