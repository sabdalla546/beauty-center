import { cn } from "@/lib/utils";

type TrendPoint = {
  label: string;
  value: number;
  formattedValue?: string;
};

type DashboardTrendBarsProps = {
  points: TrendPoint[];
  emptyLabel: string;
  className?: string;
};

const DashboardTrendBars = ({
  points,
  emptyLabel,
  className,
}: DashboardTrendBarsProps) => {
  if (!points.length) {
    return (
      <div
        className={cn(
          "grid min-h-48 place-items-center rounded-2xl border border-dashed border-border bg-muted/20 text-sm text-muted-foreground",
          className,
        )}
      >
        {emptyLabel}
      </div>
    );
  }

  const maxValue = Math.max(...points.map((point) => point.value), 1);

  return (
    <div className={cn("flex h-52 items-end gap-3", className)}>
      {points.map((point) => (
        <div key={point.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
          <div className="flex h-40 w-full items-end">
            <div
              className="w-full rounded-t-2xl bg-gradient-to-t from-primary to-[hsl(var(--brand-2))] transition-all"
              style={{
                height: `${Math.max((point.value / maxValue) * 100, 12)}%`,
              }}
            />
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold text-foreground">
              {point.formattedValue ?? point.value}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">{point.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export type { TrendPoint };
export default DashboardTrendBars;
