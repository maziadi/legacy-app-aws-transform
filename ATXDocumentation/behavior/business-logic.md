> ⚠️ **Early Access**: Behavior documentation is in early access. Please review critically.

# Business Logic — Club Manager v3

## Member Management

### Member Creation (`ClubService.createMember`, `routes/members.js POST /`)
- **Member Number Generation**: `'M' + (COUNT(*) + 1).padStart(5, '0')` — race condition possible with concurrent inserts
- **Age Calculation**: `moment().diff(moment(birth_date), 'years')` — stored in DB, becomes stale immediately (never auto-recalculated)
- **Full Name**: Concatenation of `first_name + ' ' + last_name` stored redundantly
- **Password**: MD5 hash of provided password (or `'password123'` default); plaintext also stored in `password_plain` column
- **Subscription Amount**: Looked up from `config.subscriptions[subscription_type]` (e.g., annual_adult=280€, annual_junior=150€, annual_family=450€, monthly_adult=30€, trial=0€)
- **Renewal Date**: Set to 1 year from creation (`moment().add(1, 'year')`)
- **Team Name**: Fetched from teams table and stored redundantly in `members.team_name`
- **Welcome Email**: Sent via `ClubService.sendWelcomeEmail()` — fire-and-forget, errors swallowed
- **No Validation**: No server-side input validation; HTML `required` attributes are the only check

### Member Update (`ClubService.updateMember`)
- Recalculates age and full_name
- Fetches team name for redundant storage
- After update, recalculates `teams.current_players` via subquery (fire-and-forget)
- No password change capability in update flow

### Member Deletion (`ClubService.deleteMember`)
- **Soft Delete**: Sets `is_deleted = 1`, `deleted_at = NOW()`, `deleted_by`, `status = 'inactive'`
- Personal data retained (GDPR compliance issue noted in code comments)
- No cascade to related records (payments, events remain linked)

### Membership Renewal (`routes/members.js POST /:id/renew`)
- Business logic directly in route handler (not in ClubService)
- Updates `renewal_date` to `moment().add(1, 'year')`
- Sets `subscription_type` and `subscription_amount` from request body
- Forces `status = 'active'`
- Records payment via `ClubService.recordPayment()` — fire-and-forget
- Subscription amount derived from `config.subscriptions[type]` with fallback to 280€

### Membership Expiration Check (`ClubService.isMembershipExpired`)
- Returns `true` if `renewal_date` is before current date or null
- Used in member listing to flag expired members

### CSV Export (`ClubService.exportMembersCSV`)
- Fetches all members via `getAllMembers()` (includes N+1 payment query)
- Manually constructs CSV string without proper escaping of commas/quotes
- Headers: ID, Nom, Prénom, Email, Téléphone, Sport, Équipe, Statut, Inscription, Dernière cotisation

### Renewal Reminders
- Two implementations:
  1. `ClubService.checkRenewals()`: Finds members with renewal_date within 30 days, sends individual emails
  2. `routes/members.js POST /send-reminders`: Similar but queries directly, doesn't use ClubService properly

## Payment Processing

### Recording Payments (`ClubService.recordPayment`)
- Fetches member name/email for redundant storage in payment record
- Inserts payment with: member_id, member_name, member_email, amount, type, method, reference, description, date, due_date, status, season
- After insertion, updates `members.total_paid` (SUM subquery) and `members.last_payment_date` — fire-and-forget
- If status is `'paid'`, sends receipt email via `ClubService.sendPaymentReceipt()` — fire-and-forget
- No amount validation (can be 0 or negative)

### Overdue Detection (`ClubService.getOverduePayments`)
- Queries payments where `status = 'pending' AND due_date < CURDATE()`
- JOINs with members for contact information
- No index on `(status, due_date)` — causes full table scan

### Payment Reminders (`ClubService.sendPaymentReminders`)
- Fetches all overdue payments
- Iterates sequentially (not parallel), sending email for each
- Appends reminder note to payment description field via SQL CONCAT
- Returns count of sent and failed emails
- Supposed to be a cron job but runs manually from admin panel

## Team Management

### Team CRUD (`ClubService.createTeam`, `updateTeam`, `getAllTeams`, `getTeamById`)
- **Create**: Fetches coach name from members table for redundant storage; inserts with `current_players = 0`
- **Update**: Same redundant coach name fetch; duplicated logic from create
- **List**: Uses LEFT JOINs to get real player count and coach name; GROUP BY for aggregation
- **Detail**: N+1 pattern — 4 sequential queries (team, members, events, coach)

