import Link from "next/link";
import { Code2, Download, KeyRound, PlugZap, Webhook } from "lucide-react";
import { EXTENSION_EVENTS } from "@stockops/core/extensions";

import { AppShell } from "@/components/app-shell";
import { Panel, StatusBadge, subtleButtonClass } from "@/components/ui";
import { requireAuth } from "@/lib/auth";
import { getAppSnapshot } from "@/lib/repository";

export const dynamic = "force-dynamic";

const nodeSnippet = `import { StockOpsClient } from "@stockops/sdk-node";

const stockops = new StockOpsClient({
  baseUrl: "https://api.example.com/v1",
  apiToken: process.env.STOCKOPS_API_TOKEN!,
});

const forecast = await stockops.forecastProduct("prd_123", { horizon: 30 });
const exportBundle = await stockops.exportAccountPortability();`;

const pythonSnippet = `import os
import requests

base_url = "https://api.example.com/v1"
headers = {"Authorization": f"Bearer {os.environ['STOCKOPS_API_TOKEN']}"}

products = requests.get(f"{base_url}/products", headers=headers, timeout=30)
products.raise_for_status()
print(products.json())`;

export default async function DevelopersPage() {
  const context = await requireAuth();
  const snapshot = await getAppSnapshot(context);

  return (
    <AppShell
      description="Open extension API, SDK examples, webhook events, and account portability."
      organizationName={snapshot.organization.name}
      role={snapshot.role}
      title="Developers"
      userName={snapshot.user.name}
    >
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="grid gap-6">
          <Panel title="Open API quick start">
            <div className="grid gap-4 md:grid-cols-2">
              <Snippet title="Node SDK" code={nodeSnippet} />
              <Snippet title="Python HTTP" code={pythonSnippet} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link className={subtleButtonClass} href="/api/docs">
                <Code2 aria-hidden="true" className="size-4" />
                OpenAPI
              </Link>
              <Link
                className={subtleButtonClass}
                href="/api/export/account-portability"
              >
                <Download aria-hidden="true" className="size-4" />
                Account export
              </Link>
            </div>
          </Panel>

          <Panel title="Extension webhook events">
            <div className="grid gap-2 md:grid-cols-2">
              {EXTENSION_EVENTS.map((event) => (
                <div
                  className="rounded-md border border-[var(--border-table)] bg-[var(--bg-empty)] px-3 py-2"
                  key={event}
                >
                  <code className="text-xs text-[var(--text-primary)]">{event}</code>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Webhook delivery contract">
            <div className="grid gap-3 text-sm">
              <ContractItem
                icon={Webhook}
                label="Events"
                value="Subscribe to product, stock, order, invoice, and integration events."
              />
              <ContractItem
                icon={KeyRound}
                label="Signing"
                value="Use a per-subscription secret and verify HMAC signatures before trusting payloads."
              />
              <ContractItem
                icon={PlugZap}
                label="Recovery"
                value="Use webhook inbox, sync logs, and replay flows to recover from provider outages."
              />
            </div>
          </Panel>
        </div>

        <div className="grid gap-6 self-start">
          <Panel title="Extension status">
            <dl className="grid gap-3 text-sm">
              <StatusRow
                label="Webhook subscriptions"
                tone={snapshot.webhookSubscriptions.length > 0 ? "success" : "warning"}
                value={String(snapshot.webhookSubscriptions.length)}
              />
              <StatusRow
                label="Custom fields"
                tone={snapshot.customFields.length > 0 ? "success" : "neutral"}
                value={String(snapshot.customFields.length)}
              />
              <StatusRow
                label="Webhook inbox records"
                tone={snapshot.webhookEvents.length > 0 ? "success" : "neutral"}
                value={String(snapshot.webhookEvents.length)}
              />
              <StatusRow
                label="Sync logs"
                tone={snapshot.integrationSyncLogs.length > 0 ? "success" : "neutral"}
                value={String(snapshot.integrationSyncLogs.length)}
              />
            </dl>
          </Panel>

          <Panel title="Buyer promise">
            <ul className="grid gap-3 text-sm text-[var(--text-secondary)]">
              <li>API and exports are part of the core product, not a hidden upsell.</li>
              <li>Developers can start from OpenAPI, the Node SDK, or plain HTTP.</li>
              <li>Account portability export keeps customer data inspectable and recoverable.</li>
            </ul>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}

function Snippet({ title, code }: { title: string; code: string }) {
  return (
    <div className="overflow-hidden rounded-md border border-[var(--border-table)]">
      <div className="border-b border-[var(--border-table)] px-3 py-2 text-sm font-medium">
        {title}
      </div>
      <pre className="overflow-x-auto bg-[var(--bg-empty)] p-3 text-xs leading-5">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function ContractItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Webhook;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3 rounded-md border border-[var(--border-table)] px-3 py-3">
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[var(--accent-secondary)]" />
      <div>
        <p className="font-medium">{label}</p>
        <p className="mt-1 text-[var(--text-secondary)]">{value}</p>
      </div>
    </div>
  );
}

function StatusRow({
  label,
  tone,
  value,
}: {
  label: string;
  tone: "neutral" | "success" | "warning" | "danger";
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-[var(--border-table)] px-3 py-3">
      <dt>{label}</dt>
      <dd>
        <StatusBadge tone={tone}>{value}</StatusBadge>
      </dd>
    </div>
  );
}
