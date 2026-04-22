# Interfaces — Club Manager v3

## Express HTTP Routes

### Authentication (server.js + routes/auth.js)

| Method | Path | Auth | Handler | Description |
|--------|------|------|---------|-------------|
| GET | `/login` | None | server.js | Render login form (redirects to /dashboard if logged in) |
| POST | `/login` | None | server.js | Authenticate user (SQL injection, MD5, backdoor) |
| GET | `/logout` | None | server.js | Destroy session, redirect to /login |
| GET | `/auth/login` | None | routes/auth.js | Duplicate login form |
| POST | `/auth/login` | None | routes/auth.js | Duplicate login handler (adds status='active' check) |
| GET | `/auth/logout` | None | routes/auth.js | Duplicate logout |
| GET | `/auth/forgot-password` | None | routes/auth.js | Password reset form |
| POST | `/auth/forgot-password` | None | routes/auth.js | Send temp password email |

### Dashboard & Navigation (server.js)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | requireLogin | Redirect to /dashboard |
| GET | `/dashboard` | requireLogin | Dashboard with 7 nested DB queries |
| GET | `/search` | requireLogin | Global member search (SQL injection!) |
| GET | `/settings` | requireAdmin | View config (read-only) |
| POST | `/settings` | requireAdmin | Save settings (not implemented) |
| GET | `/profile` | requireLogin | View own profile |
| POST | `/profile/update` | requireLogin | Update own profile (phone, email2, address) |
| GET | `/admin/import` | requireAdmin | CSV import page (stub) |
| POST | `/admin/import` | requireAdmin | CSV import (not implemented, redirects) |

### API Endpoints (server.js)

| Method | Path | Auth | Response | Description |
|--------|------|------|----------|-------------|
| GET | `/api/stats/members-by-sport` | requireLogin | JSON array | Member count by sport |
| GET | `/api/stats/payments-monthly` | requireLogin | JSON array | Monthly payment totals (year param) |

### Members (routes/members.js)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/members` | requireLogin | List members with status/sport/team/role filters |
| GET | `/members/new` | requireAdmin | New member form |
| POST | `/members` | requireAdmin | Create member |
| GET | `/members/export/csv` | requireAdmin | Export members to CSV |
| POST | `/members/send-reminders` | requireAdmin | Send renewal reminders |
| GET | `/members/:id` | requireLogin | Member detail view |
| GET | `/members/:id/edit` | requireAdmin | Edit member form |
| POST | `/members/:id/update` | requireAdmin | Update member |
| POST | `/members/:id/delete` | requireAdmin | Soft-delete member |
| POST | `/members/:id/renew` | requireAdmin | Renew membership |
| GET | `/members/:id/certificate` | requireLogin* | Membership certificate (text) |

*Certificate: own member or admin only

### Teams (routes/teams.js)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/teams` | requireLogin | List all active teams |
| GET | `/teams/new` | requireAdmin† | New team form with coach dropdown |
| POST | `/teams` | requireAdmin† | Create team |
| GET | `/teams/:id` | requireLogin | Team detail with members and events |
| GET | `/teams/:id/edit` | requireAdmin† | Edit team form |
| POST | `/teams/:id/update` | requireAdmin† | Update team |
| POST | `/teams/:id/delete` | requireAdmin† | Archive team |
| GET | `/teams/:id/stats` | requireLogin | Team match statistics |

†Teams requireAdmin includes coach role

### Events (routes/events.js)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/events` | requireLogin | List events with filters |
| GET | `/events/calendar` | requireLogin | Monthly calendar view |
| GET | `/events/new` | requireAdmin† | New event form |
| POST | `/events` | requireAdmin† | Create event (auto-creates booking) |
| GET | `/events/:id` | requireLogin | Event detail with participants |
| POST | `/events/:id/result` | requireAdmin† | Record match result |
| POST | `/events/:id/cancel` | requireAdmin† | Cancel event and booking |
| POST | `/events/:id/participants` | requireAdmin† | Add participant |

†Events requireAdmin includes coach role

### Payments (routes/payments.js)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/payments` | requireAdmin | List payments with filters |
| GET | `/payments/overdue` | requireAdmin | Overdue payments list |
| GET | `/payments/new` | requireAdmin | New payment form |
| POST | `/payments` | requireAdmin | Record payment |
| GET | `/payments/export/csv` | requireAdmin | Export payments to CSV |
| POST | `/payments/send-reminders` | requireAdmin | Send overdue reminders |
| GET | `/payments/:id` | requireAdmin | Payment detail |
| POST | `/payments/:id/status` | requireAdmin | Update payment status |

