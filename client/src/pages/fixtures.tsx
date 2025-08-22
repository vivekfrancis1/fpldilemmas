import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "../components/layout";
import { Calendar, Home, Plane, Info } from "lucide-react";
import { BootstrapData } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

interface Team {
  id: number;
  name: string;
  short_name: string;
}

export default function Fixtures() {
  const [gameweekRange, setGameweekRange] = useState(() => {
    // Will be updated when we get current gameweek data
    return { start: 1, end: 10 };
  });
  const [sortBy, setSortBy] = useState<'team' | 'fdr-asc' | 'fdr-desc'>('fdr-asc');

  const { data: bootstrapData, isLoading, error } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: fixturesData } = useQuery<Fixture[]>({
    queryKey: ["/api/fixtures"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get current gameweek and available gameweeks
  const { currentGameweek, availableGameweeks } = useMemo(() => {
    if (!bootstrapData?.events) return { currentGameweek: 1, availableGameweeks: [] };
    
    // Find the first unfinished gameweek as the "current" gameweek
    const firstUnfinished = bootstrapData.events.find(event => !event.finished);
    const current = firstUnfinished ? firstUnfinished.id : 1;
    
    // Only show upcoming gameweeks (unfinished gameweeks only)
    const available = bootstrapData.events
      .filter(event => !event.finished)
      .map(event => event.id)
      .sort((a, b) => a - b);
    
    return { currentGameweek: current, availableGameweeks: available };
  }, [bootstrapData]);

  // Update gameweek range when current gameweek changes
  useEffect(() => {
    if (availableGameweeks.length > 0 && gameweekRange.start === 1) {
      const firstAvailable = availableGameweeks[0];
      setGameweekRange({
        start: firstAvailable,
        end: Math.min(firstAvailable + 9, Math.max(...availableGameweeks))
      });
    }
  }, [availableGameweeks, gameweekRange.start]);

  // Get difficulty rating color class
  const getDifficultyColor = (difficulty: number) => {
    switch (difficulty) {
      case 1: return 'bg-green-600 text-white'; // Very Easy - Dark Green
      case 2: return 'bg-green-400 text-white'; // Easy - Light Green  
      case 3: return 'bg-yellow-400 text-gray-900'; // Medium - Yellow
      case 4: return 'bg-orange-500 text-white'; // Hard - Orange
      case 5: return 'bg-red-600 text-white'; // Very Hard - Red
      default: return 'bg-gray-300 text-gray-900';
    }
  };

  // Build fixture matrix with average FDR calculation
  const { fixtureMatrix, teamAverageFDR } = useMemo(() => {
    if (!bootstrapData?.teams || !fixturesData || !bootstrapData?.events) return { fixtureMatrix: {}, teamAverageFDR: {} };

    const matrix: Record<number, Record<number, { opponent: string, difficulty: number, isHome: boolean, finished: boolean }>> = {};
    const avgFDR: Record<number, number> = {};
    
    // Initialize matrix
    bootstrapData.teams.forEach(team => {
      matrix[team.id] = {};
    });

    // Fill matrix with fixtures (only unfinished fixtures)
    fixturesData.forEach(fixture => {
      if (fixture.event >= gameweekRange.start && fixture.event <= gameweekRange.end && !fixture.finished) {
        const homeTeam = bootstrapData.teams.find(t => t.id === fixture.team_h);
        const awayTeam = bootstrapData.teams.find(t => t.id === fixture.team_a);
        
        if (homeTeam && awayTeam) {
          // Home team entry
          matrix[fixture.team_h][fixture.event] = {
            opponent: awayTeam.short_name,
            difficulty: fixture.team_h_difficulty,
            isHome: true,
            finished: fixture.finished
          };
          
          // Away team entry  
          matrix[fixture.team_a][fixture.event] = {
            opponent: homeTeam.short_name,
            difficulty: fixture.team_a_difficulty,
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

    return { fixtureMatrix: matrix, teamAverageFDR: avgFDR };
  }, [bootstrapData, fixturesData, gameweekRange]);

  const gameweeks = useMemo(() => {
    const gws = [];
    for (let i = gameweekRange.start; i <= gameweekRange.end; i++) {
      gws.push(i);
    }
    return gws;
  }, [gameweekRange]);

  // Sort teams based on selected sort option
  const sortedTeams = useMemo(() => {
    if (!bootstrapData?.teams) return [];
    
    const teams = [...bootstrapData.teams];
    
    switch (sortBy) {
      case 'fdr-asc':
        return teams.sort((a, b) => (teamAverageFDR[a.id] || 0) - (teamAverageFDR[b.id] || 0));
      case 'fdr-desc':
        return teams.sort((a, b) => (teamAverageFDR[b.id] || 0) - (teamAverageFDR[a.id] || 0));
      default:
        return teams.sort((a, b) => a.short_name.localeCompare(b.short_name));
    }
  }, [bootstrapData?.teams, teamAverageFDR, sortBy]);

  if (error) {
    return (
      <Layout>
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
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50/30">
        <div className="w-full max-w-full mx-auto px-1 sm:px-3 py-2 sm:py-4">
          {/* Header */}
          <div className="text-center mb-4 sm:mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full mb-3 sm:mb-4">
              <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
            </div>
            <h1 className="text-xl sm:text-3xl font-bold text-gray-900 mb-2 px-2" data-testid="text-page-title">
              Fixture Difficulty Table
            </h1>
            <p className="text-sm sm:text-lg text-gray-600 max-w-2xl mx-auto px-2" data-testid="text-page-description">
              Upcoming fixture matrix showing difficulty ratings for all teams across future gameweeks
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6 items-center justify-center px-2">
            <div className="flex items-center gap-2">
              <label className="text-xs sm:text-sm font-medium text-gray-700">Gameweeks:</label>
              <select 
                value={gameweekRange.start} 
                onChange={(e) => setGameweekRange(prev => ({ ...prev, start: parseInt(e.target.value) }))}
                className="px-3 py-1 border border-gray-300 rounded text-sm"
                data-testid="select-start-gameweek"
              >
                {availableGameweeks.map(gw => (
                  <option key={gw} value={gw}>{gw}</option>
                ))}
              </select>
              <span className="text-gray-500">to</span>
              <select 
                value={gameweekRange.end} 
                onChange={(e) => setGameweekRange(prev => ({ ...prev, end: parseInt(e.target.value) }))}
                className="px-3 py-1 border border-gray-300 rounded text-sm"
                data-testid="select-end-gameweek"
              >
                {availableGameweeks.map(gw => (
                  <option key={gw} value={gw}>{gw}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Sort by:</label>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value as 'team' | 'fdr-asc' | 'fdr-desc')}
                className="px-3 py-1 border border-gray-300 rounded text-sm"
                data-testid="select-sort-by"
              >
                <option value="team">Team Name</option>
                <option value="fdr-asc">FDR (Easiest First)</option>
                <option value="fdr-desc">FDR (Hardest First)</option>
              </select>
            </div>
            
            <div className="flex flex-wrap gap-3 text-xs justify-center">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-600 rounded"></div>
                <span>1-2 Easy</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-yellow-400 rounded"></div>
                <span>3 Medium</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-orange-500 rounded"></div>
                <span>4 Hard</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-600 rounded"></div>
                <span>5 Very Hard</span>
              </div>
              <div className="text-xs text-gray-600">
                Format: TEAM (H/A)
              </div>
            </div>
          </div>

          {/* Fixture Table */}
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
                      <th className="sticky left-0 bg-gray-50 px-3 py-2 text-left font-semibold min-w-24">Team</th>
                      <th className="sticky left-20 bg-gray-50 px-2 py-2 text-center font-semibold min-w-16 border-l">Avg FDR</th>
                      {gameweeks.map(gw => (
                        <th key={gw} className={`px-2 py-2 text-center font-semibold min-w-16 ${
                          gw === currentGameweek ? 'bg-blue-100 text-blue-900' : ''
                        }`}>
                          GW{gw}
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

          {/* Legend */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Info className="h-5 w-5" />
                Fixture Difficulty Rating Guide
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Difficulty Scale</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-green-600 rounded"></div>
                      <div>
                        <span className="font-medium">1-2: Easy</span>
                        <p className="text-sm text-gray-600">Favorable fixtures - high scoring potential</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-yellow-400 rounded"></div>
                      <div>
                        <span className="font-medium">3: Medium</span>
                        <p className="text-sm text-gray-600">Average difficulty - consider form and other factors</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-red-600 rounded"></div>
                      <div>
                        <span className="font-medium">4-5: Hard</span>
                        <p className="text-sm text-gray-600">Challenging fixtures - lower scoring potential</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Format Guide</h4>
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">TEAM (H)</span> - Home fixture vs TEAM
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">TEAM (A)</span> - Away fixture at TEAM
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Avg FDR</span> - Average fixture difficulty rating across selected gameweeks
                    </div>
                    <div className="text-sm text-gray-600">
                      Example: LIV (A) means Away at Liverpool
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-3">
                    Use this table to identify favorable fixture runs for transfers and captaincy decisions.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}