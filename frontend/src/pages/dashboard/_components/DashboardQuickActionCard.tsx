import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { Card } from "@/components/ui/card";

type DashboardQuickActionCardProps = {
  title: string;
  description: string;
  to: string;
  icon: LucideIcon;
  direction: "ltr" | "rtl";
};

const DashboardQuickActionCard = ({
  title,
  description,
  to,
  icon: Icon,
  direction,
}: DashboardQuickActionCardProps) => (
  <Link to={to} className="block h-full">
    <Card className="group h-full border-border/70 bg-card/90 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
      <div className="flex h-full items-start gap-3 p-4">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {description}
          </p>
          <div className="mt-3 flex items-center gap-1 text-xs font-medium text-primary">
            <span>{title}</span>
            {direction === "rtl" ? (
              <ArrowLeft className="h-3.5 w-3.5" />
            ) : (
              <ArrowRight className="h-3.5 w-3.5" />
            )}
          </div>
        </div>
      </div>
    </Card>
  </Link>
);

export default DashboardQuickActionCard;
