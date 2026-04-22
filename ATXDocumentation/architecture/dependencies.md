# Dependencies — Club Manager v3

## Internal Dependency Graph

```
server.js (entry point)
├── express, body-parser, express-session, path, fs, md5, moment, lodash
├── config.js
├── database.js ← config.js
├── services/ClubService.js ← database.js, config.js, md5, moment, nodemailer, fs, path, lodash
├── routes/auth.js ← express, database.js, config.js, ClubService.js, md5
├── routes/members.js ← express, database.js, config.js, ClubService.js, md5, moment
├── routes/teams.js ← express, database.js, ClubService.js, moment
├── routes/events.js ← express, database.js, ClubService.js, moment
├── routes/payments.js ← express, database.js, config.js, ClubService.js, moment
├── routes/facilities.js ← express, database.js, ClubService.js, moment
└── routes/reports.js ← express, database.js, config.js, ClubService.js, moment, fs, path
```

### Dependency Flow

```
server.js → routes/* → ClubService.js → database.js → config.js
                │              │                │
                │              └── nodemailer    └── mysql2
                └── (also direct DB queries in several routes)
```

**Key Observation:** Several routes bypass ClubService and query the database directly (e.g., members.js renewal, teams.js stats, events.js detail), breaking the intended layered architecture.

### Unused Internal Dependencies
- `middleware/auth.js` — exported but never imported
- `utils/helpers.js` — exported but never imported in backend code

## External Dependencies (npm — from package.json)

### Runtime Dependencies (13 packages)

| Package | Version | Purpose | Used By |
|---------|---------|---------|---------|
| `express` | 4.17.1 | Web framework | server.js, all routes |
| `mysql2` | 3.9.7 | MySQL database driver | database.js |
| `ejs` | 3.1.6 | Template engine | server.js (view engine) |
| `body-parser` | 1.19.0 | Request body parsing | server.js |
| `express-session` | 1.17.1 | Session middleware | server.js |
| `bcrypt` | 5.0.1 | Password hashing (UNUSED) | Listed but not imported anywhere |
| `moment` | 2.29.1 | Date formatting/manipulation | server.js, ClubService.js, routes/*, helpers.js |
| `lodash` | 4.17.21 | Utility library | server.js, ClubService.js |
| `multer` | 1.4.2 | File upload handling | Listed but not clearly used |
| `nodemailer` | 6.6.3 | Email sending | ClubService.js |
| `csv-parser` | 3.0.0 | CSV file parsing | Listed but import not used |
| `md5` | 2.3.0 | MD5 hashing | server.js, routes/auth.js, ClubService.js |
| `express-fileupload` | 1.2.1 | File upload middleware | Listed but not imported |

### Dev Dependencies
- **None** — `devDependencies: {}` in package.json

### Potentially Unused Dependencies
| Package | Evidence |
|---------|----------|
| `bcrypt` | Installed but `md5` is used for password hashing instead |
| `csv-parser` | CSV import endpoint (`POST /admin/import`) is a stub that redirects |
| `express-fileupload` | Not imported in any source file |
| `multer` | Not imported in any active route file |

## CDN Dependencies (loaded in views/layout.ejs)

| Library | Version | CDN URL Pattern |
|---------|---------|-----------------|
| Bootstrap CSS | 3.3.7 | maxcdn.bootstrapcdn.com |
| Bootstrap JS | 3.3.7 | maxcdn.bootstrapcdn.com |
| jQuery | 2.2.4 | code.jquery.com |
| Font Awesome | 4.7.0 | maxcdn.bootstrapcdn.com |

## Node.js Built-in Dependencies

| Module | Used By |
|--------|---------|
| `path` | server.js, ClubService.js, reports.js |
| `fs` | server.js, ClubService.js, reports.js |
| `child_process` | ClubService.js (backupDatabase — inline require) |

## System Dependencies

| Dependency | Purpose | Configuration |
|-----------|---------|---------------|
| MySQL Server | Database | localhost:3306, root user, no password |
| SMTP Server | Email relay | smtp.orange.fr:587 |
| PM2 | Process management | CLI only, no config file |
| rsync | Deployment file sync | Used by deploy.sh |
| mysqldump | Database backup | Used by backup.sh and ClubService.backupDatabase |

## Circular Dependencies

None detected. The dependency graph is acyclic: config.js has no imports, database.js imports only config.js, ClubService imports database.js and config.js, routes import ClubService and sometimes database/config directly.

## Dependency Criticality

| Dependency | Criticality | Impact if Unavailable |
|-----------|------------|----------------------|
| MySQL | **Critical** | Application non-functional |
| express | **Critical** | No HTTP server |
| mysql2 | **Critical** | No database connectivity |
| ejs | **Critical** | No page rendering |
| express-session | **Critical** | No authentication |
| nodemailer | High | Email features fail (silent failure pattern) |
| moment | High | Date formatting breaks throughout |
| md5 | High | Login authentication fails |
| body-parser | High | No form/JSON parsing |
| lodash | Low | Used sparingly, could be replaced with native JS |
| SMTP server | Medium | Emails fail silently |

## Cross-References

- [System Overview](system-overview.md) — Technology stack
- [Components](components.md) — Component details
- [Patterns](patterns.md) — Architectural patterns
- [Dependency Analysis](../analysis/dependency-analysis.md) — Deep dependency analysis
- [Outdated Components](../technical-debt/outdated-components.md) — Version currency
