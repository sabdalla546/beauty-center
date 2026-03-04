import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  SearchIcon,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Enhanced SearchableSelect component
interface SearchableSelectProps
  extends React.ComponentProps<typeof SelectPrimitive.Root> {
  placeholder?: string;
  searchPlaceholder?: string;
  onSearch?: (searchTerm: string) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
  triggerClassName?: string;
  size?: "sm" | "default";
  allowClear?: boolean;
  onClear?: () => void;
}

function SearchableSelect({
  searchPlaceholder = "Search...",
  onSearch,
  isLoading = false,
  emptyMessage = "No results found",
  className,
  triggerClassName,
  size = "default",
  allowClear = false,
  onClear,
  children,
  ...props
}: SearchableSelectProps) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [, setIsOpen] = React.useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    onSearch?.(value);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      // Focus search input when dropdown opens
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 0);
    } else {
      // Clear search when dropdown closes
      setSearchTerm("");
      onSearch?.("");
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClear?.();
  };

  return (
    <SelectPrimitive.Root {...props} onOpenChange={handleOpenChange}>
      <SearchableSelectTrigger
        className={triggerClassName}
        size={size}
        allowClear={allowClear}
        onClear={handleClear}
        hasValue={Boolean(props.value)}
      >
        <SelectPrimitive.Value />
      </SearchableSelectTrigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className={cn(
            "bg-popover text-foreground relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-lg border border-border shadow-lg",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
            className
          )}
          position="popper"
          sideOffset={4}
        >
          <SelectScrollUpButton />

          {/* Search Input */}
          <div className="sticky top-0 z-10 bg-popover border-b border-border p-3">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                onKeyDown={(e) => {
                  // Prevent select from closing when typing
                  e.stopPropagation();
                }}
              />
              {isLoading && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              )}
            </div>
          </div>

          <SelectPrimitive.Viewport className="p-1 max-h-64 overflow-y-auto">
            {React.Children.count(children) === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                {emptyMessage}
              </div>
            ) : (
              children
            )}
          </SelectPrimitive.Viewport>

          <SelectScrollDownButton />
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

// Enhanced Trigger with modern styling and clear button
interface SearchableSelectTriggerProps
  extends React.ComponentProps<typeof SelectPrimitive.Trigger> {
  size?: "sm" | "default";
  allowClear?: boolean;
  onClear?: (e: React.MouseEvent) => void;
  hasValue?: boolean;
}

function SearchableSelectTrigger({
  className,
  size = "default",
  allowClear = false,
  onClear,
  hasValue = false,
  children,
  ...props
}: SearchableSelectTriggerProps) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        // Base styles
        "flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground",
        "transition-all duration-200 outline-none",

        // Border and focus states
        "hover:border-primary/60",
        "focus:border-primary focus:ring-2 focus:ring-primary/20",
        "data-[state=open]:border-primary data-[state=open]:ring-2 data-[state=open]:ring-primary/20",

        // Disabled state
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/40",

        // Placeholder styling
        "data-[placeholder]:text-muted-foreground",

        // Size variants
        {
          "h-9": size === "default",
          "h-8 text-xs": size === "sm",
        },

        className
      )}
      {...props}
    >
      <div className="flex-1 text-left truncate">{children}</div>

      <div className="flex items-center gap-1">
        {allowClear && hasValue && (
          <button
            type="button"
            onClick={onClear}
            className="p-0.5 hover:bg-muted rounded-sm transition-colors"
            tabIndex={-1}
          >
            <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
          </button>
        )}
        <SelectPrimitive.Icon asChild>
          <ChevronDownIcon className="h-4 w-4 text-muted-foreground transition-transform data-[state=open]:rotate-180" />
        </SelectPrimitive.Icon>
      </div>
    </SelectPrimitive.Trigger>
  );
}

// Enhanced SelectItem with modern styling
function SearchableSelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        "relative flex w-full cursor-pointer items-center gap-3 rounded-md py-2.5 px-3 text-sm",
        "text-foreground hover:bg-muted/50 focus:bg-accent focus:text-accent-foreground focus:outline-none",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        "transition-colors duration-150",
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemText className="flex-1 truncate">
        {children}
      </SelectPrimitive.ItemText>

    <SelectPrimitive.ItemIndicator className="flex items-center justify-center">
        <CheckIcon className="h-4 w-4 text-primary" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

// Scroll buttons with modern styling
function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      className={cn(
        "flex cursor-default items-center justify-center py-1 bg-popover border-b border-border",
        className
      )}
      {...props}
    >
      <ChevronUpIcon className="h-4 w-4 text-muted-foreground" />
    </SelectPrimitive.ScrollUpButton>
  );
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      className={cn(
        "flex cursor-default items-center justify-center py-1 bg-popover border-t border-border",
        className
      )}
      {...props}
    >
      <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
    </SelectPrimitive.ScrollDownButton>
  );
}

// Loading skeleton for items
function SearchableSelectSkeleton({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-md py-2.5 px-3 animate-pulse"
        >
          <div className="h-4 bg-muted/60 rounded flex-1" />
        </div>
      ))}
    </>
  );
}

// Empty state component
function SearchableSelectEmpty({
  message = "No results found",
}: {
  message?: string;
}) {
  return (
    <div className="text-center py-8 text-sm text-muted-foreground">
      <SearchIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
      <p>{message}</p>
    </div>
  );
}

export {
  SearchableSelect,
  SearchableSelectTrigger,
  SearchableSelectItem,
  SearchableSelectSkeleton,
  SearchableSelectEmpty,
  SelectScrollUpButton,
  SelectScrollDownButton,
};
