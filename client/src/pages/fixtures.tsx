import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Home, Plane, Info, Sword, Shield } from "lucide-react";
import { BootstrapData, PREMIER_LEAGUE_TEAMS } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    // Show next 6 gameweeks: GW3 to GW8
    return { start: 3, end: 8 };
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

  // Fetch admin goal settings for tier analysis
  const { data: adminSettings } = useQuery<any>({
    queryKey: ['/api/admin/goal-scored-settings'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get current gameweek and available gameweeks
  const { currentGameweek, availableGameweeks } = useMemo(() => {
    if (!bootstrapData?.events) return { currentGameweek: 1, availableGameweeks: [] };
    
    // Find the first unfinished gameweek as the "current" gameweek
    const firstUnfinished = bootstrapData.events.find(event => !event.finished);
    const current = firstUnfinished ? firstUnfinished.id : 1;
    
    // Show all gameweeks from 3 to 38 for user selection
    const available = bootstrapData.events
      .filter(event => event.id >= 3 && event.id <= 38)
      .map(event => event.id)
      .sort((a, b) => a - b);
    
    return { currentGameweek: current, availableGameweeks: available };
  }, [bootstrapData]);

  // Update gameweek range when current gameweek changes - show next 10 gameweeks (GW3-GW12)
  useEffect(() => {
    if (availableGameweeks.length > 0 && gameweekRange.start !== 3) {
      // Start from GW3 and show next 6 gameweeks (GW3-GW8)
      const startGW = 3;
      const endGW = 8;
      setGameweekRange({
        start: startGW,
        end: endGW
      });
    }
  }, [availableGameweeks, gameweekRange.start]);

  // Get difficulty rating color class
  const getDifficultyColor = (difficulty: number) => {
    switch (difficulty) {
      case 1: return 'bg-green-700 text-white'; // Very Easy - Dark Green
      case 2: return 'bg-green-100 text-green-800'; // Easy - Light Green  
      case 3: return 'bg-gray-100 text-gray-800'; // Medium - Grey
      case 4: return 'bg-red-100 text-red-800'; // Hard - Light Red
      case 5: return 'bg-red-700 text-white'; // Very Hard - Dark Red
      default: return 'bg-gray-300 text-gray-900';
    }
  };

  // Get attacking tier for a team
  const getAttackingTier = (teamId: number): string => {
    if (!adminSettings) return 'average';
    
    const parseTeamArray = (teamData: any): number[] => {
      if (Array.isArray(teamData)) return teamData;
      if (typeof teamData === 'string') {
        try {
          return JSON.parse(teamData);
        } catch {
          return [];
        }
      }
      return [];
    };

    const eliteAttackTeams = parseTeamArray(adminSettings.eliteAttackTeams) || [];
    const strongAttackTeams = parseTeamArray(adminSettings.strongAttackTeams) || [];
    const weakAttackTeams = parseTeamArray(adminSettings.weakAttackTeams) || [];
    const promotedAttackTeams = parseTeamArray(adminSettings.promotedAttackTeams) || [];
    
    if (eliteAttackTeams.includes(teamId)) return 'elite';
    if (strongAttackTeams.includes(teamId)) return 'strong';
    if (weakAttackTeams.includes(teamId)) return 'weak';
    if (promotedAttackTeams.includes(teamId)) return 'promoted';
    return 'average';
  };

  // Get defensive tier for a team
  const getDefensiveTier = (teamId: number): string => {
    if (!adminSettings) return 'average';
    
    const parseTeamArray = (teamData: any): number[] => {
      if (Array.isArray(teamData)) return teamData;
      if (typeof teamData === 'string') {
        try {
          return JSON.parse(teamData);
        } catch {
          return [];
        }
      }
      return [];
    };

    const eliteDefenseTeams = parseTeamArray(adminSettings.eliteDefenseTeams) || [];
    const strongDefenseTeams = parseTeamArray(adminSettings.strongDefenseTeams) || [];
    const weakDefenseTeams = parseTeamArray(adminSettings.weakDefenseTeams) || [];
    const promotedDefenseTeams = parseTeamArray(adminSettings.promotedDefenseTeams) || [];
    
    if (eliteDefenseTeams.includes(teamId)) return 'elite';
    if (strongDefenseTeams.includes(teamId)) return 'strong';
    if (weakDefenseTeams.includes(teamId)) return 'weak';
    if (promotedDefenseTeams.includes(teamId)) return 'promoted';
    return 'average';
  };

  // Get tier color class
  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'elite': return 'bg-purple-600 text-white';
      case 'strong': return 'bg-blue-600 text-white';
      case 'average': return 'bg-gray-500 text-white';
      case 'weak': return 'bg-orange-600 text-white';
      case 'promoted': return 'bg-red-600 text-white';
      default: return 'bg-gray-300 text-gray-900';
    }
  };

  // Get tier numeric value for sorting
  const getTierValue = (tier: string) => {
    switch (tier) {
      case 'elite': return 5;
      case 'strong': return 4;
      case 'average': return 3;
      case 'weak': return 2;
      case 'promoted': return 1;
      default: return 3;
    }
  };

  // Build fixture matrix with average FDR calculation
  const { fixtureMatrix, teamAverageFDR } = useMemo(() => {
    if (!fixturesData || !bootstrapData?.events) return { fixtureMatrix: {}, teamAverageFDR: {} };
    
    // Use hardcoded teams for better performance
    const teams = PREMIER_LEAGUE_TEAMS;

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
    // Use hardcoded teams for better performance
    const teams = [...PREMIER_LEAGUE_TEAMS];
    
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
        {/* Unified Page Header */}
        <div className="fpl-page-header">
          <div className="fpl-page-title">
            <Calendar className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" />
            Fixture Analyzer
          </div>
          <p className="fpl-page-subtitle">
            Analyze upcoming fixtures from difficulty, attacking, and defensive perspectives
          </p>
        </div>

        <div className="fpl-section-spacing">
          {/* Unified Controls */}
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
                    onChange={(e) => setSortBy(e.target.value as 'team' | 'fdr-asc' | 'fdr-desc')}
                    className="px-3 py-1 border border-gray-300 rounded text-sm"
                    data-testid="select-sort-by"
                  >
                    <option value="team">Team Name</option>
                    <option value="fdr-asc">FDR (Easiest First)</option>
                    <option value="fdr-desc">FDR (Hardest First)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs for Different Analysis Views */}
          <Tabs defaultValue="difficulty" className="space-y-6">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="difficulty" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Balanced FDR
              </TabsTrigger>
              <TabsTrigger value="attacking" className="flex items-center gap-2">
                <Sword className="h-4 w-4" />
                Attacking FDR
              </TabsTrigger>
              <TabsTrigger value="defensive" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Defensive FDR
              </TabsTrigger>
            </TabsList>

            {/* Fixture Difficulty Tab */}
            <TabsContent value="difficulty" className="space-y-6">
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
            </TabsContent>

            {/* Attacking Analysis Tab */}
            <TabsContent value="attacking" className="space-y-6">
              <div className="flex flex-wrap gap-3 text-xs justify-center">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-600 rounded"></div>
                  <span>1 Very Easy</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-400 rounded"></div>
                  <span>2 Easy</span>
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
                  Attacking difficulty based on opponent's defensive strength
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
                        {sortedTeams.map(team => {
                          return (
                            <tr key={team.id} className="border-b hover:bg-gray-50">
                              <td className="sticky left-0 bg-white px-3 py-2 font-medium text-gray-900 border-r">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">{team.short_name}</span>
                                </div>
                              </td>
                              {gameweeks.map(gw => {
                                const fixture = fixtureMatrix[team.id]?.[gw];
                                if (!fixture) {
                                  return (
                                    <td key={gw} className={`px-1 py-1 text-center ${
                                      gw === currentGameweek ? 'bg-blue-50' : ''
                                    }`}>
                                      <div className="px-2 py-1 text-gray-300">-</div>
                                    </td>
                                  );
                                }

                                const opponentId = bootstrapData?.teams.find(t => t.short_name === fixture.opponent)?.id;
                                const opponentDefenseTier = opponentId ? getDefensiveTier(opponentId) : 'average';
                                
                                // Color by opponent's defensive tier (exact same colors as Balanced FDR)
                                const getOpponentDefenseColor = (defenseTier: string) => {
                                  switch (defenseTier) {
                                    case 'elite': return 'bg-red-700 text-white'; // Very Hard (FDR 5)
                                    case 'strong': return 'bg-red-100 text-red-800'; // Hard (FDR 4)
                                    case 'average': return 'bg-gray-100 text-gray-800'; // Medium (FDR 3)
                                    case 'weak': return 'bg-green-100 text-green-800'; // Easy (FDR 2)
                                    case 'promoted': return 'bg-green-700 text-white'; // Very Easy (FDR 1)
                                    default: return 'bg-gray-300 text-gray-900';
                                  }
                                };
                                
                                return (
                                  <td key={gw} className={`px-1 py-1 text-center ${
                                    gw === currentGameweek ? 'bg-blue-50' : ''
                                  }`}>
                                    <div 
                                      className={`px-1 py-1 rounded text-xs font-medium ${getOpponentDefenseColor(opponentDefenseTier)} ${
                                        fixture.finished ? 'opacity-50' : ''
                                      }`}
                                      title={`${fixture.isHome ? 'vs' : '@'} ${fixture.opponent} - ${opponentDefenseTier} defense`}
                                      data-testid={`attack-fixture-${team.id}-${gw}`}
                                    >
                                      <span className="truncate text-xs font-medium whitespace-nowrap">
                                        {fixture.opponent} ({fixture.isHome ? 'H' : 'A'})
                                      </span>
                                    </div>
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
            </TabsContent>

            {/* Defensive Analysis Tab */}
            <TabsContent value="defensive" className="space-y-6">
              <div className="flex flex-wrap gap-3 text-xs justify-center">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-600 rounded"></div>
                  <span>1 Very Easy</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-400 rounded"></div>
                  <span>2 Easy</span>
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
                  Defensive difficulty based on opponent's attacking strength
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
                        {sortedTeams.map(team => {
                          return (
                            <tr key={team.id} className="border-b hover:bg-gray-50">
                              <td className="sticky left-0 bg-white px-3 py-2 font-medium text-gray-900 border-r">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">{team.short_name}</span>
                                </div>
                              </td>
                              {gameweeks.map(gw => {
                                const fixture = fixtureMatrix[team.id]?.[gw];
                                if (!fixture) {
                                  return (
                                    <td key={gw} className={`px-1 py-1 text-center ${
                                      gw === currentGameweek ? 'bg-blue-50' : ''
                                    }`}>
                                      <div className="px-2 py-1 text-gray-300">-</div>
                                    </td>
                                  );
                                }

                                const opponentId = bootstrapData?.teams.find(t => t.short_name === fixture.opponent)?.id;
                                const opponentAttackTier = opponentId ? getAttackingTier(opponentId) : 'average';
                                
                                // Color by opponent's attacking tier (exact same colors as Balanced FDR)
                                const getOpponentAttackColor = (attackTier: string) => {
                                  switch (attackTier) {
                                    case 'elite': return 'bg-red-700 text-white'; // Very Hard (FDR 5)
                                    case 'strong': return 'bg-red-100 text-red-800'; // Hard (FDR 4)
                                    case 'average': return 'bg-gray-100 text-gray-800'; // Medium (FDR 3)
                                    case 'weak': return 'bg-green-100 text-green-800'; // Easy (FDR 2)
                                    case 'promoted': return 'bg-green-700 text-white'; // Very Easy (FDR 1)
                                    default: return 'bg-gray-300 text-gray-900';
                                  }
                                };
                                
                                return (
                                  <td key={gw} className={`px-1 py-1 text-center ${
                                    gw === currentGameweek ? 'bg-blue-50' : ''
                                  }`}>
                                    <div 
                                      className={`px-1 py-1 rounded text-xs font-medium ${getOpponentAttackColor(opponentAttackTier)} ${
                                        fixture.finished ? 'opacity-50' : ''
                                      }`}
                                      title={`${fixture.isHome ? 'vs' : '@'} ${fixture.opponent} - ${opponentAttackTier} attack`}
                                      data-testid={`defense-fixture-${team.id}-${gw}`}
                                    >
                                      <span className="truncate text-xs font-medium whitespace-nowrap">
                                        {fixture.opponent} ({fixture.isHome ? 'H' : 'A'})
                                      </span>
                                    </div>
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
            </TabsContent>
          </Tabs>

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
    
  );
}