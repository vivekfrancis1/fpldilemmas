import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { BootstrapData, PREMIER_LEAGUE_TEAMS } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { computeNextRange } from "@shared/gameweek-utils";

interface Fixture {
  id: number;
  event: number;
  team_h: number;
  team_a: number;
  team_h_difficulty: number;
  team_a_difficulty: number;
  kickoff_time: string;
  finished: boolean;
}

export default function Fixtures() {
  const [gameweekRange, setGameweekRange] = useState(() => {
    return { start: 6, end: 11 };
  });
  const [sortBy, setSortBy] = useState<'team' | 'fdr-avg' | string>('fdr-avg');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const { data: bootstrapData, isLoading, error } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: fixturesData } = useQuery<Fixture[]>({
    queryKey: ["/api/fixtures"],
    staleTime: 5 * 60 * 1000,
  });

  // Get current gameweek and available gameweeks
  const { currentGameweek, availableGameweeks } = useMemo(() => {
    if (!bootstrapData?.events) return { currentGameweek: 1, availableGameweeks: [] };
    
    const firstUnfinished = bootstrapData.events.find(event => !event.finished);
    const current = firstUnfinished ? firstUnfinished.id : 1;
    
    const available = bootstrapData.events
      .filter(event => event.id >= 6 && event.id <= 38)
      .map(event => event.id)
      .sort((a, b) => a - b);
    
    return { currentGameweek: current, availableGameweeks: available };
  }, [bootstrapData]);

  // Update gameweek range when bootstrap data changes
  useEffect(() => {
    if (bootstrapData?.events) {
      const nextRange = computeNextRange(bootstrapData.events, 6);
      setGameweekRange({
        start: nextRange.start,
        end: nextRange.end
      });
    }
  }, [bootstrapData]);

  // Get difficulty rating color class
  const getDifficultyColor = (difficulty: number) => {
    switch (difficulty) {
      case 1: return 'bg-green-300 text-green-800';
      case 2: return 'bg-green-100 text-green-800';
      case 3: return 'bg-gray-100 text-gray-800';
      case 4: return 'bg-red-100 text-red-800';
      case 5: return 'bg-red-300 text-red-800';
      default: return 'bg-gray-300 text-gray-900';
    }
  };

  // Build fixture matrix with average FDR calculation
  const { fixtureMatrix, teamAverageFDR } = useMemo(() => {
    if (!fixturesData || !bootstrapData?.events) return { 
      fixtureMatrix: {}, 
      teamAverageFDR: {} 
    };

    const matrix: Record<number, Record<number, { opponent: string, difficulty: number, isHome: boolean, finished: boolean }>> = {};
    const avgFDR: Record<number, number> = {};
    
    // Initialize matrix
    bootstrapData.teams.forEach(team => {
      matrix[team.id] = {};
    });

    // Helper function to get overall FDR (with promoted teams as FDR 1)
    const getOverallFDR = (originalDifficulty: number, opponentId: number) => {
      const promotedTeams = [3, 11, 17]; // Burnley, Leeds, Sunderland
      if (promotedTeams.includes(opponentId)) {
        return 1;
      }
      return originalDifficulty;
    };

    // Fill matrix with fixtures
    fixturesData.forEach(fixture => {
      if (fixture.event >= gameweekRange.start && fixture.event <= gameweekRange.end && !fixture.finished) {
        const homeTeam = bootstrapData.teams.find(t => t.id === fixture.team_h);
        const awayTeam = bootstrapData.teams.find(t => t.id === fixture.team_a);
        
        if (homeTeam && awayTeam) {
          matrix[fixture.team_h][fixture.event] = {
            opponent: awayTeam.short_name,
            difficulty: getOverallFDR(fixture.team_h_difficulty, awayTeam.id),
            isHome: true,
            finished: fixture.finished
          };
          
          matrix[fixture.team_a][fixture.event] = {
            opponent: homeTeam.short_name,
            difficulty: getOverallFDR(fixture.team_a_difficulty, homeTeam.id),
            isHome: false,
            finished: fixture.finished
          };
        }
      }
    });

    // Calculate average FDR for each team
    bootstrapData.teams.forEach(team => {
      const teamFixtures = Object.values(matrix[team.id] || {});
      if (teamFixtures.length > 0) {
        const totalDifficulty = teamFixtures.reduce((sum, fixture) => sum + fixture.difficulty, 0);
        avgFDR[team.id] = parseFloat((totalDifficulty / teamFixtures.length).toFixed(2));
      } else {
        avgFDR[team.id] = 0;
      }
    });

    return { 
      fixtureMatrix: matrix, 
      teamAverageFDR: avgFDR
    };
  }, [bootstrapData, fixturesData, gameweekRange]);

  const gameweeks = useMemo(() => {
    const gws = [];
    for (let i = gameweekRange.start; i <= gameweekRange.end; i++) {
      gws.push(i);
    }
    return gws;
  }, [gameweekRange]);

  // Handle column header click for sorting
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
  };

  // Sort teams based on selected sort option
  const sortedTeams = useMemo(() => {
    const teams = [...PREMIER_LEAGUE_TEAMS];
    
    switch (sortBy) {
      case 'team':
        return teams.sort((a, b) => 
          sortDirection === 'asc' 
            ? a.short_name.localeCompare(b.short_name)
            : b.short_name.localeCompare(a.short_name)
        );
      case 'fdr-avg':
        return teams.sort((a, b) => 
          sortDirection === 'asc' 
            ? (teamAverageFDR[a.id] || 0) - (teamAverageFDR[b.id] || 0)
            : (teamAverageFDR[b.id] || 0) - (teamAverageFDR[a.id] || 0)
        );
      default:
        if (sortBy.startsWith('gw-')) {
          const gw = parseInt(sortBy.replace('gw-', ''));
          return teams.sort((a, b) => {
            const fixtureA = fixtureMatrix[a.id]?.[gw];
            const fixtureB = fixtureMatrix[b.id]?.[gw];
            const diffA = fixtureA?.difficulty || 0;
            const diffB = fixtureB?.difficulty || 0;
            
            return sortDirection === 'asc' ? diffA - diffB : diffB - diffA;
          });
        }
        return teams.sort((a, b) => a.short_name.localeCompare(b.short_name));
    }
  }, [fixtureMatrix, teamAverageFDR, sortBy, sortDirection]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-50/30">
        <div className="w-full max-w-7xl mx-auto px-1 sm:px-3 lg:px-4 py-2 sm:py-4 lg:py-8">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Calendar className="h-6 w-6 text-red-600 mr-3" />
                <div>
                  <h3 className="text-red-800 font-medium">Failed to load fixture data</h3>
                  <p className="text-red-600 text-sm mt-1">Unable to connect to FPL API</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="fpl-page-container">
      {/* Page Header */}
      <div className="fpl-page-header">
        <div className="fpl-page-title">
          <Calendar className="h-8 w-8" />
          <h1>Fixture Analyzer</h1>
        </div>
        <p className="fpl-page-subtitle">
          Analyze upcoming fixtures based on official FPL difficulty ratings
        </p>
      </div>

      <div className="fpl-section-spacing">
        {/* Controls */}
        <div className="fpl-filters">
          <div className="fpl-card-header">
            <div className="fpl-card-title">
              <Calendar className="h-5 w-5 text-blue-600" />
              Fixture Controls
            </div>
          </div>
          <div className="fpl-card-content">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center justify-center">
              <div className="flex items-center gap-2">
                <label className="text-xs sm:text-sm font-medium text-gray-700">Gameweeks:</label>
                <select 
                  value={gameweekRange.start} 
                  onChange={(e) => setGameweekRange(prev => ({ ...prev, start: parseInt(e.target.value) }))}
                  className="px-3 py-1 border border-gray-300 rounded text-sm"
                  data-testid="select-start-gameweek"
                >
                  {availableGameweeks.map(gw => (
                    <option key={gw} value={gw}>GW{gw}</option>
                  ))}
                </select>
                <span className="text-gray-500">to</span>
                <select 
                  value={gameweekRange.end} 
                  onChange={(e) => setGameweekRange(prev => ({ ...prev, end: parseInt(e.target.value) }))}
                  className="px-3 py-1 border border-gray-300 rounded text-sm"
                  data-testid="select-end-gameweek"
                >
                  {availableGameweeks.filter(gw => gw >= gameweekRange.start).map(gw => (
                    <option key={gw} value={gw}>GW{gw}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Sort by:</label>
                <select 
                  value={sortBy} 
                  onChange={(e) => {
                    const value = e.target.value;
                    setSortBy(value);
                    setSortDirection('asc');
                  }}
                  className="px-3 py-1 border border-gray-300 rounded text-sm"
                  data-testid="select-sort-by"
                >
                  <option value="team">Team Name</option>
                  <option value="fdr-avg">FDR (Easiest First)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Fixture Difficulty Analysis */}
        <div className="space-y-6">
          <div className="flex flex-wrap gap-3 text-xs justify-center">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-300 rounded"></div>
              <span>1 Very Easy</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
              <span>2 Easy</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-100 border border-gray-300 rounded"></div>
              <span>3 Medium</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
              <span>4 Hard</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-300 rounded"></div>
              <span>5 Very Hard</span>
            </div>
            <div className="text-xs text-gray-600">
              Colours based on official FPL classification of fixture difficulty rating
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="sticky left-0 bg-gray-50 px-3 py-2 text-left font-semibold min-w-24">
                        <button
                          onClick={() => handleSort('team')}
                          className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                          data-testid="sort-team"
                        >
                          Team
                          {sortBy === 'team' && (
                            sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          )}
                          {sortBy !== 'team' && <ArrowUpDown className="h-3 w-3 opacity-50" />}
                        </button>
                      </th>
                      <th className="sticky left-20 bg-gray-50 px-2 py-2 text-center font-semibold min-w-16 border-l">
                        <button
                          onClick={() => handleSort('fdr-avg')}
                          className="flex items-center gap-1 hover:text-blue-600 transition-colors mx-auto"
                          data-testid="sort-avg-fdr"
                        >
                          Avg FDR
                          {sortBy === 'fdr-avg' && (
                            sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          )}
                          {sortBy !== 'fdr-avg' && <ArrowUpDown className="h-3 w-3 opacity-50" />}
                        </button>
                      </th>
                      {gameweeks.map(gw => (
                        <th key={gw} className={`px-2 py-2 text-center font-semibold min-w-16 ${
                          gw === currentGameweek ? 'bg-blue-100 text-blue-900' : ''
                        }`}>
                          <button
                            onClick={() => handleSort(`gw-${gw}`)}
                            className="flex items-center gap-1 hover:text-blue-600 transition-colors mx-auto"
                            data-testid={`sort-gw-${gw}`}
                          >
                            GW{gw}
                            {sortBy === `gw-${gw}` && (
                              sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                            )}
                            {sortBy !== `gw-${gw}` && <ArrowUpDown className="h-3 w-3 opacity-50" />}
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTeams.map(team => {
                      const avgFDR = teamAverageFDR[team.id];
                      return (
                        <tr key={team.id} className="border-b hover:bg-gray-50">
                          <td className="sticky left-0 bg-white px-3 py-2 font-medium text-gray-900 border-r">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{team.short_name}</span>
                            </div>
                          </td>
                          <td className="sticky left-20 bg-white px-2 py-2 text-center font-medium border-l border-r">
                            <div className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                              avgFDR <= 2 ? 'bg-green-100 text-green-800' :
                              avgFDR <= 3 ? 'bg-yellow-100 text-yellow-800' :
                              avgFDR <= 4 ? 'bg-orange-100 text-orange-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {avgFDR > 0 ? avgFDR : '-'}
                            </div>
                          </td>
                          {gameweeks.map(gw => {
                            const fixture = fixtureMatrix[team.id]?.[gw];
                            return (
                              <td key={gw} className={`px-1 py-1 text-center ${
                                gw === currentGameweek ? 'bg-blue-50' : ''
                              }`}>
                                {fixture ? (
                                  <div 
                                    className={`px-1 py-1 rounded text-xs font-medium ${getDifficultyColor(fixture.difficulty)} ${
                                      fixture.finished ? 'opacity-50' : ''
                                    }`}
                                    title={`${fixture.isHome ? 'vs' : '@'} ${fixture.opponent} (FDR: ${fixture.difficulty})`}
                                    data-testid={`fixture-${team.id}-${gw}`}
                                  >
                                    <span className="truncate text-xs font-medium whitespace-nowrap">
                                      {fixture.opponent} ({fixture.isHome ? 'H' : 'A'})
                                    </span>
                                  </div>
                                ) : (
                                  <div className="px-2 py-1 text-gray-300">-</div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}