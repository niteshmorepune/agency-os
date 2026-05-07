#!/bin/bash
# Daily PostgreSQL backup script
# Register in crontab: 0 2 * * * /path/to/scripts/backup.sh

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/agencyos"
DB_NAME="agencyos"
DB_USER="agencyos_user"

mkdir -p $BACKUP_DIR

pg_dump -U $DB_USER $DB_NAME | gzip > "$BACKUP_DIR/backup_$TIMESTAMP.sql.gz"

if [ $? -eq 0 ]; then
  echo "[$(date)] Backup successful: backup_$TIMESTAMP.sql.gz"
else
  echo "[$(date)] Backup FAILED" >&2
  exit 1
fi

# Keep last 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

# Optional: sync to remote (uncomment and configure rclone)
# rclone copy $BACKUP_DIR remote:agencyos-backups --log-level INFO
