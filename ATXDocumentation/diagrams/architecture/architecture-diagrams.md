# Architecture Diagrams — Club Manager v3

## System Context Diagram

```
                    ┌─────────────────────┐
                    │      Users          │
                    │                     │
                    │  Admins  Coaches    │
                    │  Members            │
                    └──────────┬──────────┘
                               │
                          HTTP (port 3000)
                          ⚠️ No HTTPS
                               │
                    ┌──────────▼──────────┐
                    │   Club Manager v3   │
                    │                     │
                    │  Node.js / Express  │
                    │  EJS Templates      │
                    │  PM2 Process Mgr    │
                    └──┬──────┬───────┬───┘
                       │      │       │
              ┌────────┘      │       └────────┐
              │               │                │
    ┌─────────▼──────┐ ┌─────▼──────┐ ┌───────▼────────┐
    │   MySQL DB     │ │   SMTP     │ │   CDN          │
    │                │ │            │ │                │
    │ localhost:3306 │ │smtp.orange │ │ Bootstrap 3.3.7│
    │ root (no pwd)  │ │ .fr:587   │ │ jQuery 2.2.4   │
    │                │ │            │ │ Font Awesome   │
    │ 8 tables       │ │ ⚠️ No TLS │ │ 4.7.0          │
    └────────────────┘ └────────────┘ └────────────────┘
```

## Integration Patterns

```
┌─────────────────────────────────────────────────────────┐
│                   Club Manager v3                        │
│                                                          │
│  ┌────────────────────┐    ┌────────────────────────┐   │
│  │   Express Server   │    │   EJS View Engine      │   │
│  │   (port 3000)      │───>│   35 templates         │   │
│  └────────┬───────────┘    └────────────────────────┘   │
│           │                                              │
│  ┌────────▼───────────┐                                 │
│  │   mysql2 Pool      │    Connection pool              │
│  │   10 connections   │    Callback-based queries       │
│  │   utf8mb4          │    multipleStatements: true ⚠️  │
│  └────────┬───────────┘                                 │
│           │                                              │
│  ┌────────▼───────────┐                                 │
│  │   nodemailer       │    SMTP relay                   │
│  │   Orange ISP       │    New transport per email ⚠️   │
│  │   Port 587         │    TLS disabled ⚠️              │
│  └────────────────────┘                                 │
│                                                          │
│  ┌────────────────────┐                                 │
│  │   child_process    │    mysqldump for backups        │
│  │   exec()           │    Credentials in CLI args ⚠️   │
│  └────────────────────┘                                 │
│                                                          │
│  ┌────────────────────┐                                 │
│  │   CDN (external)   │    No local fallback            │
│  │   Bootstrap 3.3.7  │    Single point of failure      │
│  │   jQuery 2.2.4     │    if CDN is down               │
│  │   Font Awesome 4.7 │                                 │
│  └────────────────────┘                                 │
└─────────────────────────────────────────────────────────┘
```

## Service Map: Express Route Groups

