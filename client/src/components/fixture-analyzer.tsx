import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
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
  const [selectedGameweeks, setSelectedGameweeks] = useState("5");
  const [selectedTeam, setSelectedTeam] = useState("all");
  const [sortBy, setSortBy] = useState("easiest");

  const { data: fixtures, isLoading: fixturesLoading } = useQuery<Fixture[]>({
    queryKey: ["/api/fixtures"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const teamFixtures = useMemo(() => {
    if (!data || !fixtures) return [];

    const upcomingFixtures = fixtures.filter(fixture => !fixture.finished);
    
    return data.teams.map(team => {
      const teamUpcomingFixtures = upcomingFixtures
        .filter(fixture => fixture.team_h === team.id || fixture.team_a === team.id)
        .slice(0, parseInt(selectedGameweeks))
        .map(fixture => {
          const isHome = fixture.team_h === team.id;
          const opponentId = isHome ? fixture.team_a : fixture.team_h;
          const opponent = data.teams.find(t => t.id === opponentId);
          const difficulty = isHome ? fixture.team_h_difficulty : fixture.team_a_difficulty;
          
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
  }, [data, fixtures, selectedGameweeks]);

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

  const getDifficultyColor = (difficulty: number): string => {
    if (difficulty <= 2) return "bg-green-100 text-green-800";
    if (difficulty <= 3) return "bg-yellow-100 text-yellow-800";
    if (difficulty <= 4) return "bg-orange-100 text-orange-800";
    return "bg-red-100 text-red-800";
  };

  const getDifficultyText = (difficulty: number): string => {
    if (difficulty <= 2) return "Easy";
    if (difficulty <= 3) return "Moderate";
    if (difficulty <= 4) return "Hard";
    return "Very Hard";
  };

  const getAvgDifficultyIcon = (avgDifficulty: number) => {
    if (avgDifficulty <= 2.5) return <TrendingDown className="h-4 w-4 text-green-600" />;
    if (avgDifficulty >= 3.5) return <TrendingUp className="h-4 w-4 text-red-600" />;
    return <ArrowRight className="h-4 w-4 text-yellow-600" />;
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
            Next {selectedGameweeks} gameweeks
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Gameweeks Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2" data-testid="label-gameweeks">
              Number of Gameweeks
            </label>
            <Select value={selectedGameweeks} onValueChange={setSelectedGameweeks}>
              <SelectTrigger data-testid="select-gameweeks">
                <SelectValue placeholder="Select gameweeks" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">Next 3 gameweeks</SelectItem>
                <SelectItem value="5">Next 5 gameweeks</SelectItem>
                <SelectItem value="8">Next 8 gameweeks</SelectItem>
                <SelectItem value="10">Next 10 gameweeks</SelectItem>
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
      </div>

      {/* Team Fixtures Grid */}
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

      {sortedTeamFixtures.length === 0 && (
        <div className="text-center py-12" data-testid="text-no-data">
          <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No fixture data available</h3>
          <p className="text-gray-600">Unable to load fixture information at the moment.</p>
        </div>
      )}
    </div>
  );
}