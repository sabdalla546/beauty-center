// src/components/common/CompactHeader.tsx
import React from "react";
import { useTranslation } from "react-i18next";

type SearchProps = {
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
};

type CompactHeaderProps = {
  icon?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  totalText?: React.ReactNode;
  search?: SearchProps;
  right?: React.ReactNode;
  className?: string;
};

const CompactHeader: React.FC<CompactHeaderProps> = ({
  icon,
  title,
  subtitle,
  totalText,
  search,
  right,
  className = "",
}) => {
  const { t } = useTranslation("common");
  return (
    <div
      className={[
        "rounded-xl p-3 sm:p-4 border-l-4 border-primary shadow-lg",
        "bg-gradient-to-r from-card to-card/90",
        "dark:from-card",
        "dark:to-card",
        "dark:border-border",
        className,
      ].join(" ")}
    >
      {/* Top row: left + (desktop right) */}
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-4">
        {/* Left */}
        <div className="flex items-start gap-3 min-w-0">
          {icon ? (
            <div className="shrink-0 flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-primary/10 border border-primary/20 text-primary">
              {icon}
            </div>
          ) : null}

          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-foreground dark:text-foreground break-words">
              {title}
            </h1>

            {subtitle || totalText ? (
              <div className="mt-1 space-y-0.5">
                {subtitle ? (
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground break-words">
                    {subtitle}
                  </p>
                ) : null}

                {totalText ? (
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground break-words">
                    {totalText}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {/* Right (desktop) */}
        {search || right ? (
          <div className="hidden md:flex items-center justify-end gap-2 flex-wrap">
            {search ? (
              <div className="flex items-center gap-2">
                <div className="relative w-full sm:w-56 lg:w-72">
                  <input
                    className="
                      w-full px-3 py-2 pl-9 text-xs rounded-lg 
                      bg-card  border border-border text-foreground 
                      placeholder:text-muted-foreground 
                      focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary
                      dark:bg-muted
                      dark:border-border
                      dark:text-foreground
                      dark:placeholder:text-muted-foreground
                    "
                    placeholder={search.placeholder}
                    value={search.value}
                    onChange={(e) => search.onChange(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && search.onSubmit()}
                  />
                  <svg
                    className="
                      w-4 h-4 text-muted-foreground 
                      absolute left-3 top-1/2 -translate-y-1/2
                      dark:text-muted-foreground
                    "
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>

                <button
                  type="button"
                  onClick={search.onSubmit}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-2 text-xs rounded-md whitespace-nowrap"
                >
                  {t("search") || "Search"}
                </button>
              </div>
            ) : null}

            {right ? (
              <div className="flex items-center gap-2 flex-wrap">{right}</div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Mobile row: search + actions */}
      {search || right ? (
        <div className="mt-3 md:hidden space-y-2">
          {search ? (
            <div className="flex items-center gap-2">
              <div className="relative flex-1 min-w-0">
                <input
                  className="
                    w-full px-3 py-2 pl-9 text-xs rounded-lg 
                    bg-card border border-border text-foreground 
                    placeholder:text-muted-foreground 
                    focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary
                    dark:bg-muted
                    dark:border-border
                    dark:text-foreground
                    dark:placeholder:text-muted-foreground
                  "
                  placeholder={search.placeholder}
                  value={search.value}
                  onChange={(e) => search.onChange(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && search.onSubmit()}
                />
                <svg
                  className="
                    w-4 h-4 text-muted-foreground 
                    absolute left-3 top-1/2 -translate-y-1/2
                    dark:text-muted-foreground
                  "
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>

              <button
                type="button"
                onClick={search.onSubmit}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-2 text-xs rounded-md whitespace-nowrap"
              >
                {t("search") || "Search"}
              </button>
            </div>
          ) : null}

          {right ? (
            <div className="flex items-center gap-2 flex-wrap">{right}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default CompactHeader;
