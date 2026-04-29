"use client";

import { KeyRound, RefreshCw, Webhook } from "lucide-react";

import { ActionForm, submitClass } from "@/components/action-form";
import { inputClass, selectClass, StatusBadge, subtleButtonClass } from "@/components/ui";
import {
  createWebhookSubscriptionAction,
  refreshExchangeRatesAction,
  updateOrganizationSettingsAction,
  updateWebhookSubscriptionAction,
  upsertCustomFieldAction,
} from "@/lib/actions";
import { SUPPORTED_CURRENCIES } from "@stockops/core/currency";
import { EXTENSION_EVENTS } from "@stockops/core/extensions";
import type {
  CustomFieldValue,
  ExchangeRate,
  ExtensionWebhookSubscription,
  Organization,
  Product,
} from "@stockops/core/types";

type Props = {
  organization: Organization;
  exchangeRates: ExchangeRate[];
  webhookSubscriptions: ExtensionWebhookSubscription[];
  customFields: CustomFieldValue[];
  products: Product[];
};

const localeOptions = [
  { value: "tr", label: "Turkce" },
  { value: "en", label: "English" },
];

export function OrganizationSettingsForm({ organization }: Pick<Props, "organization">) {
  return (
    <ActionForm action={updateOrganizationSettingsAction} resetOnSuccess={false}>
      {(pending) => (
        <>
          <label className="grid gap-1 text-sm">
            <span className="text-[var(--text-secondary)]">Varsayilan para birimi</span>
            <select
              className={selectClass}
              defaultValue={organization.defaultCurrency ?? "TRY"}
              name="defaultCurrency"
            >
              {SUPPORTED_CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-[var(--text-secondary)]">Dil</span>
            <select
              className={selectClass}
              defaultValue={organization.locale ?? "tr"}
              name="locale"
            >
              {localeOptions.map((locale) => (
                <option key={locale.value} value={locale.value}>
                  {locale.label}
                </option>
              ))}
            </select>
          </label>
          <button className={submitClass(pending)} type="submit">
            Kaydet
          </button>
        </>
      )}
    </ActionForm>
  );
}

export function ExchangeRatePanel({ organization, exchangeRates }: Pick<Props, "organization" | "exchangeRates">) {
  return (
    <div className="grid gap-4">
      <ActionForm action={refreshExchangeRatesAction} resetOnSuccess={false}>
        {(pending) => (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="grid gap-1 text-sm">
                <span className="text-[var(--text-secondary)]">Baz</span>
                <select className={selectClass} defaultValue="EUR" name="baseCurrency">
                  {SUPPORTED_CURRENCIES.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-[var(--text-secondary)]">Karsilik</span>
                <select
                  className={selectClass}
                  defaultValue={organization.defaultCurrency ?? "TRY"}
                  name="quoteCurrency"
                >
                  {SUPPORTED_CURRENCIES.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-[var(--text-secondary)]">Kaynak</span>
                <select className={selectClass} defaultValue="ECB" name="provider">
                  <option value="ECB">ECB</option>
                  <option value="TCMB">TCMB</option>
                </select>
              </label>
            </div>
            <button className={submitClass(pending)} type="submit">
              <RefreshCw aria-hidden="true" className="size-4" />
              Kuru guncelle
            </button>
          </>
        )}
      </ActionForm>

      {exchangeRates.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="text-xs uppercase text-[var(--text-secondary)]">
              <tr className="border-b border-[var(--border-subtle)]">
                <th className="py-2 pr-3">Parite</th>
                <th className="py-2 pr-3">Kur</th>
                <th className="py-2 pr-3">Kaynak</th>
                <th className="py-2">Tarih</th>
              </tr>
            </thead>
            <tbody>
              {exchangeRates.map((rate) => (
                <tr className="border-b border-[var(--border-table)] last:border-0" key={`${rate.id}-${rate.baseCurrency}-${rate.quoteCurrency}`}>
                  <td className="py-3 pr-3 font-mono text-xs">
                    {rate.baseCurrency}/{rate.quoteCurrency}
                  </td>
                  <td className="py-3 pr-3 font-medium">{rate.rate.toFixed(6)}</td>
                  <td className="py-3 pr-3">
                    <StatusBadge>{rate.provider}</StatusBadge>
                  </td>
                  <td className="py-3 text-[var(--text-secondary)]">
                    {new Date(rate.observedAt).toLocaleDateString("tr-TR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-[var(--text-secondary)]">
          Henuz kur kaydi yok.
        </p>
      )}
    </div>
  );
}

export function ExtensionApiPanel({
  webhookSubscriptions,
  customFields,
  products,
}: Pick<Props, "webhookSubscriptions" | "customFields" | "products">) {
  return (
    <div className="grid gap-5">
      <ActionForm action={createWebhookSubscriptionAction}>
        {(pending) => (
          <>
            <label className="grid gap-1 text-sm">
              <span className="text-[var(--text-secondary)]">Webhook URL</span>
              <input
                className={inputClass}
                name="url"
                placeholder="https://example.com/stockops/webhook"
                type="url"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-[var(--text-secondary)]">Secret</span>
              <input
                className={inputClass}
                name="secret"
                placeholder="Minimum 12 karakter"
              />
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              {EXTENSION_EVENTS.map((eventName) => (
                <label className="flex items-center gap-2 text-sm" key={eventName}>
                  <input name="events" type="checkbox" value={eventName} />
                  <span className="font-mono text-xs">{eventName}</span>
                </label>
              ))}
            </div>
            <button className={submitClass(pending)} type="submit">
              <Webhook aria-hidden="true" className="size-4" />
              Abonelik olustur
            </button>
          </>
        )}
      </ActionForm>

      {webhookSubscriptions.length > 0 ? (
        <div className="grid gap-2">
          {webhookSubscriptions.map((subscription) => (
            <div
              className="rounded-md border border-[var(--border-subtle)] p-3 text-sm"
              key={subscription.id}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs">{subscription.url}</span>
                <StatusBadge tone={subscription.status === "ACTIVE" ? "success" : "warning"}>
                  {subscription.status}
                </StatusBadge>
              </div>
              <p className="mt-2 text-xs text-[var(--text-secondary)]">
                {subscription.events.join(", ")}
              </p>
              <ActionForm
                action={updateWebhookSubscriptionAction}
                className="mt-3 flex items-center gap-2"
                resetOnSuccess={false}
              >
                {(pending) => (
                  <>
                    <input name="subscriptionId" type="hidden" value={subscription.id} />
                    <input
                      name="status"
                      type="hidden"
                      value={subscription.status === "ACTIVE" ? "PAUSED" : "ACTIVE"}
                    />
                    <button className={subtleButtonClass} disabled={pending} type="submit">
                      {subscription.status === "ACTIVE" ? "Duraklat" : "Aktif et"}
                    </button>
                  </>
                )}
              </ActionForm>
            </div>
          ))}
        </div>
      ) : null}

      <div className="border-t border-[var(--border-subtle)] pt-4">
        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <KeyRound aria-hidden="true" className="size-4" />
          Ozel alan ornegi
        </h4>
        <ActionForm action={upsertCustomFieldAction}>
          {(pending) => (
            <>
              <input name="entityType" type="hidden" value="Product" />
              <label className="grid gap-1 text-sm">
                <span className="text-[var(--text-secondary)]">Urun</span>
                <select className={selectClass} name="entityId">
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.sku} - {product.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-sm">
                  <span className="text-[var(--text-secondary)]">Anahtar</span>
                  <input className={inputClass} name="key" placeholder="warranty.months" />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-[var(--text-secondary)]">Deger</span>
                  <input className={inputClass} name="value" placeholder="24" />
                </label>
              </div>
              <button className={submitClass(pending)} type="submit">
                Ozel alan kaydet
              </button>
            </>
          )}
        </ActionForm>
        {customFields.length > 0 ? (
          <ul className="mt-3 grid gap-1 text-xs text-[var(--text-secondary)]">
            {customFields.slice(0, 6).map((field) => (
              <li key={field.id}>
                <span className="font-mono">{field.entityType}:{field.key}</span>{" "}
                {JSON.stringify(field.value)}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
