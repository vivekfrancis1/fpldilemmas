import { useState, useMemo } from "react";
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
    // Start from current gameweek, default to 1-10 for now
    return { start: 1, end: 10 };
  });

  const { data: bootstrapData, isLoading, error } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: fixturesData } = useQuery<Fixture[]>({
    queryKey: ["/api/fixtures"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get current gameweek
  const currentGameweek = useMemo(() => {
    if (!bootstrapData?.events) return 1;
    const currentEvent = bootstrapData.events.find(event => 
      event.is_current || (!event.finished && !event.is_next)
    );
    return currentEvent ? currentEvent.id : 1;
  }, [bootstrapData]);

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

  // Build fixture matrix
  const fixtureMatrix = useMemo(() => {
    if (!bootstrapData?.teams || !fixturesData || !bootstrapData?.events) return {};

    const matrix: Record<number, Record<number, { opponent: string, difficulty: number, isHome: boolean, finished: boolean }>> = {};
    
    // Initialize matrix
    bootstrapData.teams.forEach(team => {
      matrix[team.id] = {};
    });

    // Fill matrix with fixtures
    fixturesData.forEach(fixture => {
      if (fixture.event >= gameweekRange.start && fixture.event <= gameweekRange.end) {
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

    return matrix;
  }, [bootstrapData, fixturesData, gameweekRange]);

  const gameweeks = useMemo(() => {
    const gws = [];
    for (let i = gameweekRange.start; i <= gameweekRange.end; i++) {
      gws.push(i);
    }
    return gws;
  }, [gameweekRange]);

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-50/30">
          <div className="w-full max-w-7xl mx-auto px-4 py-8">
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
        <div className="w-full max-w-full mx-auto px-3 py-4">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <Calendar className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2" data-testid="text-page-title">
              Fixture Difficulty Table
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto" data-testid="text-page-description">
              Complete fixture matrix showing difficulty ratings for all teams across gameweeks
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6 items-center justify-center">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Gameweeks:</label>
              <select 
                value={gameweekRange.start} 
                onChange={(e) => setGameweekRange(prev => ({ ...prev, start: parseInt(e.target.value) }))}
                className="px-3 py-1 border border-gray-300 rounded text-sm"
                data-testid="select-start-gameweek"
              >
                {Array.from({ length: 38 }, (_, i) => i + 1).map(gw => (
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
                {Array.from({ length: 38 }, (_, i) => i + 1).map(gw => (
                  <option key={gw} value={gw}>{gw}</option>
                ))}
              </select>
            </div>
            
            <div className="flex flex-wrap gap-2 text-xs justify-center">
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
              <div className="flex items-center gap-1">
                <Home className="h-3 w-3 text-gray-600" />
                <span>Home</span>
              </div>
              <div className="flex items-center gap-1">
                <Plane className="h-3 w-3 text-gray-600" />
                <span>Away</span>
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
                    {bootstrapData?.teams?.map(team => (
                      <tr key={team.id} className="border-b hover:bg-gray-50">
                        <td className="sticky left-0 bg-white px-3 py-2 font-medium text-gray-900 border-r">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{team.short_name}</span>
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
                                  className={`px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(fixture.difficulty)} ${
                                    fixture.finished ? 'opacity-50' : ''
                                  }`}
                                  title={`${fixture.isHome ? 'vs' : '@'} ${fixture.opponent} (FDR: ${fixture.difficulty})`}
                                  data-testid={`fixture-${team.id}-${gw}`}
                                >
                                  <div className="flex items-center justify-center gap-1">
                                    {fixture.isHome ? (
                                      <Home className="h-2 w-2" />
                                    ) : (
                                      <Plane className="h-2 w-2" />
                                    )}
                                    <span className="truncate max-w-8">{fixture.opponent}</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="px-2 py-1 text-gray-300">-</div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
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
                  <h4 className="font-semibold text-gray-900 mb-2">Icons</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <Home className="h-4 w-4 text-gray-600" />
                      <span className="text-sm">Home fixture</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Plane className="h-4 w-4 text-gray-600" />
                      <span className="text-sm">Away fixture</span>
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