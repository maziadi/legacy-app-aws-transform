# Club Manager v3 — Documentation

## 📋 Table of Contents

### Root Documents
- **[Project Overview](project-overview.md)** — Comprehensive project summary, technology stack, functional domains
- **[Technical Debt Report](technical-debt-report.md)** — ⚠️ Executive summary with AWS Transformation Recommendation, prioritized debt findings

### 🏗️ Architecture
- **[System Overview](architecture/system-overview.md)** — Technology stack, deployment model, architectural decisions, historical context
- **[Components](architecture/components.md)** — All major components: server.js, ClubService, routes, database, middleware, views
- **[Dependencies](architecture/dependencies.md)** — Internal dependency graph, external npm/CDN dependencies, criticality analysis
- **[Patterns](architecture/patterns.md)** — Design patterns (MVC, middleware, pool) and anti-patterns (N+1, callback hell, God object)

### 🔄 Behavior (Early Access)
- **[Business Logic](behavior/business-logic.md)** — Business rules for all modules: members, payments, teams, events, facilities, reporting, authentication
- **[Workflows](behavior/workflows.md)** — Application-level process flows: login, registration, renewal, payment, event creation, dashboard
- **[Decision Logic](behavior/decision-logic.md)** — Decision points: role-based access, pricing, match results, expiration checks
- **[Error Handling](behavior/error-handling.md)** — Error patterns: callback propagation, fire-and-forget, global handler, validation gaps

### 📚 Reference
- **[Program Structure](reference/program-structure.md)** — Complete file tree with descriptions and line counts
- **[Interfaces](reference/interfaces.md)** — All HTTP routes (50+) and ClubService methods (35+) with signatures
- **[Data Models](reference/data-models.md)** — MySQL schema: 8 tables, all columns, indexes, relationships, denormalization issues
- **[Module Organization](reference/api-reference.md)** — Module dependency map, import frequency, coupling analysis

### 📊 Analysis
- **[Code Metrics](analysis/code-metrics.md)** — Lines of code, file counts, function counts, view template inventory
- **[Complexity Analysis](analysis/complexity-analysis.md)** — Callback nesting depth, cyclomatic complexity hotspots, code duplication
- **[Dependency Analysis](analysis/dependency-analysis.md)** — Internal/external dependency map, version currency, circular dependency check
- **[Security Patterns](analysis/security-patterns.md)** — 17 security findings: SQL injection, MD5, plaintext passwords, backdoor, credentials

### 📐 Diagrams
- **[Structural Diagrams](diagrams/structural/structural-diagrams.md)** — Component diagram, ClubService domain grouping, package dependency graph
- **[Behavioral Diagrams](diagrams/behavioral/behavioral-diagrams.md)** — Sequence diagrams (login, member creation, dashboard), activity diagram (renewal), state machine (member lifecycle)
- **[Architecture Diagrams](diagrams/architecture/architecture-diagrams.md)** — System context, integration patterns, service map, security boundaries

### 🔧 Technical Debt
- **[Summary](technical-debt/summary.md)** — Overview of all debt categories with priority order
- **[Outdated Components](technical-debt/outdated-components.md)** — Runtime, framework, and dependency version analysis
- **[Maintenance Burden](technical-debt/maintenance-burden.md)** — Architectural debt, code duplication, callback hell, unused code
- **[Remediation Plan](technical-debt/remediation-plan.md)** — Prioritized action items with specific code locations

### 🚀 Migration
- **[Component Order](migration/component-order.md)** — Dependency-based migration sequence (8 phases)
- **[Test Specifications](migration/test-specifications.md)** — Unit, integration, and end-to-end test cases
- **[Validation Criteria](migration/validation-criteria.md)** — Measurable success criteria for security, architecture, database, testing

### 📦 Specialized
- **[Database Documentation](specialized/database-documentation.md)** — Schema deep-dive, denormalization issues, query patterns
- **[API & UI Documentation](specialized/api-ui-documentation.md)** — Request/response patterns, UI components, template organization

---

## Quick Start Guide

### 🎯 If you need to understand the project quickly:
1. Start with [Project Overview](project-overview.md)
2. Review [System Overview](architecture/system-overview.md)
3. Browse [Program Structure](reference/program-structure.md)

### ⚠️ If you need to assess technical risk:
1. Start with [Technical Debt Report](technical-debt-report.md) (includes AWS recommendation)
2. Review [Security Patterns](analysis/security-patterns.md)
3. Check [Outdated Components](technical-debt/outdated-components.md)

### 🔄 If you need to understand business logic:
1. Start with [Business Logic](behavior/business-logic.md)
2. Follow [Workflows](behavior/workflows.md) for process flows
3. Check [Decision Logic](behavior/decision-logic.md) for rules

### 🏗️ If you need to plan a migration:
1. Start with [Remediation Plan](technical-debt/remediation-plan.md)
2. Follow [Component Order](migration/component-order.md)
3. Use [Test Specifications](migration/test-specifications.md) for validation
4. Verify against [Validation Criteria](migration/validation-criteria.md)

### 📊 If you need to analyze the codebase:
1. Start with [Code Metrics](analysis/code-metrics.md)
2. Review [Complexity Analysis](analysis/complexity-analysis.md)
3. Check [Dependency Analysis](analysis/dependency-analysis.md)
