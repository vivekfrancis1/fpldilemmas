// Shared pitch view component for FPL team visualization
import { Star } from "lucide-react";
import {
  getTeamJerseyColor,
  getTextColor,
  getDifficultyColor,
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
  event_points?: number;
  in_dreamteam?: boolean;
}

export interface PitchFixture {
  gameweek: number;
  opponent: string;
  isHome: boolean;
  difficulty: number;
}

export interface PitchViewProps {
  players: PitchPlayer[];
  getNextFixtures?: (teamId: number, count: number) => PitchFixture[];
}

export function PitchView({ players, getNextFixtures }: PitchViewProps) {
  // Sort players by position for proper formation display
  const sortedPlayers = sortPlayersByPosition(players);
  
  return (
    <div className="space-y-4">
      {/* Pitch */}
      <div className="relative bg-gradient-to-b from-green-600 to-green-700 rounded-lg p-4 sm:p-6 md:p-8 overflow-hidden">
        {/* Pitch Lines and Graphics */}
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          {/* Center Line - Horizontal */}
          <div className="absolute top-1/2 left-0 w-full h-px bg-white"></div>
          
          {/* Center Line - Vertical */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-white"></div>
          
          {/* Center Circle */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-32 h-32 border-2 border-white rounded-full"></div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-white rounded-full"></div>
          
          {/* Top Goal Area (near goalkeeper) */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-28 border-2 border-t-0 border-white"></div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-14 border-2 border-t-0 border-white"></div>
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full"></div>
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-20 h-10 border-2 border-b-0 border-l-0 border-r-0 border-white rounded-t-full"></div>
          
          {/* Goal Post */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-2 border-2 border-white bg-white/10">
            <div className="absolute left-0 top-0 w-1 h-4 bg-white"></div>
            <div className="absolute right-0 top-0 w-1 h-4 bg-white"></div>
          </div>
          
          {/* Bottom Goal Area */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-28 border-2 border-b-0 border-white"></div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-14 border-2 border-b-0 border-white"></div>
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full"></div>
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-20 h-10 border-2 border-t-0 border-l-0 border-r-0 border-white rounded-b-full"></div>
          
          {/* Bottom Goal Post */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-2 border-2 border-white bg-white/10">
            <div className="absolute left-0 bottom-0 w-1 h-4 bg-white"></div>
            <div className="absolute right-0 bottom-0 w-1 h-4 bg-white"></div>
          </div>
          
          {/* Corner Arcs */}
          <div className="absolute top-0 left-0 w-4 h-4 border-2 border-t-0 border-l-0 border-white rounded-br-full"></div>
          <div className="absolute top-0 right-0 w-4 h-4 border-2 border-t-0 border-r-0 border-white rounded-bl-full"></div>
          <div className="absolute bottom-0 left-0 w-4 h-4 border-2 border-b-0 border-l-0 border-white rounded-tr-full"></div>
          <div className="absolute bottom-0 right-0 w-4 h-4 border-2 border-b-0 border-r-0 border-white rounded-tl-full"></div>
        </div>

        <div className="relative space-y-6">
          {/* Goalkeepers */}
          {(() => {
            const gks = filterPlayersByType(sortedPlayers, 1);
            
            return gks.length > 0 && (
              <div className="flex justify-center gap-4">
                {gks.map(player => {
                  const jerseyColor = getTeamJerseyColor(player.team_id || 0);
                  const textColor = getTextColor(jerseyColor);
                  
                  return (
                    <div key={player.element} className="flex flex-col items-center w-28" data-testid={`pitch-player-${player.element}`}>
                      <div className="relative w-full">
                        <div 
                          className="rounded-lg shadow-xl p-2 relative" 
                          style={{ backgroundColor: jerseyColor }}
                        >
                          {player.is_captain && (
                            <div className="absolute top-2 left-2 z-10">
                              <div className="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white">C</div>
                            </div>
                          )}
                          {player.is_vice_captain && (
                            <div className="absolute top-2 left-2 z-10">
                              <div className="w-5 h-5 bg-gray-200 border-2 border-yellow-400 rounded-full flex items-center justify-center text-xs font-bold">V</div>
                            </div>
                          )}
                          
                          {player.in_dreamteam && (
                            <div className="absolute top-2 right-2 z-10">
                              <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center border-2 border-white">
                                <Star className="h-3 w-3 text-white fill-white" />
                              </div>
                            </div>
                          )}
                          
                          <div className="text-center mb-1">
                            <div className="text-[10px] font-bold uppercase" style={{ color: textColor }}>
                              {player.team_short_name || 'UNK'}
                            </div>
                          </div>
                          <div className="text-center mb-1">
                            <div className="text-xs font-bold" style={{ color: textColor }}>
                              {player.web_name || player.player_name || 'Unknown'}
                            </div>
                          </div>
                          <div className="text-center mb-2">
                            <div className="text-2xl font-bold" style={{ color: textColor }}>
                              {(player.event_points || 0) * (player.is_captain ? 2 : player.multiplier || 1)}
                            </div>
                          </div>
                          {getNextFixtures && player.team_id && (
                            <div className="flex justify-center gap-0.5">
                              {getNextFixtures(player.team_id, 3).map((fixture, idx) => (
                                <div 
                                  key={idx}
                                  className={`px-1 py-0.5 rounded text-[10px] font-bold ${getDifficultyColor(fixture.difficulty)}`}
                                  title={`GW${fixture.gameweek}: ${fixture.opponent} (${fixture.isHome ? 'H' : 'A'})`}
                                >
                                  {fixture.opponent.substring(0, 3)}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Defenders */}
          {(() => {
            const defs = filterPlayersByType(sortedPlayers, 2);
            
            return defs.length > 0 && (
              <div className="flex justify-center gap-2 sm:gap-4">
                {defs.map(player => {
                  const jerseyColor = getTeamJerseyColor(player.team_id || 0);
                  const textColor = getTextColor(jerseyColor);
                  
                  return (
                    <div key={player.element} className="flex flex-col items-center w-28" data-testid={`pitch-player-${player.element}`}>
                      <div className="relative w-full">
                        <div 
                          className="rounded-lg shadow-xl p-2 relative" 
                          style={{ backgroundColor: jerseyColor }}
                        >
                          {player.is_captain && (
                            <div className="absolute top-2 left-2 z-10">
                              <div className="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white">C</div>
                            </div>
                          )}
                          {player.is_vice_captain && (
                            <div className="absolute top-2 left-2 z-10">
                              <div className="w-5 h-5 bg-gray-200 border-2 border-yellow-400 rounded-full flex items-center justify-center text-xs font-bold">V</div>
                            </div>
                          )}
                          
                          {player.in_dreamteam && (
                            <div className="absolute top-2 right-2 z-10">
                              <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center border-2 border-white">
                                <Star className="h-3 w-3 text-white fill-white" />
                              </div>
                            </div>
                          )}
                          
                          <div className="text-center mb-1">
                            <div className="text-[10px] font-bold uppercase" style={{ color: textColor }}>
                              {player.team_short_name || 'UNK'}
                            </div>
                          </div>
                          <div className="text-center mb-1">
                            <div className="text-xs font-bold" style={{ color: textColor }}>
                              {player.web_name || player.player_name || 'Unknown'}
                            </div>
                          </div>
                          <div className="text-center mb-2">
                            <div className="text-2xl font-bold" style={{ color: textColor }}>
                              {(player.event_points || 0) * (player.is_captain ? 2 : player.multiplier || 1)}
                            </div>
                          </div>
                          {getNextFixtures && player.team_id && (
                            <div className="flex justify-center gap-0.5">
                              {getNextFixtures(player.team_id, 3).map((fixture, idx) => (
                                <div 
                                  key={idx}
                                  className={`px-1 py-0.5 rounded text-[10px] font-bold ${getDifficultyColor(fixture.difficulty)}`}
                                  title={`GW${fixture.gameweek}: ${fixture.opponent} (${fixture.isHome ? 'H' : 'A'})`}
                                >
                                  {fixture.opponent.substring(0, 3)}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Midfielders */}
          {(() => {
            const mids = filterPlayersByType(sortedPlayers, 3);
            
            return mids.length > 0 && (
              <div className="flex justify-center gap-2 sm:gap-4">
                {mids.map(player => {
                  const jerseyColor = getTeamJerseyColor(player.team_id || 0);
                  const textColor = getTextColor(jerseyColor);
                  
                  return (
                    <div key={player.element} className="flex flex-col items-center w-28" data-testid={`pitch-player-${player.element}`}>
                      <div className="relative w-full">
                        <div 
                          className="rounded-lg shadow-xl p-2 relative" 
                          style={{ backgroundColor: jerseyColor }}
                        >
                          {player.is_captain && (
                            <div className="absolute top-2 left-2 z-10">
                              <div className="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white">C</div>
                            </div>
                          )}
                          {player.is_vice_captain && (
                            <div className="absolute top-2 left-2 z-10">
                              <div className="w-5 h-5 bg-gray-200 border-2 border-yellow-400 rounded-full flex items-center justify-center text-xs font-bold">V</div>
                            </div>
                          )}
                          
                          {player.in_dreamteam && (
                            <div className="absolute top-2 right-2 z-10">
                              <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center border-2 border-white">
                                <Star className="h-3 w-3 text-white fill-white" />
                              </div>
                            </div>
                          )}
                          
                          <div className="text-center mb-1">
                            <div className="text-[10px] font-bold uppercase" style={{ color: textColor }}>
                              {player.team_short_name || 'UNK'}
                            </div>
                          </div>
                          <div className="text-center mb-1">
                            <div className="text-xs font-bold" style={{ color: textColor }}>
                              {player.web_name || player.player_name || 'Unknown'}
                            </div>
                          </div>
                          <div className="text-center mb-2">
                            <div className="text-2xl font-bold" style={{ color: textColor }}>
                              {(player.event_points || 0) * (player.is_captain ? 2 : player.multiplier || 1)}
                            </div>
                          </div>
                          {getNextFixtures && player.team_id && (
                            <div className="flex justify-center gap-0.5">
                              {getNextFixtures(player.team_id, 3).map((fixture, idx) => (
                                <div 
                                  key={idx}
                                  className={`px-1 py-0.5 rounded text-[10px] font-bold ${getDifficultyColor(fixture.difficulty)}`}
                                  title={`GW${fixture.gameweek}: ${fixture.opponent} (${fixture.isHome ? 'H' : 'A'})`}
                                >
                                  {fixture.opponent.substring(0, 3)}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Forwards */}
          {(() => {
            const fwds = filterPlayersByType(sortedPlayers, 4);
            
            return fwds.length > 0 && (
              <div className="flex justify-center gap-2 sm:gap-4">
                {fwds.map(player => {
                  const jerseyColor = getTeamJerseyColor(player.team_id || 0);
                  const textColor = getTextColor(jerseyColor);
                  
                  return (
                    <div key={player.element} className="flex flex-col items-center w-28" data-testid={`pitch-player-${player.element}`}>
                      <div className="relative w-full">
                        <div 
                          className="rounded-lg shadow-xl p-2 relative" 
                          style={{ backgroundColor: jerseyColor }}
                        >
                          {player.is_captain && (
                            <div className="absolute top-2 left-2 z-10">
                              <div className="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white">C</div>
                            </div>
                          )}
                          {player.is_vice_captain && (
                            <div className="absolute top-2 left-2 z-10">
                              <div className="w-5 h-5 bg-gray-200 border-2 border-yellow-400 rounded-full flex items-center justify-center text-xs font-bold">V</div>
                            </div>
                          )}
                          
                          {player.in_dreamteam && (
                            <div className="absolute top-2 right-2 z-10">
                              <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center border-2 border-white">
                                <Star className="h-3 w-3 text-white fill-white" />
                              </div>
                            </div>
                          )}
                          
                          <div className="text-center mb-1">
                            <div className="text-[10px] font-bold uppercase" style={{ color: textColor }}>
                              {player.team_short_name || 'UNK'}
                            </div>
                          </div>
                          <div className="text-center mb-1">
                            <div className="text-xs font-bold" style={{ color: textColor }}>
                              {player.web_name || player.player_name || 'Unknown'}
                            </div>
                          </div>
                          <div className="text-center mb-2">
                            <div className="text-2xl font-bold" style={{ color: textColor }}>
                              {(player.event_points || 0) * (player.is_captain ? 2 : player.multiplier || 1)}
                            </div>
                          </div>
                          {getNextFixtures && player.team_id && (
                            <div className="flex justify-center gap-0.5">
                              {getNextFixtures(player.team_id, 3).map((fixture, idx) => (
                                <div 
                                  key={idx}
                                  className={`px-1 py-0.5 rounded text-[10px] font-bold ${getDifficultyColor(fixture.difficulty)}`}
                                  title={`GW${fixture.gameweek}: ${fixture.opponent} (${fixture.isHome ? 'H' : 'A'})`}
                                >
                                  {fixture.opponent.substring(0, 3)}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
