# Module Organization — Club Manager v3

## Module Dependency Map

### Entry Point: `server.js`
- **Requires**: express, body-parser, express-session, path, fs, md5, moment, lodash, database.js, config.js, ClubService.js, all 7 route modules
- **Exports**: Express app instance
- **Role**: Application bootstrap, middleware chain, route mounting, inline route handlers

### Configuration: `config.js`
- **Requires**: (none — leaf module)
- **Exports**: Configuration object with db, session, email, app, subscriptions, paths, features (admin backdoor removed)
- **Role**: Centralized configuration (all hardcoded)

### Data Access: `database.js`
- **Requires**: mysql2, config.js
- **Exports**: `{ query, getConnection, pool }`
- **Role**: MySQL connection pool management, query execution, logging

### Business Logic: `services/ClubService.js`
- **Requires**: database.js, config.js, md5, moment, nodemailer, fs, path, lodash
- **Exports**: ClubService object (35+ methods)
- **Role**: Centralized (monolithic) business logic for all domains

### Route Modules: `routes/*.js`

| Module | Internal Dependencies | External Dependencies |
|--------|----------------------|----------------------|
| `routes/auth.js` | database.js, config.js, ClubService.js | express, md5 |
| `routes/members.js` | database.js, config.js, ClubService.js | express, md5, moment |
| `routes/teams.js` | database.js, ClubService.js | express, moment |
| `routes/events.js` | database.js, ClubService.js | express, moment |
| `routes/payments.js` | database.js, config.js, ClubService.js | express, moment |
| `routes/facilities.js` | database.js, ClubService.js | express, moment |
| `routes/reports.js` | database.js, config.js, ClubService.js | express, moment, fs, path |

### Middleware: `middleware/auth.js`
- **Requires**: (none)
- **Exports**: `{ requireLogin, requireAdmin, requireCoachOrAdmin }`
- **Role**: Auth middleware functions — **NOT USED by any module**

### Utilities: `utils/helpers.js`
- **Requires**: moment, config.js
- **Exports**: 17 utility functions
- **Role**: Shared utilities — **NOT IMPORTED in backend code** (functions duplicated in ClubService)

### Frontend: `public/js/app.js`
- **Requires**: jQuery (global from CDN)
- **Role**: Client-side UI interactions, form validation, subscription price auto-fill

### Styles: `public/css/style.css`
- **Role**: Bootstrap 3 overrides, custom component styles

### Views: `views/**/*.ejs`
- **Role**: Server-side HTML templates rendered by Express routes
- **Dependencies**: Bootstrap 3.3.7, jQuery 2.2.4, Font Awesome 4.7.0 (all CDN)

### Scripts
| Script | Role |
|--------|------|
| `scripts/setup_db.sql` | Database schema creation (destructive — drops existing DB) |
| `scripts/seed.sql` | Development sample data |
| `scripts/deploy.sh` | Manual rsync deployment to production server |
| `scripts/backup.sh` | Manual MySQL backup |

## Module Coupling Analysis

| Module Pair | Coupling Type | Severity |
|------------|---------------|----------|
| All routes → ClubService | Data coupling | Expected |
| Several routes → database.js | Direct DB access bypassing service | High — breaks layered architecture |
| All routes → inline auth middleware | Copy-paste coupling | High — maintenance burden |
| ClubService → config.js | Data coupling | Expected |
| ClubService → database.js | Data coupling | Expected |
| server.js → everything | Platform coupling | Expected (entry point) |

## Cross-References

- [Program Structure](program-structure.md) — File tree
- [Interfaces](interfaces.md) — Public APIs
- [Data Models](data-models.md) — Database schema
- [Dependencies](../architecture/dependencies.md) — Full dependency graph
- [Components](../architecture/components.md) — Component details