### Team Deletion (`routes/teams.js POST /:id/delete`)
- Sets `status = 'archived'` (not actual deletion)
- Does NOT update `members.team_id` — creates dangling references

### Team Stats (`routes/teams.js GET /:id/stats`)
- 6 nested sequential queries for: matches played, wins, losses, draws, goals for
- Should be a single query with conditional aggregation

## Event/Match Management

### Event Creation (`ClubService.createEvent`)
- Calculates `duration_minutes` from start/end dates (stored redundantly)
- Fetches team name and facility name for redundant storage
- After event insertion, auto-creates a facility booking if `facility_id` is provided — fire-and-forget
- Complex branching for team_id/facility_id combinations (4 code paths)

### Match Result Recording (`ClubService.recordMatchResult`)
- **Win/Loss/Draw Determination**: `homeScore > awayScore ? 'win' : homeScore < awayScore ? 'loss' : 'draw'`
- Result string stored redundantly (calculable from scores)
- Notes appended to existing notes via SQL CONCAT
- Sets `status = 'completed'`

### Event Cancellation (`routes/events.js POST /:id/cancel`)
- Sets event `status = 'cancelled'`
- Also cancels linked booking — fire-and-forget

### Participant Management (`routes/events.js POST /:id/participants`)
- Uses `INSERT IGNORE` — silently ignores duplicates
- No duplicate check or feedback to user

## Facility Management

### Availability Checking (`ClubService.checkFacilityAvailability`)
- Checks for overlapping bookings using time range comparison
- Can exclude a specific event_id (for editing existing bookings)
- Returns boolean: `conflicts === 0`

### Booking Management
- Bookings auto-created when events specify a facility
- Schedule view shows weekly bookings for a facility
- Booking cancellation cascaded from event cancellation

## Reporting

### Membership Report (`ClubService.getMembershipReport`)
- Aggregates: total members, active, inactive, coaches, male, female, average age
- Separate queries for by-sport and by-subscription breakdowns (N+1)

### Financial Report (`ClubService.getFinancialReport`)
- Aggregates: total collected, total pending, total overdue, total transactions, subscription revenue, equipment revenue
- Separate query for monthly breakdown
- Year parameter used with `parseInt()` only (weak protection)

### Activity Report (`routes/reports.js GET /activity`)
- Uses correlated subqueries per team for matches, wins, losses, draws, member count
- All in a single complex SQL statement

### Birthday List (`routes/reports.js GET /birthdays`)
- Filters members by `MONTH(birth_date)` for given month

### Renewal List (`routes/reports.js GET /renewals`)
- Finds members with `renewal_date` within configurable days (default 30)

## Authentication

### Login Flow (`server.js POST /login`, `routes/auth.js POST /login`)
- **Admin Backdoor**: [REMOVED] The admin backdoor has been removed as a security remediation
- **SQL Injection**: Email used directly in SQL string concatenation
- **MD5 Check**: `md5(password)` compared against `password_hash`
- **Plaintext Fallback**: If MD5 fails, checks `password_plain === password` as fallback
- **Session Creation**: Stores `{ id, email, full_name, role, team_id }` in session
- **Last Login Update**: `UPDATE members SET last_login = NOW()` — fire-and-forget

### Password Reset (`ClubService.resetPassword`)
- Generates weak temporary password: `'temp' + Math.floor(Math.random() * 9999)`
- Stores both MD5 hash AND plaintext of temporary password
- Sends plaintext temporary password in email body

### Session Management
- 7-day session cookie (was 1 day, extended after complaints)
- Session secret never rotated since 2015
- No session store (defaults to MemoryStore — not production-ready)

## Email Service

### Transport Configuration (`ClubService.getTransporter`)
- Creates new nodemailer transport on EVERY call (should be singleton)
- TLS verification disabled (`rejectUnauthorized: false`)
- Uses Orange ISP SMTP relay

### Email Templates (inline HTML strings)
- `sendWelcomeEmail`: Welcome message with login URL
- `sendPaymentReceipt`: Payment confirmation with amount
- `sendEventReminder`: Event reminder with date
- Payment reminder: Inline in `sendPaymentReminders`
- Renewal reminder: Inline in `checkRenewals`
- All emails use hardcoded HTML — no template system

## Cross-References

- [Workflows](workflows.md) — Process flow documentation
- [Decision Logic](decision-logic.md) — Decision points
- [Error Handling](error-handling.md) — Error patterns
- [Components](../architecture/components.md) — Component details
- [Interfaces](../reference/interfaces.md) — API contracts
