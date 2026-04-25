import { Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { buttonClass, inputClass, Panel } from "@/components/ui";
import { createSupplierAction } from "@/lib/actions";
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
          <form action={createSupplierAction} className="grid gap-3">
            <label className="grid gap-1.5 text-sm font-medium">
              Firma adı
              <input className={inputClass} name="name" required />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Yetkili
              <input className={inputClass} name="contactName" />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              E-posta
              <input className={inputClass} name="email" type="email" />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Telefon
              <input className={inputClass} name="phone" />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Tedarik süresi
              <input
                className={inputClass}
                min="1"
                name="leadTimeDays"
                required
                type="number"
              />
            </label>
            <button className={buttonClass} type="submit">
              <Plus aria-hidden="true" className="size-4" />
              Tedarikçi ekle
            </button>
          </form>
        </Panel>

        <Panel title="Tedarikçi listesi">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-xs uppercase text-[#6a746f]">
                <tr className="border-b border-[#e3e5dd]">
                  <th className="py-2 pr-3">Firma</th>
                  <th className="py-2 pr-3">Yetkili</th>
                  <th className="py-2 pr-3">E-posta</th>
                  <th className="py-2 pr-3">Telefon</th>
                  <th className="py-2">Tedarik süresi</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.suppliers.map((supplier) => (
                  <tr
                    className="border-b border-[#eef0ea] last:border-0"
                    key={supplier.id}
                  >
                    <td className="py-3 pr-3 font-medium">{supplier.name}</td>
                    <td className="py-3 pr-3">{supplier.contactName ?? "-"}</td>
                    <td className="py-3 pr-3">{supplier.email ?? "-"}</td>
                    <td className="py-3 pr-3">{supplier.phone ?? "-"}</td>
                    <td className="py-3">{supplier.leadTimeDays} gün</td>
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
