import { useState, useEffect } from "react";
import { getFixtureDifficultyColor } from "@/lib/heatmap-colors";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Users, Target, Armchair } from "lucide-react";
import { HeroPanel, HeroStat, InputPanel, Pill, PosChip, SectionCard, TeamChip, asPos } from "@/components/tool-ui";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { computeCurrentGameweek } from "@shared/gameweek-utils";
import { extractManagerId } from "@/lib/manager-id-utils";

interface TeamPick {
  element: number;
  position: number;
  multiplier: number;
  is_captain: boolean;
  is_vice_captain: boolean;
}

interface TeamData {
  picks: TeamPick[];
  chips: Array<{
    name: string;
    time: string;
    event: number;
  }>;
  transfers: {
    cost: number;
    status: string;
    limit: number;
    made: number;
    bank: number;
    value: number;
  };
}

interface Player {
  id: number;
  first_name: string;
  second_name: string;
  web_name: string;
  team_name: string;
  element_type: number;
  now_cost: number;
  total_points: number;
  form: string;
  selected_by_percent: string;
}

interface BootstrapData {
  elements: Player[];
  element_types: Array<{
    id: number;
    plural_name: string;
    singular_name: string;
  }>;
  teams: Array<{
    id: number;
    name: string;
    short_name: string;
  }>;
  events: Array<{
    id: number;
    name: string;
    is_current: boolean;
    is_next: boolean;
  }>;
}

