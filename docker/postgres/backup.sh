#!/usr/bin/env bash
set -e

# StockOps Database Backup Script
# Usage: ./backup.sh

BACKUP_DIR="./backups"
DB_CONTAINER="stockops-main-postgres-1" # Or postgres depending on compose project name
DB_USER="stockops"
DB_NAME="stockops"

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/stockops_${TIMESTAMP}.sql.gz"

echo "Starting backup of ${DB_NAME}..."

# Wait for container to be ready
if ! docker ps | grep -q "$DB_CONTAINER"; then
    echo "Warning: Checking for 'postgres' container instead..."
    if docker ps | grep -q "postgres"; then
        DB_CONTAINER=$(docker ps --format "{{.Names}}" | grep "postgres" | head -n 1)
    else
        echo "Error: Database container not found."
        exit 1
    fi
fi

docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo "Backup successfully created at $BACKUP_FILE"
else
    echo "Error: Backup failed!"
    rm -f "$BACKUP_FILE"
    exit 1
fi
