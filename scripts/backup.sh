#!/bin/bash
# backup.sh - Database backup script
# Should be run as a cron job but nobody set it up
# Run manually: bash scripts/backup.sh
# TODO: automate this - ticket #892, opened 2017, assigned to Pierre (left 2022)

DB_HOST="localhost"
DB_USER="root"
DB_PASS="Club@Admin2015!"      # hardcoded same as config.js
DB_NAME="club_manager"
BACKUP_DIR="/var/www/club_manager/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.sql"
KEEP_DAYS=7                    # keep 7 days of backups (if someone runs this manually)

echo "Starting backup: $DATE"

# create backup dir if it doesn't exist
mkdir -p $BACKUP_DIR

# dump database
# password in command line - visible in 'ps aux'
mysqldump -h$DB_HOST -u$DB_USER -p$DB_PASS $DB_NAME > $BACKUP_FILE

if [ $? -eq 0 ]; then
  echo "Backup created: $BACKUP_FILE"
  echo "Size: $(du -sh $BACKUP_FILE | cut -f1)"
else
  echo "BACKUP FAILED!"
  exit 1
fi

# gzip it
gzip $BACKUP_FILE
echo "Compressed: $BACKUP_FILE.gz"

# cleanup old backups
echo "Cleaning backups older than $KEEP_DAYS days..."
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +$KEEP_DAYS -delete

echo "Backup complete."

# no email notification, no S3 upload, no offsite copy
# "the server has plenty of disk space" - Thomas 2020
# (disk was full in January 2023)
