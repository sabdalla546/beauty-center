// src/i18n.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import enCommon from "./locales/en/common.json";
import arCommon from "./locales/ar/common.json";

const resources = {
  en: {
    common: enCommon,
  },
  ar: {
    common: arCommon,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    supportedLngs: ["en", "ar"],
    ns: ["common"],
    defaultNS: "common",
    detection: {
      // هنسجّل اللغة في localStorage
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "ewallet_lang",
      caches: ["localStorage"],
    },
    interpolation: {
      escapeValue: false,
    },
  });

// 🔁 تحديث اتجاه الصفحة (RTL/LTR) عند تغيير اللغة
const updateDocumentDirection = (lng: string) => {
  const isRTL = lng === "ar";
  const dir = isRTL ? "rtl" : "ltr";

  document.documentElement.dir = dir;
  document.documentElement.lang = lng;
};

i18n.on("initialized", () => {
  updateDocumentDirection(i18n.language || "en");
});

i18n.on("languageChanged", (lng) => {
  updateDocumentDirection(lng);
  // خزن اللغة المختارة
  window.localStorage.setItem("ewallet_lang", lng);
});

export default i18n;
