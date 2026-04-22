# System Overview — Club Manager v3

## Application Summary

**Club Manager v3** (package name: `club-manager`, version 3.1.4) is a monolithic web application for managing a sports club — specifically "ASC Villejuif Football" in Villejuif, France. It handles member registration, team management, event/match scheduling, payment tracking, facility booking, and reporting.

## Technology Stack

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| **Runtime** | Node.js | >=10, tested 14.17.0 | Both versions EOL |
| **Web Framework** | Express.js | 4.17.1 | Outdated |
| **Database** | MySQL | Unspecified (via mysql2 3.9.7) | Connection pooling |
| **Templating** | EJS | 3.1.6 | Server-side rendering |
| **CSS Framework** | Bootstrap | 3.3.7 (CDN) | EOL |
| **JavaScript** | jQuery | 2.2.4 (CDN) | EOL |
| **Icons** | Font Awesome | 4.7.0 (CDN) | Superseded |
| **Process Manager** | PM2 | Unknown | Production only |
| **Reverse Proxy** | None configured | — | Direct port 3000 |

## Architecture Style

**Monolithic MVC (partial)** — The application follows a partial Model-View-Controller pattern:
- **Model**: MySQL database accessed via `database.js` (connection pool wrapper), with business logic in `services/ClubService.js`
- **View**: 35 EJS templates organized by feature module (views/)
- **Controller**: 7 Express route modules (routes/) + inline routes in server.js

The separation is incomplete: business logic leaks into route handlers, routes remain in server.js, and there is no formal model layer.

## Deployment Model

```
Developer Machine → (rsync) → Single Debian Server
                                    │
                                    ├── PM2 (process manager)
                                    │   └── node server.js (port 3000)
                                    │
                                    ├── MySQL (localhost, root, no password)
                                    │
                                    └── SMTP (smtp.orange.fr:587)
```

- **Deployment**: Manual `rsync` via `scripts/deploy.sh` — no CI/CD
- **Server**: Single Debian Linux server at hardcoded IP
- **Process Management**: PM2 without configuration file
- **Database**: MySQL on localhost with root credentials and no password
- **Email**: SMTP relay via Orange ISP
- **No HTTPS**: Application accessible only via HTTP on port 3000
- **No Load Balancer**: Single server, no redundancy
- **No Health Checks**: No monitoring or auto-restart beyond PM2

## Key Architectural Decisions

1. **Single database for all data** — no microservice separation
2. **Server-side rendering** — no SPA/frontend framework, all pages rendered by EJS
3. **Session-based authentication** — express-session with cookie storage (7-day expiry)
4. **Monolithic service layer** — all business logic in a single 929-line ClubService.js
5. **Callback-based async** — no Promises or async/await; deeply nested callbacks
6. **Denormalized schema** — redundant columns stored for "performance" rather than using JOINs
7. **CDN for frontend assets** — Bootstrap, jQuery, Font Awesome loaded from CDN

## Historical Context

| Year | Event | Developer |
|------|-------|-----------|
| 2015 | Initial creation, all routes in server.js | Pierre Martin |
| 2016 | Admin backdoor added "temporarily" | Pierre Martin |
| 2017 | Connection pool added after prod crash; backup.sh created | Thomas |
| 2018 | Members route partially extracted; payments module created | Thomas |
| 2019 | Partial route migration to routes/ directory; middleware/auth.js created (never used) | Karim |
| 2020 | Reports module created (phase 1 only); mobile app cancelled | Thomas |
| 2021 | v3 refactor planned (split ClubService) — never finished | Christophe |
| 2022 | Security audit noted SQL injection, MD5 issues — fixes not applied | Kevin |
| 2023 | SMTP server updated; season updated in config.js | Kevin |
| 2024 | mysql2 package adopted for MySQL 8+ auth compatibility | Unknown |

## Cross-References

- [Components](components.md) — Detailed component documentation
- [Dependencies](dependencies.md) — Dependency mapping
- [Patterns](patterns.md) — Design patterns and anti-patterns
- [Technical Debt Report](../technical-debt-report.md) — Debt overview
- [Code Metrics](../analysis/code-metrics.md) — Codebase statistics
