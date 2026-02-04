import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, ArrowUpDown, ArrowUp, ArrowDown, Settings, RotateCcw, X, ChevronDown, ChevronUp } from "lucide-react";
import { BootstrapData } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { computeNextRange, getDefaultGameweekRange, getNextGameweeksForDropdown } from "@shared/gameweek-utils";

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

interface CustomFDR {
  [teamId: number]: {
    home: number;
    away: number;
  };
}

export default function Fixtures() {
  // Dynamic gameweek range based on current gameweek
  const [gameweekRange, setGameweekRange] = useState<{ start: number; end: number } | null>(null);
  const [sortBy, setSortBy] = useState<'team' | 'fdr-avg' | string>('fdr-avg');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [customFDROpen, setCustomFDROpen] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [fdrMode, setFdrMode] = useState<'official' | 'form' | 'custom'>('official');
  const [excludedGameweeks, setExcludedGameweeks] = useState<Set<number>>(new Set());
  const [excludedTeams, setExcludedTeams] = useState<Set<number>>(new Set());
  
  // Load custom FDR from localStorage
  const [customFDR, setCustomFDR] = useState<CustomFDR>(() => {
    const stored = localStorage.getItem('fpl-custom-fdr');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return {};
      }
    }
    return {};
  });
  
  // Save custom FDR to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('fpl-custom-fdr', JSON.stringify(customFDR));
  }, [customFDR]);
  
  const updateCustomFDR = (teamId: number, venue: 'home' | 'away', value: number) => {
    setCustomFDR(prev => ({
      ...prev,
      [teamId]: {
        ...prev[teamId],
        home: venue === 'home' ? value : (prev[teamId]?.home),
        away: venue === 'away' ? value : (prev[teamId]?.away)
      }
    }));
  };
  
  const resetCustomFDR = () => {
    setCustomFDR({});
    localStorage.removeItem('fpl-custom-fdr');
  };
  
  const resetTeamFDR = (teamId: number) => {
    setCustomFDR(prev => {
      const updated = { ...prev };
      delete updated[teamId];
      return updated;
    });
  };

  const { data: bootstrapData, isLoading, error } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: fixturesData } = useQuery<Fixture[]>({
    queryKey: ["/api/fixtures"],
    staleTime: 5 * 60 * 1000,
  });

  // Fetch form-based FDR ratings
  const { data: formBasedFDR } = useQuery<Record<number, { home: number; away: number }>>({
    queryKey: ["/api/form-based-fdr"],
    staleTime: 5 * 60 * 1000,
    enabled: fdrMode === 'form',
  });

  // Initialize gameweek range when bootstrap data loads
  useEffect(() => {
    if (bootstrapData?.events && !gameweekRange) {
      const range = computeNextRange(bootstrapData.events);
      // Default to 6 gameweeks for fixture analyzer
      const endGw = Math.min(range.start + 5, 38);
      setGameweekRange({ start: range.start, end: endGw });
    }
  }, [bootstrapData?.events, gameweekRange]);

  // Clear excluded gameweeks when gameweek range changes
  const handleGameweekRangeChange = (start: number, end: number) => {
    setGameweekRange({ start, end });
    setExcludedGameweeks(new Set()); // Clear exclusions when range changes
  };

  // Calculate default FDR values from official FPL API ratings
  // Note: "home" = facing this team when YOU are at home (they are away)
  //       "away" = facing this team when YOU are away (they are at home)
  const defaultFDR = useMemo(() => {
    if (!fixturesData || !bootstrapData?.teams) return {};
    
    const fdrMap: Record<number, { home: number[], away: number[] }> = {};
    
    // Initialize for all teams
    bootstrapData.teams.forEach(team => {
      fdrMap[team.id] = { home: [], away: [] };
    });
    
    // Collect official FPL difficulty ratings for each team as an opponent
    fixturesData.forEach(fixture => {
      // When this team is AWAY (you face them at HOME), use home team's difficulty
      if (fixture.team_a && fixture.team_h_difficulty) {
        fdrMap[fixture.team_a].home.push(fixture.team_h_difficulty);
      }
      // When this team is HOME (you face them AWAY), use away team's difficulty
      if (fixture.team_h && fixture.team_a_difficulty) {
        fdrMap[fixture.team_h].away.push(fixture.team_a_difficulty);
      }
    });
    
    // Calculate average official FPL FDR for home and away
    const avgFDR: Record<number, { home: number, away: number }> = {};
    Object.entries(fdrMap).forEach(([teamId, ratings]) => {
      const homeAvg = ratings.home.length > 0 
        ? Math.round(ratings.home.reduce((a, b) => a + b, 0) / ratings.home.length)
        : 3;
      const awayAvg = ratings.away.length > 0
        ? Math.round(ratings.away.reduce((a, b) => a + b, 0) / ratings.away.length)
        : 3;
      avgFDR[parseInt(teamId)] = { home: homeAvg, away: awayAvg };
    });
    
    return avgFDR;
  }, [fixturesData, bootstrapData]);

  // Calculate dynamic gameweek defaults using shared utilities
  const defaultGameweekRange = useMemo(() => {
    if (!bootstrapData?.events) {
      return { startGameweek: "10", endGameweek: "15" }; // Fallback
    }
    return getDefaultGameweekRange(bootstrapData.events, 6);
  }, [bootstrapData?.events]);

  // Extract next gameweek for highlighting purposes
  const nextGameweek = parseInt(defaultGameweekRange.startGameweek);

  // Get available gameweeks for dropdown options (from next GW to GW38)
  const availableGameweeks = useMemo(() => {
    if (!bootstrapData?.events) {
      return Array.from({ length: 29 }, (_, i) => i + 10); // Fallback
    }
    // Find the next unfinished gameweek
    const nextGW = bootstrapData.events.find(e => !e.finished)?.id || 1;
    // Return all gameweeks from next GW to 38
    return Array.from({ length: 38 - nextGW + 1 }, (_, i) => nextGW + i);
  }, [bootstrapData?.events]);

  // Update gameweek range when bootstrap data changes (default next 6 gameweeks)
  useEffect(() => {
    if (bootstrapData?.events) {
      const range = getDefaultGameweekRange(bootstrapData.events, 6);
      setGameweekRange({
        start: parseInt(range.startGameweek),
        end: parseInt(range.endGameweek)
      });
    }
  }, [bootstrapData?.events]);

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
  
  // Exclude all teams
  const excludeAllTeams = () => {
    if (bootstrapData?.teams) {
      setExcludedTeams(new Set(bootstrapData.teams.map(t => t.id)));
    }
  };

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
    if (!fixturesData || !bootstrapData?.events || !gameweekRange) return { 
      fixtureMatrix: {}, 
      teamAverageFDR: {} 
    };

    const matrix: Record<number, Record<number, { opponent: string, difficulty: number, isHome: boolean, finished: boolean }>> = {};
    const avgFDR: Record<number, number> = {};
    
    // Initialize matrix
    bootstrapData.teams.forEach(team => {
      matrix[team.id] = {};
    });

    // Helper function to get overall FDR based on selected mode
    const getOverallFDR = (originalDifficulty: number, opponentId: number, isHome: boolean) => {
      // Mode 1: Custom FDR (if custom values exist)
      if (fdrMode === 'custom') {
        const customRating = customFDR[opponentId];
        if (customRating) {
          // If you're playing at home, opponent is away (use their away rating)
          // If you're playing away, opponent is at home (use their home rating)
          const customValue = isHome ? customRating.away : customRating.home;
          if (customValue !== undefined && customValue > 0) {
            return customValue;
          }
        }
        // Fall back to official if no custom value set
        return originalDifficulty > 0 ? originalDifficulty : 3;
      }
      
      // Mode 2: Form-based FDR
      if (fdrMode === 'form' && formBasedFDR) {
        const formRating = formBasedFDR[opponentId];
        if (formRating) {
          // If you're playing at home, opponent is away (use their away rating)
          // If you're playing away, opponent is at home (use their home rating)
          return isHome ? formRating.away : formRating.home;
        }
      }
      
      // Mode 3: Official FPL ratings (default)
      return originalDifficulty > 0 ? originalDifficulty : 3;
    };

    // Fill matrix with fixtures
    fixturesData.forEach(fixture => {
      if (fixture.event >= gameweekRange.start && fixture.event <= gameweekRange.end) {
        const homeTeam = bootstrapData.teams.find(t => t.id === fixture.team_h);
        const awayTeam = bootstrapData.teams.find(t => t.id === fixture.team_a);
        
        if (homeTeam && awayTeam) {
          matrix[fixture.team_h][fixture.event] = {
            opponent: awayTeam.short_name,
            difficulty: getOverallFDR(fixture.team_h_difficulty, awayTeam.id, true),
            isHome: true,
            finished: fixture.finished
          };
          
          matrix[fixture.team_a][fixture.event] = {
            opponent: homeTeam.short_name,
            difficulty: getOverallFDR(fixture.team_a_difficulty, homeTeam.id, false),
            isHome: false,
            finished: fixture.finished
          };
        }
      }
    });

    // Calculate average FDR for each team (only for non-excluded gameweeks)
    bootstrapData.teams.forEach(team => {
      const teamFixturesEntries = Object.entries(matrix[team.id] || {});
      const filteredFixtures = teamFixturesEntries.filter(([gw]) => !excludedGameweeks.has(parseInt(gw)));
      if (filteredFixtures.length > 0) {
        const totalDifficulty = filteredFixtures.reduce((sum, [, fixture]) => sum + fixture.difficulty, 0);
        avgFDR[team.id] = parseFloat((totalDifficulty / filteredFixtures.length).toFixed(2));
      } else {
        avgFDR[team.id] = 0;
      }
    });

    return { 
      fixtureMatrix: matrix, 
      teamAverageFDR: avgFDR
    };
  }, [bootstrapData, fixturesData, gameweekRange, customFDR, fdrMode, formBasedFDR, excludedGameweeks]);

  // All gameweeks in range (for toggle display)
  const allGameweeksInRange = useMemo(() => {
    if (!gameweekRange) return [];
    const gws = [];
    for (let i = gameweekRange.start; i <= gameweekRange.end; i++) {
      gws.push(i);
    }
    return gws;
  }, [gameweekRange]);

  // Active gameweeks (excluding excluded ones) - used for display
  const gameweeks = useMemo(() => {
    return allGameweeksInRange.filter(gw => !excludedGameweeks.has(gw));
  }, [allGameweeksInRange, excludedGameweeks]);

  // Calculate best rotation pairs - teams that complement each other's fixtures
  const rotationPairs = useMemo(() => {
    if (!bootstrapData?.teams || !fixtureMatrix || gameweeks.length === 0) return [];
    
    const teams = bootstrapData.teams.filter(t => !excludedTeams.has(t.id));
    const pairs: Array<{
      team1: typeof teams[0];
      team2: typeof teams[0];
      rotationScore: number;
      fixturesByGameweek: Array<{ 
        gw: number; 
        team1Fixture: { opponent: string; isHome: boolean; difficulty: number };
        team2Fixture: { opponent: string; isHome: boolean; difficulty: number };
      }>;
      combinedAvgDifficulty: number;
    }> = [];

    // Calculate rotation score for each pair
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const team1 = teams[i];
        const team2 = teams[j];
        
        let rotationScore = 0;
        let combinedDifficulty = 0;
        const fixturesByGameweek: Array<{ 
          gw: number; 
          team1Fixture: { opponent: string; isHome: boolean; difficulty: number };
          team2Fixture: { opponent: string; isHome: boolean; difficulty: number };
        }> = [];
        
        gameweeks.forEach(gw => {
          const fixture1 = fixtureMatrix[team1.id]?.[gw];
          const fixture2 = fixtureMatrix[team2.id]?.[gw];
          
          const diff1 = fixture1?.difficulty || 3;
          const diff2 = fixture2?.difficulty || 3;
          
          const easierDifficulty = Math.min(diff1, diff2);
          combinedDifficulty += easierDifficulty;
          
          fixturesByGameweek.push({
            gw,
            team1Fixture: {
              opponent: fixture1?.opponent || '-',
              isHome: fixture1?.isHome ?? true,
              difficulty: diff1
            },
            team2Fixture: {
              opponent: fixture2?.opponent || '-',
              isHome: fixture2?.isHome ?? true,
              difficulty: diff2
            }
          });
          
          // Rotation score: reward when one team has easy (1-2) while other has hard (4-5)
          if ((diff1 <= 2 && diff2 >= 4) || (diff2 <= 2 && diff1 >= 4)) {
            rotationScore += 3; // Perfect rotation week
          } else if ((diff1 <= 2 && diff2 === 3) || (diff2 <= 2 && diff1 === 3)) {
            rotationScore += 2; // Good rotation week
          } else if ((diff1 <= 3 && diff2 >= 4) || (diff2 <= 3 && diff1 >= 4)) {
            rotationScore += 1; // Decent rotation week
          } else if (diff1 >= 4 && diff2 >= 4) {
            rotationScore -= 2; // Both have hard fixtures - bad
          }
        });
        
        pairs.push({
          team1,
          team2,
          rotationScore,
          fixturesByGameweek,
          combinedAvgDifficulty: parseFloat((combinedDifficulty / gameweeks.length).toFixed(2))
        });
      }
    }
    
    // Sort by rotation score (higher is better), then by combined avg difficulty (lower is better)
    return pairs.sort((a, b) => {
      if (b.rotationScore !== a.rotationScore) {
        return b.rotationScore - a.rotationScore;
      }
      return a.combinedAvgDifficulty - b.combinedAvgDifficulty;
    }).slice(0, 10); // Top 10 pairs
  }, [bootstrapData, fixtureMatrix, gameweeks, excludedTeams]);

  // Handle column header click for sorting
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
  };

  // Sort teams based on selected sort option (filtering out excluded teams)
  const sortedTeams = useMemo(() => {
    if (!bootstrapData?.teams) return [];
    const teams = [...bootstrapData.teams].filter(team => !excludedTeams.has(team.id));
    
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
  }, [bootstrapData, fixtureMatrix, teamAverageFDR, sortBy, sortDirection, excludedTeams]);

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
          <div 
            className="fpl-card-header cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => setFiltersExpanded(!filtersExpanded)}
          >
            <div className="fpl-card-title flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Fixture Controls
              </div>
              {filtersExpanded ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
            </div>
          </div>
          {filtersExpanded && (
          <div className="fpl-card-content">
            <div className="flex flex-col gap-4">
              {/* FDR Mode Selector */}
              <div className="flex flex-col items-center gap-2">
                <Label className="text-xs font-semibold text-gray-700">FDR Mode</Label>
                <RadioGroup value={fdrMode} onValueChange={(value: 'official' | 'form' | 'custom') => setFdrMode(value)} className="flex gap-3 justify-center">
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="official" id="fdr-official" data-testid="radio-fdr-official" />
                    <Label htmlFor="fdr-official" className="text-xs cursor-pointer">Official</Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="form" id="fdr-form" data-testid="radio-fdr-form" />
                    <Label htmlFor="fdr-form" className="text-xs cursor-pointer">Form</Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="custom" id="fdr-custom" data-testid="radio-fdr-custom" />
                    <Label htmlFor="fdr-custom" className="text-xs cursor-pointer">Custom</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Gameweek Range and Customize Button */}
              <div className="flex flex-col sm:flex-row gap-2 items-center justify-center">
                <div className="flex items-center gap-1">
                  <label className="text-xs font-medium text-gray-700">GW:</label>
                  <select 
                    value={gameweekRange?.start || ''} 
                    onChange={(e) => handleGameweekRangeChange(parseInt(e.target.value), gameweekRange?.end || 38)}
                    className="px-2 py-1 border border-gray-300 rounded text-xs"
                    data-testid="select-start-gameweek"
                  >
                    {availableGameweeks.map(gw => (
                      <option key={gw} value={gw}>{gw}</option>
                    ))}
                  </select>
                  <span className="text-gray-500 text-xs">to</span>
                  <select 
                    value={gameweekRange?.end || ''} 
                    onChange={(e) => handleGameweekRangeChange(gameweekRange?.start || 1, parseInt(e.target.value))}
                    className="px-2 py-1 border border-gray-300 rounded text-xs"
                    data-testid="select-end-gameweek"
                  >
                    {availableGameweeks.filter(gw => gw >= (gameweekRange?.start || 1)).map(gw => (
                      <option key={gw} value={gw}>{gw}</option>
                    ))}
                  </select>
                </div>

                {fdrMode === 'custom' && (
                <div className="flex items-center gap-2">
                <Dialog open={customFDROpen} onOpenChange={setCustomFDROpen}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex items-center gap-2"
                      data-testid="button-customize-fdr"
                    >
                      <Settings className="h-4 w-4" />
                      Customize FDR
                    </Button>
                  </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Customize Fixture Difficulty Ratings</DialogTitle>
                    <DialogDescription>
                      Set custom FDR values (1-5) for each opponent. (H) = when YOU play at home vs them. (A) = when YOU play away vs them.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="flex flex-wrap gap-3 text-xs justify-center bg-gray-50 p-3 rounded-lg border">
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 bg-green-300 rounded"></div>
                        <span className="font-medium">1 - Very Easy</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 bg-green-100 border border-green-200 rounded"></div>
                        <span className="font-medium">2 - Easy</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
                        <span className="font-medium">3 - Medium</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 bg-red-100 border border-red-200 rounded"></div>
                        <span className="font-medium">4 - Hard</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 bg-red-300 rounded"></div>
                        <span className="font-medium">5 - Very Hard</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {bootstrapData?.teams.map(team => {
                        const teamDefaultFDR = defaultFDR[team.id] || { home: 3, away: 3 };
                        const hasCustom = !!customFDR[team.id];
                        
                        return (
                          <div key={team.id} className={`border rounded-lg p-3 space-y-2 ${hasCustom ? 'border-blue-300 bg-blue-50/30' : ''}`}>
                            <div className="flex items-center justify-between">
                              <div className="font-semibold text-sm">{team.name}</div>
                              {hasCustom && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => resetTeamFDR(team.id)}
                                  className="h-6 px-2 text-xs"
                                  data-testid={`button-reset-team-${team.id}`}
                                >
                                  <RotateCcw className="h-3 w-3 mr-1" />
                                  Reset
                                </Button>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label htmlFor={`home-${team.id}`} className="text-xs text-gray-600">
                                  {team.short_name} (H) <span className="text-gray-400">(Default: {teamDefaultFDR.home})</span>
                                </Label>
                                <Input
                                  id={`home-${team.id}`}
                                  type="number"
                                  min="1"
                                  max="5"
                                  value={customFDR[team.id]?.home ?? ''}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    if (val >= 1 && val <= 5) {
                                      updateCustomFDR(team.id, 'home', val);
                                    }
                                  }}
                                  placeholder={teamDefaultFDR.home.toString()}
                                  className={`h-8 ${customFDR[team.id]?.home ? 'border-blue-400 bg-blue-50' : ''}`}
                                  data-testid={`input-fdr-home-${team.id}`}
                                />
                              </div>
                              <div>
                                <Label htmlFor={`away-${team.id}`} className="text-xs text-gray-600">
                                  {team.short_name} (A) <span className="text-gray-400">(Default: {teamDefaultFDR.away})</span>
                                </Label>
                                <Input
                                  id={`away-${team.id}`}
                                  type="number"
                                  min="1"
                                  max="5"
                                  value={customFDR[team.id]?.away ?? ''}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    if (val >= 1 && val <= 5) {
                                      updateCustomFDR(team.id, 'away', val);
                                    }
                                  }}
                                  placeholder={teamDefaultFDR.away.toString()}
                                  className={`h-8 ${customFDR[team.id]?.away ? 'border-blue-400 bg-blue-50' : ''}`}
                                  data-testid={`input-fdr-away-${team.id}`}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between pt-4 border-t">
                      <Button 
                        variant="outline" 
                        onClick={resetCustomFDR}
                        data-testid="button-reset-fdr"
                      >
                        Reset to Default
                      </Button>
                      <Button 
                        onClick={() => setCustomFDROpen(false)}
                        data-testid="button-close-fdr"
                      >
                        Done
                      </Button>
                    </div>
                  </div>
                </DialogContent>
                </Dialog>
                
                {Object.keys(customFDR).length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={resetCustomFDR}
                    className="flex items-center gap-2"
                    data-testid="button-reset-fdr-main"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset to Default FDR
                  </Button>
                )}
                </div>
                )}
              </div>

              {/* Gameweek Toggle Section */}
              <div className="mt-3 pt-3 border-t">
                <div className="flex flex-wrap items-center justify-between gap-1 mb-2">
                  <label className="text-xs font-medium text-gray-700">
                    Toggle GWs:
                  </label>
                  {excludedGameweeks.size > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={clearGameweekExclusions}
                      className="text-[10px] text-gray-500 hover:text-gray-700 px-1 py-0.5 h-auto"
                      data-testid="button-clear-gw-exclusions"
                    >
                      <X className="h-3 w-3 mr-0.5" />
                      Clear
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 justify-center">
                  {allGameweeksInRange.map((gw) => {
                    const isExcluded = excludedGameweeks.has(gw);
                    return (
                      <Button
                        key={gw}
                        variant="outline"
                        size="sm"
                        onClick={() => toggleGameweekExclusion(gw)}
                        className={`min-w-[32px] text-[10px] px-1.5 py-0.5 h-6 ${isExcluded ? 'bg-gray-100 text-gray-400 line-through hover:bg-gray-200 border border-gray-300' : 'bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-300'}`}
                        data-testid={`button-toggle-gw-${gw}`}
                      >
                        {gw}
                      </Button>
                    );
                  })}
                </div>
                {excludedGameweeks.size > 0 && (
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Excluded: {Array.from(excludedGameweeks).sort((a, b) => a - b).map(gw => `GW${gw}`).join(', ')}
                  </p>
                )}
              </div>

              {/* Team Toggle Section */}
              <div className="mt-3 pt-3 border-t">
                <div className="flex flex-wrap items-center justify-between gap-1 mb-2">
                  <label className="text-xs font-medium text-gray-700">
                    Toggle Teams:
                  </label>
                  <div className="flex gap-1">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={clearTeamExclusions}
                      className="text-[10px] bg-green-50 text-green-700 hover:bg-green-100 border-green-300 px-1.5 py-0.5 h-auto"
                      data-testid="button-include-all-teams"
                    >
                      All
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={excludeAllTeams}
                      className="text-[10px] bg-red-50 text-red-700 hover:bg-red-100 border-red-300 px-1.5 py-0.5 h-auto"
                      data-testid="button-exclude-all-teams"
                    >
                      None
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 justify-center">
                  {bootstrapData?.teams
                    ?.slice()
                    .sort((a, b) => a.short_name.localeCompare(b.short_name))
                    .map((team) => {
                      const isExcluded = excludedTeams.has(team.id);
                      return (
                        <Button
                          key={team.id}
                          variant="outline"
                          size="sm"
                          onClick={() => toggleTeamExclusion(team.id)}
                          className={`min-w-[32px] text-[10px] px-1 py-0.5 h-6 ${isExcluded ? 'bg-gray-100 text-gray-400 line-through hover:bg-gray-200 border border-gray-300' : 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300'}`}
                          data-testid={`button-toggle-team-${team.id}`}
                        >
                          {team.short_name}
                        </Button>
                      );
                    })}
                </div>
                {excludedTeams.size > 0 && (
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Excluded: {Array.from(excludedTeams)
                      .map(id => bootstrapData?.teams.find(t => t.id === id)?.short_name || '')
                      .filter(Boolean)
                      .sort()
                      .join(', ')}
                  </p>
                )}
              </div>
            </div>
          </div>
          )}
        </div>

        {/* Fixture Difficulty Analysis */}
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 text-[10px] justify-center">
            <div className="flex items-center gap-0.5">
              <div className="w-2.5 h-2.5 bg-green-300 rounded"></div>
              <span>1</span>
            </div>
            <div className="flex items-center gap-0.5">
              <div className="w-2.5 h-2.5 bg-green-100 border border-green-200 rounded"></div>
              <span>2</span>
            </div>
            <div className="flex items-center gap-0.5">
              <div className="w-2.5 h-2.5 bg-gray-100 border border-gray-300 rounded"></div>
              <span>3</span>
            </div>
            <div className="flex items-center gap-0.5">
              <div className="w-2.5 h-2.5 bg-red-100 border border-red-200 rounded"></div>
              <span>4</span>
            </div>
            <div className="flex items-center gap-0.5">
              <div className="w-2.5 h-2.5 bg-red-300 rounded"></div>
              <span>5</span>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-[10px] md:text-xs border-collapse">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="sticky left-0 bg-gray-50 px-1 md:px-2 py-1 text-left font-semibold min-w-[60px] md:min-w-[80px] z-20">
                        <button
                          onClick={() => handleSort('team')}
                          className="flex items-center gap-0.5 hover:text-blue-600 transition-colors"
                          data-testid="sort-team"
                        >
                          Team
                          {sortBy === 'team' && (
                            sortDirection === 'asc' ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />
                          )}
                        </button>
                      </th>
                      <th className="sticky left-[60px] md:left-[80px] bg-gray-50 px-1 py-1 text-center font-semibold min-w-[36px] md:min-w-[50px] border-l z-20">
                        <button
                          onClick={() => handleSort('fdr-avg')}
                          className="flex items-center gap-0.5 hover:text-blue-600 transition-colors mx-auto"
                          data-testid="sort-avg-fdr"
                        >
                          Avg
                          {sortBy === 'fdr-avg' && (
                            sortDirection === 'asc' ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />
                          )}
                        </button>
                      </th>
                      {gameweeks.map(gw => (
                        <th key={gw} className={`px-0.5 md:px-1 py-1 text-center font-semibold min-w-[36px] md:min-w-[50px] ${
                          gw === nextGameweek ? 'bg-blue-100 text-blue-900' : ''
                        }`}>
                          <button
                            onClick={() => handleSort(`gw-${gw}`)}
                            className="flex items-center justify-center hover:text-blue-600 transition-colors mx-auto"
                            data-testid={`sort-gw-${gw}`}
                          >
                            {gw}
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
                          <td className="sticky left-0 bg-white px-1 md:px-2 py-1 font-medium text-gray-900 border-r z-10">
                            <div className="flex items-center gap-1">
                              <img 
                                src={team.code === 14 
                                  ? 'https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg'
                                  : `https://resources.premierleague.com/premierleague/badges/t${team.code}.png`}
                                alt={`${team.name} badge`}
                                className="w-4 h-4 object-contain"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                              <span className="font-semibold">{team.short_name}</span>
                            </div>
                          </td>
                          <td className="sticky left-[60px] md:left-[80px] bg-white px-0.5 py-1 text-center font-medium border-l border-r z-10">
                            <div className={`inline-block px-1 py-0.5 rounded text-[10px] font-semibold ${
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
                              <td key={gw} className={`px-0.5 py-0.5 text-center ${
                                gw === nextGameweek ? 'bg-blue-50' : ''
                              }`}>
                                {fixture ? (
                                  <div 
                                    className={`px-0.5 py-0.5 rounded text-[10px] md:text-xs font-medium ${getDifficultyColor(fixture.difficulty)} ${
                                      fixture.finished ? 'opacity-50' : ''
                                    }`}
                                    title={`${fixture.isHome ? 'vs' : '@'} ${fixture.opponent} (FDR: ${fixture.difficulty})`}
                                    data-testid={`fixture-${team.id}-${gw}`}
                                  >
                                    <span className="truncate font-medium whitespace-nowrap">
                                      {fixture.opponent}{fixture.isHome ? '' : ''}
                                    </span>
                                    <span className="text-[8px] md:text-[10px] opacity-75">{fixture.isHome ? 'H' : 'A'}</span>
                                  </div>
                                ) : (
                                  <div className="px-1 py-0.5 text-gray-300">-</div>
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

          {/* Best Rotation Pairs Section */}
          {rotationPairs.length > 0 && (
            <Card className="mt-4">
              <div className="p-2 md:p-4 border-b">
                <div className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 md:h-5 md:w-5 text-purple-600" />
                  <h2 className="text-sm md:text-lg font-semibold text-gray-900">Best Rotation Pairs</h2>
                </div>
                <p className="text-[10px] md:text-sm text-gray-600 mt-1">
                  Teams with complementary fixtures
                </p>
              </div>
              <CardContent className="p-2 md:p-4">
                <div className="space-y-4">
                  {rotationPairs.map((pair, index) => (
                    <div key={`${pair.team1.id}-${pair.team2.id}`} className="border rounded-lg overflow-hidden">
                      <div className="flex items-center gap-1 px-2 py-1.5 bg-gradient-to-r from-purple-50 to-blue-50 border-b">
                        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-100 text-purple-700 font-bold text-[10px]">
                          {index + 1}
                        </div>
                        <span className="text-xs font-medium text-gray-700">
                          {pair.team1.short_name} + {pair.team2.short_name}
                        </span>
                        <span className="ml-auto text-[10px] bg-green-100 text-green-800 px-1.5 py-0.5 rounded font-medium">
                          {pair.combinedAvgDifficulty}
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-[10px] md:text-sm">
                          <thead>
                            <tr className="bg-gray-50 border-b">
                              <th className="sticky left-0 bg-gray-50 px-1 md:px-3 py-1 text-left font-medium text-gray-700 min-w-[50px] md:min-w-[80px]">Team</th>
                              {pair.fixturesByGameweek.map(fw => (
                                <th key={fw.gw} className="px-0.5 md:px-2 py-1 text-center font-medium text-gray-600 min-w-[36px] md:min-w-[60px]">
                                  {fw.gw}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b">
                              <td className="sticky left-0 bg-white px-1 md:px-3 py-1 font-medium text-gray-900">
                                <div className="flex items-center gap-1">
                                  <img 
                                    src={pair.team1.code === 14 
                                      ? 'https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg'
                                      : `https://resources.premierleague.com/premierleague/badges/t${pair.team1.code}.png`}
                                    alt={pair.team1.name}
                                    className="w-3 h-3 md:w-4 md:h-4 object-contain"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                  />
                                  {pair.team1.short_name}
                                </div>
                              </td>
                              {pair.fixturesByGameweek.map(fw => {
                                const diff1 = fw.team1Fixture.difficulty;
                                const diff2 = fw.team2Fixture.difficulty;
                                const isRecommended = diff1 < diff2 || (diff1 === diff2 && fw.team1Fixture.isHome && !fw.team2Fixture.isHome) || (diff1 === diff2 && fw.team1Fixture.isHome === fw.team2Fixture.isHome);
                                return (
                                  <td key={fw.gw} className="px-0.5 py-0.5 text-center">
                                    <div className={`px-0.5 py-0.5 rounded text-[10px] md:text-xs ${isRecommended ? 'font-bold' : 'font-medium'} ${getDifficultyColor(fw.team1Fixture.difficulty)}`}>
                                      {fw.team1Fixture.opponent}<span className="text-[8px] opacity-75">{fw.team1Fixture.isHome ? 'H' : 'A'}</span>
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                            <tr>
                              <td className="sticky left-0 bg-white px-1 md:px-3 py-1 font-medium text-gray-900">
                                <div className="flex items-center gap-1">
                                  <img 
                                    src={pair.team2.code === 14 
                                      ? 'https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg'
                                      : `https://resources.premierleague.com/premierleague/badges/t${pair.team2.code}.png`}
                                    alt={pair.team2.name}
                                    className="w-3 h-3 md:w-4 md:h-4 object-contain"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                  />
                                  {pair.team2.short_name}
                                </div>
                              </td>
                              {pair.fixturesByGameweek.map(fw => {
                                const diff1 = fw.team1Fixture.difficulty;
                                const diff2 = fw.team2Fixture.difficulty;
                                const isRecommended = diff2 < diff1 || (diff1 === diff2 && fw.team2Fixture.isHome && !fw.team1Fixture.isHome);
                                return (
                                  <td key={fw.gw} className="px-0.5 py-0.5 text-center">
                                    <div className={`px-0.5 py-0.5 rounded text-[10px] md:text-xs ${isRecommended ? 'font-bold' : 'font-medium'} ${getDifficultyColor(fw.team2Fixture.difficulty)}`}>
                                      {fw.team2Fixture.opponent}<span className="text-[8px] opacity-75">{fw.team2Fixture.isHome ? 'H' : 'A'}</span>
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}