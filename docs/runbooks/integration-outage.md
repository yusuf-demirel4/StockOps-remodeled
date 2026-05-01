# Integration Outage Runbook

## Overview
StockOps relies on external integrations like Shopify, WooCommerce, Xero, and QuickBooks. These services may experience downtime or API rate limits, leading to failed sync jobs.

## Monitoring
- Check the Grafana dashboard for the `sync_failures_total` and `queue_depth` metrics.
- A sudden spike in queue depth usually indicates the worker is unable to process jobs due to an external outage or rate limit.

## Diagnosis
1. Identify which integration is failing:
   - Check worker logs for specific errors: `docker compose logs --tail=100 worker | grep "error"`
   - Check the external provider's status page (e.g., `status.shopify.com`).
2. Determine if it's a hard outage or rate limit:
   - 429 Too Many Requests -> Rate limit.
   - 5xx -> External provider outage.
   - 401/403 -> Authentication failure (expired token/revoked access).

## Resolution

### Handling API Outages
If Shopify or Xero is down:
1. The `bullmq` queue is configured to retry jobs with exponential backoff automatically.
2. You do not need to intervene immediately. Wait for the external service to recover.
3. Once the service is restored, the queue will naturally drain.

### Handling Poison Messages (Dead-Letter Queue)
If a specific job fails all retry attempts (e.g., bad data format):
1. The job will be moved to the "Failed" state in BullMQ.
2. Investigate the payload to determine why it failed.
3. Fix the underlying bug in the application code and deploy the fix.
4. Manually retry the failed jobs using a BullMQ dashboard (if configured) or a custom script:
   ```typescript
   // Example script to retry failed jobs
   const failedJobs = await queue.getFailed();
   for (const job of failedJobs) {
     await job.retry();
   }
   ```

### Authentication Failures
If the error is `401 Unauthorized`:
1. Ask the affected tenant to re-authenticate their integration via the StockOps UI.
2. Once re-authenticated, replay the failed jobs.
