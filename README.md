# Club Manager v3

Sports club management system for ASC Villejuif Football & Sports.

Manages members, teams, events, payments and facilities.

## Requirements

- Node.js >= 22 LTS
- MySQL 5.7 (NOT 8 - there are some syntax issues with MySQL 8, see ticket #4102)
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
├── server.js           Main entry point (also contains some routes)
├── config.js           All configuration (hardcoded)
├── database.js         MySQL connection pool
├── routes/             Route handlers (partially migrated from server.js)
│   ├── auth.js
│   ├── members.js
│   ├── teams.js
│   ├── events.js
│   ├── payments.js
│   ├── facilities.js
│   └── reports.js
├── services/
│   └── ClubService.js  Main business logic (everything is in here)
├── middleware/
│   └── auth.js         Auth middleware (not fully used, see inline copies)
├── views/              EJS templates
├── public/             Static assets (CSS, JS)
├── utils/
│   └── helpers.js      Utility functions
└── scripts/
    ├── setup_db.sql    Database schema (re-run = data loss)
    ├── seed.sql        Sample data
    ├── deploy.sh       Manual deploy script
    └── backup.sh       DB backup (run manually)
```

## Known Issues / Technical Debt

- No HTTPS (configure nginx/Apache in front of Node)
- Passwords stored as MD5 hash (bcrypt upgrade was started in branch security-upgrade-2022, never merged)
- Some passwords also stored in plaintext as "backup" (really bad, I know)
- SQL injection possible in search and a few other places
- No input validation - XSS possible
- N+1 query pattern everywhere - performance degrades with many members
- `sport` field is comma-separated in members table - should be a junction table
- Many redundant columns across all tables (stored denormalized for "performance")
- No test suite
- No linting/formatting standards
- ~~`config.js` contains prod credentials - should be environment variables~~ (RESOLVED: config now uses environment variables via dotenv)
- ~~The admin backdoor was supposed to be removed after migration 2016~~ (RESOLVED: admin backdoor has been removed)
- `current_players` in teams table is manually maintained and often out of sync
- `age` in members table is calculated on save and becomes stale
- The `audit_log` table exists but nothing writes to it
- `app_settings` table exists but `server.js` still reads from `config.js`
- No cron jobs set up - payment reminders and renewal checks are manual
- Deploy is manual (see `scripts/deploy.sh`)
- No log rotation - logs grow indefinitely
- Bootstrap 3 (EoL) - upgrade to 4 or 5 would break all the custom CSS

## Deployment

See `scripts/deploy.sh` for the manual deploy process. Basically:
```bash
bash scripts/deploy.sh
```

This rsync's files to the prod server and restarts PM2. Make sure you have SSH
access to `185.12.34.56` (ask Pierre or Kevin for the key).

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
