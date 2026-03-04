// src/utils/i18n.ts
import i18next from "i18next";
import Backend from "i18next-fs-backend";
import middleware from "i18next-http-middleware";
import path from "path";

const DEFAULT_LANG = process.env.DEFAULT_LANG || "en";
const LOCALES_PATH =
  process.env.I18N_PATH || path.join(process.cwd(), "locales");

i18next
  .use(Backend)
  .use(middleware.LanguageDetector)
  .init({
    fallbackLng: DEFAULT_LANG,
    preload: ["en", "ar"], // preload languages you support
    backend: {
      loadPath: path.join(LOCALES_PATH, "{{lng}}/{{ns}}.json"),
    },
    detection: {
      // order and from where user language should be detected
      order: ["header", "querystring", "cookie"],
      caches: false,
      lookupHeader: "accept-language",
      lookupQuerystring: "lang",
    },
    ns: ["translation"],
    defaultNS: "translation",
    returnObjects: true,
    debug: process.env.NODE_ENV !== "production",
  });

export { i18next, middleware as i18nextMiddleware };
