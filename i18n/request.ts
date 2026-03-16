import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale;

  // In case a user requests an unsupported locale, fall back to English.
  const safeLocale = locale === "zh" || locale === "en" ? locale : "en";

  return {
    locale: safeLocale,
    messages: (await import(`../messages/${safeLocale}.json`)).default,
  };
});

