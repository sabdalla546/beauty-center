// src/components/common/LanguageSwitcher.tsx
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Globe2 } from "lucide-react";

export const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation("common");

  const current = i18n.language === "ar" ? "ar" : "en";

  const toggleLanguage = () => {
    const next = current === "en" ? "ar" : "en";
    i18n.changeLanguage(next);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="flex items-center gap-1 text-foreground hover:bg-muted"
      onClick={toggleLanguage}
    >
      <Globe2 className="h-4 w-4" />
      <span className="text-xs hidden sm:inline">
        {current === "en" ? t("lang.en") : t("lang.ar")}
      </span>
      <span className="text-xs font-semibold sm:hidden uppercase">
        {current === "en" ? "EN" : "AR"}
      </span>
    </Button>
  );
};
