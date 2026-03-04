import { Wallet } from "lucide-react";

type LoaderProps = {
  label?: string;
};

const Loader = ({ label = "Loading..." }: LoaderProps) => (
  <div className="min-h-screen flex items-center justify-center text-foreground">
    <div className="flex flex-col items-center gap-3" aria-live="polite">
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Wallet className="h-5 w-5 text-primary" />
        </div>
      </div>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  </div>
);

export default Loader;
