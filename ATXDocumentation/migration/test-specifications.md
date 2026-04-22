# Test Specifications — Club Manager v3

## Overview

The application currently has **zero tests**. The following test specifications define the test cases needed to validate the application after migration.

---

## Unit Tests: Service Layer

### MemberService Tests

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| M-01 | `getAllMembers({})` returns array of members | Non-empty array with member objects |
| M-02 | `getAllMembers({status:'active'})` filters by status | Only active members returned |
| M-03 | `getAllMembers({sport:'Football'})` filters by sport | Only Football members returned |
| M-04 | `getMemberById(validId)` returns member with related data | Member object with team, payments, events |
| M-05 | `getMemberById(invalidId)` returns null | `null` returned, no error |
| M-06 | `createMember(validData)` creates member | Returns insertId; member exists in DB |
| M-07 | `createMember(validData)` generates unique member number | Format M00001+, no duplicates |
| M-08 | `createMember(validData)` hashes password with bcrypt | `password_hash` is bcrypt hash, no plaintext stored |
| M-09 | `createMember(validData)` sets renewal date +1 year | `renewal_date` is ~365 days from now |
| M-10 | `updateMember(id, data)` updates member fields | Changed fields match input |
| M-11 | `deleteMember(id)` soft-deletes member | `is_deleted = 1`, `status = 'inactive'` |
| M-12 | `isMembershipExpired(expiredMember)` returns true | True for past renewal_date |
| M-13 | `isMembershipExpired(activeMember)` returns false | False for future renewal_date |
| M-14 | `exportMembersCSV({})` generates valid CSV | CSV with header row and data rows |

### PaymentService Tests

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| P-01 | `recordPayment(validData)` creates payment | Returns insertId |
| P-02 | `recordPayment(validData)` with status 'paid' updates member totals | `members.total_paid` updated |
| P-03 | `getPayments({status:'paid'})` returns paid payments | Only paid payments |
| P-04 | `getOverduePayments()` returns pending with past due_date | Only overdue payments |
| P-05 | `getPendingPayments()` returns all pending | Only pending payments |
| P-06 | `recordPayment` with non-existent member_id returns error | Error: "Membre introuvable" |

### TeamService Tests

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| T-01 | `getAllTeams()` returns active teams with counts | Array with real_player_count |
| T-02 | `getTeamById(validId)` returns team with members and events | Team with nested arrays |
| T-03 | `createTeam(validData)` creates team | Returns insertId |
| T-04 | `updateTeam(id, data)` updates team | Fields match input |

### EventService Tests

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| E-01 | `getEvents({})` returns events with participant counts | Array with participant_count |
| E-02 | `createEvent(data)` with facility_id auto-creates booking | Booking record exists |
| E-03 | `recordMatchResult(id, 2, 1, '')` records win | result = 'win' |
| E-04 | `recordMatchResult(id, 1, 2, '')` records loss | result = 'loss' |
| E-05 | `recordMatchResult(id, 1, 1, '')` records draw | result = 'draw' |

### FacilityService Tests

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| F-01 | `getFacilities()` returns facilities | Array of facility objects |
| F-02 | `checkFacilityAvailability` with conflict returns false | `false` |
| F-03 | `checkFacilityAvailability` without conflict returns true | `true` |

### ReportService Tests

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| R-01 | `getMembershipReport()` returns aggregate stats | Object with total_members, active, etc. |
| R-02 | `getFinancialReport(year)` returns financial summary | Object with total_collected, monthly array |

---

## Integration Tests: Express Routes

### Authentication Routes

| Test ID | Method | Path | Setup | Expected |
|---------|--------|------|-------|----------|
| IA-01 | POST | `/login` | Valid credentials | 302 redirect to /dashboard |
| IA-02 | POST | `/login` | Invalid credentials | 200 with error message |
| IA-03 | POST | `/login` | SQL injection attempt | No bypass, error or redirect |
| IA-04 | GET | `/logout` | Authenticated session | Session destroyed, redirect to /login |
| IA-05 | POST | `/auth/forgot-password` | Valid email | Success message |
| IA-06 | POST | `/auth/forgot-password` | Invalid email | Error message |

### Authorization Tests

| Test ID | Method | Path | Role | Expected |
|---------|--------|------|------|----------|
| AZ-01 | GET | `/members` | unauthenticated | 302 redirect to /login |
| AZ-02 | POST | `/members` | member role | 403 Forbidden |
| AZ-03 | POST | `/members` | admin role | 200/302 (success) |
| AZ-04 | POST | `/teams` | coach role | 200/302 (success) |
| AZ-05 | GET | `/payments` | member role | 403 Forbidden |
| AZ-06 | GET | `/reports` | member role | 403 Forbidden |
| AZ-07 | GET | `/settings` | member role | 403 Forbidden |

### Member Routes

| Test ID | Method | Path | Expected |
|---------|--------|------|----------|
| IM-01 | GET | `/members` | 200, member list page |
| IM-02 | GET | `/members/new` | 200, member form |
| IM-03 | POST | `/members` (valid data) | 302 redirect to member detail |
| IM-04 | GET | `/members/:id` | 200, member detail |
| IM-05 | POST | `/members/:id/update` | 302 redirect with flash |
| IM-06 | POST | `/members/:id/delete` | 302 redirect with flash |
| IM-07 | POST | `/members/:id/renew` | 302 redirect, renewal date updated |
| IM-08 | GET | `/members/export/csv` | 200, Content-Type: text/csv |

### Data Validation Tests

| Test ID | Description | Expected |
|---------|-------------|----------|
| V-01 | Create member with empty required fields | Validation error returned |
| V-02 | Create member with invalid email format | Validation error returned |
| V-03 | Record payment with negative amount | Validation error returned |
| V-04 | Update payment status with invalid value | Validation error returned |

### SQL Injection Prevention Tests

| Test ID | Input | Expected |
|---------|-------|----------|
| SQL-01 | Login with `' OR 1=1 --` as username | Login fails, no bypass |
| SQL-02 | Search with `'; DROP TABLE members; --` | No data loss, error handled |
| SQL-03 | Financial report with malicious year param | Parameterized query blocks injection |

---

## End-to-End Workflow Tests

| Test ID | Workflow | Steps | Expected |
|---------|----------|-------|----------|
| W-01 | Full member lifecycle | Create → View → Edit → Renew → Delete | All operations succeed |
| W-02 | Payment workflow | Create payment → View → Update status → Export CSV | All operations succeed |
| W-03 | Event with booking | Create event with facility → View booking → Cancel | Booking also cancelled |
| W-04 | Password reset | Request reset → Check temp password email → Login with temp | All steps succeed |

## Cross-References

- [Component Order](component-order.md) — Migration sequencing
- [Validation Criteria](validation-criteria.md) — Success criteria
- [Interfaces](../reference/interfaces.md) — API contracts to test against
- [Business Logic](../behavior/business-logic.md) — Business rules to validate
