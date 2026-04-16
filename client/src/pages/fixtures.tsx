import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Calendar, ArrowUpDown, ArrowUp, ArrowDown, Settings, RotateCcw, X, ChevronDown, ChevronUp, ArrowLeft } from "lucide-react";
import { BootstrapData } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { computeNextRange, getDefaultGameweekRange, getNextGameweeksForDropdown } from "@shared/gameweek-utils";
import { useProjectionSettings } from "@/hooks/use-projection-settings";

interface Fixture {
  id: number;
  event: number | null;
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

type FixtureEntry = { opponent: string; difficulty: number; isHome: boolean; finished: boolean; fixtureId?: number };

function getDifficultyColor(difficulty: number) {
  switch (difficulty) {
    case 1: return 'bg-green-300 text-green-800';
    case 2: return 'bg-green-100 text-green-800';
    case 3: return 'bg-gray-100 text-gray-800';
    case 4: return 'bg-red-100 text-red-800';
    case 5: return 'bg-red-300 text-red-800';
    default: return 'bg-gray-300 text-gray-900';
  }
}

function TBCCell({ fixtures, onFixtureClick }: {
  fixtures?: FixtureEntry[];
  onFixtureClick?: (fixtureId: number, label: string) => void;
}) {
  return (
    <td className="px-0.5 py-0.5 text-center bg-amber-50 border-l-2 border-amber-300">
      {fixtures && fixtures.length > 0 ? (
        <div className="flex flex-col gap-0.5">
          {fixtures.map((fixture, idx) => (
            <div
              key={idx}
              className={`px-0.5 py-0.5 rounded text-[9px] sm:text-[10px] md:text-xs font-medium ${getDifficultyColor(fixture.difficulty)} ${
                fixture.fixtureId
                  ? 'cursor-pointer select-none border border-dashed border-amber-500 hover:border-amber-600 hover:shadow-sm hover:scale-105 active:scale-95 transition-all duration-100'
                  : ''
              }`}
              title={fixture.fixtureId ? `Click to assign to a gameweek` : `TBC: ${fixture.isHome ? 'vs' : '@'} ${fixture.opponent}`}
              onClick={() => {
                if (fixture.fixtureId && onFixtureClick) {
                  onFixtureClick(fixture.fixtureId, `${fixture.opponent} (${fixture.isHome ? 'H' : 'A'})`);
                }
              }}
            >
              <span className="truncate font-medium whitespace-nowrap">
                {fixture.opponent}({fixture.isHome ? 'H' : 'A'})
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-0.5 py-0.5 text-gray-300">-</div>
      )}
    </td>
  );
}

export default function Fixtures() {
  const { defaultWeeks } = useProjectionSettings();
  const [, setLocation] = useLocation();
  // Dynamic gameweek range based on current gameweek
  const [gameweekRange, setGameweekRange] = useState<{ start: number; end: number } | null>(null);
  const [sortBy, setSortBy] = useState<'team' | 'fdr-avg' | string>('fdr-avg');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [customFDROpen, setCustomFDROpen] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [fdrMode, setFdrMode] = useState<'official' | 'form' | 'custom'>('official');
  const [selectedGameweeks, setSelectedGameweeks] = useState<Set<number>>(new Set());
  const [selectedTeams, setSelectedTeams] = useState<Set<number>>(new Set());
  const [teamFilterId, setTeamFilterId] = useState<number | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const teamParam = params.get('team');
    return teamParam ? parseInt(teamParam) : null;
  });
  const [returnPath] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('from') || null;
  });
  
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

  // TBC fixture assignments for My Fixtures: { [fixtureId]: gwNumber }
  const [tbcAssignments, setTbcAssignments] = useState<Record<number, number>>(() => {
    const stored = localStorage.getItem('fpl-tbc-assignments');
    if (stored) { try { return JSON.parse(stored); } catch { return {}; } }
    return {};
  });
  useEffect(() => {
    localStorage.setItem('fpl-tbc-assignments', JSON.stringify(tbcAssignments));
  }, [tbcAssignments]);

  // TBC fixture overrides for Expert Fixtures: { [fixtureId]: gwNumber } — defaults to GW36, separate from My Fixtures
  const [expertAssignments, setExpertAssignments] = useState<Record<number, number>>(() => {
    const stored = localStorage.getItem('fpl-tbc-expert-assignments');
    if (stored) { try { return JSON.parse(stored); } catch { return {}; } }
    return {};
  });
  useEffect(() => {
    localStorage.setItem('fpl-tbc-expert-assignments', JSON.stringify(expertAssignments));
  }, [expertAssignments]);

  // Modal state for assigning a TBC fixture to a gameweek
  const [tbcModal, setTbcModal] = useState<{ fixtureId: number; label: string; selectedGW: number } | null>(null);

