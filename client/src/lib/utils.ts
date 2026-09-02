import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Default open/closed state for a "Filters" collapsible: open on desktop (>= Tailwind's sm
// breakpoint, 640px) since there's room to show it, collapsed on mobile to save vertical space.
// Read once at mount via a lazy useState initializer — not reactive to resizing after that.
export function getDefaultFiltersOpen(): boolean {
  return typeof window !== 'undefined' ? window.innerWidth >= 640 : true;
}
