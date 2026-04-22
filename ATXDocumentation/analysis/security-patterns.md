# Security Patterns — Club Manager v3

## Severity Summary

| Severity | Count | Description |
|----------|-------|-------------|
| **High** | 10 | Critical vulnerabilities requiring immediate attention |
| **Medium** | 4 | Significant risks with potential for exploitation |
| **Low** | 3 | Best-practice deviations and hygiene issues |

---

## High Severity Vulnerabilities

### 1. SQL Injection (Critical)

**Description**: User input concatenated directly into SQL strings.

**Location 1: `server.js` POST `/login` (line ~101)**
```javascript
var sql = "SELECT * FROM members WHERE email = '" + username + "' AND is_deleted = 0";
```
**Exploit**: Username `' OR 1=1 --` bypasses authentication entirely.

**Location 2: `server.js` GET `/search` (line ~192)**
```javascript
var sql = "...first_name LIKE '%" + q + "%' OR last_name LIKE '%" + q + "%'...";
```
**Exploit**: Search query `%'; DROP TABLE members; --` could destroy data.

**Location 3: `routes/auth.js` POST `/login` (line ~23)**
```javascript
var sql = "SELECT * FROM members WHERE email = '" + username + "' AND is_deleted = 0 AND status = 'active'";
```
Same vulnerability as server.js login.

**Location 4: `ClubService.js` `getFinancialReport()` (line ~498)**
```javascript
"FROM payments WHERE YEAR(payment_date) = " + parseInt(year);
```
`parseInt()` provides minimal protection but is not parameterized.

**Recommendation**: Replace all string concatenation with parameterized queries using `?` placeholders.

### 2. MD5 Password Hashing (Critical)

**Locations**: `server.js` (line ~109), `routes/auth.js` (line ~30), `ClubService.js` (createMember, resetPassword)
**Issue**: MD5 is cryptographically broken. Rainbow table attacks crack MD5 passwords in seconds.
**Installed but unused**: `bcrypt` 5.0.1 is in package.json but never imported for password hashing.
**Recommendation**: Migrate all password hashing to bcrypt with appropriate salt rounds.

### 3. Plaintext Password Storage (Critical)

**Location**: `members.password_plain` column, `ClubService.createMember()` (line ~145), `ClubService.resetPassword()` (line ~682)
**Issue**: Every member's password stored in plaintext in the database.
**Login fallback**: If MD5 check fails, plaintext comparison is attempted (`user.password_plain === password`).
**Recommendation**: Remove `password_plain` column, remove all plaintext password logic.

### 4. Admin Backdoor (Critical)

**Location**: `config.js` (line ~72), `server.js` (line ~99), `routes/auth.js` (line ~18)
**Credentials**: `superadmin` / `Sup3rAdm1n2016` (hardcoded since 2016)
**Issue**: Anyone with source code access has unrestricted superadmin access.
**Recommendation**: Remove immediately. Added as "temporary" in 2016, noted for removal in 2022 audit.

### 5. Hardcoded Credentials in Source Code (Critical)

| File | Credential | Value |
|------|-----------|-------|
| `config.js` | DB password | `''` (empty — root with no password) |
| `config.js` | SMTP password | `'OrangeSmtp#2023!'` |
| `config.js` | Session secret | `'ClubManager_Session_Secret_2015_NeverChange'` |
| `config.js` | Admin backdoor | `'Sup3rAdm1n2016'` |
| `scripts/backup.sh` | DB password | `'Club@Admin2015!'` |
| `scripts/deploy.sh` | Server IP | `'185.12.34.56'` |

**Recommendation**: Move all to environment variables; add to `.gitignore`.

### 6. No HTTPS (High)

**Location**: `config.js` `app.baseUrl = 'http://localhost:3000'`, `scripts/deploy.sh` (`http://185.12.34.56:3000`)
**Issue**: All traffic including login credentials transmitted unencrypted.
**Recommendation**: Configure HTTPS with TLS certificates; redirect HTTP to HTTPS.

### 7. TLS Disabled for SMTP (High)