  // Toggle between base fixtures (TBC intact), user-assigned, and expert (all TBC → GW36)
  const [viewMode, setViewMode] = useState<'base' | 'custom' | 'expert'>('base');
  const hasAssignments = Object.keys(tbcAssignments).length > 0;
  
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
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const { data: fixturesData } = useQuery<Fixture[]>({
    queryKey: ["/api/fixtures"],
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Fetch form-based FDR ratings - only when form mode is selected
  const { data: formBasedFDR } = useQuery<Record<number, { home: number; away: number }>>({
    queryKey: ["/api/form-based-fdr"],
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: fdrMode === 'form',
  });

  // Whether any fixture has event=null (used to show the view mode toggle)
  const hasTBCFixturesInData = useMemo(() => {
    return fixturesData?.some(f => f.event === null) ?? false;
  }, [fixturesData]);

  // Initialize gameweek range when bootstrap data loads
  useEffect(() => {
    if (bootstrapData?.events && !gameweekRange) {
      const range = computeNextRange(bootstrapData.events);
      const endGw = Math.min(range.start + 5, 38);
      setGameweekRange({ start: range.start, end: endGw });
    }
  }, [bootstrapData?.events, gameweekRange]);

  useEffect(() => {
    if (teamFilterId && bootstrapData?.teams) {
      const allTeamIds = bootstrapData.teams.map((t: any) => t.id);
      const excluded = new Set(allTeamIds.filter((id: number) => id !== teamFilterId));
      setExcludedTeams(excluded);
    }
  }, [teamFilterId, bootstrapData?.teams]);

  // Clear excluded gameweeks when gameweek range changes
  const handleGameweekRangeChange = (start: number, end: number) => {
    setGameweekRange({ start, end });
    setSelectedGameweeks(new Set()); // Clear exclusions when range changes
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
    return getDefaultGameweekRange(bootstrapData.events, defaultWeeks);
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
      const range = getDefaultGameweekRange(bootstrapData.events, defaultWeeks);
      setGameweekRange({
        start: parseInt(range.startGameweek),
        end: parseInt(range.endGameweek)
      });
    }
  }, [bootstrapData?.events]);

