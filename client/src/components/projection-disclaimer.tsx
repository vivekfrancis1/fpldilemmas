import { Info } from "lucide-react";

/** Small disclaimer shown under player projection page headers — every projection figure
 * assumes the player starts the match, since projections don't model rotation/bench risk. */
export function ProjectionDisclaimer() {
  return (
    <p className="flex items-center gap-1 text-xs text-gray-500 mt-1">
      <Info className="h-3 w-3 flex-shrink-0" />
      Projections assume the player starts the match.
    </p>
  );
}
