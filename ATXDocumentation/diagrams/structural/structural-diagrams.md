# Structural Diagrams — Club Manager v3

## Component Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Club Manager v3                               │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────┐       │
│  │                    server.js (Entry Point)                │       │
│  │  - Express app init     - Middleware chain                │       │
│  │  - Inline routes        - Route mounting                  │       │
│  │  - 404/500 handlers     - Server startup                  │       │
│  └──────────┬──────────────────────┬────────────────────────┘       │
│             │                      │                                 │
│  ┌──────────▼───────────┐  ┌──────▼────────────────────────────┐   │
│  │   Route Modules       │  │  Inline Routes (in server.js)     │   │
│  │                       │  │  - /login, /logout                │   │
│  │  routes/auth.js       │  │  - /dashboard                    │   │
│  │  routes/members.js    │  │  - /profile                      │   │
│  │  routes/teams.js      │  │  - /search                       │   │
│  │  routes/events.js     │  │  - /settings                     │   │
│  │  routes/payments.js   │  │  - /admin/import                 │   │
│  │  routes/facilities.js │  │  - /api/stats/*                  │   │
│  │  routes/reports.js    │  │                                   │   │
│  └──────────┬───────────┘  └──────┬────────────────────────────┘   │
│             │                      │                                 │
│  ┌──────────▼──────────────────────▼────────────────────────────┐   │
│  │              services/ClubService.js (929 lines)              │   │
│  │                                                               │   │
│  │  ┌─────────┐ ┌──────────┐ ┌─────────┐ ┌──────────┐         │   │
│  │  │ Member  │ │ Payment  │ │  Team   │ │  Event   │         │   │
│  │  │ Mgmt    │ │ Mgmt     │ │ Mgmt    │ │ Mgmt     │         │   │
│  │  └─────────┘ └──────────┘ └─────────┘ └──────────┘         │   │
│  │  ┌─────────┐ ┌──────────┐ ┌─────────┐ ┌──────────┐         │   │
│  │  │Facility │ │Reporting │ │  Email  │ │  Export  │         │   │
│  │  │ Mgmt    │ │          │ │ Utils   │ │ (CSV)    │         │   │
│  │  └─────────┘ └──────────┘ └─────────┘ └──────────┘         │   │
│  └──────────┬───────────────────────────────────────────────────┘   │
│             │                                                        │
│  ┌──────────▼────────────┐     ┌────────────────────┐               │
│  │    database.js        │     │    config.js        │               │
│  │  - query()            │◄────│  - DB credentials   │               │
│  │  - getConnection()    │     │  - SMTP settings    │               │
│  │  - pool               │     │  - Session config   │               │
│  └──────────┬────────────┘     │  - App constants    │               │
│             │                   └────────────────────┘               │
│             ▼                                                        │
│  ┌──────────────────────┐                                           │
│  │   MySQL Database     │                                           │
│  │   (8 tables)         │                                           │
│  └──────────────────────┘                                           │
└─────────────────────────────────────────────────────────────────────┘

UNUSED MODULES:
  middleware/auth.js  ─── Created but never imported
  utils/helpers.js    ─── Created but never imported in backend
```

## ClubService Method Domain Grouping

```
ClubService.js (929 lines)
│
├── Member Management (5 methods, ~300 lines)
│   ├── getAllMembers(filters, cb)
│   ├── getMemberById(id, cb)
│   ├── createMember(data, createdBy, cb)
│   ├── updateMember(id, data, updatedBy, cb)
│   └── deleteMember(id, deletedBy, cb)
│
├── Payment Management (5 methods, ~150 lines)
│   ├── getPayments(filters, cb)
│   ├── recordPayment(data, createdBy, cb)
│   ├── getOverduePayments(cb)
│   ├── getPendingPayments(cb)
│   └── sendPaymentReminders(cb)
│
├── Team Management (4 methods, ~120 lines)
│   ├── getAllTeams(cb)
│   ├── getTeamById(id, cb)
│   ├── createTeam(data, cb)
│   └── updateTeam(id, data, cb)
│
├── Event Management (3 methods, ~100 lines)
│   ├── getEvents(filters, cb)
│   ├── createEvent(data, createdBy, cb)
│   └── recordMatchResult(eventId, home, away, notes, cb)
│
├── Facility Management (3 methods, ~50 lines)
│   ├── getFacilities(cb)
│   ├── checkFacilityAvailability(...)
│   └── getBookings(filters, cb)
│
├── Reporting (3 methods, ~80 lines)
│   ├── getMembershipReport(season, cb)
│   ├── getFinancialReport(year, cb)
│   └── getDashboardStats(cb)
│
├── Email (5 methods, ~60 lines)
│   ├── getTransporter()
│   ├── sendEmail(to, subject, html, cb)
│   ├── sendWelcomeEmail(to, firstName)
│   ├── sendPaymentReceipt(to, firstName, amount)
│   └── sendEventReminder(to, firstName, title, date)
│
├── Export (2 methods, ~30 lines)
│   ├── exportMembersCSV(filters, cb)
│   └── exportPaymentsCSV(filters, cb)
│
└── Utilities (5 methods, ~40 lines)
    ├── formatDate(d)
    ├── formatCurrency(amount)
    ├── generateMemberNumber(cb)
    ├── resetPassword(email, cb)
    ├── isMembershipExpired(member)
    ├── backupDatabase(cb)
    └── checkRenewals(cb)
```

## Package Dependency Graph

```
┌─────────────────┐
│   server.js     │
└───────┬─────────┘
        │ requires
        ├──────────────────────────────────────────────┐
        │                                              │
┌───────▼─────────┐  ┌──────────────┐  ┌──────────────▼──────────────┐
│  routes/*.js    │  │  config.js   │  │  services/ClubService.js    │
│  (7 modules)    │  │  (leaf)      │  │  (929 lines)                │
└───────┬─────────┘  └──────┬───────┘  └──────────┬──────────────────┘
        │                   │                      │
        ├───────────────────┤                      │
        │                   │                      │
┌───────▼─────────┐  ┌─────▼────────┐     ┌───────▼──────────┐
│  database.js    │◄─┤  config.js   │     │  nodemailer       │
│  (pool wrapper) │  └──────────────┘     │  (email)          │
└───────┬─────────┘                       └──────────────────┘
        │
┌───────▼─────────┐
│   mysql2        │
│   (npm)         │
└─────────────────┘

NOT CONNECTED:
  middleware/auth.js (no importers)
  utils/helpers.js (no backend importers)
```

## Cross-References

- [Components](../architecture/components.md) — Detailed component documentation
- [Dependencies](../architecture/dependencies.md) — Full dependency mapping
- [Behavioral Diagrams](../diagrams/behavioral/behavioral-diagrams.md) — Sequence diagrams
- [Architecture Diagrams](../diagrams/architecture/architecture-diagrams.md) — System context
