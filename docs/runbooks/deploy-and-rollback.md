# Deploy and Rollback Runbook

## Overview
This runbook describes the procedure for deploying new versions of StockOps to production and how to safely roll back in case of an issue.

## Deployment Procedure
StockOps is deployed using Docker containers. The automated CI/CD pipeline pushes images to the container registry on every release tag.

1. **Verify Build Status**: Ensure the GitHub Actions `CI` workflow has passed for the target commit.
2. **Trigger Deployment**: 
   - You can trigger the `Continuous Deployment` workflow manually via GitHub Actions.
   - Or tag a release: `git tag v1.0.0 && git push --tags`
3. **Database Migrations**:
   - The deployment pipeline automatically runs `npm run prisma:migrate:deploy` before updating the application containers.
4. **Update Containers**:
   - On the server, pull the latest images: `docker compose pull`
   - Restart the stack: `docker compose --profile production up -d`
5. **Verify Health**:
   - Check the API status page: `curl https://api.yourdomain.com/v1/status`
   - Check Grafana metrics to ensure there are no spikes in 500 errors.

## Rollback Procedure
If a deployment causes critical issues and must be reverted:

1. **Revert Application Code**:
   - Identify the previous stable image tag (e.g., `v0.9.0`).
   - Change the tags in your deployment orchestrator or `compose.yaml` to point to the older version.
   - Run `docker compose --profile production up -d` to restart the containers with the old images.
2. **Handling Database Changes**:
   - If the bad deployment included a database migration that dropped or altered columns irrecoverably, a simple code rollback might fail (application might expect the old schema).
   - In this case, you must evaluate if you can restore from the pre-deployment backup (see `backup-and-restore.md`) or manually write a down-migration script.
   - For additive migrations (new tables/columns), a code rollback is generally safe as the old code will simply ignore the new schema elements.

## Post-Incident
- Record the incident, the time to recover, and the root cause.
- Determine if a quality gate was missed that could have caught the issue earlier.
