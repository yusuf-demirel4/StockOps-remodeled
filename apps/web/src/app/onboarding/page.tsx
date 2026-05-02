import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Code2,
  Database,
  Gauge,
  Rocket,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Panel, StatusBadge, subtleButtonClass } from "@/components/ui";
import { requireAuth } from "@/lib/auth";
import { getAppSnapshot } from "@/lib/repository";
import {
  buildBuyerJourney,
  buildOnboardingSteps,
  onboardingProgress,
  phase13BuyerMetrics,
} from "@/lib/phase13";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const context = await requireAuth();
  const snapshot = await getAppSnapshot(context);
  const steps = buildOnboardingSteps(snapshot);
  const progress = onboardingProgress(steps);
  const buyerJourney = buildBuyerJourney(snapshot);
  const metrics = phase13BuyerMetrics(snapshot);

  return (
    <AppShell
      description="A self-serve setup path that shows StockOps' faster onboarding, open APIs, and portable data story."
      organizationName={snapshot.organization.name}
      role={snapshot.role}
      title="Onboarding"
      userName={snapshot.user.name}
    >
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="grid gap-6">
          <Panel title="Setup wizard">
            <div className="mb-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">
                    {progress.completed} of {progress.total} setup steps complete
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    A buyer can see value without paid add-ons or a long implementation project.
                  </p>
                </div>
                <StatusBadge tone={progress.percent >= 80 ? "success" : "warning"}>
                  {progress.percent}%
                </StatusBadge>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--progress-bg)]">
                <div
                  className="h-full rounded-full bg-[var(--accent-primary)]"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            </div>

            <div className="grid gap-3">
              {steps.map((step) => {
                const Icon = step.complete ? CheckCircle2 : Circle;
                return (
                  <Link
                    className="flex items-start justify-between gap-4 rounded-md border border-[var(--border-table)] bg-[var(--bg-empty)] px-4 py-3 transition hover:bg-[var(--bg-hover)]"
                    href={step.href}
                    key={step.id}
                  >
                    <div className="flex gap-3">
                      <Icon
                        aria-hidden="true"
                        className={
                          step.complete
                            ? "mt-0.5 size-5 shrink-0 text-[var(--accent-success-text2)]"
                            : "mt-0.5 size-5 shrink-0 text-[var(--text-secondary)]"
                        }
                      />
                      <div>
                        <p className="font-medium">{step.title}</p>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">
                          {step.description}
                        </p>
                        <p className="mt-2 font-mono text-xs text-[var(--text-muted)]">
                          {step.metric}
                        </p>
                      </div>
                    </div>
                    <ArrowRight
                      aria-hidden="true"
                      className="mt-1 size-4 shrink-0 text-[var(--text-secondary)]"
                    />
                  </Link>
                );
              })}
            </div>
          </Panel>

          <Panel title="15-minute buyer demo path">
            <div className="grid gap-3 md:grid-cols-2">
              {buyerJourney.map((step) => (
                <Link
                  className="rounded-md border border-[var(--border-table)] px-4 py-3 transition hover:bg-[var(--bg-hover)]"
                  href={step.href}
                  key={step.title}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{step.title}</p>
                    <StatusBadge tone={step.status === "ready" ? "success" : "warning"}>
                      {step.status === "ready" ? "Ready" : "Needs data"}
                    </StatusBadge>
                  </div>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    {step.evidence}
                  </p>
                </Link>
              ))}
            </div>
          </Panel>
        </div>

        <div className="grid gap-6 self-start">
          <Panel title="Why StockOps wins">
            <div className="grid gap-3 text-sm">
              <Differentiator
                icon={Rocket}
                label="Faster onboarding"
                value="Setup wizard, demo data, and critical workflows in one PWA."
              />
              <Differentiator
                icon={Code2}
                label="Open by default"
                value="OpenAPI, SDK, extension webhooks, and custom fields are included."
              />
              <Differentiator
                icon={Database}
                label="Portable data"
                value="CSV, XLSX, PDFs, and account-level JSON export are first-class."
              />
              <Differentiator
                icon={Gauge}
                label="Transparent ops"
                value="Sync logs, webhook inbox, queue metrics, and runbooks are visible."
              />
            </div>
          </Panel>

          <Panel title="Included surfaces">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <Metric label="Add-on class features" value={metrics.includedAddOns} />
              <Metric label="Export surfaces" value={metrics.exportSurfaces} />
              <Metric label="Mobile workflows" value={metrics.mobileWorkflows} />
              <Metric label="API groups" value={metrics.openApiEndpoints} />
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link className={subtleButtonClass} href="/developers">
                Developer API
              </Link>
              <Link className={subtleButtonClass} href="/forecasting">
                Forecasting
              </Link>
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}

function Differentiator({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Rocket;
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

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-[var(--border-table)] bg-[var(--bg-empty)] px-3 py-3">
      <dt className="text-xs text-[var(--text-secondary)]">{label}</dt>
      <dd className="mt-2 font-mono text-2xl font-semibold">{value}</dd>
    </div>
  );
}
