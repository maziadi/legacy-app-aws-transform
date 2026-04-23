# Behavioral Diagrams — Club Manager v3

## Sequence Diagram: Login Flow

```
Browser              server.js              database.js           MySQL
  │                     │                       │                    │
  │  POST /login        │                       │                    │
  │  (username,password) │                       │                    │
  │────────────────────>│                       │                    │
  │                     │                       │                    │
  │                     │ [REMOVED] Backdoor    │                    │
  │                     │ check was removed     │                    │
  │                     │                       │                    │
  │                     │ SQL (string concat!)  │                    │
  │                     │ SELECT * FROM members │                    │
  │                     │ WHERE email='<user>'  │                    │
  │                     │──────────────────────>│                    │
  │                     │                       │  query             │
  │                     │                       │───────────────────>│
  │                     │                       │  results           │
  │                     │                       │<───────────────────│
  │                     │  callback(null, rows) │                    │
  │                     │<──────────────────────│                    │
  │                     │                       │                    │
  │                     │ md5(password) check   │                    │
  │                     │ [or plaintext fallback]│                   │
  │                     │                       │                    │
  │                     │ Create session        │                    │
  │                     │ {id,email,role,...}    │                    │
  │                     │                       │                    │
  │                     │ Fire-and-forget:      │                    │
  │                     │ UPDATE last_login     │                    │
  │                     │──────────────────────>│───────────────────>│
  │                     │                       │                    │
  │  302 → /dashboard  │                       │                    │
  │<────────────────────│                       │                    │
```

## Sequence Diagram: Member Creation

```
Browser        routes/members.js    ClubService.js       database.js        MySQL       SMTP
  │                 │                    │                    │                │            │
  │ POST /members   │                    │                    │                │            │
  │ (form data)     │                    │                    │                │            │
  │────────────────>│                    │                    │                │            │
  │                 │ createMember(data)  │                    │                │            │
  │                 │───────────────────>│                    │                │            │
  │                 │                    │ SELECT COUNT(*)    │                │            │
  │                 │                    │ → member_number    │                │            │
  │                 │                    │───────────────────>│───────────────>│            │
  │                 │                    │<───────────────────│<───────────────│            │
  │                 │                    │                    │                │            │
  │                 │                    │ [if team_id]       │                │            │
  │                 │                    │ SELECT team name   │                │            │
  │                 │                    │───────────────────>│───────────────>│            │
  │                 │                    │<───────────────────│<───────────────│            │
  │                 │                    │                    │                │            │
  │                 │                    │ INSERT INTO members│                │            │
  │                 │                    │ (28 columns)       │                │            │
  │                 │                    │───────────────────>│───────────────>│            │
  │                 │                    │<───────────────────│<───────────────│            │
  │                 │                    │                    │                │            │
  │                 │                    │ sendWelcomeEmail   │                │            │
  │                 │                    │ (fire & forget)    │                │            │
  │                 │                    │────────────────────────────────────────────────>│
  │                 │                    │                    │                │            │
  │                 │ cb(null, insertId) │                    │                │            │
  │                 │<───────────────────│                    │                │            │
  │ 302 → /members/:id                  │                    │                │            │
  │<────────────────│                    │                    │                │            │
```

## Sequence Diagram: Dashboard Loading (N+1 Pattern)

```
Browser         server.js                database.js              MySQL
  │                │                         │                      │
  │ GET /dashboard │                         │                      │
  │───────────────>│                         │                      │
  │                │ Q1: COUNT active members │                      │
  │                │────────────────────────>│─────────────────────>│
  │                │<────────────────────────│<─────────────────────│
  │                │                         │                      │
  │                │ Q2: COUNT active teams   │                      │
  │                │────────────────────────>│─────────────────────>│
  │                │<────────────────────────│<─────────────────────│
  │                │                         │                      │
  │                │ Q3: COUNT upcoming events│                      │
  │                │────────────────────────>│─────────────────────>│
  │                │<────────────────────────│<─────────────────────│
  │                │                         │                      │
  │                │ Q4: SUM overdue payments │                      │
  │                │────────────────────────>│─────────────────────>│
  │                │<────────────────────────│<─────────────────────│
  │                │                         │                      │
  │                │ Q5: 5 recent members    │                      │
  │                │────────────────────────>│─────────────────────>│
  │                │<────────────────────────│<─────────────────────│
  │                │                         │                      │
  │                │ Q6: 10 next events      │                      │
  │                │────────────────────────>│─────────────────────>│
  │                │<────────────────────────│<─────────────────────│
  │                │                         │                      │
  │                │ Q7: Birthdays this month│                      │
  │                │────────────────────────>│─────────────────────>│
  │                │<────────────────────────│<─────────────────────│
  │                │                         │                      │
  │                │ render('dashboard')     │                      │
  │ HTML response  │                         │                      │
  │<───────────────│                         │                      │
```

## Activity Diagram: Membership Renewal

```
    [Admin clicks Renew]
           │
           ▼
    ┌──────────────┐
    │ Parse form:  │
    │ sub_type,    │
    │ pay_method   │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │ Lookup amount│
    │ from config  │
    │ (default 280)│
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │ Calculate    │
    │ newRenewalDate│
    │ = now + 1yr  │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │ UPDATE member│
    │ renewal_date │
    │ sub_type     │
    │ sub_amount   │
    │ status=active│
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │ SELECT member│
    │ name/email   │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │ Record       │
    │ Payment      │  ← fire-and-forget
    │ (paid)       │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │ Flash success│
    │ Redirect     │
    └──────────────┘
```

## State Machine: Member Lifecycle

```
    [New Member Created]
           │
           ▼
    ┌──────────────┐
    │   ACTIVE     │ ←──── [Renewal POST]
    │              │
    │ renewal_date │
    │ in future    │
    └──────┬───────┘
           │
           │ renewal_date passes
           │ (no auto-action)
           ▼
    ┌──────────────┐
    │   EXPIRED    │    (status still 'active', but
    │  (logical)   │     isMembershipExpired returns true)
    │              │
    └──────┬───────┘
           │
     ┌─────┴──────┐
     │            │
     ▼            ▼
┌─────────┐  ┌──────────┐
│ RENEWED │  │ SOFT     │
│ (back to│  │ DELETED  │
│ ACTIVE) │  │          │
└─────────┘  │is_deleted│
             │= 1       │
             │status=   │
             │inactive  │
             └──────────┘
```

## Cross-References

- [Structural Diagrams](../structural/structural-diagrams.md) — Component diagrams
- [Architecture Diagrams](../architecture/architecture-diagrams.md) — System context
- [Workflows](../../behavior/workflows.md) — Detailed process flows
- [Decision Logic](../../behavior/decision-logic.md) — Decision points
