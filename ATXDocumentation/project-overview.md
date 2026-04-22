# Project Overview — Club Manager v3

## Summary

**Club Manager v3** (v3.1.4) is a monolithic web application for managing the operations of "ASC Villejuif Football," a sports club in Villejuif, France. The application handles member registration, team management, event/match scheduling, payment tracking, facility booking, and reporting.

## Key Facts

| Attribute | Value |
|-----------|-------|
| **Package Name** | `club-manager` |
| **Version** | 3.1.4 |
| **License** | UNLICENSED (internal use only) |
| **Original Author** | Pierre Martin (2015) |
| **Contributors** | Thomas (2017-2021), Karim (2019), Kevin (2022-2023), Christophe (2021) |
| **Source Lines** | ~5,705 (JS, EJS, CSS, SQL, Shell) |
| **Programming Language** | JavaScript (Node.js, CommonJS modules) |
| **Framework** | Express.js 4.17.1 |
| **Database** | MySQL (via mysql2 3.9.7) |
| **Templating** | EJS 3.1.6 (server-side rendering) |
| **Frontend** | Bootstrap 3.3.7, jQuery 2.2.4, Font Awesome 4.7.0 (all CDN) |
| **Runtime** | Node.js >=10 (tested on 14, both EOL) |

## Functional Domains

1. **Member Management** — Registration, profiles, renewals, CSV export, certificates, reminder emails
2. **Team Management** — CRUD, coach assignment, player tracking, match statistics
3. **Event/Match Management** — Scheduling, result recording (win/loss/draw), calendar view, participants
4. **Payment Processing** — Recording, overdue detection, reminders, CSV export, receipt emails
5. **Facility Management** — CRUD, booking, availability checking, weekly schedule
6. **Reporting** — Membership stats, financial reports, activity reports, birthday lists, renewal lists
7. **Authentication** — Login (MD5 + plaintext fallback), admin backdoor, session management, password reset

## Architecture

The application follows a **partial MVC pattern** with a monolithic architecture:

- **Entry Point**: `server.js` (Express app initialization, middleware, some inline routes)
- **Business Logic**: `services/ClubService.js` (929 lines — all domains in a single file)
- **Data Access**: `database.js` (MySQL connection pool wrapper)
- **Routes**: 7 Express router modules in `routes/` directory
- **Views**: 35 EJS templates organized by feature module
- **Configuration**: `config.js` (all values hardcoded)

## Deployment

Manually deployed via `rsync` to a single Debian server running PM2. No CI/CD pipeline, no health checks, no rollback strategy, no HTTPS.

## Technical Debt Status

The application carries **significant technical debt** across multiple dimensions:
- **EOL Runtime**: Node.js 14 (EOL April 2023), Bootstrap 3 (EOL 2019), jQuery 2 (EOL)
- **Critical Security**: SQL injection, MD5 passwords, plaintext password storage, admin backdoor, hardcoded credentials
- **Architectural**: Monolithic service, callback hell, N+1 queries, denormalized DB, duplicated code
- **Missing Infrastructure**: No tests, no linting, no CI/CD, no input validation, no CSRF protection

**Recommended AWS Transformation**: `AWS/nodejs-version-upgrade` — to upgrade the EOL Node.js runtime to a supported LTS version.

See [Technical Debt Report](technical-debt-report.md) for full details and prioritized remediation plan.

## Documentation Map

- [README](README.md) — Documentation navigation guide
- [Technical Debt Report](technical-debt-report.md) — Executive debt summary with AWS recommendation
- [Architecture](architecture/) — System design and patterns
- [Behavior](behavior/) — Business logic and workflows (Early Access)
- [Reference](reference/) — Program structure, interfaces, data models
- [Analysis](analysis/) — Code metrics, complexity, dependencies, security
- [Diagrams](diagrams/) — Structural, behavioral, and architecture diagrams
- [Technical Debt](technical-debt/) — Detailed debt analysis and remediation
- [Migration](migration/) — Migration planning and test specifications
- [Specialized](specialized/) — Database and API/UI documentation
