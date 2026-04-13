import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, TrendingUp, Save, Calendar, Target, Sparkles, Crown, ArrowUpDown, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, X, Plus, RotateCcw, Copy, Trash2, Edit2, Check, Info, Heart, AlertTriangle, XCircle, Clock, List, Search, AlertCircle, BarChart3, Eye, EyeOff } from "lucide-react";
import { LoadingExperience } from "@/components/loading-experience";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { apiRequest } from "@/lib/queryClient";
import { PlayerPopupDetails } from "@/components/player-popup-details";
import { useToast } from "@/hooks/use-toast";
import { extractManagerId } from "@/lib/manager-id-utils";
import { FplConnectDialog } from "@/components/fpl-connect-dialog";
import { useAuth } from "@/hooks/useAuth";
import { PitchView, type PitchPlayer, type PitchPlayerFixture } from "@/components/pitch-view";

// Player Availability Badge Component - only shows for players with < 100% availability
function PlayerAvailabilityBadge({ player }: { player: any }) {
  // Handle both camelCase and snake_case field names
  const chanceOfPlaying = player.chanceOfPlayingNextRound ?? player.chance_of_playing_next_round ?? 100;
  const status = player.status || 'a';
  const news = player.news || '';

  // Only show badge if availability is not 100%
  if (chanceOfPlaying >= 100 && status === 'a') {
    return null;
  }

  // Determine status display based on chance of playing and status
  let statusColor = 'text-yellow-600';
  let statusBg = 'bg-yellow-50';
  let statusIcon = Clock;
  let statusText = 'Doubtful';
  let statusBorder = 'border-yellow-200';

  if (status === 's' || status === 'suspended') {
    statusColor = 'text-red-600';
    statusBg = 'bg-red-50';
    statusIcon = XCircle;
    statusText = 'Suspended';
    statusBorder = 'border-red-200';
  } else if (status === 'i' || status === 'injured') {
    statusColor = 'text-red-600';
    statusBg = 'bg-red-50';
    statusIcon = Heart;
    statusText = 'Injured';
    statusBorder = 'border-red-200';
  } else if (status === 'd' || status === 'doubtful') {
    statusColor = 'text-yellow-600';
    statusBg = 'bg-yellow-50';
    statusIcon = AlertTriangle;
    statusText = 'Doubtful';
    statusBorder = 'border-yellow-200';
  } else if (status === 'u' || status === 'unavailable') {
    statusColor = 'text-gray-600';
    statusBg = 'bg-gray-50';
    statusIcon = XCircle;
    statusText = 'Unavailable';
    statusBorder = 'border-gray-200';
  }

  const StatusIcon = statusIcon;

  return (
    <Tooltip delayDuration={100}>
      <TooltipTrigger asChild>
        <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] md:text-xs font-semibold cursor-help transition-colors hover:opacity-80 ${statusBg} ${statusBorder} border shadow-sm`}>
          <StatusIcon className={`h-2.5 w-2.5 md:h-3 md:w-3 ${statusColor}`} />
          <span className={statusColor}>
            {chanceOfPlaying}%
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs p-3 bg-white shadow-xl border border-gray-200 z-50">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <StatusIcon className={`h-4 w-4 ${statusColor}`} />
            <span className="font-semibold text-gray-900">{statusText}</span>
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-medium">Chance of playing:</span> {chanceOfPlaying}%
          </div>
          {news && (
            <div className="text-sm text-gray-700 border-t pt-2">
              <span className="font-medium">News:</span> {news}
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

interface TeamPick {
  element: number;
  position: number;
  multiplier: number;
  is_captain: boolean;
  is_vice_captain: boolean;
  selling_price: number;
  purchase_price?: number;
  is_transferred_out?: boolean;
}

interface TeamData {
  picks: TeamPick[];
  transfers: {
    cost: number;
    status: string;
    limit: number;
    made: number;
    bank: number;
    value: number;
  };
  entry?: {
    bank: number;
    value: number;
  };
  active_chip?: string | null;
}

interface Player {
  id: number;
  first_name: string;
  second_name: string;
  web_name: string;
  team: number;
  element_type: number;
  now_cost: number;
  total_points: number;
  form: string;
}

interface BootstrapData {
  elements: Player[];
  element_types: Array<{
    id: number;
    plural_name: string;
    singular_name: string;
  }>;
  teams: Array<{
    id: number;
    name: string;
    short_name: string;
  }>;
  events: Array<{
    id: number;
    name: string;
    is_current: boolean;
    is_next: boolean;
    finished: boolean;
  }>;
}

interface PlayerProjectionData {
  playerId: number;
  name: string;
  team: string;
  position: string;
  price: number;
  ownership: number;
  form: number;
  gameweekProjections: { [key: string]: number };
  totalExpectedPoints: number;
  averageValue?: number;
  avgMinutesPerGameweek?: number;
}

interface AllPlayersProjectionsTabProps {
  selectedGameweek: number;
  transferredOutPlayers: TransferOut[];
  onTransferIn: (playerId: number, playerElementType: number) => void;
  currentBank: number;
  initialPositionFilter?: string;
  scrollToView?: boolean;
  onScrollComplete?: () => void;
  teamData?: TeamData;
  savedDrafts?: any[];
}

function AllPlayersProjectionsTab({ selectedGameweek, transferredOutPlayers, onTransferIn, currentBank, initialPositionFilter = "all", scrollToView = false, onScrollComplete, teamData, savedDrafts }: AllPlayersProjectionsTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [positionFilters, setPositionFilters] = useState<Set<string>>(() =>
    initialPositionFilter && initialPositionFilter !== "all" ? new Set([initialPositionFilter]) : new Set()
  );
  const [teamFilters, setTeamFilters] = useState<Set<string>>(new Set());
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);
  const [teamSearch, setTeamSearch] = useState("");
  const teamDropdownRef = useRef<HTMLDivElement>(null);
  const [positionDropdownOpen, setPositionDropdownOpen] = useState(false);
  const positionDropdownRef = useRef<HTMLDivElement>(null);
  const [loadGroupFilter, setLoadGroupFilter] = useState("Top 50");
  const [sortField, setSortField] = useState<string>('total');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [minPrice, setMinPrice] = useState<number>(3.5);
  const [maxPrice, setMaxPrice] = useState<number>(15.0);
  const [onlyAffordable, setOnlyAffordable] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  // Fixture mode toggle (Base / My Fixtures / Expert Fixtures)
  const [fixtureMode, setFixtureMode] = useState<'base' | 'custom' | 'expert'>('base');
  const [tbcAssignments, setTbcAssignments] = useState<Record<number, number>>(() => {
    try { return JSON.parse(localStorage.getItem('fpl-tbc-assignments') || '{}'); } catch { return {}; }
  });

  // Sync assignments from localStorage whenever fixtureMode changes or window refocuses
  useEffect(() => {
    const sync = () => {
      const key = fixtureMode === 'expert' ? 'fpl-tbc-expert-assignments' : 'fpl-tbc-assignments';
      try { setTbcAssignments(JSON.parse(localStorage.getItem(key) || '{}')); } catch { setTbcAssignments({}); }
    };
    sync();
    window.addEventListener('focus', sync);
    return () => window.removeEventListener('focus', sync);
  }, [fixtureMode]);

  // Update position filter when initialPositionFilter changes
  useEffect(() => {
    if (initialPositionFilter && initialPositionFilter !== "all") {
      setPositionFilters(new Set([initialPositionFilter]));
    } else {
      setPositionFilters(new Set());
    }
  }, [initialPositionFilter]);

  // Close team dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (teamDropdownRef.current && !teamDropdownRef.current.contains(e.target as Node)) {
        setTeamDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close position dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (positionDropdownRef.current && !positionDropdownRef.current.contains(e.target as Node)) {
        setPositionDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Scroll to view when requested
  useEffect(() => {
    if (scrollToView && sectionRef.current) {
      // Add a small delay to ensure the section is rendered
      setTimeout(() => {
        if (sectionRef.current) {
          sectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          if (onScrollComplete) {
            onScrollComplete();
          }
        }
      }, 100);
    }
  }, [scrollToView, onScrollComplete]);

  const { data: rawBootstrapData } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
  });

  const tabNextGW = ((rawBootstrapData?.events.find((e: any) => e.is_current)?.id) || 27) + 1;
  const tabMaxGW = Math.min(38, tabNextGW + 11);

  const { data: allPlayersData, isLoading } = useQuery<PlayerProjectionData[]>({
    queryKey: ["/api/cached/player-total-points"],
    queryFn: async () => {
      const res = await fetch(`/api/cached/player-total-points`);
      if (!res.ok) throw new Error('Failed to fetch projections');
      return res.json();
    },
    staleTime: 30 * 60 * 1000,
    enabled: !!rawBootstrapData,
  });

  const { data: tbcGoalData } = useQuery<Array<{ fixtureId: number; homeTeamShort: string; awayTeamShort: string; homeGoals: number; awayGoals: number }>>({
    queryKey: ["/api/tbc-goal-projections"],
    enabled: fixtureMode !== 'base',
  });

  const { data: teamGoalProjectionsData } = useQuery<Array<{ teamShort: string; averageGoalsPerGame: number }>>({
    queryKey: ["/api/team-goal-projections"],
    enabled: fixtureMode !== 'base',
  });

  // Apply manual availability overrides to bootstrap data
  const bootstrapData = useMemo(() => {
    if (!rawBootstrapData) return rawBootstrapData;
    
    const modifiedData = { ...rawBootstrapData };
    if (modifiedData.elements) {
      modifiedData.elements = modifiedData.elements.map(player => {
        // Manual override for Semenyo and Gabriel (75% chance of playing)
        if (player.web_name === 'Semenyo' || player.web_name === 'Gabriel') {
          return {
            ...player,
            chance_of_playing_next_round: 75,
            status: 'd', // Doubtful
            news: '75% chance of playing'
          };
        }
        return player;
      });
    }
    return modifiedData;
  }, [rawBootstrapData]);

  // Create playerId to web_name mapping
  const playerIdToWebName = useMemo(() => {
    if (!bootstrapData?.elements) return new Map<number, string>();
    const map = new Map<number, string>();
    bootstrapData.elements.forEach(element => {
      map.set(element.id, element.web_name);
    });
    return map;
  }, [bootstrapData]);

  if (isLoading) {
    return (
      <LoadingExperience
        variant="optimization"
        title="Loading Transfer Planner"
        description="Setting up your transfer planning workspace with player projections and team data..."
        steps={[
          { text: "Loading 700+ player projections", delay: "0s" },
          { text: "Fetching FPL bootstrap data", delay: "0.2s" },
          { text: "Preparing draft management system", delay: "0.4s" },
        ]}
      />
    );
  }

  if (!allPlayersData) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            No projection data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get next 6 gameweeks (for the bottom table)
  const getNextGameweeksForTable = () => {
    if (!bootstrapData) return [];
    
    // Find the first gameweek that hasn't finished and isn't current
    const nextEvent = bootstrapData.events.find(e => !e.finished && !e.is_current);
    
    // Start from the next upcoming gameweek
    let startGW = nextEvent?.id || 1;
    
    // If no next event found, use the gameweek after the current/finished ones
    if (!nextEvent) {
      const currentEvent = bootstrapData.events.find(e => e.is_current);
      if (currentEvent) {
        startGW = currentEvent.id + 1;
      } else {
        const lastFinished = bootstrapData.events.filter(e => e.finished).sort((a, b) => b.id - a.id)[0];
        if (lastFinished) {
          startGW = lastFinished.id + 1;
        }
      }
    }
    
    const gameweeks = [];
    for (let i = 0; i < 6; i++) {
      const gwNumber = startGW + i;
      if (gwNumber <= 38) {
        gameweeks.push(gwNumber);
      }
    }
    
    return gameweeks;
  };

  const nextGameweeks = getNextGameweeksForTable();

  // Build TBC fixture scaling map when in custom/expert mode
  const tbcTeamScaleMap = useMemo(() => {
    const map = new Map<string, { fixtureId: number; scale: number }>();
    if (fixtureMode === 'base' || !tbcGoalData || !teamGoalProjectionsData) return map;
    tbcGoalData.forEach(f => {
      const homeAvg = teamGoalProjectionsData.find(t => t.teamShort === f.homeTeamShort)?.averageGoalsPerGame || 1;
      const awayAvg = teamGoalProjectionsData.find(t => t.teamShort === f.awayTeamShort)?.averageGoalsPerGame || 1;
      map.set(f.homeTeamShort, { fixtureId: f.fixtureId, scale: homeAvg > 0 ? f.homeGoals / homeAvg : 1 });
      map.set(f.awayTeamShort, { fixtureId: f.fixtureId, scale: awayAvg > 0 ? f.awayGoals / awayAvg : 1 });
    });
    return map;
  }, [fixtureMode, tbcGoalData, teamGoalProjectionsData]);

  // Build adjusted player data with TBC fixture applied to the assigned GW.
  // TBC is treated as GW39 in base mode (excluded from GW33-38).
  // In My/Expert mode, when assigned to a GW, TBC points are added to that GW.
  // Uses player's average per-playing-GW contribution (not the specific GW's points)
  // so blank GW assignments are handled correctly.
  const adjustedPlayersData = useMemo(() => {
    if (!allPlayersData) return allPlayersData;
    if (fixtureMode === 'base' || tbcTeamScaleMap.size === 0) return allPlayersData;

    return allPlayersData.map(player => {
      // Look up team short name via bootstrap
      const teamShort = bootstrapData?.teams.find(t => t.name === player.team || t.short_name === player.team)?.short_name;
      if (!teamShort) return player;
      const tbcEntry = tbcTeamScaleMap.get(teamShort);
      if (!tbcEntry) return player;

      // Determine which GW the TBC fixture is assigned to (tbcAssignments reflects the active mode).
      // Expert mode defaults to GW36 when no explicit assignment is set (consistent with other pages).
      const assignedGW = fixtureMode === 'expert'
        ? (tbcAssignments[tbcEntry.fixtureId] || 36)
        : tbcAssignments[tbcEntry.fixtureId];
      if (!assignedGW || !nextGameweeks.includes(assignedGW)) return player;

      // Compute TBC points using the player's average per-playing-GW contribution.
      // This correctly handles blank GWs (originalPoints=0) — instead of scaling from 0,
      // we use the average across all non-blank GWs, scaled by the TBC fixture's goal ratio.
      const playingGws = nextGameweeks.filter(gw => (player.gameweekProjections[gw.toString()] || 0) > 0);
      const n = playingGws.length || 1;
      const sumPoints = nextGameweeks.reduce((s, gw) => s + (player.gameweekProjections[gw.toString()] || 0), 0);
      const avgGwPoints = sumPoints / n;
      const tbcPoints = avgGwPoints * tbcEntry.scale;

      const gwKey = assignedGW.toString();
      const originalGWPoints = player.gameweekProjections[gwKey] || 0;
      const newGameweekProjections = { ...player.gameweekProjections, [gwKey]: originalGWPoints + tbcPoints };
      const newTotal = nextGameweeks.reduce((sum, gw) => sum + (newGameweekProjections[gw.toString()] || 0), 0);
      return { ...player, gameweekProjections: newGameweekProjections, totalExpectedPoints: newTotal };
    });
  }, [allPlayersData, fixtureMode, tbcTeamScaleMap, tbcAssignments, nextGameweeks, bootstrapData]);

  // Calculate top 3 players for each gameweek
  const getTop3ForGameweek = (gw: number) => {
    const sorted = [...(adjustedPlayersData || [])]
      .map(p => ({ playerId: p.playerId, points: p.gameweekProjections[gw.toString()] || 0 }))
      .sort((a, b) => b.points - a.points);
    
    return {
      first: sorted[0]?.playerId,
      second: sorted[1]?.playerId,
      third: sorted[2]?.playerId,
    };
  };

  // Convert team full name to short name
  const getTeamShortName = (teamFullName: string): string => {
    const team = bootstrapData?.teams.find(t => t.name === teamFullName);
    return team?.short_name || teamFullName;
  };

  // Get unique teams for filter - use official team names from bootstrap
  const teams = bootstrapData?.teams || [];
  const uniqueTeams = teams.map(t => t.name).sort();

  // Helper to normalize team name to full name
  const normalizeTeamName = (teamName: string): string => {
    // First try to find by full name
    const byName = bootstrapData?.teams.find(t => t.name === teamName);
    if (byName) return byName.name;
    
    // Then try to find by short name
    const byShortName = bootstrapData?.teams.find(t => t.short_name === teamName);
    if (byShortName) return byShortName.name;
    
    return teamName;
  };

  // Filter and sort players
  let filteredPlayers = (adjustedPlayersData || [])
    .filter(player => {
      const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           player.team.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPosition = positionFilters.size === 0 || positionFilters.has(player.position);
      const normalizedPlayerTeam = normalizeTeamName(player.team);
      const matchesTeam = teamFilters.size === 0 || teamFilters.has(normalizedPlayerTeam);
      const matchesPrice = player.price >= minPrice && player.price <= maxPrice;
      const isAffordable = !onlyAffordable || player.price <= currentBank;
      
      return matchesSearch && matchesPosition && matchesTeam && matchesPrice && isAffordable;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      if (sortField === 'total') {
        comparison = (a.totalExpectedPoints || 0) - (b.totalExpectedPoints || 0);
      } else if (sortField === 'price') {
        comparison = a.price - b.price;
      } else if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'ownership') {
        comparison = a.ownership - b.ownership;
      } else if (sortField === 'form') {
        comparison = (a.form || 0) - (b.form || 0);
      } else if (sortField === 'avgValue') {
        comparison = (a.averageValue || 0) - (b.averageValue || 0);
      } else if (sortField === 'avgMins') {
        comparison = (a.avgMinutesPerGameweek || 0) - (b.avgMinutesPerGameweek || 0);
      } else if (sortField.startsWith('gw_')) {
        const gwKey = sortField.replace('gw_', '');
        const aPoints = a.gameweekProjections[gwKey] || 0;
        const bPoints = b.gameweekProjections[gwKey] || 0;
        comparison = aPoints - bPoints;
      }
      
      return sortDirection === 'desc' ? -comparison : comparison;
    });

  // Apply load group filter
  if (loadGroupFilter === "Top 50") {
    filteredPlayers = filteredPlayers.slice(0, 50);
  } else if (loadGroupFilter === "Value 50") {
    // Sort by average value (descending) and take top 50
    filteredPlayers = [...filteredPlayers]
      .sort((a, b) => (b.averageValue || 0) - (a.averageValue || 0))
      .slice(0, 50);
  } else if (loadGroupFilter === "Current Team") {
    // Filter to only show players in the base draft team
    if (teamData?.picks) {
      const currentTeamPlayerIds = new Set(teamData.picks.map(pick => pick.element));
      filteredPlayers = filteredPlayers.filter(player => currentTeamPlayerIds.has(player.playerId));
    } else {
      filteredPlayers = [];
    }
  } else if (loadGroupFilter === "All Drafts") {
    // Filter to show all players across all drafts (current team + all transferred in players)
    const allDraftPlayerIds = new Set<number>();
    
    // Add all players from current team
    if (teamData?.picks) {
      teamData.picks.forEach(pick => allDraftPlayerIds.add(pick.element));
    }
    
    // Add all transferred in players from all saved drafts
    if (savedDrafts && savedDrafts.length > 0) {
      savedDrafts.forEach((draft: any) => {
        if (draft.gameweekTransfers) {
          // Iterate through all gameweeks in this draft
          Object.values(draft.gameweekTransfers).forEach((gwTransfers: any) => {
            // Add all transferred in players from completed transfers
            if (gwTransfers.completed && Array.isArray(gwTransfers.completed)) {
              gwTransfers.completed.forEach((transfer: any) => {
                if (transfer.inPlayerId) {
                  allDraftPlayerIds.add(transfer.inPlayerId);
                }
              });
            }
          });
        }
      });
    }
    
    filteredPlayers = filteredPlayers.filter(player => allDraftPlayerIds.has(player.playerId));
  }

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field as any);
      setSortDirection(field === 'name' ? 'asc' : 'desc');
    }
  };

  return (
    <Card ref={sectionRef} className="border-0 shadow-none">
      <CardHeader className="pb-1 pt-3 px-2 md:px-4">
        <CardTitle className="text-base md:text-lg">Projected Points - Next 6 Gameweeks</CardTitle>
      </CardHeader>
      {/* Filter bar — outside CardHeader so overflow-x-auto works correctly */}
      <div className="px-2 md:px-4 pb-2 flex flex-col gap-1.5">
        {/* Row 1: dropdowns + price */}
        <div className="overflow-x-auto">
        <div className="flex flex-row gap-1.5 items-center flex-nowrap w-max min-w-full">
          {/* Position multi-select dropdown */}
          <div className="relative flex-shrink-0" ref={positionDropdownRef}>
            <button
              onClick={() => setPositionDropdownOpen(o => !o)}
              className={`h-8 px-2.5 text-sm rounded-md border font-medium flex items-center gap-1 transition-colors whitespace-nowrap ${
                positionFilters.size > 0
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-background text-foreground border-input hover:border-purple-400'
              }`}
            >
              {positionFilters.size === 0 ? 'Position' : `${positionFilters.size} Pos`}
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {positionDropdownOpen && (
              <div className="absolute z-50 top-9 left-0 w-44 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                <div className="py-1">
                  {[
                    { label: "Goalkeeper (GKP)", value: "Goalkeeper" },
                    { label: "Defender (DEF)", value: "Defender" },
                    { label: "Midfielder (MID)", value: "Midfielder" },
                    { label: "Forward (FWD)", value: "Forward" },
                  ].map(({ label, value }) => (
                    <label key={value} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={positionFilters.has(value)}
                        onChange={() => setPositionFilters(prev => {
                          const next = new Set(prev);
                          if (next.has(value)) next.delete(value); else next.add(value);
                          return next;
                        })}
                        className="w-3.5 h-3.5 accent-purple-600"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                    </label>
                  ))}
                </div>
                {positionFilters.size > 0 && (
                  <div className="p-2 border-t border-gray-100 dark:border-gray-700">
                    <button
                      onClick={() => { setPositionFilters(new Set()); setPositionDropdownOpen(false); }}
                      className="w-full text-sm text-red-500 hover:text-red-700 text-center"
                    >
                      Clear all positions
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          {/* Team multi-select dropdown */}
          <div className="relative flex-shrink-0" ref={teamDropdownRef}>
            <button
              onClick={() => setTeamDropdownOpen(o => !o)}
              className={`h-8 px-2.5 text-sm rounded-md border font-medium flex items-center gap-1 transition-colors whitespace-nowrap ${
                teamFilters.size > 0
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-background text-foreground border-input hover:border-blue-400'
              }`}
            >
              {teamFilters.size === 0 ? 'Team' : `${teamFilters.size} Team${teamFilters.size > 1 ? 's' : ''}`}
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {teamDropdownOpen && (
              <div className="absolute z-50 top-9 left-0 w-52 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                  <input
                    type="text"
                    placeholder="Search teams..."
                    value={teamSearch}
                    onChange={e => setTeamSearch(e.target.value)}
                    className="w-full h-7 px-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-blue-400 dark:bg-gray-800 dark:border-gray-600"
                    autoFocus
                  />
                </div>
                <div className="max-h-52 overflow-y-auto py-1">
                  {uniqueTeams
                    .filter(t => t.toLowerCase().includes(teamSearch.toLowerCase()))
                    .map(team => (
                      <label key={team} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={teamFilters.has(team)}
                          onChange={() => setTeamFilters(prev => {
                            const next = new Set(prev);
                            if (next.has(team)) next.delete(team); else next.add(team);
                            return next;
                          })}
                          className="w-3.5 h-3.5 accent-blue-600"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{team}</span>
                      </label>
                    ))}
                </div>
                {teamFilters.size > 0 && (
                  <div className="p-2 border-t border-gray-100 dark:border-gray-700">
                    <button
                      onClick={() => { setTeamFilters(new Set()); setTeamDropdownOpen(false); }}
                      className="w-full text-sm text-red-500 hover:text-red-700 text-center"
                    >
                      Clear all teams
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          {/* Group filter */}
          <Select value={loadGroupFilter} onValueChange={setLoadGroupFilter}>
            <SelectTrigger className="h-8 text-sm w-28 flex-shrink-0 rounded-md" data-testid="select-load-group">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Players</SelectItem>
              <SelectItem value="Top 50">Top 50</SelectItem>
              <SelectItem value="Value 50">Value 50</SelectItem>
              <SelectItem value="Current Team">My Team</SelectItem>
              <SelectItem value="All Drafts">All Drafts</SelectItem>
            </SelectContent>
          </Select>
          {/* Price range */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-sm text-muted-foreground whitespace-nowrap">£</span>
            <Input
              type="number"
              step="0.1"
              min="3.5"
              max="15.0"
              value={minPrice}
              onChange={(e) => setMinPrice(parseFloat(e.target.value) || 3.5)}
              className="h-8 w-16 text-sm rounded-md"
              data-testid="input-min-price"
            />
            <span className="text-sm text-muted-foreground">–</span>
            <Input
              type="number"
              step="0.1"
              min="4.0"
              max="15.0"
              value={maxPrice}
              onChange={(e) => setMaxPrice(parseFloat(e.target.value) || 15.0)}
              className="h-8 w-16 text-sm rounded-md"
              data-testid="input-max-price"
            />
          </div>
        </div>
        </div>
        {/* Row 2: search + only affordable */}
        <div className="flex flex-row gap-2 items-center">
          <Input
            placeholder="Search Players"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 text-sm flex-1 min-w-0 rounded-md"
            data-testid="input-player-search"
          />
          {transferredOutPlayers.length > 0 && (
            <label className="flex items-center gap-1.5 flex-shrink-0 cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                checked={onlyAffordable}
                onChange={(e) => setOnlyAffordable(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
                data-testid="checkbox-only-affordable"
              />
              <span className="text-sm text-muted-foreground">Only affordable (≤£{currentBank.toFixed(1)}m)</span>
            </label>
          )}
        </div>
        {/* Row 3: Fixture mode toggle */}
        <div className="flex flex-row gap-1.5 items-center">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Fixtures:</span>
          {(['base', 'custom', 'expert'] as const)
            .filter(mode => {
              if (mode !== 'custom') return true;
              try { return Object.keys(JSON.parse(localStorage.getItem('fpl-tbc-assignments') || '{}')).length > 0; } catch { return false; }
            })
            .map(mode => (
              <button
                key={mode}
                onClick={() => setFixtureMode(mode)}
                className={`h-7 px-2.5 text-xs rounded-md border font-medium transition-colors whitespace-nowrap ${
                  fixtureMode === mode
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-background text-foreground border-input hover:border-purple-400'
                }`}
              >
                {mode === 'base' ? 'Base' : mode === 'custom' ? 'My Fixtures' : 'Expert Fixtures'}
              </button>
            ))}
        </div>
      </div>
      <CardContent className="p-1">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm leading-tight">
            <thead>
              <tr className="border-b">
                <th className="text-left py-0.5 px-1 sticky left-0 bg-white dark:bg-gray-950 z-20 w-[130px] min-w-[130px] max-w-[130px]">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1 text-sm truncate"
                    onClick={() => handleSort('name')}
                    data-testid="sort-name"
                  >
                    Player {sortField === 'name' && (sortDirection === 'asc' ? <ChevronUp className="h-2 w-2 inline ml-0.5" /> : <ChevronDown className="h-2 w-2 inline ml-0.5" />)}
                  </Button>
                </th>
                <th className="text-center py-0.5 px-0.5 font-bold w-[28px] min-w-[28px] max-w-[28px]">
                  +
                </th>
                <th className="text-center py-0.5 px-0.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1 text-sm"
                    onClick={() => handleSort('price')}
                    data-testid="sort-price"
                  >
                    £ (mn) {sortField === 'price' && (sortDirection === 'asc' ? <ChevronUp className="h-2 w-2 inline ml-0.5" /> : <ChevronDown className="h-2 w-2 inline ml-0.5" />)}
                  </Button>
                </th>
                <th className="text-center py-0.5 px-0.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1 text-sm"
                    onClick={() => handleSort(`gw_${selectedGameweek}`)}
                    data-testid={`sort-gw${selectedGameweek}`}
                  >
                    GW{selectedGameweek} {sortField === `gw_${selectedGameweek}` && (sortDirection === 'asc' ? <ChevronUp className="h-2 w-2 inline ml-0.5" /> : <ChevronDown className="h-2 w-2 inline ml-0.5" />)}
                  </Button>
                </th>
                <th className="text-center py-0.5 px-0.5 font-bold">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1 text-sm"
                    onClick={() => handleSort('total')}
                    data-testid="sort-total"
                  >
                    Total {sortField === 'total' && (sortDirection === 'asc' ? <ChevronUp className="h-2 w-2 inline ml-0.5" /> : <ChevronDown className="h-2 w-2 inline ml-0.5" />)}
                  </Button>
                </th>
                <th className="text-center py-0.5 px-0.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1 text-sm"
                    onClick={() => handleSort('avgValue')}
                    data-testid="sort-avgValue"
                  >
                    Val {sortField === 'avgValue' && (sortDirection === 'asc' ? <ChevronUp className="h-2 w-2 inline ml-0.5" /> : <ChevronDown className="h-2 w-2 inline ml-0.5" />)}
                  </Button>
                </th>
                <th className="text-center py-0.5 px-0.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1 text-sm"
                    onClick={() => handleSort('ownership')}
                    data-testid="sort-ownership"
                  >
                    Own% {sortField === 'ownership' && (sortDirection === 'asc' ? <ChevronUp className="h-2 w-2 inline ml-0.5" /> : <ChevronDown className="h-2 w-2 inline ml-0.5" />)}
                  </Button>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredPlayers.map((player) => {
                return (
                  <tr
                    key={player.playerId}
                    className="border-b hover:bg-gray-50 dark:hover:bg-gray-900"
                    data-testid={`player-row-${player.playerId}`}
                  >
                    <td className="py-0.5 px-1 sticky left-0 bg-white dark:bg-gray-950 z-10 w-[130px] min-w-[130px] max-w-[130px]">
                      <div className="flex items-center gap-1">
                        <div className="font-medium truncate max-w-[105px]">
                          {(playerIdToWebName && playerIdToWebName.get(player.playerId)) || player.name}
                        </div>
                        <TooltipProvider>
                          <PlayerAvailabilityBadge player={player} />
                        </TooltipProvider>
                      </div>
                      <div className="text-[9px] text-muted-foreground truncate">
                        {(() => {
                          const positionShortforms: { [key: string]: string } = {
                            'Goalkeeper': 'GKP',
                            'Defender': 'DEF',
                            'Midfielder': 'MID',
                            'Forward': 'FWD'
                          };
                          return positionShortforms[player.position] || player.position;
                        })()} • {getTeamShortName(player.team)}
                      </div>
                    </td>
                    <td className="py-0.5 px-0.5 text-center w-[28px] min-w-[28px] max-w-[28px]">
                      {(() => {
                        const positionMap: { [key: string]: number } = {
                          'Goalkeeper': 1, 'Defender': 2, 'Midfielder': 3, 'Forward': 4
                        };
                        const playerElementType = positionMap[player.position];
                        const isAlreadyBeingTransferredOut = transferredOutPlayers.some(t => t.playerId === player.playerId);
                        const transferredOutIds = new Set(transferredOutPlayers.map(t => t.playerId));
                        const isAlreadyInTeam = teamData?.picks
                          ? teamData.picks.some(p => p.element === player.playerId && !transferredOutIds.has(p.element))
                          : false;
                        const hasMatchingTransferOut = transferredOutPlayers && transferredOutPlayers.length > 0 && transferredOutPlayers.some(
                          t => t.elementType === playerElementType
                        );
                        const totalSellingPrice = transferredOutPlayers.reduce((sum, t) => sum + t.sellingPrice, 0);
                        const availableBudget = currentBank + totalSellingPrice;
                        const isAffordable = player.price <= availableBudget;
                        return !isAlreadyBeingTransferredOut && !isAlreadyInTeam && hasMatchingTransferOut && isAffordable ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-5 w-5 text-green-600 hover:bg-green-50 hover:text-green-700"
                            onClick={() => onTransferIn(player.playerId, playerElementType)}
                            data-testid={`transfer-in-${player.playerId}`}
                            title="Transfer In"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        ) : null;
                      })()}
                    </td>
                    <td className="py-0.5 px-0.5 text-center">{player.price.toFixed(1)}</td>
                    {(() => {
                      const gwPoints = player.gameweekProjections[selectedGameweek.toString()] || 0;
                      const top3 = getTop3ForGameweek(selectedGameweek);
                      let bgColor = '';
                      let textColor = 'text-purple-600';
                      if (player.playerId === top3.first) {
                        bgColor = 'bg-yellow-100 dark:bg-yellow-900/30';
                        textColor = 'text-yellow-800 dark:text-yellow-300';
                      } else if (player.playerId === top3.second) {
                        bgColor = 'bg-gray-200 dark:bg-gray-700';
                        textColor = 'text-gray-800 dark:text-gray-300';
                      } else if (player.playerId === top3.third) {
                        bgColor = 'bg-orange-100 dark:bg-orange-900/30';
                        textColor = 'text-orange-800 dark:text-orange-300';
                      }
                      return (
                        <td className={`py-0.5 px-0.5 text-center ${bgColor}`}>
                          <span className={`${textColor} font-medium`}>{gwPoints.toFixed(1)}</span>
                        </td>
                      );
                    })()}
                    <td className="py-0.5 px-0.5 text-center">
                      <span className="font-bold text-green-600">{(player.totalExpectedPoints || 0).toFixed(1)}</span>
                    </td>
                    <td className="py-0.5 px-0.5 text-center">
                      <span className="text-blue-600 dark:text-blue-400">{(player.averageValue || 0).toFixed(1)}</span>
                    </td>
                    <td className="py-0.5 px-0.5 text-center">
                      <span className="text-orange-600 dark:text-orange-400">{Math.round(player.ownership)}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredPlayers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No players found matching your criteria
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface TransferOut {
  playerId: number;
  playerName: string;
  position: number;
  elementType: number;
  sellingPrice: number;
}

interface CompletedTransfer {
  outPlayerId: number;
  outPlayerName: string;
  sellingPrice: number;
  inPlayerId: number;
  inPlayerName: string;
  buyingPrice: number;
}

interface GameweekTransfers {
  [gameweek: number]: {
    transferredOut: TransferOut[];
    completed: CompletedTransfer[];
  };
}

interface ManagerHistory {
  current: Array<{
    event: number;
    points: number;
    total_points: number;
    rank: number;
    overall_rank: number;
    bank: number;
    value: number;
    event_transfers: number;
    event_transfers_cost: number;
  }>;
  past: Array<{
    season_name: string;
    total_points: number;
    rank: number;
  }>;
  chips: Array<{
    name: string;
    time: string;
    event: number;
  }>;
}

type ChipType = 'wildcard' | '3xc' | 'bboost' | 'freehit';

interface PlannedChips {
  [gameweek: number]: ChipType | null;
}

export default function TransferPlanner() {
  const [managerId, setManagerId] = useState("");
  const [searchedId, setSearchedId] = useState("");
  const [selectedGameweek, setSelectedGameweek] = useState<number | null>(null);

  const [manualLineup, setManualLineup] = useState<TeamPick[]>([]);
  const [useFallbackEndpoint, setUseFallbackEndpoint] = useState(false);
  
  const { user } = useAuth();
  
  // Store transfers per gameweek for cumulative effect
  const [gameweekTransfers, setGameweekTransfers] = useState<GameweekTransfers>({});
  
  // Current gameweek's transfers (for convenience)
  const [transferredOutPlayers, setTransferredOutPlayers] = useState<TransferOut[]>([]);
  const [completedTransfers, setCompletedTransfers] = useState<CompletedTransfer[]>([]);
  
  // Player projections tab state for quick navigation
  const [projectionPositionFilter, setProjectionPositionFilter] = useState<string>("all");
  const [scrollToProjections, setScrollToProjections] = useState<boolean>(false);
  const [showProjectedPoints, setShowProjectedPoints] = useState(true);
  
  // Track which manager has been initialized to prevent unwanted resets
  const initializedManagerRef = useRef<string | null>(null);
  
  // Ref for scrolling to team lineup after transfer
  const teamLineupRef = useRef<HTMLDivElement>(null);
  
  // Track when lineup is manually optimized to prevent auto-reset
  // Key format: "draftLetter_gameweek" (e.g., "A_12", "B_15")
  const isLineupOptimizedRef = useRef<{ [key: string]: boolean }>({});
  
  // Track if we're currently processing a transfer to prevent useEffect interference
  const isProcessingTransferRef = useRef<boolean>(false);
  
  // Helper to generate consistent optimization keys
  const getOptimizationKey = (draft: string, gameweek: number): string => {
    return `${draft}_${gameweek}`;
  };
  
  // Draft management state
  const [activeDraft, setActiveDraft] = useState<string>("A"); // Current working draft
  const [savedDrafts, setSavedDrafts] = useState<any[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Auto-save state
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadingDraftRef = useRef(false);
  
  // Refs to track current state for unmount flush
  const hasUnsavedChangesRef = useRef(false);
  const activeDraftRef = useRef<string>("A");
  const searchedIdRef = useRef<string | null>(null);
  const gameweekTransfersRef = useRef<GameweekTransfers>({});
  const plannedChipsRef = useRef<PlannedChips>({});
  const optimizedLineupsRef = useRef<{ [gameweek: number]: TeamPick[] }>({});
  const manualLineupRef = useRef<TeamPick[]>([]);
  
  // Store saved captain/vice-captain from draft (to apply after lineup rebuild)
  const [savedCaptainInfo, setSavedCaptainInfo] = useState<{
    captainPlayerId: number | null;
    viceCaptainPlayerId: number | null;
  } | null>(null);
  
  // Chip planning state
  const [plannedChips, setPlannedChips] = useState<PlannedChips>({});
  
  // Optimized lineups state - stores optimized lineup positions per gameweek
  // Structure: { [gameweek: number]: TeamPick[] }
  const [optimizedLineups, setOptimizedLineups] = useState<{ [gameweek: number]: TeamPick[] }>({});
  
  // Collapsible sections state - default to collapsed
  const [isChipsPlanningOpen, setIsChipsPlanningOpen] = useState(false);
  const [isDraftSelectionOpen, setIsDraftSelectionOpen] = useState(false);
  const [isTeamSummaryOpen, setIsTeamSummaryOpen] = useState(true);
  const [isTeamEvolutionOpen, setIsTeamEvolutionOpen] = useState(true);
  const [isDraftComparisonOpen, setIsDraftComparisonOpen] = useState(true);
  
  // Track chip changes for autosave (to avoid saving on initial load or draft switch)
  const chipChangeForAutosaveRef = useRef(false);
  
  // Sell price editing state
  const [editingSellPrice, setEditingSellPrice] = useState<number | null>(null);
  const [editSellPriceValue, setEditSellPriceValue] = useState<string>("");
  
  // Buy price editing dialog
  const [editBuyPriceDialog, setEditBuyPriceDialog] = useState<{ playerId: number; currentPrice: number } | null>(null);
  const [editBuyPriceValue, setEditBuyPriceValue] = useState<string>("");
  
  // Captain confirmation dialogs
  const [captainConfirmation, setCaptainConfirmation] = useState<{ playerId: number; playerName: string } | null>(null);
  const [viceCaptainConfirmation, setViceCaptainConfirmation] = useState<{ playerId: number; playerName: string } | null>(null);
  
  // Delete all drafts confirmation dialog
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  
  // Selected player for pitch view actions
  const [selectedPlayer, setSelectedPlayer] = useState<number | null>(null);
  
  const { toast } = useToast();
  // Cache manager ID functionality
  const saveManagerIdToCache = (id: string) => {
    try {
      localStorage.setItem('fpl-manager-id', id);
    } catch (error) {
      console.warn('Failed to save manager ID to localStorage:', error);
    }
  };

  const getManagerIdFromCache = (): string | null => {
    try {
      return localStorage.getItem('fpl-manager-id');
    } catch (error) {
      console.warn('Failed to get manager ID from localStorage:', error);
      return null;
    }
  };

  // Auto-load cached manager ID on component mount
  useEffect(() => {
    const cachedId = getManagerIdFromCache();
    if (cachedId) {
      setManagerId(cachedId);
      setSearchedId(cachedId); // Auto-trigger data loading
    }
  }, []);

  // Keep refs in sync with state for unmount handling
  useEffect(() => {
    hasUnsavedChangesRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);
  
  useEffect(() => {
    activeDraftRef.current = activeDraft;
  }, [activeDraft]);
  
  useEffect(() => {
    searchedIdRef.current = searchedId;
  }, [searchedId]);
  
  useEffect(() => {
    gameweekTransfersRef.current = gameweekTransfers;
  }, [gameweekTransfers]);
  
  useEffect(() => {
    plannedChipsRef.current = plannedChips;
  }, [plannedChips]);
  
  useEffect(() => {
    optimizedLineupsRef.current = optimizedLineups;
  }, [optimizedLineups]);
  
  useEffect(() => {
    manualLineupRef.current = manualLineup;
  }, [manualLineup]);

  // Flush autosave on component unmount (when navigating away)
  useEffect(() => {
    return () => {
      // Cancel any pending debounced save
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
        autosaveTimeoutRef.current = null;
      }
      
      // If there are unsaved changes, save immediately before unmount
      if (hasUnsavedChangesRef.current && activeDraftRef.current !== "Base" && searchedIdRef.current) {
        console.log("📤 Flushing autosave on unmount for draft:", activeDraftRef.current);
        
        const currentLineup = manualLineupRef.current;
        const savePayload = JSON.stringify({
          managerId: searchedIdRef.current,
          draftLetter: activeDraftRef.current,
          gameweekTransfers: gameweekTransfersRef.current,
          plannedChips: plannedChipsRef.current,
          optimizedLineups: optimizedLineupsRef.current,
          captainPlayerId: currentLineup.find(p => p.is_captain)?.element || null,
          viceCaptainPlayerId: currentLineup.find(p => p.is_vice_captain)?.element || null
        });
        
        // Use fetch with keepalive for best effort save
        fetch('/api/transfer-planner/drafts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: savePayload,
          keepalive: true
        }).catch(err => console.error("Failed to save on unmount:", err));
      }
    };
  }, []);

  // Comprehensive autosave effect - watches all draft state changes
  useEffect(() => {
    // Skip autosave if:
    // - We're loading a draft
    // - We're on Base draft
    // - We don't have a manager ID
    // - Initial mount
    if (isLoadingDraftRef.current || activeDraft === "Base" || !searchedId) {
      return;
    }

    // Queue autosave on any state change
    queueAutosave();
  }, [
    // Watch all state that should trigger autosave
    JSON.stringify(gameweekTransfers),
    JSON.stringify(plannedChips),
    JSON.stringify(manualLineup.map(p => ({ 
      element: p.element, 
      position: p.position, 
      is_captain: p.is_captain, 
      is_vice_captain: p.is_vice_captain,
      multiplier: p.multiplier
    }))),
    activeDraft,
    searchedId
  ]);

  const { data: bootstrapData } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
  });

  // Fetch fixtures data
  const { data: fixturesData } = useQuery<any[]>({
    queryKey: ["/api/fixtures"],
  });

  // Check if user is viewing their own team
  const isOwnTeam = user?.fplManagerId && searchedId && Number(searchedId) === user.fplManagerId;

  // Determine which endpoint to use (with fallback for expired sessions)
  const shouldUseAuthenticatedEndpoint = isOwnTeam && !useFallbackEndpoint;

  // Use authenticated my-team endpoint for own team (shows GW 13 unconfirmed team)
  // Fall back to public picks endpoint if session expired (GW 12 confirmed team)
  const { data: teamData, isLoading: isLoadingTeam, error: teamDataError } = useQuery<TeamData>({
    queryKey: shouldUseAuthenticatedEndpoint ? ["/api/fpl/my-team"] : ["/api/manager", searchedId, "team"],
    enabled: !!searchedId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false, // Prevent auto-refetch that would reset transfers
    retry: false, // Don't auto-retry if FPL session expired
  });

  // Handle FPL session expiry - fall back to public endpoint
  useEffect(() => {
    if (teamDataError && shouldUseAuthenticatedEndpoint && searchedId) {
      console.log("⚠️ FPL session expired or unavailable, falling back to manager ID endpoint");
      setUseFallbackEndpoint(true);
    }
  }, [teamDataError, shouldUseAuthenticatedEndpoint, searchedId]);

  // Debug: log teamData.transfers when using authenticated endpoint
  useEffect(() => {
    if (isOwnTeam && teamData) {
      console.log("🔍 Authenticated my-team data transfers:", teamData.transfers);
    }
  }, [isOwnTeam, teamData]);


  // Fetch manager history to get used chips
  const { data: historyData } = useQuery<ManagerHistory>({
    queryKey: ["/api/manager", searchedId, "history"],
    enabled: !!searchedId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });

  // Fetch buy prices for all players in the team
  const { data: buyPricesData } = useQuery<{ buyPrices: Record<number, number> }>({
    queryKey: ["/api/manager", searchedId, "buy-prices"],
    enabled: !!searchedId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });

  // Fetch buy price overrides set by the manager (applies to all drafts)
  const { data: buyPriceOverridesData, refetch: refetchBuyPriceOverrides } = useQuery<{ overrides: Record<number, number> }>({
    queryKey: ["/api/manager", searchedId, "buy-price-overrides"],
    enabled: !!searchedId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });

  // Calculate baseline lineup for a given gameweek by applying all previous transfers
  const getBaselineLineup = (targetGameweek: number): TeamPick[] => {
    if (!teamData?.picks) return [];
    
    // Start with original team with buy price overrides applied and clear transferred out status
    // CRITICAL: Normalize multiplier values from FPL API picks so past chips (e.g. TC from GW 26)
    // don't carry their multiplier into future gameweek projections
    let baseline = teamData.picks.map(pick => {
      const player = getPlayerById(pick.element);
      const currentPrice = player?.now_cost || pick.selling_price;
      const overridePrice = buyPriceOverridesData?.overrides?.[pick.element];
      const apiPrice = buyPricesData?.buyPrices?.[pick.element];
      
      const normalizedMultiplier = pick.is_captain ? 2 : (pick.position <= 11 ? 1 : 0);
      
      return {
        ...pick,
        purchase_price: overridePrice || apiPrice || pick.purchase_price || currentPrice,
        multiplier: normalizedMultiplier,
        is_transferred_out: false
      };
    });
    
    // Get the starting gameweek
    const firstGW = getNextGameweeks()[0]?.id || 7;
    
    // Apply all transfers from previous gameweeks (skip Free Hit gameweeks)
    for (let gw = firstGW; gw < targetGameweek; gw++) {
      // Skip this gameweek if Free Hit was active (transfers don't carry over)
      if (plannedChips[gw] === 'freehit') {
        continue;
      }
      
      const transfers = gameweekTransfers[gw];
      if (transfers && transfers.completed) {
        // Apply each completed transfer
        transfers.completed.forEach(transfer => {
          baseline = baseline.map(pick => {
            if (pick.element === transfer.outPlayerId) {
              // Replace with new player
              const inPlayer = getPlayerById(transfer.inPlayerId);
              if (inPlayer) {
                // Check for buy price override for the transferred-in player
                const overridePrice = buyPriceOverridesData?.overrides?.[transfer.inPlayerId];
                return {
                  ...pick,
                  element: transfer.inPlayerId,
                  selling_price: inPlayer.now_cost,
                  purchase_price: overridePrice || inPlayer.now_cost,
                };
              }
            }
            return pick;
          });
        });
      }
    }
    
    return baseline;
  };

  // Initialize team lineup when team data loads (only on first load or manager change)
  useEffect(() => {
    if (teamData?.picks && searchedId && initializedManagerRef.current !== searchedId) {
      console.log("DEBUG: Initializing team for manager:", searchedId);
      console.log("DEBUG: First pick from teamData:", teamData.picks[0]);
      
      // Merge buy prices into picks if available, defaulting to current price
      // Priority: Buy price overrides > FPL API buy prices > Current price
      let picksWithBuyPrices = teamData.picks.map(pick => {
        const player = getPlayerById(pick.element);
        const currentPrice = player?.now_cost || pick.selling_price;
        
        const overridePrice = buyPriceOverridesData?.overrides?.[pick.element];
        const apiPrice = buyPricesData?.buyPrices?.[pick.element];
        
        const normalizedMultiplier = pick.is_captain ? 2 : (pick.position <= 11 ? 1 : 0);
        
        return {
          ...pick,
          purchase_price: overridePrice || apiPrice || currentPrice,
          multiplier: normalizedMultiplier
        };
      });
      
      setManualLineup(picksWithBuyPrices);
      // Reset all transfers when loading NEW team data (different manager)
      setGameweekTransfers({});
      setTransferredOutPlayers([]);
      setCompletedTransfers([]);
      // Mark this manager as initialized
      initializedManagerRef.current = searchedId;
    }
  }, [teamData, searchedId]); // Removed buyPricesData and buyPriceOverridesData to prevent resetting optimized lineups

  // Compute stable GW range from bootstrap data for the projection query
  const plannerCurrentGW = bootstrapData?.events.find((e: any) => e.is_current)?.id || 27;
  const plannerNextGW = plannerCurrentGW + 1;
  const plannerMaxGW = Math.min(38, plannerNextGW + 11);

  // Fetch player projections from cached endpoint (contains all future GWs, pre-computed at startup)
  // Stable query key — does NOT include user's selected GW so TanStack caches once
  // This allows instant gameweek switching without refetching
  const { data: cachedPlayerProjections, isLoading: projectionsLoading, error: projectionsError } = useQuery<any[]>({
    queryKey: ["/api/cached/player-total-points"],
    queryFn: async () => {
      const res = await fetch(`/api/cached/player-total-points`);
      if (!res.ok) throw new Error('Failed to fetch projections');
      return res.json();
    },
    staleTime: 30 * 60 * 1000,
    enabled: !!bootstrapData,
  });

  // Use cached projections for both single GW and 6GW calculations
  const playerProjections = cachedPlayerProjections;
  const playerProjections6GW = cachedPlayerProjections;
  const projections6GWLoading = projectionsLoading;

  // Fetch recommended transfers for the current manager
  const { data: recommendedTransfers, isLoading: isLoadingRecommendations } = useQuery<any>({
    queryKey: ["/api/manager", searchedId, "recommended-transfers"],
    enabled: !!searchedId,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Get next 6 gameweeks
  const getNextGameweeks = () => {
    if (!bootstrapData) return [];
    
    // Find the first gameweek that hasn't finished and isn't current
    const nextEvent = bootstrapData.events.find(e => !e.finished && !e.is_current);
    
    // Start from the next upcoming gameweek
    let startGW = nextEvent?.id || 1;
    
    // If no next event found, use the gameweek after the current/finished ones
    if (!nextEvent) {
      const currentEvent = bootstrapData.events.find(e => e.is_current);
      if (currentEvent) {
        startGW = currentEvent.id + 1;
      } else {
        const lastFinished = bootstrapData.events.filter(e => e.finished).sort((a, b) => b.id - a.id)[0];
        if (lastFinished) {
          startGW = lastFinished.id + 1;
        }
      }
    }
    
    const nextGameweeks = [];
    
    // Get exactly 6 upcoming gameweeks
    for (let i = 0; i < 6; i++) {
      const gwNumber = startGW + i;
      const gw = bootstrapData.events.find(e => e.id === gwNumber);
      if (gw && gwNumber <= 38) {
        nextGameweeks.push(gw);
      }
    }
    
    return nextGameweeks;
  };

  // Get remaining chips available for planning
  const getRemainingChips = (): Record<ChipType, number> => {
    const chipLimits: Record<ChipType, number> = {
      'wildcard': 2,
      '3xc': 2,
      'bboost': 2,
      'freehit': 2
    };
    
    const remaining = { ...chipLimits };
    
    // Subtract chips already used (from history)
    if (historyData?.chips) {
      historyData.chips.forEach(chip => {
        const chipType = chip.name as ChipType;
        if (remaining[chipType] !== undefined) {
          remaining[chipType] = Math.max(0, remaining[chipType] - 1);
        }
      });
    }
    
    // Subtract chips planned in future gameweeks
    Object.values(plannedChips).forEach(chipType => {
      if (chipType && (chipType === 'wildcard' || chipType === '3xc' || chipType === 'bboost' || chipType === 'freehit')) {
        const validChip = chipType as ChipType;
        remaining[validChip] = Math.max(0, remaining[validChip] - 1);
      }
    });
    
    return remaining;
  };

  // Helper to check if a new draft is needed
  // Returns the target draft letter or null if limit reached
  const getTargetDraftForChanges = (): string | null => {
    if (activeDraft !== "Base") {
      // Already in a draft
      return activeDraft;
    }
    
    // We're in Base - need to create a new draft
    const usedLetters = savedDrafts.map(d => d.draftLetter);
    const allLetters = 'ABCDE'.split('');
    const nextLetter = allLetters.find(l => !usedLetters.includes(l));
    
    if (!nextLetter) {
      toast({
        title: "Draft Limit Reached",
        description: "You have 5 drafts already. Please delete a draft first, or make changes in an existing draft instead of Base.",
        variant: "destructive"
      });
      return null;
    }
    
    return nextLetter;
  };

  // Create and save a new draft with current state (called AFTER changes are applied)
  const finalizeNewDraft = async (draftLetter: string) => {
    if (activeDraft === draftLetter) {
      // Already in the target draft
      return;
    }
    
    if (!searchedId) return;
    
    // First, save the draft with the current state (including captain/vice-captain)
    const captainPick = manualLineup.find(p => p.is_captain);
    const viceCaptainPick = manualLineup.find(p => p.is_vice_captain);
    
    console.log("DEBUG finalizeNewDraft - manualLineup:", manualLineup);
    console.log("DEBUG finalizeNewDraft - captainPick:", captainPick);
    console.log("DEBUG finalizeNewDraft - viceCaptainPick:", viceCaptainPick);
    
    try {
      const draftData = {
        managerId: parseInt(searchedId),
        draftLetter: draftLetter,
        gameweekTransfers: JSON.parse(JSON.stringify(gameweekTransfers)),
        plannedChips: JSON.parse(JSON.stringify(plannedChips)),
        mode: "manual",
        teamBank: calculateBankAfterTransfers(),
        teamValue: 0,
        totalProjectedPoints: 0,
        totalTransfersUsed: Object.values(gameweekTransfers).reduce((sum, gw) => sum + gw.completed.length, 0),
        captainPlayerId: captainPick?.element || null,
        captainPlayerName: captainPick ? getPlayerById(captainPick.element)?.web_name : null,
        viceCaptainPlayerId: viceCaptainPick?.element || null,
        viceCaptainPlayerName: viceCaptainPick ? getPlayerById(viceCaptainPick.element)?.web_name : null
      };
      
      console.log("DEBUG finalizeNewDraft - Saving draft with data:", draftData);
      
      await fetch("/api/transfer-planner/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draftData)
      });
      
      // Reload drafts
      await loadDrafts();
      
      // Now switch to the draft using the proper function (which loads it correctly)
      await switchToDraft(draftLetter);
      
      toast({
        title: `Draft ${draftLetter} Created`,
        description: `Your changes have been saved to Draft ${draftLetter}`,
      });
    } catch (error) {
      console.error("Error finalizing draft:", error);
      toast({
        title: "Error",
        description: "Failed to create draft",
        variant: "destructive"
      });
    }
  };

  // Handle chip selection for a gameweek
  const handleChipSelection = (gameweek: number, chipType: ChipType | null) => {
    // Check if we can create a draft
    const targetDraft = getTargetDraftForChanges();
    if (!targetDraft) return;
    
    const wasInBase = activeDraft === "Base";
    
    // Apply the chip change
    setPlannedChips(prev => {
      const updated = { ...prev };
      if (chipType === null) {
        delete updated[gameweek];
      } else {
        updated[gameweek] = chipType;
      }
      return updated;
    });
    
    // If we were in Base, finalize the new draft
    if (wasInBase) {
      setTimeout(() => finalizeNewDraft(targetDraft), 100);
    } else {
      // Set flag to trigger autosave
      chipChangeForAutosaveRef.current = true;
      setHasUnsavedChanges(true);
    }
  };

  // Get chip display name
  const getChipDisplayName = (chipType: ChipType): string => {
    const names: Record<ChipType, string> = {
      'wildcard': 'Wildcard',
      '3xc': 'Triple Captain',
      'bboost': 'Bench Boost',
      'freehit': 'Free Hit'
    };
    return names[chipType] || chipType;
  };

  // Get chip number (1 or 2) based on how many have been used
  const getChipNumber = (chipType: ChipType): number => {
    const used = historyData?.chips?.filter(chip => chip.name === chipType).length || 0;
    return used + 1;
  };

  // Get chip display name with number (e.g., "Bench Boost 1", "Wildcard 2")
  const getChipDisplayNameWithNumber = (chipType: ChipType): string => {
    const baseName = getChipDisplayName(chipType);
    const used = historyData?.chips?.filter(chip => chip.name === chipType).length || 0;
    const remaining = getRemainingChips()[chipType];
    
    // Calculate which number this chip is (1 or 2)
    const chipNumber = used + remaining > 0 ? (used + 1) : 1;
    
    return `${baseName} ${chipNumber}`;
  };

  // Get used chip display name with number
  const getUsedChipDisplayName = (chipType: string, usedIndex: number): string => {
    const baseName = getChipDisplayName(chipType as ChipType);
    const totalUsed = historyData?.chips?.filter(chip => chip.name === chipType).length || 0;
    
    // For the first use, show "1", for second use show "2"
    return `${baseName} ${usedIndex + 1}`;
  };

  // Get chips for a specific draft
  const getDraftChips = (draftLetter: string): PlannedChips => {
    if (draftLetter === "Base") {
      return {};
    }
    
    const draft = savedDrafts.find(d => d.draftLetter === draftLetter);
    return draft?.plannedChips || {};
  };

  // Get chip icon color based on chip type
  const getChipIconColor = (chipType: ChipType): string => {
    const colors: Record<ChipType, string> = {
      'wildcard': 'text-purple-600',
      '3xc': 'text-amber-600',
      'bboost': 'text-blue-600',
      'freehit': 'text-green-600'
    };
    return colors[chipType] || 'text-gray-600';
  };

  // Get chip description
  const getChipDescription = (chipType: ChipType): string => {
    const descriptions: Record<ChipType, string> = {
      'wildcard': 'Transfer entire squad for free',
      '3xc': 'Captain gets 3x points instead of 2x',
      'bboost': 'Points from bench players count',
      'freehit': 'Make unlimited transfers for one gameweek'
    };
    return descriptions[chipType] || '';
  };

  // Check if a chip can be used in a specific gameweek
  const canChipBeUsedInGameweek = (chipType: ChipType, gameweek: number): boolean => {
    // If this chip is already planned for THIS specific gameweek, always allow it.
    // getRemainingChips() counts planned chips as "used", so without this early
    // return a chip planned for this GW would show 0 remaining and be hidden.
    if (plannedChips[gameweek] === chipType) return true;

    const remainingChips = getRemainingChips();
    
    // If no chips remaining, it can't be used
    if (remainingChips[chipType] === 0) {
      return false;
    }
    
    // Check if this chip type has already been planned for another gameweek
    const chipAlreadyPlannedElsewhere = Object.entries(plannedChips).some(
      ([gw, chip]) => chip === chipType && parseInt(gw) !== gameweek
    );
    if (chipAlreadyPlannedElsewhere) {
      return false;
    }
    
    // For wildcards, apply gameweek constraints
    if (chipType === 'wildcard') {
      // Count how many wildcards have been used
      const wildcardsUsed = historyData?.chips?.filter(chip => chip.name === 'wildcard').length || 0;
      
      // If no wildcards used, the first wildcard can be used up to GW19
      if (wildcardsUsed === 0) {
        return gameweek <= 19;
      }
      
      // If one wildcard used, check which one based on when it was used
      if (wildcardsUsed === 1) {
        const firstWildcardGW = historyData?.chips?.find(chip => chip.name === 'wildcard')?.event || 0;
        
        // If first wildcard was used in GW19 or earlier, the second wildcard can only be used from GW20 onwards
        if (firstWildcardGW <= 19) {
          return gameweek >= 20;
        }
        
        // If first wildcard was used in GW20 or later, the second wildcard (first one) can be used up to GW19
        if (firstWildcardGW >= 20) {
          return gameweek <= 19;
        }
      }
    }
    
    // For triple captain, apply the same gameweek constraints
    if (chipType === '3xc') {
      // Count how many triple captains have been used
      const tripleCaptainsUsed = historyData?.chips?.filter(chip => chip.name === '3xc').length || 0;
      
      // If no triple captains used, the first triple captain can be used up to GW19
      if (tripleCaptainsUsed === 0) {
        return gameweek <= 19;
      }
      
      // If one triple captain used, check which one based on when it was used
      if (tripleCaptainsUsed === 1) {
        const firstTripleCaptainGW = historyData?.chips?.find(chip => chip.name === '3xc')?.event || 0;
        
        // If first triple captain was used in GW19 or earlier, the second triple captain can only be used from GW20 onwards
        if (firstTripleCaptainGW <= 19) {
          return gameweek >= 20;
        }
        
        // If first triple captain was used in GW20 or later, the second triple captain (first one) can be used up to GW19
        if (firstTripleCaptainGW >= 20) {
          return gameweek <= 19;
        }
      }
    }
    
    // For bench boost, apply the same gameweek constraints
    if (chipType === 'bboost') {
      // Count how many bench boosts have been used
      const benchBoostsUsed = historyData?.chips?.filter(chip => chip.name === 'bboost').length || 0;
      
      // If no bench boosts used, the first bench boost can be used up to GW19
      if (benchBoostsUsed === 0) {
        return gameweek <= 19;
      }
      
      // If one bench boost used, check which one based on when it was used
      if (benchBoostsUsed === 1) {
        const firstBenchBoostGW = historyData?.chips?.find(chip => chip.name === 'bboost')?.event || 0;
        
        // If first bench boost was used in GW19 or earlier, the second bench boost can only be used from GW20 onwards
        if (firstBenchBoostGW <= 19) {
          return gameweek >= 20;
        }
        
        // If first bench boost was used in GW20 or later, the second bench boost (first one) can be used up to GW19
        if (firstBenchBoostGW >= 20) {
          return gameweek <= 19;
        }
      }
    }
    
    // For free hit, apply the same gameweek constraints
    if (chipType === 'freehit') {
      // Count how many free hits have been used
      const freeHitsUsed = historyData?.chips?.filter(chip => chip.name === 'freehit').length || 0;
      
      // If no free hits used, the first free hit can be used up to GW19
      if (freeHitsUsed === 0) {
        return gameweek <= 19;
      }
      
      // If one free hit used, check which one based on when it was used
      if (freeHitsUsed === 1) {
        const firstFreeHitGW = historyData?.chips?.find(chip => chip.name === 'freehit')?.event || 0;
        
        // If first free hit was used in GW19 or earlier, the second free hit can only be used from GW20 onwards
        if (firstFreeHitGW <= 19) {
          return gameweek >= 20;
        }
        
        // If first free hit was used in GW20 or later, the second free hit (first one) can be used up to GW19
        if (firstFreeHitGW >= 20) {
          return gameweek <= 19;
        }
      }
    }
    
    // All constraints passed
    return true;
  };

  // Get available chips for a specific gameweek (filters based on constraints)
  const getAvailableChipsForGameweek = (gameweek: number): ChipType[] => {
    const allChips: ChipType[] = ['wildcard', '3xc', 'bboost', 'freehit'];
    return allChips.filter(chipType => canChipBeUsedInGameweek(chipType, gameweek));
  };

  // Set default gameweek when bootstrap data loads
  useEffect(() => {
    if (bootstrapData && !selectedGameweek) {
      const nextGWs = getNextGameweeks();
      if (nextGWs.length > 0) {
        setSelectedGameweek(nextGWs[0].id);
      }
    }
  }, [bootstrapData]);

  // Save and load transfers when gameweek changes
  useEffect(() => {
    if (!selectedGameweek || !teamData?.picks) return;
    
    // Skip if we're currently processing a transfer to prevent interference
    if (isProcessingTransferRef.current) {
      console.log("🚫 SKIPPING lineup rebuild - transfer in progress");
      return;
    }
    
    // Clear player popup when gameweek changes
    setSelectedPlayer(null);
    
    const optimizationKey = getOptimizationKey(activeDraft, selectedGameweek);
    console.log("🔄 LINEUP REBUILD useEffect triggered - GW:", selectedGameweek, "Draft:", activeDraft, "Key:", optimizationKey, "Flags:", isLineupOptimizedRef.current);
    
    // CRITICAL: If this gameweek has an optimized lineup, we need to load it (not skip)
    // The optimization flag just means we shouldn't reset it to transfers-only baseline
    const hasOptimizedLineup = Boolean(optimizedLineups[selectedGameweek]);
    if (isLineupOptimizedRef.current[optimizationKey] && !hasOptimizedLineup) {
      console.log("🔒 PROTECTED: Skipping lineup reset - Key", optimizationKey, "is optimized but no optimized lineup in state");
      return;
    }
    
    if (hasOptimizedLineup) {
      console.log("📦 LOADING OPTIMIZED LINEUP for", optimizationKey);
    } else {
      console.log("⚠️ REBUILDING lineup for", optimizationKey, "- no optimization");
    }
    
    // Helper to apply buy price overrides to lineup
    const applyBuyPriceOverrides = (lineup: TeamPick[]) => {
      return lineup.map(pick => {
        const overridePrice = buyPriceOverridesData?.overrides?.[pick.element];
        const apiPrice = buyPricesData?.buyPrices?.[pick.element];
        const player = getPlayerById(pick.element);
        const currentPrice = player?.now_cost || pick.selling_price;
        
        return {
          ...pick,
          purchase_price: overridePrice || apiPrice || pick.purchase_price || currentPrice
        };
      });
    };
    
    // Base Draft: ALWAYS show original team with NO transfers
    if (activeDraft === "Base") {
      setTransferredOutPlayers([]);
      setCompletedTransfers([]);
      const baseLineup = applyBuyPriceOverrides([...teamData.picks]).map(pick => ({
        ...pick,
        multiplier: pick.is_captain ? 2 : (pick.position <= 11 ? 1 : 0)
      }));
      setManualLineup(baseLineup);
      return;
    }
    
    // Other drafts: Load transfers for the selected gameweek
    const gwTransfers = gameweekTransfers[selectedGameweek] || { transferredOut: [], completed: [] };
    setTransferredOutPlayers(gwTransfers.transferredOut);
    setCompletedTransfers(gwTransfers.completed);
    
    // Calculate and set the baseline lineup for this gameweek
    const baseline = getBaselineLineup(selectedGameweek);
    
    // Apply current gameweek's completed transfers (so Vicario→Pope persists)
    let lineupWithTransfers = [...baseline];
    gwTransfers.completed.forEach(transfer => {
      lineupWithTransfers = lineupWithTransfers.map(pick => {
        if (pick.element === transfer.outPlayerId) {
          const inPlayer = getPlayerById(transfer.inPlayerId);
          if (inPlayer) {
            return {
              ...pick,
              element: transfer.inPlayerId,
              selling_price: inPlayer.now_cost,
              purchase_price: inPlayer.now_cost,
              is_transferred_out: false, // Clear transferred out flag for the new player
            };
          }
        }
        return pick;
      });
    });
    
    // Apply current gameweek's pending transfers (transferred out but not yet replaced)
    // CRITICAL: Match by player ID, not position (positions can change after optimization)
    gwTransfers.transferredOut.forEach(transferOut => {
      lineupWithTransfers = lineupWithTransfers.map(pick => {
        if (pick.element === transferOut.playerId) {
          return { ...pick, is_transferred_out: true };
        }
        return pick;
      });
    });
    
    // Apply buy price overrides before setting state
    lineupWithTransfers = applyBuyPriceOverrides(lineupWithTransfers);
    
    // Check if there's a persisted optimized lineup for this gameweek
    if (optimizedLineups[selectedGameweek]) {
      console.log("📦 USING OPTIMIZED LINEUP from database for GW", selectedGameweek);
      // Use the optimized lineup from database (includes positions, captain, etc.)
      lineupWithTransfers = JSON.parse(JSON.stringify(optimizedLineups[selectedGameweek]));
      
      // Re-apply buy price overrides to the optimized lineup
      lineupWithTransfers = applyBuyPriceOverrides(lineupWithTransfers);
      
      // Re-apply transferred out flags (they can happen after optimization)
      // CRITICAL: Match by player ID, not position (positions can change after optimization)
      gwTransfers.transferredOut.forEach(transferOut => {
        lineupWithTransfers = lineupWithTransfers.map(pick => {
          if (pick.element === transferOut.playerId) {
            return { ...pick, is_transferred_out: true };
          }
          return pick;
        });
      });
    } else {
      // No optimized lineup - apply saved captain/vice-captain if available (from draft loading)
      if (savedCaptainInfo && (savedCaptainInfo.captainPlayerId || savedCaptainInfo.viceCaptainPlayerId)) {
        console.log("DEBUG: Applying saved captain info:", savedCaptainInfo);
        lineupWithTransfers = lineupWithTransfers.map(pick => ({
          ...pick,
          is_captain: pick.element === savedCaptainInfo.captainPlayerId,
          is_vice_captain: pick.element === savedCaptainInfo.viceCaptainPlayerId
        }));
      } else {
        console.log("DEBUG: No saved captain info to apply, savedCaptainInfo:", savedCaptainInfo);
      }
    }
    
    setManualLineup(lineupWithTransfers);
  }, [selectedGameweek, activeDraft, gameweekTransfers, buyPriceOverridesData, buyPricesData, savedCaptainInfo, optimizedLineups]);

  const handleSearch = () => {
    if (managerId.trim()) {
      const trimmedId = managerId.trim();
      setUseFallbackEndpoint(false); // Reset fallback flag to try authenticated endpoint first
      setSearchedId(trimmedId);
      saveManagerIdToCache(trimmedId);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const getPlayerById = (id: number): Player | undefined => {
    return bootstrapData?.elements.find(p => p.id === id);
  };
  
  const normalizePickMultipliers = (picks: TeamPick[]): TeamPick[] => {
    return picks.map(pick => ({
      ...pick,
      multiplier: pick.is_captain ? 2 : (pick.position <= 11 ? 1 : 0)
    }));
  };

  const getPositionName = (elementType: number): string => {
    const position = bootstrapData?.element_types.find(t => t.id === elementType);
    return position?.singular_name || "Unknown";
  };

  const getPositionShortName = (elementType: number): string => {
    const shortforms: { [key: number]: string } = {
      1: 'GKP',
      2: 'DEF',
      3: 'MID',
      4: 'FWD'
    };
    return shortforms[elementType] || getPositionName(elementType);
  };

  const getTeamName = (teamId: number): string => {
    const team = bootstrapData?.teams.find(t => t.id === teamId);
    return team?.short_name || 'Unknown';
  };

  const getTeamShortName = (teamFullName: string): string => {
    const team = bootstrapData?.teams.find(t => t.name === teamFullName);
    return team?.short_name || teamFullName;
  };

  const getPlayerProjectedPoints = (playerId: number): number | null => {
    if (!playerProjections || !selectedGameweek) return null;
    if (!Array.isArray(playerProjections)) return null;
    
    const projection = playerProjections.find(p => p.playerId === playerId);
    if (!projection) return null;

    const gwKey = selectedGameweek.toString();
    const points = projection.gameweekProjections?.[gwKey];
    if (points === undefined) return null;

    return points;
  };

  // Get fixture info for a player in a specific gameweek
  const getPlayerFixture = (playerId: number, gameweek: number): { opponent: string; isHome: boolean } | null => {
    const player = getPlayerById(playerId);
    if (!player || !fixturesData || !bootstrapData) return null;

    const playerTeamId = player.team;
    const fixture = fixturesData.find(f => 
      f.event === gameweek && (f.team_h === playerTeamId || f.team_a === playerTeamId)
    );

    if (!fixture) return null;

    const isHome = fixture.team_h === playerTeamId;
    const opponentId = isHome ? fixture.team_a : fixture.team_h;
    const opponentTeam = bootstrapData.teams.find(t => t.id === opponentId);

    return {
      opponent: opponentTeam?.short_name || 'Unknown',
      isHome
    };
  };

  const getPlayerFixtures = (playerId: number, gameweek: number): { opponent: string; isHome: boolean }[] => {
    const player = getPlayerById(playerId);
    if (!player || !fixturesData || !bootstrapData) return [];
    const playerTeamId = player.team;
    const fixtures = fixturesData.filter(f =>
      f.event === gameweek && (f.team_h === playerTeamId || f.team_a === playerTeamId)
    );
    return fixtures.map(fixture => {
      const isHome = fixture.team_h === playerTeamId;
      const opponentId = isHome ? fixture.team_a : fixture.team_h;
      const opponentTeam = bootstrapData.teams.find(t => t.id === opponentId);
      return { opponent: opponentTeam?.short_name || 'Unknown', isHome };
    });
  };

  // Check if a player is transferred in (appears in completed transfers as inPlayerId)
  const isPlayerTransferredIn = (pick: TeamPick): boolean => {
    if (!selectedGameweek) return false;
    
    // Player is transferred in ONLY if they appear in completed transfers for this gameweek
    // Not just because they're at a different position (could be optimized/swapped)
    return completedTransfers.some(transfer => transfer.inPlayerId === pick.element);
  };

  // Get selling price - prioritize calculation from buy price (editable) over API data
  const getSellingPrice = (pick: TeamPick): number => {
    const player = getPlayerById(pick.element);
    if (!player) return 0;
    
    // Priority 1: Calculate using FPL formula if we have purchase_price (from user edit or API)
    // For every 0.2m rise (2 in API units), you get 0.1m profit (1 in API units), max 0.3m profit
    if (pick.purchase_price !== undefined && !isNaN(pick.purchase_price)) {
      const purchasePrice = pick.purchase_price;
      const currentPrice = player.now_cost;
      const priceIncrease = currentPrice - purchasePrice;
      const profitPerRise = Math.min(Math.floor(priceIncrease / 2), 3); // Cap at 3 tenths (0.3m)
      const sellingPrice = purchasePrice + profitPerRise;
      return sellingPrice / 10;
    }
    
    // Priority 2: Use selling_price from FPL API if calculation not possible
    if (pick.selling_price !== undefined && !isNaN(pick.selling_price)) {
      return pick.selling_price / 10;
    }
    
    // Final fallback to current price
    return player.now_cost / 10;
  };

  // Update sell price for a player - auto-saves to database by calculating purchase price
  const updateSellPrice = async (playerId: number, newSellPrice: number) => {
    if (!searchedId) return;
    
    const player = getPlayerById(playerId);
    if (!player) return;
    
    // Calculate purchase price from desired sell price
    // FPL formula: Sell Price = Purchase Price + floor((Current - Purchase) / 0.2) * 0.1
    // We need to reverse this: Purchase Price = Sell Price - floor((Current - Purchase) / 0.2) * 0.1
    // Simplified: Set purchase price such that it results in the desired sell price
    const currentPrice = player.now_cost;
    const newSellPriceInTenths = Math.round(newSellPrice * 10);
    
    // Calculate what purchase price would give us this sell price
    // If sell price >= current price, purchase price = sell price (no profit)
    // If sell price < current price, we calculate backwards
    let calculatedPurchasePrice: number;
    if (newSellPriceInTenths >= currentPrice) {
      calculatedPurchasePrice = newSellPriceInTenths;
    } else {
      // Work backwards: sell = purchase + floor((current - purchase) / 2)
      // Try to find purchase price that gives desired sell price
      calculatedPurchasePrice = newSellPriceInTenths;
      const profitPerRise = Math.floor((currentPrice - calculatedPurchasePrice) / 2);
      const resultingSellPrice = calculatedPurchasePrice + profitPerRise;
      
      // Adjust if needed
      if (resultingSellPrice !== newSellPriceInTenths) {
        calculatedPurchasePrice = newSellPriceInTenths;
      }
    }
    
    // Update local state immediately for responsive UI
    setManualLineup(prev => prev.map(pick => {
      if (pick.element === playerId) {
        return {
          ...pick,
          purchase_price: calculatedPurchasePrice
        };
      }
      return pick;
    }));
    setEditingSellPrice(null);
    setEditSellPriceValue("");
    
    // Auto-save to database
    try {
      const response = await fetch(`/api/manager/${searchedId}/buy-price-overrides`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: playerId,
          buyPrice: calculatedPurchasePrice // Store purchase price
        })
      });
      
      if (response.ok) {
        // Refetch overrides to ensure persistence across drafts
        await refetchBuyPriceOverrides();
        
        toast({
          title: "Sell Price Updated",
          description: `Sell price set to £${newSellPrice.toFixed(1)}m and saved`
        });
      } else {
        throw new Error("Failed to save sell price");
      }
    } catch (error) {
      console.error("Failed to save sell price:", error);
      toast({
        title: "Error",
        description: "Failed to save sell price. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Start editing sell price
  const startEditingSellPrice = (playerId: number, currentSellPrice: number) => {
    setEditingSellPrice(playerId);
    setEditSellPriceValue(currentSellPrice.toFixed(1));
  };

  // Open buy price editing dialog
  const openBuyPriceDialog = (playerId: number, currentPrice: number) => {
    setEditBuyPriceDialog({ playerId, currentPrice });
    setEditBuyPriceValue(currentPrice.toFixed(1));
  };

  // Save buy price from dialog
  const saveBuyPriceFromDialog = async () => {
    if (!editBuyPriceDialog) return;
    
    const newPrice = parseFloat(editBuyPriceValue);
    if (isNaN(newPrice) || newPrice < 0) {
      toast({ title: "Invalid Price", description: "Please enter a valid price.", variant: "destructive" });
      return;
    }

    const pick = manualLineup.find(p => p.element === editBuyPriceDialog.playerId);
    if (!pick) return;

    // Verify new sell price is valid
    const originalBuyPrice = (bootstrapData?.elements.find(e => e.id === pick.element)?.now_cost || 0) / 10;
    const maxAllowedSellPrice = originalBuyPrice;
    
    if (newPrice > maxAllowedSellPrice) {
      toast({ 
        title: "Invalid Price", 
        description: `Buy price cannot exceed original price of £${maxAllowedSellPrice.toFixed(1)}m.`, 
        variant: "destructive" 
      });
      return;
    }

    // Update the pick with the new purchase price
    const updatedPick = { ...pick, purchase_price: Math.round(newPrice * 10) };
    
    // Calculate the new sell price (capped at 0.3m profit)
    const player = getPlayerById(pick.element);
    const currentPrice = player?.now_cost || 0;
    const priceIncrease = currentPrice - updatedPick.purchase_price;
    const profitPerRise = Math.min(Math.floor(priceIncrease / 2), 3); // Cap at 3 tenths (0.3m)
    const newSellPrice = (updatedPick.purchase_price + profitPerRise) / 10;
    
    // Update manualLineup
    const newManualLineup = manualLineup.map(p => p.element === pick.element ? updatedPick : p);
    setManualLineup(newManualLineup);

    setEditBuyPriceDialog(null);
    setEditBuyPriceValue("");
    
    // Save to database to persist across drafts and page reloads
    try {
      const response = await fetch(`/api/manager/${searchedId}/buy-price-overrides`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: pick.element,
          buyPrice: updatedPick.purchase_price // Store purchase price in tenths
        })
      });
      
      if (response.ok) {
        // Refetch overrides to ensure persistence across drafts
        await refetchBuyPriceOverrides();
        
        toast({
          title: "Buy Price Updated",
          description: `Buy price set to £${newPrice.toFixed(1)}m (sell price: £${newSellPrice.toFixed(1)}m) and saved`
        });
      } else {
        throw new Error("Failed to save buy price");
      }
    } catch (error) {
      console.error("Failed to save buy price:", error);
      toast({
        title: "Error",
        description: "Failed to save buy price to database. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Cancel editing sell price
  const cancelEditingSellPrice = () => {
    setEditingSellPrice(null);
    setEditSellPriceValue("");
  };

  // Calculate bank after transfers for a specific gameweek (helper for cascading)
  const calculateBankAfterTransfersForGW = (gameweek: number, startingBank: number): number => {
    // Get completed transfers for this gameweek from savedDrafts
    const gwTransfers = gameweekTransfers[gameweek]?.completed || [];
    
    // Calculate money gained from selling players
    let moneyFromSales = 0;
    gwTransfers.forEach(transfer => {
      moneyFromSales += transfer.sellingPrice || 0;
    });
    
    // Calculate money spent on buying players
    let moneySpent = 0;
    gwTransfers.forEach(transfer => {
      moneySpent += transfer.buyingPrice || 0;
    });
    
    return startingBank + moneyFromSales - moneySpent;
  };

  // Calculate initial bank for the selected gameweek (before any transfers in that GW)
  // This cascades the bank from previous gameweeks properly
  const calculateInitialBank = (): number => {
    // Use nullish coalescing to properly handle bank value of 0
    const apiBank = teamData?.transfers?.bank;
    if (apiBank === undefined || apiBank === null || !teamData?.picks || !selectedGameweek) return 0;
    
    const nextGWs = getNextGameweeks();
    const firstGW = nextGWs[0]?.id;
    
    // For the first gameweek in the planning horizon, use the actual team bank
    if (selectedGameweek === firstGW) {
      return apiBank / 10; // Convert from API format
    }
    
    // For subsequent gameweeks, cascade the bank from previous gameweeks
    // Start with the API bank for the first planning gameweek
    let runningBank = apiBank / 10;
    
    // Iterate through each gameweek from firstGW to selectedGameweek-1
    // and apply each gameweek's transfers to calculate the cascading bank
    for (let gw = firstGW; gw < selectedGameweek; gw++) {
      runningBank = calculateBankAfterTransfersForGW(gw, runningBank);
    }
    
    console.log(`🏦 CASCADING BANK DEBUG - GW${selectedGameweek}:`);
    console.log(`  API bank: ${apiBank} (£${(apiBank / 10).toFixed(1)}m)`);
    console.log(`  First GW: ${firstGW}, Selected GW: ${selectedGameweek}`);
    console.log(`  Cascaded initial bank: £${runningBank.toFixed(1)}m`);
    
    return runningBank;
  };

  // Calculate bank after transfers for the selected gameweek
  const calculateBankAfterTransfers = (): number => {
    if (!teamData?.picks || !selectedGameweek) return 0;
    
    const initialBank = calculateInitialBank();
    
    // Get the baseline lineup for this gameweek (what the lineup would be without current GW's transfers)
    const baseline = getBaselineLineup(selectedGameweek);
    
    // Get completed transfers for this gameweek
    const currentGwTransfers = gameweekTransfers[selectedGameweek]?.completed || [];
    
    // Calculate money gained from selling players (completed transfers)
    let moneyFromSales = 0;
    currentGwTransfers.forEach(transfer => {
      moneyFromSales += transfer.sellingPrice || 0;
    });
    
    // Calculate money spent on buying players (completed transfers)
    let moneySpent = 0;
    currentGwTransfers.forEach(transfer => {
      moneySpent += transfer.buyingPrice || 0;
    });
    
    // Also add money from partial transfers (players marked as transferred out but not yet replaced)
    const partialTransfers = manualLineup.filter(p => p.is_transferred_out);
    console.log("🔍 PARTIAL TRANSFER DEBUG:");
    console.log("  Manual lineup:", manualLineup.map(p => ({ id: p.element, out: p.is_transferred_out, pp: p.purchase_price })));
    console.log("  Partial transfers found:", partialTransfers.length);
    partialTransfers.forEach(transferredOutPick => {
      const sellingPrice = getSellingPrice(transferredOutPick);
      console.log(`  Partial transfer: Player ${transferredOutPick.element}, purchase_price: ${transferredOutPick.purchase_price}, selling price: ${sellingPrice.toFixed(1)}`);
      moneyFromSales += sellingPrice;
    });
    
    // Cash after transfers = Initial bank + Money from sales - Money spent
    const cashAfterTransfers = initialBank + moneyFromSales - moneySpent;
    
    console.log("💰 CASH CALCULATION DEBUG:");
    console.log("  Initial bank:", initialBank.toFixed(1));
    console.log("  Money from completed sales:", currentGwTransfers.reduce((sum, t) => sum + (t.sellingPrice || 0), 0).toFixed(1));
    console.log("  Money from partial sales:", partialTransfers.reduce((sum, p) => sum + getSellingPrice(p), 0).toFixed(1));
    console.log("  Total money from sales:", moneyFromSales.toFixed(1));
    console.log("  Money spent:", moneySpent.toFixed(1));
    console.log("  Cash after transfers:", cashAfterTransfers.toFixed(1));
    
    return cashAfterTransfers;
  };

  // Calculate current bank based on initial bank and completed transfers (DEPRECATED - use calculateBankAfterTransfers)
  const calculateCurrentBank = (): number => {
    return calculateBankAfterTransfers();
  };

  // Calculate transfers used for a specific gameweek by checking saved transfers
  const calculateTransfersUsedForGameweek = (gameweek: number): number => {
    if (!teamData?.picks) return 0;
    
    // For currently selected gameweek, use the in-memory manualLineup comparison
    if (gameweek === selectedGameweek) {
      const baseline = getBaselineLineup(gameweek);
      const baselinePlayerIds = new Set(baseline.map(p => p.element));
      
      let transfersOut = 0;
      baseline.forEach((baselinePick) => {
        const stillInLineup = manualLineup.find(p => p.element === baselinePick.element);
        if (!stillInLineup) {
          transfersOut++;
        }
      });
      
      let transfersIn = 0;
      manualLineup.filter(p => !p.is_transferred_out).forEach((currentPick) => {
        if (!baselinePlayerIds.has(currentPick.element)) {
          transfersIn++;
        }
      });
      
      const transfersUsed = Math.max(transfersOut, transfersIn);
      
      console.log("📊 TRANSFERS USED DEBUG:");
      console.log("  Baseline player IDs:", Array.from(baselinePlayerIds));
      console.log("  Current lineup player IDs:", manualLineup.map(p => ({ id: p.element, out: p.is_transferred_out })));
      console.log("  Transfers out (completed):", transfersOut, "| Transfers in:", transfersIn);
      console.log("  Transfers used:", transfersUsed);
      
      return transfersUsed;
    }
    
    // For other gameweeks, check saved transfers in the active draft
    const draft = savedDrafts.find(d => d.draftLetter === activeDraft);
    const savedTransfers = draft?.transfers || [];
    const transfersForGW = savedTransfers.filter(t => t.gameweek === gameweek && t.completed);
    return transfersForGW.length;
  };

  // Calculate actual transfers used by comparing with baseline lineup for this gameweek
  const calculateTransfersUsed = (): number => {
    if (!teamData?.picks || !selectedGameweek || !bootstrapData) return 0;
    
    // Get current gameweek and the first planning gameweek
    const currentEvent = bootstrapData.events.find(e => e.is_current);
    const currentGW = currentEvent?.id || 1;
    const firstPlanningGW = currentGW + 1;
    
    // For the first planning gameweek when using own team, include FPL API transfers.made
    // This represents transfers already confirmed on the FPL website
    if (isOwnTeam && selectedGameweek === firstPlanningGW && teamData.transfers?.made !== undefined) {
      const fplApiTransfers = teamData.transfers.made;
      const plannerTransfers = calculateTransfersUsedForGameweek(selectedGameweek);
      console.log(`📊 TRANSFERS USED - FPL API: ${fplApiTransfers}, Planner: ${plannerTransfers}`);
      return fplApiTransfers + plannerTransfers;
    }
    
    return calculateTransfersUsedForGameweek(selectedGameweek);
  };

  // Calculate initial transfers available for a given gameweek (cumulative logic)
  const calculateInitialTransfers = (): number | string => {
    if (!teamData?.transfers || !selectedGameweek || !bootstrapData) return 0;
    
    // Check if Free Hit is active for this gameweek
    const isFreeHitActive = plannedChips[selectedGameweek] === 'freehit';
    if (isFreeHitActive) {
      return '∞'; // Unlimited transfers with Free Hit
    }
    
    // Check if Wildcard is active for this gameweek
    const isWildcardActive = plannedChips[selectedGameweek] === 'wildcard';
    if (isWildcardActive) {
      return '∞'; // Unlimited transfers with Wildcard
    }
    
    // Get current gameweek and the first planning gameweek
    const currentEvent = bootstrapData.events.find(e => e.is_current);
    const currentGW = currentEvent?.id || 1;
    const firstPlanningGW = currentGW + 1;
    
    // When using authenticated my-team endpoint for the first planning GW, 
    // trust the FPL API's transfer limit directly (it knows the correct value)
    console.log(`🔍 FT CONDITION DEBUG - isOwnTeam=${isOwnTeam}, selectedGW=${selectedGameweek}, firstPlanningGW=${firstPlanningGW}, limit=${teamData.transfers.limit}`);
    
    // For the first planning gameweek when using own team data, use API limit
    if (isOwnTeam && selectedGameweek === firstPlanningGW && teamData.transfers.limit !== undefined) {
      console.log(`✅ FT DEBUG - Using FPL API limit for GW ${firstPlanningGW}:`, teamData.transfers.limit);
      return teamData.transfers.limit;
    }
    
    // Calculate initial FTs - if we have API data for first planning GW, use that as starting point
    // Otherwise fall back to historical calculation
    let currentInitial = 1; // Start with base 1 FT
    
    // If we have API data for the first planning GW, use that as the starting point for banking forward
    if (isOwnTeam && teamData.transfers.limit !== undefined) {
      currentInitial = teamData.transfers.limit;
      console.log(`✅ Using API limit (${currentInitial}) as starting point for banking calculation`);
    } else if (bootstrapData && historyData?.current && historyData.current.length > 0) {
      // Calculate from history using forward simulation (mirroring backend logic)
      // Start with 1 FT and simulate forward through each finished gameweek
      let runningFTs = 1;
      
      // Get all finished gameweeks in chronological order
      const finishedHistory = historyData.current
        .filter((h: any) => {
          const gwData = bootstrapData.events.find((e: any) => e.id === h.event);
          return gwData?.finished === true;
        })
        .sort((a: any, b: any) => a.event - b.event);
      
      console.log(`📊 FORWARD SIMULATION: Starting with 1 FT, simulating through ${finishedHistory.length} finished GWs`);
      
      for (const gw of finishedHistory) {
        const gwEvent = gw.event;
        const transfersMade = gw.event_transfers || 0;
        
        // Check if a chip was used in this gameweek
        const chipUsed = historyData.chips?.find((c: any) => c.event === gwEvent);
        const isWildcard = chipUsed?.name === 'wildcard';
        const isFreeHit = chipUsed?.name === 'freehit';
        
        // Subtract transfers used first (clamped to >= 0)
        const remaining = Math.max(0, runningFTs - transfersMade);
        
        if (isWildcard || isFreeHit) {
          // Wildcard or Free Hit: Keep banked FTs but don't add +1 for this gameweek
          const cap = gwEvent === 15 ? 5 : 2; // AFCON cap
          runningFTs = Math.min(cap, remaining);
          console.log(`  GW${gwEvent}: ${isWildcard ? 'Wildcard' : 'Free Hit'} used → Bank carries through at ${remaining} FTs (capped to ${runningFTs})`);
        } else {
          // Normal banking: add +1 and clamp to cap (2 for normal, 5 for AFCON)
          const cap = gwEvent === 15 ? 5 : 2; // AFCON gives 5 FT cap at GW16, calculated at end of GW15
          runningFTs = Math.max(1, Math.min(cap, remaining + 1));
          console.log(`  GW${gwEvent}: Had ${runningFTs - 1 + transfersMade} FTs, used ${transfersMade}, remaining ${remaining}, next GW gets ${remaining}+1=${remaining + 1}, capped to ${runningFTs} (cap: ${cap})`);
        }
      }
      
      currentInitial = runningFTs;
      console.log(`✅ FORWARD SIMULATION RESULT: ${currentInitial} FTs for GW ${firstPlanningGW}`);
    }
    
    // If firstPlanningGW > 16, simulate banking from GW16 through intervening gameweeks
    // using ACTUAL historical transfer data to get the correct starting FTs
    if (firstPlanningGW > 16 && historyData?.current) {
      // Start with 5 FTs at GW16 (AFCON top-up)
      let runningFTs = 5;
      
      // Simulate banking from GW16 to firstPlanningGW using historical data
      for (let gw = 16; gw < firstPlanningGW; gw++) {
        // Check if any chip was used in this gameweek
        const chipUsedThisGW = historyData.chips?.find((c: any) => c.event === gw);
        const isFreeHitGW = chipUsedThisGW?.name === 'freehit';
        const isWildcardGW = chipUsedThisGW?.name === 'wildcard';
        
        if (isFreeHitGW) {
          // Free Hit: FTs remain unchanged (no +1 banking for chip weeks)
          continue;
        } else if (isWildcardGW) {
          // Wildcard: FTs reset to 1 for next gameweek
          runningFTs = 1;
        } else {
          // Normal banking: get actual transfers from history
          const gwHistory = historyData.current.find((h: any) => h.event === gw);
          const transfersUsed = gwHistory?.event_transfers || 0;
          
          // Apply banking logic
          const remaining = runningFTs - transfersUsed;
          runningFTs = Math.max(1, Math.min(5, 1 + remaining));
        }
      }
      
      currentInitial = runningFTs;
    }
    
    // Early return if we're viewing the first planning gameweek
    if (selectedGameweek === firstPlanningGW) {
      // Special case: if first planning GW is 16, apply AFCON top-up
      if (firstPlanningGW === 16) {
        return 5;
      }
      console.log(`🔍 FT DEBUG - GW ${firstPlanningGW} initial FTs from calculation:`, currentInitial);
      return currentInitial;
    }
    
    // For subsequent gameweeks: loop through and apply banking logic
    console.log(`🔄 FT BANKING LOOP - Selected GW: ${selectedGameweek}, First Planning GW: ${firstPlanningGW}, Starting with ${currentInitial} FTs`);
    for (let gw = firstPlanningGW; gw < selectedGameweek; gw++) {
      const nextGW = gw + 1;
      console.log(`  ➡️ Processing GW ${gw} (next will be GW ${nextGW}), current FTs: ${currentInitial}`);
      
      // SPECIAL CASE: GW16 AFCON Free Transfer Top-Up (2024/25 season only)
      // All managers get 5 free transfers in GW16 regardless of previous banking
      if (nextGW === 16) {
        console.log(`  🎁 AFCON TOP-UP: GW ${nextGW} gets 5 FTs`);
        currentInitial = 5;
        continue;
      }
      
      // Check for chips that affect transfer banking
      const isFreeHitGW = plannedChips[gw] === 'freehit';
      const isWildcardGW = plannedChips[gw] === 'wildcard';
      
      // Get transfers used in this gameweek
      const used = calculateTransfersUsedForGameweek(gw);
      // Calculate what's left after using transfers (clamped to >= 0)
      const remaining = Math.max(0, currentInitial - used);
      
      if (isFreeHitGW || isWildcardGW) {
        // Free Hit or Wildcard: Keep banked FTs but don't add +1 for this gameweek
        currentInitial = Math.min(5, remaining);
        console.log(`  🎯 CHIP USED in GW ${gw}: ${isFreeHitGW ? 'Free Hit' : 'Wildcard'} - Bank carries through at ${remaining} FTs (capped to ${currentInitial})`);
      } else {
        // Normal banking logic:
        // Next gameweek gets automatic +1 FT plus any remaining (banked)
        const nextGWInitial = remaining + 1;
        // Cap between 1 and 5 FTs
        const newInitial = Math.max(1, Math.min(5, nextGWInitial));
        console.log(`  📊 GW ${gw}: started with ${currentInitial} FTs, used ${used}, remaining ${remaining}, next GW gets ${remaining}+1=${nextGWInitial}, capped to ${newInitial}`);
        currentInitial = newInitial;
      }
    }
    
    console.log(`🔍 FT DEBUG - Final FTs for GW ${selectedGameweek}:`, currentInitial);
    return currentInitial;
  };

  // Calculate transfers remaining (initial - used, can be negative)
  const calculateTransfersRemaining = (): number | string => {
    const initial = calculateInitialTransfers();
    const used = calculateTransfersUsed();
    
    // If initial is infinite (Free Hit or Wildcard), remaining is also infinite
    if (initial === '∞') {
      return '∞';
    }
    
    return (initial as number) - used;
  };

  // ===== DRAFT COMPARISON HELPERS =====
  
  // Get squad at a specific gameweek for a given draft (after applying cumulative transfers)
  const getSquadAtGameweek = (draftTransfers: Record<number, { transferredOut: any[], completed: any[] }>, targetGW: number): TeamPick[] => {
    if (!teamData?.picks) return [];
    
    let squad = normalizePickMultipliers([...teamData.picks]);
    const nextGWs = getNextGameweeks();
    
    // Track Free Hit gameweeks to handle squad reversion
    const freeHitGameweeks = new Set<number>();
    nextGWs.forEach(gw => {
      if (gw.id <= targetGW && plannedChips[gw.id] === 'freehit') {
        freeHitGameweeks.add(gw.id);
      }
    });
    
    // Apply all completed transfers from first planning GW up to and including targetGW
    nextGWs.forEach(gw => {
      if (gw.id <= targetGW) {
        const isFreeHitGW = freeHitGameweeks.has(gw.id);
        
        // For Free Hit gameweeks:
        // - If we're viewing the Free Hit GW itself (gw.id === targetGW), apply transfers temporarily
        // - If we're viewing a later GW, skip this Free Hit GW entirely (don't apply transfers)
        if (isFreeHitGW && gw.id !== targetGW) {
          // Skip Free Hit transfers when viewing future gameweeks
          return;
        }
        
        // Apply transfers for this gameweek
        const gwTransfers = draftTransfers[gw.id] || draftTransfers[gw.id.toString() as any];
        
        if (gwTransfers?.completed) {
          // Only apply valid transfers where the out player exists in current squad
          const validTransfers = gwTransfers.completed.filter(transfer => 
            squad.some(pick => pick.element === transfer.outPlayerId)
          );
          
          validTransfers.forEach(transfer => {
            squad = squad.map(pick => {
              if (pick.element === transfer.outPlayerId) {
                const inPlayer = getPlayerById(transfer.inPlayerId);
                if (inPlayer) {
                  return {
                    ...pick,
                    element: transfer.inPlayerId,
                    selling_price: inPlayer.now_cost,
                    purchase_price: inPlayer.now_cost,
                  };
                }
              }
              return pick;
            });
          });
        }
      }
    });
    
    return squad;
  };

  // Calculate manual mode points for a draft at a specific gameweek
  const calculateManualPointsForGameweek = (squad: TeamPick[], gameweek: number, projections6GW: any[], chipForGameweek?: ChipType | null): number => {
    if (!projections6GW || !Array.isArray(projections6GW)) return 0;
    
    const isBenchBoostActive = chipForGameweek === 'bboost';
    const isTripleCaptainActive = chipForGameweek === '3xc';
    
    // With Bench Boost, all 15 players score. Otherwise just starting 11
    const activePlayers = isBenchBoostActive 
      ? squad 
      : squad.filter(pick => pick.position <= 11);
    
    let totalPoints = 0;
    activePlayers.forEach(pick => {
      const projection = projections6GW.find((p: any) => p.playerId === pick.element);
      const gwPoints = projection?.gameweekProjections?.[gameweek.toString()] || 0;
      
      // Captain gets 2x normally, 3x with Triple Captain (no multiplier for bench players even with Bench Boost)
      const multiplier = pick.is_captain ? (isTripleCaptainActive ? 3 : 2) : 1;
      totalPoints += gwPoints * multiplier;
    });
    
    return totalPoints;
  };


  // Compute a canonical signature for a draft to detect duplicates
  // Signature includes: squad composition at each GW, captain/vice, transfers, and planned chips
  const computeDraftSignature = (draftTransfers: any, nextGWs: any[], draftChips?: PlannedChips) => {
    const signature: any = {
      gameweeks: {}
    };
    
    nextGWs.forEach(gw => {
      const squad = getSquadAtGameweek(draftTransfers, gw.id);
      // Sort squad by element ID for consistent comparison
      const sortedSquad = squad
        .map(pick => ({
          element: pick.element,
          position: pick.position,
          multiplier: pick.multiplier,
          is_captain: pick.is_captain,
          is_vice_captain: pick.is_vice_captain
        }))
        .sort((a, b) => a.element - b.element);
      
      signature.gameweeks[gw.id] = sortedSquad;
    });
    
    // Include transfers for each gameweek in signature
    // Only use COMPLETED and VALID transfers - ignore invalid transfers that shouldn't exist
    signature.transfers = {};
    nextGWs.forEach(gw => {
      const gwTransfers = draftTransfers[gw.id] || { completed: [] };
      
      // Get the squad BEFORE this gameweek's transfers to validate
      const firstPlanningGW = nextGWs.length > 0 ? nextGWs[0].id : 999;
      const squadBeforeTransfers = gw.id === firstPlanningGW 
        ? (teamData?.picks || [])
        : getSquadAtGameweek(draftTransfers, gw.id - 1);
      const squadPlayerIds = new Set(squadBeforeTransfers.map(p => p.element));
      
      // Only include valid transfers where the out player exists in the squad
      const validTransfers = gwTransfers.completed.filter((transfer: any) => 
        squadPlayerIds.has(transfer.outPlayerId)
      );
      
      signature.transfers[gw.id] = {
        completed: [...validTransfers].sort((a, b) => {
          if (a.outPlayerId !== b.outPlayerId) return a.outPlayerId - b.outPlayerId;
          return a.inPlayerId - b.inPlayerId;
        })
      };
    });
    
    // Include planned chips in signature
    signature.chips = {};
    nextGWs.forEach(gw => {
      const chipForGw = draftChips?.[gw.id] || null;
      signature.chips[gw.id] = chipForGw;
    });
    
    return JSON.stringify(signature);
  };

  // Identify duplicate drafts by comparing signatures (excludes Base draft)
  const identifyDuplicateDrafts = () => {
    const nextGWs = getNextGameweeks();
    if (nextGWs.length === 0) return {};
    
    // Map to store signature -> earliest draft with that signature
    const signatureMap = new Map<string, string>();
    const duplicates: Record<string, { isDuplicate: boolean; duplicateOfKey: string }> = {};
    
    // Array of saved drafts only (Base is excluded from comparison)
    const allDrafts = savedDrafts.map((draft: any) => ({
      draftKey: draft.draftLetter,
      // Always use the saved gameweekTransfers from the draft object for accurate comparison
      transfers: draft.gameweekTransfers || {},
      chips: draft.plannedChips || {}
    }));
    
    // Debug: Log chip data for each draft
    console.log('🔍 DUPLICATE DETECTION DEBUG:');
    allDrafts.forEach(draft => {
      console.log(`Draft ${draft.draftKey} chips:`, JSON.stringify(draft.chips));
    });
    
    // Process each draft
    allDrafts.forEach(draft => {
      const signature = computeDraftSignature(draft.transfers, nextGWs, draft.chips);
      console.log(`Draft ${draft.draftKey} signature length:`, signature.length);
      
      if (signatureMap.has(signature)) {
        // This is a duplicate
        const originalKey = signatureMap.get(signature)!;
        console.log(`✅ Draft ${draft.draftKey} is DUPLICATE of ${originalKey}`);
        duplicates[draft.draftKey] = {
          isDuplicate: true,
          duplicateOfKey: originalKey
        };
      } else {
        // First draft with this signature
        signatureMap.set(signature, draft.draftKey);
        console.log(`📝 Draft ${draft.draftKey} is UNIQUE`);
        duplicates[draft.draftKey] = {
          isDuplicate: false,
          duplicateOfKey: ''
        };
      }
    });
    
    return duplicates;
  };

  // Build comparison data for all drafts (excludes Base draft)
  const buildDraftComparisonData = () => {
    if (!teamData?.picks || !playerProjections6GW) return [];
    
    const nextGWs = getNextGameweeks();
    if (nextGWs.length === 0) return [];
    
    const comparisonRows: any[] = [];
    
    // All saved drafts
    savedDrafts.forEach(draft => {
      // Always use the saved gameweekTransfers from database for accurate comparison
      // This ensures each draft shows its own saved transfers, not mixed with current editing state
      const draftTransfers = draft.gameweekTransfers || {};
      const draftChips = draft.plannedChips || {};
      
      // Draft row
      const draftRow = {
        draftKey: draft.draftLetter,
        mode: 'Team Selection',
        gameweeks: {} as Record<number, number>,
        total: 0
      };
      
      nextGWs.forEach(gw => {
        let squad = getSquadAtGameweek(draftTransfers, gw.id);
        
        // Apply captain info from draft
        if (draft.captainPlayerId || draft.viceCaptainPlayerId) {
          squad = squad.map(pick => ({
            ...pick,
            is_captain: pick.element === draft.captainPlayerId,
            is_vice_captain: pick.element === draft.viceCaptainPlayerId
          }));
        }
        
        const chipForGW = draftChips[gw.id] || draftChips[gw.id.toString()] || null;
        const points = calculateManualPointsForGameweek(squad, gw.id, playerProjections6GW, chipForGW);
        draftRow.gameweeks[gw.id] = points;
        draftRow.total += points;
      });
      comparisonRows.push(draftRow);
    });
    
    return comparisonRows;
  };

  // Swap a starting 11 player with a bench player
  const swapPlayers = (startingIndex: number, benchIndex: number) => {
    // Check if we can create a draft
    const targetDraft = getTargetDraftForChanges();
    if (!targetDraft) return;
    
    const wasInBase = activeDraft === "Base";
    
    const startingPick = manualLineup[startingIndex];
    const benchPick = manualLineup[11 + benchIndex];
    
    const startingPlayer = getPlayerById(startingPick.element);
    const benchPlayer = getPlayerById(benchPick.element);
    
    if (!startingPlayer || !benchPlayer) return;
    
    // Rule 1: Goalkeeper can only be substituted for goalkeeper
    if (startingPlayer.element_type === 1 && benchPlayer.element_type !== 1) {
      toast({
        title: "Invalid Substitution",
        description: "Goalkeeper can only be substituted for another goalkeeper",
        variant: "destructive"
      });
      return;
    }
    
    if (benchPlayer.element_type === 1 && startingPlayer.element_type !== 1) {
      toast({
        title: "Invalid Substitution",
        description: "Goalkeeper can only be substituted for another goalkeeper",
        variant: "destructive"
      });
      return;
    }
    
    // Rule 2: Check if swap would violate minimum defender rule (3 defenders)
    if (startingPlayer.element_type === 2 && benchPlayer.element_type !== 2) {
      // Removing a defender from starting 11
      const starting11 = manualLineup.slice(0, 11);
      const defendersInStarting = starting11.filter(pick => {
        const p = getPlayerById(pick.element);
        return p?.element_type === 2;
      }).length;
      
      if (defendersInStarting <= 3) {
        toast({
          title: "Invalid Substitution",
          description: "Starting 11 must have at least 3 defenders",
          variant: "destructive"
        });
        return;
      }
    }
    
    // Perform the swap
    const newLineup = [...manualLineup];
    const temp = newLineup[startingIndex];
    newLineup[startingIndex] = newLineup[11 + benchIndex];
    newLineup[11 + benchIndex] = temp;
    
    // Update positions
    newLineup[startingIndex].position = startingIndex + 1;
    newLineup[11 + benchIndex].position = 11 + benchIndex + 1;
    
    // Handle captain/vice captain transfers
    const wasCaptain = temp.is_captain;
    const wasViceCaptain = temp.is_vice_captain;
    
    const isTC = selectedGameweek ? plannedChips[selectedGameweek] === '3xc' : false;
    const capMultiplier = isTC ? 3 : 2;
    
    if (wasCaptain) {
      // Starting player was captain - current vice captain becomes captain, new player becomes vice captain
      const currentViceCaptain = newLineup.find(p => p.is_vice_captain);
      
      newLineup.forEach((pick, index) => {
        if (index === startingIndex) {
          newLineup[index] = { ...pick, is_vice_captain: true, is_captain: false, multiplier: 1 };
        } else if (currentViceCaptain && pick.element === currentViceCaptain.element) {
          newLineup[index] = { ...pick, is_captain: true, is_vice_captain: false, multiplier: capMultiplier };
        } else if (index === 11 + benchIndex) {
          newLineup[index] = { ...pick, is_captain: false, is_vice_captain: false, multiplier: 0 };
        }
      });
    } else if (wasViceCaptain) {
      newLineup[startingIndex] = { ...newLineup[startingIndex], is_vice_captain: true, is_captain: false, multiplier: 1 };
      newLineup[11 + benchIndex] = { ...newLineup[11 + benchIndex], is_vice_captain: false, is_captain: false, multiplier: 0 };
    } else {
      newLineup[startingIndex] = { ...newLineup[startingIndex], is_captain: false, is_vice_captain: false, multiplier: 1 };
      newLineup[11 + benchIndex] = { ...newLineup[11 + benchIndex], is_captain: false, is_vice_captain: false, multiplier: 0 };
    }
    
    setManualLineup(newLineup);
    
    // Save the swapped lineup to persist it, but DON'T mark as optimized (it's a manual change)
    if (selectedGameweek) {
      const optimizationKey = getOptimizationKey(activeDraft, selectedGameweek);
      // Clear the optimization flag since this is a manual change
      delete isLineupOptimizedRef.current[optimizationKey];
      
      // Save the swapped lineup to optimizedLineups state for persistence (deep clone)
      setOptimizedLineups(prev => ({
        ...prev,
        [selectedGameweek]: JSON.parse(JSON.stringify(newLineup))
      }));
    }
    
    // Show detailed swap confirmation (bench priority excludes GK, so subtract 1)
    const newStartingPlayer = getPlayerById(newLineup[startingIndex].element)?.web_name;
    const newBenchPlayer = getPlayerById(newLineup[11 + benchIndex].element)?.web_name;
    const benchPriority = benchIndex; // Outfield bench priority (1, 2, 3)
    
    let extraInfo = '';
    if (wasCaptain) {
      const newCaptain = newLineup.find(p => p.is_captain);
      const newCaptainName = newCaptain ? getPlayerById(newCaptain.element)?.web_name : '';
      extraInfo = ` ${newCaptainName} is now captain and ${newStartingPlayer} is now vice captain.`;
    } else if (wasViceCaptain) {
      extraInfo = ` ${newStartingPlayer} is now vice captain.`;
    }
    
    toast({
      title: "Players Switched",
      description: `${newStartingPlayer} has been moved to Starting 11, instead of ${newBenchPlayer} who is now in bench position ${benchPriority}.${extraInfo}`
    });
    
    if (wasInBase) {
      setTimeout(() => finalizeNewDraft(targetDraft), 100);
    } else {
      setHasUnsavedChanges(true);
    }
  };

  // Move bench player up or down (excluding GK)
  const moveBenchPlayer = (benchIndex: number, direction: 'up' | 'down') => {
    console.log(`🔄 moveBenchPlayer called: benchIndex=${benchIndex}, direction=${direction}`);
    
    const targetDraft = getTargetDraftForChanges();
    if (!targetDraft) {
      console.log('❌ moveBenchPlayer: No target draft available');
      return;
    }
    
    const wasInBase = activeDraft === "Base";
    
    if (benchIndex === 0) {
      console.log('❌ moveBenchPlayer: Cannot move GK (benchIndex=0)');
      return;
    }
    
    const actualIndex = 11 + benchIndex;
    const swapIndex = direction === 'up' ? actualIndex - 1 : actualIndex + 1;
    
    console.log(`🔄 moveBenchPlayer: actualIndex=${actualIndex}, swapIndex=${swapIndex}`);
    
    if (swapIndex === 11 || swapIndex > 14) {
      console.log(`❌ moveBenchPlayer: swapIndex ${swapIndex} out of range`);
      return;
    }
    
    const newLineup = [...manualLineup];
    const movedPlayer = newLineup[actualIndex];
    const swappedPlayer = newLineup[swapIndex];
    newLineup[actualIndex] = swappedPlayer;
    newLineup[swapIndex] = movedPlayer;
    
    // Update positions
    newLineup[actualIndex].position = actualIndex + 1;
    newLineup[swapIndex].position = swapIndex + 1;
    
    setManualLineup(newLineup);
    
    // Save the updated lineup to persist it, but DON'T mark as optimized (it's a manual change)
    if (selectedGameweek) {
      const optimizationKey = getOptimizationKey(activeDraft, selectedGameweek);
      // Clear the optimization flag since this is a manual change
      delete isLineupOptimizedRef.current[optimizationKey];
      
      // Save the updated lineup to optimizedLineups state for persistence (deep clone)
      setOptimizedLineups(prev => ({
        ...prev,
        [selectedGameweek]: JSON.parse(JSON.stringify(newLineup))
      }));
    }
    
    // Show confirmation toast with both players (bench priority excludes GK, so subtract 1)
    const movedPlayerName = getPlayerById(movedPlayer.element)?.web_name;
    const swappedPlayerName = getPlayerById(swappedPlayer.element)?.web_name;
    const movedPlayerNewPriority = swapIndex - 11; // Outfield bench priority (1, 2, 3)
    const swappedPlayerNewPriority = actualIndex - 11; // Outfield bench priority (1, 2, 3)
    
    toast({
      title: "Bench Priority Changed",
      description: `Bench priority of ${movedPlayerName} has been moved ${direction === 'up' ? 'up' : 'down'} to ${movedPlayerNewPriority}, and bench priority of ${swappedPlayerName} has been moved ${direction === 'up' ? 'down' : 'up'} to ${swappedPlayerNewPriority}`
    });
    
    if (wasInBase) {
      setTimeout(() => finalizeNewDraft(targetDraft), 100);
    } else {
      setHasUnsavedChanges(true);
    }
  };

  // Optimize team lineup for a specific gameweek
  const optimizeTeamLineup = (gameweek: number) => {
    console.log("🔧 OPTIMIZE CALLED - GW:", gameweek);
    console.log("🔧 playerProjections6GW:", playerProjections6GW ? `${playerProjections6GW.length} players` : "NULL");
    console.log("🔧 bootstrapData:", bootstrapData ? "LOADED" : "NULL");
    console.log("🔧 manualLineup:", manualLineup.length);
    
    if (!playerProjections6GW || !bootstrapData || manualLineup.length === 0) {
      toast({
        title: "Cannot Optimize",
        description: `Missing data: ${!playerProjections6GW ? 'Projections' : ''} ${!bootstrapData ? 'Bootstrap' : ''} ${manualLineup.length === 0 ? 'Lineup' : ''}`,
        variant: "destructive"
      });
      return;
    }

    // Check if we can create a draft
    const targetDraft = getTargetDraftForChanges();
    if (!targetDraft) return;
    
    const wasInBase = activeDraft === "Base";

    const getProjectedPoints = (playerId: number): number => {
      const projection = playerProjections6GW.find((p: any) => p.playerId === playerId);
      return projection?.gameweekProjections?.[gameweek.toString()] || 0;
    };

    // Group players by position
    const squadByPosition: {
      GKP: TeamPick[];
      DEF: TeamPick[];
      MID: TeamPick[];
      FWD: TeamPick[];
    } = {
      GKP: [],
      DEF: [],
      MID: [],
      FWD: []
    };

    manualLineup.forEach(pick => {
      const player = getPlayerById(pick.element);
      if (!player) return;
      
      const positionType = player.element_type;
      const posKey = positionType === 1 ? 'GKP' : positionType === 2 ? 'DEF' : positionType === 3 ? 'MID' : 'FWD';
      squadByPosition[posKey].push({
        ...pick,
        projectedPoints: getProjectedPoints(pick.element)
      } as any);
    });

    // Sort each position by projected points (descending)
    Object.keys(squadByPosition).forEach(pos => {
      squadByPosition[pos as keyof typeof squadByPosition].sort((a: any, b: any) => b.projectedPoints - a.projectedPoints);
    });

    // Select best starting 11 using valid FPL formations (min 3 DEF, 2 MID, 1 FWD)
    const formations = [
      { def: 3, mid: 5, fwd: 2, name: '3-5-2' },
      { def: 3, mid: 4, fwd: 3, name: '3-4-3' },
      { def: 4, mid: 5, fwd: 1, name: '4-5-1' },
      { def: 4, mid: 4, fwd: 2, name: '4-4-2' },
      { def: 4, mid: 3, fwd: 3, name: '4-3-3' },
      { def: 5, mid: 4, fwd: 1, name: '5-4-1' },
      { def: 5, mid: 3, fwd: 2, name: '5-3-2' },
      { def: 5, mid: 2, fwd: 3, name: '5-2-3' }
    ];

    let bestFormation = null;
    let bestPoints = -1;
    let bestStarting11: TeamPick[] = [];

    formations.forEach(formation => {
      if (squadByPosition.DEF.length < formation.def || 
          squadByPosition.MID.length < formation.mid || 
          squadByPosition.FWD.length < formation.fwd) {
        return; // Skip if we don't have enough players for this formation
      }

      const starting11 = [
        squadByPosition.GKP[0], // Best GK
        ...squadByPosition.DEF.slice(0, formation.def),
        ...squadByPosition.MID.slice(0, formation.mid),
        ...squadByPosition.FWD.slice(0, formation.fwd)
      ];

      const totalPoints = starting11.reduce((sum, pick: any) => sum + (pick.projectedPoints || 0), 0);

      if (totalPoints > bestPoints) {
        bestPoints = totalPoints;
        bestFormation = formation;
        bestStarting11 = starting11;
      }
    });

    if (!bestFormation || bestStarting11.length === 0) {
      toast({
        title: "Optimization Failed",
        description: "Could not find a valid formation for your squad",
        variant: "destructive"
      });
      return;
    }

    // Build bench (remaining players)
    const startingPlayerIds = new Set(bestStarting11.map(p => p.element));
    const bench = manualLineup
      .filter(pick => !startingPlayerIds.has(pick.element))
      .map(pick => ({
        ...pick,
        projectedPoints: getProjectedPoints(pick.element)
      } as any))
      .sort((a: any, b: any) => {
        // Sort bench: GK first, then by projected points
        const aPlayer = getPlayerById(a.element);
        const bPlayer = getPlayerById(b.element);
        if (aPlayer?.element_type === 1) return -1;
        if (bPlayer?.element_type === 1) return 1;
        return b.projectedPoints - a.projectedPoints;
      });

    // Assign positions
    const optimizedLineup = [
      ...bestStarting11.map((pick, index) => ({
        ...pick,
        position: index + 1,
        is_captain: false,
        is_vice_captain: false,
        multiplier: 1
      })),
      ...bench.map((pick, index) => ({
        ...pick,
        position: 12 + index,
        is_captain: false,
        is_vice_captain: false,
        multiplier: 0
      }))
    ];

    // Set captain (highest projected points in starting 11)
    const isTripleCaptainActive = selectedGameweek ? plannedChips[selectedGameweek] === '3xc' : false;
    const captainMultiplier = isTripleCaptainActive ? 3 : 2;
    
    const sortedByPoints = bestStarting11
      .map((pick: any, index) => ({ pick, index, points: pick.projectedPoints || 0 }))
      .sort((a, b) => b.points - a.points);

    if (sortedByPoints.length > 0) {
      optimizedLineup[sortedByPoints[0].index].is_captain = true;
      optimizedLineup[sortedByPoints[0].index].multiplier = captainMultiplier;
    }

    if (sortedByPoints.length > 1) {
      optimizedLineup[sortedByPoints[1].index].is_vice_captain = true;
    }

    // Apply optimized lineup
    console.log("🔧 OPTIMIZE DEBUG: Setting new lineup with positions:", optimizedLineup.map(p => ({ element: p.element, position: p.position, is_captain: p.is_captain })));
    
    // Mark this gameweek+draft's lineup as manually optimized to prevent auto-reset
    // CRITICAL: Set this BEFORE setManualLineup to prevent race conditions
    const optimizationKey = getOptimizationKey(activeDraft, gameweek);
    isLineupOptimizedRef.current = {
      ...isLineupOptimizedRef.current,
      [optimizationKey]: true
    };
    
    console.log("🔧 OPTIMIZE DEBUG: Marked", optimizationKey, "as optimized. Full flag state:", isLineupOptimizedRef.current);
    
    setManualLineup([...optimizedLineup]); // Force new array reference

    const captainPlayer = getPlayerById(optimizedLineup.find(p => p.is_captain)?.element || 0);
    const formationName = bestFormation?.name || 'Unknown';
    
    console.log("🔧 OPTIMIZE DEBUG: Formation:", formationName, "Captain:", captainPlayer?.web_name);
    
    toast({
      title: "Team Optimized!",
      description: `${formationName} formation selected. Captain: ${captainPlayer?.web_name || 'TBD'}. ${(bestPoints + (sortedByPoints[0]?.points || 0)).toFixed(2)} projected pts.`
    });

    // Save optimized lineup to state and immediately persist to database
    // This ensures the optimized positions are preserved when switching gameweeks
    const updatedOptimizedLineups = {
      ...optimizedLineups,
      [gameweek]: JSON.parse(JSON.stringify(optimizedLineup)) // Deep clone
    };
    setOptimizedLineups(updatedOptimizedLineups);
    
    // Immediately save to database with the optimized lineup
    if (activeDraft !== "Base" && searchedId) {
      console.log("💾 OPTIMIZE: Saving optimized lineup for GW", gameweek, "to draft", activeDraft);
      
      const captainPick = optimizedLineup.find(p => p.is_captain);
      const viceCaptainPick = optimizedLineup.find(p => p.is_vice_captain);
      const captainPlayerObj = captainPick ? getPlayerById(captainPick.element) : null;
      const viceCaptainPlayerObj = viceCaptainPick ? getPlayerById(viceCaptainPick.element) : null;
      
      fetch("/api/transfer-planner/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          managerId: parseInt(searchedId),
          draftLetter: activeDraft,
          gameweekTransfers: JSON.parse(JSON.stringify(gameweekTransfers)),
          plannedChips: JSON.parse(JSON.stringify(plannedChips)),
          optimizedLineups: updatedOptimizedLineups,
          mode: "manual",
          teamBank: calculateBankAfterTransfers(),
          teamValue: 0,
          totalProjectedPoints: 0,
          totalTransfersUsed: Object.values(gameweekTransfers).reduce((sum, gw) => sum + gw.completed.length, 0),
          captainPlayerId: captainPick?.element || null,
          captainPlayerName: captainPlayerObj?.web_name || null,
          viceCaptainPlayerId: viceCaptainPick?.element || null,
          viceCaptainPlayerName: viceCaptainPlayerObj?.web_name || null
        })
      }).then(response => {
        if (response.ok) {
          console.log("✅ OPTIMIZE: Optimized lineup saved to database successfully");
          loadDrafts(); // Refresh drafts list
        }
      }).catch(error => {
        console.error("❌ OPTIMIZE: Failed to save optimized lineup:", error);
      });
    }
  };


  // Optimize team lineup for all future gameweeks
  const optimizeAllGameweeks = async () => {
    if (!playerProjections6GW || !bootstrapData || manualLineup.length === 0) {
      toast({
        title: "Cannot Optimize",
        description: "Player projections are not available yet",
        variant: "destructive"
      });
      return;
    }

    // Check if there are any pending transfers (transferred out but not replaced)
    if (transferredOutPlayers.length > 0) {
      toast({
        title: "Cannot Optimize",
        description: `You have ${transferredOutPlayers.length} player(s) awaiting replacement. Please undo or complete these transfers before optimizing.`,
        variant: "destructive"
      });
      return;
    }

    // Check if squad has exactly 15 players (count only players not transferred out)
    const activePlayersCount = manualLineup.filter(p => !p.is_transferred_out).length;
    if (activePlayersCount !== 15) {
      toast({
        title: "Cannot Optimize",
        description: `Your squad has ${activePlayersCount} players. You must have exactly 15 players before optimizing. Please undo or complete your transfers.`,
        variant: "destructive"
      });
      return;
    }

    // Check if we can create a draft
    const targetDraft = getTargetDraftForChanges();
    if (!targetDraft) return;
    
    const wasInBase = activeDraft === "Base";
    const nextGWs = getNextGameweeks();
    let optimizedCount = 0;

    // Store all optimized lineups
    const allOptimizedLineups: { [key: number]: TeamPick[] } = {};

    // Optimize each gameweek
    for (const gw of nextGWs) {
      const gameweek = gw.id;
      
      const getProjectedPoints = (playerId: number): number => {
        const projection = playerProjections6GW.find((p: any) => p.playerId === playerId);
        return projection?.gameweekProjections?.[gameweek.toString()] || 0;
      };

      // Get baseline lineup for this gameweek
      const baselineLineup = getBaselineLineup(gameweek);

      // Group players by position
      const squadByPosition: {
        GKP: TeamPick[];
        DEF: TeamPick[];
        MID: TeamPick[];
        FWD: TeamPick[];
      } = {
        GKP: [],
        DEF: [],
        MID: [],
        FWD: []
      };

      baselineLineup.forEach(pick => {
        const player = getPlayerById(pick.element);
        if (!player) return;
        
        const positionType = player.element_type;
        const posKey = positionType === 1 ? 'GKP' : positionType === 2 ? 'DEF' : positionType === 3 ? 'MID' : 'FWD';
        squadByPosition[posKey].push({
          ...pick,
          projectedPoints: getProjectedPoints(pick.element)
        } as any);
      });

      // Sort each position by projected points (descending)
      Object.keys(squadByPosition).forEach(pos => {
        squadByPosition[pos as keyof typeof squadByPosition].sort((a: any, b: any) => b.projectedPoints - a.projectedPoints);
      });

      // Select best starting 11 using valid FPL formations
      const formations = [
        { def: 3, mid: 5, fwd: 2, name: '3-5-2' },
        { def: 3, mid: 4, fwd: 3, name: '3-4-3' },
        { def: 4, mid: 5, fwd: 1, name: '4-5-1' },
        { def: 4, mid: 4, fwd: 2, name: '4-4-2' },
        { def: 4, mid: 3, fwd: 3, name: '4-3-3' },
        { def: 5, mid: 4, fwd: 1, name: '5-4-1' },
        { def: 5, mid: 3, fwd: 2, name: '5-3-2' }
      ];

      let bestFormation = null;
      let bestPoints = -1;
      let bestStarting11: TeamPick[] = [];

      formations.forEach(formation => {
        if (squadByPosition.DEF.length < formation.def || 
            squadByPosition.MID.length < formation.mid || 
            squadByPosition.FWD.length < formation.fwd) {
          return;
        }

        const starting11 = [
          squadByPosition.GKP[0],
          ...squadByPosition.DEF.slice(0, formation.def),
          ...squadByPosition.MID.slice(0, formation.mid),
          ...squadByPosition.FWD.slice(0, formation.fwd)
        ];

        const totalPoints = starting11.reduce((sum, pick: any) => sum + (pick.projectedPoints || 0), 0);

        if (totalPoints > bestPoints) {
          bestPoints = totalPoints;
          bestFormation = formation;
          bestStarting11 = starting11;
        }
      });

      if (bestFormation && bestStarting11.length > 0) {
        // Create bench: remaining players not in starting 11
        const bench = baselineLineup.filter(pick => 
          !bestStarting11.find(s11 => s11.element === pick.element)
        );

        // Sort bench by projected points (highest to lowest)
        const sortedBench = bench
          .map(pick => ({
            ...pick,
            projectedPoints: getProjectedPoints(pick.element)
          }))
          .sort((a: any, b: any) => b.projectedPoints - a.projectedPoints)
          .map(({ projectedPoints, ...pick }) => pick);

        // Remove captain and vice-captain flags from all players
        const cleanedStarting11 = bestStarting11.map(pick => ({
          ...pick,
          is_captain: false,
          is_vice_captain: false
        }));

        // Set captain and vice-captain based on projected points
        const sortedByPoints = cleanedStarting11
          .map(pick => ({
            ...pick,
            points: getProjectedPoints(pick.element)
          }))
          .sort((a, b) => b.points - a.points);

        if (sortedByPoints.length > 0) {
          sortedByPoints[0].is_captain = true;
        }
        if (sortedByPoints.length > 1) {
          sortedByPoints[1].is_vice_captain = true;
        }

        const optimizedLineup = [
          ...sortedByPoints.map(({ points, ...pick }) => pick),
          ...sortedBench
        ];

        allOptimizedLineups[gameweek] = optimizedLineup;
        optimizedCount++;
      }
    }

    // Update optimizedLineups state and persist to database
    const updatedOptimizedLineups = {
      ...optimizedLineups,
      ...allOptimizedLineups
    };
    setOptimizedLineups(updatedOptimizedLineups);
    
    // Mark all optimized gameweeks as optimized to prevent reset
    const newFlags = { ...isLineupOptimizedRef.current };
    Object.keys(allOptimizedLineups).forEach(gw => {
      const key = getOptimizationKey(activeDraft, parseInt(gw));
      newFlags[key] = true;
    });
    isLineupOptimizedRef.current = newFlags;

    // If current gameweek was optimized, update manualLineup
    if (allOptimizedLineups[selectedGameweek]) {
      setManualLineup(JSON.parse(JSON.stringify(allOptimizedLineups[selectedGameweek])));
    }

    // CRITICAL: Save all optimized lineups to database to persist changes
    // Use the same approach as single optimization for consistency
    if (activeDraft !== "Base" && searchedId) {
      console.log("💾 OPTIMIZE ALL: Saving all optimized lineups to draft", activeDraft);
      
      // Use the optimized lineup for the current gameweek (if it exists), otherwise use manualLineup
      const currentOptimizedLineup = allOptimizedLineups[selectedGameweek] || manualLineup;
      const captainPick = currentOptimizedLineup.find(p => p.is_captain);
      const viceCaptainPick = currentOptimizedLineup.find(p => p.is_vice_captain);
      const captainPlayerObj = captainPick ? getPlayerById(captainPick.element) : null;
      const viceCaptainPlayerObj = viceCaptainPick ? getPlayerById(viceCaptainPick.element) : null;
      
      fetch("/api/transfer-planner/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          managerId: parseInt(searchedId),
          draftLetter: activeDraft,
          gameweekTransfers: JSON.parse(JSON.stringify(gameweekTransfers)),
          plannedChips: JSON.parse(JSON.stringify(plannedChips)),
          optimizedLineups: updatedOptimizedLineups,
          mode: "manual",
          teamBank: calculateBankAfterTransfers(),
          teamValue: 0,
          totalProjectedPoints: 0,
          totalTransfersUsed: Object.values(gameweekTransfers).reduce((sum, gw) => sum + gw.completed.length, 0),
          captainPlayerId: captainPick?.element || null,
          captainPlayerName: captainPlayerObj?.web_name || null,
          viceCaptainPlayerId: viceCaptainPick?.element || null,
          viceCaptainPlayerName: viceCaptainPlayerObj?.web_name || null
        })
      }).then(response => {
        if (response.ok) {
          console.log("✅ OPTIMIZE ALL: All optimized lineups saved to database successfully");
          loadDrafts(); // Refresh drafts list
        }
      }).catch(error => {
        console.error("❌ OPTIMIZE ALL: Failed to save optimized lineups:", error);
      });
    }

    toast({
      title: "All Gameweeks Optimized!",
      description: `Optimized lineups for ${optimizedCount} gameweeks. Switch between gameweeks to see the optimized teams.`
    });

    // Auto-save after bulk optimization (for Base draft handling)
    if (wasInBase) {
      setTimeout(() => finalizeNewDraft(targetDraft), 100);
    }
  };


  // Handle captain selection
  const handleSetCaptain = (playerId: number) => {
    const player = getPlayerById(playerId);
    if (!player) return;
    
    setCaptainConfirmation({
      playerId,
      playerName: player.web_name
    });
  };
  
  // Confirm captain selection
  const confirmSetCaptain = async (playerId: number) => {
    // Check if we can create a draft
    const targetDraft = getTargetDraftForChanges();
    if (!targetDraft) {
      setCaptainConfirmation(null);
      setSelectedPlayer(null);
      return;
    }
    
    const wasInBase = activeDraft === "Base";
    
    if (wasInBase) {
      // If in Base: Create draft, switch to it, save, apply captain change, save again
      try {
        // Step 1: Create the draft with current Base team
        await finalizeNewDraft(targetDraft);
        
        // Step 2: Wait for draft to be fully created and switched
        await new Promise(resolve => setTimeout(resolve, 400));
        
        // Step 3: Explicitly save the draft (ensures it's persisted after switch)
        await saveCurrentDraft();
        
        // Step 4: Wait for save to complete
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Step 5: Apply the captain change
        setManualLineup(prev => {
          const currentCaptain = prev.find(p => p.is_captain);
          const currentViceCaptain = prev.find(p => p.is_vice_captain);
          const newCaptainIsCurrentViceCaptain = currentViceCaptain?.element === playerId;
          const isTC = selectedGameweek ? plannedChips[selectedGameweek] === '3xc' : false;
          const capMultiplier = isTC ? 3 : 2;
          
          return prev.map(pick => {
            if (pick.element === playerId) {
              return { ...pick, is_captain: true, is_vice_captain: false, multiplier: capMultiplier };
            } else if (newCaptainIsCurrentViceCaptain && pick.element === currentCaptain?.element) {
              return { ...pick, is_captain: false, is_vice_captain: true, multiplier: 1 };
            } else if (pick.is_captain) {
              return { ...pick, is_captain: false, multiplier: 1 };
            } else {
              return pick;
            }
          });
        });
        
        setCaptainConfirmation(null);
        setSelectedPlayer(null);
        
        setHasUnsavedChanges(true);
      } catch (error) {
        console.error("Error creating draft with captain change:", error);
        toast({
          title: "Error",
          description: "Failed to create draft. Please try again.",
          variant: "destructive"
        });
        setCaptainConfirmation(null);
        setSelectedPlayer(null);
      }
    } else {
      // Already in a draft, apply the change directly
      const currentCaptain = manualLineup.find(p => p.is_captain);
      const currentViceCaptain = manualLineup.find(p => p.is_vice_captain);
      const newCaptainIsCurrentViceCaptain = currentViceCaptain?.element === playerId;
      
      const isTC = selectedGameweek ? plannedChips[selectedGameweek] === '3xc' : false;
      const capMultiplier = isTC ? 3 : 2;
      
      const newLineup = manualLineup.map(pick => {
        if (pick.element === playerId) {
          return { ...pick, is_captain: true, is_vice_captain: false, multiplier: capMultiplier };
        } else if (newCaptainIsCurrentViceCaptain && pick.element === currentCaptain?.element) {
          return { ...pick, is_captain: false, is_vice_captain: true, multiplier: 1 };
        } else if (pick.is_captain) {
          return { ...pick, is_captain: false, multiplier: 1 };
        } else {
          return pick;
        }
      });
      
      setManualLineup(newLineup);
      
      // Save the updated lineup to persist it, but DON'T mark as optimized (it's a manual change)
      if (selectedGameweek) {
        const optimizationKey = getOptimizationKey(activeDraft, selectedGameweek);
        // Clear the optimization flag since this is a manual change
        delete isLineupOptimizedRef.current[optimizationKey];
        
        // Save the updated lineup to optimizedLineups state for persistence (deep clone)
        setOptimizedLineups(prev => ({
          ...prev,
          [selectedGameweek]: JSON.parse(JSON.stringify(newLineup))
        }));
      }
      
      setCaptainConfirmation(null);
      setSelectedPlayer(null);
      
      setHasUnsavedChanges(true);
    }
  };

  // Handle vice captain selection
  const handleSetViceCaptain = (playerId: number) => {
    const player = getPlayerById(playerId);
    if (!player) return;
    
    setViceCaptainConfirmation({
      playerId,
      playerName: player.web_name
    });
  };
  
  // Confirm vice captain selection
  const confirmSetViceCaptain = async (playerId: number) => {
    // Check if we can create a draft
    const targetDraft = getTargetDraftForChanges();
    if (!targetDraft) {
      setViceCaptainConfirmation(null);
      setSelectedPlayer(null);
      return;
    }
    
    const wasInBase = activeDraft === "Base";
    
    if (wasInBase) {
      // If in Base: Create draft, switch to it, save, apply vice captain change, save again
      try {
        // Step 1: Create the draft with current Base team
        await finalizeNewDraft(targetDraft);
        
        // Step 2: Wait for draft to be fully created and switched
        await new Promise(resolve => setTimeout(resolve, 400));
        
        // Step 3: Explicitly save the draft (ensures it's persisted after switch)
        await saveCurrentDraft();
        
        // Step 4: Wait for save to complete
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Step 5: Apply the vice captain change
        setManualLineup(prev => {
          const currentCaptain = prev.find(p => p.is_captain);
          const currentViceCaptain = prev.find(p => p.is_vice_captain);
          const newViceCaptainIsCurrentCaptain = currentCaptain?.element === playerId;
          const isTC = selectedGameweek ? plannedChips[selectedGameweek] === '3xc' : false;
          const capMultiplier = isTC ? 3 : 2;
          
          return prev.map(pick => {
            if (pick.element === playerId) {
              return { ...pick, is_vice_captain: true, is_captain: false, multiplier: 1 };
            } else if (newViceCaptainIsCurrentCaptain && pick.element === currentViceCaptain?.element) {
              return { ...pick, is_vice_captain: false, is_captain: true, multiplier: capMultiplier };
            } else if (pick.is_vice_captain) {
              return { ...pick, is_vice_captain: false };
            } else {
              return pick;
            }
          });
        });
        
        setViceCaptainConfirmation(null);
        setSelectedPlayer(null);
        
        setHasUnsavedChanges(true);
      } catch (error) {
        console.error("Error creating draft with vice captain change:", error);
        toast({
          title: "Error",
          description: "Failed to create draft. Please try again.",
          variant: "destructive"
        });
        setViceCaptainConfirmation(null);
        setSelectedPlayer(null);
      }
    } else {
      // Already in a draft, apply the change directly
      const currentCaptain = manualLineup.find(p => p.is_captain);
      const currentViceCaptain = manualLineup.find(p => p.is_vice_captain);
      const newViceCaptainIsCurrentCaptain = currentCaptain?.element === playerId;
      
      const isTC = selectedGameweek ? plannedChips[selectedGameweek] === '3xc' : false;
      const capMultiplier = isTC ? 3 : 2;
      
      const newLineup = manualLineup.map(pick => {
        if (pick.element === playerId) {
          return { ...pick, is_vice_captain: true, is_captain: false, multiplier: 1 };
        } else if (newViceCaptainIsCurrentCaptain && pick.element === currentViceCaptain?.element) {
          return { ...pick, is_vice_captain: false, is_captain: true, multiplier: capMultiplier };
        } else if (pick.is_vice_captain) {
          return { ...pick, is_vice_captain: false };
        } else {
          return pick;
        }
      });
      
      setManualLineup(newLineup);
      
      // Save the updated lineup to persist it, but DON'T mark as optimized (it's a manual change)
      if (selectedGameweek) {
        const optimizationKey = getOptimizationKey(activeDraft, selectedGameweek);
        // Clear the optimization flag since this is a manual change
        delete isLineupOptimizedRef.current[optimizationKey];
        
        // Save the updated lineup to optimizedLineups state for persistence (deep clone)
        setOptimizedLineups(prev => ({
          ...prev,
          [selectedGameweek]: JSON.parse(JSON.stringify(newLineup))
        }));
      }
      
      setViceCaptainConfirmation(null);
      setSelectedPlayer(null);
      
      setHasUnsavedChanges(true);
    }
  };

  // Handle transferring a player out
  const handleTransferOut = async (pick: TeamPick) => {
    const player = getPlayerById(pick.element);
    if (!player) return;

    // IMPORTANT: Always use the current pick from manualLineup to get latest purchase_price from buy price edits
    const currentPick = manualLineup.find(p => p.element === pick.element);
    if (!currentPick) {
      toast({ title: "Error", description: "Player not found in lineup", variant: "destructive" });
      return;
    }

    let isCreatingNewDraft = false;
    let newDraftLetter = "";

    // If in Base draft, check if we can create a new draft or need to use existing one
    if (activeDraft === "Base") {
      const usedLetters = savedDrafts.map(d => d.draftLetter);
      const allLetters = 'ABCDE'.split('');
      const availableLetters = allLetters.filter(l => !usedLetters.includes(l));
      
      // If we already have 5 drafts, prevent transfer from Base
      if (availableLetters.length === 0) {
        toast({
          title: "Draft Limit Reached",
          description: "You have 5 drafts already. Please delete a draft first, or make transfers in an existing draft instead of Base.",
          variant: "destructive"
        });
        return;
      }
      
      // Auto-create a new draft and switch to it
      const nextLetter = availableLetters[0];
      newDraftLetter = nextLetter;
      isCreatingNewDraft = true;
      
      if (!searchedId) {
        toast({ title: "Error", description: "Manager ID not found", variant: "destructive" });
        return;
      }

      // Switch to new draft but DON'T save yet - let the transfer out be recorded first
      const emptyGameweekTransfers = {};
      setActiveDraft(nextLetter);
      setGameweekTransfers(emptyGameweekTransfers);
      setTransferredOutPlayers([]);
      setCompletedTransfers([]);
      toast({ 
        title: "New Draft Created", 
        description: `Draft ${nextLetter} created. Making transfer...`
      });
    }

    const sellingPrice = getSellingPrice(currentPick);

    const transferOut: TransferOut = {
      playerId: player.id,
      playerName: player.web_name,
      position: currentPick.position,
      elementType: player.element_type,
      sellingPrice: sellingPrice,
    };

    const newTransferredOut = [...transferredOutPlayers, transferOut];
    setTransferredOutPlayers(newTransferredOut);
    setSelectedPlayer(null);
    // Directly scroll to replacement — no modal needed
    setTimeout(() => handleScrollToReplacement(player.element_type), 50);
    
    // Save to gameweek-specific storage immediately and capture updated value
    let updatedGameweekTransfers = gameweekTransfers;
    if (selectedGameweek) {
      updatedGameweekTransfers = {
        ...gameweekTransfers,
        [selectedGameweek]: {
          transferredOut: newTransferredOut,
          completed: completedTransfers
        }
      };
      setGameweekTransfers(updatedGameweekTransfers);
    }
    
    // Now save the new draft if we just created it from Base (with the transfer out included)
    if (isCreatingNewDraft && newDraftLetter && searchedId) {
      try {
        const response = await fetch(`/api/transfer-planner/drafts/${searchedId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            draftLetter: newDraftLetter,
            gameweekTransfers: JSON.parse(JSON.stringify(updatedGameweekTransfers)) // Deep clone to prevent shared references
          })
        });
        
        if (response.ok) {
          await loadDrafts();
        }
      } catch (error) {
        console.error("Failed to save new draft:", error);
      }
    }
    
    // Mark player as transferred out instead of removing
    setManualLineup(prev => prev.map(p => 
      p.element === currentPick.element 
        ? { ...p, is_transferred_out: true }
        : p
    ));
    
    // Clear the optimization status for this gameweek since the lineup has changed
    if (selectedGameweek) {
      const optimizationKey = getOptimizationKey(activeDraft, selectedGameweek);
      delete isLineupOptimizedRef.current[optimizationKey];
      
      // Remove optimized lineup from state to show the Optimize button again
      setOptimizedLineups(prev => {
        const updated = { ...prev };
        delete updated[selectedGameweek];
        return updated;
      });
    }

    const positionName = player.element_type === 1 ? 'Goalkeeper' : player.element_type === 2 ? 'Defender' : player.element_type === 3 ? 'Midfielder' : 'Forward';
    toast({
      title: "Player Transferred Out",
      description: `${player.web_name} (${positionName}) has been transferred out for £${sellingPrice.toFixed(1)}m. Select a replacement ${positionName.toLowerCase()}.`
    });
    
    // Immediately save draft after transfer out to prevent data loss on refresh
    if (activeDraft !== "Base" && !isCreatingNewDraft) {
      setTimeout(() => saveCurrentDraft(updatedGameweekTransfers, activeDraft, true), 200);
    }
  };

  // Handle clicking "Replace" to scroll to projections
  const handleScrollToReplacement = (elementType: number) => {
    // Map element_type to position filter value
    const positionMap: { [key: number]: string } = {
      1: "Goalkeeper",
      2: "Defender",
      3: "Midfielder",
      4: "Forward"
    };
    
    // Set position filter and trigger scroll to projections
    const positionFilter = positionMap[elementType] || "all";
    setProjectionPositionFilter(positionFilter);
    setScrollToProjections(true);
  };

  // Handle transferring a player in
  const handleTransferIn = (playerId: number, playerElementType: number) => {
    // Set flag to prevent useEffect from interfering during transfer processing
    isProcessingTransferRef.current = true;
    
    const player = getPlayerById(playerId);
    if (!player) {
      isProcessingTransferRef.current = false;
      return;
    }

    // Check if player is already in the team
    const isAlreadyInTeam = manualLineup.some(pick => 
      pick.element === playerId && !pick.is_transferred_out
    );
    
    if (isAlreadyInTeam) {
      toast({
        title: "Error",
        description: `${player.web_name} is already in your team`,
        variant: "destructive"
      });
      isProcessingTransferRef.current = false;
      return;
    }

    // Check team count limit (max 3 players from same team)
    const playersFromSameTeam = manualLineup.filter(pick => {
      if (pick.is_transferred_out) return false;
      const pickPlayer = getPlayerById(pick.element);
      return pickPlayer && pickPlayer.team === player.team;
    });

    if (playersFromSameTeam.length >= 3) {
      const teamName = bootstrapData?.teams.find(t => t.id === player.team)?.name || 'this team';
      toast({
        title: "Team Limit Reached",
        description: `You already have 3 players from ${teamName}. Maximum allowed is 3 players per team.`,
        variant: "destructive"
      });
      isProcessingTransferRef.current = false;
      return;
    }

    // Find the matching transferred out player
    const transferOutIndex = transferredOutPlayers.findIndex(
      t => t.elementType === playerElementType
    );

    if (transferOutIndex === -1) {
      toast({
        title: "Error",
        description: "No matching position found for transfer",
        variant: "destructive"
      });
      isProcessingTransferRef.current = false;
      return;
    }

    const transferredOut = transferredOutPlayers[transferOutIndex];
    const buyingPrice = player.now_cost / 10;

    // Record the completed transfer
    const completedTransfer: CompletedTransfer = {
      outPlayerId: transferredOut.playerId,
      outPlayerName: transferredOut.playerName,
      sellingPrice: transferredOut.sellingPrice,
      inPlayerId: playerId,
      inPlayerName: player.web_name,
      buyingPrice: buyingPrice,
    };

    // Replace the transferred out player FIRST - search by is_transferred_out flag, not position
    // (positions can change after optimization, making position-based search unreliable)
    console.log("🔍 TRANSFER IN DEBUG:");
    console.log("  Looking for transferred out player ID:", transferredOut.playerId);
    console.log("  Current manual lineup:", manualLineup.map(p => ({ id: p.element, out: p.is_transferred_out })));
    console.log("  Transferred out players list:", transferredOutPlayers);
    
    setManualLineup(prev => {
      const transferredOutIndex = prev.findIndex(p => 
        p.element === transferredOut.playerId && p.is_transferred_out
      );
      
      console.log("  Found at index:", transferredOutIndex);
      
      if (transferredOutIndex === -1) {
        console.error("❌ Could not find transferred out player in lineup:", transferredOut);
        console.log("  Current lineup full details:", prev);
        console.log("  Looking for player ID:", transferredOut.playerId, "with is_transferred_out: true");
        
        // Show error toast to user
        toast({
          title: "Transfer Failed",
          description: `Could not find ${transferredOut.playerName} in your lineup. Try refreshing the page.`,
          variant: "destructive"
        });
        
        return prev;
      }
      
      console.log("✅ Replacing player at index", transferredOutIndex, "with new player", playerId);
      
      const updatedLineup = prev.map((p, idx) => {
        if (idx === transferredOutIndex) {
          return {
            element: playerId,
            position: p.position, // Preserve the current position
            multiplier: 1,
            is_captain: false,
            is_vice_captain: false,
            selling_price: player.now_cost,
            purchase_price: player.now_cost, // Set purchase price to current price for new transfers
            is_transferred_out: false,
          };
        }
        return p;
      });
      
      // Show success toast when transfer completes
      toast({
        title: "Transfer Completed",
        description: `Transferred out ${transferredOut.playerName} for ${player.web_name} (Sold for £${transferredOut.sellingPrice.toFixed(1)}m, Bought for £${buyingPrice.toFixed(1)}m)`
      });
      
      return updatedLineup;
    });

    // Calculate new states
    const newTransfers = [...completedTransfers, completedTransfer];
    const newTransferredOut = transferredOutPlayers.filter((_, i) => i !== transferOutIndex);
    
    // Update all states
    setCompletedTransfers(newTransfers);
    setTransferredOutPlayers(newTransferredOut);
    
    // Clear the optimization status for this gameweek since the lineup has changed
    if (selectedGameweek) {
      const optimizationKey = getOptimizationKey(activeDraft, selectedGameweek);
      delete isLineupOptimizedRef.current[optimizationKey];
      
      // Remove optimized lineup from state to show the Optimize button again
      setOptimizedLineups(prev => {
        const updated = { ...prev };
        delete updated[selectedGameweek];
        return updated;
      });
    }
    
    // Save to gameweek-specific storage immediately and capture the updated value
    let updatedGameweekTransfers = gameweekTransfers;
    if (selectedGameweek) {
      updatedGameweekTransfers = {
        ...gameweekTransfers,
        [selectedGameweek]: {
          transferredOut: newTransferredOut,
          completed: newTransfers
        }
      };
      setGameweekTransfers(updatedGameweekTransfers);
    }

    // Scroll back to team lineup to see the new player
    setTimeout(() => {
      if (teamLineupRef.current) {
        teamLineupRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);

    // Always save immediately after transfer in to prevent data loss on refresh
    if (activeDraft !== "Base") {
      const draftToSave = activeDraft; // Capture draft letter before async operation
      setTimeout(() => saveCurrentDraft(updatedGameweekTransfers, draftToSave, true), 200);
    }
    
    // Reset the flag after all state updates to allow useEffect to run normally next time
    // Use setTimeout to ensure it happens after React has processed all the state updates
    setTimeout(() => {
      isProcessingTransferRef.current = false;
    }, 0);
  };

  // Reset all transfers for the current gameweek and restore baseline
  const handleResetTransfers = async () => {
    if (!teamData?.picks || !selectedGameweek) return;
    
    // Get the baseline lineup for this gameweek
    const baseline = getBaselineLineup(selectedGameweek);
    setManualLineup(baseline);
    
    // Clear transfers for this gameweek
    setTransferredOutPlayers([]);
    setCompletedTransfers([]);
    
    // Clear from gameweek-specific storage
    const updatedGameweekTransfers = {
      ...gameweekTransfers,
      [selectedGameweek]: {
        transferredOut: [],
        completed: []
      }
    };
    setGameweekTransfers(updatedGameweekTransfers);
    
    // Clear optimized lineup for this gameweek
    setOptimizedLineups(prev => {
      const updated = { ...prev };
      delete updated[selectedGameweek];
      return updated;
    });
    
    toast({
      title: "Transfers Reset",
      description: "All transfers for this gameweek have been undone."
    });
    
    // Auto-save the draft if not on Base
    if (activeDraft !== "Base") {
      const draftToSave = activeDraft;
      await saveCurrentDraft(updatedGameweekTransfers, draftToSave);
    }
  };

  // Reset all transfers across all gameweeks
  const handleResetAllTransfers = async () => {
    if (!teamData?.picks || !selectedGameweek) return;
    
    setManualLineup(normalizePickMultipliers([...teamData.picks]));
    
    // Clear all transfer data
    setTransferredOutPlayers([]);
    setCompletedTransfers([]);
    setGameweekTransfers({});
    
    // Clear all optimized lineups
    setOptimizedLineups({});
    
    toast({
      title: "All Transfers Reset",
      description: "All transfers across all gameweeks have been undone."
    });
    
    // Auto-save the draft if not on Base
    if (activeDraft !== "Base") {
      const draftToSave = activeDraft;
      await saveCurrentDraft({}, draftToSave);
    }
  };

  // Undo a specific transfer and restore the baseline player
  const handleUndoTransfer = async (position: number) => {
    if (!teamData?.picks || !selectedGameweek) return;
    
    // Get the baseline lineup for this gameweek
    const baseline = getBaselineLineup(selectedGameweek);
    const baselinePick = baseline.find(p => p.position === position);
    if (!baselinePick) return;
    
    const baselinePlayer = getPlayerById(baselinePick.element);
    if (!baselinePlayer) return;
    
    // Restore the baseline player at this position
    setManualLineup(prev => prev.map(p => {
      if (p.position === position) {
        return { ...baselinePick };
      }
      return p;
    }));
    
    // Update transferred out list
    const newTransferredOut = transferredOutPlayers.filter(t => t.position !== position);
    setTransferredOutPlayers(newTransferredOut);
    
    // Remove any completed transfer related to this position
    const transferOutEntry = transferredOutPlayers.find(t => t.position !== position);
    const newCompletedTransfers = completedTransfers.filter(t => 
      !transferredOutPlayers.some(to => to.playerId === t.outPlayerId && to.position === position)
    );
    setCompletedTransfers(newCompletedTransfers);
    
    // Update gameweek-specific storage
    const updatedGameweekTransfers = {
      ...gameweekTransfers,
      [selectedGameweek]: {
        transferredOut: newTransferredOut,
        completed: newCompletedTransfers
      }
    };
    setGameweekTransfers(updatedGameweekTransfers);
    
    toast({
      title: "Transfer Undone",
      description: `${baselinePlayer.web_name} has been restored to your team`
    });
    
    // Auto-save the draft if not on Base
    if (activeDraft !== "Base") {
      const draftToSave = activeDraft; // Capture draft letter before async operation
      await saveCurrentDraft(updatedGameweekTransfers, draftToSave);
    }
  };

  // Undo ALL transfers for a position across all gameweeks (back to original team)
  const handleUndoAllTransfersForPosition = async (position: number) => {
    if (!teamData?.picks || !selectedGameweek) return;
    
    // Get the original player from the initial team data
    const originalPick = teamData.picks.find(p => p.position === position);
    if (!originalPick) return;
    
    const originalPlayer = getPlayerById(originalPick.element);
    if (!originalPlayer) return;
    
    // Build a set of all player IDs that have ever been at this position through transfers
    const playerIdsAtPosition = new Set<number>();
    playerIdsAtPosition.add(originalPick.element); // Start with original player
    
    // Trace through all gameweeks to find all players that have been at this position
    Object.keys(gameweekTransfers).forEach(gw => {
      const gwTransfers = gameweekTransfers[parseInt(gw)];
      
      // Check transferred out players at this position
      gwTransfers.transferredOut.forEach(t => {
        if (t.position === position) {
          playerIdsAtPosition.add(t.playerId);
        }
      });
      
      // Check completed transfers - if a player was transferred in at this position
      gwTransfers.completed.forEach(t => {
        // If the out player was at this position, the in player is now at this position
        if (playerIdsAtPosition.has(t.outPlayerId)) {
          playerIdsAtPosition.add(t.inPlayerId);
        }
      });
    });
    
    // Remove ALL transfers across ALL gameweeks that involve any player who has been at this position
    const updatedGameweekTransfers: typeof gameweekTransfers = {};
    
    Object.keys(gameweekTransfers).forEach(gw => {
      const gwNum = parseInt(gw);
      const gwTransfers = gameweekTransfers[gwNum];
      
      // Filter out transfers at this position
      const newTransferredOut = gwTransfers.transferredOut.filter(t => t.position !== position);
      const newCompleted = gwTransfers.completed.filter(t => {
        // Remove any transfer that involves a player who has been at this position
        return !playerIdsAtPosition.has(t.outPlayerId) && !playerIdsAtPosition.has(t.inPlayerId);
      });
      
      // Only keep the gameweek if it still has transfers
      if (newTransferredOut.length > 0 || newCompleted.length > 0) {
        updatedGameweekTransfers[gwNum] = {
          transferredOut: newTransferredOut,
          completed: newCompleted
        };
      }
    });
    
    setGameweekTransfers(updatedGameweekTransfers);
    
    // Update current gameweek's state
    const currentGwTransfers = updatedGameweekTransfers[selectedGameweek] || { transferredOut: [], completed: [] };
    setTransferredOutPlayers(currentGwTransfers.transferredOut);
    setCompletedTransfers(currentGwTransfers.completed);
    
    // Restore the original player at this position with their original purchase_price
    setManualLineup(prev => {
      const updated = prev.map(p => {
        if (p.position === position) {
          console.log("🔄 UNDO ALL DEBUG - Restoring original player at position", position);
          console.log("  Original pick:", originalPick);
          console.log("  Current pick:", p);
          console.log("  Purchase price being restored:", originalPick.purchase_price);
          return { 
            ...originalPick,
            is_transferred_out: false // Ensure the flag is cleared
          };
        }
        return p;
      });
      
      console.log("💰 CASH DEBUG after undo all:");
      console.log("  Updated lineup purchase prices:", updated.map(p => ({
        element: p.element,
        position: p.position,
        purchase_price: p.purchase_price
      })));
      
      return updated;
    });
    
    toast({
      title: "All Transfers Undone",
      description: `${originalPlayer.web_name} has been restored (all transfers removed)`
    });
    
    // Auto-save the draft if not on Base
    if (activeDraft !== "Base") {
      const draftToSave = activeDraft; // Capture draft letter before async operation
      await saveCurrentDraft(updatedGameweekTransfers, draftToSave);
    }
  };

  // Undo all transfers for a position for the CURRENT gameweek only
  const handleUndoGameweekTransfersForPosition = async (position: number) => {
    if (!teamData?.picks || !selectedGameweek) return;
    
    // Get the baseline player for this gameweek (considering previous gameweeks' transfers)
    const baseline = getBaselineLineup(selectedGameweek);
    const baselinePick = baseline.find(p => p.position === position);
    if (!baselinePick) return;
    
    const baselinePlayer = getPlayerById(baselinePick.element);
    if (!baselinePlayer) return;
    
    // Remove transfers for this position in the CURRENT gameweek only
    const currentGwTransfers = gameweekTransfers[selectedGameweek] || { transferredOut: [], completed: [] };
    const newTransferredOut = currentGwTransfers.transferredOut.filter(t => t.position !== position);
    const newCompleted = currentGwTransfers.completed.filter(t => {
      // Remove any transfer where the out happened at this position
      const outPosition = teamData.picks.find(p => p.element === t.outPlayerId)?.position;
      return outPosition !== position;
    });
    
    // Update gameweek transfers
    const updatedGameweekTransfers = {
      ...gameweekTransfers,
      [selectedGameweek]: {
        transferredOut: newTransferredOut,
        completed: newCompleted
      }
    };
    
    setGameweekTransfers(updatedGameweekTransfers);
    setTransferredOutPlayers(newTransferredOut);
    setCompletedTransfers(newCompleted);
    
    // Restore the baseline player at this position
    setManualLineup(prev => prev.map(p => {
      if (p.position === position) {
        return { ...baselinePick };
      }
      return p;
    }));
    
    toast({
      title: "GW Transfers Undone",
      description: `${baselinePlayer.web_name} restored (GW${selectedGameweek} transfers removed)`
    });
    
    // Auto-save the draft if not on Base
    if (activeDraft !== "Base") {
      const draftToSave = activeDraft; // Capture draft letter before async operation
      await saveCurrentDraft(updatedGameweekTransfers, draftToSave);
    }
  };

  // Apply recommended transfers for the current gameweek
  const handleApplyRecommendedTransfers = async () => {
    if (!selectedGameweek || !recommendedTransfers?.gameweeks || !teamData?.picks || !bootstrapData || !searchedId) {
      toast({
        title: "Cannot Apply Transfers",
        description: "Transfer recommendations are not available for this gameweek.",
        variant: "destructive"
      });
      return;
    }

    const gwRecommendations = recommendedTransfers.gameweeks[selectedGameweek];
    if (!gwRecommendations?.recommendations || gwRecommendations.recommendations.length === 0) {
      toast({
        title: "No Recommendations",
        description: `No transfer recommendations available for GW${selectedGameweek}.`,
        variant: "destructive"
      });
      return;
    }

    // Get only primary recommendations (filter by type, then limit to free transfers available)
    const freeTransfers = gwRecommendations.freeTransfersAvailable || 1;
    const primaryOnlyRecs = gwRecommendations.recommendations.filter((rec: any) => rec.type === 'primary');
    const primaryRecommendations = primaryOnlyRecs.slice(0, freeTransfers);

    // Get all unapplied recommendations from primary list
    const unappliedRecs = primaryRecommendations.filter(rec => 
      !completedTransfers.some(
        transfer => 
          transfer.outPlayerId === rec.playerOut.id && 
          transfer.inPlayerId === rec.playerIn.id
      )
    );

    if (unappliedRecs.length === 0) {
      toast({
        title: "Already Applied",
        description: "All recommended transfers have already been applied.",
        variant: "destructive"
      });
      return;
    }

    // Check if trying to transfer from Base draft
    let isCreatingNewDraft = false;
    let newDraftLetter = "";
    
    if (activeDraft === "Base") {
      const usedLetters = savedDrafts.map(d => d.draftLetter);
      const allLetters = 'ABCDE'.split('');
      const availableLetters = allLetters.filter(l => !usedLetters.includes(l));
      
      if (availableLetters.length === 0) {
        toast({
          title: "Draft Limit Reached",
          description: "You have 5 drafts already. Please make transfers in an existing draft instead of Base.",
          variant: "destructive"
        });
        return;
      }
      
      newDraftLetter = availableLetters[0];
      isCreatingNewDraft = true;
    }

    // Apply all recommended transfers
    const newCompletedTransfers: CompletedTransfer[] = [];
    let updatedLineup = [...manualLineup];
    
    for (const rec of unappliedRecs) {
      // Find the player to transfer out in the current lineup
      const playerOutId = rec.playerOut.id;
      const pickToTransferOut = updatedLineup.find(p => p.element === playerOutId && !p.is_transferred_out);
      
      if (!pickToTransferOut) {
        console.warn(`Player ${rec.playerOut.webName} not found or already transferred out`);
        continue;
      }

      // Get player data
      const playerOut = getPlayerById(playerOutId);
      const playerIn = getPlayerById(rec.playerIn.id);
      
      if (!playerOut || !playerIn) {
        console.warn(`Could not find player data for transfer`);
        continue;
      }

      // Check if incoming player is already in the squad - skip transfer if they are
      const isPlayerAlreadyInSquad = updatedLineup.some(p => p.element === playerIn.id);
      if (isPlayerAlreadyInSquad) {
        console.warn(`${playerIn.web_name} is already in the squad, skipping this recommended transfer`);
        continue;
      }

      // Calculate prices
      const sellingPrice = getSellingPrice(pickToTransferOut);
      const buyingPrice = playerIn.now_cost / 10;

      // Create completed transfer record
      const completedTransfer: CompletedTransfer = {
        outPlayerId: playerOut.id,
        outPlayerName: playerOut.web_name,
        sellingPrice: sellingPrice,
        inPlayerId: playerIn.id,
        inPlayerName: playerIn.web_name,
        buyingPrice: buyingPrice,
      };

      newCompletedTransfers.push(completedTransfer);

      // Update lineup - replace the player at the same position
      updatedLineup = updatedLineup.map(p => {
        if (p.position === pickToTransferOut.position) {
          return {
            element: playerIn.id,
            position: pickToTransferOut.position,
            multiplier: 1,
            is_captain: p.is_captain,
            is_vice_captain: p.is_vice_captain,
            selling_price: playerIn.now_cost,
            purchase_price: playerIn.now_cost,
            is_transferred_out: false,
          };
        }
        return p;
      });
    }

    if (newCompletedTransfers.length === 0) {
      toast({
        title: "No Transfers Applied",
        description: "Could not apply any of the recommended transfers.",
        variant: "destructive"
      });
      return;
    }

    // Update gameweek transfers
    const updatedGameweekTransfers = {
      ...gameweekTransfers,
      [selectedGameweek]: {
        transferredOut: [],
        completed: [...completedTransfers, ...newCompletedTransfers]
      }
    };

    // Update all states
    setManualLineup(updatedLineup);
    setCompletedTransfers([...completedTransfers, ...newCompletedTransfers]);
    setTransferredOutPlayers([]);
    setGameweekTransfers(updatedGameweekTransfers);
    
    // Clear optimized lineup for this gameweek since we've made manual transfers
    if (selectedGameweek) {
      const optimizationKey = getOptimizationKey(activeDraft, selectedGameweek);
      delete isLineupOptimizedRef.current[optimizationKey];
      
      setOptimizedLineups(prev => {
        const updated = { ...prev };
        delete updated[selectedGameweek];
        return updated;
      });
    }

    const transferSummary = newCompletedTransfers.map(t => `${t.outPlayerName} → ${t.inPlayerName}`).join(', ');
    const totalPoints = unappliedRecs.reduce((sum, rec) => sum + (rec.pointsGain || 0), 0);

    // If creating new draft, save it
    if (isCreatingNewDraft) {
      setActiveDraft(newDraftLetter);
      try {
        const response = await fetch(`/api/transfer-planner/drafts/${searchedId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            draftLetter: newDraftLetter,
            gameweekTransfers: JSON.parse(JSON.stringify(updatedGameweekTransfers))
          })
        });
        
        if (response.ok) {
          await loadDrafts();
          toast({
            title: "Draft Created & Transfers Applied",
            description: `Draft ${newDraftLetter}: ${newCompletedTransfers.length} transfer${newCompletedTransfers.length > 1 ? 's' : ''} (+${totalPoints.toFixed(2)} pts)`,
          });
        }
      } catch (error) {
        console.error("Failed to save new draft:", error);
      }
    } else {
      // Save existing draft
      await saveCurrentDraft(updatedGameweekTransfers, activeDraft, true);
      toast({
        title: `${newCompletedTransfers.length} Transfer${newCompletedTransfers.length > 1 ? 's' : ''} Applied`,
        description: `${transferSummary} (+${totalPoints.toFixed(2)} pts)`,
      });
    }
  };

  // Helper function to generate tooltip content for a draft
  const getDraftTooltipContent = (draft: any) => {
    if (!draft.gameweekTransfers || Object.keys(draft.gameweekTransfers).length === 0) {
      return "No transfers in this draft";
    }

    // Get the first planning gameweek (GW 13 onwards)
    const nextGWs = getNextGameweeks();
    const firstPlanningGW = nextGWs.length > 0 ? nextGWs[0].id : 999;

    const gameweeks = Object.keys(draft.gameweekTransfers)
      .map(Number)
      .filter(gw => gw >= firstPlanningGW) // Only show future gameweeks
      .sort((a, b) => a - b);
    const tooltipLines: string[] = [];

    gameweeks.forEach(gw => {
      const gwData = draft.gameweekTransfers[gw];
      if (gwData.completed && gwData.completed.length > 0) {
        // Get the squad BEFORE this gameweek's transfers (cumulative from previous GWs)
        // For GW 13, use base team. For GW 14+, use squad after previous GW's transfers
        const squadBeforeTransfers = gw === firstPlanningGW 
          ? (teamData?.picks || [])
          : getSquadAtGameweek(draft.gameweekTransfers, gw - 1);
        const squadPlayerIds = new Set(squadBeforeTransfers.map(p => p.element));
        
        // Only show valid transfers where the out player actually exists in the squad
        const validTransfers = gwData.completed.filter((transfer: CompletedTransfer) => 
          squadPlayerIds.has(transfer.outPlayerId)
        );
        
        if (validTransfers.length > 0) {
          tooltipLines.push(`GW${gw}:`);
          validTransfers.forEach((transfer: CompletedTransfer) => {
            tooltipLines.push(`  ${transfer.outPlayerName} → ${transfer.inPlayerName}`);
          });
        }
      }
    });

    return tooltipLines.length > 0 ? tooltipLines.join('\n') : "No transfers in this draft";
  };

  // Draft management functions
  const loadDrafts = async () => {
    if (!searchedId) return;
    try {
      const response = await fetch(`/api/transfer-planner/drafts/${searchedId}`);
      if (response.ok) {
        const data = await response.json();
        setSavedDrafts(data.drafts || []);
      }
    } catch (error) {
      console.error("Failed to load drafts:", error);
    }
  };

  const saveCurrentDraft = async (transfersToSave?: typeof gameweekTransfers, targetDraftLetter?: string, silent = false) => {
    // Capture the draft letter to save - use explicit parameter or current activeDraft
    const draftLetter = targetDraftLetter || activeDraft;
    
    if (!searchedId || draftLetter === "Base") return;

    const transfersData = transfersToSave || gameweekTransfers;
    
    // Extract captain and vice-captain from current lineup
    const captainPick = manualLineup.find(p => p.is_captain);
    const viceCaptainPick = manualLineup.find(p => p.is_vice_captain);
    const captainPlayer = captainPick ? getPlayerById(captainPick.element) : null;
    const viceCaptainPlayer = viceCaptainPick ? getPlayerById(viceCaptainPick.element) : null;

    if (!silent) {
      setIsSaving(true);
    }

    try {
      const response = await fetch("/api/transfer-planner/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          managerId: parseInt(searchedId),
          draftLetter: draftLetter,
          gameweekTransfers: JSON.parse(JSON.stringify(transfersData)), // Deep clone to prevent shared references
          plannedChips: JSON.parse(JSON.stringify(plannedChips)), // Include planned chips
          optimizedLineups: JSON.parse(JSON.stringify(optimizedLineups)), // Include optimized lineups
          mode: "manual",
          teamBank: calculateBankAfterTransfers(),
          teamValue: 0,
          totalProjectedPoints: 0,
          totalTransfersUsed: Object.values(transfersData).reduce((sum, gw) => sum + gw.completed.length, 0),
          captainPlayerId: captainPick?.element || null,
          captainPlayerName: captainPlayer?.web_name || null,
          viceCaptainPlayerId: viceCaptainPick?.element || null,
          viceCaptainPlayerName: viceCaptainPlayer?.web_name || null
        })
      });

      if (response.ok) {
        // Only update UI state if we're still on the same draft
        if (draftLetter === activeDraft) {
          setHasUnsavedChanges(false);
          setLastSavedAt(new Date());
        }
        if (!silent) {
          toast({ title: "Draft Saved", description: `Draft ${draftLetter} saved successfully` });
        }
        await loadDrafts();
      }
    } catch (error) {
      if (!silent) {
        toast({ title: "Error", description: "Failed to save draft", variant: "destructive" });
      }
    } finally {
      if (!silent) {
        setIsSaving(false);
      }
    }
  };

  // Auto-save function with debouncing
  const queueAutosave = () => {
    // Clear any pending autosave
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    // Don't autosave if we're loading a draft or on Base
    if (isLoadingDraftRef.current || activeDraft === "Base" || !searchedId) {
      return;
    }

    // Set new timeout for autosave (750ms debounce)
    autosaveTimeoutRef.current = setTimeout(async () => {
      setIsSaving(true);
      await saveCurrentDraft(undefined, undefined, true);
      setIsSaving(false);
    }, 750);
  };

  // Flush pending autosave immediately
  const flushAutosave = async () => {
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
      autosaveTimeoutRef.current = null;
    }

    // Save immediately if there are unsaved changes
    if (hasUnsavedChanges && activeDraft !== "Base" && searchedId) {
      await saveCurrentDraft(undefined, undefined, true);
    }
  };

  const switchToDraft = async (draftLetter: string) => {
    console.log("🔄 switchToDraft called with draftLetter:", draftLetter);
    
    // Flush any pending autosave before switching
    await flushAutosave();
    
    // Mark that we're loading a draft to prevent autosave during load
    isLoadingDraftRef.current = true;
    
    if (draftLetter === "Base") {
      // Switch to Base Draft - reset to original team
      setGameweekTransfers({});
      setTransferredOutPlayers([]);
      setCompletedTransfers([]);
      setPlannedChips({}); // Reset planned chips
      setOptimizedLineups({}); // Reset optimized lineups
      setSavedCaptainInfo(null); // Clear saved captain info
      setActiveDraft("Base");
      setHasUnsavedChanges(false);
      if (teamData?.picks) {
        setManualLineup(normalizePickMultipliers([...teamData.picks]));
      }
      isLoadingDraftRef.current = false;
      toast({ title: "Base Draft", description: "Switched to base team (no transfers)" });
    } else {
      try {
        const url = `/api/transfer-planner/drafts/${searchedId}/${draftLetter}`;
        console.log("🌐 Fetching draft from URL:", url);
        
        const response = await fetch(url);
        
        console.log("📡 Response status:", response.status, response.statusText);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("❌ Failed to fetch draft:", response.status, response.statusText, errorText);
          isLoadingDraftRef.current = false;
          toast({ title: "Error", description: "Failed to load draft", variant: "destructive" });
          return;
        }
        
        const data = await response.json();
        const draft = data.draft;
        
        console.log("✅ Fetched draft data:", draft);
        console.log("✅ Draft letter from server:", draft.draftLetter);
        console.log("✅ Requested draft letter:", draftLetter);
        
        if (draft.draftLetter !== draftLetter) {
          console.error("⚠️ MISMATCH: Requested draft", draftLetter, "but got draft", draft.draftLetter);
        }
        
        // Reset ALL state for complete draft isolation
        // CRITICAL: Deep clone to prevent shared references between drafts
        setGameweekTransfers(JSON.parse(JSON.stringify(draft.gameweekTransfers || {})));
        setPlannedChips(JSON.parse(JSON.stringify(draft.plannedChips || {}))); // Load planned chips
        setOptimizedLineups(JSON.parse(JSON.stringify(draft.optimizedLineups || {}))); // Load optimized lineups
        
        console.log("📥 LOADED optimizedLineups from draft:", draft.optimizedLineups);
        
        // Save captain/vice-captain info to be applied AFTER useEffect rebuilds lineup
        const captainInfo = {
          captainPlayerId: draft.captainPlayerId || null,
          viceCaptainPlayerId: draft.viceCaptainPlayerId || null
        };
        
        setSavedCaptainInfo(captainInfo);
        
        // Set active draft - this will trigger useEffect to rebuild lineup
        setActiveDraft(draftLetter);
        setHasUnsavedChanges(false);
        
        // Reset transferred out players and completed transfers
        setTransferredOutPlayers([]);
        setCompletedTransfers([]);
        
        // Allow autosave again after a short delay (to let state settle)
        setTimeout(() => {
          isLoadingDraftRef.current = false;
        }, 1000);
        
        toast({ title: "Draft Loaded", description: `Switched to Draft ${draftLetter}` });
      } catch (error) {
        console.error("❌ Error in switchToDraft:", error);
        console.error("❌ Error type:", typeof error);
        console.error("❌ Error stringified:", JSON.stringify(error));
        if (error instanceof Error) {
          console.error("❌ Error message:", error.message);
          console.error("❌ Error stack:", error.stack);
        }
        isLoadingDraftRef.current = false;
        toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to load draft", variant: "destructive" });
      }
    }
  };

  const createNewDraft = () => {
    // Find next available letter
    const usedLetters = savedDrafts.map(d => d.draftLetter);
    const allLetters = 'ABCDE'.split('');
    const nextLetter = allLetters.find(l => !usedLetters.includes(l));
    
    if (!nextLetter) {
      toast({ title: "Limit Reached", description: "Maximum 5 drafts allowed (A-E). Delete a draft to create a new one.", variant: "destructive" });
      return;
    }

    if (!searchedId) {
      toast({ title: "Error", description: "Manager ID not found", variant: "destructive" });
      return;
    }

    // Reset to Base Draft state
    const emptyGameweekTransfers = {};
    setGameweekTransfers(emptyGameweekTransfers);
    setTransferredOutPlayers([]);
    setCompletedTransfers([]);
    setActiveDraft(nextLetter);
    if (teamData?.picks) {
      setManualLineup(normalizePickMultipliers([...teamData.picks]));
    }
    
    // Auto-save the new draft immediately
    fetch("/api/transfer-planner/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        managerId: parseInt(searchedId),
        draftLetter: nextLetter,
        gameweekTransfers: emptyGameweekTransfers,
        mode: "manual",
        teamBank: teamData?.entry?.bank || 0,
        teamValue: teamData?.entry?.value || 0,
        totalProjectedPoints: 0,
        totalTransfersUsed: 0
      })
    }).then(response => {
      if (response.ok) {
        setHasUnsavedChanges(false);
        loadDrafts();
        toast({ title: "Draft Created & Saved", description: `Draft ${nextLetter} created from base team` });
      }
    }).catch(() => {
      setHasUnsavedChanges(true);
      toast({ title: "Draft Created", description: `Draft ${nextLetter} created (save manually)` });
    });
  };

  const duplicateCurrentDraft = async () => {
    if (activeDraft === "Base") {
      toast({ title: "Cannot Duplicate", description: "Create a new draft instead", variant: "destructive" });
      return;
    }

    const usedLetters = savedDrafts.map(d => d.draftLetter);
    const allLetters = 'ABCDEFGHIJ'.split('');
    const nextLetter = allLetters.find(l => !usedLetters.includes(l));
    
    if (!nextLetter) {
      toast({ title: "Limit Reached", description: "Maximum 10 drafts allowed (A-J)", variant: "destructive" });
      return;
    }

    // Save current transfers as the new draft
    try {
      const response = await fetch("/api/transfer-planner/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          managerId: parseInt(searchedId),
          draftLetter: nextLetter,
          gameweekTransfers: JSON.parse(JSON.stringify(gameweekTransfers)), // Deep clone to prevent shared references
          mode: "manual",
          teamBank: calculateBankAfterTransfers(),
          teamValue: 0,
          totalProjectedPoints: 0,
          totalTransfersUsed: Object.values(gameweekTransfers).reduce((sum, gw) => sum + gw.completed.length, 0)
        })
      });

      if (response.ok) {
        setActiveDraft(nextLetter);
        setHasUnsavedChanges(false);
        await loadDrafts();
        toast({ title: "Draft Duplicated", description: `Draft ${activeDraft} copied to Draft ${nextLetter}` });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to duplicate draft", variant: "destructive" });
    }
  };

  const deleteCurrentDraft = async () => {
    if (activeDraft === "Base") {
      toast({ title: "Cannot Delete", description: "Base draft cannot be deleted", variant: "destructive" });
      return;
    }

    if (activeDraft === "A") {
      toast({ title: "Cannot Delete", description: "Draft A cannot be deleted. Use 'Reset to Base' instead.", variant: "destructive" });
      return;
    }

    try {
      // Clear any pending autosave to prevent recreation
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
        autosaveTimeoutRef.current = null;
      }

      const draftToDelete = activeDraft;
      
      // Prevent any autosave during the deletion process
      isLoadingDraftRef.current = true;
      
      const response = await fetch(`/api/transfer-planner/drafts/${searchedId}/${draftToDelete}`, {
        method: "DELETE"
      });

      if (response.ok) {
        // Manually load Draft A without triggering any autosave
        const draftAResponse = await fetch(`/api/transfer-planner/drafts/${searchedId}/A`);
        
        if (draftAResponse.ok) {
          const { draft } = await draftAResponse.json();
          
          // Update ALL state variables that switchToDraft would update
          setGameweekTransfers(JSON.parse(JSON.stringify(draft.gameweekTransfers || {})));
          setPlannedChips(JSON.parse(JSON.stringify(draft.plannedChips || {})));
          setOptimizedLineups(JSON.parse(JSON.stringify(draft.optimizedLineups || {})));
          setSavedCaptainInfo(draft.captainPlayerId && draft.viceCaptainPlayerId ? {
            captainPlayerId: draft.captainPlayerId,
            viceCaptainPlayerId: draft.viceCaptainPlayerId
          } : null);
          setActiveDraft("A");
          setHasUnsavedChanges(false);
          setTransferredOutPlayers([]);
          setCompletedTransfers([]);
          
          // Rebuild the lineup based on Draft A's cumulative transfers
          const updatedSquad = selectedGameweek ? getSquadAtGameweek(draft.gameweekTransfers || {}, selectedGameweek) : [];
          if (updatedSquad.length > 0) {
            setManualLineup(updatedSquad);
          } else if (teamData?.picks) {
            setManualLineup(normalizePickMultipliers([...teamData.picks]));
          }
          
          // Reload drafts list
          await loadDrafts();
          
          toast({ title: "Draft Deleted", description: `Draft ${draftToDelete} has been deleted` });
        }
        
        // Re-enable autosave
        isLoadingDraftRef.current = false;
      }
    } catch (error) {
      isLoadingDraftRef.current = false;
      toast({ title: "Error", description: "Failed to delete draft", variant: "destructive" });
    }
  };

  const resetDraftAToBase = async () => {
    if (!teamData?.picks || !searchedId || activeDraft === "Base") return;

    const confirmed = window.confirm(
      `Are you sure you want to reset Draft ${activeDraft} to match the Base Draft? This will remove all transfers and chips from Draft ${activeDraft}.`
    );

    if (!confirmed) return;

    try {
      // Get captain and vice-captain from the current team data
      const captainPick = teamData.picks.find(p => p.is_captain);
      const viceCaptainPick = teamData.picks.find(p => p.is_vice_captain);

      const response = await fetch("/api/transfer-planner/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          managerId: parseInt(searchedId),
          draftLetter: activeDraft,
          gameweekTransfers: {}, // Empty transfers
          plannedChips: {}, // No chips
          captainPlayerId: captainPick?.element || null,
          viceCaptainPlayerId: viceCaptainPick?.element || null,
          mode: "manual",
          teamBank: teamData.transfers.bank / 10,
          teamValue: 0,
          totalProjectedPoints: 0,
          totalTransfersUsed: 0
        })
      });

      if (response.ok) {
        await loadDrafts();
        switchToDraft(activeDraft);
        toast({ title: `Draft ${activeDraft} Reset`, description: `Draft ${activeDraft} has been reset to match the Base Draft` });
      }
    } catch (error) {
      toast({ title: "Error", description: `Failed to reset Draft ${activeDraft}`, variant: "destructive" });
    }
  };

  const deleteAllDrafts = () => {
    setShowDeleteAllDialog(true);
  };

  const confirmDeleteAllDrafts = async () => {
    if (!searchedId || !teamData?.picks) return;

    const draftsToDelete = savedDrafts.filter(d => d.draftLetter !== 'A');
    
    setShowDeleteAllDialog(false);

    try {
      // Step 1: Delete drafts B-E
      if (draftsToDelete.length > 0) {
        const deletePromises = draftsToDelete.map(draft =>
          fetch(`/api/transfer-planner/drafts/${searchedId}/${draft.draftLetter}`, {
            method: "DELETE"
          })
        );
        await Promise.all(deletePromises);
      }

      // Step 2: Reset Draft A to Base
      const captainPick = teamData.picks.find(p => p.is_captain);
      const viceCaptainPick = teamData.picks.find(p => p.is_vice_captain);

      const resetResponse = await fetch("/api/transfer-planner/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          managerId: parseInt(searchedId),
          draftLetter: "A",
          gameweekTransfers: {},
          plannedChips: {},
          captainPlayerId: captainPick?.element || null,
          viceCaptainPlayerId: viceCaptainPick?.element || null,
          mode: "manual",
          teamBank: teamData.transfers.bank / 10,
          teamValue: 0,
          totalProjectedPoints: 0,
          totalTransfersUsed: 0
        })
      });

      if (resetResponse.ok) {
        switchToDraft("Base");
        await loadDrafts();
        toast({ 
          title: "Drafts Reset", 
          description: `Draft A reset to Base. ${draftsToDelete.length} other draft(s) deleted.` 
        });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to reset drafts", variant: "destructive" });
    }
  };

  const deleteAllDuplicateDrafts = async () => {
    if (!searchedId) return;

    // Identify all duplicate drafts
    const duplicateInfo = identifyDuplicateDrafts();
    const duplicateDrafts = Object.entries(duplicateInfo)
      .filter(([key, info]) => info.isDuplicate && key !== 'Base')
      .map(([key]) => key);

    if (duplicateDrafts.length === 0) {
      toast({ title: "No Duplicates", description: "No duplicate drafts found", variant: "default" });
      return;
    }

    // Confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete ${duplicateDrafts.length} duplicate draft(s)? (${duplicateDrafts.join(', ')})\n\nOriginal drafts will be kept. This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      // Delete each duplicate draft
      const deletePromises = duplicateDrafts.map(draftLetter =>
        fetch(`/api/transfer-planner/drafts/${searchedId}/${draftLetter}`, {
          method: "DELETE"
        })
      );

      const results = await Promise.all(deletePromises);
      const successCount = results.filter(r => r.ok).length;

      // If the active draft was deleted, switch to Base
      if (duplicateDrafts.includes(activeDraft)) {
        switchToDraft("Base");
      }

      // Reload drafts
      await loadDrafts();

      if (successCount === duplicateDrafts.length) {
        toast({ 
          title: "Duplicates Deleted", 
          description: `Successfully deleted ${successCount} duplicate draft(s)` 
        });
      } else {
        toast({ 
          title: "Partial Success", 
          description: `Deleted ${successCount} of ${duplicateDrafts.length} duplicate draft(s)`,
          variant: "default"
        });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete duplicate drafts", variant: "destructive" });
    }
  };


  // Auto-save to Draft A when first transfer is made
  useEffect(() => {
    const hasTransfers = Object.values(gameweekTransfers).some(gw => 
      gw.completed.length > 0 || gw.transferredOut.length > 0
    );

    if (hasTransfers && activeDraft === "Base" && searchedId) {
      // Auto-create and save Draft A
      setActiveDraft("A");
      
      // Auto-save Draft A immediately
      fetch("/api/transfer-planner/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          managerId: parseInt(searchedId),
          draftLetter: "A",
          gameweekTransfers,
          mode: "manual",
          teamBank: calculateBankAfterTransfers(),
          teamValue: 0,
          totalProjectedPoints: 0,
          totalTransfersUsed: Object.values(gameweekTransfers).reduce((sum, gw) => sum + gw.completed.length, 0)
        })
      }).then(response => {
        if (response.ok) {
          setHasUnsavedChanges(false);
          loadDrafts();
          toast({ title: "Draft A Created & Saved", description: "Your transfers are now in Draft A" });
        }
      }).catch(() => {
        setHasUnsavedChanges(true);
        toast({ title: "Draft A Created", description: "Your transfers are now in Draft A (save manually)" });
      });
    } else if (hasTransfers && activeDraft !== "Base") {
      setHasUnsavedChanges(true);
    }
  }, [gameweekTransfers]);

  // Load drafts when manager changes and auto-select/create Draft A
  useEffect(() => {
    if (!searchedId) return;
    
    let isActive = true;
    
    const initializeDrafts = async () => {
      try {
        await loadDrafts();
        
        if (!isActive) return;
        
        // After loading drafts, check if Draft A exists
        const response = await fetch(`/api/transfer-planner/drafts/${searchedId}`);
        if (!response.ok) {
          if (isActive) setActiveDraft("A");
          return;
        }
        
        const data = await response.json();
        const drafts = data.drafts || [];
        const draftAExists = drafts.some((d: any) => d.draftLetter === 'A');
        
        if (!isActive) return;
        
        if (draftAExists) {
          // Draft A exists, switch to it
          await switchToDraft('A');
        } else {
          // Draft A doesn't exist, create it (starts with no transfers/chips like Base)
          // Get captain and vice-captain from current team
          const captainPick = teamData?.picks.find(p => p.is_captain);
          const viceCaptainPick = teamData?.picks.find(p => p.is_vice_captain);
          const captainPlayer = captainPick ? getPlayerById(captainPick.element) : null;
          const viceCaptainPlayer = viceCaptainPick ? getPlayerById(viceCaptainPick.element) : null;
          
          const createResponse = await fetch("/api/transfer-planner/drafts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              managerId: parseInt(searchedId),
              draftLetter: "A",
              gameweekTransfers: {}, // Start with no transfers (same as Base)
              plannedChips: {}, // Start with no chips (same as Base)
              mode: "manual",
              teamBank: teamData?.transfers.bank || 0,
              teamValue: 0,
              totalProjectedPoints: 0,
              totalTransfersUsed: 0,
              captainPlayerId: captainPick?.element || null,
              captainPlayerName: captainPlayer?.web_name || null,
              viceCaptainPlayerId: viceCaptainPick?.element || null,
              viceCaptainPlayerName: viceCaptainPlayer?.web_name || null
            })
          });
          
          if (!isActive) return;
          
          if (createResponse.ok) {
            await loadDrafts();
            if (isActive) {
              await switchToDraft('A');
              toast({ title: "Draft A Created", description: "Draft A created as a copy of your current team" });
            }
          } else {
            if (isActive) setActiveDraft("A");
          }
        }
      } catch (error) {
        console.error("Error initializing drafts:", error);
        if (isActive) setActiveDraft("A");
      }
    };
    
    initializeDrafts();
    
    return () => {
      isActive = false;
    };
  }, [searchedId]);

  // Check if there are empty slots (transferred out players)
  const hasEmptySlots = manualLineup.some(pick => pick.is_transferred_out);

  const nextGameweeks = getNextGameweeks();

  // Jersey color helper functions
  const getPlayerTeam = (player: any) => {
    return bootstrapData?.teams.find(t => t.id === player.team);
  };

  const getTeamJerseyColor = (teamId: number): string => {
    const jerseyColors: Record<number, string> = {
      1: '#EF0107',      // Arsenal - Red
      2: '#95BFE5',      // Aston Villa - Claret & Blue (Light Blue)
      3: '#8B0000',      // Burnley - Dark Red (not in current PL)
      4: '#8B0000',      // Bournemouth - Dark Red/Black
      5: '#FDB913',      // Brentford - Red & White (Gold)
      6: '#0057B8',      // Brighton - Blue & White
      7: '#034694',      // Chelsea - Dark Blue
      8: '#1B458F',      // Crystal Palace - Blue & Pink
      9: '#003399',      // Everton - Dark Blue
      10: '#FFFFFF',     // Fulham - White
      11: '#FFFFFF',     // Leeds - White (not in current PL)
      12: '#C8102E',     // Liverpool - Red
      13: '#6CABDD',     // Man City - Sky Blue
      14: '#DA291C',     // Man Utd - Red
      15: '#241F20',     // Newcastle - Black & White
      16: '#DA020E',     // Nottm Forest - Red
      17: '#1B458F',     // Sunderland - Blue (not in current PL)
      18: '#FFFFFF',     // Spurs (Tottenham) - White
      19: '#FBEE23',     // West Ham - Claret & Blue (Gold)
      20: '#FDB913'      // Wolves - Gold & Black
    };
    
    return jerseyColors[teamId] || '#9CA3AF';
  };

  const getTextColor = (bgColor: string): string => {
    const hex = bgColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? '#000000' : '#FFFFFF';
  };

  const getJerseyImageUrl = (teamCode: number, isGoalkeeper: boolean = false): string => {
    const suffix = isGoalkeeper ? '_1' : '';
    return `https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_${teamCode}${suffix}-110.webp`;
  };

  const getTeamCode = (team: any): number => {
    return team?.code || 0;
  };

  const PlayerActionPopup = ({ pick, player, actualIndex, isBench = false }: { pick: TeamPick, player: any, actualIndex: number, isBench?: boolean }) => {
    if (isBench) {
      console.log(`🔧 POPUP DEBUG: ${player.web_name} - isBench=${isBench}, actualIndex=${actualIndex}, position=${pick.position}, showBenchButtons=${isBench && actualIndex > 0}`);
    }
    return (
      <>
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/50 z-[60]"
          onClick={() => setSelectedPlayer(null)}
          data-testid={`${isBench ? 'bench' : 'list'}-backdrop-${pick.element}`}
        />
        
        {/* Centered Popup */}
        <div 
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-300 dark:border-gray-600 overflow-hidden w-[min(90vw,360px)] max-h-[85vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
          data-testid={`${isBench ? 'bench' : 'list'}-actions-${pick.element}`}
        >
          {/* Header with player info */}
          <div className="relative bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-700 dark:to-blue-800 px-4 sm:px-5 py-4">
            <div className="text-white text-base sm:text-lg font-bold text-center mb-2">{player.web_name}</div>
            <div className="flex justify-center items-center gap-2 sm:gap-3 text-white/90 text-xs sm:text-sm mb-2">
              <span>{getTeamName(player.team)}</span>
              <span>•</span>
              <span>{getPositionShortName(player.element_type)}</span>
              <span>•</span>
              <span>{player.selected_by_percent}%</span>
            </div>
            <div className="flex flex-wrap justify-center items-center gap-x-3 gap-y-1 text-white/95 text-xs font-medium">
              <span>Buy: £{(pick.purchase_price ? pick.purchase_price / 10 : player.now_cost / 10).toFixed(1)}m</span>
              <span>Current: £{(player.now_cost / 10).toFixed(1)}m</span>
              <span>Sell: £{getSellingPrice(pick).toFixed(1)}m</span>
            </div>
            <button
              className="absolute right-2 top-3 text-white hover:text-gray-200 transition-colors p-1"
              onClick={(e) => { e.stopPropagation(); setSelectedPlayer(null); }}
              data-testid={`${isBench ? 'bench' : 'list'}-close-${pick.element}`}
              aria-label="Close"
            >
              <X className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </div>
          
          {/* Switch Player Option */}
          {!isBench ? (
            <Select onValueChange={(value) => { swapPlayers(actualIndex, parseInt(value)); setSelectedPlayer(null); }}>
              <SelectTrigger className="w-full h-14 sm:h-12 rounded-none border-0 border-b border-gray-200 dark:border-gray-700 bg-sky-50 hover:bg-sky-100 dark:bg-sky-900 dark:hover:bg-sky-800 text-base sm:text-lg font-semibold text-gray-900 dark:text-white [&>svg]:hidden [&_span]:text-base [&_span]:sm:text-lg [&_span]:font-semibold" data-testid={`${isBench ? 'bench' : 'list'}-swap-${pick.element}`}>
                <span className="w-full text-center text-base sm:text-lg font-semibold">Switch Player</span>
              </SelectTrigger>
              <SelectContent className="z-[200]">
                {manualLineup.slice(11, 15).map((benchPick, benchIndex) => {
                  const benchPlayer = getPlayerById(benchPick.element);
                  const startingPlayer = getPlayerById(pick.element);
                  if (startingPlayer?.element_type === 1 && benchPlayer?.element_type !== 1) return null;
                  if (startingPlayer?.element_type !== 1 && benchPlayer?.element_type === 1) return null;
                  if (startingPlayer?.element_type === 2 && benchPlayer?.element_type !== 2) {
                    const starting11 = manualLineup.slice(0, 11);
                    const defendersInStarting = starting11.filter(p => { const pl = getPlayerById(p.element); return pl?.element_type === 2; }).length;
                    if (defendersInStarting <= 3) return null;
                  }
                  return (<SelectItem key={benchPick.element} value={benchIndex.toString()}>{benchPlayer?.web_name}</SelectItem>);
                })}
              </SelectContent>
            </Select>
          ) : (
            <Select onValueChange={(value) => { swapPlayers(parseInt(value), actualIndex); setSelectedPlayer(null); }}>
              <SelectTrigger className="w-full h-14 sm:h-12 rounded-none border-0 border-b border-gray-200 dark:border-gray-700 bg-sky-50 hover:bg-sky-100 dark:bg-sky-900 dark:hover:bg-sky-800 text-base sm:text-lg font-semibold text-gray-900 dark:text-white [&>svg]:hidden [&_span]:text-base [&_span]:sm:text-lg [&_span]:font-semibold" data-testid={`bench-swap-${pick.element}`}>
                <span className="w-full text-center text-base sm:text-lg font-semibold">Switch Player</span>
              </SelectTrigger>
              <SelectContent className="z-[200]">
                {/* Starting 11 — position-validated */}
                {manualLineup.slice(0, 11).map((startingPick) => {
                  const startingPlayer = getPlayerById(startingPick.element);
                  const benchPlayer = getPlayerById(pick.element);
                  if (benchPlayer?.element_type === 1 && startingPlayer?.element_type !== 1) return null;
                  if (benchPlayer?.element_type !== 1 && startingPlayer?.element_type === 1) return null;
                  if (benchPlayer?.element_type !== 2 && startingPlayer?.element_type === 2) {
                    const starting11 = manualLineup.slice(0, 11);
                    const defendersInStarting = starting11.filter(p => { const pl = getPlayerById(p.element); return pl?.element_type === 2; }).length;
                    if (defendersInStarting <= 3) return null;
                  }
                  const startingIndex = manualLineup.findIndex(p => p.position === startingPick.position);
                  return (<SelectItem key={startingPick.element} value={startingIndex.toString()}>{startingPlayer?.web_name} (Starting)</SelectItem>);
                })}
                {/* Other bench players — free swap to reorder bench priority */}
                {manualLineup.slice(11, 15).map((benchPick, bi) => {
                  if (benchPick.element === pick.element) return null;
                  const bp = getPlayerById(benchPick.element);
                  const benchIdx = 11 + bi;
                  return (<SelectItem key={benchPick.element} value={benchIdx.toString()}>{bp?.web_name} (Bench)</SelectItem>);
                })}
              </SelectContent>
            </Select>
          )}
          
          <button 
            className="w-full h-14 sm:h-12 border-b border-gray-200 dark:border-gray-700 bg-sky-50 hover:bg-sky-100 dark:bg-sky-900 dark:hover:bg-sky-800 font-semibold text-base sm:text-lg text-gray-900 dark:text-white transition-colors" 
            onClick={() => handleTransferOut(pick)} 
            data-testid={`${isBench ? 'bench' : 'list'}-transfer-out-${pick.element}`}
          >
            Transfer Out
          </button>
          {!pick.is_captain && (
            <button 
              className="w-full h-14 sm:h-12 border-b border-gray-200 dark:border-gray-700 bg-sky-50 hover:bg-sky-100 dark:bg-sky-900 dark:hover:bg-sky-800 font-semibold text-base sm:text-lg text-gray-900 dark:text-white transition-colors" 
              onClick={() => handleSetCaptain(pick.element)} 
              data-testid={`${isBench ? 'bench' : 'list'}-make-captain-${pick.element}`}
            >
              Make Captain
            </button>
          )}
          {!pick.is_vice_captain && (
            <button 
              className="w-full h-14 sm:h-12 border-b border-gray-200 dark:border-gray-700 bg-sky-50 hover:bg-sky-100 dark:bg-sky-900 dark:hover:bg-sky-800 font-semibold text-base sm:text-lg text-gray-900 dark:text-white transition-colors" 
              onClick={() => handleSetViceCaptain(pick.element)} 
              data-testid={`${isBench ? 'bench' : 'list'}-make-vice-${pick.element}`}
            >
              Make Vice Captain
            </button>
          )}
          <button 
            className="w-full h-14 sm:h-12 border-b border-gray-200 dark:border-gray-700 bg-sky-50 hover:bg-sky-100 dark:bg-sky-900 dark:hover:bg-sky-800 font-semibold text-base sm:text-lg text-gray-900 dark:text-white transition-colors" 
            onClick={() => { setSelectedPlayer(null); openBuyPriceDialog(pick.element, (pick.purchase_price || 0) / 10); }} 
            data-testid={`${isBench ? 'bench' : 'list'}-edit-buy-price-${pick.element}`}
          >
            Edit Buy Price
          </button>
          <div className="p-3 border-t border-gray-200 dark:border-gray-700">
            <PlayerPopupDetails player={player} />
          </div>
        </div>
      </>
    );
  };

  return (
    <>
      
      <div className="container mx-auto px-3 sm:px-4 py-2 md:p-4 lg:p-6 space-y-3 md:space-y-4">
      {/* Header - Compact */}
      <div className="flex items-center gap-2 mb-1">
        <div className="p-1.5 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
          <Target className="h-4 w-4 md:h-5 md:w-5 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-lg md:text-xl font-bold">Transfer Planner</h1>
          <p className="text-xs text-muted-foreground hidden sm:block">Plan transfers & optimise your lineup</p>
        </div>
      </div>

      {/* Manager Search Section - Compact */}
      <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-md">
        <CardContent className="p-2 sm:p-3">
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
            <Input
              id="manager-id"
              type="text"
              placeholder="Enter Manager ID or FPL URL"
              value={managerId}
              onChange={(e) => {
                const extractedId = extractManagerId(e.target.value);
                setManagerId(extractedId);
              }}
              onKeyPress={handleKeyPress}
              className="flex-1 h-9 text-sm border-gray-300 focus:border-purple-500 focus:ring-purple-500"
              data-testid="input-manager-id"
              disabled={isLoadingTeam}
            />
            <div className="flex gap-2">
              <Button 
                onClick={handleSearch} 
                disabled={!managerId.trim() || isLoadingTeam}
                className="flex-1 sm:flex-none h-9 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-4 text-sm"
                data-testid="button-search-manager"
              >
                <Search className="h-4 w-4 mr-1" />
                {isLoadingTeam ? "..." : "Load"}
              </Button>
              <FplConnectDialog />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Session expiry notification for logged-in users */}
      {useFallbackEndpoint && isOwnTeam && (() => {
        const currentGW = bootstrapData?.events.find((e: any) => e.is_current)?.id || 
                         bootstrapData?.events.filter((e: any) => e.finished).sort((a: any, b: any) => b.id - a.id)[0]?.id || 1;
        const upcomingGW = currentGW + 1;
        
        return (
          <Alert className="bg-blue-50 border-blue-200">
            <AlertDescription className="text-sm text-blue-800">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  FPL session expired. Please reconnect to sync your latest GW {upcomingGW} team.
                </div>
              </div>
            </AlertDescription>
          </Alert>
        );
      })()}

      {/* Notification for non-logged-in users */}
      {!user && searchedId && (() => {
        const currentGW = bootstrapData?.events.find((e: any) => e.is_current)?.id || 
                         bootstrapData?.events.filter((e: any) => e.finished).sort((a: any, b: any) => b.id - a.id)[0]?.id || 1;
        const upcomingGW = currentGW + 1;
        
        return (
          <Alert className="bg-blue-50 border-blue-200">
            <AlertDescription className="text-sm text-blue-800">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  The transfer planner is based on your team from GW {currentGW}. Login to FPL Dilemmas, and connect your FPL account to plan transfers based on your latest team from GW {upcomingGW}.
                </div>
              </div>
            </AlertDescription>
          </Alert>
        );
      })()}

      {/* Draft Selection Section - Collapsed by default */}
      {searchedId && teamData && selectedGameweek && (
        <Collapsible open={isDraftSelectionOpen} onOpenChange={setIsDraftSelectionOpen}>
          <Card className="bg-background shadow-sm border">
            <CollapsibleTrigger asChild>
              <CardHeader className="py-3 px-3 sm:px-6 cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <List className="h-5 w-5 text-blue-600" />
                    <span className="text-base sm:text-lg font-semibold">Draft Selection</span>
                    <Badge variant={activeDraft === "Base" ? "secondary" : "default"} className="text-xs sm:text-sm px-2 py-0.5">
                      {activeDraft === "Base" ? "Base" : `Draft ${activeDraft}`}
                    </Badge>
                    {isSaving && activeDraft !== "Base" && (
                      <span className="text-xs sm:text-sm text-blue-600 animate-pulse">Saving...</span>
                    )}
                    {!isSaving && lastSavedAt && activeDraft !== "Base" && (
                      <span className="text-xs sm:text-sm text-green-600">✓</span>
                    )}
                  </div>
                  {isDraftSelectionOpen ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 pb-4 px-3 sm:px-6 space-y-3">
                {/* Draft Buttons */}
                <div className="flex gap-2 flex-wrap items-center">
                  {savedDrafts.map((draft: any) => {
                    const draftChips = getDraftChips(draft.draftLetter);
                    const chipCount = Object.keys(draftChips).filter(gw => draftChips[parseInt(gw)] !== null).length;
                    
                    return (
                      <TooltipProvider key={draft.draftLetter}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              onClick={() => switchToDraft(draft.draftLetter)}
                              variant={activeDraft === draft.draftLetter ? "default" : "outline"}
                              className="relative h-8 sm:h-9 text-sm sm:text-base px-3"
                              data-testid={`button-switch-draft-${draft.draftLetter}`}
                            >
                              {draft.draftLetter}
                              {chipCount > 0 && (
                                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-amber-500 text-white text-[9px] flex items-center justify-center font-bold">
                                  {chipCount}
                                </span>
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-md whitespace-pre-line text-left">
                            <div className="font-semibold mb-1">Draft {draft.draftLetter}</div>
                            <div className="text-sm mb-2">{getDraftTooltipContent(draft)}</div>
                            {chipCount > 0 && (
                              <div className="border-t pt-2 mt-2">
                                <div className="font-semibold text-xs mb-1">Planned Chips:</div>
                                <div className="space-y-1">
                                  {Object.entries(draftChips)
                                    .filter(([_, chipType]) => chipType !== null)
                                    .sort(([gwA], [gwB]) => parseInt(gwA) - parseInt(gwB))
                                    .map(([gameweek, chipType]) => (
                                      <div key={gameweek} className="text-xs flex items-center gap-1">
                                        <span className={`font-semibold ${getChipIconColor(chipType as ChipType)}`}>
                                          GW{gameweek}:
                                        </span>
                                        <span>{getChipDisplayNameWithNumber(chipType as ChipType)}</span>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}

                  {/* New Draft Button */}
                  {savedDrafts.length < 5 && (
                    <Button
                      onClick={createNewDraft}
                      variant="outline"
                      className="h-8 sm:h-9 gap-1 border-dashed text-sm sm:text-base px-3"
                      data-testid="button-new-draft"
                    >
                      <Plus className="h-4 w-4" />
                      New
                    </Button>
                  )}
                </div>

                {/* Action Buttons */}
                {activeDraft !== "Base" && (
                  <div className="flex gap-2 flex-wrap items-center pt-2 border-t">
                    <Button
                      onClick={() => saveCurrentDraft()}
                      variant="default"
                      disabled={!hasUnsavedChanges}
                      className="h-8 text-sm px-3"
                      data-testid="button-save-draft"
                    >
                      <Save className="h-3.5 w-3.5 mr-1" />
                      Save {hasUnsavedChanges && "●"}
                    </Button>
                    
                    <Button
                      onClick={duplicateCurrentDraft}
                      variant="outline"
                      className="h-8 text-sm px-3"
                      data-testid="button-duplicate-draft"
                    >
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      Duplicate
                    </Button>
                    
                    <Button
                      onClick={resetDraftAToBase}
                      variant="outline"
                      className="h-8 text-sm px-3 text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                      data-testid={`button-reset-draft-${activeDraft.toLowerCase()}`}
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1" />
                      Reset to Base
                    </Button>
                    
                    {activeDraft !== "A" && (
                      <Button
                        onClick={deleteCurrentDraft}
                        variant="outline"
                        className="h-8 text-sm px-3 text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950/20"
                        data-testid="button-delete-draft"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Delete
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Chip Selection */}
      {searchedId && teamData && selectedGameweek && (
        <Collapsible open={isChipsPlanningOpen} onOpenChange={setIsChipsPlanningOpen}>
          <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-background">
            <CollapsibleTrigger asChild>
              <CardHeader className="px-3 sm:px-6 pb-2 md:pb-4 cursor-pointer hover:bg-muted/50 transition-colors" data-testid="button-toggle-chips-planning">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2" data-testid="text-chips-planning-title">
                    <Sparkles className="h-5 w-5 text-amber-600" />
                    <span className="text-base sm:text-lg font-semibold">Chip Selection</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="inline-flex items-center">
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="w-80 p-4">
                          <div className="space-y-2 text-sm">
                            <p className="font-semibold">About FPL Chips:</p>
                            <p>Each chip can be used twice per season. Plan ahead to maximize their impact!</p>
                            <div className="border-t pt-2 mt-2 space-y-1">
                              <p className="font-semibold text-xs">Chip Availability Windows:</p>
                              <ul className="text-xs space-y-0.5 pl-3 list-disc">
                                <li>First set of chips must be used before GW 19</li>
                                <li>Second set of chips available from GW 20 onwards</li>
                              </ul>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  {isChipsPlanningOpen ? (
                    <ChevronUp className="h-5 w-5 text-amber-700" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-amber-700" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="px-3 sm:px-6 space-y-3 md:space-y-4 pt-2 md:pt-4" data-testid="section-chips-planning">
            {/* Important Chip Information */}
            <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-xs md:text-sm">
                <div className="space-y-1">
                  {historyData?.chips && historyData.chips.length > 0 ? (
                    <p>
                      <strong>Chips Used:</strong>{' '}
                      {(() => {
                        const chipCounts: Record<string, number> = {};
                        return historyData.chips.map((chip, index) => {
                          const chipType = chip.name;
                          const usedIndex = chipCounts[chipType] || 0;
                          chipCounts[chipType] = usedIndex + 1;
                          const displayName = getUsedChipDisplayName(chipType, usedIndex);
                          return (
                            <span key={index}>
                              {index > 0 && ', '}
                              {displayName} (GW{chip.event})
                            </span>
                          );
                        });
                      })()}
                    </p>
                  ) : (
                    <p><strong>Chips Used:</strong> None yet</p>
                  )}
                </div>
              </AlertDescription>
            </Alert>

            {/* Chips Availability Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
              {(['wildcard', '3xc', 'bboost', 'freehit'] as ChipType[]).map(chipType => {
                const remaining = getRemainingChips()[chipType];
                const used = 2 - remaining;
                return (
                  <div key={chipType} className="p-3 rounded-lg border bg-white dark:bg-background">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs md:text-sm font-semibold">{getChipDisplayName(chipType)}</span>
                      <Badge variant={remaining > 0 ? "default" : "secondary"} className="text-xs">
                        {remaining} left
                      </Badge>
                    </div>
                    <p className="text-[10px] md:text-xs text-muted-foreground">{getChipDescription(chipType)}</p>
                  </div>
                );
              })}
            </div>

            {/* Chip Selection for Upcoming Gameweeks */}
            <div className="border-t pt-3">
              <h4 className="text-xs md:text-sm font-semibold mb-2">Plan Chips for Upcoming Gameweeks</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {getNextGameweeks().map((gw) => {
                  const remainingChips = getRemainingChips();
                  const selectedChip = plannedChips[gw.id];
                  
                  return (
                    <div key={gw.id} className="flex items-center gap-2">
                      <span className="text-xs font-medium min-w-[45px]">GW {gw.id}:</span>
                      <Select
                        value={selectedChip || "none"}
                        onValueChange={(value) => {
                          if (value === "none") {
                            handleChipSelection(gw.id, null);
                          } else {
                            handleChipSelection(gw.id, value as ChipType);
                          }
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs flex-1" data-testid={`chip-selector-gw${gw.id}`}>
                          <SelectValue placeholder="No chip planned" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No chip planned</SelectItem>
                          {getAvailableChipsForGameweek(gw.id).map(chipType => (
                            <SelectItem
                              key={chipType}
                              value={chipType}
                            >
                              {getChipDisplayNameWithNumber(chipType)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedChip && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleChipSelection(gw.id, null)}
                          className="h-7 w-7 p-0"
                          data-testid={`clear-chip-gw${gw.id}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Planned Chips Summary */}
            {Object.keys(plannedChips).length > 0 && (
              <div className="border-t pt-3">
                <h4 className="text-xs md:text-sm font-semibold mb-2 flex items-center gap-2">
                  <Calendar className="h-3 w-3 md:h-4 md:w-4 text-amber-600" />
                  Planned Chips Summary
                </h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(plannedChips)
                    .filter(([_, chipType]) => chipType !== null)
                    .map(([gameweek, chipType]) => (
                      <Badge key={gameweek} className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                        GW{gameweek}: {getChipDisplayNameWithNumber(chipType as ChipType)}
                      </Badge>
                    ))}
                </div>
              </div>
            )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Active Chip Banner - Shows when FPL account has an active chip */}
      {searchedId && teamData?.active_chip && isOwnTeam && selectedGameweek && (
        <Alert className="border-purple-300 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20">
          <Sparkles className="h-4 w-4 text-purple-600" />
          <AlertDescription className="text-sm text-purple-800 dark:text-purple-200">
            <span className="font-semibold">
              {teamData.active_chip.toUpperCase()} Active
            </span>
            {' '}- Synced from your FPL account. 
            {(teamData.active_chip === 'wildcard' || teamData.active_chip === 'freehit') && (
              <span className="text-purple-600 dark:text-purple-300"> Unlimited transfers available for GW {(() => {
                const nextEvent = bootstrapData?.events.find(e => e.is_next);
                return nextEvent?.id || selectedGameweek;
              })()}!</span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Team Summary Stats */}
      {searchedId && teamData && selectedGameweek && (
        <Collapsible open={isTeamSummaryOpen} onOpenChange={setIsTeamSummaryOpen}>
          <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white dark:from-green-950/20 dark:to-background">
            <CollapsibleTrigger asChild>
              <CardHeader className="py-3 px-3 sm:px-6 cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <span className="text-base sm:text-lg font-semibold">Team Summary</span>
                    <Badge variant={activeDraft === "Base" ? "secondary" : "default"} className="text-xs sm:text-sm px-2 py-0.5">
                      {activeDraft === "Base" ? "Base" : `Draft ${activeDraft}`}
                    </Badge>
                  </div>
                  {isTeamSummaryOpen ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="px-3 sm:px-6 pt-0">
                {/* Transfer undo buttons */}
                <div className="flex gap-1 md:gap-2 flex-wrap mb-4">
                  {(completedTransfers.length > 0 || transferredOutPlayers.length > 0) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResetTransfers}
                      className="text-orange-600 border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/20 h-7 px-2 md:h-9 md:px-3"
                      data-testid="button-reset-gw-transfers"
                    >
                      <RotateCcw className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
                      <span className="hidden sm:inline">Undo This GW Transfers</span>
                    </Button>
                  )}
                  {Object.keys(gameweekTransfers).some(gw => 
                    gameweekTransfers[parseInt(gw)]?.completed?.length > 0 || 
                    gameweekTransfers[parseInt(gw)]?.transferredOut?.length > 0
                  ) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResetAllTransfers}
                      className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950/20 h-7 px-2 md:h-9 md:px-3"
                      data-testid="button-reset-all-transfers"
                    >
                      <X className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
                      <span className="hidden sm:inline">Undo All GW Transfers</span>
                    </Button>
                  )}
                </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 sm:gap-4">
              {/* Formation */}
              <div className="p-3 sm:p-4 rounded-lg bg-white dark:bg-gray-900 border">
                <div className="text-xs sm:text-sm text-muted-foreground mb-1">Formation</div>
                <div className="text-xl sm:text-2xl font-bold text-indigo-600">
                  {(() => {
                    const starting11 = manualLineup.slice(0, 11);
                    const defs = starting11.filter(p => getPlayerById(p.element)?.element_type === 2).length;
                    const mids = starting11.filter(p => getPlayerById(p.element)?.element_type === 3).length;
                    const fwds = starting11.filter(p => getPlayerById(p.element)?.element_type === 4).length;
                    return `${defs}-${mids}-${fwds}`;
                  })()}
                </div>
              </div>

              {/* Total Projected Points for Selected GW */}
              <div className="p-3 sm:p-4 rounded-lg bg-white dark:bg-gray-900 border">
                <div className="text-xs sm:text-sm text-muted-foreground mb-1 flex items-center gap-1">
                  <span>GW {selectedGameweek} xPts</span>
                  {plannedChips[selectedGameweek] && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Sparkles className="h-3 w-3 text-amber-600 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-medium">{getChipDisplayName(plannedChips[selectedGameweek]!)} {getChipNumber(plannedChips[selectedGameweek]!)} applied in GW {selectedGameweek}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                <div className="text-xl sm:text-2xl font-bold text-green-600">
                  {(() => {
                    const isBenchBoostActive = plannedChips[selectedGameweek] === 'bboost';
                    let total = 0;
                    const activePlayers = isBenchBoostActive ? manualLineup : manualLineup.slice(0, 11);
                    activePlayers.forEach((pick: TeamPick) => {
                      const points = getPlayerProjectedPoints(pick.element);
                      if (points !== null) {
                        total += points * (pick.multiplier || 1);
                      }
                    });
                    return total.toFixed(2);
                  })()}
                </div>
              </div>

              {/* Total Projected Points for Next 6 GWs */}
              <div className="p-3 sm:p-4 rounded-lg bg-white dark:bg-gray-900 border">
                <div className="text-xs sm:text-sm text-muted-foreground mb-1 flex items-center gap-2">
                  <span>
                    {nextGameweeks.length > 0 
                      ? `GW ${nextGameweeks[0].id}-${nextGameweeks[nextGameweeks.length - 1].id} xPts`
                      : 'Next 6 GWs xPts'}
                  </span>
                  {Object.keys(plannedChips).length > 0 && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="inline-flex">
                            <Sparkles className="h-3 w-3 text-amber-600" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs font-semibold mb-1">Chips Applied:</p>
                          {Object.entries(plannedChips)
                            .filter(([_, chip]) => chip !== null)
                            .map(([gw, chip]) => (
                              <p key={gw} className="text-xs">
                                GW{gw}: {getChipDisplayName(chip as ChipType)}
                              </p>
                            ))}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                <div className="text-xl sm:text-2xl font-bold text-blue-600" key={JSON.stringify(plannedChips) + JSON.stringify(optimizedLineups)}>
                  {(() => {
                    if (!playerProjections6GW || !Array.isArray(playerProjections6GW) || !teamData?.picks) return '0.0';
                    
                    let grandTotal = 0;
                    const nextGWs = nextGameweeks.map(gw => gw.id);
                    
                    // For each gameweek, calculate the lineup's points for THAT specific gameweek
                    nextGWs.forEach(gw => {
                      // Check if there's an optimized lineup for this gameweek
                      let lineupForGW: TeamPick[];
                      
                      if (optimizedLineups[gw]) {
                        // Use optimized lineup
                        lineupForGW = optimizedLineups[gw];
                      } else {
                        // Get the baseline lineup for this specific gameweek (with cumulative transfers applied)
                        lineupForGW = getBaselineLineup(gw);
                      }
                      
                      // Check if Bench Boost is planned for this gameweek
                      const isBenchBoostActive = plannedChips[gw] === 'bboost';
                      const playersToInclude = isBenchBoostActive ? lineupForGW : lineupForGW.slice(0, 11);
                      
                      // Check if Triple Captain is active for THIS gameweek
                      const isTripleCaptainActive = plannedChips[gw] === '3xc';
                      
                      playersToInclude.forEach((pick: TeamPick) => {
                        const playerData = playerProjections6GW.find((p: any) => p.playerId === pick.element);
                        const gwPoints = playerData?.gameweekProjections?.[gw.toString()] || 0;
                        
                        grandTotal += gwPoints * (pick.multiplier || 1);
                      });
                    });
                    
                    return grandTotal.toFixed(2);
                  })()}
                </div>
              </div>

              {/* Cash in Bank */}
              <div className="p-3 sm:p-4 rounded-lg bg-white dark:bg-gray-900 border">
                <div className="text-xs sm:text-sm text-muted-foreground mb-1">Cash in Bank</div>
                <div className={`text-xl sm:text-2xl font-bold ${calculateInitialBank() < 0 ? 'text-red-600' : 'text-yellow-600'}`}>
                  £{calculateInitialBank().toFixed(1)}m
                </div>
              </div>

              {/* Transfers */}
              <div className="p-3 sm:p-4 rounded-lg bg-white dark:bg-gray-900 border">
                <div className="text-xs sm:text-sm text-muted-foreground mb-1 flex items-center gap-1">
                  <span>Transfers</span>
                  {(plannedChips[selectedGameweek] === 'freehit' || plannedChips[selectedGameweek] === 'wildcard') && (
                    <Sparkles className="h-3 w-3 text-amber-600" />
                  )}
                </div>
                <div className={`text-xl sm:text-2xl font-bold ${(() => {
                  const remaining = calculateTransfersRemaining();
                  return typeof remaining === 'number' && remaining < 0 ? 'text-red-600' : 'text-purple-600';
                })()}`}>
                  {calculateTransfersUsed()}/{calculateInitialTransfers()}
                </div>
                {(() => {
                  const remaining = calculateTransfersRemaining();
                  return typeof remaining === 'number' && remaining < 0 && (
                    <div className="text-xs text-red-600 mt-1">
                      {Math.abs(remaining) * 4} pts penalty
                    </div>
                  );
                })()}
              </div>

              {/* Cash in Bank After Transfers */}
              <div className="p-3 sm:p-4 rounded-lg bg-white dark:bg-gray-900 border">
                <div className="text-xs sm:text-sm text-muted-foreground mb-1">Cash After Transfers</div>
                <div className={`text-xl sm:text-2xl font-bold ${calculateBankAfterTransfers() < 0 ? 'text-red-600' : 'text-yellow-600'}`}>
                  £{calculateBankAfterTransfers().toFixed(1)}m
                </div>
                {calculateBankAfterTransfers() < 0 && (
                  <div className="text-xs text-red-600 mt-1">
                    These transfers may not be possible. But it depends on your actual sell value of the transferred out players.
                  </div>
                )}
              </div>
            </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Team Selection & Projected Points — side-by-side on desktop */}
      {searchedId && teamData && selectedGameweek && (
        <div className="flex flex-col lg:flex-row gap-4 items-start">
          {/* Left column: Team Selection */}
          <div className="w-full lg:w-[60%] flex-shrink-0">
        <Card ref={teamLineupRef} className="border-blue-200 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-background">
          <CardHeader className="py-3 px-3 sm:px-6">
            <div className="flex items-center justify-between gap-2">
              {/* Left: title */}
              <div className="flex items-center gap-2 shrink-0">
                <Users className="h-5 w-5 text-blue-600" />
                <span className="text-base sm:text-lg font-semibold">Team Selection</span>
              </div>
              {/* Centre: draft badge + chip */}
              <div className="flex items-center gap-2 justify-center">
                <Badge variant={activeDraft === "Base" ? "secondary" : "default"} className="text-xs sm:text-sm px-2 py-0.5">
                  {activeDraft === "Base" ? "Base" : `Draft ${activeDraft}`}
                </Badge>
                {(() => {
                  const currentChip = plannedChips[selectedGameweek];
                  if (currentChip) {
                    return (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="cursor-help">
                              <Badge 
                                variant="outline" 
                                className={`text-xs px-2 py-1 ${getChipIconColor(currentChip)} bg-amber-50 border-amber-300 dark:bg-amber-950/20 dark:border-amber-700`}
                              >
                                <Sparkles className="h-3 w-3 mr-1" />
                                {getChipDisplayNameWithNumber(currentChip)}
                              </Badge>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs font-semibold">{getChipDisplayName(currentChip)}</p>
                            <p className="text-xs text-muted-foreground">{getChipDescription(currentChip)}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  }
                  return null;
                })()}
              </div>
              {/* Right: spacer to balance layout */}
              <div className="shrink-0 w-[100px] sm:w-[130px]" />
            </div>
            {/* Gameweek Navigation Bar */}
            <div className="flex items-center gap-1 mt-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs sm:text-sm font-bold shrink-0 border-2 border-blue-400 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 disabled:opacity-40"
                disabled={nextGameweeks.findIndex(gw => gw.id === selectedGameweek) <= 0}
                onClick={() => {
                  const idx = nextGameweeks.findIndex(gw => gw.id === selectedGameweek);
                  if (idx > 0) { setSelectedPlayer(null); setSelectedGameweek(nextGameweeks[idx - 1].id); }
                }}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline ml-0.5">Prev</span>
              </Button>
              <div className="flex gap-1 flex-1 justify-center flex-wrap">
                {nextGameweeks.map(gw => (
                  <Button
                    key={gw.id}
                    variant={selectedGameweek === gw.id ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs font-semibold min-w-[2.5rem] px-2"
                    onClick={() => { setSelectedPlayer(null); setSelectedGameweek(gw.id); }}
                    data-testid={`gw-button-${gw.id}`}
                  >
                    GW{gw.id}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs sm:text-sm font-bold shrink-0 border-2 border-blue-400 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 disabled:opacity-40"
                disabled={nextGameweeks.findIndex(gw => gw.id === selectedGameweek) >= nextGameweeks.length - 1}
                onClick={() => {
                  const idx = nextGameweeks.findIndex(gw => gw.id === selectedGameweek);
                  if (idx < nextGameweeks.length - 1) { setSelectedPlayer(null); setSelectedGameweek(nextGameweeks[idx + 1].id); }
                }}
              >
                <span className="hidden sm:inline mr-0.5">Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            {/* View Toggle and Optimization Controls */}
            <div className="flex flex-col gap-3 mb-2">
              {/* All buttons in one row */}
              <div className="flex flex-wrap justify-center items-center gap-2">

                {/* Apply Recommended Transfers Button */}
                {selectedGameweek && activeDraft !== "Base" && recommendedTransfers?.gameweeks?.[selectedGameweek]?.recommendations?.length > 0 && (() => {
                  const gwData = recommendedTransfers.gameweeks[selectedGameweek];
                  const allRecommendations = gwData?.recommendations || [];
                  const freeTransfers = gwData?.freeTransfersAvailable || 1;
                  
                  // Check if recommendation is to roll transfer (no actual transfers recommended)
                  if (allRecommendations.length > 0 && allRecommendations[0].type === 'roll') {
                    return null;
                  }
                  
                  // Only show primary recommendations (filter by type, then limit to free transfers available)
                  const primaryOnlyRecs = allRecommendations.filter((rec: any) => rec.type === 'primary');
                  const recommendations = primaryOnlyRecs.slice(0, freeTransfers);
                  
                  if (recommendations.length === 0) return null;
                  
                  // Filter out already applied transfers
                  const unappliedRecs = recommendations.filter(rec => 
                    !completedTransfers.some(
                      transfer => 
                        transfer.outPlayerId === rec.playerOut.id && 
                        transfer.inPlayerId === rec.playerIn.id
                    )
                  );
                  
                  // Don't show button if all transfers already applied
                  if (unappliedRecs.length === 0) return null;
                  
                  const transferCount = unappliedRecs.length;
                  
                  return (
                    <Button
                      onClick={handleApplyRecommendedTransfers}
                      disabled={isLoadingRecommendations}
                      className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white"
                      data-testid="button-apply-recommended-transfers"
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Apply {transferCount} Recommended Transfer{transferCount > 1 ? 's' : ''}</span>
                      <span className="sm:hidden">Apply {transferCount} Transfer{transferCount > 1 ? 's' : ''}</span>
                    </Button>
                  );
                })()}

              </div>

              {/* Transfer Details - shown below the buttons */}
              {selectedGameweek && activeDraft !== "Base" && recommendedTransfers?.gameweeks?.[selectedGameweek]?.recommendations?.length > 0 && (() => {
                const gwData = recommendedTransfers.gameweeks[selectedGameweek];
                const allRecommendations = gwData?.recommendations || [];
                const freeTransfers = gwData?.freeTransfersAvailable || 1;
                
                // Check if recommendation is to roll transfer (no actual transfers recommended)
                if (allRecommendations.length > 0 && allRecommendations[0].type === 'roll') {
                  return null;
                }
                
                // Only show primary recommendations (filter by type, then limit to free transfers available)
                const primaryOnlyRecs = allRecommendations.filter((rec: any) => rec.type === 'primary');
                const recommendations = primaryOnlyRecs.slice(0, freeTransfers);
                
                if (recommendations.length === 0) return null;
                
                // Filter out already applied transfers
                const unappliedRecs = recommendations.filter(rec => 
                  !completedTransfers.some(
                    transfer => 
                      transfer.outPlayerId === rec.playerOut.id && 
                      transfer.inPlayerId === rec.playerIn.id
                  )
                );
                
                // Don't show details if no transfers to apply
                if (unappliedRecs.length === 0) return null;
                
                return (
                  <div className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5 text-center">
                    {unappliedRecs.map((rec, idx) => (
                      <p key={idx}>
                        {rec.playerOut?.webName} → {rec.playerIn?.webName} 
                        <span className="text-green-600 font-semibold ml-1">
                          (+{rec.pointsGain?.toFixed(2) || '0.00'} pts)
                        </span>
                      </p>
                    ))}
                  </div>
                );
              })()}
            </div>

            <div className="text-xs sm:text-sm text-muted-foreground mb-2 italic">
              Click on the player to transfer or swap or set as captain
            </div>

            <div>
              <div className="relative space-y-4">
                {/* Pitch overlay row — xPts left, Optimise right */}
                <div className="absolute top-2 left-2 right-2 z-10 flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowProjectedPoints(p => !p)}
                    className={`h-8 px-2 text-xs font-semibold shadow border-2 ${showProjectedPoints ? 'bg-white/90 dark:bg-gray-800/90 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300' : 'bg-gray-200 dark:bg-gray-700 border-gray-400 dark:border-gray-500 text-gray-500 dark:text-gray-400'}`}
                    title={showProjectedPoints ? 'Hide projected points' : 'Show projected points'}
                  >
                    {showProjectedPoints ? <Eye className="h-3.5 w-3.5 mr-1" /> : <EyeOff className="h-3.5 w-3.5 mr-1" />}
                    <span className="hidden sm:inline">xPts</span>
                  </Button>
                  <div className="flex items-center gap-1">
                  {selectedGameweek && isLineupOptimizedRef.current[getOptimizationKey(activeDraft, selectedGameweek)] ? (
                    <>
                      <div className="flex items-center gap-1 px-2 py-1 bg-green-600/90 rounded text-white text-[10px] sm:text-xs font-semibold shadow">
                        <Sparkles className="h-3 w-3" />
                        <span className="hidden sm:inline">Optimised</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (!selectedGameweek) return;
                          const optimizationKey = getOptimizationKey(activeDraft, selectedGameweek);
                          delete isLineupOptimizedRef.current[optimizationKey];
                          setOptimizedLineups(prev => {
                            const updated = { ...prev };
                            delete updated[selectedGameweek];
                            return updated;
                          });
                          if (activeDraft !== "Base" && searchedId) {
                            const updatedOptimizedLineups = { ...optimizedLineups };
                            delete updatedOptimizedLineups[selectedGameweek];
                            fetch("/api/transfer-planner/drafts", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                managerId: parseInt(searchedId),
                                draftLetter: activeDraft,
                                gameweekTransfers: JSON.parse(JSON.stringify(gameweekTransfers)),
                                plannedChips: JSON.parse(JSON.stringify(plannedChips)),
                                optimizedLineups: updatedOptimizedLineups,
                                mode: "manual",
                                teamBank: calculateBankAfterTransfers(),
                                teamValue: 0,
                                totalProjectedPoints: 0,
                              }),
                            });
                          }
                          toast({ title: "Lineup Reset", description: `Gameweek ${selectedGameweek} lineup restored to original.` });
                        }}
                        className="h-6 w-6 p-0 bg-white/80 hover:bg-white dark:bg-gray-800/80 dark:hover:bg-gray-800 rounded shadow text-gray-600 dark:text-gray-300"
                        title="Reset to original"
                      >
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => selectedGameweek && optimizeTeamLineup(selectedGameweek)}
                      disabled={!selectedGameweek || !playerProjections6GW}
                      className="h-8 px-3 text-xs sm:text-sm font-bold bg-green-600 hover:bg-green-500 text-white shadow-lg border-2 border-green-400"
                      data-testid="button-optimise-lineup"
                    >
                      <Sparkles className="h-4 w-4 mr-1.5" />
                      Optimise Lineup
                    </Button>
                  )}
                  </div>
                </div>
                <PitchView
                  players={manualLineup.slice(0, 11).map(pick => {
                    const player = getPlayerById(pick.element);
                    if (!player) return null;
                    const playerTeam = getPlayerTeam(player);
                    const projectedPoints = getPlayerProjectedPoints(pick.element);
                    const playerFixtures = getPlayerFixtures(pick.element, selectedGameweek);
                    const isEmptySlot = !!pick.is_transferred_out;
                    return {
                      element: pick.element,
                      element_type: player.element_type,
                      position: pick.position,
                      is_captain: pick.is_captain,
                      is_vice_captain: pick.is_vice_captain,
                      web_name: player.web_name,
                      team_short_name: playerTeam?.short_name,
                      team_id: player.team,
                      team_code: playerTeam?.code || playerTeam?.id || 0,
                      in_dreamteam: player.in_dreamteam,
                      is_transferred_in: isPlayerTransferredIn(pick),
                      is_selected: selectedPlayer === pick.element,
                      is_empty_slot: isEmptySlot,
                      points_display: !showProjectedPoints ? '' : pick.is_captain && projectedPoints !== null
                        ? `${(projectedPoints * (pick.multiplier > 1 ? pick.multiplier : 2)).toFixed(2)} (${projectedPoints.toFixed(2)})`
                        : projectedPoints !== null ? projectedPoints.toFixed(2) : '-',
                      fixtures: playerFixtures as PitchPlayerFixture[],
                      status: player.status,
                      chance_of_playing: player.chance_of_playing_next_round,
                      news: player.news,
                    };
                  }).filter(Boolean) as PitchPlayer[]}
                  benchPlayers={(() => {
                    const benchPicks = manualLineup.slice(11, 15);
                    const gkBench = benchPicks.find(pick => {
                      const player = getPlayerById(pick.element);
                      return player?.element_type === 1;
                    });
                    const outfieldBench = benchPicks
                      .filter(pick => {
                        const player = getPlayerById(pick.element);
                        return player?.element_type !== 1;
                      });
                    const reorderedBench = gkBench ? [gkBench, ...outfieldBench] : outfieldBench;
                    return reorderedBench.map(pick => {
                      const player = getPlayerById(pick.element);
                      if (!player) return null;
                      const playerTeam = getPlayerTeam(player);
                      const projectedPoints = getPlayerProjectedPoints(pick.element);
                      const benchFixtures = getPlayerFixtures(pick.element, selectedGameweek);
                      const isEmptySlot = !!pick.is_transferred_out;
                      return {
                        element: pick.element,
                        element_type: player.element_type,
                        position: pick.position,
                        is_captain: pick.is_captain,
                        is_vice_captain: pick.is_vice_captain,
                        web_name: player.web_name,
                        team_short_name: playerTeam?.short_name,
                        team_id: player.team,
                        team_code: playerTeam?.code || playerTeam?.id || 0,
                        in_dreamteam: player.in_dreamteam,
                        is_transferred_in: isPlayerTransferredIn(pick),
                        is_selected: selectedPlayer === pick.element,
                        is_empty_slot: isEmptySlot,
                        points_display: !showProjectedPoints ? '' : projectedPoints !== null ? projectedPoints.toFixed(2) : '-',
                        fixtures: benchFixtures as PitchPlayerFixture[],
                        status: player.status,
                        chance_of_playing: player.chance_of_playing_next_round,
                        news: player.news,
                      };
                    }).filter(Boolean) as PitchPlayer[];
                  })()}
                  onPlayerClick={(pitchPlayer) => {
                    setSelectedPlayer(selectedPlayer === pitchPlayer.element ? null : pitchPlayer.element);
                  }}
                  renderEmptySlot={(pitchPlayer) => (
                    <div key={`empty-${pitchPlayer.position}`} className="flex flex-col items-center w-[19%]" data-testid={`pitch-empty-${pitchPlayer.position}`}>
                      <div className="relative flex flex-col items-center">
                        <button
                          onClick={() => handleUndoTransfer(pitchPlayer.position)}
                          className="absolute top-1 right-1 z-10 w-4 h-4 sm:w-5 sm:h-5 bg-red-500 rounded-full flex items-center justify-center border border-white shadow-md text-white"
                          aria-label="Undo transfer out"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                        <div className="w-18 sm:w-22 md:w-28 border-2 border-dashed border-red-400 bg-red-900/10">
                          <div className="p-1">
                            <div className="w-full h-16 sm:h-20 md:h-24 flex items-center justify-center">
                              <span className="text-3xl sm:text-4xl font-bold text-red-400/50">?</span>
                            </div>
                          </div>
                          <div className="flex flex-col">
                            <div className="w-full px-1 py-0.5 bg-white/95 text-center">
                              <div className="text-[9px] sm:text-[11px] md:text-sm font-bold text-red-600 truncate">
                                {getPositionShortName(pitchPlayer.element_type)}
                              </div>
                            </div>
                            {showProjectedPoints && (
                              <div className="w-full px-2 py-0.5 bg-red-500 text-center">
                                <div className="text-[9px] sm:text-[11px] md:text-sm font-bold text-white truncate">-</div>
                              </div>
                            )}
                            <div className="w-full px-1 py-0.5 bg-gray-700 text-center">
                              <div className="text-[8px] sm:text-[10px] md:text-xs font-semibold text-white/90 truncate">-</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                />

                {/* Chip Selection Panel — below pitch view */}
                {(() => {
                  const allChips: ChipType[] = ['wildcard', '3xc', 'bboost', 'freehit'];
                  const currentChip = plannedChips[selectedGameweek] ?? null;
                  const remainingChips = getRemainingChips();

                  // Only show chips that still have remaining uses (or are currently applied)
                  const visibleChips = allChips.filter(chip =>
                    remainingChips[chip] > 0 || currentChip === chip
                  );

                  if (visibleChips.length === 0) return null;

                  const chipTheme: Record<ChipType, {
                    idle: string; active: string; disabled: string;
                    icon: string; dot: string;
                  }> = {
                    wildcard: {
                      idle:     'bg-white border-purple-200 text-purple-800 hover:bg-purple-50 hover:border-purple-400 dark:bg-background dark:border-purple-700 dark:text-purple-300 dark:hover:bg-purple-950/30',
                      active:   'bg-purple-100 border-purple-500 text-purple-900 ring-2 ring-purple-400/60 dark:bg-purple-900/30 dark:border-purple-400 dark:text-purple-200',
                      disabled: 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed dark:bg-muted/20 dark:border-muted dark:text-muted-foreground',
                      icon:     'text-purple-500 dark:text-purple-400',
                      dot:      'bg-purple-500',
                    },
                    '3xc': {
                      idle:     'bg-white border-amber-200 text-amber-800 hover:bg-amber-50 hover:border-amber-400 dark:bg-background dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-950/30',
                      active:   'bg-amber-100 border-amber-500 text-amber-900 ring-2 ring-amber-400/60 dark:bg-amber-900/30 dark:border-amber-400 dark:text-amber-200',
                      disabled: 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed dark:bg-muted/20 dark:border-muted dark:text-muted-foreground',
                      icon:     'text-amber-500 dark:text-amber-400',
                      dot:      'bg-amber-500',
                    },
                    bboost: {
                      idle:     'bg-white border-blue-200 text-blue-800 hover:bg-blue-50 hover:border-blue-400 dark:bg-background dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-950/30',
                      active:   'bg-blue-100 border-blue-500 text-blue-900 ring-2 ring-blue-400/60 dark:bg-blue-900/30 dark:border-blue-400 dark:text-blue-200',
                      disabled: 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed dark:bg-muted/20 dark:border-muted dark:text-muted-foreground',
                      icon:     'text-blue-500 dark:text-blue-400',
                      dot:      'bg-blue-500',
                    },
                    freehit: {
                      idle:     'bg-white border-green-200 text-green-800 hover:bg-green-50 hover:border-green-400 dark:bg-background dark:border-green-700 dark:text-green-300 dark:hover:bg-green-950/30',
                      active:   'bg-green-100 border-green-500 text-green-900 ring-2 ring-green-400/60 dark:bg-green-900/30 dark:border-green-400 dark:text-green-200',
                      disabled: 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed dark:bg-muted/20 dark:border-muted dark:text-muted-foreground',
                      icon:     'text-green-500 dark:text-green-400',
                      dot:      'bg-green-500',
                    },
                  };

                  return (
                    <div className="mx-1 mt-3 mb-1 rounded-xl border bg-muted/20 dark:bg-muted/10 p-2.5">
                      {/* Header */}
                      <div className="flex items-center gap-1.5 mb-2 px-0.5">
                        <Sparkles className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">
                          Apply chip to GW{selectedGameweek}
                        </span>
                        {currentChip && (
                          <span className={`ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${chipTheme[currentChip].dot} text-white`}>
                            {getChipDisplayName(currentChip)} applied
                          </span>
                        )}
                      </div>

                      {/* Chip buttons row */}
                      <div className="flex gap-1.5 flex-wrap">
                        {visibleChips.map(chip => {
                          const isActive = currentChip === chip;
                          const canUse = canChipBeUsedInGameweek(chip, selectedGameweek);

                          // Reason chip is unavailable for this GW
                          const plannedGW = Object.entries(plannedChips).find(
                            ([gw, c]) => c === chip && parseInt(gw) !== selectedGameweek
                          );
                          let statusNote: string | null = null;
                          if (!isActive && !canUse) {
                            if (plannedGW) {
                              statusNote = `GW${plannedGW[0]}`;
                            } else if (chip === 'wildcard') {
                              statusNote = selectedGameweek <= 19 ? 'GW20+' : 'GW1–19';
                            } else {
                              statusNote = 'N/A';
                            }
                          }

                          const theme = chipTheme[chip];
                          const btnClass = `relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all select-none flex-1 min-w-[64px] ${
                            isActive ? theme.active : canUse ? theme.idle : theme.disabled
                          }`;

                          return (
                            <button
                              key={chip}
                              disabled={!isActive && !canUse}
                              onClick={() => {
                                if (isActive) {
                                  handleChipSelection(selectedGameweek, null);
                                } else if (canUse) {
                                  handleChipSelection(selectedGameweek, chip);
                                }
                              }}
                              className={btnClass}
                              title={getChipDescription(chip)}
                            >
                              {/* Active checkmark badge */}
                              {isActive && (
                                <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-emerald-500 text-white text-[10px] flex items-center justify-center font-bold shadow-sm">✓</span>
                              )}
                              {/* Chip name */}
                              <span className={`font-semibold text-[11px] leading-tight ${isActive ? '' : canUse ? '' : 'text-gray-400'}`}>
                                {getChipDisplayName(chip)}
                              </span>
                              {/* Status note */}
                              {statusNote ? (
                                <span className="text-[9px] text-gray-400 leading-tight">Planned {statusNote}</span>
                              ) : isActive ? (
                                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 leading-tight font-medium">Tap to remove</span>
                              ) : (
                                <span className="text-[9px] opacity-60 leading-tight">Tap to apply</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {selectedPlayer && (() => {
                  const selectedPick = manualLineup.find(p => p.element === selectedPlayer);
                  if (!selectedPick) return null;
                  const player = getPlayerById(selectedPick.element);
                  if (!player) return null;
                  const actualIndex = manualLineup.findIndex(p => p.position === selectedPick.position);
                  const isBench = selectedPick.position > 11;
                  const indexOfResult = manualLineup.indexOf(selectedPick);
                  const benchIndex = isBench ? indexOfResult - 11 : 0;
                  if (isBench) {
                    console.log(`🔧 PITCH POPUP: ${player.web_name} - position=${selectedPick.position}, indexOf=${indexOfResult}, benchIndex=${benchIndex}, isBench=${isBench}`);
                  }
                  return <PlayerActionPopup pick={selectedPick} player={player} actualIndex={isBench ? benchIndex : actualIndex} isBench={isBench} />;
                })()}

                {/* Total Projected Points */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <span className="font-semibold">Total Projected Points (GW{selectedGameweek})</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {(() => {
                        const isBenchBoostActive = selectedGameweek ? plannedChips[selectedGameweek] === 'bboost' : false;
                        const activePlayers = isBenchBoostActive ? manualLineup : manualLineup.slice(0, 11);
                        return activePlayers
                          .reduce((total, pick) => {
                            const projectedPoints = getPlayerProjectedPoints(pick.element);
                            return total + (projectedPoints || 0) * (pick.multiplier || 1);
                          }, 0)
                          .toFixed(2);
                      })()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
          </div>
          {/* Right column: Projected Points */}
          <div className="w-full lg:w-[40%] min-w-0">
            <AllPlayersProjectionsTab
              selectedGameweek={selectedGameweek as number}
              transferredOutPlayers={transferredOutPlayers}
              onTransferIn={handleTransferIn}
              currentBank={calculateCurrentBank()}
              initialPositionFilter={projectionPositionFilter}
              scrollToView={scrollToProjections}
              onScrollComplete={() => setScrollToProjections(false)}
              teamData={teamData}
              savedDrafts={savedDrafts}
            />
          </div>
        </div>
      )}

      {/* Team Evolution Section */}

      {/* Team Evolution Section - Only show if there are transfers made for this draft in any gameweek */}
      {(() => {
        // Helper: Check if Team Evolution should be shown
        const shouldShowTeamEvolution = () => {
          if (!searchedId || !teamData || !selectedGameweek || !activeDraft) return false;
          if (activeDraft === "Base") return false;
          if (!gameweekTransfers || typeof gameweekTransfers !== 'object') return false;
          
          // Check if any gameweek has transfers
          return Object.keys(gameweekTransfers).some(gw => {
            const gwData = gameweekTransfers[parseInt(gw)];
            return gwData && (
              (gwData.completed && gwData.completed.length > 0) ||
              (gwData.transferredOut && gwData.transferredOut.length > 0)
            );
          });
        };
        
        if (!shouldShowTeamEvolution()) return null;
        
        return (
        <Collapsible open={isTeamEvolutionOpen} onOpenChange={setIsTeamEvolutionOpen}>
          <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/20 dark:to-background">
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="flex items-center justify-between flex-1" data-testid="text-team-evolution-title">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-indigo-600" />
                    {activeDraft === "Base" ? "Team Evolution - Base Draft" : `Team Evolution - Draft ${activeDraft}`}
                  </div>
              {(() => {
                const currentChip = plannedChips[selectedGameweek];
                if (currentChip) {
                  return (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="cursor-help">
                            <Badge 
                              variant="outline" 
                              className={`text-xs px-2 py-1 ${getChipIconColor(currentChip)} bg-amber-50 border-amber-300 dark:bg-amber-950/20 dark:border-amber-700`}
                            >
                              <Sparkles className="h-3 w-3 mr-1" />
                              {getChipDisplayNameWithNumber(currentChip)} - GW{selectedGameweek}
                            </Badge>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs font-semibold">{getChipDisplayName(currentChip)}</p>
                          <p className="text-xs text-muted-foreground">{getChipDescription(currentChip)}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                }
                return null;
              })()}
                </CardTitle>
                <CollapsibleTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-indigo-700 hover:bg-indigo-100 dark:hover:bg-indigo-900"
                    data-testid="button-toggle-team-evolution"
                  >
                    {isTeamEvolutionOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              </div>
              <CardDescription>
                Horizontal scrollable view showing how your team evolves across the next 6 gameweeks with all planned transfers
              </CardDescription>
            </CardHeader>
            <CollapsibleContent>
              <CardContent data-testid="section-team-evolution">
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-4 min-w-max">
                {/* Base Column */}
                {(() => {
                  const baseLineup = teamData.picks;
                  const captain = baseLineup.find(p => p.is_captain);
                  const viceCaptain = baseLineup.find(p => p.is_vice_captain);
                  
                  return (
                    <div className="flex-shrink-0 w-48 rounded-lg border-2 border-indigo-300 bg-indigo-50 dark:bg-indigo-950/20 p-3">
                      <div className="text-center font-bold mb-2 text-indigo-700 dark:text-indigo-300">Base</div>
                      <div className="space-y-0.5">
                        {/* Group by position: GK, DEF, MID, FWD */}
                        {[1, 2, 3, 4].map(positionType => {
                          const playersInPosition = baseLineup.filter(pick => {
                            const player = getPlayerById(pick.element);
                            return player?.element_type === positionType;
                          });
                          
                          return playersInPosition.map((pick, idx) => {
                            const player = getPlayerById(pick.element);
                            if (!player) return null;
                            const isCaptain = pick.element === captain?.element;
                            const isViceCaptain = pick.element === viceCaptain?.element;
                            
                            return (
                              <div
                                key={pick.element}
                                className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                                  player.element_type === 1 ? 'bg-indigo-600 text-white' :
                                  player.element_type === 2 ? 'bg-cyan-600 text-white' :
                                  player.element_type === 3 ? 'bg-emerald-600 text-white' :
                                  'bg-red-600 text-white'
                                }`}
                                data-testid={`evolution-base-player-${pick.element}`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="truncate">{player.web_name}</span>
                                  {isCaptain && <span className="text-[9px] font-bold flex-shrink-0 ml-1">(C)</span>}
                                  {isViceCaptain && <span className="text-[9px] font-bold flex-shrink-0 ml-1">(V)</span>}
                                </div>
                              </div>
                            );
                          });
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Gameweek Columns */}
                {getNextGameweeks().slice(0, 6).map((gw, gwIndex) => {
                  // Calculate lineup for this gameweek
                  const gwLineup = getBaselineLineup(gw.id);
                  const gwTransfers = gameweekTransfers[gw.id] || { transferredOut: [], completed: [] };
                  
                  // Apply current gameweek's transfers
                  let finalLineup = [...gwLineup];
                  gwTransfers.completed.forEach(transfer => {
                    finalLineup = finalLineup.map(pick => {
                      if (pick.element === transfer.outPlayerId) {
                        const inPlayer = getPlayerById(transfer.inPlayerId);
                        if (inPlayer) {
                          return {
                            ...pick,
                            element: transfer.inPlayerId,
                            selling_price: inPlayer.now_cost,
                            purchase_price: inPlayer.now_cost,
                          };
                        }
                      }
                      return pick;
                    });
                  });
                  
                  // Check if previous gameweek had Free Hit chip
                  const prevGameweekId = gwIndex === 0 ? null : getNextGameweeks()[gwIndex - 1].id;
                  const prevHadFreeHit = prevGameweekId && plannedChips[prevGameweekId] === 'freehit';
                  
                  // Find transferred in players - only mark players who were actually transferred in via completed transfers
                  // If previous GW had Free Hit, don't mark any players as transfers (they're reverting back)
                  const transferredInIds = new Set<number>();
                  
                  if (!prevHadFreeHit) {
                    // Only mark players as transferred in if they appear in completed transfers
                    gwTransfers.completed.forEach(transfer => {
                      transferredInIds.add(transfer.inPlayerId);
                    });
                  }
                  
                  // Get chip for this gameweek
                  const plannedChip = plannedChips[gw.id];
                  
                  // Apply saved captain info from draft if viewing a saved draft
                  if (activeDraft !== "Base") {
                    const savedDraft = savedDrafts.find(d => d.draftLetter === activeDraft);
                    if (savedDraft && (savedDraft.captainPlayerId || savedDraft.viceCaptainPlayerId)) {
                      finalLineup = finalLineup.map(pick => ({
                        ...pick,
                        is_captain: pick.element === savedDraft.captainPlayerId,
                        is_vice_captain: pick.element === savedDraft.viceCaptainPlayerId
                      }));
                    }
                  }
                  
                  // Determine captain and vice captain from current lineup
                  const captain = finalLineup.find(p => p.is_captain);
                  const viceCaptain = finalLineup.find(p => p.is_vice_captain);
                  
                  return (
                    <div key={gw.id} className="flex-shrink-0 w-48 rounded-lg border-2 border-gray-300 bg-white dark:bg-gray-900 p-3">
                      <div className="text-center font-bold mb-2 flex items-center justify-center gap-1">
                        <span>GW{gw.id}</span>
                        {plannedChip && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Sparkles className="h-3 w-3 text-amber-600" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">{getChipDisplayName(plannedChip)} {getChipNumber(plannedChip)}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      <div className="space-y-0.5">
                        {/* Group by position: GK, DEF, MID, FWD */}
                        {[1, 2, 3, 4].map(positionType => {
                          const playersInPosition = finalLineup.filter(pick => {
                            const player = getPlayerById(pick.element);
                            return player?.element_type === positionType;
                          });
                          
                          return playersInPosition.map((pick) => {
                            const player = getPlayerById(pick.element);
                            if (!player) return null;
                            const isCaptain = pick.element === captain?.element;
                            const isViceCaptain = pick.element === viceCaptain?.element;
                            const isTransferredIn = transferredInIds.has(pick.element);
                            
                            return (
                              <div
                                key={pick.element}
                                className={`px-2 py-0.5 rounded text-[10px] font-medium relative ${
                                  isTransferredIn ? 'bg-green-100 text-green-900 border-2 border-green-500 dark:bg-green-950/40 dark:text-green-300' :
                                  player.element_type === 1 ? 'bg-indigo-600 text-white' :
                                  player.element_type === 2 ? 'bg-cyan-600 text-white' :
                                  player.element_type === 3 ? 'bg-emerald-600 text-white' :
                                  'bg-red-600 text-white'
                                }`}
                                data-testid={`evolution-gw${gw.id}-player-${pick.element}`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="truncate">{player.web_name}</span>
                                  {isCaptain && <span className="text-[9px] font-bold flex-shrink-0 ml-1">(C)</span>}
                                  {isViceCaptain && <span className="text-[9px] font-bold flex-shrink-0 ml-1">(V)</span>}
                                </div>
                              </div>
                            );
                          });
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="mt-4 text-xs text-muted-foreground space-y-1 border-t pt-3">
              <p className="flex items-center gap-2">
                <span className="text-sm font-bold">(C)</span>
                <strong>Captain</strong>
                <span className="mx-2">•</span>
                <span className="text-sm font-bold">(V)</span>
                <strong>Vice Captain</strong>
              </p>
              <p className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 rounded bg-green-100 border-2 border-green-500 dark:bg-green-950/40"></span>
                <strong>Transferred In</strong>
              </p>
              <p className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-600" />
                <strong>Chip Active</strong>
              </p>
            </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
        );
      })()}


      {/* Draft Comparison Table - Only show if there are at least 2 unique (non-duplicate) drafts */}
      {searchedId && teamData && playerProjections && playerProjections6GW && (() => {
        const duplicateInfo = identifyDuplicateDrafts();
        const uniqueDraftsCount = savedDrafts.filter(draft => !duplicateInfo[draft.draftLetter]?.isDuplicate).length;
        return uniqueDraftsCount >= 2;
      })() && (
        <Collapsible open={isDraftComparisonOpen} onOpenChange={setIsDraftComparisonOpen}>
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-background">
            <CardHeader>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2" data-testid="text-draft-comparison-title">
                    <Target className="h-5 w-5 text-blue-600" />
                    Draft Comparison
                  </CardTitle>
                  <div className="flex items-center gap-2">
                {(() => {
                  const duplicateInfo = identifyDuplicateDrafts();
                  const duplicateCount = Object.values(duplicateInfo).filter(info => info.isDuplicate).length;
                  
                  if (duplicateCount > 0) {
                    return (
                      <Button
                        onClick={deleteAllDuplicateDrafts}
                        size="sm"
                        variant="outline"
                        className="text-orange-600 border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/20"
                        data-testid="button-delete-all-duplicates"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete All Duplicates ({duplicateCount})
                      </Button>
                    );
                  }
                  return null;
                })()}
                    <CollapsibleTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900"
                        data-testid="button-toggle-draft-comparison"
                      >
                        {isDraftComparisonOpen ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                </div>
                
                {/* Filter Buttons */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Show:</span>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="default"
                    className="h-7 px-3 text-xs"
                    data-testid="filter-all"
                  >
                    All Drafts
                  </Button>
                </div>
              </div>
              </div>
            </CardHeader>
            <CollapsibleContent>
              <CardContent data-testid="section-draft-comparison">
            {(() => {
              const comparisonData = buildDraftComparisonData();
              const nextGWs = getNextGameweeks();
              
              if (comparisonData.length === 0 || nextGWs.length === 0) {
                return <p className="text-muted-foreground text-sm">No comparison data available</p>;
              }
              
              // Show all comparison data
              const filteredComparisonData = comparisonData;
              
              // Find the maximum total points from filtered data
              const maxTotal = filteredComparisonData.length > 0 
                ? Math.max(...filteredComparisonData.map(row => row.total))
                : 0;
              
              // Identify duplicate drafts
              const duplicateInfo = identifyDuplicateDrafts();
              
              return (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 font-semibold" data-testid="header-draft">Draft</th>
                        {nextGWs.map(gw => (
                          <th key={gw.id} className="text-center p-2 font-semibold" data-testid={`header-gw${gw.id}`}>
                            GW{gw.id}
                          </th>
                        ))}
                        <th className="text-center p-2 font-semibold bg-blue-50 dark:bg-blue-950/20" data-testid="header-total">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredComparisonData.map((row, idx) => {
                        const isMaxTotal = row.total === maxTotal;
                        const isDuplicate = duplicateInfo[row.draftKey]?.isDuplicate;
                        const duplicateOf = duplicateInfo[row.draftKey]?.duplicateOfKey;
                        
                        return (
                          <tr 
                            key={`${row.draftKey}-${row.mode}`} 
                            className={`border-b hover:bg-gray-50 dark:hover:bg-gray-900 ${
                              row.draftKey === activeDraft ? 'bg-blue-50 dark:bg-blue-950/10' : ''
                            }`}
                            data-testid={`row-${row.draftKey}-${row.mode.toLowerCase()}`}
                          >
                            <td className="p-2 font-medium" data-testid={`cell-draft-${row.draftKey}`}>
                              <div className="flex items-center gap-2">
                                <span>{row.draftKey}</span>
                                {row.draftKey === activeDraft && <span className="text-blue-600">●</span>}
                                {isMaxTotal && (
                                  <Badge 
                                    variant="default" 
                                    className="text-xs bg-green-600 text-white dark:bg-green-500"
                                    data-testid={`badge-best-${row.draftKey}-${row.mode.toLowerCase()}`}
                                  >
                                    Best
                                  </Badge>
                                )}
                                
                                {isDuplicate && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button className="inline-flex">
                                          <Badge 
                                            variant="outline" 
                                            className="text-xs border-orange-400 text-orange-700 bg-orange-50 dark:bg-orange-950/20 flex items-center gap-1"
                                            data-testid={`badge-duplicate-${row.draftKey}`}
                                          >
                                            <Copy className="h-3 w-3" />
                                            Duplicate of {duplicateOf}
                                          </Badge>
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>This draft matches Draft {duplicateOf} exactly across lineup, captain, and transfers.</p>
                                        <p className="text-xs mt-1">You can delete it.</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                                
                                {isDuplicate && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-5 w-5 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={async () => {
                                      try {
                                        const response = await fetch(`/api/transfer-planner/drafts/${searchedId}/${row.draftKey}`, {
                                          method: "DELETE"
                                        });
                                        if (response.ok) {
                                          if (activeDraft === row.draftKey) {
                                            switchToDraft("A");
                                          }
                                          await loadDrafts();
                                          toast({ title: "Draft Deleted", description: `Duplicate Draft ${row.draftKey} has been deleted` });
                                        }
                                      } catch (error) {
                                        toast({ title: "Error", description: "Failed to delete draft", variant: "destructive" });
                                      }
                                    }}
                                    data-testid={`button-delete-duplicate-${row.draftKey}`}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          {nextGWs.map(gw => {
                            // Get transfers for this draft and gameweek
                            const getDraftTransfers = () => {
                              if (row.draftKey === 'Base') return null;
                              const draft = savedDrafts.find(d => d.draftLetter === row.draftKey);
                              if (!draft || !draft.gameweekTransfers) return null;
                              return draft.gameweekTransfers[gw.id] || draft.gameweekTransfers[gw.id.toString()];
                            };
                            
                            // Get planned chip for this draft and gameweek
                            const getPlannedChip = () => {
                              if (row.draftKey === 'Base') return null;
                              const draft = savedDrafts.find(d => d.draftLetter === row.draftKey);
                              if (!draft || !draft.plannedChips) return null;
                              return draft.plannedChips[gw.id] || draft.plannedChips[gw.id.toString()];
                            };
                            
                            const gwTransfers = getDraftTransfers();
                            const hasTransfers = gwTransfers && gwTransfers.completed && gwTransfers.completed.length > 0;
                            const plannedChip = getPlannedChip();
                            
                            return (
                              <td 
                                key={gw.id} 
                                className="text-center p-2 text-sm"
                                data-testid={`cell-${row.draftKey}-gw${gw.id}`}
                              >
                                <div className="flex flex-col items-center gap-1">
                                  {hasTransfers ? (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="cursor-help underline decoration-dotted">
                                            {row.gameweeks[gw.id]?.toFixed(2) || '0.00'}
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs">
                                          <div className="text-sm">
                                            <p className="font-semibold mb-1">GW{gw.id} Transfers:</p>
                                            {gwTransfers.completed.map((transfer: any, idx: number) => (
                                              <p key={idx} className="text-xs">
                                                <span className="text-red-400">Out:</span> {transfer.outPlayerName} (£{transfer.sellingPrice.toFixed(1)}m)
                                                <br />
                                                <span className="text-green-400">In:</span> {transfer.inPlayerName} (£{transfer.buyingPrice.toFixed(1)}m)
                                              </p>
                                            ))}
                                          </div>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  ) : (
                                    <span>{row.gameweeks[gw.id]?.toFixed(2) || '0.00'}</span>
                                  )}
                                  {plannedChip && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Badge 
                                            variant="outline" 
                                            className="text-[10px] px-1 py-0 h-4 bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-700"
                                            data-testid={`chip-badge-${row.draftKey}-gw${gw.id}`}
                                          >
                                            <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                                            {plannedChip === '3xc' ? '3xC' : plannedChip === 'bboost' ? 'BB' : plannedChip === 'freehit' ? 'FH' : 'WC'}
                                          </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p className="text-xs">{getChipDisplayName(plannedChip)}</p>
                                          <p className="text-xs text-muted-foreground">{getChipDescription(plannedChip)}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                          <td 
                            className="text-center p-2 font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/20"
                            data-testid={`cell-${row.draftKey}-total`}
                          >
                            {row.total.toFixed(2)}
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
            
            <div className="mt-4 text-xs text-muted-foreground space-y-1">
              <p>● = Currently active draft (Manual mode)</p>
              <p><strong>Manual:</strong> Projected points based on your saved lineup and transfers.</p>
              <p><strong>Auto:</strong> Optimized lineup with best formation and captain for maximum points.</p>
              <p><Sparkles className="h-3 w-3 inline mr-1 text-amber-600" /><strong>Chip Badges:</strong> 3xC (Triple Captain), BB (Bench Boost), FH (Free Hit), WC (Wildcard)</p>
            </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Empty State */}
      {!searchedId && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Enter your Manager ID to start planning your transfers</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Captain Confirmation Dialog */}
      <AlertDialog open={!!captainConfirmation} onOpenChange={() => setCaptainConfirmation(null)}>
        <AlertDialogContent className="z-[100]">
          <AlertDialogHeader>
            <AlertDialogTitle>Set {captainConfirmation?.playerName} as Captain?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Your captain gets <strong>double the number of points</strong> they score in the gameweek.</p>
              <p className="text-sm text-muted-foreground">Choose wisely - this can significantly impact your gameweek score!</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => captainConfirmation && confirmSetCaptain(captainConfirmation.playerId)}>
              Confirm Captain
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Vice Captain Confirmation Dialog */}
      <AlertDialog open={!!viceCaptainConfirmation} onOpenChange={() => setViceCaptainConfirmation(null)}>
        <AlertDialogContent className="z-[100]">
          <AlertDialogHeader>
            <AlertDialogTitle>Set {viceCaptainConfirmation?.playerName} as Vice Captain?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Your vice captain fills in as captain and gets <strong>double the number of points</strong> if your selected captain doesn't play that gameweek.</p>
              <p className="text-sm text-muted-foreground">Pick a reliable player who is likely to start!</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => viceCaptainConfirmation && confirmSetViceCaptain(viceCaptainConfirmation.playerId)}>
              Confirm Vice Captain
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Buy Price Dialog */}
      <AlertDialog open={!!editBuyPriceDialog} onOpenChange={() => setEditBuyPriceDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Buy Price</AlertDialogTitle>
            <AlertDialogDescription>
              Adjust the price you paid for this player. The sell price will be automatically calculated based on FPL rules.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-4">
            {editBuyPriceDialog && (() => {
              const pick = manualLineup.find(p => p.element === editBuyPriceDialog.playerId);
              const player = pick ? getPlayerById(pick.element) : null;
              const currentBuyPrice = pick ? (pick.purchase_price || 0) / 10 : 0;
              const currentMarketPrice = player ? player.now_cost / 10 : 0;
              const currentSellPrice = pick ? getSellingPrice(pick) : 0;
              
              // Calculate new sell price based on input value (capped at 0.3m profit)
              const newBuyPrice = parseFloat(editBuyPriceValue) || 0;
              const priceIncrease = (player?.now_cost || 0) - (newBuyPrice * 10);
              const profitPerRise = Math.min(Math.floor(priceIncrease / 2), 3); // Cap at 3 tenths (0.3m)
              const newSellPrice = (newBuyPrice * 10 + profitPerRise) / 10;
              
              return (
                <>
                  {/* Current Information */}
                  <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 space-y-2">
                    <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100">Current Information</h4>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <div className="text-muted-foreground">Buy Price</div>
                        <div className="font-semibold">£{currentBuyPrice.toFixed(1)}m</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Market Price</div>
                        <div className="font-semibold">£{currentMarketPrice.toFixed(1)}m</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Sell Price</div>
                        <div className="font-semibold">£{currentSellPrice.toFixed(1)}m</div>
                      </div>
                    </div>
                  </div>

                  {/* Edit Buy Price */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">New Buy Price (£m)</label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="15"
                      value={editBuyPriceValue}
                      onChange={(e) => setEditBuyPriceValue(e.target.value)}
                      className="w-full"
                      data-testid="input-buy-price"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          saveBuyPriceFromDialog();
                        }
                      }}
                    />
                  </div>

                  {/* New Sell Price Preview */}
                  {!isNaN(newBuyPrice) && newBuyPrice > 0 && (
                    <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3">
                      <div className="text-sm font-semibold text-green-900 dark:text-green-100 mb-1">
                        New Calculated Sell Price
                      </div>
                      <div className="text-lg font-bold text-green-700 dark:text-green-300">
                        £{newSellPrice.toFixed(1)}m
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Based on FPL price change rules
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEditBuyPriceDialog(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={saveBuyPriceFromDialog} data-testid="button-save-buy-price">
              Save Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete All Drafts Confirmation Dialog */}
      <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <AlertDialogContent className="z-[100]">
          <AlertDialogHeader>
            <AlertDialogTitle>Reset All Drafts?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>This will:</p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>Reset Draft A to match Base Draft</li>
                {savedDrafts.filter(d => d.draftLetter !== 'A').length > 0 && (
                  <li>Delete {savedDrafts.filter(d => d.draftLetter !== 'A').length} other draft(s) ({savedDrafts.filter(d => d.draftLetter !== 'A').map(d => d.draftLetter).join(', ')})</li>
                )}
              </ul>
              <p className="text-sm font-semibold text-destructive">This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteAllDrafts}
              className="bg-destructive hover:bg-destructive/90"
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
    </>
  );
}
