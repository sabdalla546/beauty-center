import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type DashboardPanelProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

const DashboardPanel = ({
  title,
  subtitle,
  action,
  children,
  className,
  contentClassName,
}: DashboardPanelProps) => (
  <Card
    className={cn(
      "border-border/70 bg-card/95 shadow-sm backdrop-blur-sm",
      className,
    )}
  >
    <div className={cn("space-y-4 p-5", contentClassName)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {subtitle ? (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>

        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      {children}
    </div>
  </Card>
);

export default DashboardPanel;
