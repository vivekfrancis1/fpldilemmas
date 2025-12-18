import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, TrendingUp, TrendingDown, ArrowRight, X } from "lucide-react";
import { BootstrapData, Fixture } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface FixtureAnalyzerProps {
  data?: BootstrapData;
  isLoading: boolean;
}

export default function FixtureAnalyzer({ data, isLoading }: FixtureAnalyzerProps) {
  const [selectedGameweeks, setSelectedGameweeks] = useState("6");
  const [selectedTeam, setSelectedTeam] = useState("all");
  const [sortBy, setSortBy] = useState("easiest");
  const [viewMode, setViewMode] = useState<"teams" | "gameweeks">("teams");
  const [difficultyType, setDifficultyType] = useState<"attacking" | "defensive">("attacking");
  const [excludedGameweeks, setExcludedGameweeks] = useState<Set<number>>(new Set());
  const [excludedTeams, setExcludedTeams] = useState<Set<number>>(new Set());

  // Team tier assignments based on server-side configuration
  const getAttackingTier = (teamId: number): string => {
    const eliteAttackTeams = [12, 13]; // Liverpool, Manchester City
    const strongAttackTeams = [1, 7, 15, 18, 2]; // Arsenal, Chelsea, Newcastle, Tottenham, Aston Villa
    const averageAttackTeams = [6, 14, 4, 5, 10, 8]; // Brighton, Manchester United, Bournemouth, Brentford, Fulham, Crystal Palace
    const weakAttackTeams = [9, 16, 19, 20]; // Everton, Nottingham Forest, West Ham, Wolves
    const promotedAttackTeams = [3, 11, 17]; // Burnley, Leeds, Sunderland
    
    if (eliteAttackTeams.includes(teamId)) return 'elite';
    if (strongAttackTeams.includes(teamId)) return 'strong';
    if (averageAttackTeams.includes(teamId)) return 'average';
    if (weakAttackTeams.includes(teamId)) return 'weak';
    if (promotedAttackTeams.includes(teamId)) return 'promoted';
    return 'average';
  };

  const getDefensiveTier = (teamId: number): string => {
    const eliteDefenseTeams = [1]; // Arsenal
    const strongDefenseTeams = [12, 13, 7, 15]; // Liverpool, Man City, Chelsea, Newcastle
    const averageDefenseTeams = [2, 9, 14, 18, 8, 10, 16]; // Aston Villa, Everton, Manchester United, Tottenham, Crystal Palace, Fulham, Nottingham Forest
    const weakDefenseTeams = [4, 5, 6, 19, 20]; // Bournemouth, Brentford, Brighton, West Ham, Wolves
    const promotedDefenseTeams = [3, 11, 17]; // Burnley, Leeds, Sunderland
    
    if (eliteDefenseTeams.includes(teamId)) return 'elite';
    if (strongDefenseTeams.includes(teamId)) return 'strong';
    if (averageDefenseTeams.includes(teamId)) return 'average';
    if (weakDefenseTeams.includes(teamId)) return 'weak';
    if (promotedDefenseTeams.includes(teamId)) return 'promoted';
    return 'average';
  };

  // Calculate attacking difficulty based on opponent's defensive strength
  const getAttackingDifficulty = (opponentId: number): number => {
    const defensiveTier = getDefensiveTier(opponentId);
    switch (defensiveTier) {
      case 'elite': return 5; // Very Hard
      case 'strong': return 4; // Hard
      case 'average': return 3; // Medium
      case 'weak': return 2; // Easy
      case 'promoted': return 1; // Very Easy
      default: return 3;
    }
  };

  // Calculate defensive difficulty based on opponent's attacking strength
  const getDefensiveDifficulty = (opponentId: number): number => {
    const attackingTier = getAttackingTier(opponentId);
    switch (attackingTier) {
      case 'elite': return 5; // Very Hard for defense
      case 'strong': return 4; // Hard for defense
      case 'average': return 3; // Medium for defense
      case 'weak': return 2; // Easy for defense
      case 'promoted': return 1; // Very Easy for defense
      default: return 3;
    }
  };

  const { data: fixtures, isLoading: fixturesLoading } = useQuery<Fixture[]>({
    queryKey: ["/api/fixtures"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Toggle gameweek exclusion
  const toggleGameweekExclusion = (gw: number) => {
    setExcludedGameweeks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(gw)) {
        newSet.delete(gw);
      } else {
        newSet.add(gw);
      }
      return newSet;
    });
  };

  // Toggle team exclusion
  const toggleTeamExclusion = (teamId: number) => {
    setExcludedTeams(prev => {
      const newSet = new Set(prev);
      if (newSet.has(teamId)) {
        newSet.delete(teamId);
      } else {
        newSet.add(teamId);
      }
      return newSet;
    });
  };

  // Clear all exclusions
  const clearGameweekExclusions = () => setExcludedGameweeks(new Set());
  const clearTeamExclusions = () => setExcludedTeams(new Set());

  // Get available gameweeks from fixtures
  const availableGameweeks = useMemo(() => {
    if (!fixtures) return [];
    const upcomingFixtures = fixtures.filter(fixture => !fixture.finished);
    const gameweekSet = new Set<number>();
    upcomingFixtures.forEach(f => {
      if (f.event) gameweekSet.add(f.event);
    });
    return Array.from(gameweekSet).sort((a, b) => a - b).slice(0, parseInt(selectedGameweeks));
  }, [fixtures, selectedGameweeks]);

  // Get active gameweeks (excluding excluded ones)
  const activeGameweeks = useMemo(() => {
    return availableGameweeks.filter(gw => !excludedGameweeks.has(gw));
  }, [availableGameweeks, excludedGameweeks]);

  const teamFixtures = useMemo(() => {
    if (!data || !fixtures) return [];

    const upcomingFixtures = fixtures.filter(fixture => !fixture.finished);
    
    return data.teams
      .filter(team => !excludedTeams.has(team.id)) // Filter out excluded teams
      .map(team => {
        const teamUpcomingFixtures = upcomingFixtures
          .filter(fixture => fixture.team_h === team.id || fixture.team_a === team.id)
          .filter(fixture => fixture.event && activeGameweeks.includes(fixture.event)) // Only include active gameweeks
          .map(fixture => {
            const isHome = fixture.team_h === team.id;
            const opponentId = isHome ? fixture.team_a : fixture.team_h;
            const opponent = data.teams.find(t => t.id === opponentId);
            // Use custom difficulty calculation based on selected type
            const difficulty = difficultyType === 'attacking' 
              ? getAttackingDifficulty(opponentId) 
              : getDefensiveDifficulty(opponentId);
            
            return {
              ...fixture,
              isHome,
              opponent: opponent?.short_name || "",
              difficulty,
              gameweek: fixture.event || 0
            };
          });

        const avgDifficulty = teamUpcomingFixtures.length > 0 
          ? teamUpcomingFixtures.reduce((sum, f) => sum + f.difficulty, 0) / teamUpcomingFixtures.length
          : 0;

        return {
          team,
          fixtures: teamUpcomingFixtures,
          avgDifficulty: parseFloat(avgDifficulty.toFixed(2))
        };
      });
  }, [data, fixtures, activeGameweeks, difficultyType, excludedTeams]);

  const filteredTeamFixtures = useMemo(() => {
    if (selectedTeam === "all") return teamFixtures;
    return teamFixtures.filter(tf => tf.team.id.toString() === selectedTeam);
  }, [teamFixtures, selectedTeam]);

  const sortedTeamFixtures = useMemo(() => {
    return [...filteredTeamFixtures].sort((a, b) => {
      switch (sortBy) {
        case "easiest":
          return a.avgDifficulty - b.avgDifficulty;
        case "hardest":
          return b.avgDifficulty - a.avgDifficulty;
        case "alphabetical":
          return a.team.name.localeCompare(b.team.name);
        default:
          return a.avgDifficulty - b.avgDifficulty;
      }
    });
  }, [filteredTeamFixtures, sortBy]);

  // Gameweek-wise fixtures grouping
  const gameweekFixtures = useMemo(() => {
    if (!data || !fixtures) return [];

    const upcomingFixtures = fixtures.filter(fixture => !fixture.finished);
    const gameweekMap = new Map();

    upcomingFixtures.forEach(fixture => {
      const gameweek = fixture.event || 0;
      if (gameweek === 0 || !activeGameweeks.includes(gameweek)) return; // Filter by active gameweeks

      if (!gameweekMap.has(gameweek)) {
        gameweekMap.set(gameweek, []);
      }

      const homeTeam = data.teams.find(t => t.id === fixture.team_h);
      const awayTeam = data.teams.find(t => t.id === fixture.team_a);

      // Filter out fixtures involving excluded teams
      if (homeTeam && awayTeam && !excludedTeams.has(homeTeam.id) && !excludedTeams.has(awayTeam.id)) {
        gameweekMap.get(gameweek).push({
          ...fixture,
          homeTeam,
          awayTeam,
          gameweek
        });
      }
    });

    // Convert to array and sort by gameweek
    return Array.from(gameweekMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([gameweek, fixtures]) => ({
        gameweek,
        fixtures: fixtures.sort((a: any, b: any) => {
          if (a.kickoff_time && b.kickoff_time) {
            return new Date(a.kickoff_time).getTime() - new Date(b.kickoff_time).getTime();
          }
          return 0;
        }),
        avgDifficulty: fixtures.length > 0 ? fixtures.reduce((sum: number, f: any) => {
          const homeTeamDifficulty = difficultyType === 'attacking' 
            ? getAttackingDifficulty(f.team_a) 
            : getDefensiveDifficulty(f.team_a);
          const awayTeamDifficulty = difficultyType === 'attacking' 
            ? getAttackingDifficulty(f.team_h) 
            : getDefensiveDifficulty(f.team_h);
          return sum + homeTeamDifficulty + awayTeamDifficulty;
        }, 0) / (fixtures.length * 2) : 0
      }))
      .filter(gw => gw.fixtures.length > 0); // Remove empty gameweeks
  }, [data, fixtures, activeGameweeks, difficultyType, excludedTeams]);

  const getDifficultyColor = (difficulty: number): string => {
    if (difficulty === 1) return "bg-green-600 text-white"; // Very Easy - Dark Green (softer)
    if (difficulty === 2) return "bg-green-100 text-green-800"; // Easy - Light Green
    if (difficulty === 3) return "bg-gray-100 text-gray-800"; // Medium - Grey
    if (difficulty === 4) return "bg-red-100 text-red-800"; // Hard - Light Red
    return "bg-red-600 text-white"; // Very Hard (5) - Dark Red (softer)
  };

  const getDifficultyText = (difficulty: number): string => {
    if (difficulty === 1) return "Very Easy";
    if (difficulty === 2) return "Easy";
    if (difficulty === 3) return "Medium";
    if (difficulty === 4) return "Hard";
    return "Very Hard";
  };

  const getAvgDifficultyIcon = (avgDifficulty: number) => {
    if (avgDifficulty <= 1.5) return <TrendingDown className="h-4 w-4 text-green-700" />; // Very Easy
    if (avgDifficulty <= 2.5) return <TrendingDown className="h-4 w-4 text-green-600" />; // Easy
    if (avgDifficulty <= 3.5) return <ArrowRight className="h-4 w-4 text-gray-600" />; // Medium
    if (avgDifficulty <= 4.5) return <TrendingUp className="h-4 w-4 text-red-500" />; // Hard
    return <TrendingUp className="h-4 w-4 text-red-700" />; // Very Hard
  };

  if (isLoading || fixturesLoading) {
    return (
      <div className="space-y-6">
        {/* Filters Skeleton */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </div>

        {/* Fixtures Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-16" />
              </div>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((j) => (
                  <div key={j} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-6 w-12" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-900" data-testid="text-filters-title">
            Fixture Analysis
          </h3>
          <Badge variant="outline" className="bg-blue-50 text-blue-800">
            <Calendar className="h-3 w-3 mr-1" />
            {activeGameweeks.length} of {availableGameweeks.length} gameweeks
          </Badge>
          {excludedTeams.size > 0 && (
            <Badge variant="outline" className="bg-purple-50 text-purple-800">
              {20 - excludedTeams.size} teams shown
            </Badge>
          )}
        </div>
        
        {/* View Mode Toggle */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">View Mode</label>
          <div className="flex space-x-2">
            <Button
              variant={viewMode === "teams" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("teams")}
              data-testid="button-teams-view"
            >
              By Teams
            </Button>
            <Button
              variant={viewMode === "gameweeks" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("gameweeks")}
              data-testid="button-gameweeks-view"
            >
              By Gameweeks
            </Button>
          </div>
        </div>

        {/* Difficulty Type Toggle */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">FDR Analysis Type</label>
          <div className="flex space-x-2">
            <Button
              variant={difficultyType === "attacking" ? "default" : "outline"}
              size="sm"
              onClick={() => setDifficultyType("attacking")}
              data-testid="button-attacking-fdr"
            >
              FDR for Attackers
            </Button>
            <Button
              variant={difficultyType === "defensive" ? "default" : "outline"}
              size="sm"
              onClick={() => setDifficultyType("defensive")}
              data-testid="button-defensive-fdr"
            >
              FDR for Defenders
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {difficultyType === "attacking" 
              ? "Shows how difficult it is for teams to score goals (based on opponent's defensive strength)"
              : "Shows how difficult it is for teams to keep clean sheets (based on opponent's attacking strength)"
            }
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Gameweeks Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2" data-testid="label-gameweeks">
              Number of Gameweeks
            </label>
            <Select value={selectedGameweeks} onValueChange={(val) => {
              setSelectedGameweeks(val);
              setExcludedGameweeks(new Set()); // Clear exclusions when changing range
            }}>
              <SelectTrigger data-testid="select-gameweeks">
                <SelectValue placeholder="Select gameweeks" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">Next 3 gameweeks</SelectItem>
                <SelectItem value="6">Next 6 gameweeks</SelectItem>
                <SelectItem value="8">Next 8 gameweeks</SelectItem>
                <SelectItem value="10">Next 10 gameweeks</SelectItem>
                <SelectItem value="12">Next 12 gameweeks</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Team Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2" data-testid="label-team-filter">
              Focus on Team
            </label>
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger data-testid="select-team-filter">
                <SelectValue placeholder="All teams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {data?.teams.map((team) => (
                  <SelectItem key={team.id} value={team.id.toString()}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sort Option */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2" data-testid="label-sort-by">
              Sort Teams By
            </label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger data-testid="select-sort-by">
                <SelectValue placeholder="Sort by difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easiest">Easiest Fixtures First</SelectItem>
                <SelectItem value="hardest">Hardest Fixtures First</SelectItem>
                <SelectItem value="alphabetical">Team Name (A-Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Gameweek Toggle Section */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <label className="text-xs sm:text-sm font-medium text-gray-700">
              Toggle Gameweeks (click to exclude/include):
            </label>
            {excludedGameweeks.size > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearGameweekExclusions}
                className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
                data-testid="button-clear-gw-exclusions"
              >
                <X className="h-3 w-3 mr-1" />
                Clear GW exclusions
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {availableGameweeks.map((gw) => {
              const isExcluded = excludedGameweeks.has(gw);
              return (
                <Button
                  key={gw}
                  variant="outline"
                  size="sm"
                  onClick={() => toggleGameweekExclusion(gw)}
                  className={`min-w-[50px] sm:min-w-[60px] text-xs sm:text-sm px-2 sm:px-3 py-1 ${isExcluded ? 'bg-gray-100 text-gray-400 line-through hover:bg-gray-200 border border-gray-300' : 'bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-300'}`}
                  data-testid={`button-toggle-gw-${gw}`}
                >
                  GW{gw}
                </Button>
              );
            })}
          </div>
          {excludedGameweeks.size > 0 && (
            <p className="text-xs text-gray-500 mt-2">
              Excluded: {Array.from(excludedGameweeks).sort((a, b) => a - b).map(gw => `GW${gw}`).join(', ')}
            </p>
          )}
        </div>

        {/* Team Toggle Section */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <label className="text-xs sm:text-sm font-medium text-gray-700">
              Toggle Teams (click to exclude/include):
            </label>
            {excludedTeams.size > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearTeamExclusions}
                className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
                data-testid="button-clear-team-exclusions"
              >
                <X className="h-3 w-3 mr-1" />
                Clear team exclusions
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {data?.teams
              .slice()
              .sort((a, b) => a.short_name.localeCompare(b.short_name))
              .map((team) => {
                const isExcluded = excludedTeams.has(team.id);
                return (
                  <Button
                    key={team.id}
                    variant="outline"
                    size="sm"
                    onClick={() => toggleTeamExclusion(team.id)}
                    className={`min-w-[45px] text-xs px-2 py-1 ${isExcluded ? 'bg-gray-100 text-gray-400 line-through hover:bg-gray-200 border border-gray-300' : 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300'}`}
                    data-testid={`button-toggle-team-${team.id}`}
                  >
                    {team.short_name}
                  </Button>
                );
              })}
          </div>
          {excludedTeams.size > 0 && (
            <p className="text-xs text-gray-500 mt-2">
              Excluded: {Array.from(excludedTeams)
                .map(id => data?.teams.find(t => t.id === id)?.short_name || '')
                .filter(Boolean)
                .sort()
                .join(', ')}
            </p>
          )}
        </div>
      </div>

      {/* Conditional Rendering Based on View Mode */}
      {viewMode === "teams" ? (
        // Team Fixtures Grid
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedTeamFixtures.map((teamFixture) => (
          <div 
            key={teamFixture.team.id} 
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            data-testid={`card-team-${teamFixture.team.id}`}
          >
            {/* Team Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-lg font-semibold text-gray-900" data-testid={`text-team-name-${teamFixture.team.id}`}>
                  {teamFixture.team.short_name}
                </h4>
                <p className="text-sm text-gray-600">{teamFixture.team.name}</p>
              </div>
              <div className="flex items-center space-x-2">
                {getAvgDifficultyIcon(teamFixture.avgDifficulty)}
                <span 
                  className="text-sm font-medium"
                  data-testid={`text-avg-difficulty-${teamFixture.team.id}`}
                >
                  {teamFixture.avgDifficulty}
                </span>
              </div>
            </div>

            {/* Fixtures List */}
            <div className="space-y-3">
              {teamFixture.fixtures.map((fixture, index) => (
                <div 
                  key={fixture.id} 
                  className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
                  data-testid={`fixture-${fixture.id}`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500 w-8">
                      GW{fixture.gameweek}
                    </span>
                    <span className="text-sm font-medium">
                      {fixture.isHome ? "vs" : "@"} {fixture.opponent}
                    </span>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={getDifficultyColor(fixture.difficulty)}
                    data-testid={`badge-difficulty-${fixture.id}`}
                  >
                    {fixture.difficulty}
                  </Badge>
                </div>
              ))}
              
              {teamFixture.fixtures.length === 0 && (
                <div className="text-center py-4 text-gray-500" data-testid="text-no-fixtures">
                  <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">No upcoming fixtures</p>
                </div>
              )}
            </div>

            {/* Summary */}
            {teamFixture.fixtures.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Average Difficulty:</span>
                  <Badge 
                    variant="outline" 
                    className={getDifficultyColor(teamFixture.avgDifficulty)}
                    data-testid={`badge-avg-difficulty-${teamFixture.team.id}`}
                  >
                    {getDifficultyText(teamFixture.avgDifficulty)} ({teamFixture.avgDifficulty})
                  </Badge>
                </div>
              </div>
            )}
          </div>
        ))}
        </div>
      ) : (
        // Gameweek Fixtures Grid
        <div className="space-y-6">
          {gameweekFixtures.map((gwFixtures) => (
            <div 
              key={gwFixtures.gameweek} 
              className="bg-white rounded-lg shadow-md p-6"
              data-testid={`card-gameweek-${gwFixtures.gameweek}`}
            >
              {/* Gameweek Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h4 className="text-xl font-bold text-gray-900" data-testid={`text-gameweek-${gwFixtures.gameweek}`}>
                    Gameweek {gwFixtures.gameweek}
                  </h4>
                  <p className="text-sm text-gray-600">{gwFixtures.fixtures.length} fixtures</p>
                </div>
                {gwFixtures.fixtures[0]?.kickoff_time && (
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(gwFixtures.fixtures[0].kickoff_time).toLocaleDateString(undefined, {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short'
                      })}
                    </p>
                    <p className="text-xs text-gray-500">First fixture date</p>
                  </div>
                )}
              </div>

              {/* Fixtures List - Compact Vertical Layout */}
              <div className="space-y-1">
                {gwFixtures.fixtures.map((fixture: any) => (
                  <div 
                    key={fixture.id} 
                    className="flex items-center justify-between py-2 px-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 hover:shadow-sm transition-all duration-200"
                    data-testid={`fixture-gw-${fixture.id}`}
                  >
                    {/* Teams Section */}
                    <div className="flex items-center space-x-3 flex-1">
                      {/* Home Team */}
                      <div className="flex items-center space-x-2 min-w-[80px]">
                        <div className="text-right">
                          <div className="text-sm font-semibold text-gray-900">{fixture.homeTeam.short_name}</div>
                        </div>
                        <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 text-xs font-bold">H</span>
                        </div>
                      </div>
                      
                      {/* VS Divider */}
                      <div className="flex items-center justify-center">
                        <div className="w-8 h-5 bg-white rounded border border-gray-300 flex items-center justify-center">
                          <span className="text-gray-600 font-medium text-xs">vs</span>
                        </div>
                      </div>
                      
                      {/* Away Team */}
                      <div className="flex items-center space-x-2 min-w-[80px]">
                        <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center">
                          <span className="text-red-600 text-xs font-bold">A</span>
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-semibold text-gray-900">{fixture.awayTeam.short_name}</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Match Info Section */}
                    <div className="text-right ml-3">
                      {fixture.kickoff_time ? (
                        <div className="bg-white px-2 py-1 rounded border border-gray-200">
                          <div className="text-xs font-medium text-gray-700" data-testid={`text-fixture-date-${fixture.id}`}>
                            {new Date(fixture.kickoff_time).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                          <div className="text-sm font-bold text-purple-600" data-testid={`text-fixture-time-${fixture.id}`}>
                            {new Date(fixture.kickoff_time).toLocaleTimeString(undefined, {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-100 px-2 py-1 rounded border border-gray-200">
                          <div className="text-xs font-medium text-gray-400">TBD</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Compact Summary Information */}
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center justify-center">
                  <div className="bg-purple-50 border border-purple-200 rounded px-3 py-1">
                    <span className="text-purple-700 font-medium text-xs">
                      {gwFixtures.fixtures.length} matches
                      {gwFixtures.fixtures[0]?.kickoff_time && (
                        <span className="ml-2 text-purple-600">
                          • {new Date(gwFixtures.fixtures[0].kickoff_time).toLocaleDateString(undefined, {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {(viewMode === "teams" ? sortedTeamFixtures.length === 0 : gameweekFixtures.length === 0) && (
        <div className="text-center py-12" data-testid="text-no-data">
          <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No fixture data available</h3>
          <p className="text-gray-600">Unable to load fixture information at the moment.</p>
        </div>
      )}
    </div>
  );
}