  const toggleGameweekSelection = (gw: number) => {
    setSelectedGameweeks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(gw)) {
        newSet.delete(gw);
      } else {
        newSet.add(gw);
      }
      return newSet;
    });
  };

  const toggleTeamSelection = (teamId: number) => {
    setSelectedTeams(prev => {
      const newSet = new Set(prev);
      if (newSet.has(teamId)) {
        newSet.delete(teamId);
      } else {
        newSet.add(teamId);
      }
      return newSet;
    });
  };

  const clearGameweekSelections = () => setSelectedGameweeks(new Set());
  const clearTeamSelections = () => setSelectedTeams(new Set());

  // Build fixture matrix with average FDR calculation
  const { fixtureMatrix, teamAverageFDR, teamGameCount } = useMemo(() => {
    if (!fixturesData || !bootstrapData?.events || !gameweekRange) return { 
      fixtureMatrix: {}, 
      teamAverageFDR: {},
      teamGameCount: {}
    };

    const matrix: Record<number, Record<number, Array<{ opponent: string, difficulty: number, isHome: boolean, finished: boolean }>>> = {};
    const avgFDR: Record<number, number> = {};
    const gameCount: Record<number, number> = {};
    
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

    // Compute effective assignments based on view mode:
    // base → no assignments (TBC stays in TBC column)
    // custom → user's manual assignments only
    // expert → GW36 by default, but respects manual overrides from the assignment modal
    const computedAssignments: Record<number, number> = {};
    if (viewMode === 'custom') {
      Object.assign(computedAssignments, tbcAssignments);
    } else if (viewMode === 'expert') {
      fixturesData.forEach(f => {
        if (f.event === null) {
          // Use expert-specific override if set, otherwise default to GW36 (never reads My Fixtures assignments)
          computedAssignments[f.id] = expertAssignments[f.id] ?? 36;
        }
      });
    }

    // Fill matrix with fixtures - support multiple fixtures per gameweek (DGW)
    // Use key 0 as a sentinel for unassigned (TBC) fixtures
    // Pass 1: regular (non-TBC) fixtures in range — these always appear first
    fixturesData.forEach(fixture => {
      if (fixture.event === null) return;
      const inRange = fixture.event >= gameweekRange.start && fixture.event <= gameweekRange.end;
      if (!inRange) return;

      const homeTeam = bootstrapData.teams.find(t => t.id === fixture.team_h);
      const awayTeam = bootstrapData.teams.find(t => t.id === fixture.team_a);
      if (homeTeam && awayTeam) {
        if (!matrix[fixture.team_h][fixture.event]) matrix[fixture.team_h][fixture.event] = [];
        if (!matrix[fixture.team_a][fixture.event]) matrix[fixture.team_a][fixture.event] = [];
        matrix[fixture.team_h][fixture.event].push({
          opponent: awayTeam.short_name,
          difficulty: getOverallFDR(fixture.team_h_difficulty, awayTeam.id, true),
          isHome: true,
          finished: fixture.finished,
        });
        matrix[fixture.team_a][fixture.event].push({
          opponent: homeTeam.short_name,
          difficulty: getOverallFDR(fixture.team_a_difficulty, homeTeam.id, false),
          isHome: false,
          finished: fixture.finished,
        });
      }
    });

    // Pass 2: TBC fixtures — appended after regular fixtures so they always show as the 2nd match
    fixturesData.forEach(fixture => {
      if (fixture.event !== null) return;
      const assignedGW = computedAssignments[fixture.id];
      const gwKey = assignedGW ?? 0; // 0 = unassigned → TBC column

      const homeTeam = bootstrapData.teams.find(t => t.id === fixture.team_h);
      const awayTeam = bootstrapData.teams.find(t => t.id === fixture.team_a);
      if (homeTeam && awayTeam) {
        if (!matrix[fixture.team_h][gwKey]) matrix[fixture.team_h][gwKey] = [];
        if (!matrix[fixture.team_a][gwKey]) matrix[fixture.team_a][gwKey] = [];
        matrix[fixture.team_h][gwKey].push({
          opponent: awayTeam.short_name,
          difficulty: getOverallFDR(fixture.team_h_difficulty, awayTeam.id, true),
          isHome: true,
          finished: fixture.finished,
          fixtureId: fixture.id,
        });
        matrix[fixture.team_a][gwKey].push({
          opponent: homeTeam.short_name,
          difficulty: getOverallFDR(fixture.team_a_difficulty, homeTeam.id, false),
          isHome: false,
          finished: fixture.finished,
          fixtureId: fixture.id,
        });
      }
    });

    // Calculate average FDR for each team (only for non-excluded gameweeks)
    bootstrapData.teams.forEach(team => {
      const teamFixturesEntries = Object.entries(matrix[team.id] || {});
      const filteredFixtures = teamFixturesEntries.filter(([gw]) => selectedGameweeks.size === 0 || selectedGameweeks.has(parseInt(gw)));
      if (filteredFixtures.length > 0) {
        let totalDifficulty = 0;
        let fixtureCount = 0;
        filteredFixtures.forEach(([, fixtures]) => {
          fixtures.forEach(fixture => {
            if (!fixture.finished) {
              totalDifficulty += fixture.difficulty;
              fixtureCount++;
            }
          });
        });
        avgFDR[team.id] = fixtureCount > 0 ? parseFloat((totalDifficulty / fixtureCount).toFixed(2)) : 0;
        gameCount[team.id] = fixtureCount;
      } else {
        avgFDR[team.id] = 0;
        gameCount[team.id] = 0;
      }
    });

    return { 
      fixtureMatrix: matrix, 
      teamAverageFDR: avgFDR,
      teamGameCount: gameCount
    };
  }, [bootstrapData, fixturesData, gameweekRange, customFDR, fdrMode, formBasedFDR, selectedGameweeks, viewMode, tbcAssignments]);

  // All gameweeks in range (for toggle display)
  const allGameweeksInRange = useMemo(() => {
    if (!gameweekRange) return [];
    const gws = [];
    for (let i = gameweekRange.start; i <= gameweekRange.end; i++) {
      gws.push(i);
    }
    return gws;
  }, [gameweekRange]);

  // Active gameweeks (filtered by selections) - used for display
  const gameweeks = useMemo(() => {
    return allGameweeksInRange.filter(gw => selectedGameweeks.size === 0 || selectedGameweeks.has(gw));
  }, [allGameweeksInRange, selectedGameweeks]);

  // Check if any team has TBC (event=null) fixtures that are unassigned in the current mode
  const hasTBCFixtures = useMemo(() => {
    if (!fixturesData) return false;
    if (viewMode === 'expert') return false; // expert assigns all TBC → GW36
    return fixturesData.some(f => f.event === null && (viewMode === 'base' || !tbcAssignments[f.id]));
  }, [fixturesData, viewMode, tbcAssignments]);

  // Calculate best rotation pairs - teams that complement each other's fixtures
  const rotationPairs = useMemo(() => {
    if (!bootstrapData?.teams || !fixtureMatrix || gameweeks.length === 0) return [];
    
    const teams = bootstrapData.teams.filter(t => selectedTeams.size === 0 || selectedTeams.has(t.id));
    type FixtureEntry = { opponent: string; isHome: boolean; difficulty: number };
    const pairs: Array<{
      team1: typeof teams[0];
      team2: typeof teams[0];
      rotationScore: number;
      fixturesByGameweek: Array<{ 
        gw: number; 
        team1Fixtures: FixtureEntry[];
        team2Fixtures: FixtureEntry[];
        diff1Avg: number;
        diff2Avg: number;
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
          team1Fixtures: FixtureEntry[];
          team2Fixtures: FixtureEntry[];
          diff1Avg: number;
          diff2Avg: number;
        }> = [];
        
        gameweeks.forEach(gw => {
          const fixtures1 = fixtureMatrix[team1.id]?.[gw] || [];
          const fixtures2 = fixtureMatrix[team2.id]?.[gw] || [];
          
          // For DGWs, use average difficulty across all fixtures for rotation scoring
          const diff1Avg = fixtures1.length > 0
            ? fixtures1.reduce((s, f) => s + (f.difficulty || 3), 0) / fixtures1.length
            : 3;
          const diff2Avg = fixtures2.length > 0
            ? fixtures2.reduce((s, f) => s + (f.difficulty || 3), 0) / fixtures2.length
            : 3;
          
          const easierDifficulty = Math.min(diff1Avg, diff2Avg);
          combinedDifficulty += easierDifficulty;
          
          fixturesByGameweek.push({
            gw,
            team1Fixtures: fixtures1.length > 0
              ? fixtures1.map(f => ({ opponent: f.opponent, isHome: f.isHome, difficulty: f.difficulty }))
              : [{ opponent: '-', isHome: true, difficulty: 3 }],
            team2Fixtures: fixtures2.length > 0
              ? fixtures2.map(f => ({ opponent: f.opponent, isHome: f.isHome, difficulty: f.difficulty }))
              : [{ opponent: '-', isHome: true, difficulty: 3 }],
            diff1Avg,
            diff2Avg,
          });
          
          // Rotation score: reward when one team has easy (1-2) while other has hard (4-5)
          if ((diff1Avg <= 2 && diff2Avg >= 4) || (diff2Avg <= 2 && diff1Avg >= 4)) {
            rotationScore += 3; // Perfect rotation week
          } else if ((diff1Avg <= 2 && diff2Avg === 3) || (diff2Avg <= 2 && diff1Avg === 3)) {
            rotationScore += 2; // Good rotation week
          } else if ((diff1Avg <= 3 && diff2Avg >= 4) || (diff2Avg <= 3 && diff1Avg >= 4)) {
            rotationScore += 1; // Decent rotation week
          } else if (diff1Avg >= 4 && diff2Avg >= 4) {
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
  }, [bootstrapData, fixtureMatrix, gameweeks, selectedTeams]);

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
    const teams = [...bootstrapData.teams].filter(team => selectedTeams.size === 0 || selectedTeams.has(team.id));
    
    switch (sortBy) {
      case 'team':
        return teams.sort((a, b) => 
          sortDirection === 'asc' 
            ? a.short_name.localeCompare(b.short_name)
            : b.short_name.localeCompare(a.short_name)
        );
      case 'fdr-avg':
        return teams.sort((a, b) => {
          const gamesA = teamGameCount[a.id] || 0;
          const gamesB = teamGameCount[b.id] || 0;
          if (gamesA !== gamesB) return gamesB - gamesA;
          const fdrA = teamAverageFDR[a.id] || 0;
          const fdrB = teamAverageFDR[b.id] || 0;
          return sortDirection === 'asc' ? fdrA - fdrB : fdrB - fdrA;
        });
      case 'games':
        return teams.sort((a, b) => 
          sortDirection === 'asc'
            ? (teamGameCount[a.id] || 0) - (teamGameCount[b.id] || 0)
            : (teamGameCount[b.id] || 0) - (teamGameCount[a.id] || 0)
        );
      default:
        if (sortBy.startsWith('gw-')) {
          const gw = parseInt(sortBy.replace('gw-', ''));
          return teams.sort((a, b) => {
            const fixturesA = fixtureMatrix[a.id]?.[gw] || [];
            const fixturesB = fixtureMatrix[b.id]?.[gw] || [];
            // Use average difficulty for DGW, or first fixture difficulty
            const diffA = fixturesA.length > 0 
              ? fixturesA.reduce((sum, f) => sum + f.difficulty, 0) / fixturesA.length 
              : 0;
            const diffB = fixturesB.length > 0 
              ? fixturesB.reduce((sum, f) => sum + f.difficulty, 0) / fixturesB.length 
              : 0;
            
            return sortDirection === 'asc' ? diffA - diffB : diffB - diffA;
          });
        }
        return teams.sort((a, b) => a.short_name.localeCompare(b.short_name));
    }
  }, [bootstrapData, fixtureMatrix, teamAverageFDR, teamGameCount, sortBy, sortDirection, selectedTeams]);

  if (isLoading) {
    return (
      <div className="fpl-page-container">
        <div className="fpl-page-header">
          <div className="fpl-page-title">
            <Calendar className="h-6 w-6 sm:h-8 sm:w-8" />
            <h1 className="text-lg sm:text-xl lg:text-2xl">Fixture Analyzer</h1>
          </div>
        </div>
        <div className="flex justify-center py-8 sm:py-12">
          <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-green-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-50/30">
        <div className="w-full py-2 sm:py-4 lg:py-8">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center">
                <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-red-600 mr-2 sm:mr-3" />
                <div>
                  <h3 className="text-red-800 font-medium text-sm sm:text-base">Failed to load fixture data</h3>
                  <p className="text-red-600 text-xs sm:text-sm mt-1">Unable to connect to FPL API</p>
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
          <Calendar className="h-6 w-6 sm:h-8 sm:w-8" />
          <h1 className="text-lg sm:text-xl lg:text-2xl">Fixture Analyzer</h1>
        </div>
        <p className="fpl-page-subtitle text-xs sm:text-sm">
          Analyze fixtures based on Official FPL ratings, Season Form or Custom ratings
        </p>
        {teamFilterId && bootstrapData?.teams && (
          <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-2 relative z-10">
            {returnPath && (
              <Button
                variant="ghost"
                size="sm"
                className="w-fit text-white hover:text-white/80 hover:bg-white/10 -ml-2"
                onClick={() => setLocation(returnPath)}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
            <div className="flex items-center gap-2 bg-white/20 border border-white/30 rounded-lg px-3 py-2">
              <span className="text-sm text-white font-medium">
                Showing fixtures for: {bootstrapData.teams.find((t: any) => t.id === teamFilterId)?.name || 'Unknown'}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-white hover:text-white hover:bg-white/20"
                onClick={() => {
                  setTeamFilterId(null);
                  setExcludedTeams(new Set());
                  window.history.replaceState({}, '', '/fixtures');
                }}
              >
                <X className="h-4 w-4 mr-1" />
                Show All
              </Button>
            </div>
          </div>
        )}
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
            <div className="flex flex-col gap-3">
              {/* Section 1: FDR Mode */}
              <div className="bg-gray-50 rounded-lg p-3">
                <Label className="text-xs font-semibold text-gray-700 block mb-2">FDR Mode</Label>
                <RadioGroup value={fdrMode} onValueChange={(value: 'official' | 'form' | 'custom') => setFdrMode(value)} className="flex flex-wrap gap-2 justify-center">
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="official" id="fdr-official" data-testid="radio-fdr-official" />
                    <Label htmlFor="fdr-official" className="text-xs cursor-pointer">Official ratings</Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="form" id="fdr-form" data-testid="radio-fdr-form" />
                    <Label htmlFor="fdr-form" className="text-xs cursor-pointer">Season Form</Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="custom" id="fdr-custom" data-testid="radio-fdr-custom" />
                    <Label htmlFor="fdr-custom" className="text-xs cursor-pointer">Custom</Label>
                  </div>
                </RadioGroup>
                {fdrMode === 'custom' && (
                  <div className="flex items-center gap-2 justify-center mt-2">
                    <Dialog open={customFDROpen} onOpenChange={setCustomFDROpen}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex items-center gap-1 text-xs"
                          data-testid="button-customize-fdr"
                        >
                          <Settings className="h-3 w-3" />
                          Customize
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
                        className="flex items-center gap-1 text-xs"
                        data-testid="button-reset-fdr-main"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Reset
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Section 2: Gameweek Selection */}
              <div className="bg-blue-50 rounded-lg p-3">
                <Label className="text-xs font-semibold text-gray-700 block mb-2">Gameweek Selection</Label>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1 justify-center">
                    <label className="text-xs font-medium text-gray-700">Range:</label>
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
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <label className="text-xs font-medium text-gray-700">Toggle:</label>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearGameweekSelections}
                        className="text-[10px] bg-green-100 text-green-700 hover:bg-green-200 border-green-300 px-1.5 py-0.5 h-auto"
                        data-testid="button-clear-gw-selections"
                      >All</Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedGameweeks(prev => new Set(allGameweeksInRange.filter(gw => !prev.has(gw))))}
                        className="text-[10px] bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-300 px-1.5 py-0.5 h-auto"
                        data-testid="button-invert-gameweeks"
                      >Invert</Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 justify-center">
                    {allGameweeksInRange.map((gw) => {
                      const isActive = selectedGameweeks.size === 0 || selectedGameweeks.has(gw);
                      return (
                        <Button
                          key={gw}
                          variant="outline"
                          size="sm"
                          onClick={() => toggleGameweekSelection(gw)}
                          className={`min-w-[32px] text-[10px] px-1.5 py-0.5 h-6 ${isActive ? 'bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-300' : 'bg-gray-100 text-gray-400 hover:bg-gray-200 border border-gray-300'}`}
                          data-testid={`button-toggle-gw-${gw}`}
                        >
                          {gw}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Section 3: Team Selection */}
              <div className="bg-green-50 rounded-lg p-3">
                <div className="flex flex-wrap items-center justify-between gap-1 mb-2">
                  <Label className="text-xs font-semibold text-gray-700">Team Selection</Label>
                  <div className="flex gap-1">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={clearTeamSelections}
                      className="text-[10px] bg-green-100 text-green-700 hover:bg-green-200 border-green-300 px-1.5 py-0.5 h-auto"
                      data-testid="button-include-all-teams"
                    >
                      All
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 justify-center">
                  {bootstrapData?.teams
                    ?.slice()
                    .sort((a, b) => a.short_name.localeCompare(b.short_name))
                    .map((team) => {
                      const isActive = selectedTeams.size === 0 || selectedTeams.has(team.id);
                      return (
                        <Button
                          key={team.id}
                          variant="outline"
                          size="sm"
                          onClick={() => toggleTeamSelection(team.id)}
                          className={`min-w-[32px] text-[10px] px-1 py-0.5 h-6 ${isActive ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300' : 'bg-gray-100 text-gray-400 hover:bg-gray-200 border border-gray-300'}`}
                          data-testid={`button-toggle-team-${team.id}`}
                        >
                          {team.short_name}
                        </Button>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
          )}
        </div>

        {/* Fixture Difficulty Analysis */}
        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-wrap gap-1.5 sm:gap-3 text-[9px] sm:text-xs justify-center">
            <div className="flex items-center gap-0.5">
              <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-300 rounded"></div>
              <span>1</span>
            </div>
            <div className="flex items-center gap-0.5">
              <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-100 border border-green-200 rounded"></div>
              <span>2</span>
            </div>
            <div className="flex items-center gap-0.5">
              <div className="w-2 h-2 sm:w-3 sm:h-3 bg-gray-100 border border-gray-300 rounded"></div>
              <span>3</span>
            </div>
            <div className="flex items-center gap-0.5">
              <div className="w-2 h-2 sm:w-3 sm:h-3 bg-red-100 border border-red-200 rounded"></div>
              <span>4</span>
            </div>
            <div className="flex items-center gap-0.5">
              <div className="w-2 h-2 sm:w-3 sm:h-3 bg-red-300 rounded"></div>
              <span>5</span>
            </div>
          </div>

          {hasTBCFixturesInData && (
            <div className="flex justify-center">
              <div className="inline-flex rounded-lg border border-gray-200 bg-gray-100 p-0.5 text-xs">
                <button
                  onClick={() => setViewMode('base')}
                  className={`px-3 py-1.5 rounded-md font-medium transition-all duration-150 ${
                    viewMode === 'base'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Base Fixtures
                </button>
                {Object.keys(tbcAssignments).length > 0 && (
                  <button
                    onClick={() => setViewMode('custom')}
                    className={`px-3 py-1.5 rounded-md font-medium transition-all duration-150 ${
                      viewMode === 'custom'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    My Fixtures
                  </button>
                )}
                <button
                  onClick={() => setViewMode('expert')}
                  className={`px-3 py-1.5 rounded-md font-medium transition-all duration-150 ${
                    viewMode === 'expert'
                      ? 'bg-amber-100 text-amber-800 shadow-sm border border-amber-300'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="All unassigned TBC fixtures placed in GW36"
                >
                  Expert Fixtures
                </button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-[9px] sm:text-[10px] md:text-xs lg:text-sm border-collapse">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="sticky left-0 bg-gray-50 px-1 sm:px-2 py-1 text-left font-semibold min-w-[50px] sm:min-w-[65px] md:min-w-[80px] lg:min-w-[100px] z-20">
                        <button
                          onClick={() => handleSort('team')}
                          className="flex items-center gap-0.5 hover:text-blue-600 transition-colors"
                          data-testid="sort-team"
                        >
                          Team
                          {sortBy === 'team' && (
                            sortDirection === 'asc' ? <ArrowUp className="h-2 w-2 sm:h-2.5 sm:w-2.5" /> : <ArrowDown className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
                          )}
                        </button>
                      </th>
                      <th className="sticky left-[50px] sm:left-[65px] md:left-[80px] lg:left-[100px] bg-gray-50 px-0.5 sm:px-1 py-1 text-center font-semibold min-w-[28px] sm:min-w-[36px] md:min-w-[45px] lg:min-w-[55px] border-l z-20">
                        <button
                          onClick={() => handleSort('fdr-avg')}
                          className="flex items-center gap-0.5 hover:text-blue-600 transition-colors mx-auto"
                          data-testid="sort-avg-fdr"
                        >
                          <span className="hidden sm:inline">Avg FDR</span>
                          <span className="sm:hidden">Avg</span>
                          {sortBy === 'fdr-avg' && (
                            sortDirection === 'asc' ? <ArrowUp className="h-2 w-2 sm:h-2.5 sm:w-2.5" /> : <ArrowDown className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
                          )}
                        </button>
                      </th>
                      <th className="sticky left-[78px] sm:left-[101px] md:left-[125px] lg:left-[155px] bg-gray-50 px-0.5 sm:px-1 py-1 text-center font-semibold min-w-[28px] sm:min-w-[36px] md:min-w-[45px] lg:min-w-[55px] border-l z-20">
                        <button
                          onClick={() => handleSort('games')}
                          className="flex items-center gap-0.5 hover:text-blue-600 transition-colors mx-auto"
                        >
                          <span className="hidden sm:inline">Games</span>
                          <span className="sm:hidden">G</span>
                          {sortBy === 'games' && (
                            sortDirection === 'asc' ? <ArrowUp className="h-2 w-2 sm:h-2.5 sm:w-2.5" /> : <ArrowDown className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
                          )}
                        </button>
                      </th>
                      {gameweeks.map(gw => (
                        <th key={gw} className={`px-0.5 py-1 text-center font-semibold min-w-[32px] sm:min-w-[40px] md:min-w-[50px] lg:min-w-[60px] ${
                          gw === nextGameweek ? 'bg-blue-100 text-blue-900' : ''
                        }`}>
                          <button
                            onClick={() => handleSort(`gw-${gw}`)}
                            className="flex items-center justify-center hover:text-blue-600 transition-colors mx-auto"
                            data-testid={`sort-gw-${gw}`}
                          >
                            GW{gw}
                          </button>
                        </th>
                      ))}
                      {hasTBCFixtures && (
                        <th className="px-0.5 py-1 text-center font-semibold min-w-[40px] sm:min-w-[50px] md:min-w-[60px] bg-amber-50 border-l-2 border-amber-300">
                          <span className="text-amber-700 text-[9px] sm:text-[10px] md:text-xs whitespace-nowrap">GW39 (TBC)</span>
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTeams.map(team => {
                      const avgFDR = teamAverageFDR[team.id];
                      return (
                        <tr key={team.id} className="border-b hover:bg-gray-50">
                          <td className="sticky left-0 bg-white px-1 sm:px-2 py-0.5 sm:py-1 font-medium text-gray-900 border-r z-10">
                            <div className="flex items-center gap-0.5 sm:gap-1">
                              <img 
                                src={team.code === 14 
                                  ? 'https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg'
                                  : `https://resources.premierleague.com/premierleague/badges/t${team.code}.png`}
                                alt={`${team.name} badge`}
                                className="w-3 h-3 sm:w-4 sm:h-4 object-contain"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                              <span className="font-semibold">{team.short_name}</span>
                            </div>
                          </td>
                          <td className="sticky left-[50px] sm:left-[65px] md:left-[80px] lg:left-[100px] bg-white px-0.5 py-0.5 sm:py-1 text-center font-medium border-l z-10">
                            <div className={`inline-block px-1 sm:px-1.5 py-0.5 rounded text-[11px] sm:text-xs font-bold ${
                              avgFDR <= 2 ? 'bg-green-100 text-green-800' :
                              avgFDR <= 3 ? 'bg-yellow-100 text-yellow-800' :
                              avgFDR <= 4 ? 'bg-orange-100 text-orange-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {avgFDR > 0 ? avgFDR : '-'}
                            </div>
                          </td>
                          <td className="sticky left-[78px] sm:left-[101px] md:left-[125px] lg:left-[155px] bg-white px-0.5 py-0.5 sm:py-1 text-center font-medium border-l border-r z-10">
                            <span className="text-[11px] sm:text-xs font-bold text-gray-700">
                              {teamGameCount[team.id] || 0}
                            </span>
                          </td>
                          {gameweeks.map(gw => {
                            const fixtures = fixtureMatrix[team.id]?.[gw];
                            return (
                              <td key={gw} className={`px-0.5 py-0.5 text-center ${
                                gw === nextGameweek ? 'bg-blue-50' : ''
                              }`}>
                                {fixtures && fixtures.length > 0 ? (
                                  <div className="flex flex-col gap-0.5">
                                    {fixtures.map((fixture, idx) => (
                                      <div 
                                        key={idx}
                                        className={`px-0.5 py-0.5 rounded text-[9px] sm:text-[10px] md:text-xs font-medium ${getDifficultyColor(fixture.difficulty)} ${
                                          fixture.finished ? 'opacity-50' : ''
                                        } ${fixture.fixtureId ? 'cursor-pointer select-none border-2 border-dashed border-amber-500 hover:border-amber-700 hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-100' : ''}`}
                                        title={fixture.fixtureId ? `Assigned from TBC — click to reassign or reset` : `${fixture.isHome ? 'vs' : '@'} ${fixture.opponent} (FDR: ${fixture.difficulty})`}
                                        data-testid={`fixture-${team.id}-${gw}-${idx}`}
                                        onClick={() => {
                                          if (fixture.fixtureId) {
                                            const currentGW = viewMode === 'expert'
                                              ? (expertAssignments[fixture.fixtureId] ?? 36)
                                              : (tbcAssignments[fixture.fixtureId] ?? (gameweekRange ? Math.min(36, gameweekRange.end) : 36));
                                            setTbcModal({ fixtureId: fixture.fixtureId, label: `${fixture.opponent} (${fixture.isHome ? 'H' : 'A'})`, selectedGW: currentGW });
                                          }
                                        }}
                                      >
                                        <span className="truncate font-medium whitespace-nowrap">
                                          {fixture.opponent}({fixture.isHome ? 'H' : 'A'})
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="px-0.5 py-0.5 text-gray-300">-</div>
                                )}
                              </td>
                            );
                          })}
                          {hasTBCFixtures && (
                            <TBCCell
                              fixtures={fixtureMatrix[team.id]?.[0]}
                              onFixtureClick={(fixtureId, label) => {
                                const defaultGW = gameweekRange ? Math.min(36, gameweekRange.end) : 36;
                                setTbcModal({ fixtureId, label, selectedGW: defaultGW });
                              }}
                            />
                          )}
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
                                const isRecommended = fw.diff1Avg < fw.diff2Avg;
                                return (
                                  <td key={fw.gw} className="px-0.5 py-0.5 text-center">
                                    <div className={`flex flex-col gap-0.5 ${isRecommended ? 'font-bold' : 'font-medium'}`}>
                                      {fw.team1Fixtures.map((f, fi) => (
                                        <div key={fi} className={`px-0.5 py-0.5 rounded text-[10px] md:text-xs ${getDifficultyColor(f.difficulty)}`}>
                                          {f.opponent === '-' ? '-' : `${f.opponent}(${f.isHome ? 'H' : 'A'})`}
                                        </div>
                                      ))}
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
                                const isRecommended = fw.diff2Avg < fw.diff1Avg;
                                return (
                                  <td key={fw.gw} className="px-0.5 py-0.5 text-center">
                                    <div className={`flex flex-col gap-0.5 ${isRecommended ? 'font-bold' : 'font-medium'}`}>
                                      {fw.team2Fixtures.map((f, fi) => (
                                        <div key={fi} className={`px-0.5 py-0.5 rounded text-[10px] md:text-xs ${getDifficultyColor(f.difficulty)}`}>
                                          {f.opponent === '-' ? '-' : `${f.opponent}(${f.isHome ? 'H' : 'A'})`}
                                        </div>
                                      ))}
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

      {/* TBC fixture assignment modal */}
      <Dialog open={!!tbcModal} onOpenChange={(open) => { if (!open) setTbcModal(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign fixture to gameweek</DialogTitle>
            <DialogDescription>
              {tbcModal?.label} — choose which gameweek to place this fixture in.
            </DialogDescription>
          </DialogHeader>
          {viewMode === 'base' && tbcModal && tbcAssignments[tbcModal.fixtureId] && (
            <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 mb-2">
              <span className="mt-0.5 shrink-0">⚠️</span>
              <span>
                <strong>My Fixtures</strong> already has this match assigned to{' '}
                <strong>GW{tbcAssignments[tbcModal.fixtureId]}</strong>. Saving will update My Fixtures with your new choice.
              </span>
            </div>
          )}
          <div className="py-2">
            <RadioGroup
              value={tbcModal?.selectedGW?.toString() ?? ''}
              onValueChange={(val) => setTbcModal(prev => prev ? { ...prev, selectedGW: parseInt(val) } : prev)}
              className="flex flex-wrap gap-2"
            >
              {(gameweekRange ? Array.from({ length: gameweekRange.end - gameweekRange.start + 1 }, (_, i) => gameweekRange.start + i) : [33,34,35,36,37,38]).map(gw => (
                <div key={gw} className="flex items-center gap-1.5">
                  <RadioGroupItem value={gw.toString()} id={`gw-${gw}`} />
                  <Label htmlFor={`gw-${gw}`} className="cursor-pointer font-medium">GW{gw}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          <div className="flex justify-between gap-2 pt-2">
            <div>
              {tbcModal && (viewMode === 'expert' ? expertAssignments[tbcModal.fixtureId] : tbcAssignments[tbcModal.fixtureId]) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-amber-700 hover:text-amber-900 hover:bg-amber-50"
                  onClick={() => {
                    if (tbcModal) {
                      if (viewMode === 'expert') {
                        setExpertAssignments(prev => {
                          const next = { ...prev };
                          delete next[tbcModal.fixtureId];
                          return next;
                        });
                      } else {
                        setTbcAssignments(prev => {
                          const next = { ...prev };
                          delete next[tbcModal.fixtureId];
                          return next;
                        });
                      }
                      setTbcModal(null);
                    }
                  }}
                >
                  ↩ {viewMode === 'expert' ? 'Reset to GW36 (Expert)' : 'Reset to TBC'}
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setTbcModal(null)}>Cancel</Button>
              <Button
                size="sm"
                onClick={() => {
                  if (tbcModal) {
                    if (viewMode === 'expert') {
                      setExpertAssignments(prev => ({ ...prev, [tbcModal.fixtureId]: tbcModal.selectedGW }));
                    } else {
                      setTbcAssignments(prev => ({ ...prev, [tbcModal.fixtureId]: tbcModal.selectedGW }));
                      if (viewMode !== 'custom') setViewMode('custom');
                    }
                    setTbcModal(null);
                  }
                }}
              >
                Assign to GW{tbcModal?.selectedGW}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}