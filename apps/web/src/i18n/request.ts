import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

const locales = ["tr", "en"] as const;
type Locale = (typeof locales)[number];

function resolveLocale(value: string | undefined): Locale {
  return locales.includes(value as Locale) ? (value as Locale) : "tr";
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get("stockops_locale")?.value);

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
