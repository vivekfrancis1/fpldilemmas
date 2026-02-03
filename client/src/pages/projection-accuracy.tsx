import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Target, Users, BarChart3, TrendingUp, TrendingDown, Minus, AlertCircle, ChevronUp, ChevronDown, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingExperience } from "@/components/loading-experience";

interface PlayerProjectionRecord {
  id: number;
  snapshot_id: number;
  gameweek: number;
  season: string;
  player_id: number;
  player_name: string;
  team_id: number;
  team_name: string;
  position: string;
  projected_points: string;
  projected_minutes: string;
  projected_goals: string;
  projected_assists: string;
  projected_clean_sheet: string;
  projected_bonus: string;
  projected_saves: string;
  actual_points: number | null;
  actual_minutes: number | null;
  actual_goals: number | null;
  actual_assists: number | null;
  actual_clean_sheet: number | null;
  actual_bonus: number | null;
  actual_saves: number | null;
  points_difference: string | null;
  absolute_error: string | null;
  percentage_error: string | null;
}

interface TeamProjectionRecord {
  id: number;
  snapshot_id: number;
  gameweek: number;
  season: string;
  team_id: number;
  team_name: string;
  projected_goals_scored: string;
  projected_goals_conceded: string;
  projected_clean_sheet_prob: string;
  actual_goals_scored: number | null;
  actual_goals_conceded: number | null;
  actual_clean_sheet: number | null;
  goals_scored_difference: string | null;
  goals_conceded_difference: string | null;
}

interface GameweekAccuracyData {
  gameweek: number;
  season: string;
  players: PlayerProjectionRecord[];
  teams: TeamProjectionRecord[];
}

interface AggregatePlayerData {
  player_id: number;
  player_name: string;
  team_id: number;
  team_name: string;
  position: string;
  total_projected_points: number;
  gameweek_breakdown: Record<number, { projected: number; source: 'snapshot' | 'live' }>;
}

interface AggregateTeamData {
  team_id: number;
  team_name: string;
  total_projected_goals: number;
  gameweek_breakdown: Record<number, { projected: number; source: 'snapshot' | 'live' }>;
}

interface AggregateAccuracyData {
  season: string;
  gameweekRange: { start: number; end: number };
  currentGameweek: number;
  gwsWithSnapshot: number[];
  gwsWithLiveData: number[];
  players: AggregatePlayerData[];
  teams: AggregateTeamData[];
}

type SortField = 'name' | 'projected' | 'actual' | 'difference' | 'error';
type SortDirection = 'asc' | 'desc';

const TEAM_SHORT_CODES: Record<string, string> = {
  'Arsenal': 'ARS', 'Aston Villa': 'AVL', 'Bournemouth': 'BOU', 'Brentford': 'BRE',
  'Brighton': 'BHA', 'Chelsea': 'CHE', 'Crystal Palace': 'CRY', 'Everton': 'EVE',
  'Fulham': 'FUL', 'Ipswich': 'IPS', 'Leicester': 'LEI', 'Liverpool': 'LIV',
  'Man City': 'MCI', 'Man Utd': 'MUN', 'Newcastle': 'NEW', 'Nott\'m Forest': 'NFO',
  'Southampton': 'SOU', 'Spurs': 'TOT', 'West Ham': 'WHU', 'Wolves': 'WOL'
};

const getTeamShortCode = (teamName: string): string => {
  return TEAM_SHORT_CODES[teamName] || teamName?.substring(0, 3).toUpperCase() || 'UNK';
};

