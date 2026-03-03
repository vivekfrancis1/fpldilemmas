import { useQuery } from "@tanstack/react-query";
import { PROJECTION_DEFAULT_WEEKS, PROJECTION_TOTAL_WEEKS } from "@shared/gameweek-utils";

interface ProjectionWindowSettings {
  defaultWeeks: number;
  totalWeeks: number;
  lastUpdated: string | null;
  updatedBy: string | null;
  defaults: { defaultWeeks: number; totalWeeks: number };
}

export function useProjectionSettings() {
  const { data } = useQuery<ProjectionWindowSettings>({
    queryKey: ["/api/admin/projection-window-settings"],
    staleTime: 5 * 60 * 1000,
  });
  return {
    defaultWeeks: data?.defaultWeeks ?? PROJECTION_DEFAULT_WEEKS,
    totalWeeks: data?.totalWeeks ?? PROJECTION_TOTAL_WEEKS,
  };
}
