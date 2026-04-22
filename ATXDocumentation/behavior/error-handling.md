> ⚠️ **Early Access**: Behavior documentation is in early access. Please review critically.

# Error Handling — Club Manager v3

## Error Handling Patterns

### 1. Callback Error Propagation (Primary Pattern)
The application uses Node.js callback convention `(err, result)` throughout. However, error propagation is inconsistent:

**Proper propagation (rare):**
```javascript
// ClubService.recordPayment
if (err || !rows || rows.length === 0) {
  return callback(new Error('Membre introuvable'));
}
```

**Partial propagation (common):**
```javascript
// ClubService.getAllMembers
if (err) {
  console.log('ClubService.getAllMembers error:', err);
  return callback(err, null);  // propagated
}
// But inner N+1 query errors (err2) are silently ignored
```

**No propagation (frequent):**
```javascript
// Multiple fire-and-forget patterns
db.query('UPDATE members SET last_login = NOW() WHERE id = ?', [user.id], function () {});
```

### 2. Fire-and-Forget Pattern (Pervasive)

Many async operations are executed without any error handling. Failures are completely silent:

| Location | Operation | Error Impact |
|----------|-----------|-------------|
| `server.js` login | `UPDATE last_login` | Last login date may not update |
| `ClubService.createMember` | `sendWelcomeEmail()` | New member doesn't receive welcome email |
| `ClubService.recordPayment` | `UPDATE members SET total_paid` | Member totals become stale |
| `ClubService.recordPayment` | `sendPaymentReceipt()` | No payment receipt sent |
| `ClubService.createEvent` | `INSERT INTO bookings` | Facility booking not created |
| `ClubService.updateMember` | `UPDATE teams SET current_players` | Team player count wrong |
| `routes/events.js` cancel | `UPDATE bookings SET status` | Booking remains confirmed after event cancelled |

### 3. Global Error Handler (server.js)

```javascript
app.use(function (err, req, res, next) {
  console.log('UNHANDLED ERROR:', err.message);
  console.log(err.stack);
  res.status(500).send('<h1>500 - Erreur serveur</h1><p>' + err.message + '</p>...');
});
```

**Issues:**
- **Exposes error message to user**: `err.message` sent directly in HTML response — information disclosure
- **No error classification**: All errors treated identically (DB errors, validation errors, auth errors)
- **No error monitoring**: Only console.log, no external alerting or error tracking service
- **No recovery**: Just renders error page, no retry or graceful degradation

### 4. Route-Level Error Handling

Most routes follow this pattern:
```javascript
ClubService.someMethod(params, function (err, result) {
  if (err) {
    console.log('ERROR:', err);
    return res.render('page', { error: err.message });  // or redirect with flash
  }
  res.render('page', { data: result });
});
```

**Issues:**
- Error messages exposed to users in many places
- No distinction between user-facing and internal errors
- Flash messages used inconsistently for error display

### 5. Database Error Handling

**database.js query function:**
```javascript
pool.query(sql, params, function (err, results) {
  if (err) {
    console.log('===== DB ERROR =====');
    console.log('Query:', sql);     // Logs full SQL (may contain sensitive data)
    console.log('Error:', err.message);
    if (callback) callback(err, null);
    return;
  }
  if (callback) callback(null, results);
});
```

**Issues:**
- Full SQL query logged on error (may contain user data)
- No connection retry on transient failures
- Startup connection failure logged but process continues running

### 6. Console.log Error Logging

All error logging uses `console.log()`:
- No log levels (debug, info, warn, error)
- No structured logging (JSON format)
- No log rotation or management
- No external log aggregation
- SQL debug logging always on in production
- Mixed informational and error logs in same stream

### 7. No Input Validation Pattern

The application has **no server-side input validation**:

```javascript
// routes/members.js POST /
var data = req.body;
// no validation - html required attribute is the only "validation"
ClubService.createMember(data, req.session.user.email, function (err, newId) { ... });
```

**Consequences:**
- Any data type accepted for any field
- No length checks, format checks, or range checks
- Payment amounts can be 0 or negative
- Status fields accept arbitrary strings
- Email addresses not validated server-side
- SQL injection possible where queries use string concatenation
- XSS possible where data rendered in templates without sanitization

### 8. Incomplete Sanitization

`utils/helpers.js` has a `sanitize()` function but it is **never used**:
```javascript
function sanitize(str) {
  return str.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  // missing: quote attributes, JSON encoding
}
```

EJS templates use `<%= %>` (escaped output) by default, which provides some XSS protection for template-rendered content. However, user input that goes through SQL and back is not sanitized at the application level.

### 9. SMTP Error Handling

```javascript
// ClubService.sendEmail
transporter.sendMail({...}, function (err, info) {
  if (err) {
    console.log('Email error to', to, ':', err.message);
    if (callback) callback(err);
  } else {
    console.log('Email sent to', to);
    if (callback) callback(null, info);
  }
});
```

Most callers invoke email functions without callbacks:
```javascript
ClubService.sendWelcomeEmail(data.email, data.first_name);  // no callback
```
Result: email failures are logged but never surfaced to users or retried.

### 10. Missing Error Scenarios

| Scenario | Handling | Should Be |
|----------|----------|-----------|
| Database connection lost | Logged, process continues | Retry with backoff, alert |
| SMTP server unreachable | Logged silently | Queue for retry, notify admin |
| Disk full (uploads/backups) | Unhandled | Pre-check space, alert |
| Concurrent member number generation | Race condition | Use DB sequence or transaction |
| Session store overflow (MemoryStore) | Memory leak → OOM | Use Redis/DB session store |
| Invalid file upload | No handling | Validate file type and size |
| Malformed request body | Express default 400 | Custom validation with messages |

## Cross-References

- [Business Logic](business-logic.md) — Business rule implementations
- [Workflows](workflows.md) — Process flows showing error paths
- [Decision Logic](decision-logic.md) — Decision points
- [Security Patterns](../analysis/security-patterns.md) — Security vulnerabilities
- [Patterns](../architecture/patterns.md) — Anti-patterns identified
