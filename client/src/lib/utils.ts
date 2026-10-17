import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Default open/closed state for a "Filters" collapsible: collapsed on every screen size, so a page's
// data (not its filter chips) is what's on screen without scrolling. Read once at mount via a lazy
// useState initializer — not reactive to resizing after that.
export function getDefaultFiltersOpen(): boolean {
  // Collapsed on every screen size so the data (not the filters) is what you see without scrolling.
  return false;
}
