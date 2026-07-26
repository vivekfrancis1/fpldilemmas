import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CURRENT_SEASON } from "@shared/schema";

// Only one season back is currently archived/selectable. Extend this list once further-back
// seasons become available as a "history" option.
export const PREVIOUS_SEASON = "2025/26";
export const HISTORY_SEASON_OPTIONS = [CURRENT_SEASON, PREVIOUS_SEASON];

/** Season picker for "history"/"past" views — value is null until the backend's own default resolves. */
export function SeasonSelector({ value, onChange }: { value: string | null; onChange: (season: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 font-medium">Season:</span>
      <Select value={value ?? PREVIOUS_SEASON} onValueChange={onChange}>
        <SelectTrigger className="w-28 h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {HISTORY_SEASON_OPTIONS.map((s) => (
            <SelectItem key={s} value={s}>{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
