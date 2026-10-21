import { useEffect, useState, type ReactNode } from "react";
import { Collapsible } from "@/components/ui/collapsible";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";

// Matches the CSS rule that turns the Filters toggle icon-only (max-width: 639px)
const PHONE_QUERY = "(max-width: 639px)";

function useIsPhone() {
  const [phone, setPhone] = useState(() => typeof window !== "undefined" && window.matchMedia(PHONE_QUERY).matches);
  useEffect(() => {
    const mql = window.matchMedia(PHONE_QUERY);
    const on = () => setPhone(mql.matches);
    on();
    mql.addEventListener("change", on);
    return () => mql.removeEventListener("change", on);
  }, []);
  return phone;
}

interface ResponsiveFiltersProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Clears every filter back to its default. Shown as "Reset" in the phone sheet. */
  onReset?: () => void;
  className?: string;
  children: ReactNode;
}

/**
 * Filters container. Desktop/tablet: the existing inline collapsible panel.
 * Phones: a bottom sheet over the page, so the table does not jump when filters open.
 */
export function ResponsiveFilters({ open, onOpenChange, onReset, className, children }: ResponsiveFiltersProps) {
  const phone = useIsPhone();
  if (!phone) {
    return <Collapsible open={open} onOpenChange={onOpenChange} className={className}>{children}</Collapsible>;
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85vh] overflow-y-auto rounded-t-2xl p-0 flex flex-col"
        data-testid="sheet-filters"
      >
        <SheetHeader className="px-4 pt-4 pb-2 text-left">
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription className="sr-only">Filter the table</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          <Collapsible open>{children}</Collapsible>
        </div>
        <SheetFooter className="sticky bottom-0 flex-row gap-2 border-t bg-white px-4 py-3">
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="flex-1 rounded-full border border-gray-300 py-2 text-sm font-medium text-gray-700"
              data-testid="button-filters-reset"
            >
              Reset
            </button>
          )}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex-1 rounded-full bg-indigo-600 py-2 text-sm font-semibold text-white"
            data-testid="button-filters-done"
          >
            Show results
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/** Small count pill for the Filters toggle. Renders nothing when no filter is active. */
export function FilterCountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      className="absolute -top-1.5 -right-1.5 min-w-[1.125rem] h-[1.125rem] px-1 rounded-full bg-indigo-600 text-white text-[10px] font-bold leading-[1.125rem] text-center"
      data-testid="badge-filter-count"
    >
      {count}
    </span>
  );
}