**Location**: `ClubService.js` `getTransporter()` — `tls: { rejectUnauthorized: false }`
**Issue**: SMTP connection vulnerable to man-in-the-middle attacks.
**Recommendation**: Enable TLS verification, configure proper certificates.

### 8. Session Secret Never Rotated (High)

**Location**: `config.js` — `secret: 'ClubManager_Session_Secret_2015_NeverChange'`
**Issue**: If secret is compromised, all sessions can be forged. Secret has been the same since 2015.
**Recommendation**: Rotate session secret, store in environment variable.

### 9. No CSRF Protection (High)

**Issue**: No CSRF tokens on any forms. All POST actions vulnerable to cross-site request forgery.
**Impact**: External websites could trigger member deletion, payment recording, password changes.
**Recommendation**: Add CSRF middleware (e.g., `csrf-csrf` or `csurf`).

### 10. Error Message Information Disclosure (High)

**Location**: `server.js` global error handler (line ~231)
```javascript
res.status(500).send('<h1>500 - Erreur serveur</h1><p>' + err.message + '</p>...');
```
**Issue**: Internal error messages, including database errors and stack traces, exposed to users.
**Recommendation**: Show generic error page; log details server-side only.

---

## Medium Severity Vulnerabilities

### 11. XSS Vulnerability Potential
**Issue**: No input sanitization at application level. User data goes directly to database and back to templates.
**Mitigating Factor**: EJS `<%= %>` (escaped output) provides some protection.
**Risk**: If `<%- %>` (unescaped) is used in any template, XSS is immediate.
**Recommendation**: Add input validation/sanitization layer.

### 12. `multipleStatements: true` in MySQL Config
**Location**: `config.js` `db.multipleStatements = true`
**Issue**: Enables multi-statement SQL injection attacks. Combined with SQL injection vulnerabilities, this allows attackers to execute arbitrary SQL commands.
**Recommendation**: Disable unless specifically required.

### 13. No Rate Limiting
**Issue**: No rate limiting on login, password reset, or any API endpoint.
**Impact**: Brute force attacks on login, denial of service.
**Recommendation**: Add rate limiting middleware (e.g., `express-rate-limit`).

### 14. MemoryStore for Sessions
**Issue**: Default MemoryStore used for session storage (not production-ready).
**Impact**: Memory leak on production server; sessions lost on restart.
**Recommendation**: Use Redis or database-backed session store.

---

## Low Severity Issues

### 15. SQL Logging in Production
**Location**: `database.js` — always logs truncated SQL to console.
**Issue**: Performance overhead; potential sensitive data in logs.
**Recommendation**: Conditional logging based on environment.

### 16. Backup Credentials in Shell Script
**Location**: `scripts/backup.sh` — `DB_PASS="Club@Admin2015!"`
**Issue**: Visible in process list (`ps aux`) when mysqldump runs.
**Recommendation**: Use `.my.cnf` or environment variables.

### 17. Unencrypted Sensitive Data
**Location**: `members.medical_info` — TEXT column with no encryption.
**Issue**: Medical information stored in plaintext in database.
**Recommendation**: Encrypt at rest; consider GDPR implications.

---

## Security Controls Present

| Control | Status | Notes |
|---------|--------|-------|
| Authentication | ✅ Partial | Session-based, but MD5/plaintext |
| Authorization | ✅ Partial | Role checks exist but inconsistent |
| Input validation | ❌ None | No server-side validation |
| Output encoding | ✅ Partial | EJS default escaping |
| CSRF protection | ❌ None | |
| Rate limiting | ❌ None | |
| HTTPS | ❌ None | |
| Secret management | ❌ None | All hardcoded |
| Audit logging | ❌ None | Table exists but unused |
| Error handling | ❌ Exposes internals | |

## Cross-References

- [Technical Debt Report](../technical-debt-report.md) — Executive summary
- [Outdated Components](../technical-debt/outdated-components.md) — Vulnerable dependencies
- [Remediation Plan](../technical-debt/remediation-plan.md) — Fix priorities
- [Error Handling](../behavior/error-handling.md) — Error patterns
- [Decision Logic](../behavior/decision-logic.md) — Auth decision points
