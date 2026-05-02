#!/usr/bin/env bash
set -euo pipefail

# StockOps Database Restore Script
# Usage: ./restore.sh <path_to_backup_file>

if [ -z "$1" ]; then
    echo "Usage: ./restore.sh <path_to_backup_file>"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: File $BACKUP_FILE not found."
    exit 1
fi

DB_CONTAINER="${DB_CONTAINER:-stockops-main-postgres-1}"
DB_USER="${POSTGRES_USER:-stockops}"
DB_NAME="${POSTGRES_DB:-stockops}"
DB_PASSWORD="${POSTGRES_PASSWORD:-stockops}"

if ! docker ps | grep -q "$DB_CONTAINER"; then
    echo "Warning: Checking for 'postgres' container instead..."
    if docker ps | grep -q "postgres"; then
        DB_CONTAINER=$(docker ps --format "{{.Names}}" | grep "postgres" | head -n 1)
    else
        echo "Error: Database container not found."
        exit 1
    fi
fi

echo "Warning: This will overwrite the current database!"
read -p "Are you sure you want to proceed? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Restore cancelled."
    exit 1
fi

echo "Dropping and recreating database to ensure clean state..."
docker exec -e PGPASSWORD="$DB_PASSWORD" "$DB_CONTAINER" psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME} WITH (FORCE);"
docker exec -e PGPASSWORD="$DB_PASSWORD" "$DB_CONTAINER" psql -U "$DB_USER" -d postgres -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"

echo "Restoring from $BACKUP_FILE..."

if [[ "$BACKUP_FILE" == *.gz ]]; then
    gunzip -c "$BACKUP_FILE" | docker exec -i "$DB_CONTAINER" psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME"
else
    docker exec -i "$DB_CONTAINER" psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" < "$BACKUP_FILE"
fi

if docker exec -e PGPASSWORD="$DB_PASSWORD" "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT 1" >/dev/null; then
    echo "Restore completed successfully!"
else
    echo "Error: Restore encountered problems."
    exit 1
fi
