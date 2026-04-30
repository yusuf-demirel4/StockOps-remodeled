import type { ExchangeRate, ExchangeRateProvider } from "./types";

export const SUPPORTED_CURRENCIES = [
  "TRY",
  "USD",
  "EUR",
  "GBP",
  "CHF",
  "CAD",
  "AUD",
  "JPY",
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export function normalizeCurrency(value: string): SupportedCurrency {
  const upper = value.trim().toUpperCase();
  if (SUPPORTED_CURRENCIES.includes(upper as SupportedCurrency)) {
    return upper as SupportedCurrency;
  }
  throw new Error(`Unsupported currency: ${value}`);
}

export function convertMoney(
  amount: number,
  rate: Pick<ExchangeRate, "baseCurrency" | "quoteCurrency" | "rate">,
) {
  if (!Number.isFinite(amount)) {
    throw new Error("Amount must be finite.");
  }
  if (!Number.isFinite(rate.rate) || rate.rate <= 0) {
    throw new Error("Exchange rate must be positive.");
  }
  return roundMoney(amount * rate.rate);
}

export function roundMoney(amount: number) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function crossRate(
  rates: Array<Pick<ExchangeRate, "baseCurrency" | "quoteCurrency" | "rate">>,
  baseCurrency: string,
  quoteCurrency: string,
) {
  const base = normalizeCurrency(baseCurrency);
  const quote = normalizeCurrency(quoteCurrency);
  if (base === quote) return 1;

  const direct = rates.find(
    (rate) => rate.baseCurrency === base && rate.quoteCurrency === quote,
  );
  if (direct) return direct.rate;

  const inverse = rates.find(
    (rate) => rate.baseCurrency === quote && rate.quoteCurrency === base,
  );
  if (inverse) return 1 / inverse.rate;

  const eurToBase = rates.find(
    (rate) => rate.baseCurrency === "EUR" && rate.quoteCurrency === base,
  );
  const eurToQuote = rates.find(
    (rate) => rate.baseCurrency === "EUR" && rate.quoteCurrency === quote,
  );

  if (eurToBase && eurToQuote) {
    return eurToQuote.rate / eurToBase.rate;
  }

  const tryToBase = rates.find(
    (rate) => rate.baseCurrency === "TRY" && rate.quoteCurrency === base,
  );
  const tryToQuote = rates.find(
    (rate) => rate.baseCurrency === "TRY" && rate.quoteCurrency === quote,
  );

  if (tryToBase && tryToQuote) {
    return tryToQuote.rate / tryToBase.rate;
  }

  throw new Error(`No exchange path for ${base}/${quote}.`);
}

export function parseEcbEuroRates(xml: string, observedAtFallback = new Date()) {
  return parseXmlRates(xml, "ECB", "EUR", /currency=['"]([A-Z]{3})['"]\s+rate=['"]([0-9.]+)['"]/g, observedAtFallback);
}

export function parseTcmbTryRates(xml: string, observedAtFallback = new Date()) {
  const dateMatch = xml.match(/Tarih=["'](\d{2}\.\d{2}\.\d{4})["']/);
  const observedAt = dateMatch
    ? tcmbDateToIso(dateMatch[1])
    : observedAtFallback.toISOString();
  const rates: ExchangeRate[] = [];
  const blockPattern = /<Currency\b[^>]*CurrencyCode=["']([A-Z]{3})["'][^>]*>([\s\S]*?)<\/Currency>/g;

  for (const match of xml.matchAll(blockPattern)) {
    const quoteCurrency = safeCurrency(match[1]);
    if (!quoteCurrency) continue;
    const block = match[2];
    const forexSelling = block.match(/<ForexSelling>([^<]+)<\/ForexSelling>/)?.[1];
    const unitText = block.match(/<Unit>([^<]+)<\/Unit>/)?.[1] ?? "1";
    const value = Number(forexSelling);
    const unit = Number(unitText);

    if (Number.isFinite(value) && value > 0 && Number.isFinite(unit) && unit > 0) {
      rates.push({
        baseCurrency: quoteCurrency,
        quoteCurrency: "TRY",
        rate: value / unit,
        provider: "TCMB",
        observedAt,
      });
    }
  }

  return rates;
}

function parseXmlRates(
  xml: string,
  provider: ExchangeRateProvider,
  baseCurrency: SupportedCurrency,
  pattern: RegExp,
  observedAtFallback: Date,
) {
  const dateMatch = xml.match(/time=['"](\d{4}-\d{2}-\d{2})['"]/);
  const observedAt = dateMatch
    ? new Date(`${dateMatch[1]}T00:00:00.000Z`).toISOString()
    : observedAtFallback.toISOString();
  const rates: ExchangeRate[] = [
    {
      baseCurrency,
      quoteCurrency: baseCurrency,
      rate: 1,
      provider,
      observedAt,
    },
  ];

  for (const match of xml.matchAll(pattern)) {
    const quoteCurrency = safeCurrency(match[1]);
    if (!quoteCurrency) continue;
    rates.push({
      baseCurrency,
      quoteCurrency,
      rate: Number(match[2]),
      provider,
      observedAt,
    });
  }

  return rates.filter((rate) => Number.isFinite(rate.rate) && rate.rate > 0);
}

function tcmbDateToIso(value: string) {
  const [day, month, year] = value.split(".");
  return new Date(`${year}-${month}-${day}T00:00:00.000Z`).toISOString();
}

function safeCurrency(value: string) {
  try {
    return normalizeCurrency(value);
  } catch {
    return null;
  }
}
