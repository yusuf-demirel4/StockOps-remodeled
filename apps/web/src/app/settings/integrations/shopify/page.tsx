import { AppShell } from "@/components/app-shell";
import { Panel, StatusBadge, inputClass, buttonClass } from "@/components/ui";
import { requireAuth } from "@/lib/auth";
import { getAppSnapshot } from "@/lib/repository";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ShopifyIntegrationPage() {
  const context = await requireAuth();
  const snapshot = await getAppSnapshot(context);

  const shopifyEvents = snapshot.webhookEvents.filter(
    (e) => e.source === "SHOPIFY",
  );
  const processedCount = shopifyEvents.filter(
    (e) => e.status === "PROCESSED",
  ).length;
  const failedCount = shopifyEvents.filter(
    (e) => e.status === "FAILED",
  ).length;

  return (
    <AppShell
      description="Shopify entegrasyon ayarlari ve senkronizasyon durumu."
      organizationName={snapshot.organization.name}
      role={snapshot.role}
      title="Shopify Entegrasyonu"
      userName={snapshot.user.name}
    >
      <div className="space-y-6">
        <Link
          className="inline-flex items-center gap-2 text-sm text-[var(--text-nav)] hover:text-[var(--text-nav-hover)]"
          href="/settings/integrations"
        >
          <ArrowLeft className="size-4" />
          Entegrasyonlara don
        </Link>

        <div className="grid gap-6 xl:grid-cols-[400px_1fr]">
          <div className="space-y-6">
            <Panel title="Baglanti Ayarlari">
              <form className="grid gap-3">
                <label className="grid gap-1.5 text-sm font-medium">
                  Magaza Domaini
                  <input
                    className={inputClass}
                    name="shopDomain"
                    placeholder="my-store.myshopify.com"
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-medium">
                  Admin API Access Token
                  <input
                    className={inputClass}
                    name="accessToken"
                    placeholder="shpat_..."
                    type="password"
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-medium">
                  Webhook Secret (HMAC)
                  <input
                    className={inputClass}
                    name="webhookSecret"
                    placeholder="Webhook dogrulama anahtari"
                    type="password"
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-medium">
                  API Versiyonu
                  <input
                    className={inputClass}
                    defaultValue="2024-10"
                    name="apiVersion"
                  />
                </label>
                <button className={buttonClass} type="button">
                  Baglaniyi Kaydet
                </button>
              </form>
            </Panel>

            <Panel title="Senkronizasyon Ayarlari">
              <form className="grid gap-3">
                <label className="grid gap-1.5 text-sm font-medium">
                  Senkronizasyon Yonu
                  <select className={inputClass}>
                    <option value="push">StockOps → Shopify</option>
                    <option value="pull">Shopify → StockOps</option>
                    <option value="bidirectional">Cift Yonlu</option>
                  </select>
                </label>
                <label className="grid gap-1.5 text-sm font-medium">
                  Catisma Cozumu
                  <select className={inputClass}>
                    <option value="stockops_wins">StockOps Oncelikli</option>
                    <option value="shopify_wins">Shopify Oncelikli</option>
                    <option value="newest_wins">En Yeni Oncelikli</option>
                  </select>
                </label>
                <label className="grid gap-1.5 text-sm font-medium">
                  Otomatik Duzeltme Esigi
                  <input
                    className={inputClass}
                    defaultValue="5"
                    min="1"
                    name="autoFixThreshold"
                    type="number"
                  />
                  <span className="text-xs text-[var(--placeholder)]">
                    Bu esik altindaki farklar otomatik duzeltilir
                  </span>
                </label>
                <button className={buttonClass} type="button">
                  Ayarlari Kaydet
                </button>
              </form>
            </Panel>
          </div>

          <div className="space-y-6">
            <Panel title="Senkronizasyon Durumu">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-md border border-[var(--border-subtle)] p-3 text-center">
                  <p className="text-2xl font-semibold text-[var(--text-primary)]">
                    {shopifyEvents.length}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">Toplam Webhook</p>
                </div>
                <div className="rounded-md border border-[var(--accent-success-bg2)] bg-[var(--accent-success-bg)] p-3 text-center">
                  <p className="text-2xl font-semibold text-[var(--accent-success-text2)]">
                    {processedCount}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">Basarili</p>
                </div>
                <div className="rounded-md border border-[var(--accent-danger-bg2)] bg-[var(--accent-danger-bg)] p-3 text-center">
                  <p className="text-2xl font-semibold text-[var(--accent-danger-text)]">
                    {failedCount}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">Basarisiz</p>
                </div>
              </div>
            </Panel>

            <Panel title="Son Webhook Olaylari">
              {shopifyEvents.length === 0 ? (
                <p className="py-4 text-center text-sm text-[var(--text-secondary)]">
                  Henuz Shopify webhook olayi yok.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs uppercase text-[var(--text-secondary)]">
                      <tr className="border-b border-[var(--border-subtle)]">
                        <th className="py-2 pr-3">Konu</th>
                        <th className="py-2 pr-3">Durum</th>
                        <th className="py-2 pr-3">Deneme</th>
                        <th className="py-2">Tarih</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shopifyEvents.map((event) => (
                        <tr
                          className="border-b border-[var(--border-table)] last:border-0"
                          key={event.id}
                        >
                          <td className="py-2 pr-3 font-mono text-xs">
                            {event.topic}
                          </td>
                          <td className="py-2 pr-3">
                            <StatusBadge
                              tone={
                                event.status === "PROCESSED"
                                  ? "success"
                                  : event.status === "FAILED"
                                    ? "danger"
                                    : "warning"
                              }
                            >
                              {event.status}
                            </StatusBadge>
                          </td>
                          <td className="py-2 pr-3">{event.attempts}</td>
                          <td className="py-2 text-xs text-[var(--text-secondary)]">
                            {new Date(event.receivedAt).toLocaleString("tr-TR")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>

            <Panel title="Desteklenen Webhook Konulari">
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  { topic: "orders/create", desc: "Yeni siparis olusturuldu" },
                  { topic: "orders/updated", desc: "Siparis guncellendi" },
                  { topic: "orders/cancelled", desc: "Siparis iptal edildi" },
                  { topic: "products/create", desc: "Yeni urun eklendi" },
                  { topic: "products/update", desc: "Urun guncellendi" },
                  { topic: "products/delete", desc: "Urun silindi" },
                  {
                    topic: "inventory_levels/update",
                    desc: "Stok seviyesi degisti",
                  },
                  { topic: "refunds/create", desc: "Iade olusturuldu" },
                ].map((item) => (
                  <div
                    className="flex items-center justify-between rounded-md border border-[var(--border-subtle)] px-3 py-2"
                    key={item.topic}
                  >
                    <span className="font-mono text-xs text-[var(--text-nav)]">
                      {item.topic}
                    </span>
                    <span className="text-xs text-[var(--placeholder)]">{item.desc}</span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