export default function MyTeam() {
  const [managerId, setManagerId] = useState("");
  const [searchedId, setSearchedId] = useState("");

  // Cache manager ID functionality
  const saveManagerIdToCache = (id: string) => {
    try {
      localStorage.setItem('fpl-manager-id', id);
    } catch (error) {
      console.warn('Failed to save manager ID to localStorage:', error);
    }
  };

  const getManagerIdFromCache = (): string | null => {
    try {
      return localStorage.getItem('fpl-manager-id');
    } catch (error) {
      console.warn('Failed to get manager ID from localStorage:', error);
      return null;
    }
  };

  // Load cached manager ID on component mount
  useEffect(() => {
    const cachedId = getManagerIdFromCache();
    if (cachedId) {
      setManagerId(cachedId);
      setSearchedId(cachedId);
    }
  }, []);

  const { data: bootstrapData } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
  });

  const { data: teamData, isLoading: isLoadingTeam, error: teamError } = useQuery<TeamData>({
    queryKey: ["/api/manager", searchedId, "team"],
    enabled: !!searchedId,
  });

  // Get manager history for points data
  const { data: historyData } = useQuery({
    queryKey: ["/api/manager", searchedId, "history"],
    enabled: !!searchedId,
  });

  // Get fixtures for teams
  const { data: fixturesData } = useQuery({
    queryKey: ["/api/fixtures"],
    enabled: !!bootstrapData && !!teamData,
  });

  const handleSearch = () => {
    if (managerId.trim()) {
      const trimmedId = managerId.trim();
      setSearchedId(trimmedId);
      saveManagerIdToCache(trimmedId);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const getPlayerById = (id: number): Player | undefined => {
    return bootstrapData?.elements.find(p => p.id === id);
  };

  const getPositionName = (elementType: number): string => {
    const position = bootstrapData?.element_types.find(t => t.id === elementType);
    return position?.singular_name || "Unknown";
  };

  const getTeamById = (teamId: number) => {
    return bootstrapData?.teams.find(t => t.id === teamId);
  };

  const getTeamName = (player: Player): string => {
    const teamId = (player as any).team || player.team_name;
    const team = bootstrapData?.teams.find(t => t.id === teamId);
    return team?.short_name || 'Unknown';
  };

  const getPlayerTeam = (player: Player) => {
    // The Player type from FPL API has team as a number field, not team_name
    const teamId = (player as any).team || player.team_name;
    return bootstrapData?.teams.find(t => t.id === teamId);
  };

  const getNextFixtures = (teamId: number, count: number = 5) => {
    if (!fixturesData || !Array.isArray(fixturesData)) {
      return [];
    }
    
    const currentGW = getCurrentGameweek();
    
    return fixturesData
      .filter((fixture: any) => {
        const isTeamInFixture = fixture.team_h === teamId || fixture.team_a === teamId;
        const isUpcoming = !fixture.finished && fixture.event >= currentGW;
        return isTeamInFixture && isUpcoming;
      })
      .sort((a: any, b: any) => a.event - b.event)
      .slice(0, count)
      .map((fixture: any) => {
        const isHome = fixture.team_h === teamId;
        const opponentId = isHome ? fixture.team_a : fixture.team_h;
        const opponent = getTeamById(opponentId);
        const difficulty = isHome ? fixture.team_h_difficulty : fixture.team_a_difficulty;
        
        return {
          opponent: opponent?.short_name || 'TBD',
          isHome,
          difficulty: difficulty || 3,
          gameweek: fixture.event
        };
      });
  };

  const getDifficultyColor = (difficulty: number): string => getFixtureDifficultyColor(difficulty);

  const getDifficultyTextColor = (difficulty: number): string => {
    // This function is now redundant as colors are handled in getDifficultyColor
    return '';
  };

  const getCurrentGameweek = (): number => {
    // Floored at 1 — this is shown directly as "Gameweek X" and used as a live-data lookup key,
    // and GW0 isn't a real gameweek. Pre-season, GW1 is the team this page is building for.
    return Math.max(1, computeCurrentGameweek((bootstrapData?.events || []) as any));
  };

  const formatPrice = (price: number): string => {
    return `£${(price / 10).toFixed(1)}m`;
  };

  const getFormationCounts = () => {
    if (!teamData?.picks || !bootstrapData) return { gk: 0, def: 0, mid: 0, fwd: 0 };
    
    const startingEleven = teamData.picks.filter(pick => pick.position <= 11);
    const counts = { gk: 0, def: 0, mid: 0, fwd: 0 };
    
    startingEleven.forEach(pick => {
      const player = getPlayerById(pick.element);
      if (player) {
        switch (player.element_type) {
          case 1: counts.gk++; break;
          case 2: counts.def++; break;
          case 3: counts.mid++; break;
          case 4: counts.fwd++; break;
        }
      }
    });
    
    return counts;
  };

  const getFormationString = () => {
    const counts = getFormationCounts();
    return `${counts.def}-${counts.mid}-${counts.fwd}`;
  };

  const getTotalTeamValue = (): number => {
    if (!teamData?.picks || !bootstrapData) return 0;
    
    return teamData.picks.reduce((total, pick) => {
      const player = getPlayerById(pick.element);
      return total + (player?.now_cost || 0);
    }, 0);
  };

  const getCurrentGameweekPoints = (): number | null => {
    if (!historyData || !Array.isArray((historyData as any)?.current)) return null;
    const currentGW = getCurrentGameweek();
    const currentGWData = (historyData as any).current.find((gw: any) => gw.event === currentGW);
    return currentGWData?.points || null;
  };

  const getTotalPoints = (): number => {
    if (!historyData || !Array.isArray((historyData as any)?.current)) return 0;
    return (historyData as any).current.reduce((total: number, gw: any) => total + (gw.points || 0), 0);
  };

  const sortPlayersByPosition = (picks: TeamPick[]) => {
    return picks.sort((a, b) => {
      const playerA = getPlayerById(a.element);
      const playerB = getPlayerById(b.element);
      
      if (!playerA || !playerB) return 0;
      
      // Sort by position type first, then by position in team
      if (playerA.element_type !== playerB.element_type) {
        return playerA.element_type - playerB.element_type;
      }
      
      return a.position - b.position;
    });
  };

  if (!bootstrapData) {
    return (
      
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading FPL data...</p>
          </div>
        </div>
      
    );
  }

  return (
    
      <div className="min-h-screen overflow-x-hidden">
        <div className="w-full py-2 sm:py-4">
          <div className="space-y-3 sm:space-y-4">
            {/* Header Section */}
            <div className="fpl-page-header">
              <div className="fpl-page-header-content">
                <div className="fpl-page-title">
                  <Users />
                  <h1>My Team</h1>
                </div>
                <p className="fpl-page-subtitle">View your current FPL team formation, players, and squad value.</p>
              </div>
            </div>

            {/* Search Section */}
            <InputPanel icon={Target} title="Manager Search" subtitle="Enter your FPL Manager ID to view your current team.">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  data-testid="input-manager-id"
                  placeholder="Paste browser URL or Manager ID (e.g., https://fantasy.premierleague.com/entry/123456)"
                  value={managerId}
                  onChange={(e) => {
                    const extractedId = extractManagerId(e.target.value);
                    setManagerId(extractedId);
                  }}
                  onKeyPress={handleKeyPress}
                  className="flex-1 h-10 rounded-xl text-base"
                />
                <Button
                  data-testid="button-search-manager"
                  onClick={handleSearch}
                  disabled={!managerId.trim() || isLoadingTeam}
                  className="h-10 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 font-bold text-white hover:from-indigo-500 hover:to-violet-500"
                >
                  {isLoadingTeam ? "Loading..." : "Load Team"}
                </Button>
              </div>

              {getManagerIdFromCache() && (
                <p className="text-sm font-medium text-emerald-600">
                  ✓ Your last searched Manager ID ({getManagerIdFromCache()}) is automatically loaded
                </p>
              )}
            </InputPanel>

            {/* Error Display */}
            {teamError && (
              <Alert variant="destructive">
                <AlertDescription>
                  Failed to load team data. Please check the Manager ID and try again.
                </AlertDescription>
              </Alert>
            )}

            {/* Team Overview */}
            {teamData && (
              <HeroPanel className="!rounded-2xl !p-4 sm:!p-5" testId="my-team-hero">
                <div className="grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3 lg:grid-cols-5">
                  <HeroStat size="md" label="Formation" value={getFormationString()} valueTestId="text-formation" />
                  <HeroStat
                    size="md"
                    label="Squad Value"
                    value={formatPrice(getTotalTeamValue())}
                    valueTestId="text-squad-value"
                    sub={teamData.transfers ? `Bank: ${formatPrice(teamData.transfers.bank)}` : undefined}
                  />
                  <HeroStat
                    size="md"
                    label="Transfers"
                    value={teamData.transfers ? `${teamData.transfers.made}/${teamData.transfers.limit}` : '0/1'}
                    valueTestId="text-transfers"
                    sub={teamData.transfers && teamData.transfers.cost > 0 ? `Cost: -${teamData.transfers.cost} pts` : undefined}
                  />
                  <HeroStat
                    size="md"
                    label="Current GW Points"
                    value={getCurrentGameweekPoints() !== null ? getCurrentGameweekPoints() : '-'}
                    valueTestId="text-current-gw-points"
                    sub={`GW ${getCurrentGameweek()}`}
                  />
                  <HeroStat size="md" label="Total Points" value={getTotalPoints()} valueTestId="text-total-points" sub="All gameweeks" />
                </div>
              </HeroPanel>
            )}

            {/* Legend */}
            {teamData && (
              <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-gray-900">Fixture Difficulty Legend</h4>
                  <div className="flex gap-2 items-center">
                    {[1, 2, 3, 4, 5].map(diff => (
                      <div key={diff} className="flex items-center gap-1">
                        <div className={`w-3 h-3 rounded ${getDifficultyColor(diff)}`}></div>
                        <span className="text-xs font-semibold text-gray-700">{diff}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Each fixture shows opponent team (H for Home, A for Away) with difficulty rating from 1 (easiest) to 5 (hardest)
                </p>
              </div>
            )}

            {/* Starting XI */}
            {teamData && (
              <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
                <SectionCard icon={Users} title="Starting XI" subtitle={`Your team for Gameweek ${getCurrentGameweek()}`} bodyClassName="p-0">
                  <div className="space-y-0">
                    {/* Group by position */}
                    {[1, 2, 3, 4].map(positionType => {
                      const playersInPosition = sortPlayersByPosition(teamData.picks.filter(pick => pick.position <= 11))
                        .filter(pick => {
                          const player = getPlayerById(pick.element);
                          return player?.element_type === positionType;
                        });

                      if (playersInPosition.length === 0) return null;

                      const positionName = getPositionName(positionType);
                      const posKey = (["GKP", "DEF", "MID", "FWD"] as const)[positionType - 1];

                      return (
                        <div key={positionType} className="border-b border-gray-100 last:border-b-0">
                          <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-gray-600">
                            <PosChip pos={asPos(posKey)} />
                            {positionName}s ({playersInPosition.length})
                          </div>
                          {playersInPosition.map((pick, index) => {
                            const player = getPlayerById(pick.element);
                            if (!player) return null;

                            return (
                              <div
                                key={pick.element}
                                className={`flex items-center justify-between gap-3 border-t border-gray-100 p-4 transition-colors hover:bg-gray-50 ${
                                  pick.is_captain ? 'bg-amber-500/10 shadow-[inset_4px_0_0_0_theme(colors.amber.400)]' :
                                  pick.is_vice_captain ? 'bg-indigo-500/10 shadow-[inset_4px_0_0_0_theme(colors.indigo.400)]' :
                                  ''
                                }`}
                                data-testid={`starting-player-${index}`}
                              >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/15 to-violet-500/15 text-sm font-bold text-indigo-700">
                                    {player.web_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-gray-900">{player.web_name}</span>
                                      {pick.is_captain && <Pill tone="amber">C</Pill>}
                                      {pick.is_vice_captain && <Pill tone="indigo">VC</Pill>}
                                    </div>
                                    <div className="space-y-2 mt-2">
                                      <div className="flex items-center gap-2">
                                        <TeamChip>{getTeamName(player)}</TeamChip>
                                        <span className="text-xs text-gray-500">Form: {player.form}</span>
                                      </div>

                                      {/* Next 3 fixtures */}
                                      <div className="space-y-1">
                                        <div className="text-xs font-medium text-gray-500">Next 3 fixtures:</div>
                                        <div className="flex gap-1 flex-wrap">
                                          {getNextFixtures(getPlayerTeam(player)?.id || 0, 3).map((fixture, idx) => (
                                            <div
                                              key={idx}
                                              className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-semibold ${getDifficultyColor(fixture.difficulty)} whitespace-nowrap`}
                                              title={`GW${fixture.gameweek} vs ${fixture.opponent} (${fixture.isHome ? 'H' : 'A'}) - Difficulty: ${fixture.difficulty}/5`}
                                            >
                                              <span className="truncate max-w-[40px]">{fixture.opponent}</span>
                                              <span className="text-xs opacity-75">({fixture.isHome ? 'H' : 'A'})</span>
                                            </div>
                                          ))}
                                          {getNextFixtures(getPlayerTeam(player)?.id || 0, 3).length === 0 && (
                                            <span className="text-xs text-gray-400">No upcoming fixtures</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right space-y-1 shrink-0">
                                  <p className="font-bold text-emerald-600">{formatPrice(player.now_cost)}</p>
                                  <p className="text-sm font-semibold tabular-nums text-gray-700">{player.total_points} pts</p>
                                  <div className="text-xs text-gray-500">
                                    <div>Sel: {parseFloat(player.selected_by_percent).toFixed(1)}%</div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </SectionCard>

                {/* Bench */}
                <SectionCard icon={Armchair} title="Bench" subtitle="Substitute players" bodyClassName="p-0">
                  <div className="space-y-0">
                    {sortPlayersByPosition(teamData.picks.filter(pick => pick.position > 11)).map((pick, index) => {
                      const player = getPlayerById(pick.element);
                      if (!player) return null;

                      return (
                        <div
                          key={pick.element}
                          className="flex items-center justify-between gap-3 p-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors"
                          data-testid={`bench-player-${index}`}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600">
                              {pick.position - 11}
                            </div>
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/15 to-violet-500/15 text-sm font-bold text-indigo-700">
                              {player.web_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-900">{player.web_name}</span>
                                <PosChip pos={asPos((["GKP", "DEF", "MID", "FWD"] as const)[player.element_type - 1] ?? "MID")} />
                              </div>
                              <div className="space-y-2 mt-2">
                                <div className="flex items-center gap-2">
                                  <TeamChip>{getTeamName(player)}</TeamChip>
                                  <span className="text-xs text-gray-500">Form: {player.form}</span>
                                </div>

                                {/* Next 3 fixtures */}
                                <div className="space-y-1">
                                  <div className="text-xs font-medium text-gray-500">Next 3 fixtures:</div>
                                  <div className="flex gap-1 flex-wrap">
                                    {getNextFixtures(getPlayerTeam(player)?.id || 0, 3).map((fixture, idx) => (
                                      <div
                                        key={idx}
                                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-semibold ${getDifficultyColor(fixture.difficulty)} whitespace-nowrap`}
                                        title={`GW${fixture.gameweek} vs ${fixture.opponent} (${fixture.isHome ? 'H' : 'A'}) - Difficulty: ${fixture.difficulty}/5`}
                                      >
                                        <span className="truncate max-w-[40px]">{fixture.opponent}</span>
                                        <span className="text-xs opacity-75">({fixture.isHome ? 'H' : 'A'})</span>
                                      </div>
                                    ))}
                                    {getNextFixtures(getPlayerTeam(player)?.id || 0, 3).length === 0 && (
                                      <span className="text-xs text-gray-400">No upcoming fixtures</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="text-right space-y-1 shrink-0">
                            <p className="font-bold text-emerald-600">{formatPrice(player.now_cost)}</p>
                            <p className="text-sm font-semibold tabular-nums text-gray-700">{player.total_points} pts</p>
                            <div className="text-xs text-gray-500">
                              <div>Sel: {parseFloat(player.selected_by_percent).toFixed(1)}%</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </SectionCard>
              </div>
            )}
          </div>
        </div>
      </div>
    
  );
}