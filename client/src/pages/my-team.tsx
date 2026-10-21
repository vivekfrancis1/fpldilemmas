import { useState, useEffect } from "react";
import { getFixtureDifficultyColor } from "@/lib/heatmap-colors";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Target, Trophy, Star, DollarSign } from "lucide-react";
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

  // One compact line per player: [badge] name  TEAM  form  next-3 fixtures ........ price  pts  sel%
  const renderPlayerRow = (pick: TeamPick, testId: string, benchNumber?: number) => {
    const player = getPlayerById(pick.element);
    if (!player) return null;
    const fixtures = getNextFixtures(getPlayerTeam(player)?.id || 0, 3);
    return (
      <div
        key={pick.element}
        className={`flex flex-wrap sm:flex-nowrap items-center gap-x-2 gap-y-0.5 px-3 py-1 border-l-4 text-sm hover:bg-gray-50 transition-colors ${
          pick.is_captain ? 'bg-amber-50 border-amber-400' :
          pick.is_vice_captain ? 'bg-blue-50 border-blue-400' :
          'border-transparent'
        }`}
        data-testid={testId}
      >
        {benchNumber !== undefined && (
          <span className="w-5 h-5 shrink-0 bg-gray-200 rounded-full flex items-center justify-center text-[10px] font-medium text-gray-600">{benchNumber}</span>
        )}
        <span className="font-semibold text-gray-900 min-w-[84px] truncate">{player.web_name}</span>
        {pick.is_captain && <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] px-1.5 py-0 leading-4">C</Badge>}
        {pick.is_vice_captain && <Badge variant="outline" className="border-blue-300 text-blue-700 text-[10px] px-1.5 py-0 leading-4">VC</Badge>}
        {benchNumber !== undefined && <Badge variant="outline" className="text-[10px] px-1.5 py-0 leading-4">{({ 1: 'GKP', 2: 'DEF', 3: 'MID', 4: 'FWD' } as Record<number, string>)[player.element_type]}</Badge>}
        <span className="text-xs font-medium text-gray-700 w-9 shrink-0">{getTeamName(player)}</span>
        <span className="text-xs text-gray-500 w-14 shrink-0">Form {player.form}</span>
        <div className="flex gap-1 order-last basis-full sm:order-none sm:basis-0 sm:flex-1 min-w-0 flex-wrap">
          {fixtures.map((fixture, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-0.5 px-1 rounded text-[11px] font-medium ${getDifficultyColor(fixture.difficulty)} whitespace-nowrap`}
              title={`GW${fixture.gameweek} vs ${fixture.opponent} (${fixture.isHome ? 'H' : 'A'}) - Difficulty: ${fixture.difficulty}/5`}
            >
              <span>{fixture.opponent}</span>
              <span className="opacity-75">({fixture.isHome ? 'H' : 'A'})</span>
            </div>
          ))}
          {fixtures.length === 0 && <span className="text-xs text-gray-400">No upcoming fixtures</span>}
        </div>
        <span className="font-semibold text-green-600 w-12 text-right shrink-0 ml-auto sm:ml-0">{formatPrice(player.now_cost)}</span>
        <span className="text-xs text-gray-600 w-12 text-right shrink-0">{player.total_points} pts</span>
        {benchNumber === undefined && (
          <span className="text-xs text-gray-500 w-12 text-right shrink-0 hidden sm:inline">{parseFloat(player.selected_by_percent).toFixed(1)}%</span>
        )}
      </div>
    );
  };

  const positionColors = {
    1: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    2: 'bg-blue-50 border-blue-200 text-blue-800',
    3: 'bg-green-50 border-green-200 text-green-800',
    4: 'bg-red-50 border-red-200 text-red-800'
  };

  // A slim stat cell: label, value and (optional) detail on one row
  const statCell = (cls: string, label: string, value: React.ReactNode, testId: string, detail?: React.ReactNode, detailCls = '') => (
    <Card className={`${cls} shadow-sm`}>
      <CardContent className="!px-3 !py-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs font-medium truncate">{label}</span>
          <span className="text-lg font-bold truncate" data-testid={testId}>{value}</span>
        </div>
        {detail && <p className={`text-[11px] truncate ${detailCls}`}>{detail}</p>}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen overflow-x-hidden">
      <div className="w-full py-1">
        <div className="space-y-2">
          {/* Header */}
          <div className="fpl-page-header">
            <div className="fpl-page-header-content">
              <div className="fpl-page-title">
                <Users className="h-8 w-8" />
                <h1>My Team</h1>
              </div>
              <p className="fpl-page-subtitle">View your current FPL team formation, players, and squad value.</p>
            </div>
          </div>

          {/* Manager search: one row */}
          <Card className="bg-white shadow-sm border border-gray-100">
            <CardContent className="!px-3 !py-2">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <Target className="h-4 w-4 text-emerald-600 shrink-0 hidden sm:block" />
                <Input
                  data-testid="input-manager-id"
                  placeholder="Paste browser URL or Manager ID (e.g., https://fantasy.premierleague.com/entry/123456)"
                  value={managerId}
                  onChange={(e) => {
                    const extractedId = extractManagerId(e.target.value);
                    setManagerId(extractedId);
                  }}
                  onKeyPress={handleKeyPress}
                  className="flex-1 h-8 text-sm"
                />
                <Button
                  data-testid="button-search-manager"
                  onClick={handleSearch}
                  disabled={!managerId.trim() || isLoadingTeam}
                  size="sm"
                  className="sm:px-6"
                >
                  {isLoadingTeam ? "Loading..." : "Load Team"}
                </Button>
                {getManagerIdFromCache() && (
                  <span className="text-green-600 font-medium text-xs whitespace-nowrap">
                    ✓ Last searched ID ({getManagerIdFromCache()}) auto-loaded
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Error Display */}
          {teamError && (
            <Alert variant="destructive">
              <AlertDescription>
                Failed to load team data. Please check the Manager ID and try again.
              </AlertDescription>
            </Alert>
          )}

          {/* Team Overview: one slim strip */}
          {teamData && (
            <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 xl:grid-cols-5">
              {statCell('bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-800', 'Formation', getFormationString(), 'text-formation')}
              {statCell('bg-gradient-to-br from-green-50 to-green-100 border-green-200 text-green-800', 'Squad Value', formatPrice(getTotalTeamValue()), 'text-squad-value',
                teamData.transfers ? `Bank: ${formatPrice(teamData.transfers.bank)}` : undefined, 'text-green-600')}
              {statCell('bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 text-blue-800', 'Transfers',
                teamData.transfers ? `${teamData.transfers.made}/${teamData.transfers.limit}` : '0/1', 'text-transfers',
                teamData.transfers && teamData.transfers.cost > 0 ? `Cost: -${teamData.transfers.cost} pts` : undefined, 'text-red-600')}
              {statCell('bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 text-orange-800', 'Current GW Points',
                getCurrentGameweekPoints() !== null ? getCurrentGameweekPoints() : '-', 'text-current-gw-points', `GW ${getCurrentGameweek()}`, 'text-orange-600')}
              {statCell('bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200 text-indigo-800', 'Total Points', getTotalPoints(), 'text-total-points', 'All gameweeks', 'text-indigo-600')}
            </div>
          )}

          {/* Legend: one line */}
          {teamData && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1">
              <span className="text-xs text-blue-800">
                <span className="font-semibold">Fixture difficulty:</span> each fixture shows the opponent (H home, A away), rated 1 (easiest) to 5 (hardest)
              </span>
              <div className="flex gap-2 items-center">
                {[1, 2, 3, 4, 5].map(diff => (
                  <div key={diff} className="flex items-center gap-1">
                    <div className={`w-3 h-3 rounded ${getDifficultyColor(diff)}`}></div>
                    <span className="text-xs font-medium text-gray-700">{diff}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Starting XI and Bench */}
          {teamData && (
            <div className="grid gap-2 lg:grid-cols-12 items-start">
              <Card className="bg-white shadow-lg border border-gray-200 lg:col-span-6">
                <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-t-lg !px-3 !py-1.5 space-y-0">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="h-4 w-4" />
                    Starting XI
                    <span className="text-xs font-normal text-emerald-50">Your team for Gameweek {getCurrentGameweek()}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {[1, 2, 3, 4].map(positionType => {
                    const playersInPosition = sortPlayersByPosition(teamData.picks.filter(pick => pick.position <= 11))
                      .filter(pick => getPlayerById(pick.element)?.element_type === positionType);
                    if (playersInPosition.length === 0) return null;
                    return (
                      <div key={positionType} className="border-b border-gray-100 last:border-b-0">
                        <div className={`px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${positionColors[positionType as keyof typeof positionColors]} border-l-4`}>
                          {getPositionName(positionType)}s ({playersInPosition.length})
                        </div>
                        {playersInPosition.map((pick, index) => renderPlayerRow(pick, `starting-player-${index}`))}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card className="bg-white shadow-lg border border-gray-200 lg:col-span-6">
                <CardHeader className="bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-t-lg !px-3 !py-1.5 space-y-0">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="h-4 w-4" />
                    Bench
                    <span className="text-xs font-normal text-gray-100">Substitute players</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {sortPlayersByPosition(teamData.picks.filter(pick => pick.position > 11))
                    .map((pick, index) => renderPlayerRow(pick, `bench-player-${index}`, pick.position - 11))}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
