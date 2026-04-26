import { AppShell } from "@/components/app-shell";
import { EmptyState, Panel, StatusBadge } from "@/components/ui";
import {
  WarehouseCreateForm,
  WarehouseDefaultForm,
  WarehouseUpdateDisclosure,
} from "@/components/warehouse-forms";
import { rolePermissions } from "@stockops/core/inventory";
import { requireAuth } from "@/lib/auth";
import { getAppSnapshot } from "@/lib/repository";
import type { Permission, Role } from "@stockops/core/types";

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
      description="Rol bazlı erişim, depo yapısı ve işletme bağlamı."
      organizationName={snapshot.organization.name}
      role={snapshot.role}
      title="Ayarlar"
      userName={snapshot.user.name}
    >
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="grid gap-6">
          <Panel title="Depolar">
            {snapshot.warehouses.length === 0 ? (
              <EmptyState>Depo bulunmuyor.</EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="text-xs uppercase text-[#6a746f]">
                    <tr className="border-b border-[#e3e5dd]">
                      <th className="py-2 pr-3">Kod</th>
                      <th className="py-2 pr-3">Depo</th>
                      <th className="py-2 pr-3">Durum</th>
                      <th className="py-2">Aksiyon</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.warehouses.map((warehouse) => (
                      <tr
                        className="border-b border-[#eef0ea] align-top last:border-0"
                        key={warehouse.id}
                      >
                        <td className="py-3 pr-3 font-mono text-xs">
                          {warehouse.code}
                        </td>
                        <td className="py-3 pr-3 font-medium">
                          {warehouse.name}
                        </td>
                        <td className="py-3 pr-3">
                          {warehouse.isDefault ? (
                            <StatusBadge tone="success">Varsayılan</StatusBadge>
                          ) : (
                            <StatusBadge>Aktif</StatusBadge>
                          )}
                        </td>
                        <td className="py-3">
                          {snapshot.permissions.canManageStock ? (
                            <div className="flex flex-wrap gap-2">
                              <WarehouseUpdateDisclosure warehouse={warehouse} />
                              <WarehouseDefaultForm warehouse={warehouse} />
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          {snapshot.permissions.canManageStock ? (
            <Panel title="Depo ekle">
              <WarehouseCreateForm />
            </Panel>
          ) : null}

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
                      <td className="py-3 pr-3 font-medium">
                        {roleLabels[role]}
                      </td>
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
        </div>

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
            <div>
              <dt className="text-[#66706b]">Varsayılan depo</dt>
              <dd className="mt-1 font-medium">
                {snapshot.warehouses.find((warehouse) => warehouse.isDefault)
                  ?.name ?? "-"}
              </dd>
            </div>
          </dl>
        </Panel>
      </div>
    </AppShell>
  );
}
