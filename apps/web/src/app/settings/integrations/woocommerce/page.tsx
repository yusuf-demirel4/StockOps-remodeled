import { AppShell } from "@/components/app-shell";
import { Panel, StatusBadge, inputClass, buttonClass } from "@/components/ui";
import { requireAuth } from "@/lib/auth";
import { getAppSnapshot } from "@/lib/repository";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function WooCommerceIntegrationPage() {
  const context = await requireAuth();
  const snapshot = await getAppSnapshot(context);

  const wooEvents = snapshot.webhookEvents.filter(
    (e) => e.source === "WOOCOMMERCE",
  );
  const processedCount = wooEvents.filter(
    (e) => e.status === "PROCESSED",
  ).length;
  const failedCount = wooEvents.filter((e) => e.status === "FAILED").length;

  return (
    <AppShell
      description="WooCommerce entegrasyon ayarlari ve senkronizasyon durumu."
      organizationName={snapshot.organization.name}
      role={snapshot.role}
      title="WooCommerce Entegrasyonu"
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
                  Site URL
                  <input
                    className={inputClass}
                    name="siteUrl"
                    placeholder="https://my-store.com"
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-medium">
                  Consumer Key
                  <input
                    className={inputClass}
                    name="consumerKey"
                    placeholder="ck_..."
                    type="password"
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-medium">
                  Consumer Secret
                  <input
                    className={inputClass}
                    name="consumerSecret"
                    placeholder="cs_..."
                    type="password"
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-medium">
                  Webhook Secret
                  <input
                    className={inputClass}
                    name="webhookSecret"
                    placeholder="Webhook dogrulama anahtari"
                    type="password"
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
                    <option value="push">StockOps → WooCommerce</option>
                    <option value="pull">WooCommerce → StockOps</option>
                    <option value="bidirectional">Cift Yonlu</option>
                  </select>
                </label>
                <label className="grid gap-1.5 text-sm font-medium">
                  Catisma Cozumu
                  <select className={inputClass}>
                    <option value="stockops_wins">StockOps Oncelikli</option>
                    <option value="woocommerce_wins">WooCommerce Oncelikli</option>
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
                  <p className="text-2xl font-semibold">{wooEvents.length}</p>
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
              {wooEvents.length === 0 ? (
                <p className="py-4 text-center text-sm text-[var(--text-secondary)]">
                  Henuz WooCommerce webhook olayi yok.
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
                      {wooEvents.map((event) => (
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
                  { topic: "order.created", desc: "Yeni siparis olusturuldu" },
                  { topic: "order.updated", desc: "Siparis guncellendi" },
                  { topic: "order.deleted", desc: "Siparis silindi" },
                  { topic: "product.created", desc: "Yeni urun eklendi" },
                  { topic: "product.updated", desc: "Urun guncellendi" },
                  { topic: "product.deleted", desc: "Urun silindi" },
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
