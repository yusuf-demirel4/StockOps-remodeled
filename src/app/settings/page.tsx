import { AppShell } from "@/components/app-shell";
import { Panel, StatusBadge } from "@/components/ui";
import { rolePermissions } from "@/lib/inventory";
import { requireAuth } from "@/lib/auth";
import { getAppSnapshot } from "@/lib/repository";
import type { Permission, Role } from "@/lib/types";

const roleLabels: Record<Role, string> = {
  Owner: "Sahip",
  Admin: "Admin",
  WarehouseStaff: "Depo",
  SalesStaff: "Satış",
  PurchasingStaff: "Satın alma",
  Viewer: "Görüntüleme",
};

const permissionLabels: Record<Permission, string> = {
  manage_users: "Kullanıcı",
  manage_products: "Ürün",
  manage_stock: "Stok",
  manage_sales: "Satış",
  manage_purchasing: "Satın alma",
  view_dashboard: "Dashboard",
};

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const context = await requireAuth();
  const snapshot = await getAppSnapshot(context);

  return (
    <AppShell
      description="Rol bazlı erişim matrisi ve işletme bağlamı."
      organizationName={snapshot.organization.name}
      role={snapshot.role}
      title="Yetkiler"
      userName={snapshot.user.name}
    >
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Panel title="Rol matrisi">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-xs uppercase text-[#6a746f]">
                <tr className="border-b border-[#e3e5dd]">
                  <th className="py-2 pr-3">Rol</th>
                  {Object.values(permissionLabels).map((label) => (
                    <th className="py-2 pr-3" key={label}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(Object.keys(rolePermissions) as Role[]).map((role) => (
                  <tr
                    className="border-b border-[#eef0ea] last:border-0"
                    key={role}
                  >
                    <td className="py-3 pr-3 font-medium">{roleLabels[role]}</td>
                    {(Object.keys(permissionLabels) as Permission[]).map(
                      (permission) => (
                        <td className="py-3 pr-3" key={permission}>
                          {rolePermissions[role].includes(permission) ? (
                            <StatusBadge tone="success">Var</StatusBadge>
                          ) : (
                            <StatusBadge>Yok</StatusBadge>
                          )}
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="İşletme">
          <dl className="grid gap-4 text-sm">
            <div>
              <dt className="text-[#66706b]">İşletme</dt>
              <dd className="mt-1 font-medium">{snapshot.organization.name}</dd>
            </div>
            <div>
              <dt className="text-[#66706b]">Slug</dt>
              <dd className="mt-1 font-mono text-xs">
                {snapshot.organization.slug}
              </dd>
            </div>
            <div>
              <dt className="text-[#66706b]">Aktif kullanıcı</dt>
              <dd className="mt-1 font-medium">{snapshot.user.name}</dd>
            </div>
            <div>
              <dt className="text-[#66706b]">Rol</dt>
              <dd className="mt-1">
                <StatusBadge tone="success">{roleLabels[snapshot.role]}</StatusBadge>
              </dd>
            </div>
          </dl>
        </Panel>
      </div>
    </AppShell>
  );
}
