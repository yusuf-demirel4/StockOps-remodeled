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
import type {
  NotificationDeliveryStatus,
  Permission,
  Role,
  WebhookEventStatus,
} from "@stockops/core/types";

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

const webhookStatusTone: Record<
  WebhookEventStatus,
  "neutral" | "success" | "warning" | "danger"
> = {
  FAILED: "danger",
  IGNORED: "neutral",
  PENDING: "warning",
  PROCESSED: "success",
  PROCESSING: "warning",
};

const notificationStatusTone: Record<
  NotificationDeliveryStatus,
  "neutral" | "success" | "warning" | "danger"
> = {
  FAILED: "danger",
  PENDING: "warning",
  SENT: "success",
  SKIPPED: "neutral",
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
                  <thead className="text-xs uppercase text-[var(--text-secondary)]">
                    <tr className="border-b border-[var(--border-subtle)]">
                      <th className="py-2 pr-3">Kod</th>
                      <th className="py-2 pr-3">Depo</th>
                      <th className="py-2 pr-3">Durum</th>
                      <th className="py-2">Aksiyon</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.warehouses.map((warehouse) => (
                      <tr
                        className="border-b border-[var(--border-table)] align-top last:border-0"
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

          <Panel title="P2 entegrasyon inbox">
            {snapshot.webhookEvents.length === 0 ? (
              <EmptyState>Webhook kaydi bulunmuyor.</EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="text-xs uppercase text-[var(--text-secondary)]">
                    <tr className="border-b border-[var(--border-subtle)]">
                      <th className="py-2 pr-3">Kaynak</th>
                      <th className="py-2 pr-3">Topic</th>
                      <th className="py-2 pr-3">Durum</th>
                      <th className="py-2 pr-3">Deneme</th>
                      <th className="py-2 pr-3">External ID</th>
                      <th className="py-2">Hata</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.webhookEvents.map((event) => (
                      <tr
                        className="border-b border-[var(--border-table)] align-top last:border-0"
                        key={event.id}
                      >
                        <td className="py-3 pr-3 font-mono text-xs">
                          {event.source}
                        </td>
                        <td className="py-3 pr-3">{event.topic}</td>
                        <td className="py-3 pr-3">
                          <StatusBadge tone={webhookStatusTone[event.status]}>
                            {event.status}
                          </StatusBadge>
                        </td>
                        <td className="py-3 pr-3 font-mono text-xs">
                          {event.attempts}
                        </td>
                        <td className="max-w-[220px] truncate py-3 pr-3 font-mono text-xs">
                          {event.externalId ?? "-"}
                        </td>
                        <td className="max-w-[260px] py-3 text-[var(--accent-danger-text)]">
                          {event.error ?? "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title="Bildirim teslimatlari">
            {snapshot.notificationDeliveries.length === 0 ? (
              <EmptyState>Bildirim teslimat kaydi bulunmuyor.</EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="text-xs uppercase text-[var(--text-secondary)]">
                    <tr className="border-b border-[var(--border-subtle)]">
                      <th className="py-2 pr-3">Kanal</th>
                      <th className="py-2 pr-3">Provider</th>
                      <th className="py-2 pr-3">Durum</th>
                      <th className="py-2 pr-3">Alici</th>
                      <th className="py-2">Mesaj</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.notificationDeliveries.map((delivery) => (
                      <tr
                        className="border-b border-[var(--border-table)] align-top last:border-0"
                        key={delivery.id}
                      >
                        <td className="py-3 pr-3 font-mono text-xs">
                          {delivery.channel}
                        </td>
                        <td className="py-3 pr-3">{delivery.provider}</td>
                        <td className="py-3 pr-3">
                          <StatusBadge
                            tone={notificationStatusTone[delivery.status]}
                          >
                            {delivery.status}
                          </StatusBadge>
                        </td>
                        <td className="py-3 pr-3 font-mono text-xs">
                          {delivery.recipient ?? delivery.reason ?? "-"}
                        </td>
                        <td className="max-w-[360px] py-3">
                          {delivery.message}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title="Rol matrisi">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-xs uppercase text-[var(--text-secondary)]">
                  <tr className="border-b border-[var(--border-subtle)]">
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
                      className="border-b border-[var(--border-table)] last:border-0"
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
              <dt className="text-[var(--text-secondary)]">İşletme</dt>
              <dd className="mt-1 font-medium">{snapshot.organization.name}</dd>
            </div>
            <div>
              <dt className="text-[var(--text-secondary)]">Slug</dt>
              <dd className="mt-1 font-mono text-xs">
                {snapshot.organization.slug}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--text-secondary)]">Aktif kullanıcı</dt>
              <dd className="mt-1 font-medium">{snapshot.user.name}</dd>
            </div>
            <div>
              <dt className="text-[var(--text-secondary)]">Rol</dt>
              <dd className="mt-1">
                <StatusBadge tone="success">{roleLabels[snapshot.role]}</StatusBadge>
              </dd>
            </div>
            <div>
              <dt className="text-[var(--text-secondary)]">Varsayılan depo</dt>
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
