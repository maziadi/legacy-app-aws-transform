> ⚠️ **Early Access**: Behavior documentation is in early access. Please review critically.

# Decision Logic — Club Manager v3

## Role-Based Access Control

### Role Hierarchy
The application recognizes 4 roles with the following access levels:

| Role | Dashboard | View Members | Edit Members | View Teams | Edit Teams | Payments | Reports | Settings |
|------|-----------|-------------|-------------|-----------|-----------|---------|---------|----------|
| `superadmin` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `admin` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `coach` | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `member` | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |

### Access Control Decision Points

**`requireLogin` (server.js, middleware/auth.js)**
```
IF !req.session OR !req.session.user
  → Redirect to /login?msg=session_expired
ELSE
  → Allow request
```

**`requireAdmin` (server.js, routes/members.js, routes/payments.js, routes/facilities.js, routes/reports.js)**
```
IF !req.session OR !req.session.user
  → Redirect to /login
ELSE IF role !== 'admin' AND role !== 'superadmin'
  → Return 403 Accès refusé
ELSE
  → Allow request
```

**`requireAdmin` (routes/teams.js, routes/events.js) — DIFFERENT BEHAVIOR**
```
IF !req.session OR !req.session.user
  → Return 403 (NOT redirect to login!)
ELSE IF role !== 'admin' AND role !== 'superadmin' AND role !== 'coach'
  → Return 403 Accès refusé
ELSE
  → Allow request
```

**Certificate Access (routes/members.js GET /:id/certificate)**
```
IF role !== 'admin' AND role !== 'superadmin' AND user.id != memberId
  → Return 403
ELSE
  → Allow (own certificate or admin)
```

### Inconsistencies in Role Checks
- Teams and events allow `coach` role; members, payments, facilities, and reports do not
- Error responses differ: some redirect to login, others return 403 HTML
- `middleware/auth.js` has a `requireCoachOrAdmin` function that is never used

## Authentication Decision Logic

### Login Authentication (`server.js POST /login`)
```
1. [REMOVED] Admin backdoor check has been removed as a security remediation

2. Query: SELECT * FROM members WHERE email = '<username>' AND is_deleted = 0
   IF query error OR no rows
     → Render login with "Identifiants incorrects"

3. IF md5(password) === user.password_hash
     → Authentication success
   ELSE IF user.password_plain === password (plaintext fallback!)
     → Authentication success (with warning log)
   ELSE
     → Render login with "Identifiants incorrects"

4. Create session: { id, email, full_name, role, team_id }
5. Fire-and-forget: UPDATE last_login
6. Redirect to /dashboard
```

### routes/auth.js Login (DIFFERENT from server.js)
```
Same flow but additionally checks: AND status = 'active'
(server.js version does NOT check status — inactive members can log in via server.js)
```

## Subscription Pricing Logic

### Price Determination
```
subscription_type → amount (from config.subscriptions):
  'annual_adult'  → 280€
  'annual_junior' → 150€
  'annual_family' → 450€
  'monthly_adult' → 30€
  'trial'         → 0€
  (unknown type)  → 0€ (fallback)
```

This mapping exists in three locations:
1. `config.js` — `config.subscriptions` object
2. `utils/helpers.js` — `getSubscriptionAmount()` function
3. `public/js/app.js` — `subscriptionPrices` object (client-side)

### Renewal Amount (routes/members.js POST /:id/renew)
```
amount = config.subscriptions[subscriptionType] || 280
(Fallback to 280€ if type not found — hardcoded)
```

## Match Result Determination

### Win/Loss/Draw Logic (`ClubService.recordMatchResult`)
```
IF homeScore > awayScore → result = 'win'
ELSE IF homeScore < awayScore → result = 'loss'
ELSE → result = 'draw'
```
- Assumes "home" perspective for the club's team
- Result string stored redundantly (derivable from scores)
- No validation that scores are non-negative (parseInt with default 0)

## Membership Expiration Check

### `ClubService.isMembershipExpired(member)`
```
IF !member.renewal_date → return true (expired)
IF moment(renewal_date).isBefore(moment()) → return true (expired)
ELSE → return false (active)
```
- Called in member listing loop for visual flagging
- Does NOT auto-update member status — members remain "active" with expired renewal dates

## Payment Status Determination

### Status Values
- `'paid'` — payment completed
- `'pending'` — payment expected but not received

### Overdue Detection
```
IF status === 'pending' AND due_date < CURDATE()
  → Payment is overdue
```

### Status Update (routes/payments.js POST /:id/status)
```
newStatus = req.body.status (NO VALIDATION)
UPDATE payments SET status = newStatus
(Any arbitrary string accepted as status value)
```

## Member Search Logic (`server.js GET /search`)
```
IF query length < 2 (client-side check only, not server-side)
  → Alert "minimum 2 characters"

SQL: WHERE first_name LIKE '%<q>%' OR last_name LIKE '%<q>%' OR email LIKE '%<q>%' OR member_number LIKE '%<q>%'
LIMIT 50
(SQL injection vulnerability — q is not parameterized)
```

## Soft Delete vs Hard Delete

### Members: Soft Delete
```
UPDATE members SET is_deleted = 1, deleted_at = NOW(), deleted_by = ?, status = 'inactive'
(Data retained — GDPR concern)
```

### Teams: Archive (Soft Delete variant)
```
UPDATE teams SET status = 'archived'
(No is_deleted flag; members' team_id becomes dangling)
```

### Events: Cancel (Status Change)
```
UPDATE events SET status = 'cancelled'
UPDATE bookings SET status = 'cancelled' WHERE event_id = ?
```

## Cross-References

- [Business Logic](business-logic.md) — Detailed business rules
- [Workflows](workflows.md) — Process flows
- [Error Handling](error-handling.md) — Error patterns
- [Security Patterns](../analysis/security-patterns.md) — Security vulnerabilities
