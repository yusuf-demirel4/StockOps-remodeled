import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Panel, StatusBadge } from "@/components/ui";
import { requireAuth } from "@/lib/auth";
import { getAppSnapshot } from "@/lib/repository";
import { ExternalLink, ShoppingBag, ShoppingCart } from "lucide-react";

export const dynamic = "force-dynamic";

const integrations = [
  {
    id: "shopify",
    name: "Shopify",
    description: "Shopify mağazanızı bağlayarak siparişleri, ürünleri ve stok seviyelerini otomatik senkronize edin.",
    icon: ShoppingBag,
    href: "/settings/integrations/shopify",
    features: [
      "Sipariş otomatik içe aktarma",
      "Stok seviyesi senkronizasyonu",
      "Ürün eşleştirme (SKU bazlı)",
      "İade ve iptal yönetimi",
      "Gece uzlaştırma kontrolü",
    ],
  },
  {
    id: "woocommerce",
    name: "WooCommerce",
    description: "WooCommerce sitenizi bağlayarak çift yönlü stok ve sipariş senkronizasyonu sağlayın.",
    icon: ShoppingCart,
    href: "/settings/integrations/woocommerce",
    features: [
      "Sipariş otomatik içe aktarma",
      "Stok seviyesi senkronizasyonu",
      "Ürün eşleştirme (SKU bazlı)",
      "İade stok iadesi",
      "Gece uzlaştırma kontrolü",
    ],
  },
];

export default async function IntegrationsPage() {
  const context = await requireAuth();
  const snapshot = await getAppSnapshot(context);

  const shopifyWebhooks = snapshot.webhookEvents.filter(
    (e) => e.source === "SHOPIFY",
  );
  const wooWebhooks = snapshot.webhookEvents.filter(
    (e) => e.source === "WOOCOMMERCE",
  );

  return (
    <AppShell
      description="E-ticaret platformlarını bağlayın ve senkronizasyonu yönetin."
      organizationName={snapshot.organization.name}
      role={snapshot.role}
      title="Entegrasyonlar"
      userName={snapshot.user.name}
    >
      <div className="grid gap-6">
        <div className="flex items-center justify-between">
          <div />
          <Link
            className="inline-flex items-center gap-2 rounded-md border border-[var(--border-input)] bg-[var(--bg-card)] px-3 py-2 text-sm font-medium text-[var(--text-nav)] transition hover:bg-[var(--bg-hover)]"
            href="/settings/integrations/sync-log"
          >
            <ExternalLink className="size-4" />
            Senkronizasyon Logları
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {integrations.map((integration) => {
            const Icon = integration.icon;
            const webhookCount =
              integration.id === "shopify"
                ? shopifyWebhooks.length
                : wooWebhooks.length;
            const lastEvent =
              integration.id === "shopify"
                ? shopifyWebhooks[0]
                : wooWebhooks[0];

            return (
              <Panel key={integration.id} title={integration.name}>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="rounded-md bg-[var(--accent-info-bg)] p-2 text-[var(--accent-info-text)]">
                      <Icon className="size-5" />
                    </span>
                    <div className="flex-1">
                      <p className="text-sm text-[var(--text-secondary)]">
                        {integration.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <StatusBadge tone={webhookCount > 0 ? "success" : "neutral"}>
                      {webhookCount > 0 ? "Aktif" : "Bağlı değil"}
                    </StatusBadge>
                    {lastEvent && (
                      <span className="text-xs text-[var(--placeholder)]">
                        Son: {new Date(lastEvent.receivedAt).toLocaleString("tr-TR")}
                      </span>
                    )}
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase text-[var(--text-secondary)]">
                      Ozellikler
                    </p>
                    <ul className="space-y-1">
                      {integration.features.map((feature) => (
                        <li
                          className="flex items-center gap-2 text-sm text-[var(--text-nav)]"
                          key={feature}
                        >
                          <span className="size-1.5 rounded-full bg-[var(--accent-secondary)]" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Link
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[var(--accent-primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--accent-primary-hover)]"
                    href={integration.href}
                  >
                    Yapılandır
                  </Link>
                </div>
              </Panel>
            );
          })}
        </div>

        <Panel title="Entegrasyon Guvenilirlik Ozellikleri">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Circuit Breaker",
                description:
                  "Platform API'si cevap vermezse istekler kuyruga alinir, veri kaybi olmaz.",
              },
              {
                title: "Gece Uzlastirma",
                description:
                  "Her gece tam stok karsilastirmasi, uyumsuzluklar otomatik duzeltilir.",
              },
              {
                title: "Schema Dogrulama",
                description:
                  "Bos veya bozuk veriler reddedilir, cop veri olusturulmaz.",
              },
              {
                title: "Otomatik Yeniden Deneme",
                description:
                  "Basarisiz islemler artan bekleme suresiyle otomatik yeniden denenir.",
              },
            ].map((feature) => (
              <div
                className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-empty)] p-3"
                key={feature.title}
              >
                <p className="text-sm font-semibold text-[var(--text-panel-heading)]">
                  {feature.title}
                </p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
