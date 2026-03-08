import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type DashboardKpiCardProps = {
  title: string;
  value: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  icon: LucideIcon;
  to?: string;
  loading?: boolean;
  accentClass?: string;
  direction: "ltr" | "rtl";
};

const DashboardKpiCard = ({
  title,
  value,
  description,
  meta,
  icon: Icon,
  to,
  loading,
  accentClass,
  direction,
}: DashboardKpiCardProps) => {
  const content = (
    <Card
      className={cn(
        "group relative h-full overflow-hidden border-border/70 bg-card/95 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
        accentClass,
      )}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-[hsl(var(--brand-2))] to-[hsl(var(--brand-3))]" />
      <div className="p-5">
        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="h-4 w-28 rounded bg-muted" />
                <div className="h-9 w-24 rounded bg-muted" />
              </div>
              <div className="h-10 w-10 rounded-2xl bg-muted" />
            </div>
            <div className="h-4 w-40 rounded bg-muted" />
            <div className="h-3 w-24 rounded bg-muted" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">{title}</p>
                <div className="text-3xl font-semibold tracking-tight text-foreground">
                  {value}
                </div>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
            </div>

            {description ? (
              <p className="text-sm text-muted-foreground">{description}</p>
            ) : (
              <div className="h-[20px]" />
            )}

            {meta ? (
              <div className="flex items-center justify-between gap-3 text-xs font-medium text-muted-foreground">
                <span>{meta}</span>
                {to ? (
                  direction === "rtl" ? (
                    <ArrowLeft className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowRight className="h-3.5 w-3.5" />
                  )
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </Card>
  );

  if (!to || loading) return content;

  return (
    <Link to={to} className="block h-full">
      {content}
    </Link>
  );
};

export default DashboardKpiCard;
