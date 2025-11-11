import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trophy, TrendingUp, Target, Users, RefreshCw, ChevronUp, ChevronDown, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CurrentTeamStanding {
  id: number;
  name: string;
  shortName: string;
  position: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  // Enhanced statistics from backend API
  cleanSheets: number;
  yellowCards: number;
  redCards: number;
  saves: number;
  ownGoals: number;
  penaltiesSaved: number;
  penaltiesMissed: number;
  expectedGoalsFor: number;
  expectedGoalsAgainst: number;
  tackles: number;
  defensiveActions: number;
  defensiveContributions: number;
  // Calculated fields
  adjustedGoalRate: number;
  adjustedGoalsAgainstRate: number;
}

type SortField = keyof CurrentTeamStanding;
type SortDirection = 'asc' | 'desc';

export default function CurrentStandings() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sortField, setSortField] = useState<SortField>('position');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [venue, setVenue] = useState<'all' | 'home' | 'away'>('all');
  const [statsView, setStatsView] = useState<'totals' | 'per-game'>('totals');
  const queryClient = useQueryClient();

  const { data: standingsData, isLoading, error } = useQuery<CurrentTeamStanding[]>({
    queryKey: ["/api/current-standings", venue],
    queryFn: async () => {
      const response = await fetch(`/api/current-standings?venue=${venue}`);
      if (!response.ok) {
        throw new Error('Failed to fetch current standings');
      }
      const data = await response.json();
      
      // Return raw data, AGR and AGAR will be calculated based on statsView
      return data;
    },
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["/api/current-standings", venue] });
    setIsRefreshing(false);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Transform data based on stats view (totals vs per-game)
  const displayData = (standingsData || []).map(team => {
    // Calculate AGR and AGAR based on statsView
    // For totals: AGR = 0.5 * (Goals For + xGF)
    // For per-game: AGR = 0.5 * (Goals For + xGF) / played
    const adjustedGoalRate = statsView === 'per-game' && team.played > 0
      ? 0.5 * (team.goalsFor + team.expectedGoalsFor) / team.played
      : 0.5 * (team.goalsFor + team.expectedGoalsFor);
    
    const adjustedGoalsAgainstRate = statsView === 'per-game' && team.played > 0
      ? 0.5 * (team.goalsAgainst + team.expectedGoalsAgainst) / team.played
      : 0.5 * (team.goalsAgainst + team.expectedGoalsAgainst);
    
    if (statsView === 'per-game' && team.played > 0) {
      return {
        ...team,
        goalsFor: team.goalsFor / team.played,
        goalsAgainst: team.goalsAgainst / team.played,
        goalDifference: team.goalDifference / team.played,
        points: team.points / team.played,
        cleanSheets: team.cleanSheets / team.played,
        yellowCards: team.yellowCards / team.played,
        redCards: team.redCards / team.played,
        saves: team.saves / team.played,
        ownGoals: team.ownGoals / team.played,
        penaltiesSaved: team.penaltiesSaved / team.played,
        penaltiesMissed: team.penaltiesMissed / team.played,
        expectedGoalsFor: team.expectedGoalsFor / team.played,
        expectedGoalsAgainst: team.expectedGoalsAgainst / team.played,
        tackles: team.tackles / team.played,
        defensiveActions: team.defensiveActions / team.played,
        defensiveContributions: team.defensiveContributions / team.played,
        adjustedGoalRate,
        adjustedGoalsAgainstRate,
      };
    }
    return {
      ...team,
      adjustedGoalRate,
      adjustedGoalsAgainstRate,
    };
  });

  const sortedData = [...displayData].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' 
        ? aValue - bValue
        : bValue - aValue;
    }
    
    return 0;
  });

  // Calculate totals and averages using displayData (which respects both venue and stats view filters)
  const calculateSummaryStats = () => {
    if (!displayData || displayData.length === 0) return null;
    
    const totals = displayData.reduce((acc, team) => ({
      played: acc.played + team.played,
      wins: acc.wins + team.wins,
      draws: acc.draws + team.draws,
      losses: acc.losses + team.losses,
      goalsFor: acc.goalsFor + team.goalsFor,
      goalsAgainst: acc.goalsAgainst + team.goalsAgainst,
      goalDifference: acc.goalDifference + team.goalDifference,
      points: acc.points + team.points,
      cleanSheets: acc.cleanSheets + team.cleanSheets,
      yellowCards: acc.yellowCards + team.yellowCards,
      redCards: acc.redCards + team.redCards,
      saves: acc.saves + team.saves,
      ownGoals: acc.ownGoals + team.ownGoals,
      penaltiesSaved: acc.penaltiesSaved + team.penaltiesSaved,
      penaltiesMissed: acc.penaltiesMissed + team.penaltiesMissed,
      expectedGoalsFor: acc.expectedGoalsFor + team.expectedGoalsFor,
      expectedGoalsAgainst: acc.expectedGoalsAgainst + team.expectedGoalsAgainst,
      tackles: acc.tackles + team.tackles,
      defensiveActions: acc.defensiveActions + team.defensiveActions,
      defensiveContributions: acc.defensiveContributions + team.defensiveContributions,
      adjustedGoalRate: acc.adjustedGoalRate + (team.adjustedGoalRate || 0),
      adjustedGoalsAgainstRate: acc.adjustedGoalsAgainstRate + (team.adjustedGoalsAgainstRate || 0),
    }), {
      played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0,
      goalDifference: 0, points: 0, cleanSheets: 0, yellowCards: 0, redCards: 0,
      saves: 0, ownGoals: 0, penaltiesSaved: 0, penaltiesMissed: 0,
      expectedGoalsFor: 0, expectedGoalsAgainst: 0, tackles: 0, defensiveActions: 0,
      defensiveContributions: 0, adjustedGoalRate: 0, adjustedGoalsAgainstRate: 0
    });

    const teamCount = displayData.length;
    const averages = {
      played: totals.played / teamCount,
      wins: totals.wins / teamCount,
      draws: totals.draws / teamCount,
      losses: totals.losses / teamCount,
      goalsFor: totals.goalsFor / teamCount,
      goalsAgainst: totals.goalsAgainst / teamCount,
      goalDifference: totals.goalDifference / teamCount,
      points: totals.points / teamCount,
      cleanSheets: totals.cleanSheets / teamCount,
      yellowCards: totals.yellowCards / teamCount,
      redCards: totals.redCards / teamCount,
      saves: totals.saves / teamCount,
      ownGoals: totals.ownGoals / teamCount,
      penaltiesSaved: totals.penaltiesSaved / teamCount,
      penaltiesMissed: totals.penaltiesMissed / teamCount,
      expectedGoalsFor: totals.expectedGoalsFor / teamCount,
      expectedGoalsAgainst: totals.expectedGoalsAgainst / teamCount,
      tackles: totals.tackles / teamCount,
      defensiveActions: totals.defensiveActions / teamCount,
      defensiveContributions: totals.defensiveContributions / teamCount,
      adjustedGoalRate: totals.adjustedGoalRate / teamCount,
      adjustedGoalsAgainstRate: totals.adjustedGoalsAgainstRate / teamCount,
    };

    return { totals, averages };
  };

  const summaryStats = calculateSummaryStats();

  // Use the sorted data without adding multipliers
  const dataWithMultipliers = sortedData || [];

  // Helper function to format stat values based on view mode
  const formatStat = (value: number) => {
    if (statsView === 'per-game') {
      return value.toFixed(2);
    }
    return Math.round(value);
  };

  const SortableHeader = ({ field, children, tooltip }: { field: SortField; children: React.ReactNode; tooltip: string }) => (
    <th 
      className="px-2 sm:px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
      onClick={() => handleSort(field)}
      data-testid={`sort-${field}`}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center justify-center gap-1">
            {children}
            <Info className="h-3 w-3 opacity-50" />
            {sortField === field && (
              sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </th>
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fpl-page-container">
        <div className="flex justify-center items-center min-h-screen">
          <Card className="p-6">
            <CardContent>
              <p className="text-red-600">Failed to load current standings. Please try again.</p>
              <Button onClick={handleRefresh} className="mt-4" data-testid="button-retry-standings">
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
    <div className="fpl-page-container">
      {/* Unified Page Header */}
      <div className="fpl-page-header">
        <div className="fpl-page-header-content">
          <div className="fpl-page-title">
            <Trophy className="h-8 w-8" />
            <h1>Team Statistics</h1>
          </div>
          <p className="fpl-page-subtitle">
            Enhanced Premier League table with detailed statistics from completed matches and official results
          </p>
          <div className="mt-6">
            <Button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="bg-purple-600 hover:bg-purple-700 text-white"
              data-testid="button-refresh-current-standings"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh Table'}
            </Button>
          </div>
        </div>
      </div>

      <div className="fpl-section-spacing">
        {/* Current Status Info */}
        <Card className="mb-6 shadow-md border-0">
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-6 items-center justify-between">
              <div className="flex flex-wrap gap-6 items-center">
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-semibold text-gray-700">
                    Official Premier League Table
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-semibold text-gray-700">
                    Based on: Completed Matches Only
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-semibold text-gray-700">
                    Updated: After Each Gameweek
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="mb-6 shadow-md border-0 bg-white">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold text-gray-700">Filter by Venue:</label>
                <Select value={venue} onValueChange={(value: 'all' | 'home' | 'away') => setVenue(value)}>
                  <SelectTrigger className="w-[160px] bg-white" data-testid="select-venue-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" data-testid="option-venue-all">All Matches</SelectItem>
                    <SelectItem value="home" data-testid="option-venue-home">Home Only</SelectItem>
                    <SelectItem value="away" data-testid="option-venue-away">Away Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold text-gray-700">Statistics View:</label>
                <Select value={statsView} onValueChange={(value: 'totals' | 'per-game') => setStatsView(value)}>
                  <SelectTrigger className="w-[180px] bg-white" data-testid="select-stats-view">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="totals" data-testid="option-stats-totals">Season Totals</SelectItem>
                    <SelectItem value="per-game" data-testid="option-stats-per-game">Average per Game</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Current Standings Table */}
        <Card className="overflow-hidden shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
            <CardTitle className="flex items-center gap-3 text-xl">
              <Trophy className="h-6 w-6" />
              Enhanced Premier League Table
              <Badge className="bg-white/20 text-white border-white/30 ml-auto">
                Detailed Statistics
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] lg:min-w-[1400px]">
                <thead className="bg-gray-50">
                  <tr>
                    {/* Position & Team Info */}
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 border-r cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('position')}
                        data-testid="sort-position">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-center gap-1">
                            Pos
                            <Info className="h-3 w-3 opacity-50" />
                            {sortField === 'position' && (
                              sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm">League position (1st to 20th)</p>
                        </TooltipContent>
                      </Tooltip>
                    </th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-12 sm:left-16 bg-gray-50 z-10 border-r min-w-[80px] cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('name')}
                        data-testid="sort-name">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1">
                            Team
                            <Info className="h-3 w-3 opacity-50" />
                            {sortField === 'name' && (
                              sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm">Team name</p>
                        </TooltipContent>
                      </Tooltip>
                    </th>
                    
                    {/* Match Record */}
                    <SortableHeader field="played" tooltip="Matches played this season">P</SortableHeader>
                    <SortableHeader field="wins" tooltip="Matches won (3 points each)">W</SortableHeader>
                    <SortableHeader field="draws" tooltip="Matches drawn (1 point each)">D</SortableHeader>
                    <SortableHeader field="losses" tooltip="Matches lost (0 points)">L</SortableHeader>
                    
                    {/* Goals */}
                    <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-l cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('goalsFor')}
                        data-testid="sort-goalsFor">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-center gap-1">
                            GF
                            <Info className="h-3 w-3 opacity-50" />
                            {sortField === 'goalsFor' && (
                              sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm">Goals scored by the team</p>
                        </TooltipContent>
                      </Tooltip>
                    </th>
                    <SortableHeader field="goalsAgainst" tooltip="Goals conceded by the team">GA</SortableHeader>
                    <SortableHeader field="goalDifference" tooltip="Goal difference (Goals For - Goals Against)">GD</SortableHeader>
                    
                    {/* Points */}
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-l bg-blue-50 cursor-pointer hover:bg-blue-100 transition-colors"
                        onClick={() => handleSort('points')}
                        data-testid="sort-points">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-center gap-1">
                            Pts
                            <Info className="h-3 w-3 opacity-50" />
                            {sortField === 'points' && (
                              sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm">Total points (3 for win, 1 for draw, 0 for loss)</p>
                        </TooltipContent>
                      </Tooltip>
                    </th>
                    
                    {/* Expected Goals - After Points */}
                    <SortableHeader field="expectedGoalsFor" tooltip="Expected Goals For - statistical model of scoring chances">xGF</SortableHeader>
                    <SortableHeader field="expectedGoalsAgainst" tooltip="Expected Goals Against - statistical model of chances conceded">xGA</SortableHeader>
                    <SortableHeader 
                      field="adjustedGoalRate" 
                      tooltip={statsView === 'per-game' 
                        ? "Adjusted Goal Rate: 0.5 × (Goals For + xGF) per game" 
                        : "Adjusted Goal Rate: 0.5 × (Goals For + xGF) season total"}>
                      AGR
                    </SortableHeader>
                    <SortableHeader 
                      field="adjustedGoalsAgainstRate" 
                      tooltip={statsView === 'per-game'
                        ? "Adjusted Goals Against Rate: 0.5 × (Goals Against + xGA) per game"
                        : "Adjusted Goals Against Rate: 0.5 × (Goals Against + xGA) season total"}>
                      AGAR
                    </SortableHeader>
                    
                    {/* Defensive Stats - After xGA */}
                    <SortableHeader field="tackles" tooltip="Total tackles made by the team">T</SortableHeader>
                    <SortableHeader field="defensiveActions" tooltip="Defensive actions (interceptions, blocks, clearances)">DA</SortableHeader>
                    <SortableHeader field="defensiveContributions" tooltip="Defensive Contributions (CBI + Tackles + Recoveries, position-weighted)">DC</SortableHeader>
                    
                    {/* Enhanced Statistics */}
                    <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-l cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('cleanSheets')}
                        data-testid="sort-cleanSheets">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-center gap-1">
                            CS
                            <Info className="h-3 w-3 opacity-50" />
                            {sortField === 'cleanSheets' && (
                              sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm">Clean sheets (matches without conceding a goal)</p>
                        </TooltipContent>
                      </Tooltip>
                    </th>
                    <SortableHeader field="yellowCards" tooltip="Yellow cards received by team players">YC</SortableHeader>
                    <SortableHeader field="redCards" tooltip="Red cards received by team players">RC</SortableHeader>
                    <SortableHeader field="saves" tooltip="Goalkeeper saves made by the team">Saves</SortableHeader>
                    <SortableHeader field="penaltiesSaved" tooltip="Penalties saved by team goalkeepers">PS</SortableHeader>
                    <SortableHeader field="ownGoals" tooltip="Own goals scored by team players">OG</SortableHeader>
                    <SortableHeader field="penaltiesMissed" tooltip="Penalties missed by team players">PM</SortableHeader>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dataWithMultipliers?.map((team) => (
                    <tr key={team.id} className="hover:bg-gray-50" data-testid={`current-standing-row-${team.shortName}`}>
                      {/* Position & Team Info */}
                      <td className="px-3 py-4 text-center sticky left-0 bg-white hover:bg-gray-50 border-r">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold bg-gray-500 text-white">
                          {team.position}
                        </div>
                      </td>
                      
                      <td className="px-2 sm:px-4 py-4 sticky left-12 sm:left-16 bg-white hover:bg-gray-50 border-r min-w-[80px]">
                        <div className="flex items-center">
                          <div className="text-sm font-medium text-gray-900" data-testid={`team-name-${team.shortName}`}>
                            {team.shortName}
                          </div>
                        </div>
                      </td>
                      
                      {/* Match Record */}
                      <td className="px-2 py-4 text-center text-sm font-medium text-gray-900" data-testid={`played-${team.shortName}`}>
                        {team.played}
                      </td>
                      <td className="px-2 py-4 text-center text-sm font-medium text-green-600" data-testid={`wins-${team.shortName}`}>
                        {team.wins}
                      </td>
                      <td className="px-2 py-4 text-center text-sm font-medium text-gray-600" data-testid={`draws-${team.shortName}`}>
                        {team.draws}
                      </td>
                      <td className="px-2 py-4 text-center text-sm font-medium text-red-600" data-testid={`losses-${team.shortName}`}>
                        {team.losses}
                      </td>
                      
                      {/* Goals */}
                      <td className="px-2 py-4 text-center text-sm font-medium text-gray-900 border-l" data-testid={`goals-for-${team.shortName}`}>
                        {formatStat(team.goalsFor)}
                      </td>
                      <td className="px-2 py-4 text-center text-sm font-medium text-gray-900" data-testid={`goals-against-${team.shortName}`}>
                        {formatStat(team.goalsAgainst)}
                      </td>
                      <td className="px-2 py-4 text-center text-sm font-medium" data-testid={`goal-difference-${team.shortName}`}>
                        <span className={team.goalDifference >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {team.goalDifference >= 0 ? '+' : ''}{formatStat(team.goalDifference)}
                        </span>
                      </td>
                      
                      {/* Points */}
                      <td className="px-3 py-4 text-center text-sm font-bold text-gray-900 border-l bg-blue-50" data-testid={`points-${team.shortName}`}>
                        {formatStat(team.points)}
                      </td>
                      
                      {/* Expected Goals - After Points */}
                      <td className="px-2 py-4 text-center text-sm font-medium text-indigo-600" data-testid={`expected-goals-for-${team.shortName}`}>
                        {formatStat(team.expectedGoalsFor)}
                      </td>
                      <td className="px-2 py-4 text-center text-sm font-medium text-indigo-500" data-testid={`expected-goals-against-${team.shortName}`}>
                        {formatStat(team.expectedGoalsAgainst)}
                      </td>
                      <td className="px-2 py-4 text-center text-sm font-medium text-purple-600" data-testid={`adjusted-goal-rate-${team.shortName}`}>
                        {team.adjustedGoalRate ? team.adjustedGoalRate.toFixed(2) : '0.00'}
                      </td>
                      <td className="px-2 py-4 text-center text-sm font-medium text-orange-600" data-testid={`adjusted-goals-against-rate-${team.shortName}`}>
                        {team.adjustedGoalsAgainstRate ? team.adjustedGoalsAgainstRate.toFixed(2) : '0.00'}
                      </td>
                      
                      {/* Defensive Stats - After xGA */}
                      <td className="px-2 py-4 text-center text-sm font-medium text-teal-600" data-testid={`tackles-${team.shortName}`}>
                        {formatStat(team.tackles)}
                      </td>
                      <td className="px-2 py-4 text-center text-sm font-medium text-teal-500" data-testid={`defensive-actions-${team.shortName}`}>
                        {formatStat(team.defensiveActions)}
                      </td>
                      <td className="px-2 py-4 text-center text-sm font-medium text-teal-700" data-testid={`defensive-contributions-${team.shortName}`}>
                        {formatStat(team.defensiveContributions)}
                      </td>
                      
                      {/* Clean Sheets */}
                      <td className="px-2 py-4 text-center text-sm font-medium text-blue-600 border-l" data-testid={`clean-sheets-${team.shortName}`}>
                        {formatStat(team.cleanSheets)}
                      </td>
                      
                      {/* Cards */}
                      <td className="px-2 py-4 text-center text-sm font-medium text-yellow-600" data-testid={`yellow-cards-${team.shortName}`}>
                        {formatStat(team.yellowCards)}
                      </td>
                      <td className="px-2 py-4 text-center text-sm font-medium text-red-600" data-testid={`red-cards-${team.shortName}`}>
                        {formatStat(team.redCards)}
                      </td>
                      
                      {/* GK Stats */}
                      <td className="px-2 py-4 text-center text-sm font-medium text-purple-600 border-l" data-testid={`saves-${team.shortName}`}>
                        {formatStat(team.saves)}
                      </td>
                      <td className="px-2 py-4 text-center text-sm font-medium text-green-600" data-testid={`penalties-saved-${team.shortName}`}>
                        {formatStat(team.penaltiesSaved)}
                      </td>
                      
                      {/* Other Events */}
                      <td className="px-2 py-4 text-center text-sm font-medium text-orange-600 border-l" data-testid={`own-goals-${team.shortName}`}>
                        {formatStat(team.ownGoals)}
                      </td>
                      <td className="px-2 py-4 text-center text-sm font-medium text-red-500" data-testid={`penalties-missed-${team.shortName}`}>
                        {formatStat(team.penaltiesMissed)}
                      </td>
                    </tr>
                  ))}
                  
                  {/* Total Row */}
                  {summaryStats && (
                    <tr className="bg-gray-100 border-t-2 border-gray-300 font-semibold" data-testid="totals-row">
                      {/* Position & Team Info */}
                      <td className="px-3 py-4 text-center sticky left-0 bg-gray-100 border-r">
                        <div className="text-xs font-bold text-gray-700">TOT</div>
                      </td>
                      <td className="px-2 sm:px-4 py-4 sticky left-12 sm:left-16 bg-gray-100 border-r min-w-[80px]">
                        <div className="text-sm font-bold text-gray-900">TOTAL</div>
                      </td>
                      
                      {/* Match Record */}
                      <td className="px-2 py-4 text-center text-sm font-semibold text-gray-900">{summaryStats.totals.played.toFixed(2)}</td>
                      <td className="px-2 py-4 text-center text-sm font-semibold text-green-600">{summaryStats.totals.wins.toFixed(2)}</td>
                      <td className="px-2 py-4 text-center text-sm font-semibold text-gray-600">{summaryStats.totals.draws.toFixed(2)}</td>
                      <td className="px-2 py-4 text-center text-sm font-semibold text-red-600">{summaryStats.totals.losses.toFixed(2)}</td>
                      
                      {/* Goals */}
                      <td className="px-2 py-4 text-center text-sm font-semibold text-gray-900 border-l">{summaryStats.totals.goalsFor.toFixed(2)}</td>
                      <td className="px-2 py-4 text-center text-sm font-semibold text-gray-900">{summaryStats.totals.goalsAgainst.toFixed(2)}</td>
                      <td className="px-2 py-4 text-center text-sm font-semibold text-gray-900">
                        <span className={summaryStats.totals.goalDifference >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {summaryStats.totals.goalDifference >= 0 ? '+' : ''}{summaryStats.totals.goalDifference.toFixed(2)}
                        </span>
                      </td>
                      
                      {/* Points */}
                      <td className="px-3 py-4 text-center text-sm font-bold text-gray-900 border-l bg-blue-100">{summaryStats.totals.points.toFixed(2)}</td>
                      
                      {/* Expected Goals */}
                      <td className="px-2 py-4 text-center text-sm font-semibold text-indigo-600">{summaryStats.totals.expectedGoalsFor.toFixed(2)}</td>
                      <td className="px-2 py-4 text-center text-sm font-semibold text-indigo-500">{summaryStats.totals.expectedGoalsAgainst.toFixed(2)}</td>
                      <td className="px-2 py-4 text-center text-sm font-semibold text-purple-600">{summaryStats.totals.adjustedGoalRate.toFixed(2)}</td>
                      <td className="px-2 py-4 text-center text-sm font-semibold text-orange-600">{summaryStats.totals.adjustedGoalsAgainstRate.toFixed(2)}</td>
                      
                      {/* Defensive Stats */}
                      <td className="px-2 py-4 text-center text-sm font-semibold text-teal-600">{summaryStats.totals.tackles.toFixed(2)}</td>
                      <td className="px-2 py-4 text-center text-sm font-semibold text-teal-500">{summaryStats.totals.defensiveActions.toFixed(2)}</td>
                      <td className="px-2 py-4 text-center text-sm font-semibold text-teal-700">{summaryStats.totals.defensiveContributions.toFixed(2)}</td>
                      
                      {/* Enhanced Statistics */}
                      <td className="px-2 py-4 text-center text-sm font-semibold text-blue-600 border-l">{summaryStats.totals.cleanSheets.toFixed(2)}</td>
                      <td className="px-2 py-4 text-center text-sm font-semibold text-yellow-600">{summaryStats.totals.yellowCards.toFixed(2)}</td>
                      <td className="px-2 py-4 text-center text-sm font-semibold text-red-600">{summaryStats.totals.redCards.toFixed(2)}</td>
                      <td className="px-2 py-4 text-center text-sm font-semibold text-purple-600 border-l">{summaryStats.totals.saves.toFixed(2)}</td>
                      <td className="px-2 py-4 text-center text-sm font-semibold text-green-600">{summaryStats.totals.penaltiesSaved.toFixed(2)}</td>
                      <td className="px-2 py-4 text-center text-sm font-semibold text-orange-600 border-l">{summaryStats.totals.ownGoals.toFixed(2)}</td>
                      <td className="px-2 py-4 text-center text-sm font-semibold text-red-500">{summaryStats.totals.penaltiesMissed.toFixed(2)}</td>
                    </tr>
                  )}
                  
                  {/* Average Row */}
                  {summaryStats && (
                    <tr className="bg-blue-50 border-t border-gray-200 font-medium" data-testid="averages-row">
                      {/* Position & Team Info */}
                      <td className="px-3 py-4 text-center sticky left-0 bg-blue-50 border-r">
                        <div className="text-xs font-bold text-blue-700">AVG</div>
                      </td>
                      <td className="px-2 sm:px-4 py-4 sticky left-12 sm:left-16 bg-blue-50 border-r min-w-[80px]">
                        <div className="text-sm font-bold text-blue-900">AVERAGE</div>
                      </td>
                      
                      {/* Match Record */}
                      <td className="px-2 py-4 text-center text-sm font-medium text-gray-800">{summaryStats.averages.played.toFixed(1)}</td>
                      <td className="px-2 py-4 text-center text-sm font-medium text-green-700">{summaryStats.averages.wins.toFixed(1)}</td>
                      <td className="px-2 py-4 text-center text-sm font-medium text-gray-700">{summaryStats.averages.draws.toFixed(1)}</td>
                      <td className="px-2 py-4 text-center text-sm font-medium text-red-700">{summaryStats.averages.losses.toFixed(1)}</td>
                      
                      {/* Goals */}
                      <td className="px-2 py-4 text-center text-sm font-medium text-gray-800 border-l">{summaryStats.averages.goalsFor.toFixed(1)}</td>
                      <td className="px-2 py-4 text-center text-sm font-medium text-gray-800">{summaryStats.averages.goalsAgainst.toFixed(1)}</td>
                      <td className="px-2 py-4 text-center text-sm font-medium text-gray-800">
                        <span className={summaryStats.averages.goalDifference >= 0 ? 'text-green-700' : 'text-red-700'}>
                          {summaryStats.averages.goalDifference >= 0 ? '+' : ''}{summaryStats.averages.goalDifference.toFixed(1)}
                        </span>
                      </td>
                      
                      {/* Points */}
                      <td className="px-3 py-4 text-center text-sm font-bold text-blue-900 border-l bg-blue-100">{summaryStats.averages.points.toFixed(1)}</td>
                      
                      {/* Expected Goals */}
                      <td className="px-2 py-4 text-center text-sm font-medium text-indigo-700">{summaryStats.averages.expectedGoalsFor.toFixed(1)}</td>
                      <td className="px-2 py-4 text-center text-sm font-medium text-indigo-600">{summaryStats.averages.expectedGoalsAgainst.toFixed(1)}</td>
                      <td className="px-2 py-4 text-center text-sm font-medium text-purple-700">{summaryStats.averages.adjustedGoalRate.toFixed(2)}</td>
                      <td className="px-2 py-4 text-center text-sm font-medium text-orange-700">{summaryStats.averages.adjustedGoalsAgainstRate.toFixed(2)}</td>
                      <td className="px-2 py-4 text-center text-sm font-medium text-emerald-700">1.00</td>
                      <td className="px-2 py-4 text-center text-sm font-medium text-rose-700">1.00</td>
                      
                      {/* Defensive Stats */}
                      <td className="px-2 py-4 text-center text-sm font-medium text-teal-700">{summaryStats.averages.tackles.toFixed(1)}</td>
                      <td className="px-2 py-4 text-center text-sm font-medium text-teal-600">{summaryStats.averages.defensiveActions.toFixed(1)}</td>
                      <td className="px-2 py-4 text-center text-sm font-medium text-teal-800">{summaryStats.averages.defensiveContributions.toFixed(1)}</td>
                      
                      {/* Enhanced Statistics */}
                      <td className="px-2 py-4 text-center text-sm font-medium text-blue-700 border-l">{summaryStats.averages.cleanSheets.toFixed(1)}</td>
                      <td className="px-2 py-4 text-center text-sm font-medium text-yellow-700">{summaryStats.averages.yellowCards.toFixed(1)}</td>
                      <td className="px-2 py-4 text-center text-sm font-medium text-red-700">{summaryStats.averages.redCards.toFixed(1)}</td>
                      <td className="px-2 py-4 text-center text-sm font-medium text-purple-700 border-l">{summaryStats.averages.saves.toFixed(1)}</td>
                      <td className="px-2 py-4 text-center text-sm font-medium text-green-700">{summaryStats.averages.penaltiesSaved.toFixed(1)}</td>
                      <td className="px-2 py-4 text-center text-sm font-medium text-orange-700 border-l">{summaryStats.averages.ownGoals.toFixed(1)}</td>
                      <td className="px-2 py-4 text-center text-sm font-medium text-red-600">{summaryStats.averages.penaltiesMissed.toFixed(1)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Legend */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Enhanced Table Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Basic Statistics</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li><strong>P:</strong> Matches played</li>
                  <li><strong>W/D/L:</strong> Wins, Draws, Losses</li>
                  <li><strong>GF/GA:</strong> Goals For/Against</li>
                  <li><strong>GD:</strong> Goal Difference</li>
                  <li><strong>Pts:</strong> Points (3 for win, 1 for draw)</li>
                  <li><strong>CS:</strong> Clean Sheets</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Enhanced Statistics</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li><strong>YC/RC:</strong> Yellow/Red Cards</li>
                  <li><strong>Saves:</strong> Goalkeeper saves</li>
                  <li><strong>PS:</strong> Penalties saved</li>
                  <li><strong>OG:</strong> Own goals</li>
                  <li><strong>PM:</strong> Penalties missed</li>
                  <li><strong>xGF/xGA:</strong> Expected Goals For/Against</li>
                  <li><strong>AGR:</strong> Adjusted Goal Rate (0.5 × (GF+xGF)/Games)</li>
                  <li><strong>AGAR:</strong> Adjusted Goals Against Rate (0.5 × (GA+xGA)/Games)</li>
                  <li><strong>T:</strong> Tackles</li>
                  <li><strong>DA:</strong> Defensive actions</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">💡 Table Features</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• <strong>Sortable columns:</strong> Click any column header to sort by that statistic</li>
                <li>• <strong>Horizontal scroll:</strong> Use the horizontal scrollbar to view all statistics</li>
                <li>• <strong>Sticky columns:</strong> Position and Team columns remain visible while scrolling</li>
                <li>• <strong>Color coding:</strong> Different statistics use distinct colors for easy identification</li>
                <li>• <strong>Expected Goals:</strong> Displayed with one decimal place (e.g., 2.1)</li>
                <li>• <strong>Real-time data:</strong> Updated after each completed match</li>
              </ul>
            </div>
            
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Note:</strong> All statistics are calculated from completed Premier League matches only. 
                Enhanced data includes goalkeeper saves, defensive actions, cards, and advanced metrics 
                to provide comprehensive team performance analysis.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </TooltipProvider>
  );
}