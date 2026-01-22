// Shared pitch view component for FPL team visualization with real jersey images
import { useState } from "react";
import {
  sortPlayersByPosition,
  filterPlayersByType,
} from "@/lib/pitch-utils";

// Types
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
  team_code?: number; // Required for jersey images
  event_points?: number;
  live_minutes?: number;
  in_dreamteam?: boolean;
  fixture_started?: boolean;
  fixture_finished?: boolean;
  fixture_opponent?: string;
  fixture_is_home?: boolean;
  custom_badge_text?: string; // For custom display (e.g., projected points)
  custom_badge_color?: string; // Badge background color
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
}

// Get jersey image URL from FPL API
function getJerseyImageUrl(teamCode: number, isGoalkeeper: boolean = false): string {
  const suffix = isGoalkeeper ? '_1' : '';
  return `https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_${teamCode}${suffix}-110.webp`;
}

// Helper function to get display text for points/fixture
function getPointsDisplay(player: PitchPlayer): string {
  if (player.custom_badge_text !== undefined) {
    return player.custom_badge_text;
  }
  if (!player.fixture_started && player.fixture_opponent) {
    return `${player.fixture_opponent} (${player.fixture_is_home ? 'H' : 'A'})`;
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

// Get badge color based on content or custom color
function getBadgeColor(player: PitchPlayer, isBench: boolean): string {
  if (player.custom_badge_color) {
    return player.custom_badge_color;
  }
  if (!player.fixture_started && player.fixture_opponent) {
    return isBench ? 'bg-gray-500' : 'bg-purple-600';
  }
  return isBench ? 'bg-gray-500' : 'bg-green-600';
}

// Default jersey placeholder (fallback when no team_code or image fails)
const FALLBACK_JERSEY_URL = "https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_0-110.webp";

// Single player card component for consistency
function PlayerCard({ 
  player, 
  isGoalkeeper = false,
  isBench = false,
  showTeamName = false,
  showOpponent = false,
}: { 
  player: PitchPlayer;
  isGoalkeeper?: boolean;
  isBench?: boolean;
  showTeamName?: boolean;
  showOpponent?: boolean;
}) {
  const [imgError, setImgError] = useState(0); // 0: initial, 1: first error (try non-GK), 2: all failed (use fallback)
  const teamCode = player.team_code || 0;
  
  const getImageSrc = (): string => {
    if (imgError === 2 || teamCode === 0) {
      return FALLBACK_JERSEY_URL;
    }
    if (imgError === 1) {
      return getJerseyImageUrl(teamCode, false); // Try non-GK version
    }
    return getJerseyImageUrl(teamCode, isGoalkeeper);
  };
  
  return (
    <div className={`flex flex-col items-center ${isBench ? 'w-[19.5%]' : 'w-[19%]'} ${isBench ? 'opacity-90' : ''}`}>
      <div className="relative flex flex-col items-center">
        {/* Jersey Image */}
        <div className="relative">
          <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-white/20 rounded-lg border-2 border-white/40 flex items-center justify-center p-1">
            <img 
              src={getImageSrc()}
              alt={`${player.team_short_name || 'Team'} jersey`}
              className="w-full h-full object-contain drop-shadow-lg"
              onError={() => {
                if (imgError < 2) setImgError(imgError + 1);
              }}
            />
          </div>
          {/* Captain Badge */}
          {player.is_captain && (
            <div className="absolute -top-1 -left-1 w-4 h-4 sm:w-5 sm:h-5 bg-yellow-400 rounded-full flex items-center justify-center border border-white shadow-sm">
              <span className="text-[8px] sm:text-[10px] font-bold text-yellow-800">C</span>
            </div>
          )}
          {/* Vice Captain Badge */}
          {player.is_vice_captain && !player.is_captain && (
            <div className="absolute -top-1 -left-1 w-5 h-5 sm:w-6 sm:h-6 bg-blue-200 rounded-full flex items-center justify-center border border-white shadow-sm">
              <span className="text-[7px] sm:text-[9px] font-bold text-blue-800">VC</span>
            </div>
          )}
          {/* Dream Team Star */}
          {player.in_dreamteam && (
            <div className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-purple-500 rounded-full flex items-center justify-center border border-white shadow-sm">
              <span className="text-[8px] text-white">★</span>
            </div>
          )}
        </div>
        
        {/* Team Name (optional) */}
        {showTeamName && (
          <div className="mt-0.5 px-1 py-0.5 bg-white/90 rounded text-center max-w-full">
            <div className="text-[8px] sm:text-[10px] md:text-xs font-semibold text-gray-800 truncate max-w-[60px] sm:max-w-[80px]">
              {player.team_short_name || 'UNK'}
            </div>
          </div>
        )}
        
        {/* Player Name */}
        <div className={`${showTeamName ? '' : 'mt-0.5'} px-1 py-0.5 bg-white/90 rounded text-center max-w-full`}>
          <div className="text-[8px] sm:text-[10px] md:text-xs font-semibold text-gray-800 truncate max-w-[60px] sm:max-w-[80px]">
            {player.web_name || player.player_name || 'Unknown'}
          </div>
        </div>
        
        {/* Points/Opponent Badge */}
        <div className={`px-2 py-0.5 ${getBadgeColor(player, isBench)} rounded text-center`}>
          <div className="text-[7px] sm:text-[9px] md:text-xs font-bold text-white">
            {showOpponent && player.fixture_opponent 
              ? `${player.fixture_opponent} (${player.fixture_is_home ? 'H' : 'A'})`
              : getPointsDisplay(player)
            }
          </div>
        </div>
      </div>
    </div>
  );
}

export function PitchView({ 
  players, 
  benchPlayers = [], 
  showTeamName = false,
  showOpponent = false,
}: PitchViewProps) {
  const sortedPlayers = sortPlayersByPosition(players);
  const sortedBench = sortPlayersByPosition(benchPlayers);
  
  return (
    <div className="space-y-0 sm:space-y-4 h-full">
      {/* Pitch */}
      <div className="relative bg-gradient-to-b from-green-600 to-green-700 rounded-lg p-3 sm:p-4 md:p-6 overflow-hidden h-full flex flex-col justify-center">
        {/* Pitch Lines and Graphics */}
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
          {/* Goalkeepers */}
          {(() => {
            const gks = filterPlayersByType(sortedPlayers, 1);
            return gks.length > 0 && (
              <div className="flex justify-center gap-0.5">
                {gks.map(player => (
                  <PlayerCard 
                    key={player.element} 
                    player={player} 
                    isGoalkeeper={true}
                    showTeamName={showTeamName}
                    showOpponent={showOpponent}
                  />
                ))}
              </div>
            );
          })()}

          {/* Defenders */}
          {(() => {
            const defs = filterPlayersByType(sortedPlayers, 2);
            return defs.length > 0 && (
              <>
                <div className="w-full border-t border-dotted border-white/30"></div>
                <div className="flex justify-center gap-0.5">
                  {defs.map(player => (
                    <PlayerCard 
                      key={player.element} 
                      player={player}
                      showTeamName={showTeamName}
                      showOpponent={showOpponent}
                    />
                  ))}
                </div>
              </>
            );
          })()}

          {/* Midfielders */}
          {(() => {
            const mids = filterPlayersByType(sortedPlayers, 3);
            return mids.length > 0 && (
              <>
                <div className="w-full border-t border-dotted border-white/30"></div>
                <div className="flex justify-center gap-0.5">
                  {mids.map(player => (
                    <PlayerCard 
                      key={player.element} 
                      player={player}
                      showTeamName={showTeamName}
                      showOpponent={showOpponent}
                    />
                  ))}
                </div>
              </>
            );
          })()}

          {/* Forwards */}
          {(() => {
            const fwds = filterPlayersByType(sortedPlayers, 4);
            return fwds.length > 0 && (
              <>
                <div className="w-full border-t border-dotted border-white/30"></div>
                <div className="flex justify-center gap-0.5">
                  {fwds.map(player => (
                    <PlayerCard 
                      key={player.element} 
                      player={player}
                      showTeamName={showTeamName}
                      showOpponent={showOpponent}
                    />
                  ))}
                </div>
              </>
            );
          })()}

          {/* Bench Section */}
          {sortedBench.length > 0 && (
            <div className="relative mt-4 sm:mt-6 md:mt-8 pt-4 border-t-2 border-white/30">
              <div className="text-center mb-2">
                <span className="text-white font-bold text-xs sm:text-sm">BENCH</span>
              </div>
              <div className="flex justify-center gap-0.5">
                {sortedBench.map(player => (
                  <PlayerCard 
                    key={player.element} 
                    player={player}
                    isGoalkeeper={player.element_type === 1}
                    isBench={true}
                    showTeamName={showTeamName}
                    showOpponent={showOpponent}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
