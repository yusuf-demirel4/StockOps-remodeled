import { AppShell } from "@/components/app-shell";
import { AnalyticsDashboard } from "@/components/analytics-dashboard";
import { requireAuth } from "@/lib/auth";
import { getAppSnapshot } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const context = await requireAuth();
  const snapshot = await getAppSnapshot(context);

  return (
    <AppShell
      description="Satış, stok ve sipariş analizleri. Etkileşimli grafikler."
      organizationName={snapshot.organization.name}
      role={snapshot.role}
      title="Analitik"
      userName={snapshot.user.name}
    >
      <AnalyticsDashboard snapshot={snapshot} />
    </AppShell>
  );
}
