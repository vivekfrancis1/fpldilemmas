import { useState } from "react";
import {
  sortPlayersByPosition,
  filterPlayersByType,
} from "@/lib/pitch-utils";
import { Clock, Heart, AlertTriangle, XCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface PitchPlayerFixture {
  opponent: string;
  isHome: boolean;
}

export interface PitchPlayer {
  element: number;
  element_type: number;
  position: number;
  is_captain: boolean;
  is_vice_captain: boolean;
  multiplier?: number;
  player_name?: string;
  web_name?: string;
  team_name?: string;
  team_short_name?: string;
  team_id?: number;
  team_code?: number;
  event_points?: number;
  live_minutes?: number;
  in_dreamteam?: boolean;
  fixture_started?: boolean;
  fixture_finished?: boolean;
  fixture_opponent?: string;
  fixture_is_home?: boolean;
  custom_badge_text?: string;
  custom_badge_color?: string;
  fixtures?: PitchPlayerFixture[];
  points_display?: string;
  status?: string;
  chance_of_playing?: number | null;
  news?: string;
  is_transferred_in?: boolean;
  is_selected?: boolean;
  is_empty_slot?: boolean;
}

export interface PitchFixture {
  gameweek: number;
  opponent: string;
  isHome: boolean;
  difficulty: number;
}

export type DisplayMode = "points" | "team" | "opponent" | "projected";

export interface PitchViewProps {
  players: PitchPlayer[];
  benchPlayers?: PitchPlayer[];
  getNextFixtures?: (teamId: number, count: number) => PitchFixture[];
  showFixtures?: boolean;
  displayMode?: DisplayMode;
  showTeamName?: boolean;
  showOpponent?: boolean;
  isBench?: boolean;
  onPlayerClick?: (player: PitchPlayer) => void;
  renderEmptySlot?: (player: PitchPlayer) => JSX.Element | null;
}

function getJerseyImageUrl(teamCode: number, isGoalkeeper: boolean = false): string {
  const suffix = isGoalkeeper ? '_1' : '';
  return `https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_${teamCode}${suffix}-110.webp`;
}

function getPointsDisplay(player: PitchPlayer): string {
  if (player.points_display !== undefined) {
    return player.points_display;
  }
  if (player.custom_badge_text !== undefined) {
    return player.custom_badge_text;
  }
  if (player.fixture_finished && (player.event_points || 0) === 0) {
    if (player.live_minutes && player.live_minutes > 0) {
      return '0';
    }
    return '-';
  }
  const points = (player.event_points || 0) * (player.is_captain ? 2 : player.multiplier || 1);
  return points.toString();
}

function getFixtureDisplay(player: PitchPlayer): string | null {
  if (player.fixtures && player.fixtures.length > 0) {
    return player.fixtures.map(fx => `${fx.opponent} (${fx.isHome ? 'H' : 'A'})`).join(', ');
  }
  if (player.fixtures && player.fixtures.length === 0) {
    return 'BGW';
  }
  if (player.fixture_opponent) {
    return `${player.fixture_opponent} (${player.fixture_is_home ? 'H' : 'A'})`;
  }
  return null;
}

function isDGW(player: PitchPlayer): boolean {
  return (player.fixtures?.length || 0) > 1;
}

function getAvailabilityInfo(player: PitchPlayer) {
  const chance = player.chance_of_playing ?? 100;
  const status = player.status || 'a';

  if (chance >= 100 && status === 'a') return null;

  let color = 'text-yellow-600';
  let bg = 'bg-yellow-50';
  let icon = Clock;
  let text = 'Doubtful';
  let border = 'border-yellow-200';

  if (status === 's' || status === 'suspended') {
    color = 'text-red-600'; bg = 'bg-red-50'; icon = XCircle; text = 'Suspended'; border = 'border-red-200';
  } else if (status === 'i' || status === 'injured') {
    color = 'text-red-600'; bg = 'bg-red-50'; icon = Heart; text = 'Injured'; border = 'border-red-200';
  } else if (status === 'd' || status === 'doubtful') {
    color = 'text-yellow-600'; bg = 'bg-yellow-50'; icon = AlertTriangle; text = 'Doubtful'; border = 'border-yellow-200';
  } else if (status === 'u' || status === 'unavailable') {
    color = 'text-gray-600'; bg = 'bg-gray-50'; icon = XCircle; text = 'Unavailable'; border = 'border-gray-200';
  }

  return { color, bg, icon, text, border, chance };
}

const FALLBACK_JERSEY_URL = "https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_0-110.webp";

function PlayerCard({ 
  player, 
  isGoalkeeper = false,
  isBench = false,
  showTeamName = false,
  showOpponent = false,
  onClick,
}: { 
  player: PitchPlayer;
  isGoalkeeper?: boolean;
  isBench?: boolean;
  showTeamName?: boolean;
  showOpponent?: boolean;
  onClick?: () => void;
}) {
  const [imgError, setImgError] = useState(0);
  const teamCode = player.team_code || 0;
  
  const getImageSrc = (): string => {
    if (imgError === 2 || teamCode === 0) {
      return FALLBACK_JERSEY_URL;
    }
    if (imgError === 1) {
      return getJerseyImageUrl(teamCode, false);
    }
    return getJerseyImageUrl(teamCode, isGoalkeeper);
  };

  const fixtureText = getFixtureDisplay(player);
  const hasFixture = fixtureText !== null;
  const dgw = isDGW(player);
  const availability = getAvailabilityInfo(player);
  const StatusIcon = availability?.icon;
  
  return (
    <div className={`flex flex-col items-center ${isBench ? 'w-[19.5%]' : 'w-[19%]'} ${isBench ? 'opacity-90' : ''}`}>
      <div className="relative flex flex-col items-center">
        {player.is_captain && (
          <div className="absolute top-1 left-1 z-10 w-4 h-4 sm:w-5 sm:h-5 bg-yellow-400 rounded-full flex items-center justify-center border border-white shadow-md">
            <span className="text-[8px] sm:text-[10px] font-bold text-yellow-800">C</span>
          </div>
        )}
        {player.is_vice_captain && !player.is_captain && (
          <div className="absolute top-1 left-1 z-10 w-4 h-4 sm:w-5 sm:h-5 bg-blue-200 rounded-full flex items-center justify-center border border-white shadow-md">
            <span className="text-[7px] sm:text-[9px] font-bold text-blue-800">VC</span>
          </div>
        )}
        {player.in_dreamteam && !player.is_transferred_in && (
          <div className="absolute top-1 right-1 z-10 w-4 h-4 sm:w-5 sm:h-5 bg-purple-500 rounded-full flex items-center justify-center border border-white shadow-md">
            <span className="text-[8px] sm:text-[10px] text-white">★</span>
          </div>
        )}
        {player.is_transferred_in && (
          <div className="absolute top-1 right-1 z-10 w-4 h-4 sm:w-5 sm:h-5 bg-green-500 rounded-full flex items-center justify-center border border-white shadow-md">
            <span className="text-[8px] sm:text-[10px] font-bold text-white">+</span>
          </div>
        )}
        <div 
          className={`w-18 sm:w-22 md:w-28 bg-white/20 border-2 border-white/40 ${onClick ? 'cursor-pointer hover:bg-white/30 transition-colors' : ''} ${player.is_selected ? 'ring-4 ring-blue-500 ring-offset-2 rounded-lg' : ''}`}
          onClick={onClick}
        >
          <div className="p-1">
            <img 
              src={getImageSrc()}
              alt={`${player.team_short_name || 'Team'} jersey`}
              className="w-full h-16 sm:h-20 md:h-24 object-contain drop-shadow-lg"
              onError={() => {
                if (imgError < 2) setImgError(imgError + 1);
              }}
            />
          </div>
          
          <div className="flex flex-col">
            <div className="w-full px-1 py-0.5 bg-white/95 text-center">
              <div className="text-[9px] sm:text-[11px] md:text-sm font-bold text-gray-900 truncate">
                {player.web_name || player.player_name || 'Unknown'}
              </div>
            </div>
            
            <div className={`w-full px-2 py-0.5 ${isBench ? 'bg-purple-500' : 'bg-purple-600'} text-center`}>
              <div className="text-[9px] sm:text-[11px] md:text-sm font-bold text-white truncate">
                {getPointsDisplay(player)}
              </div>
            </div>

            {hasFixture && (
              <div className={`w-full px-1 py-0.5 ${isBench ? 'bg-gray-600' : 'bg-gray-700'} text-center`}>
                <div className={`${dgw ? 'text-[7px] sm:text-[8px] md:text-[10px]' : 'text-[8px] sm:text-[10px] md:text-xs'} font-semibold text-white/90 truncate`}>
                  {fixtureText}
                </div>
              </div>
            )}
          </div>
        </div>
        {availability && StatusIcon && (
          <div className="flex justify-center mt-1">
            <TooltipProvider>
              <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                  <div className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold cursor-help ${availability.bg} ${availability.border} border shadow-sm`}>
                    <StatusIcon className={`h-2.5 w-2.5 ${availability.color}`} />
                    <span className={availability.color}>{availability.chance}%</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs p-3 bg-white shadow-xl border border-gray-200 z-50">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <StatusIcon className={`h-4 w-4 ${availability.color}`} />
                      <span className="font-semibold text-gray-900">{availability.text}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Chance of playing:</span> {availability.chance}%
                    </div>
                    {player.news && (
                      <div className="text-sm text-gray-700 border-t pt-2">
                        <span className="font-medium">News:</span> {player.news}
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>
    </div>
  );
}

export function PitchView({ 
  players, 
  benchPlayers = [], 
  showTeamName = false,
  showOpponent = false,
  onPlayerClick,
  renderEmptySlot,
}: PitchViewProps) {
  const sortedPlayers = sortPlayersByPosition(players);
  const sortedBench = benchPlayers;

  const renderPlayer = (player: PitchPlayer, isGoalkeeper: boolean = false, isBench: boolean = false) => {
    if (player.is_empty_slot && renderEmptySlot) {
      return renderEmptySlot(player);
    }
    return (
      <PlayerCard 
        key={player.element} 
        player={player}
        isGoalkeeper={isGoalkeeper}
        isBench={isBench}
        showTeamName={showTeamName}
        showOpponent={showOpponent}
        onClick={onPlayerClick ? () => onPlayerClick(player) : undefined}
      />
    );
  };
  
  return (
    <div className="space-y-0 sm:space-y-4 h-full">
      <div className="relative bg-gradient-to-b from-green-600 to-green-700 rounded-lg p-3 sm:p-4 md:p-6 overflow-hidden h-full flex flex-col justify-center">
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute top-1/2 left-0 w-full h-px bg-white"></div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-white"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-white rounded-full"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full"></div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-28 border-2 border-t-0 border-white"></div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-14 border-2 border-t-0 border-white"></div>
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full"></div>
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-20 h-10 border-2 border-b-0 border-l-0 border-r-0 border-white rounded-t-full"></div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-2 border-2 border-white bg-white/10">
            <div className="absolute left-0 top-0 w-1 h-4 bg-white"></div>
            <div className="absolute right-0 top-0 w-1 h-4 bg-white"></div>
          </div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-28 border-2 border-b-0 border-white"></div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-14 border-2 border-b-0 border-white"></div>
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full"></div>
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-20 h-10 border-2 border-t-0 border-l-0 border-r-0 border-white rounded-b-full"></div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-2 border-2 border-white bg-white/10">
            <div className="absolute left-0 bottom-0 w-1 h-4 bg-white"></div>
            <div className="absolute right-0 bottom-0 w-1 h-4 bg-white"></div>
          </div>
          <div className="absolute top-0 left-0 w-4 h-4 border-2 border-t-0 border-l-0 border-white rounded-br-full"></div>
          <div className="absolute top-0 right-0 w-4 h-4 border-2 border-t-0 border-r-0 border-white rounded-bl-full"></div>
          <div className="absolute bottom-0 left-0 w-4 h-4 border-2 border-b-0 border-l-0 border-white rounded-tr-full"></div>
          <div className="absolute bottom-0 right-0 w-4 h-4 border-2 border-b-0 border-r-0 border-white rounded-tl-full"></div>
        </div>

        <div className="relative space-y-4 sm:space-y-6 md:space-y-8">
          {(() => {
            const gks = filterPlayersByType(sortedPlayers, 1);
            return gks.length > 0 && (
              <div className="flex justify-center gap-0.5">
                {gks.map(player => renderPlayer(player, true, false))}
              </div>
            );
          })()}

          {(() => {
            const defs = filterPlayersByType(sortedPlayers, 2);
            return defs.length > 0 && (
              <>
                <div className="w-full border-t border-dotted border-white/30"></div>
                <div className="flex justify-center gap-0.5">
                  {defs.map(player => renderPlayer(player, false, false))}
                </div>
              </>
            );
          })()}

          {(() => {
            const mids = filterPlayersByType(sortedPlayers, 3);
            return mids.length > 0 && (
              <>
                <div className="w-full border-t border-dotted border-white/30"></div>
                <div className="flex justify-center gap-0.5">
                  {mids.map(player => renderPlayer(player, false, false))}
                </div>
              </>
            );
          })()}

          {(() => {
            const fwds = filterPlayersByType(sortedPlayers, 4);
            return fwds.length > 0 && (
              <>
                <div className="w-full border-t border-dotted border-white/30"></div>
                <div className="flex justify-center gap-0.5">
                  {fwds.map(player => renderPlayer(player, false, false))}
                </div>
              </>
            );
          })()}

          {sortedBench.length > 0 && (
            <div className="relative mt-4 sm:mt-6 md:mt-8 pt-4 border-t-2 border-white/30">
              <div className="text-center mb-2">
                <span className="text-white font-bold text-xs sm:text-sm">BENCH</span>
              </div>
              <div className="flex justify-center gap-0.5">
                {sortedBench.map(player => renderPlayer(player, player.element_type === 1, true))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
