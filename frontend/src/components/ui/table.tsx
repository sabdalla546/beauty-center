// components/ui/table.tsx (Updated with RTL support)
import * as React from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

function Table({ className, ...props }: React.ComponentProps<"table">) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto border-border"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <table
        data-slot="table"
        className={cn(
          "w-full caption-bottom text-sm divide-y divide-border",
          className
        )}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  return (
    <thead
      data-slot="table-header"
      className={cn(" [&_tr]:border-b ", className)}
      dir={isRTL ? "rtl" : "ltr"}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0  ", className)}
      dir={isRTL ? "rtl" : "ltr"}
      {...props}
    />
  );
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "bg-muted/30 border-t border-border font-medium [&>tr]:last:border-b-0",
        className
      )}
      dir={isRTL ? "rtl" : "ltr"}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "hover:bg-muted/40 border-b border-border transition-colors duration-200 ease-in-out",
        className
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-12 px-6 align-middle font-semibold text-foreground uppercase tracking-wider [&:has([role=checkbox])]:pr-0",
        isRTL ? "text-right" : "text-left",
        className
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  return (
    <td
      data-slot="table-cell"
      className={cn(
        "px-1 py-4 align-middle border-1 text-foreground [&:has([role=checkbox])]:pr-0",
        isRTL ? "text-right" : "text-left",
        className
      )}
      {...props}
    />
  );
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  return (
    <caption
      data-slot="table-caption"
      className={cn(
        "mt-4 text-sm text-muted-foreground",
        isRTL ? "text-right" : "text-left",
        className
      )}
      dir={isRTL ? "rtl" : "ltr"}
      {...props}
    />
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
