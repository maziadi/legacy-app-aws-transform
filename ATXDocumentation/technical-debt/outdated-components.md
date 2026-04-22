# Outdated Components

## Runtime Environment

### Node.js (High Severity)
- **Current**: `>=10.0.0` in `package.json` engines field; Node.js 14.17.0 pinned in `scripts/deploy.sh`
- **Node 10 EOL**: April 30, 2021
- **Node 14 EOL**: April 30, 2023
- **Recommended**: Node.js 20 LTS (Active LTS) or Node.js 22 LTS
- **AWS Transformation**: `AWS/nodejs-version-upgrade` can automate this upgrade
- **Risk**: No security patches, missing modern language features (optional chaining, nullish coalescing, top-level await)
- **Migration Complexity**: Medium — the codebase uses callback-style `require()` and `var` declarations; no ES module syntax or modern features that would break on upgrade. Main concern is dependency compatibility.

## Frontend Frameworks (CDN) (High Severity)

### Bootstrap 3.3.7
- **Source**: CDN link in `views/layout.ejs`
- **EOL**: July 2019
- **Recommended**: Bootstrap 5.3+
- **Known Issues**: XSS vulnerabilities in tooltip/popover, no accessibility improvements
- **Migration Complexity**: High — all 35 EJS templates use Bootstrap 3 class names and grid system; significant template rewrite needed

### jQuery 2.2.4
- **Source**: CDN link in `views/layout.ejs`
- **Status**: jQuery 2.x no longer maintained
- **Known CVEs**: CVE-2020-11022, CVE-2020-11023 (XSS via `html()` method)
- **Recommended**: jQuery 3.7+ or removal
- **Migration Complexity**: Low — `public/js/app.js` (110 lines) has simple jQuery usage

### Font Awesome 4.7.0
- **Source**: CDN link in `views/layout.ejs`
- **Status**: Superseded by Font Awesome 6.x; 4.x no longer receives updates
- **Recommended**: Font Awesome 6.x or alternative icon library
- **Migration Complexity**: Low — icon class name changes (`fa` → `fa-solid`)

## npm Dependencies (Medium Severity)

### Runtime Dependencies

| Package | Current | Latest Stable | Severity | Notes |
|---------|---------|--------------|----------|-------|
| `express` | 4.17.1 | 4.21+ | Medium | Multiple security patches since 4.17.1 |
| `mysql2` | 3.9.7 | 3.11+ | Medium | Bug fixes and performance improvements |
| `ejs` | 3.1.6 | 3.1.10+ | Medium | Security patches for prototype pollution |
| `body-parser` | 1.19.0 | 1.20+ | Medium | Security fixes |
| `express-session` | 1.17.1 | 1.18+ | Medium | Security fixes for session handling |
| `bcrypt` | 5.0.1 | 5.1+ | Medium | Minor updates (note: bcrypt is installed but NOT used for password hashing — MD5 is used instead) |
| `moment` | 2.29.1 | 2.30+ | Medium | In maintenance mode; recommend migration to `date-fns` or `dayjs` |
| `lodash` | 4.17.21 | 4.17.21 | Low | Current version, but consider replacing with native JS methods |
| `multer` | 1.4.2 | 1.4.5+ | Medium | Security fixes for file upload handling |
| `nodemailer` | 6.6.3 | 6.9+ | Medium | Multiple security and bug fixes |
| `csv-parser` | 3.0.0 | 3.0.0 | Low | Current version; appears unused in active code paths |
| `md5` | 2.3.0 | 2.3.0 | High | Current version, but MD5 should NEVER be used for password hashing |
| `express-fileupload` | 1.2.1 | 1.5+ | Medium | Listed in package.json but not clearly used in application routes |

### Dev Dependencies
- **None configured**: `devDependencies: {}` in package.json
- No test framework, no linter, no formatter, no type checker

## Build Tools

### npm Scripts
- Only `start` and `dev` (both just `node server.js`)
- No build step, no test command, no lint command
- **Recommendation**: Add proper npm scripts for test, lint, build

### PM2 (Production Process Manager)
- Referenced in `deploy.sh` but no `ecosystem.config.js` file
- Configuration done ad-hoc via CLI flags
- **Recommendation**: Add PM2 configuration file

## Database

### MySQL
- No version specified in configuration
- `mysql2` driver 3.9.7 supports MySQL 5.7+ and MySQL 8.x
- `multipleStatements: true` enabled in config (security risk)
- **Recommendation**: Pin MySQL version requirement, disable `multipleStatements`

## Cryptographic Methods

### MD5 (High Severity)
- **Location**: `md5` npm package used in `server.js`, `routes/auth.js`, `services/ClubService.js`
- **Usage**: Password hashing for login and member creation
- **Issue**: MD5 is cryptographically broken; rainbow table attacks trivial
- **Recommendation**: Migrate to bcrypt (already installed as dependency)

## Cross-References

- [Technical Debt Report](../technical-debt-report.md) — Executive summary with AWS recommendation
- [Summary](summary.md) — Debt overview
- [Dependency Analysis](../analysis/dependency-analysis.md) — Full dependency graph
- [Security Patterns](../analysis/security-patterns.md) — Security vulnerabilities
