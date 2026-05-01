# Backup and Restore Runbook

## Overview
This runbook covers how to backup the StockOps PostgreSQL database, how to restore it, and how to run disaster recovery drills.

## Automated Backups
In a production environment, automated logical backups (pg_dump) or continuous archiving (WAL) should be configured.

## Manual Backup
If you need to take a snapshot before a risky operation:
1. SSH into the production server.
2. Navigate to the StockOps directory.
3. Run the backup script:
   ```bash
   bash ./docker/postgres/backup.sh
   ```
4. This will create a compressed `.sql.gz` file in the `./backups/` directory.

## Restore Procedure
> [!CAUTION]
> Restoring a database **overwrites** the current data. Only do this if you are performing a disaster recovery or resetting a staging environment.

1. Ensure the API and Worker containers are stopped to prevent writes during restore:
   ```bash
   docker compose stop api worker
   ```
2. Locate your backup file (e.g., `backups/stockops_20260501_120000.sql.gz`).
3. Run the restore script:
   ```bash
   bash ./docker/postgres/restore.sh ./backups/stockops_20260501_120000.sql.gz
   ```
4. Wait for the success confirmation.
5. Restart the application containers:
   ```bash
   docker compose start api worker
   ```

## Restore Drills
To ensure backups are valid without affecting the production database:
1. Run `bash ./docker/postgres/restore_drill.sh`.
2. This script creates a temporary database, restores the latest backup into it, validates the table count, and then cleans up.
