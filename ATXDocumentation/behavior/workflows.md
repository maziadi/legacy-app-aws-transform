> ⚠️ **Early Access**: Behavior documentation is in early access. Please review critically.

# Workflows — Club Manager v3

## 1. Login Flow

```
User → GET /login → Render login form
User → POST /login (username, password)
  ├── Check admin backdoor (config.adminFallback)
  │   └── If match → Create superadmin session → Redirect /dashboard
  ├── Query: SELECT * FROM members WHERE email = '<username>' (SQL injection!)
  │   └── If no results → Render login with error
  ├── Check MD5: md5(password) === user.password_hash
  │   └── If mismatch → Check plaintext: user.password_plain === password
  │       └── If mismatch → Render login with error
  ├── Create session: { id, email, full_name, role, team_id }
  ├── Fire-and-forget: UPDATE members SET last_login = NOW()
  └── Redirect /dashboard
```

## 2. Member Registration Flow

```
Admin → GET /members/new → Fetch active teams → Render member form
Admin → POST /members (form data)
  ├── ClubService.createMember(data, currentUser)
  │   ├── Query: SELECT COUNT(*) FROM members → generate member_number
  │   ├── Calculate age from birth_date
  │   ├── Build full_name = first_name + ' ' + last_name
  │   ├── Hash password: md5(password || 'password123')
  │   ├── Store plaintext password
  │   ├── If team_id: Query team name for redundant storage
  │   ├── Lookup subscription amount from config
  │   ├── Set renewal_date = now + 1 year
  │   ├── INSERT INTO members (28 columns)
  │   ├── Fire-and-forget: sendWelcomeEmail(email, firstName)
  │   └── Return insertId
  ├── Set flash message: "Membre créé avec succès"
  └── Redirect /members/:newId
```

## 3. Membership Renewal Flow

```
Admin → POST /members/:id/renew (subscription_type, payment_method)
  ├── Lookup amount from config.subscriptions[type] (default 280€)
  ├── Set newRenewalDate = now + 1 year
  ├── UPDATE members SET renewal_date, subscription_type, subscription_amount, status='active'
  ├── Query member name/email
  ├── Fire-and-forget: ClubService.recordPayment({
  │     member_id, amount, type='subscription', method, description, date, status='paid'
  │   })
  ├── Set flash message with new renewal date
  └── Redirect /members/:id
```

## 4. Payment Recording Flow

```
Admin → GET /payments/new → Fetch active members → Render payment form
Admin → POST /payments (member_id, amount, type, method, reference, date, status)
  ├── ClubService.recordPayment(data, currentUser)
  │   ├── Query: SELECT member name, email FROM members WHERE id = ?
  │   │   └── If not found → Error: "Membre introuvable"
  │   ├── INSERT INTO payments (13 columns including redundant member_name, member_email)
  │   ├── Fire-and-forget: UPDATE members SET total_paid = (SUM subquery), last_payment_date
  │   ├── If status='paid': Fire-and-forget sendPaymentReceipt(email, firstName, amount)
  │   └── Return insertId
  ├── Set flash message: "Paiement enregistré"
  └── Redirect /payments/:newId
```

## 5. Event Creation Flow (with auto-booking)

```
Admin/Coach → GET /events/new → Fetch teams + facilities → Render event form
Admin/Coach → POST /events (title, type, sport, team_id, facility_id, dates, opponent, ...)
  ├── ClubService.createEvent(data, currentUser)
  │   ├── Calculate duration_minutes from start/end dates
  │   ├── If team_id: Query team name for redundant storage
  │   ├── If facility_id: Query facility name for redundant storage
  │   ├── INSERT INTO events (17 columns)
  │   ├── If facility_id provided:
  │   │   └── Fire-and-forget: INSERT INTO bookings (auto-create booking)
  │   └── Return insertId
  ├── Set flash message: "Événement créé"
  └── Redirect /events/:newId
```