export default function ProjectionAccuracy() {
  const [selectedGameweek, setSelectedGameweek] = useState<number>(25);
  const [activeTab, setActiveTab] = useState<string>("players");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortField, setSortField] = useState<SortField>('projected');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [positionFilter, setPositionFilter] = useState<string>("all");

  const availableGameweeks = Array.from({ length: 14 }, (_, i) => i + 25);

  const { data: accuracyData, isLoading, error } = useQuery<GameweekAccuracyData>({
    queryKey: ['/api/projection-accuracy/gameweek', selectedGameweek],
  });

  const { data: bootstrapData } = useQuery<{ elements: Array<{ id: number; web_name: string }> }>({
    queryKey: ['/api/bootstrap-static'],
  });

  const { data: aggregateData, isLoading: aggregateLoading } = useQuery<AggregateAccuracyData>({
    queryKey: ['/api/projection-accuracy/aggregate'],
    enabled: activeTab === 'aggregate-players' || activeTab === 'aggregate-teams',
  });

  const playerIdToWebName = useMemo(() => {
    if (!bootstrapData?.elements) return new Map<number, string>();
    const map = new Map<number, string>();
    bootstrapData.elements.forEach(player => {
      map.set(player.id, player.web_name);
    });
    return map;
  }, [bootstrapData?.elements]);

  const uniqueTeams = useMemo(() => {
    if (!accuracyData?.players) return [];
    const teams = [...new Set(accuracyData.players.map(p => p.team_name))];
    return teams.sort();
  }, [accuracyData?.players]);

  const filteredPlayers = useMemo(() => {
    if (!accuracyData?.players) return [];
    
    let filtered = accuracyData.players.filter(player => {
      const matchesSearch = player.player_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTeam = teamFilter === "all" || player.team_name === teamFilter;
      const matchesPosition = positionFilter === "all" || player.position === positionFilter;
      return matchesSearch && matchesTeam && matchesPosition;
    });

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.player_name.localeCompare(b.player_name);
          break;
        case 'projected':
          comparison = parseFloat(a.projected_points) - parseFloat(b.projected_points);
          break;
        case 'actual':
          comparison = (a.actual_points || 0) - (b.actual_points || 0);
          break;
        case 'difference':
          comparison = Math.abs(parseFloat(a.points_difference || '0')) - Math.abs(parseFloat(b.points_difference || '0'));
          break;
        case 'error':
          comparison = parseFloat(a.absolute_error || '0') - parseFloat(b.absolute_error || '0');
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [accuracyData?.players, searchTerm, teamFilter, positionFilter, sortField, sortDirection]);

  const filteredTeams = useMemo(() => {
    if (!accuracyData?.teams) return [];
    
    let filtered = accuracyData.teams.filter(team => {
      return team.team_name.toLowerCase().includes(searchTerm.toLowerCase());
    });

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.team_name.localeCompare(b.team_name);
          break;
        case 'projected':
          comparison = parseFloat(a.projected_goals_scored) - parseFloat(b.projected_goals_scored);
          break;
        case 'actual':
          comparison = (a.actual_goals_scored || 0) - (b.actual_goals_scored || 0);
          break;
        case 'difference':
          comparison = Math.abs(parseFloat(a.goals_scored_difference || '0')) - Math.abs(parseFloat(b.goals_scored_difference || '0'));
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [accuracyData?.teams, searchTerm, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? 
      <ChevronUp className="h-4 w-4 inline ml-1" /> : 
      <ChevronDown className="h-4 w-4 inline ml-1" />;
  };

  const getDifferenceColor = (diff: string | null) => {
    if (diff === null) return 'text-gray-500';
    const value = parseFloat(diff);
    if (Math.abs(value) <= 1) return 'text-green-600';
    if (Math.abs(value) <= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getDifferenceIcon = (diff: string | null) => {
    if (diff === null) return <Minus className="h-4 w-4" />;
    const value = parseFloat(diff);
    if (value > 0) return <TrendingUp className="h-4 w-4" />;
    if (value < 0) return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const hasActuals = useMemo(() => {
    if (activeTab === 'players') {
      return accuracyData?.players?.some(p => p.actual_points !== null) || false;
    }
    return accuracyData?.teams?.some(t => t.actual_goals_scored !== null) || false;
  }, [accuracyData, activeTab]);

  const playerStats = useMemo(() => {
    if (!accuracyData?.players || !hasActuals) return null;
    const playersWithActuals = accuracyData.players.filter(p => p.actual_points !== null);
    if (playersWithActuals.length === 0) return null;

    const totalProjected = playersWithActuals.reduce((sum, p) => sum + parseFloat(p.projected_points), 0);
    const totalActual = playersWithActuals.reduce((sum, p) => sum + (p.actual_points || 0), 0);
    const avgError = playersWithActuals.reduce((sum, p) => sum + parseFloat(p.absolute_error || '0'), 0) / playersWithActuals.length;

    return {
      count: playersWithActuals.length,
      totalProjected: totalProjected.toFixed(1),
      totalActual: totalActual,
      avgError: avgError.toFixed(2)
    };
  }, [accuracyData?.players, hasActuals]);

  const teamStats = useMemo(() => {
    if (!accuracyData?.teams || !hasActuals) return null;
    const teamsWithActuals = accuracyData.teams.filter(t => t.actual_goals_scored !== null);
    if (teamsWithActuals.length === 0) return null;

    const totalProjectedGoals = teamsWithActuals.reduce((sum, t) => sum + parseFloat(t.projected_goals_scored), 0);
    const totalActualGoals = teamsWithActuals.reduce((sum, t) => sum + (t.actual_goals_scored || 0), 0);
    const avgGoalsDiff = teamsWithActuals.reduce((sum, t) => sum + Math.abs(parseFloat(t.goals_scored_difference || '0')), 0) / teamsWithActuals.length;

    return {
      count: teamsWithActuals.length,
      totalProjectedGoals: totalProjectedGoals.toFixed(1),
      totalActualGoals: totalActualGoals,
      avgGoalsDiff: avgGoalsDiff.toFixed(2)
    };
  }, [accuracyData?.teams, hasActuals]);

  if (isLoading) {
    return <LoadingExperience variant="table" message="Loading projection accuracy data..." />;
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <p>Failed to load projection accuracy data. Please try again later.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-2 sm:p-4 space-y-4">
      <Card className="border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
                <Target className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg sm:text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  Projection Accuracy
                </CardTitle>
                <p className="text-sm text-gray-500">Compare projected vs actual results (GW25-38)</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedGameweek.toString()} onValueChange={(v) => setSelectedGameweek(parseInt(v))}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Select GW" />
                </SelectTrigger>
                <SelectContent>
                  {availableGameweeks.map(gw => (
                    <SelectItem key={gw} value={gw.toString()}>Gameweek {gw}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!hasActuals && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-700">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Actual results not yet available for GW{selectedGameweek}</span>
              </div>
              <p className="text-xs text-yellow-600 mt-1">Projections have been captured. Actual values will be recorded when the gameweek finishes.</p>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="players" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Player Projections
              </TabsTrigger>
              <TabsTrigger value="teams" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Team Projections
              </TabsTrigger>
            </TabsList>

            <TabsContent value="players" className="mt-0">
              {playerStats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3">
                    <p className="text-xs text-blue-600 font-medium">Players Tracked</p>
                    <p className="text-xl font-bold text-blue-800">{playerStats.count}</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3">
                    <p className="text-xs text-purple-600 font-medium">Total Projected</p>
                    <p className="text-xl font-bold text-purple-800">{playerStats.totalProjected}</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3">
                    <p className="text-xs text-green-600 font-medium">Total Actual</p>
                    <p className="text-xl font-bold text-green-800">{playerStats.totalActual}</p>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-3">
                    <p className="text-xs text-orange-600 font-medium">Avg Error</p>
                    <p className="text-xl font-bold text-orange-800">{playerStats.avgError}</p>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search players..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={teamFilter} onValueChange={setTeamFilter}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="All Teams" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Teams</SelectItem>
                    {uniqueTeams.map(team => (
                      <SelectItem key={team} value={team}>{team}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={positionFilter} onValueChange={setPositionFilter}>
                  <SelectTrigger className="w-full sm:w-[120px]">
                    <SelectValue placeholder="Position" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Positions</SelectItem>
                    <SelectItem value="GKP">GKP</SelectItem>
                    <SelectItem value="DEF">DEF</SelectItem>
                    <SelectItem value="MID">MID</SelectItem>
                    <SelectItem value="FWD">FWD</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left p-3 font-semibold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('name')}>
                        Player <SortIcon field="name" />
                      </th>
                      <th className="text-center p-3 font-semibold hidden sm:table-cell">Team</th>
                      <th className="text-center p-3 font-semibold hidden sm:table-cell">Pos</th>
                      <th className="text-center p-3 font-semibold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('projected')}>
                        Projected <SortIcon field="projected" />
                      </th>
                      <th className="text-center p-3 font-semibold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('actual')}>
                        Actual <SortIcon field="actual" />
                      </th>
                      <th className="text-center p-3 font-semibold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('difference')}>
                        Diff <SortIcon field="difference" />
                      </th>
                      <th className="text-center p-3 font-semibold cursor-pointer hover:bg-gray-100 hidden sm:table-cell" onClick={() => handleSort('error')}>
                        Error <SortIcon field="error" />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPlayers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center p-8 text-gray-500">
                          No player projections found for GW{selectedGameweek}
                        </td>
                      </tr>
                    ) : (
                      filteredPlayers.map((player) => {
                        const shortName = playerIdToWebName.get(player.player_id) || player.player_name.split(' ').pop() || player.player_name;
                        const teamShort = getTeamShortCode(player.team_name);
                        const posShort = (player.position?.substring(0, 3) || player.position)?.toUpperCase();
                        return (
                          <tr key={player.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="p-3">
                              <div className="font-medium text-gray-900">{shortName}</div>
                              <div className="text-xs text-gray-500 sm:hidden">{teamShort} • {posShort}</div>
                            </td>
                            <td className="text-center p-3 hidden sm:table-cell">
                              <Badge variant="outline" className="text-xs">{teamShort}</Badge>
                            </td>
                            <td className="text-center p-3 hidden sm:table-cell">
                              <Badge variant="secondary" className="text-xs">{posShort}</Badge>
                            </td>
                            <td className="text-center p-3 font-medium text-purple-600">
                              {parseFloat(player.projected_points).toFixed(2)}
                            </td>
                            <td className="text-center p-3 font-medium">
                              {player.actual_points !== null ? (
                                <span className="text-green-600">{player.actual_points}</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className={`text-center p-3 font-medium ${getDifferenceColor(player.points_difference)}`}>
                              <div className="flex items-center justify-center gap-1">
                                {getDifferenceIcon(player.points_difference)}
                                {player.points_difference !== null ? parseFloat(player.points_difference).toFixed(2) : '-'}
                              </div>
                            </td>
                            <td className="text-center p-3 hidden sm:table-cell">
                              {player.absolute_error !== null ? (
                                <span className="text-gray-600">{parseFloat(player.absolute_error).toFixed(2)}</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {filteredPlayers.length > 0 && (
                <p className="text-xs text-gray-500 mt-2 text-right">Showing {filteredPlayers.length} players</p>
              )}
            </TabsContent>

            <TabsContent value="teams" className="mt-0">
              {teamStats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3">
                    <p className="text-xs text-blue-600 font-medium">Teams Tracked</p>
                    <p className="text-xl font-bold text-blue-800">{teamStats.count}</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3">
                    <p className="text-xs text-purple-600 font-medium">Projected Goals</p>
                    <p className="text-xl font-bold text-purple-800">{teamStats.totalProjectedGoals}</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3">
                    <p className="text-xs text-green-600 font-medium">Actual Goals</p>
                    <p className="text-xl font-bold text-green-800">{teamStats.totalActualGoals}</p>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-3">
                    <p className="text-xs text-orange-600 font-medium">Avg Goals Diff</p>
                    <p className="text-xl font-bold text-orange-800">{teamStats.avgGoalsDiff}</p>
                  </div>
                </div>
              )}

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search teams..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left p-3 font-semibold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('name')}>
                        Team <SortIcon field="name" />
                      </th>
                      <th className="text-center p-3 font-semibold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('projected')}>
                        Proj Goals <SortIcon field="projected" />
                      </th>
                      <th className="text-center p-3 font-semibold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('actual')}>
                        Actual Goals <SortIcon field="actual" />
                      </th>
                      <th className="text-center p-3 font-semibold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('difference')}>
                        Goals Diff <SortIcon field="difference" />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTeams.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center p-8 text-gray-500">
                          No team projections found for GW{selectedGameweek}
                        </td>
                      </tr>
                    ) : (
                      filteredTeams.map((team) => (
                        <tr key={team.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="p-3 font-medium text-gray-900">{getTeamShortCode(team.team_name)}</td>
                          <td className="text-center p-3 font-medium text-purple-600">
                            {parseFloat(team.projected_goals_scored).toFixed(2)}
                          </td>
                          <td className="text-center p-3 font-medium">
                            {team.actual_goals_scored !== null ? (
                              <span className="text-green-600">{team.actual_goals_scored}</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className={`text-center p-3 font-medium ${getDifferenceColor(team.goals_scored_difference)}`}>
                            <div className="flex items-center justify-center gap-1">
                              {getDifferenceIcon(team.goals_scored_difference)}
                              {team.goals_scored_difference !== null ? parseFloat(team.goals_scored_difference).toFixed(2) : '-'}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {filteredTeams.length > 0 && (
                <p className="text-xs text-gray-500 mt-2 text-right">Showing {filteredTeams.length} teams</p>
              )}
            </TabsContent>

            {/* Aggregate Player Projections - Total Points across all GW25-38 */}
            <TabsContent value="aggregate-players" className="mt-0">
              {aggregateLoading ? (
                <LoadingExperience variant="analysis" message="Loading aggregate projections..." />
              ) : aggregateData ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3">
                      <p className="text-xs text-purple-600 font-medium">Players Tracked</p>
                      <p className="text-xl font-bold text-purple-800">{aggregateData.players.length}</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3">
                      <p className="text-xs text-blue-600 font-medium">Locked GWs</p>
                      <p className="text-xl font-bold text-blue-800">{aggregateData.gwsWithSnapshot.length}</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3">
                      <p className="text-xs text-green-600 font-medium">Live GWs</p>
                      <p className="text-xl font-bold text-green-800">{aggregateData.gwsWithLiveData.length}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">
                    Showing total projected points across GW{aggregateData.gameweekRange.start}-{aggregateData.gameweekRange.end}. 
                    Locked: GW{aggregateData.gwsWithSnapshot.join(', GW') || 'None'} | 
                    Live: GW{aggregateData.gwsWithLiveData.join(', GW') || 'None'}
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-3 font-semibold">Player</th>
                          <th className="text-center p-3 font-semibold">Team</th>
                          <th className="text-center p-3 font-semibold">Pos</th>
                          <th className="text-center p-3 font-semibold">Total Proj Pts (GW25-38)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {aggregateData.players.slice(0, 100).map((player) => {
                          const webName = playerIdToWebName.get(player.player_id) || player.player_name.split(' ').pop() || player.player_name;
                          return (
                            <tr key={player.player_id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="p-3 font-medium text-gray-900">{webName}</td>
                              <td className="text-center p-3 text-gray-600">{getTeamShortCode(player.team_name)}</td>
                              <td className="text-center p-3 text-gray-600">{(player.position?.substring(0, 3) || player.position)?.toUpperCase()}</td>
                              <td className="text-center p-3 font-bold text-purple-600">
                                {player.total_projected_points.toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 text-right">
                    Showing top {Math.min(100, aggregateData.players.length)} of {aggregateData.players.length} players
                  </p>
                </>
              ) : (
                <p className="text-center text-gray-500 py-8">No aggregate data available</p>
              )}
            </TabsContent>

            {/* Aggregate Team Projections - Total Goals across all GW25-38 */}
            <TabsContent value="aggregate-teams" className="mt-0">
              {aggregateLoading ? (
                <LoadingExperience variant="analysis" message="Loading aggregate projections..." />
              ) : aggregateData ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3">
                      <p className="text-xs text-purple-600 font-medium">Teams Tracked</p>
                      <p className="text-xl font-bold text-purple-800">{aggregateData.teams.length}</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3">
                      <p className="text-xs text-blue-600 font-medium">Locked GWs</p>
                      <p className="text-xl font-bold text-blue-800">{aggregateData.gwsWithSnapshot.length}</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3">
                      <p className="text-xs text-green-600 font-medium">Live GWs</p>
                      <p className="text-xl font-bold text-green-800">{aggregateData.gwsWithLiveData.length}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">
                    Showing total projected goals across GW{aggregateData.gameweekRange.start}-{aggregateData.gameweekRange.end}. 
                    Locked: GW{aggregateData.gwsWithSnapshot.join(', GW') || 'None'} | 
                    Live: GW{aggregateData.gwsWithLiveData.join(', GW') || 'None'}
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-3 font-semibold">Team</th>
                          <th className="text-center p-3 font-semibold">Total Proj Goals (GW25-38)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {aggregateData.teams.map((team) => (
                          <tr key={team.team_id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="p-3 font-medium text-gray-900">{getTeamShortCode(team.team_name)}</td>
                            <td className="text-center p-3 font-bold text-purple-600">
                              {team.total_projected_goals.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 text-right">
                    Showing {aggregateData.teams.length} teams
                  </p>
                </>
              ) : (
                <p className="text-center text-gray-500 py-8">No aggregate data available</p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
