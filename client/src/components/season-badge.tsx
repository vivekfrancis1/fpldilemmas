import { CURRENT_SEASON } from "@shared/schema";

/** Small pill showing the season a projection page's data applies to (e.g. "2026/27"). */
export function SeasonBadge({ season = CURRENT_SEASON }: { season?: string }) {
  return (
    <span className="ml-2 inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground align-middle whitespace-nowrap">
      {season}
    </span>
  );
}
