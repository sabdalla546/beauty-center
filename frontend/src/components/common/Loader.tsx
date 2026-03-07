import { Sparkles } from "lucide-react";

type LoaderProps = {
  label?: string;
};

const Loader = ({ label = "Preparing your beauty experience..." }: LoaderProps) => (
  <div className="min-h-screen grid place-items-center overflow-hidden bg-[radial-gradient(1000px_circle_at_10%_10%,hsl(var(--primary)/0.14),transparent_45%),radial-gradient(900px_circle_at_90%_90%,hsl(var(--brand-2)/0.12),transparent_45%),hsl(var(--background))] px-4 text-foreground">
    <div
      className="relative flex w-full max-w-sm flex-col items-center gap-5 rounded-3xl border border-primary/20 bg-card/80 px-8 py-10 shadow-xl backdrop-blur-md"
      aria-live="polite"
    >
      <div className="pointer-events-none absolute -left-10 top-5 h-24 w-24 rounded-full bg-primary/15 blur-2xl" />
      <div className="pointer-events-none absolute -right-10 bottom-6 h-24 w-24 rounded-full bg-[hsl(var(--brand-2)/0.18)] blur-2xl" />

      <div className="relative grid h-24 w-24 place-items-center">
        <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
        <div className="absolute inset-[3px] rounded-full border-[3px] border-transparent border-t-primary border-r-[hsl(var(--brand-2))] animate-spin" />
        <div className="absolute inset-[15px] rounded-full border-[2px] border-transparent border-b-primary/60 border-l-[hsl(var(--brand-2)/0.7)] animate-[spin_2s_linear_infinite_reverse]" />
        <div className="relative grid h-11 w-11 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
          <Sparkles className="h-5 w-5 animate-pulse" />
        </div>
      </div>

      <div className="text-center">
        <p className="text-[11px] uppercase tracking-[0.24em] text-primary/80">
          Beauty Center
        </p>
        <p className="mt-2 text-sm font-medium text-muted-foreground">{label}</p>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.2s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-primary/80 animate-bounce [animation-delay:-0.1s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce" />
      </div>
    </div>
  </div>
);

export default Loader;
