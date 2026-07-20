import { Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SeasonEndedNoticeProps {
  /** Switches the page to its past/history tab. Omit to hide the button (e.g. pages with no history view). */
  onViewPast?: () => void;
  /** Label for the history tab this page exposes, e.g. "Points History". */
  pastLabel?: string;
}

export function SeasonEndedNotice({ onViewPast, pastLabel = "Past Data" }: SeasonEndedNoticeProps) {
  return (
    <div className="min-h-[50vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-fpl-purple/10">
            <Calendar className="h-6 w-6 text-fpl-purple" />
          </div>
          <CardTitle className="text-lg">2025-26 Season Complete</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-gray-600">
            Gameweek 38 has finished and the 2025-26 season is over. New projections will be
            available once the 2026-27 season's fixtures and FPL rules are announced.
          </p>
          {onViewPast && (
            <Button onClick={onViewPast} variant="outline" className="w-full">
              View {pastLabel} for 2025-26
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
