# Complexity Analysis — Club Manager v3

## Callback Nesting Depth

The application uses callback-based asynchronous patterns exclusively (no Promises or async/await). This leads to deeply nested callback structures:

| Location | Max Depth | Description |
|----------|-----------|-------------|
| `server.js` dashboard (`GET /dashboard`) | **7 levels** | 7 sequential DB queries nested inside each other |
| `routes/teams.js` stats (`GET /:id/stats`) | **6 levels** | team query → 5 stat queries |
| `ClubService.createMember` | **5 levels** | COUNT → team name → INSERT → welcome email |
| `ClubService.createEvent` (team+facility) | **4 levels** | team name → facility name → INSERT → booking |
| `ClubService.getMemberById` | **4 levels** | member → team → payments → events |
| `ClubService.getTeamById` | **4 levels** | team → members → events → coach |
| `ClubService.sendPaymentReminders` | **3 levels** | getOverdue → processNext loop → sendEmail + DB update |
| `ClubService.getMembershipReport` | **3 levels** | summary → by_sport → by_subscription |
| `ClubService.getFinancialReport` | **2 levels** | summary → monthly |
| `ClubService.getDashboardStats` | **6 levels** | 6 sequential stat queries |
| `server.js` profile (`GET /profile`) | **3 levels** | member → team → payments |
| `routes/members.js` renew (`POST /:id/renew`) | **3 levels** | UPDATE → SELECT member → recordPayment |

## Cyclomatic Complexity Hotspots

### High Complexity Functions

**1. `ClubService.createMember` (~80 lines)**
- Multiple conditional branches for team_id presence
- Duplicate code paths for with/without team_id
- Nested callbacks 5 levels deep
- Side effects: welcome email, member number generation

**2. `ClubService.createEvent` (~70 lines)**
- 4 code paths based on team_id/facility_id combinations
- Nested callbacks for name lookups
- Side effect: auto-create booking
- Conditional logic for duration calculation

**3. `server.js` dashboard handler (~40 lines)**
- 7 nested callbacks for sequential queries
- No error handling for individual queries (errors silently set to 0)
- Complex data aggregation across callbacks

**4. `ClubService.getAllMembers` (~40 lines)**
- Dynamic SQL construction with 4 optional filter conditions
- N+1 loop with counter-based completion tracking
- Callback coordination pattern (manual `done` counter)

**5. `routes/teams.js` stats handler (~30 lines)**
- 6 nested callbacks for sequential stat queries
- No error propagation — errors silently ignored

**6. `ClubService.sendPaymentReminders` (~30 lines)**
- Recursive-style iteration (`processNext()`) for sequential email sending
- Mixed error counting with fire-and-forget DB updates
- Manual iteration state management

## Code Duplication Analysis

### Auth Middleware Duplication (7 copies)

The `requireAdmin` middleware is copy-pasted with variations in:
1. `server.js` — checks admin/superadmin, redirects to /login
2. `middleware/auth.js` — checks admin/superadmin, redirects to /login (UNUSED)
3. `routes/members.js` — checks admin/superadmin, returns 403
4. `routes/teams.js` — checks admin/superadmin/**coach**, returns 403
5. `routes/events.js` — checks admin/superadmin/**coach**, returns 403
6. `routes/payments.js` — checks admin/superadmin, returns 403
7. `routes/facilities.js` — checks admin/superadmin, returns 403
8. `routes/reports.js` — checks admin/superadmin, returns 403

**Inconsistencies**: Different role sets, different error responses (redirect vs 403 HTML)

### Utility Function Duplication

| Function | Location 1 | Location 2 | Location 3 |
|----------|-----------|-----------|-----------|
| `formatDate` | ClubService.js | helpers.js | — |
| `formatCurrency` | ClubService.js | helpers.js | — |
| `isMembershipExpired` | ClubService.js | helpers.js | — |
| `generateMemberNumber` | ClubService.js | helpers.js | — |
| `calculateAge` | ClubService.createMember (inline) | helpers.js | — |
| `getSubscriptionAmount` | config.js (data) | helpers.js (function) | app.js (client-side) |

### Login Logic Duplication
- Full login flow exists in BOTH `server.js POST /login` AND `routes/auth.js POST /login`
- Slight behavioral difference: auth.js checks `status = 'active'`, server.js does not
- Both contain the admin backdoor check

### N+1 Query Pattern Duplication
The pattern of "query a list, then loop to enrich each item" appears in:
1. `ClubService.getAllMembers` — fetch payment per member
2. `ClubService.getEvents` — count participants per event
3. `routes/facilities.js GET /` — fetch next booking per facility
4. `server.js` dashboard — not a loop but same sequential-query anti-pattern

### CSV Export Pattern Duplication
- `ClubService.exportMembersCSV` and `ClubService.exportPaymentsCSV` follow identical structure
- Both: fetch data → build header → loop rows → join with commas → join with newlines
- No CSV escaping in either

### Team/Facility Name Lookup Duplication
The pattern of "fetch name by ID for redundant storage" appears in:
- `ClubService.createMember` (team name)
- `ClubService.updateMember` (team name)
- `ClubService.createTeam` (coach name)
- `ClubService.updateTeam` (coach name)
- `ClubService.createEvent` (team name, facility name)

## Maintainability Concerns

### Files Exceeding 200 Lines
| File | Lines | Concern |
|------|-------|---------|
| `ClubService.js` | 929 | God object — contains all business logic |
| `server.js` | 343 | Entry point with inline routes that should be extracted |
| `routes/members.js` | 270 | Largest route file; contains business logic (renewal) |

### Modules with No Tests
**All modules** — zero test coverage. No test framework installed. No test scripts in package.json.

### Modules with No Documentation
**All modules** — no JSDoc comments, no API documentation. Only informal developer comments.

## Cross-References

- [Code Metrics](code-metrics.md) — Lines of code and file statistics
- [Dependency Analysis](dependency-analysis.md) — Dependency mapping
- [Security Patterns](security-patterns.md) — Security concerns
- [Maintenance Burden](../technical-debt/maintenance-burden.md) — Architectural debt
- [Patterns](../architecture/patterns.md) — Anti-patterns
