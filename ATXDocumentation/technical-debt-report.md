# Technical Debt Report — Club Manager v3

## 🎯 AWS Transformation Recommendation

### **RECOMMENDED TRANSFORMATIONS: AWS/nodejs-version-upgrade**

Club Manager v3 requires Node.js >=10 and is tested on Node.js 14, both of which are End-of-Life. The `AWS/nodejs-version-upgrade` transformation can upgrade the Node.js runtime to a currently supported LTS version (e.g., Node.js 20 or 22), resolving the highest-severity technical debt item and ensuring the application runs on a secure, supported runtime. No other AWS-managed transformations apply since the project does not use AWS SDK, Python, Java, Angular, Vue.js, or Log4j.

---

## Executive Summary

Club Manager v3 ("ASC Villejuif Football" sports club management system) carries **significant technical debt** across runtime, dependencies, security, architecture, and code quality. The application was started in 2015 and has accumulated debt through multiple developer handoffs, incomplete refactors, and deferred maintenance tickets. The most critical issues are **EOL runtime and frameworks**, **severe security vulnerabilities**, and **outdated dependencies**.

### Severity Distribution

| Severity | Count | Category |
|----------|-------|----------|
| **High** | 10 | EOL/deprecated runtimes, frameworks, and critical security flaws |
| **Medium** | 10 | Outdated runtime dependencies |
| **Low** | 12 | Code quality, architecture, and developer tooling issues |

---

## Critical Issues (High Severity)

### 1. Node.js Runtime — End of Life
- **Current**: `>=10.0.0` (package.json engines), tested on Node.js 14.17.0 (deploy.sh)
- **Status**: Node.js 10 EOL April 2021; Node.js 14 EOL April 2023
- **Impact**: No security patches, potential vulnerabilities
- **Recommendation**: Upgrade to Node.js 20 LTS or Node.js 22 LTS using `AWS/nodejs-version-upgrade`

### 2. Bootstrap 3.3.7 (CDN) — End of Life
- **Status**: Bootstrap 3 EOL July 2019; no longer receives security updates
- **Impact**: XSS vulnerabilities in older Bootstrap, no accessibility improvements
- **Recommendation**: Migrate to Bootstrap 5.x

### 3. jQuery 2.2.4 (CDN) — End of Life
- **Status**: jQuery 2.x no longer maintained
- **Impact**: Known vulnerabilities (CVE-2020-11022, CVE-2020-11023)
- **Recommendation**: Upgrade to jQuery 3.7+ or remove dependency

### 4. MD5 Password Hashing
- **Location**: `services/ClubService.js`, `server.js`, `routes/auth.js`
- **Impact**: MD5 is cryptographically broken; passwords trivially crackable
- **Recommendation**: Migrate to bcrypt (already a dependency but unused for hashing)

### 5. Plaintext Password Storage
- **Location**: `members.password_plain` column, `ClubService.createMember()`, `ClubService.resetPassword()`
- **Impact**: Complete credential exposure if database is compromised
- **Recommendation**: Remove `password_plain` column and all references

### 6. SQL Injection Vulnerabilities
- **Locations**: `server.js` (login POST, search GET), `routes/auth.js` (login POST), `services/ClubService.js` (financial report)
- **Impact**: Full database compromise possible through string concatenation in queries
- **Recommendation**: Use parameterized queries (`?` placeholders) for all SQL

### 7. Admin Backdoor with Hardcoded Credentials
- **Location**: `config.js` (`adminFallback`), checked in `server.js` and `routes/auth.js`
- **Impact**: Anyone with source code access or credential knowledge has superadmin access
- **Recommendation**: Remove backdoor immediately

### 8. Hardcoded Credentials in Source Code
- **Locations**: `config.js` (DB root password, SMTP password, session secret), `scripts/backup.sh` (DB password)
- **Impact**: Credential exposure through version control
- **Recommendation**: Move all secrets to environment variables or a secrets manager

### 9. No HTTPS / TLS Disabled for Email
- **Location**: `config.js` (baseUrl is `http://`), `ClubService.js` (`tls: { rejectUnauthorized: false }`)
- **Impact**: All traffic including credentials transmitted in plaintext; SMTP MITM possible
- **Recommendation**: Enable HTTPS, configure proper TLS for SMTP

### 10. Session Secret Never Rotated
- **Location**: `config.js` — `'ClubManager_Session_Secret_2015_NeverChange'`
- **Impact**: Session hijacking risk if secret is compromised
- **Recommendation**: Rotate session secret, store in environment variable

---

## Medium Severity Issues (Outdated Dependencies)

| Package | Current | Latest | Notes |
|---------|---------|--------|-------|
| express | 4.17.1 | 4.21+ | Security patches missing |
| body-parser | 1.19.0 | 1.20+ | Outdated |
| express-session | 1.17.1 | 1.18+ | Security fixes missing |
| bcrypt | 5.0.1 | 5.1+ | Minor updates missing |
| moment | 2.29.1 | 2.30+ (maintenance mode) | Consider replacing with date-fns or dayjs |
| multer | 1.4.2 | 1.4.5+ | Security fixes |
| nodemailer | 6.6.3 | 6.9+ | Multiple fixes missing |
| csv-parser | 3.0.0 | 3.0.0 | Current (but unused in code) |
| md5 | 2.3.0 | 2.3.0 | Should not be used for password hashing |
| express-fileupload | 1.2.1 | 1.5+ | Listed but not used in main routes |

---

## Low Severity Issues (Code Quality & Architecture)

1. **Monolithic ClubService.js** (929 lines) — should be split into domain services
2. **N+1 Query Pattern** — found in dashboard, member listing, team stats, event listing, facility listing
3. **Duplicated Auth Middleware** — copy-pasted in server.js and 5 route files; `middleware/auth.js` exists but unused
4. **Duplicated Utility Functions** — `formatDate`, `formatCurrency`, `isMembershipExpired`, `generateMemberNumber` duplicated across ClubService, helpers.js, and routes
5. **Callback Hell** — no Promises or async/await; max nesting depth 7+ levels (dashboard)
6. **Denormalized Database** — redundant columns (full_name, team_name, member_name, etc.), stale computed fields (age, current_players)
7. **No Input Validation** — user input goes directly to DB and templates without sanitization
8. **No Test Suite** — zero tests, no test framework configured
9. **No Linting/Formatting** — no ESLint, Prettier, or code style enforcement
10. **Manual Deployment** — rsync-based deploy.sh with no CI/CD, no rollback, no health checks
11. **No CSRF Protection** — forms submit without CSRF tokens
12. **Subscription Amounts Hardcoded in 3 Places** — config.js, helpers.js, app.js

---

## Detailed Analysis

For detailed findings by category, see:

- [Technical Debt Summary](technical-debt/summary.md) — Overview of all findings
- [Outdated Components](technical-debt/outdated-components.md) — Full dependency analysis
- [Maintenance Burden](technical-debt/maintenance-burden.md) — Architectural and code quality debt
- [Remediation Plan](technical-debt/remediation-plan.md) — Prioritized action items

## Related Documentation

- [Architecture Overview](architecture/system-overview.md)
- [Security Patterns](analysis/security-patterns.md)
- [Dependency Analysis](analysis/dependency-analysis.md)
- [Code Metrics](analysis/code-metrics.md)
