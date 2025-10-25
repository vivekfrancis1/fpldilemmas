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
  benchPlayers?: PitchPlayer[];
  getNextFixtures?: (teamId: number, count: number) => PitchFixture[];
  showFixtures?: boolean;
}

export function PitchView({ players, benchPlayers = [], getNextFixtures, showFixtures = true }: PitchViewProps) {
  const sortedPlayers = sortPlayersByPosition(players);
  const sortedBench = sortPlayersByPosition(benchPlayers);
  
  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Pitch */}
      <div className="relative bg-gradient-to-b from-green-600 to-green-700 rounded-lg p-4 sm:p-6 md:p-8 lg:p-10 overflow-hidden">
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

        <div className="relative space-y-4 sm:space-y-6 md:space-y-8 lg:space-y-10">
          {/* Goalkeepers */}
          {(() => {
            const gks = filterPlayersByType(sortedPlayers, 1);
            
            return gks.length > 0 && (
              <div className="flex justify-center gap-0.5">
                {gks.map(player => {
                  const jerseyColor = getTeamJerseyColor(player.team_id || 0);
                  const textColor = getTextColor(jerseyColor);
                  
                  return (
                    <div key={player.element} className="flex flex-col items-center w-[19%]" data-testid={`pitch-player-${player.element}`}>
                      <div className="relative w-full">
                        <svg viewBox="0 0 403 302" className="w-full drop-shadow-md sm:drop-shadow-lg md:drop-shadow-xl">
                          <defs><clipPath id={`jersey-clip-gk-${player.element}`}><path d="M 84 43 L 46 43 L 46 115 L 65 122 L 84 122 L 84 43 L 130 14 Q 137 14 144 23 L 158 36 L 173 43 Q 187 43 202 43 L 216 43 Q 230 43 245 36 L 259 23 Q 266 14 274 14 L 319 43 L 319 122 L 338 122 L 358 115 L 358 43 L 319 43 L 319 295 L 84 295 L 84 43 Z" /></clipPath></defs>
                          <rect width="403" height="302" fill={jerseyColor} clipPath={`url(#jersey-clip-gk-${player.element})`} />
                          <path d="M 84 43 L 46 43 L 46 115 L 65 122 L 84 122 L 84 43 L 130 14 Q 137 14 144 23 L 158 36 L 173 43 Q 187 43 202 43 L 216 43 Q 230 43 245 36 L 259 23 Q 266 14 274 14 L 319 43 L 319 122 L 338 122 L 358 115 L 358 43 L 319 43 L 319 295 L 84 295 L 84 43 Z" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5" />
                          <path d="M 130 14 L 144 26 L 158 36 L 173 42 Q 187 42 202 42 L 216 42 Q 230 42 245 36 L 259 26 L 274 14" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
                          {player.is_captain && (<g><rect x="96" y="55" width="34" height="34" fill="rgb(254 240 138)" stroke="rgb(161 98 7)" strokeWidth="2" rx="4" /><text x="113" y="80" fontSize="22" fontWeight="bold" textAnchor="middle" fill="rgb(161 98 7)">C</text></g>)}
                          {player.is_vice_captain && (<g><rect x="96" y="55" width="38" height="34" fill="rgb(191 219 254)" stroke="rgb(29 78 216)" strokeWidth="2" rx="4" /><text x="115" y="80" fontSize="19" fontWeight="bold" textAnchor="middle" fill="rgb(29 78 216)">VC</text></g>)}
                          {player.in_dreamteam && (<g><circle cx="307" cy="72" r="17" fill="#A855F7" stroke="white" strokeWidth="2.5" /><path d="M 307 63 L 309 69 L 315 69 L 310 73 L 312 79 L 307 75 L 302 79 L 304 73 L 299 69 L 305 69 Z" fill="white" /></g>)}
                          <text x="202" y="108" fontSize="28" fontWeight="bold" textAnchor="middle" fill={textColor}>{player.team_short_name || 'UNK'}</text>
                          <text x="202" y="150" fontSize="32" fontWeight="bold" textAnchor="middle" fill={textColor}>{player.web_name || player.player_name || 'Unknown'}</text>
                          <text x="202" y="225" fontSize="52" fontWeight="bold" textAnchor="middle" fill={textColor}>{(player.event_points || 0) * (player.is_captain ? 2 : player.multiplier || 1)}</text>
                          {showFixtures && getNextFixtures && player.team_id && (() => {
                            const fixtures = getNextFixtures(player.team_id, 1);
                            if (fixtures.length > 0) {
                              const fixture = fixtures[0];
                              return <text x="202" y="270" fontSize="24" fontWeight="bold" textAnchor="middle" fill={textColor}>vs {fixture.opponent} {fixture.isHome ? '(H)' : '(A)'}</text>;
                            }
                            return null;
                          })()}
                        </svg>
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
              <div className="flex justify-center gap-0.5">
                {defs.map(player => {
                  const jerseyColor = getTeamJerseyColor(player.team_id || 0);
                  const textColor = getTextColor(jerseyColor);
                  
                  return (
                    <div key={player.element} className="flex flex-col items-center w-[19%]" data-testid={`pitch-player-${player.element}`}>
                      <div className="relative w-full">
                        <svg viewBox="0 0 403 302" className="w-full drop-shadow-md sm:drop-shadow-lg md:drop-shadow-xl">
                          <defs><clipPath id={`jersey-clip-def-${player.element}`}><path d="M 84 43 L 46 43 L 46 115 L 65 122 L 84 122 L 84 43 L 130 14 Q 137 14 144 23 L 158 36 L 173 43 Q 187 43 202 43 L 216 43 Q 230 43 245 36 L 259 23 Q 266 14 274 14 L 319 43 L 319 122 L 338 122 L 358 115 L 358 43 L 319 43 L 319 295 L 84 295 L 84 43 Z" /></clipPath></defs>
                          <rect width="403" height="302" fill={jerseyColor} clipPath={`url(#jersey-clip-def-${player.element})`} />
                          <path d="M 84 43 L 46 43 L 46 115 L 65 122 L 84 122 L 84 43 L 130 14 Q 137 14 144 23 L 158 36 L 173 43 Q 187 43 202 43 L 216 43 Q 230 43 245 36 L 259 23 Q 266 14 274 14 L 319 43 L 319 122 L 338 122 L 358 115 L 358 43 L 319 43 L 319 295 L 84 295 L 84 43 Z" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5" />
                          <path d="M 130 14 L 144 26 L 158 36 L 173 42 Q 187 42 202 42 L 216 42 Q 230 42 245 36 L 259 26 L 274 14" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
                          {player.is_captain && (<g><rect x="96" y="55" width="34" height="34" fill="rgb(254 240 138)" stroke="rgb(161 98 7)" strokeWidth="2" rx="4" /><text x="113" y="80" fontSize="22" fontWeight="bold" textAnchor="middle" fill="rgb(161 98 7)">C</text></g>)}
                          {player.is_vice_captain && (<g><rect x="96" y="55" width="38" height="34" fill="rgb(191 219 254)" stroke="rgb(29 78 216)" strokeWidth="2" rx="4" /><text x="115" y="80" fontSize="19" fontWeight="bold" textAnchor="middle" fill="rgb(29 78 216)">VC</text></g>)}
                          {player.in_dreamteam && (<g><circle cx="307" cy="72" r="17" fill="#A855F7" stroke="white" strokeWidth="2.5" /><path d="M 307 63 L 309 69 L 315 69 L 310 73 L 312 79 L 307 75 L 302 79 L 304 73 L 299 69 L 305 69 Z" fill="white" /></g>)}
                          <text x="202" y="108" fontSize="28" fontWeight="bold" textAnchor="middle" fill={textColor}>{player.team_short_name || 'UNK'}</text>
                          <text x="202" y="150" fontSize="32" fontWeight="bold" textAnchor="middle" fill={textColor}>{player.web_name || player.player_name || 'Unknown'}</text>
                          <text x="202" y="225" fontSize="52" fontWeight="bold" textAnchor="middle" fill={textColor}>{(player.event_points || 0) * (player.is_captain ? 2 : player.multiplier || 1)}</text>
                          {showFixtures && getNextFixtures && player.team_id && (() => {
                            const fixtures = getNextFixtures(player.team_id, 1);
                            if (fixtures.length > 0) {
                              const fixture = fixtures[0];
                              return <text x="202" y="270" fontSize="24" fontWeight="bold" textAnchor="middle" fill={textColor}>vs {fixture.opponent} {fixture.isHome ? '(H)' : '(A)'}</text>;
                            }
                            return null;
                          })()}
                        </svg>
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
              <div className="flex justify-center gap-0.5">
                {mids.map(player => {
                  const jerseyColor = getTeamJerseyColor(player.team_id || 0);
                  const textColor = getTextColor(jerseyColor);
                  
                  return (
                    <div key={player.element} className="flex flex-col items-center w-[19%]" data-testid={`pitch-player-${player.element}`}>
                      <div className="relative w-full">
                        <svg viewBox="0 0 403 302" className="w-full drop-shadow-md sm:drop-shadow-lg md:drop-shadow-xl">
                          <defs><clipPath id={`jersey-clip-mid-${player.element}`}><path d="M 84 43 L 46 43 L 46 115 L 65 122 L 84 122 L 84 43 L 130 14 Q 137 14 144 23 L 158 36 L 173 43 Q 187 43 202 43 L 216 43 Q 230 43 245 36 L 259 23 Q 266 14 274 14 L 319 43 L 319 122 L 338 122 L 358 115 L 358 43 L 319 43 L 319 295 L 84 295 L 84 43 Z" /></clipPath></defs>
                          <rect width="403" height="302" fill={jerseyColor} clipPath={`url(#jersey-clip-mid-${player.element})`} />
                          <path d="M 84 43 L 46 43 L 46 115 L 65 122 L 84 122 L 84 43 L 130 14 Q 137 14 144 23 L 158 36 L 173 43 Q 187 43 202 43 L 216 43 Q 230 43 245 36 L 259 23 Q 266 14 274 14 L 319 43 L 319 122 L 338 122 L 358 115 L 358 43 L 319 43 L 319 295 L 84 295 L 84 43 Z" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5" />
                          <path d="M 130 14 L 144 26 L 158 36 L 173 42 Q 187 42 202 42 L 216 42 Q 230 42 245 36 L 259 26 L 274 14" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
                          {player.is_captain && (<g><rect x="96" y="55" width="34" height="34" fill="rgb(254 240 138)" stroke="rgb(161 98 7)" strokeWidth="2" rx="4" /><text x="113" y="80" fontSize="22" fontWeight="bold" textAnchor="middle" fill="rgb(161 98 7)">C</text></g>)}
                          {player.is_vice_captain && (<g><rect x="96" y="55" width="38" height="34" fill="rgb(191 219 254)" stroke="rgb(29 78 216)" strokeWidth="2" rx="4" /><text x="115" y="80" fontSize="19" fontWeight="bold" textAnchor="middle" fill="rgb(29 78 216)">VC</text></g>)}
                          {player.in_dreamteam && (<g><circle cx="307" cy="72" r="17" fill="#A855F7" stroke="white" strokeWidth="2.5" /><path d="M 307 63 L 309 69 L 315 69 L 310 73 L 312 79 L 307 75 L 302 79 L 304 73 L 299 69 L 305 69 Z" fill="white" /></g>)}
                          <text x="202" y="108" fontSize="28" fontWeight="bold" textAnchor="middle" fill={textColor}>{player.team_short_name || 'UNK'}</text>
                          <text x="202" y="150" fontSize="32" fontWeight="bold" textAnchor="middle" fill={textColor}>{player.web_name || player.player_name || 'Unknown'}</text>
                          <text x="202" y="225" fontSize="52" fontWeight="bold" textAnchor="middle" fill={textColor}>{(player.event_points || 0) * (player.is_captain ? 2 : player.multiplier || 1)}</text>
                          {showFixtures && getNextFixtures && player.team_id && (() => {
                            const fixtures = getNextFixtures(player.team_id, 1);
                            if (fixtures.length > 0) {
                              const fixture = fixtures[0];
                              return <text x="202" y="270" fontSize="24" fontWeight="bold" textAnchor="middle" fill={textColor}>vs {fixture.opponent} {fixture.isHome ? '(H)' : '(A)'}</text>;
                            }
                            return null;
                          })()}
                        </svg>
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
              <div className="flex justify-center gap-0.5">
                {fwds.map(player => {
                  const jerseyColor = getTeamJerseyColor(player.team_id || 0);
                  const textColor = getTextColor(jerseyColor);
                  
                  return (
                    <div key={player.element} className="flex flex-col items-center w-[19%]" data-testid={`pitch-player-${player.element}`}>
                      <div className="relative w-full">
                        <svg viewBox="0 0 403 302" className="w-full drop-shadow-md sm:drop-shadow-lg md:drop-shadow-xl">
                          <defs><clipPath id={`jersey-clip-fwd-${player.element}`}><path d="M 84 43 L 46 43 L 46 115 L 65 122 L 84 122 L 84 43 L 130 14 Q 137 14 144 23 L 158 36 L 173 43 Q 187 43 202 43 L 216 43 Q 230 43 245 36 L 259 23 Q 266 14 274 14 L 319 43 L 319 122 L 338 122 L 358 115 L 358 43 L 319 43 L 319 295 L 84 295 L 84 43 Z" /></clipPath></defs>
                          <rect width="403" height="302" fill={jerseyColor} clipPath={`url(#jersey-clip-fwd-${player.element})`} />
                          <path d="M 84 43 L 46 43 L 46 115 L 65 122 L 84 122 L 84 43 L 130 14 Q 137 14 144 23 L 158 36 L 173 43 Q 187 43 202 43 L 216 43 Q 230 43 245 36 L 259 23 Q 266 14 274 14 L 319 43 L 319 122 L 338 122 L 358 115 L 358 43 L 319 43 L 319 295 L 84 295 L 84 43 Z" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5" />
                          <path d="M 130 14 L 144 26 L 158 36 L 173 42 Q 187 42 202 42 L 216 42 Q 230 42 245 36 L 259 26 L 274 14" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
                          {player.is_captain && (<g><rect x="96" y="55" width="34" height="34" fill="rgb(254 240 138)" stroke="rgb(161 98 7)" strokeWidth="2" rx="4" /><text x="113" y="80" fontSize="22" fontWeight="bold" textAnchor="middle" fill="rgb(161 98 7)">C</text></g>)}
                          {player.is_vice_captain && (<g><rect x="96" y="55" width="38" height="34" fill="rgb(191 219 254)" stroke="rgb(29 78 216)" strokeWidth="2" rx="4" /><text x="115" y="80" fontSize="19" fontWeight="bold" textAnchor="middle" fill="rgb(29 78 216)">VC</text></g>)}
                          {player.in_dreamteam && (<g><circle cx="307" cy="72" r="17" fill="#A855F7" stroke="white" strokeWidth="2.5" /><path d="M 307 63 L 309 69 L 315 69 L 310 73 L 312 79 L 307 75 L 302 79 L 304 73 L 299 69 L 305 69 Z" fill="white" /></g>)}
                          <text x="202" y="108" fontSize="28" fontWeight="bold" textAnchor="middle" fill={textColor}>{player.team_short_name || 'UNK'}</text>
                          <text x="202" y="150" fontSize="32" fontWeight="bold" textAnchor="middle" fill={textColor}>{player.web_name || player.player_name || 'Unknown'}</text>
                          <text x="202" y="225" fontSize="52" fontWeight="bold" textAnchor="middle" fill={textColor}>{(player.event_points || 0) * (player.is_captain ? 2 : player.multiplier || 1)}</text>
                          {showFixtures && getNextFixtures && player.team_id && (() => {
                            const fixtures = getNextFixtures(player.team_id, 1);
                            if (fixtures.length > 0) {
                              const fixture = fixtures[0];
                              return <text x="202" y="270" fontSize="24" fontWeight="bold" textAnchor="middle" fill={textColor}>vs {fixture.opponent} {fixture.isHome ? '(H)' : '(A)'}</text>;
                            }
                            return null;
                          })()}
                        </svg>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Bench Section - Inside Pitch */}
          {sortedBench.length > 0 && (
            <div className="mt-6 sm:mt-8 md:mt-10 pt-4 sm:pt-6 border-t-2 border-white/30">
              <h3 className="text-xs sm:text-sm font-semibold text-white mb-3 sm:mb-4 text-center tracking-wider">BENCH</h3>
              <div className="flex justify-center gap-0.5">
                {sortedBench.map(player => {
                  const jerseyColor = getTeamJerseyColor(player.team_id || 0);
                  const textColor = getTextColor(jerseyColor);
                  
                  return (
                    <div key={player.element} className="flex flex-col items-center w-[19.5%] opacity-90" data-testid={`bench-player-${player.element}`}>
                      <div className="relative w-full">
                        <svg viewBox="0 0 280 190" className="w-full drop-shadow-md sm:drop-shadow-lg">
                          <defs><clipPath id={`jersey-clip-bench-${player.element}`}><path d="M 58 30 L 32 30 L 32 80 L 45 85 L 58 85 L 58 30 L 90 10 Q 95 10 100 16 L 110 25 L 120 30 Q 130 30 140 30 L 150 30 Q 160 30 170 25 L 180 16 Q 185 10 190 10 L 222 30 L 222 85 L 235 85 L 248 80 L 248 30 L 222 30 L 222 185 L 58 185 L 58 30 Z" /></clipPath></defs>
                          <rect width="280" height="190" fill={jerseyColor} clipPath={`url(#jersey-clip-bench-${player.element})`} />
                          <path d="M 58 30 L 32 30 L 32 80 L 45 85 L 58 85 L 58 30 L 90 10 Q 95 10 100 16 L 110 25 L 120 30 Q 130 30 140 30 L 150 30 Q 160 30 170 25 L 180 16 Q 185 10 190 10 L 222 30 L 222 85 L 235 85 L 248 80 L 248 30 L 222 30 L 222 185 L 58 185 L 58 30 Z" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5" />
                          <path d="M 90 10 L 100 18 L 110 25 L 120 29 Q 130 29 140 29 L 150 29 Q 160 29 170 25 L 180 18 L 190 10" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
                          {player.in_dreamteam && (<g><circle cx="205" cy="48" r="12" fill="#A855F7" stroke="white" strokeWidth="2.5" /><path d="M 205 39 L 207 45 L 213 45 L 208 49 L 210 55 L 205 51 L 200 55 L 202 49 L 197 45 L 203 45 Z" fill="white" /></g>)}
                          <text x="140" y="68" fontSize="16" fontWeight="bold" textAnchor="middle" fill={textColor}>{player.team_short_name || 'UNK'}</text>
                          <text x="140" y="88" fontSize="18" fontWeight="bold" textAnchor="middle" fill={textColor}>{player.web_name || player.player_name || 'Unknown'}</text>
                          <text x="140" y="130" fontSize="36" fontWeight="bold" textAnchor="middle" fill={textColor}>{player.event_points || 0}</text>
                          {showFixtures && getNextFixtures && player.team_id && getNextFixtures(player.team_id, 3).map((fixture, idx) => (
                            <g key={idx}><rect x={61 + (idx * 53)} y="155" width="50" height="24" rx="5" fill={getDifficultyColor(fixture.difficulty)} /><text x={86 + (idx * 53)} y="170" fontSize="14" fontWeight="bold" textAnchor="middle" fill="white">{fixture.opponent.substring(0, 3)}</text></g>
                          ))}
                        </svg>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
