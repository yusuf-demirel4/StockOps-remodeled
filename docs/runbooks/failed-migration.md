# Failed Migration Runbook

## Overview
Prisma migrations usually run automatically during the deployment pipeline (`npm run prisma:migrate:deploy`). However, if a migration fails mid-execution (e.g., due to existing data violating a new constraint), the database may be left in a partially migrated state.

## Identifying the Issue
1. Deployment logs will show an error during the `Run Prisma Migrations` step.
2. The error message will specify which migration failed and why (e.g., "Unique constraint failed").
3. You can check the migration status manually:
   ```bash
   npm run prisma:migrate:status
   ```

## Resolution Steps

### Option A: Fix the Data and Retry
If the migration failed because of bad data (e.g., adding a NOT NULL column without a default to a table with rows):
1. Connect to the database manually using `psql` or a GUI client.
2. Fix the offending data (e.g., `UPDATE users SET new_column = 'default' WHERE new_column IS NULL;`).
3. Re-run the deployment pipeline or manually run `npm run prisma:migrate:deploy` to apply the migration.

### Option B: Mark Migration as Resolved
If you manually applied the DDL changes to fix the issue and the database matches the desired state:
1. Mark the migration as resolved so Prisma knows it is applied:
   ```bash
   npx prisma migrate resolve --applied "20260501120000_add_new_column"
   ```

### Option C: Rollback Migration
If the migration is flawed and you need to revert the codebase:
1. Since Prisma does not natively support "down" migrations out of the box, you must manually run the inverse DDL (e.g., `ALTER TABLE users DROP COLUMN new_column;`).
2. Mark the failed migration as rolled back:
   ```bash
   npx prisma migrate resolve --rolled-back "20260501120000_add_new_column"
   ```
3. Revert the commit in Git and push the fix.