```
┌─────────────────────────────────────────────────────────────────┐
│                       Express Application                        │
│                                                                  │
│  Middleware Chain:                                                │
│  body-parser → session → logger → user-inject → routes          │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │  /auth   │  │ /members │  │  /teams  │  │ /events  │       │
│  │          │  │ (login)  │  │ (login)  │  │ (login)  │       │
│  │ login    │  │          │  │          │  │          │       │
│  │ logout   │  │ CRUD     │  │ CRUD     │  │ CRUD     │       │
│  │ forgot   │  │ renew    │  │ stats    │  │ calendar │       │
│  │          │  │ CSV      │  │          │  │ results  │       │
│  │          │  │ remind   │  │          │  │ cancel   │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
│       │              │              │              │              │
│  ┌────┴──────┐  ┌────┴──────┐  ┌───┴──────────────┘              │
│  │/payments  │  │/facilities│  │                                 │
│  │ (admin)   │  │ (login)   │  │                                 │
│  │           │  │           │  │                                 │
│  │ CRUD      │  │ CRUD      │  │   ┌────────────┐               │
│  │ overdue   │  │ schedule  │  │   │  /reports  │               │
│  │ remind    │  │           │  │   │  (admin)   │               │
│  │ CSV       │  │           │  │   │            │               │
│  └────┬──────┘  └────┬──────┘  │   │ membership │               │
│       │              │         │   │ financial  │               │
│       └──────┬───────┘         │   │ activity   │               │
│              │                 │   │ birthdays  │               │
│              └─────────────────┘   │ renewals   │               │
│                                    │ backup     │               │
│  All routes communicate with:      └─────┬──────┘               │
│                                          │                       │
│  ┌──────────────────────────────────────┐│                       │
│  │     services/ClubService.js          ││                       │
│  │     (+ some direct DB queries)       ││                       │
│  └───────────────┬──────────────────────┘│                       │
│                  │                        │                       │
│  ┌───────────────▼────────────────────────▼─────────────────┐   │
│  │                    database.js                            │   │
│  │                 MySQL Connection Pool                     │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Security Boundary Diagram

```
┌─── INTERNET ─────────────────────────────────────────────────┐
│                                                               │
│  ⚠️ NO HTTPS                                                 │
│  ⚠️ NO WAF                                                   │
│  ⚠️ NO CDN/PROXY                                             │
│                                                               │
│  ┌─── SINGLE SERVER (Debian) ──────────────────────────────┐ │
│  │                                                          │ │
│  │  ┌─── Express App ────────────────────────────────────┐ │ │
│  │  │                                                     │ │ │
│  │  │  ⚠️ NO Rate Limiting                               │ │ │
│  │  │  ⚠️ NO CSRF Protection                             │ │ │
│  │  │  ⚠️ NO Input Validation                            │ │ │
│  │  │                                                     │ │ │
│  │  │  ┌─── PUBLIC ZONE ──────────────────────────────┐  │ │ │
│  │  │  │  /login, /auth/login, /auth/forgot-password  │  │ │ │
│  │  │  │  (SQL injection in login!)                    │  │ │ │
│  │  │  │  (admin backdoor!)                            │  │ │ │
│  │  │  └──────────────────────────────────────────────┘  │ │ │
│  │  │                                                     │ │ │
│  │  │  ┌─── AUTHENTICATED ZONE (session check) ──────┐  │ │ │
│  │  │  │  /dashboard, /search, /profile               │  │ │ │
│  │  │  │  /members (view), /teams, /events            │  │ │ │
│  │  │  │  /facilities                                  │  │ │ │
│  │  │  │  (SQL injection in search!)                   │  │ │ │
│  │  │  └──────────────────────────────────────────────┘  │ │ │
│  │  │                                                     │ │ │
│  │  │  ┌─── ADMIN ZONE (role check) ─────────────────┐  │ │ │
│  │  │  │  /members (edit/create/delete)               │  │ │ │
│  │  │  │  /payments, /reports, /settings              │  │ │ │
│  │  │  │  (inconsistent role checks!)                 │  │ │ │
│  │  │  └──────────────────────────────────────────────┘  │ │ │
│  │  │                                                     │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  │                                                          │ │
│  │  ┌─── MySQL ──────────┐  ┌─── File System ──────────┐  │ │
│  │  │ root / no password │  │ /var/www/club_manager/    │  │ │
│  │  │ ⚠️ No encryption  │  │ uploads/  reports/        │  │ │
│  │  │ ⚠️ Plaintext pwds │  │ backups/                  │  │ │
│  │  └────────────────────┘  └───────────────────────────┘  │ │
│  │                                                          │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

## Cross-References

- [Structural Diagrams](../structural/structural-diagrams.md) — Component diagrams
- [Behavioral Diagrams](../behavioral/behavioral-diagrams.md) — Sequence diagrams
- [System Overview](../../architecture/system-overview.md) — Architecture details
- [Security Patterns](../../analysis/security-patterns.md) — Vulnerability details
