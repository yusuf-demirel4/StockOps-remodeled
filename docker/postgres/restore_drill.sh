#!/usr/bin/env bash
set -euo pipefail

# StockOps Database Restore Drill Script
# Validates backup and restore procedures without dropping main db.

echo "--- Starting DB Restore Drill ---"

# Step 1: Create a backup
echo "1. Creating fresh backup..."
bash ./docker/postgres/backup.sh

# Find the latest backup file
LATEST_BACKUP=$(ls -t ./backups/*.sql.gz | head -n 1)

if [ -z "$LATEST_BACKUP" ]; then
    echo "Error: Backup file not found!"
    exit 1
fi
echo "Backup created at $LATEST_BACKUP"

# Step 2: Create a test database
echo "2. Setting up drill database..."
DB_CONTAINER=$(docker ps --format "{{.Names}}" | grep "postgres" | head -n 1)
DB_USER="${POSTGRES_USER:-stockops}"
DB_PASSWORD="${POSTGRES_PASSWORD:-stockops}"
DRILL_DB="${DRILL_DB:-stockops_drill_test}"

docker exec -e PGPASSWORD="$DB_PASSWORD" "$DB_CONTAINER" psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS ${DRILL_DB} WITH (FORCE);"
docker exec -e PGPASSWORD="$DB_PASSWORD" "$DB_CONTAINER" psql -U "$DB_USER" -d postgres -c "CREATE DATABASE ${DRILL_DB} OWNER ${DB_USER};"

# Step 3: Restore to test database
echo "3. Restoring to drill database..."
gunzip -c "$LATEST_BACKUP" | docker exec -i "$DB_CONTAINER" psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DRILL_DB"

# Step 4: Validate
echo "4. Validating restored data..."
COUNT=$(docker exec -e PGPASSWORD="$DB_PASSWORD" "$DB_CONTAINER" psql -U "$DB_USER" -d "$DRILL_DB" -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';")
MIGRATION_COUNT=$(docker exec -e PGPASSWORD="$DB_PASSWORD" "$DB_CONTAINER" psql -U "$DB_USER" -d "$DRILL_DB" -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='_prisma_migrations';")

if [ "$(echo "$COUNT" | xargs)" -le 0 ] || [ "$(echo "$MIGRATION_COUNT" | xargs)" -ne 1 ]; then
    echo "Error: Restore drill validation failed."
    exit 1
fi

echo "Validation successful: Found $(echo "$COUNT" | xargs) tables in restored database."

# Clean up
echo "5. Cleaning up..."
docker exec -e PGPASSWORD="$DB_PASSWORD" "$DB_CONTAINER" psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS ${DRILL_DB} WITH (FORCE);"

echo "--- Drill completed successfully! ---"
