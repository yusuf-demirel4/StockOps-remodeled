import { describe, expect, it } from "vitest";
import {
  convertMoney,
  crossRate,
  parseEcbEuroRates,
  parseTcmbTryRates,
} from "./currency";

describe("currency utilities", () => {
  it("parses ECB EUR-based XML rates and skips unsupported currencies", () => {
    const xml = `
      <Cube time="2026-04-29">
        <Cube currency="USD" rate="1.1706"/>
        <Cube currency="TRY" rate="52.7585"/>
        <Cube currency="NOK" rate="10.8620"/>
      </Cube>
    `;

    const rates = parseEcbEuroRates(xml);

    expect(rates).toContainEqual(
      expect.objectContaining({
        baseCurrency: "EUR",
        quoteCurrency: "USD",
        rate: 1.1706,
        provider: "ECB",
      }),
    );
    expect(rates.some((rate) => rate.quoteCurrency === "NOK")).toBe(false);
  });

  it("parses TCMB TRY rates using unit-adjusted forex selling values", () => {
    const xml = `
      <Tarih_Date Tarih="29.04.2026">
        <Currency CurrencyCode="USD">
          <Unit>1</Unit>
          <ForexSelling>39.9000</ForexSelling>
        </Currency>
        <Currency CurrencyCode="JPY">
          <Unit>100</Unit>
          <ForexSelling>27.1000</ForexSelling>
        </Currency>
      </Tarih_Date>
    `;

    const rates = parseTcmbTryRates(xml);

    expect(rates).toContainEqual(
      expect.objectContaining({
        baseCurrency: "USD",
        quoteCurrency: "TRY",
        rate: 39.9,
        provider: "TCMB",
      }),
    );
    expect(rates).toContainEqual(
      expect.objectContaining({
        baseCurrency: "JPY",
        quoteCurrency: "TRY",
        rate: 0.271,
      }),
    );
  });

  it("converts money and calculates cross rates", () => {
    const rates = [
      { baseCurrency: "EUR", quoteCurrency: "USD", rate: 1.2 },
      { baseCurrency: "EUR", quoteCurrency: "TRY", rate: 48 },
    ];

    expect(crossRate(rates, "USD", "TRY")).toBe(40);
    expect(
      convertMoney(12.345, {
        baseCurrency: "USD",
        quoteCurrency: "TRY",
        rate: 40,
      }),
    ).toBe(493.8);
  });
});
