import { Info } from "lucide-react";

/** Small disclaimer shown under player projection page headers. For the next few gameweeks
 * (where Copilot's expected-minutes forecast exists) projections are expected points that already
 * include rotation and injury risk; later gameweeks assume the player starts. */
export function ProjectionDisclaimer() {
  return (
    <p className="flex items-center gap-1 text-xs text-gray-500 mt-1">
      <Info className="h-3 w-3 flex-shrink-0" />
      Near-term gameweeks use each player's expected minutes (rotation and injury risk included); later ones assume the player starts.
    </p>
  );
}