### Facilities (routes/facilities.js)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/facilities` | requireLogin | List facilities with next bookings |
| GET | `/facilities/new` | requireAdmin | New facility form |
| POST | `/facilities` | requireAdmin | Create facility |
| GET | `/facilities/:id` | requireLogin | Facility detail with bookings |
| GET | `/facilities/:id/schedule` | requireLogin | Weekly booking schedule |

### Reports (routes/reports.js)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/reports` | requireAdmin | Report index page |
| GET | `/reports/membership` | requireAdmin | Membership statistics |
| GET | `/reports/financial` | requireAdmin | Financial summary (year param) |
| GET | `/reports/activity` | requireAdmin | Team activity report |
| GET | `/reports/birthdays` | requireAdmin | Birthday list (month param) |
| GET | `/reports/renewals` | requireAdmin | Upcoming renewals (days param) |
| POST | `/reports/backup` | requireAdmin | Trigger manual DB backup |

---

## ClubService Public Methods

### Member Management
| Method | Signature | Returns |
|--------|-----------|---------|
| `getAllMembers` | `(filters, callback)` | Array of member objects with last_payment |
| `getMemberById` | `(id, callback)` | Member object with team, payments, events |
| `createMember` | `(data, createdBy, callback)` | insertId |
| `updateMember` | `(id, data, updatedBy, callback)` | void |
| `deleteMember` | `(id, deletedBy, callback)` | void |
| `isMembershipExpired` | `(member)` | boolean (synchronous) |
| `generateMemberNumber` | `(callback)` | string (e.g., 'M00042') |
| `exportMembersCSV` | `(filters, callback)` | CSV string |
| `checkRenewals` | `(callback)` | `{ checked, notified }` |

### Payment Management
| Method | Signature | Returns |
|--------|-----------|---------|
| `getPayments` | `(filters, callback)` | Array of payment objects with member info |
| `recordPayment` | `(data, createdBy, callback)` | insertId |
| `getOverduePayments` | `(callback)` | Array of overdue payments |
| `getPendingPayments` | `(callback)` | Array of pending payments |
| `sendPaymentReminders` | `(callback)` | `{ sent, failed }` |
| `exportPaymentsCSV` | `(filters, callback)` | CSV string |

### Team Management
| Method | Signature | Returns |
|--------|-----------|---------|
| `getAllTeams` | `(callback)` | Array of teams with player count and coach |
| `getTeamById` | `(id, callback)` | Team with members, events, coach |
| `createTeam` | `(data, callback)` | insertId |
| `updateTeam` | `(id, data, callback)` | void |

### Event Management
| Method | Signature | Returns |
|--------|-----------|---------|
| `getEvents` | `(filters, callback)` | Array of events with participant count |
| `createEvent` | `(data, createdBy, callback)` | insertId |
| `recordMatchResult` | `(eventId, homeScore, awayScore, notes, callback)` | result string |

### Facility Management
| Method | Signature | Returns |
|--------|-----------|---------|
| `getFacilities` | `(callback)` | Array of facilities |
| `checkFacilityAvailability` | `(facilityId, start, end, excludeEventId, callback)` | boolean |
| `getBookings` | `(filters, callback)` | Array of bookings |

### Reporting
| Method | Signature | Returns |
|--------|-----------|---------|
| `getMembershipReport` | `(season, callback)` | Report object with aggregates |
| `getFinancialReport` | `(year, callback)` | Report object with monthly breakdown |
| `getDashboardStats` | `(callback)` | Stats object |

### Email
| Method | Signature | Returns |
|--------|-----------|---------|
| `getTransporter` | `()` | nodemailer transport (synchronous) |
| `sendEmail` | `(to, subject, html, callback)` | void |
| `sendWelcomeEmail` | `(to, firstName)` | void (fire-and-forget) |
| `sendPaymentReceipt` | `(to, firstName, amount)` | void (fire-and-forget) |
| `sendEventReminder` | `(to, firstName, eventTitle, eventDate)` | void (fire-and-forget) |

### Utilities
| Method | Signature | Returns |
|--------|-----------|---------|
| `formatDate` | `(d)` | formatted string |
| `formatCurrency` | `(amount)` | formatted string |
| `resetPassword` | `(email, callback)` | void |
| `backupDatabase` | `(callback)` | backup file path |

---

## database.js Exports

| Export | Signature | Description |
|--------|-----------|-------------|
| `query` | `(sql, params, callback)` | Execute parameterized SQL query |
| `getConnection` | `(callback)` | Get raw connection from pool |
| `pool` | mysql2 Pool instance | Direct pool access (inconsistency) |

## Cross-References

- [Program Structure](program-structure.md) — File tree
- [Data Models](data-models.md) — Database schema
- [Modules](api-reference.md) — Module organization
- [Components](../architecture/components.md) — Component details
- [Business Logic](../behavior/business-logic.md) — Business rule details
