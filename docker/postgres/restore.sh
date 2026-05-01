#!/usr/bin/env bash
set -e

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

DB_CONTAINER="stockops-main-postgres-1"
DB_USER="stockops"
DB_NAME="stockops"

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
docker exec -e PGPASSWORD=stockops "$DB_CONTAINER" psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME} WITH (FORCE);"
docker exec -e PGPASSWORD=stockops "$DB_CONTAINER" psql -U "$DB_USER" -d postgres -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"

echo "Restoring from $BACKUP_FILE..."

if [[ "$BACKUP_FILE" == *.gz ]]; then
    gunzip -c "$BACKUP_FILE" | docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME"
else
    cat "$BACKUP_FILE" | docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME"
fi

if [ ${PIPESTATUS[0]} -eq 0 ] && [ ${PIPESTATUS[1]:-0} -eq 0 ]; then
    echo "Restore completed successfully!"
else
    echo "Error: Restore encountered problems."
    exit 1
fi
