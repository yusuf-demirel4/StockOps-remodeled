#!/usr/bin/env bash
set -euo pipefail

# StockOps Database Backup Script
# Usage: ./backup.sh

BACKUP_DIR="${BACKUP_DIR:-./backups}"
DB_CONTAINER="${DB_CONTAINER:-stockops-main-postgres-1}"
DB_USER="${POSTGRES_USER:-stockops}"
DB_NAME="${POSTGRES_DB:-stockops}"

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

if docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"; then
    echo "Backup successfully created at $BACKUP_FILE"
else
    echo "Error: Backup failed!"
    rm -f "$BACKUP_FILE"
    exit 1
fi
