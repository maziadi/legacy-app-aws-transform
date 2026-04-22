# Program Structure — Club Manager v3

## Complete File Tree

```
club-manager/                          # Project root (v3.1.4)
├── package.json                       # npm configuration, 13 dependencies, no devDependencies
├── package-lock.json                  # Dependency lock file
├── README.md                          # Original project README
├── server.js                          # Main entry point (343 lines)
│                                      #   - Express app init, middleware, session
│                                      #   - Inline routes: login, dashboard, profile, search, settings, import, API
│                                      #   - Route mounting for 7 route modules
│                                      #   - 404/500 handlers, server startup
│
├── config.js                          # Application configuration (95 lines)
│                                      #   - DB, session, SMTP, app, subscription, admin backdoor
│                                      #   - All values hardcoded (no env vars)
│
├── database.js                        # MySQL connection pool wrapper (79 lines)
│                                      #   - query(), getConnection(), pool export
│                                      #   - Connection validation on startup
│
├── services/
│   └── ClubService.js                 # Monolithic business logic (929 lines)
│                                      #   - Member CRUD, payment processing, team management
│                                      #   - Event/match management, facility management
│                                      #   - Reporting, email utilities, CSV export
│                                      #   - Password reset, DB backup, misc utilities
│
├── routes/
│   ├── auth.js                        # Authentication routes (79 lines)
│   │                                  #   - GET/POST /auth/login (duplicate of server.js)
│   │                                  #   - GET /auth/logout
│   │                                  #   - GET/POST /auth/forgot-password
│   │
│   ├── members.js                     # Member management routes (270 lines)
│   │                                  #   - CRUD, renewal, certificate, CSV export, reminders
│   │
│   ├── teams.js                       # Team management routes (125 lines)
│   │                                  #   - CRUD, stats
│   │
│   ├── events.js                      # Event/match routes (142 lines)
│   │                                  #   - CRUD, calendar, result recording, participants
│   │
│   ├── payments.js                    # Payment routes (152 lines)
│   │                                  #   - CRUD, overdue list, reminders, CSV export
│   │
│   ├── facilities.js                  # Facility management routes (102 lines)
│   │                                  #   - CRUD, schedule view
│   │
│   └── reports.js                     # Reporting routes (122 lines)
│                                      #   - Membership, financial, activity, birthdays, renewals, backup
│
├── middleware/
│   └── auth.js                        # Auth middleware (42 lines) — UNUSED
│                                      #   - requireLogin, requireAdmin, requireCoachOrAdmin
│                                      #   - Created 2019, never imported by any module
│
├── utils/
│   └── helpers.js                     # Utility functions (147 lines) — UNUSED in backend
│                                      #   - 17 exported functions (formatDate, formatCurrency, etc.)
│                                      #   - Many duplicated in ClubService.js
│
├── views/                             # EJS templates (35 files)
│   ├── layout.ejs                     # Base layout with navbar, CDN links, flash messages
│   ├── dashboard.ejs                  # Dashboard wrapper
│   ├── dashboard_content.ejs          # Dashboard KPI cards and widgets
│   ├── search.ejs                     # Global search results page
│   ├── settings.ejs                   # Application settings (read-only)
│   │
│   ├── partials/
│   │   └── navbar.ejs                 # Navigation bar partial
│   │
│   ├── auth/
│   │   ├── login.ejs                  # Login form
│   │   └── forgot.ejs                 # Password reset form
│   │
│   ├── admin/
│   │   └── import.ejs                 # CSV import page (stub)
│   │
│   ├── members/
│   │   ├── list.ejs                   # Member listing with filters
│   │   ├── detail.ejs                 # Member detail view
│   │   ├── form.ejs                   # Member create/edit form
│   │   └── profile.ejs               # User profile page
│   │
│   ├── teams/
│   │   ├── list.ejs                   # Team listing
│   │   ├── detail.ejs                 # Team detail with members and events
│   │   ├── form.ejs                   # Team create/edit form
│   │   └── stats.ejs                  # Team match statistics
│   │
│   ├── events/
│   │   ├── list.ejs                   # Event listing with filters
│   │   ├── detail.ejs                 # Event detail with participants
│   │   ├── form.ejs                   # Event create form
│   │   └── calendar.ejs              # Monthly calendar view
│   │
│   ├── facilities/
│   │   ├── list.ejs                   # Facility listing
│   │   ├── detail.ejs                 # Facility detail with bookings
│   │   ├── form.ejs                   # Facility create form
│   │   └── schedule.ejs              # Weekly schedule view
│   │
│   ├── payments/
│   │   ├── list.ejs                   # Payment listing with filters and totals
│   │   ├── detail.ejs                 # Payment detail
│   │   ├── form.ejs                   # Payment recording form
│   │   └── overdue.ejs               # Overdue payments list
│   │
│   └── reports/
│       ├── index.ejs                  # Report selection page
│       ├── membership.ejs             # Membership statistics report
│       ├── financial.ejs              # Financial summary report
│       ├── activity.ejs               # Team activity report
│       ├── birthdays.ejs              # Birthday list
│       └── renewals.ejs              # Upcoming renewals list
│
├── public/                            # Static assets
│   ├── css/
│   │   └── style.css                  # Application styles (94 lines)
│   └── js/
│       └── app.js                     # Frontend JavaScript (110 lines)
│
├── scripts/
│   ├── setup_db.sql                   # Database schema (260 lines) — drops & recreates DB
│   ├── seed.sql                       # Sample data (192 lines)
│   ├── deploy.sh                      # Manual rsync deployment (58 lines)
│   └── backup.sh                      # Manual DB backup (45 lines)
│
├── uploads/                           # File upload directory (auto-created)
├── reports/                           # Generated report directory (auto-created)
└── node_modules/                      # npm packages (excluded from analysis)
```

## File Statistics Summary

| Category | Files | Lines |
|----------|-------|-------|
| JavaScript (backend) | 13 | 2,906 |
| JavaScript (frontend) | 1 | 110 |
| CSS | 1 | 94 |
| EJS Templates | 35 | ~1,500 |
| SQL | 2 | 452 |
| Shell Scripts | 2 | 103 |
| Configuration (JSON) | 2 | ~540 |
| **Total Source** | **56** | **~5,705** |

## Cross-References

- [Components](../architecture/components.md) — Detailed component documentation
- [Interfaces](interfaces.md) — Public APIs and contracts
- [Data Models](data-models.md) — Database schema
- [Modules](api-reference.md) — Module organization
