import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Home, Plane, Info, Sword, Shield, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
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
    // Show next 6 gameweeks: GW4 to GW9
    return { start: 4, end: 9 };
  });
  const [sortBy, setSortBy] = useState<'team' | 'fdr-asc' | 'fdr-desc' | string>('fdr-asc');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [activeTab, setActiveTab] = useState<'difficulty' | 'attacking' | 'defensive'>('difficulty');

  const { data: bootstrapData, isLoading, error } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: fixturesData } = useQuery<Fixture[]>({
    queryKey: ["/api/fixtures"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch admin goal settings for tier analysis
  const { data: adminSettings, isLoading: adminSettingsLoading } = useQuery<any>({
    queryKey: ['/api/admin/goal-scored-settings'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });


  // Get current gameweek and available gameweeks
  const { currentGameweek, availableGameweeks } = useMemo(() => {
    if (!bootstrapData?.events) return { currentGameweek: 1, availableGameweeks: [] };
    
    // Find the first unfinished gameweek as the "current" gameweek
    const firstUnfinished = bootstrapData.events.find(event => !event.finished);
    const current = firstUnfinished ? firstUnfinished.id : 1;
    
    // Show all gameweeks from 4 to 38 for user selection
    const available = bootstrapData.events
      .filter(event => event.id >= 4 && event.id <= 38)
      .map(event => event.id)
      .sort((a, b) => a - b);
    
    return { currentGameweek: current, availableGameweeks: available };
  }, [bootstrapData]);

  // Update gameweek range when current gameweek changes - show next 6 gameweeks (GW4-GW9)
  useEffect(() => {
    if (availableGameweeks.length > 0 && gameweekRange.start !== 4) {
      // Start from GW4 and show next 6 gameweeks (GW4-GW9)
      const startGW = 4;
      const endGW = 9;
      setGameweekRange({
        start: startGW,
        end: endGW
      });
    }
  }, [availableGameweeks, gameweekRange.start]);

  // Get difficulty rating color class
  const getDifficultyColor = (difficulty: number) => {
    switch (difficulty) {
      case 1: return 'bg-green-300 text-green-800'; // Very Easy - Light Green
      case 2: return 'bg-green-100 text-green-800'; // Easy - Light Green  
      case 3: return 'bg-gray-100 text-gray-800'; // Medium - Grey
      case 4: return 'bg-red-100 text-red-800'; // Hard - Light Red
      case 5: return 'bg-red-300 text-red-800'; // Very Hard - Light Red
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
      case 'promoted': return 'bg-red-300 text-red-800';
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
  const { fixtureMatrix, teamAverageFDR, teamAverageAttackingFDR, teamAverageDefensiveFDR } = useMemo(() => {
    if (!fixturesData || !bootstrapData?.events) return { 
      fixtureMatrix: {}, 
      teamAverageFDR: {}, 
      teamAverageAttackingFDR: {}, 
      teamAverageDefensiveFDR: {} 
    };
    
    // Use hardcoded teams for better performance
    const teams = PREMIER_LEAGUE_TEAMS;

    const matrix: Record<number, Record<number, { opponent: string, difficulty: number, isHome: boolean, finished: boolean }>> = {};
    const avgFDR: Record<number, number> = {};
    const avgAttackingFDR: Record<number, number> = {};
    const avgDefensiveFDR: Record<number, number> = {};
    
    // Initialize matrix
    bootstrapData.teams.forEach(team => {
      matrix[team.id] = {};
    });

    // Helper function to get overall FDR (with promoted teams as FDR 1)
    const getOverallFDR = (originalDifficulty: number, opponentId: number) => {
      // Newly promoted teams (Leeds=11, Burnley=3, Sunderland=17) classified as Very Easy (FDR 1)
      const promotedTeams = [3, 11, 17]; // Burnley, Leeds, Sunderland
      if (promotedTeams.includes(opponentId)) {
        return 1; // Very Easy
      }
      return originalDifficulty; // Use original FDR for all other teams
    };

    // Fill matrix with fixtures (only unfinished fixtures)
    fixturesData.forEach(fixture => {
      if (fixture.event >= gameweekRange.start && fixture.event <= gameweekRange.end && !fixture.finished) {
        const homeTeam = bootstrapData.teams.find(t => t.id === fixture.team_h);
        const awayTeam = bootstrapData.teams.find(t => t.id === fixture.team_a);
        
        if (homeTeam && awayTeam) {
          // Home team entry (override FDR for promoted opponents in Overall FDR only)
          matrix[fixture.team_h][fixture.event] = {
            opponent: awayTeam.short_name,
            difficulty: getOverallFDR(fixture.team_h_difficulty, awayTeam.id),
            isHome: true,
            finished: fixture.finished
          };
          
          // Away team entry (override FDR for promoted opponents in Overall FDR only)
          matrix[fixture.team_a][fixture.event] = {
            opponent: homeTeam.short_name,
            difficulty: getOverallFDR(fixture.team_a_difficulty, homeTeam.id),
            isHome: false,
            finished: fixture.finished
          };
        }
      }
    });

    // Calculate average FDR for each team (all three types)
    bootstrapData.teams.forEach(team => {
      const teamFixtures = Object.values(matrix[team.id] || {});
      if (teamFixtures.length > 0) {
        // Original average FDR
        const totalDifficulty = teamFixtures.reduce((sum, fixture) => sum + fixture.difficulty, 0);
        avgFDR[team.id] = parseFloat((totalDifficulty / teamFixtures.length).toFixed(2));
        
        // Average Attacking FDR (based on opponent defensive strength)
        const gameweeks = Object.keys(matrix[team.id]).map(gw => parseInt(gw));
        let totalAttackingDifficulty = 0;
        let totalDefensiveDifficulty = 0;
        let validFixtures = 0;
        
        gameweeks.forEach(gw => {
          const fixture = matrix[team.id][gw];
          if (fixture) {
            const opponentId = bootstrapData.teams.find(t => t.short_name === fixture.opponent)?.id;
            if (opponentId) {
              // Calculate attacking difficulty (opponent's defensive tier)
              const opponentDefenseTier = getDefensiveTier(opponentId);
              const attackingDifficulty = (() => {
                switch (opponentDefenseTier) {
                  case 'elite': return 5;
                  case 'strong': return 4;
                  case 'average': return 3;
                  case 'weak': return 2;
                  case 'promoted': return 1;
                  default: return 3;
                }
              })();
              
              // Calculate defensive difficulty (opponent's attacking tier)
              const opponentAttackTier = getAttackingTier(opponentId);
              const defensiveDifficulty = (() => {
                switch (opponentAttackTier) {
                  case 'elite': return 5;
                  case 'strong': return 4;
                  case 'average': return 3;
                  case 'weak': return 2;
                  case 'promoted': return 1;
                  default: return 3;
                }
              })();
              
              totalAttackingDifficulty += attackingDifficulty;
              totalDefensiveDifficulty += defensiveDifficulty;
              validFixtures++;
            }
          }
        });
        
        if (validFixtures > 0) {
          avgAttackingFDR[team.id] = parseFloat((totalAttackingDifficulty / validFixtures).toFixed(2));
          avgDefensiveFDR[team.id] = parseFloat((totalDefensiveDifficulty / validFixtures).toFixed(2));
        } else {
          avgAttackingFDR[team.id] = 0;
          avgDefensiveFDR[team.id] = 0;
        }
      } else {
        avgFDR[team.id] = 0;
        avgAttackingFDR[team.id] = 0;
        avgDefensiveFDR[team.id] = 0;
      }
    });

    return { 
      fixtureMatrix: matrix, 
      teamAverageFDR: avgFDR,
      teamAverageAttackingFDR: avgAttackingFDR,
      teamAverageDefensiveFDR: avgDefensiveFDR
    };
  }, [bootstrapData, fixturesData, gameweekRange, adminSettings]);

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
      // If clicking the same column, toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // If clicking a new column, set it and default to ascending
      setSortBy(column);
      setSortDirection('asc');
    }
  };

  // Helper function to get attacking difficulty (opponent defensive tier value)
  const getAttackingDifficulty = (teamId: number, gw: number) => {
    const fixture = fixtureMatrix[teamId]?.[gw];
    if (!fixture) return 0;
    
    const opponentId = bootstrapData?.teams.find(t => t.short_name === fixture.opponent)?.id;
    if (!opponentId) return 0;
    
    const opponentDefenseTier = getDefensiveTier(opponentId);
    
    // Convert defensive tier to attacking difficulty (reverse mapping)
    switch (opponentDefenseTier) {
      case 'elite': return 5; // Very Hard for attackers
      case 'strong': return 4; // Hard for attackers  
      case 'average': return 3; // Medium for attackers
      case 'weak': return 2; // Easy for attackers
      case 'promoted': return 1; // Very Easy for attackers
      default: return 3;
    }
  };

  // Helper function to get defensive difficulty (opponent attacking tier value)
  const getDefensiveDifficulty = (teamId: number, gw: number) => {
    const fixture = fixtureMatrix[teamId]?.[gw];
    if (!fixture) return 0;
    
    const opponentId = bootstrapData?.teams.find(t => t.short_name === fixture.opponent)?.id;
    if (!opponentId) return 0;
    
    const opponentAttackTier = getAttackingTier(opponentId);
    
    // Convert attacking tier to defensive difficulty
    switch (opponentAttackTier) {
      case 'elite': return 5; // Very Hard for defenders
      case 'strong': return 4; // Hard for defenders
      case 'average': return 3; // Medium for defenders
      case 'weak': return 2; // Easy for defenders
      case 'promoted': return 1; // Very Easy for defenders
      default: return 3;
    }
  };

  // Sort teams based on selected sort option
  const sortedTeams = useMemo(() => {
    // Use hardcoded teams for better performance
    const teams = [...PREMIER_LEAGUE_TEAMS];
    
    switch (sortBy) {
      case 'team':
        return teams.sort((a, b) => 
          sortDirection === 'asc' 
            ? a.short_name.localeCompare(b.short_name)
            : b.short_name.localeCompare(a.short_name)
        );
      case 'fdr-avg':
        // Use different average FDR based on active tab
        const getAvgFDR = (teamId: number) => {
          if (activeTab === 'attacking') return teamAverageAttackingFDR[teamId] || 0;
          if (activeTab === 'defensive') return teamAverageDefensiveFDR[teamId] || 0;
          return teamAverageFDR[teamId] || 0;
        };
        
        return teams.sort((a, b) => 
          sortDirection === 'asc' 
            ? getAvgFDR(a.id) - getAvgFDR(b.id)
            : getAvgFDR(b.id) - getAvgFDR(a.id)
        );
      case 'fdr-asc':
        return teams.sort((a, b) => (teamAverageFDR[a.id] || 0) - (teamAverageFDR[b.id] || 0));
      case 'fdr-desc':
        return teams.sort((a, b) => (teamAverageFDR[b.id] || 0) - (teamAverageFDR[a.id] || 0));
      default:
        // Check if sorting by gameweek (format: 'gw-X')
        if (sortBy.startsWith('gw-')) {
          const gw = parseInt(sortBy.replace('gw-', ''));
          return teams.sort((a, b) => {
            let diffA: number, diffB: number;
            
            if (activeTab === 'attacking') {
              // For attacking analysis, sort by opponent's defensive strength
              diffA = getAttackingDifficulty(a.id, gw);
              diffB = getAttackingDifficulty(b.id, gw);
            } else if (activeTab === 'defensive') {
              // For defensive analysis, sort by opponent's attacking strength  
              diffA = getDefensiveDifficulty(a.id, gw);
              diffB = getDefensiveDifficulty(b.id, gw);
            } else {
              // For overall difficulty, use original FDR values
              const fixtureA = fixtureMatrix[a.id]?.[gw];
              const fixtureB = fixtureMatrix[b.id]?.[gw];
              diffA = fixtureA?.difficulty || 0;
              diffB = fixtureB?.difficulty || 0;
            }
            
            return sortDirection === 'asc' ? diffA - diffB : diffB - diffA;
          });
        }
        return teams.sort((a, b) => a.short_name.localeCompare(b.short_name));
    }
  }, [fixtureMatrix, teamAverageFDR, teamAverageAttackingFDR, teamAverageDefensiveFDR, sortBy, sortDirection, bootstrapData, activeTab]);

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
            <Calendar className="h-8 w-8" />
            <h1>Fixture Analyzer</h1>
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
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === 'fdr-asc' || value === 'fdr-desc') {
                        setSortBy('fdr-avg');
                        setSortDirection(value === 'fdr-asc' ? 'asc' : 'desc');
                      } else {
                        setSortBy(value);
                        setSortDirection('asc');
                      }
                    }}
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
          <Tabs defaultValue="difficulty" className="space-y-6" onValueChange={(value) => setActiveTab(value as 'difficulty' | 'attacking' | 'defensive')}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="difficulty" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Overall FDR
              </TabsTrigger>
              <TabsTrigger value="attacking" className="flex items-center gap-2">
                <Sword className="h-4 w-4" />
                FDR for Attackers
              </TabsTrigger>
              <TabsTrigger value="defensive" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                FDR for Defenders
              </TabsTrigger>
            </TabsList>

            {/* Fixture Difficulty Tab */}
            <TabsContent value="difficulty" className="space-y-6">
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
            </TabsContent>

            {/* Attacking Analysis Tab */}
            <TabsContent value="attacking" className="space-y-6">
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
                          <th className="sticky left-0 bg-gray-50 px-3 py-2 text-left font-semibold min-w-24">
                            <button
                              onClick={() => handleSort('team')}
                              className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                              data-testid="sort-team-attacking"
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
                              data-testid="sort-avg-fdr-attacking"
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
                                data-testid={`sort-gw-${gw}-attacking`}
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
                          const avgFDR = teamAverageAttackingFDR[team.id];
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
                                    case 'elite': return 'bg-red-300 text-red-800'; // Very Hard (FDR 5) - light red
                                    case 'strong': return 'bg-red-100 text-red-800'; // Hard (FDR 4)
                                    case 'average': return 'bg-gray-100 text-gray-800'; // Medium (FDR 3)
                                    case 'weak': return 'bg-green-100 text-green-800'; // Easy (FDR 2)
                                    case 'promoted': return 'bg-green-300 text-green-800'; // Very Easy (FDR 1) - light green
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
                          <th className="sticky left-0 bg-gray-50 px-3 py-2 text-left font-semibold min-w-24">
                            <button
                              onClick={() => handleSort('team')}
                              className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                              data-testid="sort-team-defensive"
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
                              data-testid="sort-avg-fdr-defensive"
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
                                data-testid={`sort-gw-${gw}-defensive`}
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
                          const avgFDR = teamAverageDefensiveFDR[team.id];
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
                                    case 'elite': return 'bg-red-300 text-red-800'; // Very Hard (FDR 5) - light red
                                    case 'strong': return 'bg-red-100 text-red-800'; // Hard (FDR 4)
                                    case 'average': return 'bg-gray-100 text-gray-800'; // Medium (FDR 3)
                                    case 'weak': return 'bg-green-100 text-green-800'; // Easy (FDR 2)
                                    case 'promoted': return 'bg-green-300 text-green-800'; // Very Easy (FDR 1) - light green
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
                      <div className="w-6 h-6 bg-green-300 rounded"></div>
                      <div>
                        <span className="font-medium">1: Very Easy</span>
                        <p className="text-sm text-gray-600">Highly favorable fixtures - excellent scoring potential</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-green-100 border border-green-200 rounded"></div>
                      <div>
                        <span className="font-medium">2: Easy</span>
                        <p className="text-sm text-gray-600">Good fixtures - above average scoring potential</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-gray-100 border border-gray-300 rounded"></div>
                      <div>
                        <span className="font-medium">3: Medium</span>
                        <p className="text-sm text-gray-600">Average difficulty - consider form and other factors</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-red-100 border border-red-200 rounded"></div>
                      <div>
                        <span className="font-medium">4: Hard</span>
                        <p className="text-sm text-gray-600">Difficult fixtures - below average scoring potential</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-red-300 rounded"></div>
                      <div>
                        <span className="font-medium">5: Very Hard</span>
                        <p className="text-sm text-gray-600">Highly challenging fixtures - low scoring potential</p>
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