## 6. Match Result Recording Flow

```
Admin/Coach → POST /events/:id/result (home_score, away_score, notes)
  ├── Parse scores as integers (default 0)
  ├── ClubService.recordMatchResult(eventId, homeScore, awayScore, notes)
  │   ├── Determine result: homeScore > awayScore ? 'win' : homeScore < awayScore ? 'loss' : 'draw'
  │   ├── UPDATE events SET home_score, away_score, result, status='completed', notes=CONCAT(notes)
  │   └── Return result string
  ├── Set flash message: "Résultat enregistré: {result}"
  └── Redirect /events/:id
```

## 7. Password Reset Flow

```
User → GET /auth/forgot-password → Render forgot password form
User → POST /auth/forgot-password (email)
  ├── ClubService.resetPassword(email)
  │   ├── Generate temp password: 'temp' + random(0-9999)
  │   ├── Hash with MD5
  │   ├── UPDATE members SET password_hash = md5, password_plain = plaintext WHERE email = ?
  │   │   └── If no rows affected → Error: "Email non trouvé"
  │   ├── Send email with plaintext temp password in body
  │   └── Return success
  └── Render form with success/error message
```

## 8. Dashboard Data Loading Flow

```
User → GET /dashboard (requireLogin)
  ├── Query 1: COUNT active members
  │   └── Query 2: COUNT active teams
  │       └── Query 3: COUNT upcoming events
  │           └── Query 4: COUNT + SUM overdue payments
  │               └── Query 5: SELECT 5 most recent members
  │                   └── Query 6: SELECT 10 next events with team names
  │                       └── Query 7: SELECT birthdays this month
  │                           └── Render dashboard_content template
  (7 sequential nested DB queries — N+1 pattern at its worst)
```

## 9. Facility Booking Flow

```
(Bookings are auto-created during event creation)
Event Creation → if facility_id provided:
  ├── INSERT INTO bookings (facility_id, facility_name, event_id, team_id, team_name,
  │     booked_by, start_time, end_time, purpose, status='confirmed')
  └── Errors silently swallowed

Event Cancellation → POST /events/:id/cancel:
  ├── UPDATE events SET status='cancelled'
  └── Fire-and-forget: UPDATE bookings SET status='cancelled' WHERE event_id = ?
```

## 10. Report Generation Flows

### Membership Report
```
Admin → GET /reports/membership (season)
  ├── ClubService.getMembershipReport(season)
  │   ├── Query 1: Aggregate member stats (total, active, inactive, coaches, gender, avg age)
  │   ├── Query 2: GROUP BY sport
  │   ├── Query 3: GROUP BY subscription_type
  │   └── Return combined report
  └── Render reports/membership template
```

### Financial Report
```
Admin → GET /reports/financial (year)
  ├── ClubService.getFinancialReport(year)
  │   ├── Query 1: Aggregate payment stats (collected, pending, overdue, by type)
  │   │   (year injected via parseInt — weak protection)
  │   ├── Query 2: Monthly breakdown
  │   └── Return combined report
  └── Render reports/financial template
```

### Payment Reminders
```
Admin → POST /payments/send-reminders
  ├── ClubService.sendPaymentReminders()
  │   ├── ClubService.getOverduePayments() → list of overdue payments
  │   ├── For each payment (sequential):
  │   │   ├── ClubService.sendEmail(recipient, subject, html)
  │   │   ├── If success: sent++
  │   │   ├── If failure: failed++
  │   │   └── Fire-and-forget: UPDATE payment description with reminder note
  │   └── Return { sent, failed }
  ├── Set flash message with counts
  └── Redirect /payments/overdue
```

## Cross-References

- [Business Logic](business-logic.md) — Detailed business rules
- [Decision Logic](decision-logic.md) — Decision points
- [Error Handling](error-handling.md) — Error patterns
- [Diagrams — Behavioral](../diagrams/behavioral/behavioral-diagrams.md) — Sequence diagrams
