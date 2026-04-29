import { AppShell } from "@/components/app-shell";
import { ReportViewer } from "@/components/report-viewer";
import { requireAuth } from "@/lib/auth";
import { getAppSnapshot } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const context = await requireAuth();
  const snapshot = await getAppSnapshot(context);

  return (
    <AppShell
      description="70+ hazır rapor. Kategori seçin, raporu çalıştırın, CSV olarak dışa aktarın."
      organizationName={snapshot.organization.name}
      role={snapshot.role}
      title="Raporlar"
      userName={snapshot.user.name}
    >
      <ReportViewer snapshot={snapshot} />
    </AppShell>
  );
}
