# Specialized: API & UI Documentation — Club Manager v3

## API Patterns

### Request/Response Pattern
All routes follow Express callback pattern:
```
router.METHOD(path, [middleware], function(req, res) {
  // Optional: parse req.params, req.query, req.body
  // Call ClubService method or direct DB query
  // Render EJS template or redirect with flash message
});
```

### Response Types
| Type | Usage | Content-Type |
|------|-------|-------------|
| HTML (EJS render) | All page routes | text/html |
| JSON | `/api/stats/*` endpoints | application/json |
| CSV | `/members/export/csv`, `/payments/export/csv` | text/csv |
| Plain Text | `/members/:id/certificate` | text/plain |
| Redirect (302) | After POST operations | — |

### Flash Message Pattern
```javascript
req.session.flash = { type: 'success|error|info|warning', msg: 'Message text' };
res.redirect('/path');
// Flash consumed on next request via res.locals.flash
```

### Filter Pattern
List endpoints accept query parameters for filtering:
- `/members?status=active&sport=Football&team_id=7&role=member`
- `/events?team_id=7&event_type=match&from=2024-01-01&to=2024-12-31`
- `/payments?status=paid&season=2023-2024&member_id=5`
- `/bookings?facility_id=1&from_date=2024-01-01`

## UI Component Documentation

### Layout Structure (`views/layout.ejs`)
- Bootstrap 3 grid-based layout
- Fixed-top navbar with navigation links
- Content area with `.main-content` wrapper (70px top margin)
- CDN dependencies: Bootstrap 3.3.7 CSS/JS, jQuery 2.2.4, Font Awesome 4.7.0
- Inline flash message display (auto-dismiss after 4 seconds via app.js)

### Template Organization (35 EJS files)

**Shared Components:**
- `layout.ejs` — base HTML, head, CDN links, flash messages, content yield
- `partials/navbar.ejs` — navigation bar with role-based menu items

**Feature Module Templates (each module has list/detail/form pattern):**

| Module | Templates | Shared Pattern |
|--------|-----------|---------------|
| Members | list, detail, form, profile | Filter bar → table → pagination |
| Teams | list, detail, form, stats | Filter → card grid → detail panel |
| Events | list, detail, form, calendar | Filter bar → table + calendar view |
| Payments | list, detail, form, overdue | Filter → summary cards → table |
| Facilities | list, detail, form, schedule | Card grid → weekly schedule grid |
| Reports | index, membership, financial, activity, birthdays, renewals | Report selector → data tables/charts |

### UI Patterns
- **Data Tables**: Bootstrap `.table .table-striped .table-condensed`
- **Forms**: Bootstrap `.form-horizontal` with `.form-group` rows
- **Panels**: Bootstrap `.panel .panel-default` for content sections
- **Alerts**: Bootstrap `.alert` with type-based colors
- **Buttons**: Bootstrap `.btn` variants (primary, success, danger, default)
- **Navigation**: Bootstrap `.navbar-default` with custom dark styling
- **KPI Cards**: Custom `.kpi-card` with `.kpi-number` and `.kpi-label` classes
- **Modals**: Not used — all actions are page-based with redirects

### Responsive Design
- Minimal: custom CSS for `@media (max-width: 768px)` adjusts margins and font sizes
- Not truly responsive: tables overflow on mobile, forms not optimized

### Print Support
- `@media print` hides navbar, buttons, breadcrumbs
- "Never tested" per CSS comment

## Cross-References

- [Interfaces](../reference/interfaces.md) — Complete route documentation
- [Components](../architecture/components.md) — Component details
- [Program Structure](../reference/program-structure.md) — File tree
