# Technical Debt Summary

## Overview

Club Manager v3 has accumulated significant technical debt since its inception in 2015. The application has been through multiple developer handoffs (Pierre Martin 2015, Thomas 2017-2021, Karim 2019, Kevin 2022-2023, Christophe 2023) with each leaving unfinished refactors and workarounds.

## Debt Categories

### 1. EOL/Deprecated Runtimes & Frameworks (High Severity)

| Component | Version | EOL Date | Risk |
|-----------|---------|----------|------|
| Node.js runtime | >=10 (tested 14) | 10: Apr 2021, 14: Apr 2023 | No security patches |
| Bootstrap (CDN) | 3.3.7 | Jul 2019 | Known XSS vulnerabilities |
| jQuery (CDN) | 2.2.4 | Unmaintained | Known CVEs |
| Font Awesome (CDN) | 4.7.0 | Superseded by v6 | No updates |

### 2. Security Vulnerabilities (High Severity)

| Issue | Location | Impact |
|-------|----------|--------|
| MD5 password hashing | ClubService.js, server.js, routes/auth.js | Passwords crackable in seconds |
| Plaintext password storage | members.password_plain, ClubService.createMember/resetPassword | Full credential exposure on DB breach |
| SQL injection | server.js (login, search), routes/auth.js (login), ClubService.js (financial report) | Complete database compromise |
| Admin backdoor | config.js (adminFallback), server.js, routes/auth.js | Unauthorized superadmin access |
| Hardcoded credentials | config.js (DB, SMTP, session secret), backup.sh | Credential leakage via VCS |
| No HTTPS | config.js (baseUrl=http://), no TLS config | Traffic interception |
| TLS disabled for SMTP | ClubService.js (rejectUnauthorized: false) | SMTP MITM |
| No CSRF protection | All form POST routes | Cross-site request forgery |
| No input validation | All routes accepting user input | XSS, data corruption |
| Session secret never rotated | config.js (since 2015) | Session hijacking |

### 3. Outdated Dependencies (Medium Severity)

All 13 npm dependencies are at outdated versions. See [Outdated Components](outdated-components.md) for details.

### 4. Code Quality & Architecture (Low Severity)

- Monolithic service file (ClubService.js — 929 lines)
- Callback hell (no Promises/async-await)
- N+1 query patterns throughout
- Duplicated code (auth middleware, utility functions, subscription amounts)
- Denormalized database schema with redundant and stale columns
- No test suite, no linting, no CI/CD
- Manual rsync deployment with no rollback

## Priority Order for Remediation

1. **Immediate** (High): Remove admin backdoor, fix SQL injection, remove plaintext passwords
2. **Urgent** (High): Upgrade Node.js runtime, migrate to bcrypt, add HTTPS
3. **Important** (Medium): Update all npm dependencies, migrate from Bootstrap 3
4. **Planned** (Low): Refactor architecture, add tests, set up CI/CD

## Cross-References

- [Technical Debt Report](../technical-debt-report.md) — Executive summary
- [Outdated Components](outdated-components.md) — Full dependency analysis
- [Maintenance Burden](maintenance-burden.md) — Architectural debt
- [Remediation Plan](remediation-plan.md) — Prioritized actions
- [Security Patterns](../analysis/security-patterns.md) — Security analysis
