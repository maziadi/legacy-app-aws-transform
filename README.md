# Club Manager v3

Sports club management system for ASC Villejuif Football & Sports.

Manages members, teams, events, payments and facilities.

## Table of Contents

- [Requirements](#requirements)
- [Installation](#installation)
- [Docker Setup](#docker-setup)
- [Login](#login)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [CI/CD Pipeline](#cicd-pipeline)
- [Deployment](#deployment)
- [Known Issues](#known-issues)
- [History](#history)
- [Contact](#contact)

## Requirements

- Node.js >= 22 LTS
- MySQL 8.0 (production environment)
- PostgreSQL 15 (CI/CD test environment only)
- Docker and Docker Compose (for local development)
- A server with enough RAM (at least 512MB, we had issues with 256MB)

## Installation

1. Clone the repo (ask Pierre for git access):
   ```
   git clone http://internal-git.clubsportif.fr/club-manager.git
   cd club-manager
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up the database. You need MySQL running locally:
   ```
   mysql -u root -p < scripts/setup_db.sql
   mysql -u root -p club_manager < scripts/seed.sql
   ```
   
   **Note:** The setup script drops and recreates the database, so don't run it on prod!
   There are no migrations. If the schema changes you have to re-run setup (and lose data).

4. Configure the app by editing `config.js` directly.
   The DB credentials are already set to `root / Club@Admin2015!` which is what
   the dev environment uses. For prod you should change these... (see the TODO in config.js)

5. Start the server:
   ```
   npm start
   ```
   
   App will be available at http://localhost:3000

## Docker Setup

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) installed
- A `.env` file configured with required environment variables. Key variables include:
  - `DB_HOST` - Database host (set automatically to `mysql` by Docker Compose)
  - `DB_USER` - Database user
  - `DB_PASSWORD` - Database password
  - `DB_NAME` - Database name
  - `APP_PORT` - Application port (default: 3000)
  - `SESSION_SECRET` - Session secret key
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` - Email/SMTP settings

### Quick Start

1. Clone the repository:
   ```bash
   git clone http://internal-git.clubsportif.fr/club-manager.git
   cd club-manager
   ```

2. Copy `.env.example` to `.env` and fill in your values:
   ```bash
   cp .env.example .env
   ```

3. Build and start all services:
   ```bash
   docker compose up --build
   ```

4. Access the application at [http://localhost:3000](http://localhost:3000)

### Development Workflow

The `docker-compose.override.yml` file is automatically applied when running `docker compose up`, enabling a development-friendly environment:

- **Live reload**: Your local source code is bind-mounted into the container, so changes are reflected immediately.
- **File watching**: The Node.js `--watch` flag (built into Node.js 22) automatically restarts the server when files change.
- **Isolated dependencies**: Container `node_modules` are preserved via an anonymous volume, preventing conflicts with host dependencies.

After making changes to `package.json` or adding new dependencies, rebuild the containers:
```bash
docker compose up --build
```

### Production Deployment Notes

- Build a standalone Docker image:
  ```bash
  docker build -t club-manager .
  ```
- For **AWS ECS/Fargate** deployment, the MySQL service in `docker-compose.yml` would be replaced by **Amazon RDS**. The `docker-compose.yml` is primarily intended for local testing.
- The `uploads/` volume should be replaced with **Amazon S3** or **Amazon EFS** in a production environment.
- The Docker image runs as a non-root user (`appuser`) for security.

### Common Docker Commands

| Command | Description |
|---------|-------------|
| `docker compose up --build` | Build images and start all services |
| `docker compose up -d` | Start services in detached (background) mode |
| `docker compose down` | Stop and remove all services |
| `docker compose down -v` | Stop services and remove all volumes (data reset) |
| `docker compose logs -f app` | Follow application logs |


## Login

Default admin account:
- Email: `admin@asc-villejuif.fr`
- Password: `password123`

There is also a superadmin backdoor (for emergencies):
- Username: `superadmin`
- Password: `Sup3rAdm1n2016`

## Project Structure

```
club-manager/
├── server.js                      Main entry point (also contains some routes)
├── config.js                      All configuration (now uses environment variables)
├── database.js                    MySQL connection pool
├── routes/                        Route handlers (partially migrated from server.js)
│   ├── auth.js
│   ├── members.js
│   ├── teams.js
│   ├── events.js
│   ├── payments.js
│   ├── facilities.js
│   └── reports.js
├── services/                      Business logic modules (extracted from ClubService.js)
│   ├── MemberService.js           Member management (getAllMembers, createMember, etc.)
│   ├── PaymentService.js          Payment processing (recordPayment, getOverduePayments, etc.)
│   ├── EventService.js            Event management (getEvents, recordMatchResult, etc.)
│   ├── FacilityService.js         Facility booking (checkFacilityAvailability, etc.)
│   ├── TeamService.js             Team management (getAllTeams, createTeam, etc.)
│   ├── ReportService.js           Reporting (getMembershipReport, getFinancialReport, etc.)
│   └── ClubService.js             Legacy service (being phased out)
├── middleware/
│   └── auth.js                    Auth middleware
├── tests/                         Automated test suite (108 tests)
│   ├── unit/                      Unit tests (isolated, no database)
│   │   ├── MemberService.test.js
│   │   ├── PaymentService.test.js
│   │   ├── EventService.test.js
│   │   ├── FacilityService.test.js
│   │   ├── TeamService.test.js
│   │   ├── ReportService.test.js
│   │   └── docker-tag.test.js
│   ├── integration/               Integration tests (Supertest + PostgreSQL)
│   │   ├── auth.test.js
│   │   ├── security.test.js
│   │   ├── members.test.js
│   │   ├── payments.test.js
│   │   ├── setup-db.sql
│   │   ├── seed.sql
│   │   └── db-helper.js
│   ├── non-regression/            End-to-end workflow tests
│   │   ├── member-lifecycle.test.js
│   │   ├── payment-workflow.test.js
│   │   └── event-booking.test.js
│   └── setup.js                   Global Jest configuration
├── views/                         EJS templates
├── public/                        Static assets (CSS, JS)
├── utils/
│   ├── helpers.js                 Utility functions
│   └── docker.js                  Docker utilities (getShortSha)
├── scripts/
│   ├── setup_db.sql               Database schema (re-run = data loss)
│   ├── seed.sql                   Sample data
│   ├── deploy.sh                  Legacy manual deploy script (deprecated)
│   └── backup.sh                  DB backup (run manually)
├── .github/workflows/             CI/CD automation
│   ├── ci.yml                     Continuous Integration workflow
│   └── cd.yml                     Continuous Deployment workflow
├── infra/                         Terraform infrastructure as code
│   ├── main.tf
│   ├── ecs.tf
│   ├── rds.tf
│   ├── iam_github_actions.tf      IAM OIDC role for GitHub Actions
│   └── ...
└── docs/
    └── github-environments-setup.md   GitHub Environments configuration guide
```

## Testing

### Overview

The project has a comprehensive automated test suite with **108 tests** covering three levels: unit, integration, and non-regression. Tests use **Jest** with **fast-check** for property-based testing, ensuring correctness across a wide range of inputs.

### What the Tests Validate

#### Unit Tests (42 tests)
Isolated tests of business logic modules without database dependencies:

- **MemberService**: Member filtering by status/sport, membership expiration logic, unique member number generation, password hashing with bcrypt
- **PaymentService**: Payment recording with validation, overdue payment detection, pending payment queries
- **EventService**: Match result calculation (win/loss/draw), event creation and management
- **FacilityService**: Booking availability checks, time overlap detection for reservations
- **TeamService**: Team CRUD operations, team member management
- **ReportService**: Financial reports, membership reports, dashboard statistics
- **Docker utilities**: Git SHA shortening for Docker image tags

**Property-Based Tests** (using fast-check):
- Member filtering correctness for any combination of status/sport
- Membership expiration logic for any date (past/future)
- Overdue payment detection for any payment set
- Match result calculation for any score combination
- Time overlap detection for any booking pair
- Docker tag generation for any valid Git SHA

#### Integration Tests (49 tests)
Tests validating API routes with database interactions:

- **Authentication**: Login with valid/invalid credentials, SQL injection prevention in login forms
- **Authorization**: Role-based access control (admin vs member), protected route enforcement
- **Member Routes**: Member listing, creation, update, CSV export, input validation
- **Payment Routes**: Payment recording, validation of member existence, amount validation
- **Security**: SQL injection resistance in search queries, parameterized query enforcement

#### Non-Regression Tests (17 tests)
End-to-end workflow validation ensuring existing functionality remains intact:

- **Member Lifecycle**: Create → View → Update → Renew → Delete workflow
- **Payment Workflow**: Create payment → View details → Update status → Export CSV
- **Event Booking**: Create event with facility → View reservation → Cancel booking

### Test Structure

```
tests/
├── unit/                          Unit tests (no database required)
│   ├── MemberService.test.js      Members + Properties 1 & 2
│   ├── PaymentService.test.js     Payments + Property 3
│   ├── EventService.test.js       Events + Property 4
│   ├── FacilityService.test.js    Facilities + Property 5
│   ├── TeamService.test.js        Teams
│   ├── ReportService.test.js      Reports
│   └── docker-tag.test.js         Docker tagging + Property 9
├── integration/                   Integration tests (Supertest + mock DB)
│   ├── auth.test.js               Login + Property 6 (SQL injection)
│   ├── security.test.js           Access control + Property 7
│   ├── members.test.js            Member routes + Property 8
│   ├── payments.test.js           Payment routes
│   ├── setup-db.sql               PostgreSQL schema for CI
│   ├── seed.sql                   Test data
│   └── db-helper.js               Migration helper
├── non-regression/                End-to-end workflow tests
│   ├── member-lifecycle.test.js   Complete member workflow
│   ├── payment-workflow.test.js   Complete payment workflow
│   └── event-booking.test.js      Event/booking workflow
└── setup.js                       Global Jest configuration
```

### Extracted Business Services

Business logic has been extracted from the monolithic `ClubService.js` into testable modules:

| Service | Functions |
|---------|-----------|
| `MemberService.js` | `getAllMembers`, `getMemberById`, `createMember`, `updateMember`, `deleteMember`, `isMembershipExpired` |
| `PaymentService.js` | `recordPayment`, `getOverduePayments`, `getPendingPayments`, `getPayments` |
| `EventService.js` | `getEvents`, `createEvent`, `recordMatchResult`, `computeMatchResult` |
| `FacilityService.js` | `getFacilities`, `checkFacilityAvailability`, `getBookings`, `hasTimeOverlap` |
| `TeamService.js` | `getAllTeams`, `getTeamById`, `createTeam`, `updateTeam` |
| `ReportService.js` | `getMembershipReport`, `getFinancialReport`, `getDashboardStats` |

### Running Tests

Install development dependencies if not already done:
```bash
npm install
```

**All tests:**
```bash
npm test
```

**Unit tests only:**
```bash
npm run test:unit
```

**Integration tests only:**
```bash
npm run test:integration
```

**Non-regression tests only:**
```bash
npm run test:nr
```

**With coverage report:**
```bash
npm test -- --coverage
```

**Specific test file:**
```bash
npx jest tests/unit/MemberService.test.js --no-coverage
```

**Linting:**
```bash
npm run lint
```

> Unit tests require no database connection — the database is mocked via `jest.mock`. Integration and non-regression tests also use mocks and can run without MySQL.

### Test Environment Notes

- **Production**: MySQL 8.0 (RDS)
- **CI Tests**: PostgreSQL 15 (GitHub Actions service containers)
- **Local Tests**: Mocked database (no real connection needed)

The SQL queries use parameterized statements compatible with both MySQL and PostgreSQL.

## CI/CD Pipeline

The project has a complete GitHub Actions CI/CD pipeline defined in `.github/workflows/`.

### Pipeline Overview

The pipeline automates code validation, testing, Docker image building, and deployment to AWS ECS Fargate with zero-downtime rolling updates.

### Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | Push to any branch, PR to `main` | Lint → Unit tests → Integration tests → Non-regression tests |
| `cd.yml` | Push to `main` (after PR merge) | Build Docker → Push to ECR → Deploy to ECS (dev auto, prod with approval) |

### CI Sequence

```
lint → unit-tests → integration-tests → non-regression-tests
```

Each job depends on the previous one. A failure stops the pipeline.

**Lint Job:**
- ESLint with `eslint-plugin-security` (detects SQL injection patterns, eval usage)
- `npm audit` for critical vulnerabilities
- Secret scanning with TruffleHog

**Unit Tests Job:**
- Runs all 42 unit tests with Jest
- Generates code coverage report (target: ≥70%)
- Uploads coverage and JUnit XML reports as artifacts

**Integration Tests Job:**
- Starts PostgreSQL 15 service container
- Applies database schema and seed data
- Runs 49 integration tests with Supertest
- Validates authentication, authorization, and SQL injection prevention

**Non-Regression Tests Job:**
- Runs 17 end-to-end workflow tests
- Validates complete user journeys (member lifecycle, payment workflow, event booking)
- Timeout: 10 minutes

### CD Sequence

```
build-push-ecr → deploy-dev → [manual approval] → deploy-prod
```

**Build & Push ECR Job:**
- Authenticates to AWS via OIDC (no long-lived credentials)
- Builds Docker image using multi-stage Dockerfile
- Tags image with short Git SHA (e.g., `abc1234`) and `latest`
- Pushes to Amazon ECR
- Triggers ECR vulnerability scan (warning if critical vulnerabilities found)

**Deploy Dev Job:**
- Updates ECS Task Definition with new image URI
- Performs rolling update on ECS Fargate service
- Waits for service stabilization (timeout: 10 minutes)
- Validates ALB health checks
- **Automatic rollback** if deployment fails or health checks fail
- Runs non-regression tests against deployed environment
- Rollback if post-deployment tests fail

**Deploy Prod Job:**
- **Requires manual approval** via GitHub Environments
- Same steps as dev deployment with production resources
- Runs complete non-regression test suite post-deployment
- Automatic rollback on failure

### Getting Started with CI/CD

#### Step 1: Configure AWS Infrastructure

Deploy the IAM OIDC role for GitHub Actions authentication:

```bash
cd infra
terraform init
terraform apply -target=aws_iam_openid_connect_provider.github \
                -target=aws_iam_role.github_actions
```

Get the role ARN:
```bash
terraform output github_actions_role_arn
```

#### Step 2: Configure GitHub Secrets

In your GitHub repository, go to **Settings → Secrets and variables → Actions** and add:

| Secret | Value |
|--------|-------|
| `AWS_ROLE_ARN` | ARN from Terraform output (e.g., `arn:aws:iam::123456789012:role/nodejs-app-github-actions-role`) |
| `TEST_DB_PASSWORD` | Password for PostgreSQL test database (any secure value) |

#### Step 3: Configure GitHub Environments

Create two environments in **Settings → Environments**:

**Environment: `dev`**

Add these variables:
- `ECR_REPOSITORY`: `nodejs-app-dev`
- `ECS_CLUSTER`: `nodejs-app-dev-cluster`
- `ECS_SERVICE`: `nodejs-app-dev-service`
- `ECS_TASK_DEFINITION`: `nodejs-app-dev`
- `ALB_URL`: Your dev ALB URL (e.g., `http://nodejs-app-dev-alb-123456789.us-east-1.elb.amazonaws.com`)
- `AWS_REGION`: `us-east-1`

**Environment: `prod`**

Add the same variables with `-prod` suffix:
- `ECR_REPOSITORY`: `nodejs-app-prod`
- `ECS_CLUSTER`: `nodejs-app-prod-cluster`
- `ECS_SERVICE`: `nodejs-app-prod-service`
- `ECS_TASK_DEFINITION`: `nodejs-app-prod`
- `ALB_URL`: Your prod ALB URL
- `AWS_REGION`: `us-east-1`

Enable **Environment protection rules**:
- ✅ Required reviewers (add team members who can approve production deployments)
- ✅ Wait timer: 0 minutes (or add a delay if desired)

#### Step 4: Push to Trigger Pipeline

**For CI only** (validation without deployment):
```bash
git checkout -b feature/my-feature
git add .
git commit -m "Add new feature"
git push origin feature/my-feature
```

This triggers the CI workflow (lint + all tests) on your feature branch.

**For CI + CD** (validation and deployment):
```bash
# After PR approval and merge to main
git checkout main
git pull origin main
```

This triggers:
1. CI workflow (all validation)
2. CD workflow (build + deploy to dev automatically)
3. Manual approval prompt for prod deployment

#### Step 5: Monitor Pipeline Execution

- Go to **Actions** tab in your GitHub repository
- Click on the running workflow to see real-time logs
- Each job shows detailed output (lint results, test results, deployment status)
- Artifacts (coverage reports, test results) are available for download (30-day retention)

### Pipeline Features

**Zero-Downtime Deployment:**
- Rolling update strategy on ECS Fargate
- New tasks start before old tasks stop
- ALB health checks ensure new tasks are healthy before routing traffic

**Automatic Rollback:**
- If ECS service doesn't stabilize within 10 minutes → rollback
- If ALB health checks fail → rollback
- If post-deployment tests fail → rollback
- Rollback restores previous Task Definition automatically

**Security:**
- No AWS credentials stored in GitHub (OIDC authentication)
- Secrets masked in all logs
- Vulnerability scanning on Docker images
- SQL injection detection in code via ESLint

**Observability:**
- JUnit XML reports for all test suites
- Code coverage reports (HTML + XML)
- CloudWatch Logs for ECS tasks
- GitHub Actions artifacts retained for 30 days

### Troubleshooting

**Pipeline fails at lint stage:**
- Check ESLint errors in the job logs
- Run `npm run lint` locally to see issues
- Fix code style and security issues

**Tests fail:**
- Check which test failed in the job logs
- Run the specific test locally: `npx jest tests/unit/MemberService.test.js`
- Fix the failing test or code

**Deployment fails:**
- Check ECS service events in AWS Console
- Check CloudWatch Logs for task errors
- Verify environment variables in GitHub Environments
- Pipeline will automatically rollback to previous version

**Manual approval not showing:**
- Verify `prod` environment has "Required reviewers" enabled
- Check that your GitHub user is in the reviewers list
- Refresh the Actions page

For detailed configuration instructions, see `docs/github-environments-setup.md`.

## Known Issues

### Security Issues

- No HTTPS (configure nginx/Apache in front of Node)
- Passwords stored as MD5 hash (bcrypt upgrade was started in branch security-upgrade-2022, never merged)
- Some passwords also stored in plaintext as "backup" (really bad, I know)
- SQL injection possible in search and a few other places
- No input validation - XSS possible

### Performance Issues

- N+1 query pattern everywhere - performance degrades with many members
- `sport` field is comma-separated in members table - should be a junction table
- Many redundant columns across all tables (stored denormalized for "performance")

### Data Model Issues

- `current_players` in teams table is manually maintained and often out of sync
- `age` in members table is calculated on save and becomes stale
- The `audit_log` table exists but nothing writes to it
- `app_settings` table exists but `server.js` still reads from `config.js`

### Operational Issues

- No cron jobs set up - payment reminders and renewal checks are manual
- No log rotation - logs grow indefinitely

### UI Issues

- Bootstrap 3 (EoL) - upgrade to 4 or 5 would break all the custom CSS

### Resolved Issues

- ~~No test suite~~ ✅ **RESOLVED**: Jest + fast-check test suite added with 108 tests (see [Testing](#testing) section)
- ~~No linting/formatting standards~~ ✅ **RESOLVED**: ESLint + eslint-plugin-security configured
- ~~`config.js` contains prod credentials - should be environment variables~~ ✅ **RESOLVED**: config now uses environment variables via dotenv
- ~~The admin backdoor was supposed to be removed after migration 2016~~ ✅ **RESOLVED**: admin backdoor has been removed
- ~~Deploy is manual (see `scripts/deploy.sh`)~~ ✅ **RESOLVED**: GitHub Actions CI/CD pipeline with automated deployment (see [CI/CD Pipeline](#cicd-pipeline) section)

## Deployment

### Automated Deployment (Recommended)

The project uses GitHub Actions for automated deployment to AWS ECS Fargate. See the [CI/CD Pipeline](#cicd-pipeline) section above for complete setup instructions.

**Quick deployment workflow:**
1. Create a feature branch and make your changes
2. Push to GitHub and create a Pull Request to `main`
3. CI pipeline validates your code (lint + all tests)
4. After PR approval and merge, CD pipeline automatically:
   - Builds Docker image
   - Pushes to Amazon ECR
   - Deploys to `dev` environment automatically
   - Waits for manual approval for `prod` deployment
5. Approve production deployment in GitHub Actions UI
6. Pipeline deploys to `prod` with automatic rollback on failure

### Manual Deployment (Legacy - Deprecated)

The legacy manual deployment script is still available but **not recommended**:

```bash
bash scripts/deploy.sh
```

This rsync's files to the prod server and restarts PM2. Requires SSH access to `185.12.34.56` (ask Pierre or Kevin for the key).

**Note:** Manual deployment does not include:
- Automated testing before deployment
- Zero-downtime rolling updates
- Automatic rollback on failure
- Deployment validation

Use the automated CI/CD pipeline instead.

## Database Backup

Run manually or set up a cron (which nobody has done):
```bash
bash scripts/backup.sh
```

Backups go to `/var/www/club_manager/backups/` on the server.
There is no offsite backup. This is a known risk. 

## History

- **2015**: Initial version (Pierre Martin) - member list + basic auth
- **2016**: Added payments module (Thomas Girard)
- **2017**: Added teams, events. Connection pool instead of single connection after prod crash
- **2018**: "v2" - soft deletes, better UI, Excel migration tool
- **2019**: Started "v3 refactor" - partial route extraction (never finished - Karim left)  
- **2020**: Reporting module phase 1 (Thomas). Phase 2 never started.
- **2021**: Facility booking added (Kevin). PayPal integration started but abandoned.
- **2022**: Security audit - bcrypt migration branch created, never merged. GDPR todo added.
- **2023**: New SMTP server. Minor UI fixes.
- **2024**: Still running the same server from 2019.

## Contact

- Pierre Martin (original dev, now CTO, not much time): pierre.martin@clubsportif.fr
- Kevin (current maintainer): kevin@clubsportif.fr
- Thomas (left 2023, still answers emails sometimes): t.girard@gmail.com
