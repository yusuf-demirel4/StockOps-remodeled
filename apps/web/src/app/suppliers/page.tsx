import { AppShell } from "@/components/app-shell";
import {
  SupplierCreateForm,
  SupplierUpdateDisclosure,
} from "@/components/supplier-forms";
import { Panel } from "@/components/ui";
import { requireAuth } from "@/lib/auth";
import { getAppSnapshot } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const context = await requireAuth();
  const snapshot = await getAppSnapshot(context);

  return (
    <AppShell
      description="Firma, iletişim ve tedarik süresi kayıtları."
      organizationName={snapshot.organization.name}
      role={snapshot.role}
      title="Tedarikçiler"
      userName={snapshot.user.name}
    >
      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <Panel title="Yeni tedarikçi">
          <SupplierCreateForm />
        </Panel>

        <Panel title="Tedarikçi listesi">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="text-xs uppercase text-[var(--text-secondary)]">
                <tr className="border-b border-[var(--border-subtle)]">
                  <th className="py-2 pr-3">Firma</th>
                  <th className="py-2 pr-3">Yetkili</th>
                  <th className="py-2 pr-3">E-posta</th>
                  <th className="py-2 pr-3">Telefon</th>
                  <th className="py-2 pr-3">Tedarik süresi</th>
                  <th className="py-2">Aksiyon</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.suppliers.map((supplier) => (
                  <tr
                    className="border-b border-[var(--border-table)] align-top last:border-0"
                    key={supplier.id}
                  >
                    <td className="py-3 pr-3 font-medium">{supplier.name}</td>
                    <td className="py-3 pr-3">{supplier.contactName ?? "-"}</td>
                    <td className="py-3 pr-3">{supplier.email ?? "-"}</td>
                    <td className="py-3 pr-3">{supplier.phone ?? "-"}</td>
                    <td className="py-3 pr-3">{supplier.leadTimeDays} gün</td>
                    <td className="py-3">
                      <SupplierUpdateDisclosure supplier={supplier} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
