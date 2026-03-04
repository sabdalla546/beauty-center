// src/components/ui/searchBar.tsx
import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";

interface SearchBarProps {
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
}

const SearchBar: React.FC<SearchBarProps> = ({
  placeholder,
  value,
  onChange,
  onKeyDown,
  onSubmit,
}) => {
  const { i18n, t } = useTranslation();
  const isArabic = i18n.language === "ar";

  return (
    <div className="flex-1 max-w-md">
      <div className="relative">
        {isArabic ? (
          <>
            {/* RTL - Arabic */}
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder={placeholder}
              value={value}
              onChange={onChange}
              onKeyDown={onKeyDown}
              className="pr-10 pl-12 h-11 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-lg"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-1 top-1/2 transform -translate-y-1/2 h-9 w-9 bg-blue-500 hover:bg-blue-600 rounded-md transition-colors"
              onClick={onSubmit}
              aria-label={t("search")}
            >
              <Search className="w-4 h-4 text-white" />
            </Button>
          </>
        ) : (
          <>
            {/* LTR - English */}
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder={placeholder}
              value={value}
              onChange={onChange}
              onKeyDown={onKeyDown}
              className="pl-10 pr-12 h-11 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-lg"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-9 w-9 bg-blue-500 hover:bg-blue-600 rounded-md transition-colors"
              onClick={onSubmit}
              aria-label={t("search")}
            >
              <Search className="w-4 h-4 text-white" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default SearchBar;