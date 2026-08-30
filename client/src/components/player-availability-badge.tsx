import { Clock, Heart, AlertTriangle, XCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PlayerAvailabilityInfo {
  chanceOfPlayingNextRound?: number | null;
  status?: string;
  news?: string;
}

export function PlayerAvailabilityBadge({ player, compact = false }: { player: PlayerAvailabilityInfo; compact?: boolean }) {
  const chanceOfPlaying = player.chanceOfPlayingNextRound ?? 100;
  const status = player.status || 'a';
  const news = player.news || '';

  if (chanceOfPlaying >= 100 && status === 'a') {
    return null;
  }

  let statusColor = 'text-yellow-600';
  let statusBg = 'bg-yellow-50';
  let statusIcon = Clock;
  let statusText = 'Doubtful';
  let statusBorder = 'border-yellow-200';

  if (status === 's' || status === 'suspended') {
    statusColor = 'text-red-600';
    statusBg = 'bg-red-50';
    statusIcon = XCircle;
    statusText = 'Suspended';
    statusBorder = 'border-red-200';
  } else if (status === 'i' || status === 'injured') {
    statusColor = 'text-red-600';
    statusBg = 'bg-red-50';
    statusIcon = Heart;
    statusText = 'Injured';
    statusBorder = 'border-red-200';
  } else if (status === 'd' || status === 'doubtful') {
    statusColor = 'text-yellow-600';
    statusBg = 'bg-yellow-50';
    statusIcon = AlertTriangle;
    statusText = 'Doubtful';
    statusBorder = 'border-yellow-200';
  } else if (status === 'u' || status === 'unavailable') {
    statusColor = 'text-gray-600';
    statusBg = 'bg-gray-50';
    statusIcon = XCircle;
    statusText = 'Unavailable';
    statusBorder = 'border-gray-200';
  }

  const StatusIcon = statusIcon;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <div className={`inline-flex items-center gap-0.5 rounded font-semibold cursor-help transition-colors hover:opacity-80 ${statusBg} ${statusBorder} border shadow-sm ${compact ? 'px-1 py-px text-[9px] ml-0.5' : 'px-1.5 py-0.5 text-xs gap-1 ml-1'}`}>
            <StatusIcon className={compact ? `h-2.5 w-2.5 ${statusColor}` : `h-3 w-3 ${statusColor}`} />
            <span className={statusColor}>
              {chanceOfPlaying}%
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs p-3 bg-white shadow-xl border border-gray-200 z-50">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <StatusIcon className={`h-4 w-4 ${statusColor}`} />
              <span className="font-semibold text-gray-900">{statusText}</span>
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium">Chance of playing:</span> {chanceOfPlaying}%
            </div>
            {news && (
              <div className="text-sm text-gray-700 border-t pt-2">
                <span className="font-medium">News:</span> {news}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function usePlayerAvailabilityMap(bootstrapData: { elements: any[] } | undefined) {
  if (!bootstrapData?.elements) return null;
  
  const map = new Map<number, PlayerAvailabilityInfo>();
  bootstrapData.elements.forEach(player => {
    map.set(player.id, {
      chanceOfPlayingNextRound: player.chance_of_playing_next_round,
      status: player.status,
      news: player.news
    });
  });
  return map;
}
