import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, TrendingUp, Save, Calendar, Target, Sparkles, Crown, ArrowUpDown, ChevronUp, ChevronDown, X, Plus, RotateCcw, Copy, Trash2, Edit2, Check, Info, Heart, AlertTriangle, XCircle, Clock, List } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Player Availability Badge Component - only shows for players with < 100% availability
function PlayerAvailabilityBadge({ player }: { player: any }) {
  const chanceOfPlaying = player.chanceOfPlayingNextRound ?? 100;
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

// Availability Adjustment Helpers for Frontend
function parseReturnDate(newsText: string): Date | null {
  if (!newsText) return null;
  
  const patterns = [
    /(?:expected back|return date|due back|back|suspended until)\s+(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
    /(?:until|after)\s+(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
  ];
  
  const monthMap: { [key: string]: number } = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };
  
  for (const pattern of patterns) {
    const match = newsText.match(pattern);
    if (match) {
      const day = parseInt(match[1]);
      const monthStr = match[2].toLowerCase();
      const month = monthMap[monthStr];
      
      if (month !== undefined) {
        const currentYear = new Date().getFullYear();
        const date = new Date(currentYear, month, day);
        
        if (date < new Date()) {
          date.setFullYear(currentYear + 1);
        }
        
        return date;
      }
    }
  }
  
  return null;
}

function getGameweekFromDate(date: Date, bootstrapData: any): number | null {
  if (!bootstrapData?.events) return null;
  
  const sortedEvents = bootstrapData.events.sort((a: any, b: any) => a.id - b.id);
  
  for (const event of sortedEvents) {
    const deadlineDate = new Date(event.deadline_time);
    const gameweekEnd = new Date(deadlineDate.getTime() + 24 * 60 * 60 * 1000);
    
    if (date <= gameweekEnd) {
      return event.id;
    }
  }
  
  const lastEvent = sortedEvents[sortedEvents.length - 1];
  if (lastEvent) {
    return lastEvent.id;
  }
  
  return null;
}

function applyAvailabilityAdjustments(
  player: any,
  bootstrapData: any,
  currentGameweek: number
): any {
  const chanceOfPlaying = player.chanceOfPlayingNextRound ?? 100;
  const status = player.status || 'a';
  const news = player.news || '';
  
  if (chanceOfPlaying >= 100 && status === 'a') {
    return player;
  }
  
  const adjustedPlayer = { ...player };
  const adjustedProjections = { ...player.gameweekProjections };
  const originalProjections = { ...player.gameweekProjections };
  
  if (chanceOfPlaying === 0) {
    const returnDate = parseReturnDate(news);
    
    if (returnDate) {
      const returnGameweek = getGameweekFromDate(returnDate, bootstrapData);
      
      Object.keys(adjustedProjections).forEach(gwKey => {
        const gw = parseInt(gwKey);
        if (returnGameweek && gw < returnGameweek) {
          adjustedProjections[gwKey] = 0;
        }
      });
    } else {
      Object.keys(adjustedProjections).forEach(gwKey => {
        adjustedProjections[gwKey] = 0;
      });
    }
  } else if (chanceOfPlaying === 25 || chanceOfPlaying === 50 || chanceOfPlaying === 75) {
    const nextGameweek = (currentGameweek + 1).toString();
    if (adjustedProjections[nextGameweek] !== undefined) {
      const multiplier = chanceOfPlaying / 100;
      adjustedProjections[nextGameweek] = adjustedProjections[nextGameweek] * multiplier;
    }
  }
  
  adjustedPlayer.gameweekProjections = adjustedProjections;
  adjustedPlayer.originalGameweekProjections = originalProjections;
  
  return adjustedPlayer;
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

interface OptimizedLineup {
  formation: string;
  starting11: Array<{
    element: number;
    position: number;
    projectedPoints: number;
    web_name: string;
    isCaptain: boolean;
    isViceCaptain: boolean;
  }>;
  bench: Array<{
    element: number;
    position: number;
    projectedPoints: number;
    web_name: string;
    benchPosition: number;
  }>;
  totalProjectedPoints: number;
  captainProjectedPoints: number;
  gameweek: number;
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
  const [positionFilter, setPositionFilter] = useState(initialPositionFilter);
  const [teamFilter, setTeamFilter] = useState("all");
  const [loadGroupFilter, setLoadGroupFilter] = useState("All");
  const [sortField, setSortField] = useState<string>('total');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [minPrice, setMinPrice] = useState<number>(4.0);
  const [maxPrice, setMaxPrice] = useState<number>(15.0);
  const [onlyAffordable, setOnlyAffordable] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  // Update position filter when initialPositionFilter changes
  useEffect(() => {
    setPositionFilter(initialPositionFilter);
  }, [initialPositionFilter]);

  // Scroll to view when requested
  useEffect(() => {
    if (scrollToView && sectionRef.current) {
      sectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (onScrollComplete) {
        onScrollComplete();
      }
    }
  }, [scrollToView, onScrollComplete]);

  const { data: allPlayersData, isLoading } = useQuery<PlayerProjectionData[]>({
    queryKey: ["/api/cached/player-total-points"],
    staleTime: 60 * 60 * 1000,
  });

  const { data: bootstrapData } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
  });

  // Create playerId to web_name mapping
  const playerIdToWebName = useMemo(() => {
    if (!bootstrapData?.elements) return new Map<number, string>();
    const map = new Map<number, string>();
    bootstrapData.elements.forEach(element => {
      map.set(element.id, element.web_name);
    });
    return map;
  }, [bootstrapData]);

  // Apply availability adjustments to all players - MUST BE BEFORE EARLY RETURNS
  const adjustedPlayersData = useMemo(() => {
    if (!bootstrapData || !allPlayersData) return allPlayersData || [];
    
    const currentEvent = bootstrapData.events.find(e => e.is_current);
    const nextEvent = bootstrapData.events.find(e => e.is_next);
    let currentGameweek = currentEvent?.id || nextEvent?.id || 1;
    if (currentEvent?.finished) {
      currentGameweek = nextEvent?.id || currentGameweek + 1;
    }
    
    return allPlayersData.map(player => 
      applyAvailabilityAdjustments(player, bootstrapData, currentGameweek)
    );
  }, [allPlayersData, bootstrapData]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            Loading player projections...
          </div>
        </CardContent>
      </Card>
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

  // Calculate top 3 players for each gameweek
  const getTop3ForGameweek = (gw: number) => {
    const sorted = [...adjustedPlayersData]
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
  let filteredPlayers = adjustedPlayersData
    .filter(player => {
      const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           player.team.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPosition = positionFilter === "all" || player.position === positionFilter;
      const normalizedPlayerTeam = normalizeTeamName(player.team);
      const matchesTeam = teamFilter === "all" || normalizedPlayerTeam === teamFilter;
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
      <CardHeader className="pb-2 pt-3 px-2 md:px-4">
        <CardTitle className="text-base md:text-lg">Projected Points - Next 6 Gameweeks</CardTitle>
        <div className="flex flex-col sm:flex-row gap-2 mt-2 flex-wrap items-start sm:items-center">
          <Input
            placeholder="Search players or teams..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 text-sm w-full sm:w-40"
            data-testid="input-player-search"
          />
          <Select value={positionFilter} onValueChange={setPositionFilter}>
            <SelectTrigger className="h-8 text-sm w-full sm:w-32" data-testid="select-position-filter">
              <SelectValue placeholder="All Positions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Positions</SelectItem>
              <SelectItem value="Goalkeeper">Goalkeepers</SelectItem>
              <SelectItem value="Defender">Defenders</SelectItem>
              <SelectItem value="Midfielder">Midfielders</SelectItem>
              <SelectItem value="Forward">Forwards</SelectItem>
            </SelectContent>
          </Select>
          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger className="h-8 text-sm w-full sm:w-28" data-testid="select-team-filter">
              <SelectValue placeholder="All Teams" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              {uniqueTeams.map(team => (
                <SelectItem key={team} value={team}>{team}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={loadGroupFilter} onValueChange={setLoadGroupFilter}>
            <SelectTrigger className="h-8 text-sm w-full sm:w-28" data-testid="select-load-group">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Players</SelectItem>
              <SelectItem value="Top 50">Top 50</SelectItem>
              <SelectItem value="Value 50">Value 50</SelectItem>
              <SelectItem value="Current Team">Current Team</SelectItem>
              <SelectItem value="All Drafts">All Drafts</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Price:</span>
            <Input
              type="number"
              step="0.1"
              min="4.0"
              max="15.0"
              value={minPrice}
              onChange={(e) => setMinPrice(parseFloat(e.target.value) || 4.0)}
              className="h-8 w-16 text-sm"
              data-testid="input-min-price"
            />
            <span className="text-sm text-muted-foreground">-</span>
            <Input
              type="number"
              step="0.1"
              min="4.0"
              max="15.0"
              value={maxPrice}
              onChange={(e) => setMaxPrice(parseFloat(e.target.value) || 15.0)}
              className="h-8 w-16 text-sm"
              data-testid="input-max-price"
            />
          </div>
          {transferredOutPlayers.length > 0 && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="only-affordable"
                checked={onlyAffordable}
                onChange={(e) => setOnlyAffordable(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
                data-testid="checkbox-only-affordable"
              />
              <label htmlFor="only-affordable" className="text-sm text-muted-foreground cursor-pointer whitespace-nowrap">
                Only affordable (≤£{currentBank.toFixed(1)}m)
              </label>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-2 md:p-4">
        <div className="w-full overflow-x-auto md:overflow-visible">
          <table className="w-full min-w-[900px] md:min-w-0 text-xs md:text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1 px-1 md:p-2 sticky left-0 bg-white dark:bg-gray-950 z-20 w-[160px] min-w-[160px] max-w-[200px]">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 md:h-8 px-1 md:px-3 text-xs md:text-sm truncate"
                    onClick={() => handleSort('name')}
                    data-testid="sort-name"
                  >
                    Player {sortField === 'name' && (sortDirection === 'asc' ? <ChevronUp className="h-2 w-2 md:h-3 md:w-3 inline ml-1" /> : <ChevronDown className="h-2 w-2 md:h-3 md:w-3 inline ml-1" />)}
                  </Button>
                </th>
                <th className="text-center py-1 px-1 md:p-2 font-bold text-xs md:text-sm w-[44px] min-w-[44px] max-w-[44px]">
                  Action
                </th>
                <th className="text-left py-1 px-1 md:p-2 hidden md:table-cell">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 md:h-8 px-1 md:px-3 text-xs md:text-sm"
                    onClick={() => handleSort('price')}
                    data-testid="sort-price"
                  >
                    Price {sortField === 'price' && (sortDirection === 'asc' ? <ChevronUp className="h-2 w-2 md:h-3 md:w-3 inline ml-1" /> : <ChevronDown className="h-2 w-2 md:h-3 md:w-3 inline ml-1" />)}
                  </Button>
                </th>
                {nextGameweeks.map((gw, idx) => {
                  const colCls = idx < 4 ? "table-cell" : "hidden lg:table-cell";
                  return (
                    <th key={gw} className={`text-center py-1 px-1 md:p-2 ${colCls}`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 md:h-8 px-1 md:px-3 text-xs md:text-sm"
                        onClick={() => handleSort(`gw_${gw}`)}
                        data-testid={`sort-gw${gw}`}
                      >
                        GW{gw} {sortField === `gw_${gw}` && (sortDirection === 'asc' ? <ChevronUp className="h-2 w-2 md:h-3 md:w-3 inline ml-1" /> : <ChevronDown className="h-2 w-2 md:h-3 md:w-3 inline ml-1" />)}
                      </Button>
                    </th>
                  );
                })}
                <th className="text-center py-1 px-1 md:p-2 font-bold">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 md:h-8 px-1 md:px-3 text-xs md:text-sm"
                    onClick={() => handleSort('total')}
                    data-testid="sort-total"
                  >
                    Total {sortField === 'total' && (sortDirection === 'asc' ? <ChevronUp className="h-2 w-2 md:h-3 md:w-3 inline ml-1" /> : <ChevronDown className="h-2 w-2 md:h-3 md:w-3 inline ml-1" />)}
                  </Button>
                </th>
                <th className="text-center py-1 px-1 md:p-2 hidden md:table-cell">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 md:h-8 px-1 md:px-3 text-xs md:text-sm"
                    onClick={() => handleSort('avgValue')}
                    data-testid="sort-avgValue"
                  >
                    Avg Val {sortField === 'avgValue' && (sortDirection === 'asc' ? <ChevronUp className="h-2 w-2 md:h-3 md:w-3 inline ml-1" /> : <ChevronDown className="h-2 w-2 md:h-3 md:w-3 inline ml-1" />)}
                  </Button>
                </th>
                <th className="text-center py-1 px-1 md:p-2 hidden md:table-cell">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 md:h-8 px-1 md:px-3 text-xs md:text-sm"
                    onClick={() => handleSort('form')}
                    data-testid="sort-form"
                  >
                    Form {sortField === 'form' && (sortDirection === 'asc' ? <ChevronUp className="h-2 w-2 md:h-3 md:w-3 inline ml-1" /> : <ChevronDown className="h-2 w-2 md:h-3 md:w-3 inline ml-1" />)}
                  </Button>
                </th>
                <th className="text-center py-1 px-1 md:p-2 hidden md:table-cell">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 md:h-8 px-1 md:px-3 text-xs md:text-sm"
                    onClick={() => handleSort('avgMins')}
                    data-testid="sort-avgMins"
                  >
                    Mins {sortField === 'avgMins' && (sortDirection === 'asc' ? <ChevronUp className="h-2 w-2 md:h-3 md:w-3 inline ml-1" /> : <ChevronDown className="h-2 w-2 md:h-3 md:w-3 inline ml-1" />)}
                  </Button>
                </th>
                <th className="text-center py-1 px-1 md:p-2 hidden md:table-cell">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 md:h-8 px-1 md:px-3 text-xs md:text-sm"
                    onClick={() => handleSort('ownership')}
                    data-testid="sort-ownership"
                  >
                    Own% {sortField === 'ownership' && (sortDirection === 'asc' ? <ChevronUp className="h-2 w-2 md:h-3 md:w-3 inline ml-1" /> : <ChevronDown className="h-2 w-2 md:h-3 md:w-3 inline ml-1" />)}
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
                    <td className="py-1 px-1 md:p-2 sticky left-0 bg-white dark:bg-gray-950 z-10 w-[160px] min-w-[160px] max-w-[200px]">
                      <div className="flex items-center gap-1.5">
                        <div className="font-medium text-xs md:text-sm truncate max-w-[100px]">
                          {(playerIdToWebName && playerIdToWebName.get(player.playerId)) || player.name}
                        </div>
                        <TooltipProvider>
                          <PlayerAvailabilityBadge player={player} />
                        </TooltipProvider>
                      </div>
                      <div className="text-[10px] md:text-xs text-muted-foreground truncate">
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
                    <td className="py-1 px-1 md:p-2 text-center w-[44px] min-w-[44px] max-w-[44px]">
                      {(() => {
                        // Map position names to element types
                        const positionMap: { [key: string]: number } = {
                          'Goalkeeper': 1,
                          'Defender': 2,
                          'Midfielder': 3,
                          'Forward': 4
                        };
                        const playerElementType = positionMap[player.position];
                        
                        // Check if there's a matching transfer out for this position
                        const hasMatchingTransferOut = transferredOutPlayers && transferredOutPlayers.length > 0 && transferredOutPlayers.some(
                          t => t.elementType === playerElementType
                        );
                        
                        // Calculate available budget: current bank + selling prices of transferred out players
                        const totalSellingPrice = transferredOutPlayers.reduce((sum, t) => sum + t.sellingPrice, 0);
                        const availableBudget = currentBank + totalSellingPrice;
                        
                        // Check if player is affordable
                        const isAffordable = player.price <= availableBudget;
                        
                        return hasMatchingTransferOut && isAffordable ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 md:h-8 md:w-8 text-green-600 hover:bg-green-50 hover:text-green-700"
                            onClick={() => onTransferIn(player.playerId, playerElementType)}
                            data-testid={`transfer-in-${player.playerId}`}
                            title="Transfer In"
                          >
                            <Plus className="h-3 w-3 md:h-4 md:w-4" />
                          </Button>
                        ) : null;
                      })()}
                    </td>
                    <td className="py-1 px-1 md:p-2 text-center hidden md:table-cell">£{player.price.toFixed(1)}m</td>
                    {nextGameweeks.map((gw, idx) => {
                      const gwPoints = player.gameweekProjections[gw.toString()] || 0;
                      const top3 = getTop3ForGameweek(gw);
                      
                      // Determine styling based on rank
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
                      
                      const colCls = idx < 4 ? "table-cell" : "hidden lg:table-cell";
                      
                      return (
                        <td key={gw} className={`py-1 px-1 md:p-2 text-center ${bgColor} ${colCls}`}>
                          <span className={`${textColor} font-medium`}>
                            {gwPoints.toFixed(1)}
                          </span>
                        </td>
                      );
                    })}
                    <td className="py-1 px-1 md:p-2 text-center">
                      {(() => {
                        // Calculate 4-GW total for mobile (first 4 gameweeks)
                        const first4GWTotal = nextGameweeks.slice(0, 4).reduce((sum, gw) => {
                          return sum + (player.gameweekProjections[gw.toString()] || 0);
                        }, 0);
                        
                        // 6-GW total for desktop (all gameweeks)
                        const total6GW = player.totalExpectedPoints || 0;
                        
                        return (
                          <>
                            <span className="font-bold text-green-600 lg:hidden">
                              {first4GWTotal.toFixed(1)}
                            </span>
                            <span className="font-bold text-green-600 hidden lg:inline">
                              {total6GW.toFixed(1)}
                            </span>
                          </>
                        );
                      })()}
                    </td>
                    <td className="py-1 px-1 md:p-2 text-center hidden md:table-cell">
                      <span className="text-blue-600 dark:text-blue-400 font-medium">
                        {(player.averageValue || 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="py-1 px-1 md:p-2 text-center hidden md:table-cell">
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        {(player.form || 0).toFixed(1)}
                      </span>
                    </td>
                    <td className="py-1 px-1 md:p-2 text-center hidden md:table-cell">
                      <span className="text-purple-600 dark:text-purple-400 font-medium">
                        {Math.round(player.avgMinutesPerGameweek || 0)}
                      </span>
                    </td>
                    <td className="py-1 px-1 md:p-2 text-center hidden md:table-cell">
                      <span className="text-orange-600 dark:text-orange-400 font-medium">
                        {player.ownership.toFixed(1)}%
                      </span>
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
  const [plannerMode, setPlannerMode] = useState<"auto" | "manual">("manual");
  const [teamView, setTeamView] = useState<"list" | "pitch">("pitch");
  const [optimizedLineup, setOptimizedLineup] = useState<OptimizedLineup | null>(null);
  const [manualLineup, setManualLineup] = useState<TeamPick[]>([]);
  
  // Store transfers per gameweek for cumulative effect
  const [gameweekTransfers, setGameweekTransfers] = useState<GameweekTransfers>({});
  
  // Current gameweek's transfers (for convenience)
  const [transferredOutPlayers, setTransferredOutPlayers] = useState<TransferOut[]>([]);
  const [completedTransfers, setCompletedTransfers] = useState<CompletedTransfer[]>([]);
  
  // Player projections tab state for quick navigation
  const [projectionPositionFilter, setProjectionPositionFilter] = useState<string>("all");
  const [scrollToProjections, setScrollToProjections] = useState<boolean>(false);
  
  // Track which manager has been initialized to prevent unwanted resets
  const initializedManagerRef = useRef<string | null>(null);
  
  // Ref for scrolling to team lineup after transfer
  const teamLineupRef = useRef<HTMLDivElement>(null);
  
  // Draft management state
  const [activeDraft, setActiveDraft] = useState<string>("Base"); // Current working draft
  const [savedDrafts, setSavedDrafts] = useState<any[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [comparisonFilter, setComparisonFilter] = useState<"all" | "manual" | "auto">("all");
  
  // Auto-save state
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadingDraftRef = useRef(false);
  
  // Store saved captain/vice-captain from draft (to apply after lineup rebuild)
  const [savedCaptainInfo, setSavedCaptainInfo] = useState<{
    captainPlayerId: number | null;
    viceCaptainPlayerId: number | null;
  } | null>(null);
  
  // Chip planning state
  const [plannedChips, setPlannedChips] = useState<PlannedChips>({});
  
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

  // Load cached manager ID on component mount
  useEffect(() => {
    const cachedId = getManagerIdFromCache();
    if (cachedId) {
      setManagerId(cachedId);
      setSearchedId(cachedId);
    }
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

    // Cleanup pending autosave on unmount
    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
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
    plannerMode,
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

  const { data: teamData, isLoading: isLoadingTeam } = useQuery<TeamData>({
    queryKey: ["/api/manager", searchedId, "team"],
    enabled: !!searchedId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false, // Prevent auto-refetch that would reset transfers
  });

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
    let baseline = teamData.picks.map(pick => {
      const player = getPlayerById(pick.element);
      const currentPrice = player?.now_cost || pick.selling_price;
      const overridePrice = buyPriceOverridesData?.overrides?.[pick.element];
      const apiPrice = buyPricesData?.buyPrices?.[pick.element];
      
      return {
        ...pick,
        purchase_price: overridePrice || apiPrice || pick.purchase_price || currentPrice,
        is_transferred_out: false // Clear any transferred out flags
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

  // Initialize manual lineup when team data loads (only on first load or manager change)
  useEffect(() => {
    if (teamData?.picks && searchedId && initializedManagerRef.current !== searchedId) {
      console.log("DEBUG: Initializing team for manager:", searchedId);
      console.log("DEBUG: First pick from teamData:", teamData.picks[0]);
      
      // Merge buy prices into picks if available, defaulting to current price
      // Priority: Buy price overrides > FPL API buy prices > Current price
      let picksWithBuyPrices = teamData.picks.map(pick => {
        const player = getPlayerById(pick.element);
        const currentPrice = player?.now_cost || pick.selling_price;
        
        // Check for manual override first (applies across all drafts)
        const overridePrice = buyPriceOverridesData?.overrides?.[pick.element];
        const apiPrice = buyPricesData?.buyPrices?.[pick.element];
        
        return {
          ...pick,
          purchase_price: overridePrice || apiPrice || currentPrice
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
  }, [teamData, searchedId, buyPricesData, buyPriceOverridesData]);

  // Fetch player projections for the selected gameweek
  const { data: playerProjections, isLoading: projectionsLoading, error: projectionsError } = useQuery<any[]>({
    queryKey: ["/api/player-total-points", selectedGameweek],
    enabled: !!selectedGameweek && selectedGameweek > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    queryFn: async () => {
      if (!selectedGameweek || selectedGameweek <= 0) return [];
      const response = await fetch(`/api/player-total-points?startGameweek=${selectedGameweek}&endGameweek=${selectedGameweek}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch projections: ${response.statusText}`);
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    }
  });

  // Fetch player projections for next 6 gameweeks (for 6GW total calculation)
  const { data: playerProjections6GW, isLoading: projections6GWLoading } = useQuery<any[]>({
    queryKey: ["/api/player-total-points-6gw", bootstrapData?.events],
    enabled: !!bootstrapData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    queryFn: async () => {
      const nextGWs = getNextGameweeks();
      if (nextGWs.length === 0) return [];
      const startGW = nextGWs[0]?.id;
      const endGW = nextGWs[nextGWs.length - 1]?.id;
      if (!startGW || !endGW) return [];
      const response = await fetch(`/api/player-total-points?startGameweek=${startGW}&endGameweek=${endGW}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch 6GW projections: ${response.statusText}`);
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    }
  });

  // Auto-optimization mutation
  const optimizeMutation = useMutation({
    mutationFn: async () => {
      if (!teamData || !selectedGameweek || manualLineup.length === 0) {
        throw new Error("Team data and gameweek are required");
      }

      // Use manualLineup which includes all transfers for this gameweek
      // Filter out transferred-out players (empty slots)
      const activeLineup = manualLineup.filter(pick => !pick.is_transferred_out);

      const response = await fetch("/api/transfer-planner/auto-optimize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          picks: activeLineup,
          gameweek: selectedGameweek
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Optimization failed");
      }

      return response.json();
    },
    onSuccess: (data: OptimizedLineup) => {
      setOptimizedLineup(data);
    },
    onError: (error: Error) => {
      toast({
        title: "Optimization Failed",
        description: error.message,
        variant: "destructive"
      });
    }
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

  // Calculate chip recommendations for the current draft
  const getChipRecommendations = (): { bboost: number[], tripleC: number[], freehit: number[] } | null => {
    if (!selectedGameweek || !playerProjections || !playerProjections6GW || !teamData?.picks || !manualLineup.length) {
      return null;
    }

    const nextGWs = getNextGameweeks();
    const remaining = getRemainingChips();
    const recommendations = { bboost: [] as number[], tripleC: [] as number[], freehit: [] as number[] };

    // Helper to determine which instance of a chip is available (1st or 2nd)
    const getChipInstance = (chipType: ChipType): 1 | 2 | null => {
      const usedCount = historyData?.chips?.filter(c => c.name === chipType).length || 0;
      const plannedCount = Object.values(plannedChips).filter(c => c === chipType).length;
      const totalUsed = usedCount + plannedCount;
      
      if (totalUsed === 0) return 1; // First instance available
      if (totalUsed === 1) return 2; // Second instance available
      return null; // Both used
    };

    // Helper to filter gameweeks based on chip instance
    // Second set of chips only available from GW 20+
    const getValidGameweeks = (instance: 1 | 2 | null) => {
      if (!instance) return [];
      if (instance === 1) return nextGWs; // First instance: all next 6 GWs
      return nextGWs.filter(gw => gw.id >= 20); // Second instance: only GW 20+
    };

    // Best Bench Boost: Find top 2 gameweeks with maximum bench points
    // This now respects the selected draft, mode (Manual/Auto), and checks all 6 gameweeks
    const bboostInstance = getChipInstance('bboost');
    if (bboostInstance) {
      const validGWs = getValidGameweeks(bboostInstance);
      const gwScores: { gw: number; points: number }[] = [];

      validGWs.forEach(gw => {
        const squad = getSquadAtGameweek(gameweekTransfers, gw.id);
        let benchPoints = 0;

        if (plannerMode === "manual") {
          // For Manual mode: use the squad's position property (which is maintained through transfers)
          // Bench players are those at positions 12-15
          const benchPlayers = squad.filter(pick => pick.position > 11);

          benchPlayers.forEach(pick => {
            const projection = playerProjections6GW.find((p: any) => p.playerId === pick.element);
            if (projection?.gameweekProjections) {
              benchPoints += projection.gameweekProjections[gw.id.toString()] || 0;
            }
          });
        } else {
          // For Auto mode: calculate which players would be benched after auto-optimization
          // Get all 15 players with their projections for this gameweek
          const playersWithPoints = squad.map(pick => {
            const player = getPlayerById(pick.element);
            const playerData = playerProjections6GW.find((p: any) => p.playerId === pick.element);
            const gwPoints = playerData?.gameweekProjections?.[gw.id.toString()] || 0;
            
            return {
              element: pick.element,
              position: player?.element_type || 0,
              projectedPoints: gwPoints
            };
          });

          // Group by position and sort by points
          const gkps = playersWithPoints.filter(p => p.position === 1).sort((a, b) => b.projectedPoints - a.projectedPoints);
          const defs = playersWithPoints.filter(p => p.position === 2).sort((a, b) => b.projectedPoints - a.projectedPoints);
          const mids = playersWithPoints.filter(p => p.position === 3).sort((a, b) => b.projectedPoints - a.projectedPoints);
          const fwds = playersWithPoints.filter(p => p.position === 4).sort((a, b) => b.projectedPoints - a.projectedPoints);

          // Try all valid formations and find the best starting 11
          const validFormations = [
            { def: 3, mid: 4, fwd: 3 }, { def: 3, mid: 5, fwd: 2 },
            { def: 4, mid: 3, fwd: 3 }, { def: 4, mid: 4, fwd: 2 },
            { def: 4, mid: 5, fwd: 1 }, { def: 5, mid: 3, fwd: 2 },
            { def: 5, mid: 4, fwd: 1 }, { def: 5, mid: 2, fwd: 3 }
          ];

          let bestStarting11: any[] = [];
          let bestFormationPoints = 0;

          validFormations.forEach(formation => {
            if (defs.length >= formation.def && mids.length >= formation.mid && fwds.length >= formation.fwd) {
              const selected = [
                gkps[0],
                ...defs.slice(0, formation.def),
                ...mids.slice(0, formation.mid),
                ...fwds.slice(0, formation.fwd)
              ].filter(Boolean);
              
              const formationPoints = selected.reduce((sum, p) => sum + (p?.projectedPoints || 0), 0);
              
              if (formationPoints > bestFormationPoints) {
                bestFormationPoints = formationPoints;
                bestStarting11 = selected;
              }
            }
          });

          // The bench players are those not in the best starting 11
          const starting11Ids = new Set(bestStarting11.map(p => p.element));
          const benchPlayers = playersWithPoints.filter(p => !starting11Ids.has(p.element));
          benchPoints = benchPlayers.reduce((sum, p) => sum + p.projectedPoints, 0);
        }

        gwScores.push({ gw: gw.id, points: benchPoints });
      });

      // Sort by points descending and take top 2
      gwScores.sort((a, b) => b.points - a.points);
      recommendations.bboost = gwScores.slice(0, 2).map(s => s.gw);
    }

    // Best Triple Captain: Find top 2 gameweeks where captain has highest points
    const tcInstance = getChipInstance('3xc');
    if (tcInstance) {
      const validGWs = getValidGameweeks(tcInstance);
      const captainPick = manualLineup.find(p => p.is_captain);
      if (captainPick) {
        const gwScores: { gw: number; points: number }[] = [];

        validGWs.forEach(gw => {
          const projection = playerProjections.find(p => p.playerId === captainPick.element);
          if (projection?.gameweekProjections) {
            const points = projection.gameweekProjections[gw.id.toString()] || 0;
            gwScores.push({ gw: gw.id, points });
          }
        });

        // Sort by points descending and take top 2
        gwScores.sort((a, b) => b.points - a.points);
        recommendations.tripleC = gwScores.slice(0, 2).map(s => s.gw);
      }
    }

    // Best Free Hit: Find top 2 gameweeks with lowest current squad points
    const fhInstance = getChipInstance('freehit');
    if (fhInstance) {
      const validGWs = getValidGameweeks(fhInstance);
      const gwScores: { gw: number; points: number }[] = [];

      validGWs.forEach(gw => {
        const lineup = getBaselineLineup(gw.id);
        const startingPlayers = lineup.filter(pick => pick.position <= 11);
        let startingPoints = 0;

        startingPlayers.forEach(pick => {
          const projection = playerProjections.find(p => p.playerId === pick.element);
          if (projection?.gameweekProjections) {
            startingPoints += projection.gameweekProjections[gw.id.toString()] || 0;
          }
        });

        gwScores.push({ gw: gw.id, points: startingPoints });
      });

      // Sort by points ascending (lowest first) and take top 2
      gwScores.sort((a, b) => a.points - b.points);
      recommendations.freehit = gwScores.slice(0, 2).map(s => s.gw);
    }

    return recommendations;
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
        gameweekTransfers: structuredClone(gameweekTransfers),
        plannedChips: structuredClone(plannedChips),
        mode: plannerMode,
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
    
    // Clear player popup and optimized lineup when gameweek changes
    setSelectedPlayer(null);
    setOptimizedLineup(null);
    
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
      const baseLineup = applyBuyPriceOverrides([...teamData.picks]);
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
    gwTransfers.transferredOut.forEach(transferOut => {
      lineupWithTransfers = lineupWithTransfers.map(pick => {
        if (pick.position === transferOut.position) {
          return { ...pick, is_transferred_out: true };
        }
        return pick;
      });
    });
    
    // Apply buy price overrides before setting state
    lineupWithTransfers = applyBuyPriceOverrides(lineupWithTransfers);
    
    // Apply saved captain/vice-captain if available (from draft loading)
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
    
    setManualLineup(lineupWithTransfers);
  }, [selectedGameweek, activeDraft, gameweekTransfers, buyPriceOverridesData, buyPricesData, savedCaptainInfo]);

  // Auto-run optimization when Auto mode is selected
  useEffect(() => {
    if (plannerMode === "auto" && selectedGameweek && teamData && manualLineup.length > 0 && !optimizeMutation.isPending) {
      optimizeMutation.mutate();
    }
  }, [plannerMode, selectedGameweek, teamData, manualLineup]);

  const handleSearch = () => {
    if (managerId.trim()) {
      const trimmedId = managerId.trim();
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
    return points !== undefined ? points : null;
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

  // Check if a player is transferred in (different from the baseline for this gameweek)
  const isPlayerTransferredIn = (pick: TeamPick): boolean => {
    if (!selectedGameweek) return false;
    
    const baseline = getBaselineLineup(selectedGameweek);
    const baselinePick = baseline.find(p => p.position === pick.position);
    
    // Player is transferred in if their ID is different from baseline
    return baselinePick ? pick.element !== baselinePick.element : false;
  };

  // Get selling price - prioritize calculation from buy price (editable) over API data
  const getSellingPrice = (pick: TeamPick): number => {
    const player = getPlayerById(pick.element);
    if (!player) return 0;
    
    // Priority 1: Calculate using FPL formula if we have purchase_price (from user edit or API)
    // For every 0.2m rise (2 in API units), you get 0.1m profit (1 in API units)
    if (pick.purchase_price !== undefined && !isNaN(pick.purchase_price)) {
      const purchasePrice = pick.purchase_price;
      const currentPrice = player.now_cost;
      const profitPerRise = Math.floor((currentPrice - purchasePrice) / 2);
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
  const saveBuyPriceFromDialog = () => {
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
    
    // Calculate the new sell price
    const player = getPlayerById(pick.element);
    const currentPrice = player?.now_cost || 0;
    const profitPerRise = Math.floor((currentPrice - updatedPick.purchase_price) / 2);
    const newSellPrice = (updatedPick.purchase_price + profitPerRise) / 10;
    
    // Update manualLineup
    const newManualLineup = manualLineup.map(p => p.element === pick.element ? updatedPick : p);
    setManualLineup(newManualLineup);

    setEditBuyPriceDialog(null);
    setEditBuyPriceValue("");
    setHasUnsavedChanges(true);
    
    // Show confirmation toast
    toast({ 
      title: "Buy Price Updated", 
      description: `Buy price changed to £${newPrice.toFixed(1)}m. Sell price auto-calculated to £${newSellPrice.toFixed(1)}m.`
    });
  };

  // Cancel editing sell price
  const cancelEditingSellPrice = () => {
    setEditingSellPrice(null);
    setEditSellPriceValue("");
  };

  // Calculate initial bank for the selected gameweek (before any transfers in that GW)
  const calculateInitialBank = (): number => {
    if (!teamData?.transfers?.bank || !selectedGameweek) return 0;
    
    const nextGWs = getNextGameweeks();
    const firstGW = nextGWs[0]?.id;
    
    // For the first gameweek in the planning horizon, use the actual team bank
    if (selectedGameweek === firstGW) {
      return teamData.transfers.bank / 10; // Convert from API format
    }
    
    // For subsequent gameweeks, initial bank = max(0, Cash after transfers from previous GW)
    const previousGW = selectedGameweek - 1;
    
    // Calculate cash after transfers for previous gameweek
    const teamBank = teamData.transfers.bank / 10;
    let cumulativeBank = teamBank;
    
    nextGWs.forEach(gw => {
      if (gw.id <= previousGW) {
        const gwTransfers = gameweekTransfers[gw.id];
        if (gwTransfers) {
          // Add completed transfers effect
          if (gwTransfers.completed) {
            gwTransfers.completed.forEach(transfer => {
              cumulativeBank += transfer.sellingPrice - transfer.buyingPrice;
            });
          }
          
          // Add pending transferred out players' selling prices
          if (gw.id === previousGW && gwTransfers.transferredOut) {
            gwTransfers.transferredOut.forEach(transfer => {
              cumulativeBank += transfer.sellingPrice;
            });
          }
        }
      }
    });
    
    // Return max(0, previous GW's cash after transfers)
    return Math.max(0, cumulativeBank);
  };

  // Calculate bank after transfers for the selected gameweek
  const calculateBankAfterTransfers = (): number => {
    const initialBank = calculateInitialBank();
    
    // Add effect of current gameweek's transfers
    const totalBuyingPrice = completedTransfers.reduce((sum, t) => sum + t.buyingPrice, 0);
    const totalSellingPrice = completedTransfers.reduce((sum, t) => sum + t.sellingPrice, 0);
    
    // Add selling prices from players transferred out but not yet replaced
    const pendingSellingPrice = transferredOutPlayers.reduce((sum, t) => sum + t.sellingPrice, 0);
    
    return initialBank + totalSellingPrice + pendingSellingPrice - totalBuyingPrice;
  };

  // Calculate current bank based on initial bank and completed transfers (DEPRECATED - use calculateBankAfterTransfers)
  const calculateCurrentBank = (): number => {
    return calculateBankAfterTransfers();
  };

  // Calculate transfers used for a specific gameweek by comparing with baseline
  const calculateTransfersUsedForGameweek = (gameweek: number): number => {
    if (!teamData?.picks) return 0;
    
    // Get the baseline lineup for this gameweek
    const baseline = getBaselineLineup(gameweek);
    
    // Get the current/final lineup for this gameweek (with all cumulative transfers applied)
    let currentLineup = [...baseline];
    
    // Apply all transfers from previous gameweeks
    const nextGWs = getNextGameweeks();
    nextGWs.forEach(gw => {
      if (gw.id <= gameweek) {
        const gwTransfers = gameweekTransfers[gw.id];
        if (gwTransfers && gwTransfers.completed) {
          gwTransfers.completed.forEach(transfer => {
            // Replace the transferred out player with the transferred in player
            currentLineup = currentLineup.map(pick => {
              if (pick.element === transfer.outPlayerId) {
                return { ...pick, element: transfer.inPlayerId };
              }
              return pick;
            });
          });
        }
      }
    });
    
    // Count how many players are different from the baseline
    let transfersUsed = 0;
    baseline.forEach((baselinePick) => {
      const currentPick = currentLineup.find(p => p.position === baselinePick.position);
      if (currentPick && currentPick.element !== baselinePick.element) {
        transfersUsed++;
      }
    });
    
    return transfersUsed;
  };

  // Calculate actual transfers used by comparing with baseline lineup for this gameweek
  const calculateTransfersUsed = (): number => {
    if (!teamData?.picks || !selectedGameweek) return 0;
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
    
    // For the first gameweek in planning, use the base from API
    if (selectedGameweek === firstPlanningGW) {
      return teamData.transfers.limit || 1;
    }
    
    // For subsequent gameweeks: Initial for GW_N = max(1, min(5, 1 + Transfers remaining for GW_(N-1)))
    // Where Transfers remaining = Initial - Used
    // EXCEPTIONS:
    // - Free Hit gameweeks don't affect rollover (transfers don't carry over)
    // - Wildcard gameweeks: you don't get +1 FT for that GW, but existing FTs carry through
    // - Maximum of 5 free transfers can be banked
    let currentInitial = teamData.transfers.limit || 1;
    
    for (let gw = firstPlanningGW; gw < selectedGameweek; gw++) {
      // Check for chips that affect transfer banking
      const isFreeHitGW = plannedChips[gw] === 'freehit';
      const isWildcardGW = plannedChips[gw] === 'wildcard';
      
      if (isFreeHitGW) {
        // Free Hit: keep currentInitial unchanged (no rollover effect)
        continue;
      } else if (isWildcardGW) {
        // Wildcard GW: transfers carry through unchanged (you don't get +1 FT for the Wildcard GW itself)
        // currentInitial stays the same for next GW, then gets +1 normally
        // So do nothing here, just maintain currentInitial
      } else {
        // Normal transfer rollover calculation
        const used = calculateTransfersUsedForGameweek(gw);
        // Calculate remaining for this gameweek
        const remaining = currentInitial - used;
        // Next gameweek's initial = max(1, min(5, 1 + this gameweek's remaining))
        // Cap at 5 FT maximum as per FPL rules
        currentInitial = Math.max(1, Math.min(5, 1 + remaining));
      }
    }
    
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
    
    // Start with base team
    let squad = [...teamData.picks];
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
          gwTransfers.completed.forEach(transfer => {
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

  // Calculate auto mode points for a draft at a specific gameweek
  const calculateAutoPointsForGameweek = (squad: TeamPick[], gameweek: number, projections6GW: any[], chipForGameweek?: ChipType | null): number => {
    if (!projections6GW || !Array.isArray(projections6GW)) return 0;
    
    const isBenchBoostActive = chipForGameweek === 'bboost';
    const isTripleCaptainActive = chipForGameweek === '3xc';
    
    // Get all 15 players with their projections for this gameweek
    const playersWithPoints = squad.map(pick => {
      const player = getPlayerById(pick.element);
      const playerData = projections6GW.find((p: any) => p.playerId === pick.element);
      const gwPoints = playerData?.gameweekProjections?.[gameweek.toString()] || 0;
      
      return {
        element: pick.element,
        position: player?.element_type || 0,
        projectedPoints: gwPoints
      };
    });
    
    if (isBenchBoostActive) {
      // With Bench Boost, all 15 players score
      const allPlayersPoints = playersWithPoints.reduce((sum, p) => sum + p.projectedPoints, 0);
      // Add captain bonus (best player gets 2x normally, 3x with Triple Captain)
      const captain = playersWithPoints.reduce((best, p) => p.projectedPoints > best.projectedPoints ? p : best, playersWithPoints[0]);
      const captainBonus = isTripleCaptainActive ? (captain?.projectedPoints || 0) * 2 : (captain?.projectedPoints || 0);
      return allPlayersPoints + captainBonus;
    }
    
    // Normal auto mode: optimize formation
    // Group by position and sort by points
    const gkps = playersWithPoints.filter(p => p.position === 1).sort((a, b) => b.projectedPoints - a.projectedPoints);
    const defs = playersWithPoints.filter(p => p.position === 2).sort((a, b) => b.projectedPoints - a.projectedPoints);
    const mids = playersWithPoints.filter(p => p.position === 3).sort((a, b) => b.projectedPoints - a.projectedPoints);
    const fwds = playersWithPoints.filter(p => p.position === 4).sort((a, b) => b.projectedPoints - a.projectedPoints);
    
    // Try all valid formations and find best for this gameweek
    const validFormations = [
      { def: 3, mid: 4, fwd: 3 }, { def: 3, mid: 5, fwd: 2 },
      { def: 4, mid: 3, fwd: 3 }, { def: 4, mid: 4, fwd: 2 },
      { def: 4, mid: 5, fwd: 1 }, { def: 5, mid: 3, fwd: 2 },
      { def: 5, mid: 4, fwd: 1 }, { def: 5, mid: 2, fwd: 3 }
    ];
    
    let bestPoints = 0;
    validFormations.forEach(formation => {
      if (defs.length >= formation.def && mids.length >= formation.mid && fwds.length >= formation.fwd) {
        const selected = [
          gkps[0],
          ...defs.slice(0, formation.def),
          ...mids.slice(0, formation.mid),
          ...fwds.slice(0, formation.fwd)
        ];
        
        const formationPoints = selected.reduce((sum, p) => sum + (p?.projectedPoints || 0), 0);
        
        // Find captain (highest points in starting 11)
        const captain = selected.slice(1).reduce((max, p) => 
          (p?.projectedPoints || 0) > (max?.projectedPoints || 0) ? p : max
        , selected[1]);
        
        // Captain bonus: 1x normally (for 2x total), 2x with Triple Captain (for 3x total)
        const captainBonus = isTripleCaptainActive ? (captain?.projectedPoints || 0) * 2 : (captain?.projectedPoints || 0);
        const totalWithCaptain = formationPoints + captainBonus;
        
        if (totalWithCaptain > bestPoints) {
          bestPoints = totalWithCaptain;
        }
      }
    });
    
    return bestPoints;
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
    // Only use COMPLETED transfers - ignore in-progress transferredOut
    signature.transfers = {};
    nextGWs.forEach(gw => {
      const gwTransfers = draftTransfers[gw.id] || { completed: [] };
      signature.transfers[gw.id] = {
        completed: [...gwTransfers.completed].sort((a, b) => {
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

  // Identify duplicate drafts by comparing signatures
  const identifyDuplicateDrafts = () => {
    const nextGWs = getNextGameweeks();
    if (nextGWs.length === 0) return {};
    
    // Map to store signature -> earliest draft with that signature
    const signatureMap = new Map<string, string>();
    const duplicates: Record<string, { isDuplicate: boolean; duplicateOfKey: string }> = {};
    
    // Array of all drafts in creation order (Base first, then saved drafts)
    const allDrafts = [
      { 
        draftKey: 'Base', 
        transfers: {}, 
        // For Base: use plannedChips only if Base is the active draft, otherwise use empty object
        chips: activeDraft === 'Base' ? plannedChips : {}
      },
      ...savedDrafts.map((draft: any) => ({
        draftKey: draft.draftLetter,
        // Always use the saved gameweekTransfers from the draft object for accurate comparison
        transfers: draft.gameweekTransfers || {},
        chips: draft.plannedChips || {}
      }))
    ];
    
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

  // Build comparison data for all drafts with both Manual and Auto modes
  const buildDraftComparisonData = () => {
    if (!teamData?.picks || !playerProjections6GW) return [];
    
    const nextGWs = getNextGameweeks();
    if (nextGWs.length === 0) return [];
    
    const comparisonRows: any[] = [];
    
    // Base Draft - Manual mode
    const baseManualRow = {
      draftKey: 'Base',
      mode: 'Manual lineup',
      gameweeks: {} as Record<number, number>,
      total: 0
    };
    
    nextGWs.forEach(gw => {
      let squad = getSquadAtGameweek({}, gw.id); // Empty transfers = base team
      
      // Apply captain info from current manual lineup (for Base draft)
      const captainPick = manualLineup.find(p => p.is_captain);
      const viceCaptainPick = manualLineup.find(p => p.is_vice_captain);
      if (captainPick || viceCaptainPick) {
        squad = squad.map(pick => ({
          ...pick,
          is_captain: pick.element === captainPick?.element,
          is_vice_captain: pick.element === viceCaptainPick?.element
        }));
      }
      
      // Base Draft always has no chips
      const chipForGW = null;
      const points = calculateManualPointsForGameweek(squad, gw.id, playerProjections6GW, chipForGW);
      baseManualRow.gameweeks[gw.id] = points;
      baseManualRow.total += points;
    });
    comparisonRows.push(baseManualRow);
    
    // Base Draft - Auto mode
    const baseAutoRow = {
      draftKey: 'Base',
      mode: 'Auto lineup',
      gameweeks: {} as Record<number, number>,
      total: 0
    };
    
    nextGWs.forEach(gw => {
      const squad = getSquadAtGameweek({}, gw.id);
      // Base Draft always has no chips
      const chipForGW = null;
      const points = calculateAutoPointsForGameweek(squad, gw.id, playerProjections6GW, chipForGW);
      baseAutoRow.gameweeks[gw.id] = points;
      baseAutoRow.total += points;
    });
    comparisonRows.push(baseAutoRow);
    
    // All saved drafts - both Manual and Auto modes
    savedDrafts.forEach(draft => {
      // Always use the saved gameweekTransfers from database for accurate comparison
      // This ensures each draft shows its own saved transfers, not mixed with current editing state
      const draftTransfers = draft.gameweekTransfers || {};
      const draftChips = draft.plannedChips || {};
      
      // Manual mode row
      const draftManualRow = {
        draftKey: draft.draftLetter,
        mode: 'Manual lineup',
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
        draftManualRow.gameweeks[gw.id] = points;
        draftManualRow.total += points;
      });
      comparisonRows.push(draftManualRow);
      
      // Auto mode row
      const draftAutoRow = {
        draftKey: draft.draftLetter,
        mode: 'Auto lineup',
        gameweeks: {} as Record<number, number>,
        total: 0
      };
      
      nextGWs.forEach(gw => {
        const squad = getSquadAtGameweek(draftTransfers, gw.id);
        const chipForGW = draftChips[gw.id] || draftChips[gw.id.toString()] || null;
        const points = calculateAutoPointsForGameweek(squad, gw.id, playerProjections6GW, chipForGW);
        draftAutoRow.gameweeks[gw.id] = points;
        draftAutoRow.total += points;
      });
      comparisonRows.push(draftAutoRow);
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
    
    if (wasCaptain) {
      // Starting player was captain - current vice captain becomes captain, new player becomes vice captain
      const currentViceCaptain = newLineup.find(p => p.is_vice_captain);
      
      newLineup.forEach((pick, index) => {
        if (index === startingIndex) {
          // New starting player becomes vice captain
          newLineup[index] = { ...pick, is_vice_captain: true, is_captain: false };
        } else if (currentViceCaptain && pick.element === currentViceCaptain.element) {
          // Current vice captain becomes captain
          newLineup[index] = { ...pick, is_captain: true, is_vice_captain: false };
        } else if (index === 11 + benchIndex) {
          // Player going to bench loses captain status
          newLineup[index] = { ...pick, is_captain: false, is_vice_captain: false };
        }
      });
    } else if (wasViceCaptain) {
      // Starting player was vice captain - new player becomes vice captain
      newLineup[startingIndex] = { ...newLineup[startingIndex], is_vice_captain: true, is_captain: false };
      newLineup[11 + benchIndex] = { ...newLineup[11 + benchIndex], is_vice_captain: false, is_captain: false };
    } else {
      // Regular swap - preserve captain/vice captain flags
      newLineup[startingIndex] = { ...newLineup[startingIndex], is_captain: false, is_vice_captain: false };
      newLineup[11 + benchIndex] = { ...newLineup[11 + benchIndex], is_captain: false, is_vice_captain: false };
    }
    
    setManualLineup(newLineup);
    
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
      title: "Players Swapped",
      description: `${newStartingPlayer} has been moved to Starting 11, instead of ${newBenchPlayer} who is now in bench position ${benchPriority}.${extraInfo}`
    });
    
    // If we were in Base, finalize the new draft
    if (wasInBase) {
      setTimeout(() => finalizeNewDraft(targetDraft), 100);
    } else {
      setHasUnsavedChanges(true);
    }
  };

  // Move bench player up or down (excluding GK)
  const moveBenchPlayer = (benchIndex: number, direction: 'up' | 'down') => {
    // Check if we can create a draft
    const targetDraft = getTargetDraftForChanges();
    if (!targetDraft) return;
    
    const wasInBase = activeDraft === "Base";
    
    if (benchIndex === 0) return; // Can't move GK
    
    const actualIndex = 11 + benchIndex;
    const swapIndex = direction === 'up' ? actualIndex - 1 : actualIndex + 1;
    
    // Don't allow moving past GK or past last bench player
    if (swapIndex === 11 || swapIndex > 14) return;
    
    const newLineup = [...manualLineup];
    const movedPlayer = newLineup[actualIndex];
    const swappedPlayer = newLineup[swapIndex];
    newLineup[actualIndex] = swappedPlayer;
    newLineup[swapIndex] = movedPlayer;
    
    // Update positions
    newLineup[actualIndex].position = actualIndex + 1;
    newLineup[swapIndex].position = swapIndex + 1;
    
    setManualLineup(newLineup);
    
    // Show confirmation toast with both players (bench priority excludes GK, so subtract 1)
    const movedPlayerName = getPlayerById(movedPlayer.element)?.web_name;
    const swappedPlayerName = getPlayerById(swappedPlayer.element)?.web_name;
    const movedPlayerNewPriority = swapIndex - 11; // Outfield bench priority (1, 2, 3)
    const swappedPlayerNewPriority = actualIndex - 11; // Outfield bench priority (1, 2, 3)
    
    toast({
      title: "Bench Priority Changed",
      description: `Bench priority of ${movedPlayerName} has been moved ${direction === 'up' ? 'up' : 'down'} to ${movedPlayerNewPriority}, and bench priority of ${swappedPlayerName} has been moved ${direction === 'up' ? 'down' : 'up'} to ${swappedPlayerNewPriority}`
    });
    
    // If we were in Base, finalize the new draft
    if (wasInBase) {
      setTimeout(() => finalizeNewDraft(targetDraft), 100);
    } else {
      setHasUnsavedChanges(true);
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
          
          return prev.map(pick => {
            if (pick.element === playerId) {
              return { ...pick, is_captain: true, is_vice_captain: false };
            } else if (newCaptainIsCurrentViceCaptain && pick.element === currentCaptain?.element) {
              return { ...pick, is_captain: false, is_vice_captain: true };
            } else if (pick.is_captain) {
              return { ...pick, is_captain: false };
            } else {
              return pick;
            }
          });
        });
        
        setCaptainConfirmation(null);
        setSelectedPlayer(null);
        
        // Step 6: Save the draft again with the updated captain info
        setHasUnsavedChanges(true);
        setTimeout(() => saveCurrentDraft(), 100);
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
      setManualLineup(prev => {
        const currentCaptain = prev.find(p => p.is_captain);
        const currentViceCaptain = prev.find(p => p.is_vice_captain);
        const newCaptainIsCurrentViceCaptain = currentViceCaptain?.element === playerId;
        
        return prev.map(pick => {
          if (pick.element === playerId) {
            return { ...pick, is_captain: true, is_vice_captain: false };
          } else if (newCaptainIsCurrentViceCaptain && pick.element === currentCaptain?.element) {
            return { ...pick, is_captain: false, is_vice_captain: true };
          } else if (pick.is_captain) {
            return { ...pick, is_captain: false };
          } else {
            return pick;
          }
        });
      });
      setCaptainConfirmation(null);
      setSelectedPlayer(null);
      
      // Save the changes
      setHasUnsavedChanges(true);
      setTimeout(() => saveCurrentDraft(), 100);
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
          
          return prev.map(pick => {
            if (pick.element === playerId) {
              return { ...pick, is_vice_captain: true, is_captain: false };
            } else if (newViceCaptainIsCurrentCaptain && pick.element === currentViceCaptain?.element) {
              return { ...pick, is_vice_captain: false, is_captain: true };
            } else if (pick.is_vice_captain) {
              return { ...pick, is_vice_captain: false };
            } else {
              return pick;
            }
          });
        });
        
        setViceCaptainConfirmation(null);
        setSelectedPlayer(null);
        
        // Step 6: Save the draft again with the updated vice captain info
        setHasUnsavedChanges(true);
        setTimeout(() => saveCurrentDraft(), 100);
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
      setManualLineup(prev => {
        const currentCaptain = prev.find(p => p.is_captain);
        const currentViceCaptain = prev.find(p => p.is_vice_captain);
        const newViceCaptainIsCurrentCaptain = currentCaptain?.element === playerId;
        
        return prev.map(pick => {
          if (pick.element === playerId) {
            return { ...pick, is_vice_captain: true, is_captain: false };
          } else if (newViceCaptainIsCurrentCaptain && pick.element === currentViceCaptain?.element) {
            return { ...pick, is_vice_captain: false, is_captain: true };
          } else if (pick.is_vice_captain) {
            return { ...pick, is_vice_captain: false };
          } else {
            return pick;
          }
        });
      });
      setViceCaptainConfirmation(null);
      setSelectedPlayer(null);
      
      // Save the changes
      setHasUnsavedChanges(true);
      setTimeout(() => saveCurrentDraft(), 100);
    }
  };

  // Handle transferring a player out
  const handleTransferOut = async (pick: TeamPick) => {
    const player = getPlayerById(pick.element);
    if (!player) return;

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

    const sellingPrice = getSellingPrice(pick);

    const transferOut: TransferOut = {
      playerId: player.id,
      playerName: player.web_name,
      position: pick.position,
      elementType: player.element_type,
      sellingPrice: sellingPrice,
    };

    const newTransferredOut = [...transferredOutPlayers, transferOut];
    setTransferredOutPlayers(newTransferredOut);
    
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
            gameweekTransfers: structuredClone(updatedGameweekTransfers) // Deep clone to prevent shared references
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
      p.element === pick.element 
        ? { ...p, is_transferred_out: true }
        : p
    ));

    const positionName = player.element_type === 1 ? 'Goalkeeper' : player.element_type === 2 ? 'Defender' : player.element_type === 3 ? 'Midfielder' : 'Forward';
    toast({
      title: "Player Transferred Out",
      description: `${player.web_name} (${positionName}) has been transferred out for £${sellingPrice.toFixed(1)}m. Select a replacement ${positionName.toLowerCase()}.`
    });
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
    const player = getPlayerById(playerId);
    if (!player) return;

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

    // Calculate new states
    const newTransfers = [...completedTransfers, completedTransfer];
    const newTransferredOut = transferredOutPlayers.filter((_, i) => i !== transferOutIndex);
    
    // Update all states
    setCompletedTransfers(newTransfers);
    setTransferredOutPlayers(newTransferredOut);
    
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

    // Replace the transferred out player at the same position
    setManualLineup(prev => prev.map(p => {
      if (p.position === transferredOut.position && p.is_transferred_out) {
        return {
          element: playerId,
          position: transferredOut.position,
          multiplier: 1,
          is_captain: false,
          is_vice_captain: false,
          selling_price: player.now_cost,
          purchase_price: player.now_cost, // Set purchase price to current price for new transfers
          is_transferred_out: false,
        };
      }
      return p;
    }));

    toast({
      title: "Transfer Completed",
      description: `Transferred out ${transferredOut.playerName} for ${player.web_name} (Sold for £${transferredOut.sellingPrice.toFixed(1)}m, Bought for £${buyingPrice.toFixed(1)}m)`
    });

    // If in Auto mode, trigger re-optimization with the updated lineup
    if (plannerMode === "auto") {
      // Need to wait for state updates to complete, then re-optimize
      setTimeout(() => {
        optimizeMutation.mutate();
      }, 50);
    }

    // Scroll back to team lineup to see the new player
    setTimeout(() => {
      if (teamLineupRef.current) {
        teamLineupRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, plannerMode === "auto" ? 500 : 100); // Wait longer in auto mode for optimization to complete

    // Auto-save draft after transfer in with the updated transfers
    if (activeDraft !== "Base" && newTransferredOut.length === 0) {
      const draftToSave = activeDraft; // Capture draft letter before async operation
      setTimeout(() => saveCurrentDraft(updatedGameweekTransfers, draftToSave), 200);
    }
  };

  // Reset all transfers for the current gameweek and restore baseline
  const handleResetTransfers = () => {
    if (!teamData?.picks || !selectedGameweek) return;
    
    // Get the baseline lineup for this gameweek
    const baseline = getBaselineLineup(selectedGameweek);
    setManualLineup(baseline);
    
    // Clear transfers for this gameweek
    setTransferredOutPlayers([]);
    setCompletedTransfers([]);
    
    // Clear from gameweek-specific storage
    setGameweekTransfers(gwTransfers => ({
      ...gwTransfers,
      [selectedGameweek]: {
        transferredOut: [],
        completed: []
      }
    }));
    
    toast({
      title: "Transfers Reset",
      description: "All transfers for this gameweek have been undone."
    });
  };

  // Reset all transfers across all gameweeks
  const handleResetAllTransfers = () => {
    if (!teamData?.picks || !selectedGameweek) return;
    
    // Reset to original team data
    setManualLineup([...teamData.picks]);
    
    // Clear all transfer data
    setTransferredOutPlayers([]);
    setCompletedTransfers([]);
    setGameweekTransfers({});
    
    toast({
      title: "All Transfers Reset",
      description: "All transfers across all gameweeks have been undone."
    });
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
    
    // Remove ALL transfers across ALL gameweeks that involve this position
    const updatedGameweekTransfers: typeof gameweekTransfers = {};
    
    Object.keys(gameweekTransfers).forEach(gw => {
      const gwNum = parseInt(gw);
      const gwTransfers = gameweekTransfers[gwNum];
      
      // Filter out transfers at this position
      const newTransferredOut = gwTransfers.transferredOut.filter(t => t.position !== position);
      const newCompleted = gwTransfers.completed.filter(t => {
        // Remove any transfer where either the out or in happened at this position
        const outPosition = teamData.picks.find(p => p.element === t.outPlayerId)?.position;
        return outPosition !== position;
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
    
    // Restore the original player at this position
    setManualLineup(prev => prev.map(p => {
      if (p.position === position) {
        return { ...originalPick };
      }
      return p;
    }));
    
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

  // Helper function to generate tooltip content for a draft
  const getDraftTooltipContent = (draft: any) => {
    if (!draft.gameweekTransfers || Object.keys(draft.gameweekTransfers).length === 0) {
      return "No transfers in this draft";
    }

    const gameweeks = Object.keys(draft.gameweekTransfers).sort((a, b) => Number(a) - Number(b));
    const tooltipLines: string[] = [];

    gameweeks.forEach(gw => {
      const gwData = draft.gameweekTransfers[gw];
      if (gwData.completed && gwData.completed.length > 0) {
        tooltipLines.push(`GW${gw}:`);
        gwData.completed.forEach((transfer: CompletedTransfer) => {
          tooltipLines.push(`  ${transfer.outPlayerName} → ${transfer.inPlayerName}`);
        });
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
          gameweekTransfers: structuredClone(transfersData), // Deep clone to prevent shared references
          plannedChips: structuredClone(plannedChips), // Include planned chips
          mode: plannerMode,
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
    // Flush any pending autosave before switching
    await flushAutosave();
    
    // Always clear optimized lineup when switching drafts
    setOptimizedLineup(null);
    
    // Mark that we're loading a draft to prevent autosave during load
    isLoadingDraftRef.current = true;
    
    if (draftLetter === "Base") {
      // Switch to Base Draft - reset to original team
      setGameweekTransfers({});
      setTransferredOutPlayers([]);
      setCompletedTransfers([]);
      setPlannedChips({}); // Reset planned chips
      setSavedCaptainInfo(null); // Clear saved captain info
      setActiveDraft("Base");
      setHasUnsavedChanges(false);
      if (teamData?.picks) {
        setManualLineup([...teamData.picks]);
      }
      isLoadingDraftRef.current = false;
      toast({ title: "Base Draft", description: "Switched to base team (no transfers)" });
    } else {
      try {
        const response = await fetch(`/api/transfer-planner/drafts/${searchedId}/${draftLetter}`);
        if (response.ok) {
          const data = await response.json();
          const draft = data.draft;
          
          console.log("DEBUG switchToDraft - Fetched draft data:", draft);
          console.log("DEBUG switchToDraft - Captain info from draft:", {
            captainPlayerId: draft.captainPlayerId,
            viceCaptainPlayerId: draft.viceCaptainPlayerId
          });
          
          // Reset ALL state for complete draft isolation
          // CRITICAL: Deep clone to prevent shared references between drafts
          setGameweekTransfers(structuredClone(draft.gameweekTransfers || {}));
          setPlannedChips(structuredClone(draft.plannedChips || {})); // Load planned chips
          setPlannerMode(draft.mode);
          
          // Save captain/vice-captain info to be applied AFTER useEffect rebuilds lineup
          const captainInfo = {
            captainPlayerId: draft.captainPlayerId || null,
            viceCaptainPlayerId: draft.viceCaptainPlayerId || null
          };
          
          console.log("DEBUG switchToDraft - Setting savedCaptainInfo to:", captainInfo);
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
        }
      } catch (error) {
        toast({ title: "Error", description: "Failed to load draft", variant: "destructive" });
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
      setManualLineup([...teamData.picks]);
    }
    
    // Auto-save the new draft immediately
    fetch("/api/transfer-planner/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        managerId: parseInt(searchedId),
        draftLetter: nextLetter,
        gameweekTransfers: emptyGameweekTransfers,
        mode: plannerMode,
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
          gameweekTransfers: structuredClone(gameweekTransfers), // Deep clone to prevent shared references
          mode: plannerMode,
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
      const response = await fetch(`/api/transfer-planner/drafts/${searchedId}/${activeDraft}`, {
        method: "DELETE"
      });

      if (response.ok) {
        // Switch to Base Draft
        switchToDraft("Base");
        await loadDrafts();
        toast({ title: "Draft Deleted", description: `Draft ${activeDraft} has been deleted` });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete draft", variant: "destructive" });
    }
  };

  const resetDraftAToBase = async () => {
    if (!teamData?.picks || !searchedId) return;

    const confirmed = window.confirm(
      "Are you sure you want to reset Draft A to match the Base Draft? This will remove all transfers and chips from Draft A."
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
          draftLetter: "A",
          gameweekTransfers: {}, // Empty transfers
          plannedChips: {}, // No chips
          captainPlayerId: captainPick?.element || null,
          viceCaptainPlayerId: viceCaptainPick?.element || null,
          mode: plannerMode,
          teamBank: teamData.transfers.bank / 10,
          teamValue: 0,
          totalProjectedPoints: 0,
          totalTransfersUsed: 0
        })
      });

      if (response.ok) {
        await loadDrafts();
        switchToDraft("A");
        toast({ title: "Draft A Reset", description: "Draft A has been reset to match the Base Draft" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to reset Draft A", variant: "destructive" });
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
          mode: plannerMode,
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
          mode: plannerMode,
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
          if (isActive) setActiveDraft("Base");
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
          // Draft A doesn't exist, create it as a duplicate of Base
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
              mode: plannerMode,
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
            if (isActive) setActiveDraft("Base");
          }
        }
      } catch (error) {
        console.error("Error initializing drafts:", error);
        if (isActive) setActiveDraft("Base");
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

  return (
    <div className="container mx-auto p-2 md:p-4 lg:p-6 space-y-3 md:space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-4">
        <div className="p-2 md:p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
          <Target className="h-5 w-5 md:h-8 md:w-8 text-white" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold">Transfer Planner</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Plan transfers & optimize your team</p>
        </div>
      </div>

      {/* Manager ID Input */}
      <Card>
        <CardHeader className="pb-2 md:pb-4">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Users className="h-4 w-4 md:h-5 md:w-5" />
            Manager ID
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="inline-flex items-center">
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="w-80 md:w-96 p-4">
                  <div className="space-y-2 text-sm">
                    <p className="font-semibold">To find your Manager ID:</p>
                    <ol className="list-decimal list-inside space-y-1.5 text-left">
                      <li className="pl-1">Visit fantasy.premierleague.com from your web browser (not the mobile app) and sign in to your account</li>
                      <li className="pl-1">Click on the Points tab</li>
                      <li className="pl-1">Check the URL in your browser's address bar</li>
                      <li className="pl-1">Your Manager ID is the number in the URL after "entry"</li>
                      <li className="pl-1">For example, in https://fantasy.premierleague.com/entry/<strong>123456</strong>/event/3, the Manager ID is <strong>123456</strong></li>
                    </ol>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2 md:pt-4">
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Enter FPL Manager ID"
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 h-8 md:h-10 text-sm md:text-base"
              data-testid="input-manager-id"
            />
            <Button 
              onClick={handleSearch}
              className="h-8 md:h-10 text-sm md:text-base"
              data-testid="button-search-manager"
            >
              Load Team
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Combined Selection Section */}
      {searchedId && teamData && selectedGameweek && (
        <Card className="sticky top-0 z-40 bg-background shadow-md">
          <CardContent className="pt-6 pb-4 space-y-4">
            {/* Draft Subsection */}
            <div>
              <div className="flex items-center gap-4 flex-wrap mb-2">
                <div className="text-base font-semibold min-w-[120px]">
                  Select Draft
                  {isSaving && activeDraft !== "Base" && (
                    <span className="ml-2 text-base text-blue-600 font-semibold animate-pulse">● Saving...</span>
                  )}
                  {!isSaving && lastSavedAt && activeDraft !== "Base" && (
                    <span className="ml-2 text-base text-green-600 font-semibold">✓ Saved</span>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap items-center">
              {/* Switch to Base */}
              <Button
                onClick={() => switchToDraft("Base")}
                variant={activeDraft === "Base" ? "default" : "outline"}
                className="h-9 text-base px-3"
                data-testid="button-switch-base"
              >
                Base
              </Button>

              {/* Saved Drafts */}
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
                          className="relative h-9 text-base px-3"
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
                    className="h-9 gap-1 border-dashed text-base px-3"
                    data-testid="button-new-draft"
                  >
                    <Plus className="h-4 w-4" />
                    New
                  </Button>
                )}
                </div>
              </div>

              {/* Action Buttons - Below selectors */}
              {activeDraft !== "Base" && (
                <div className="flex gap-2 flex-wrap pl-[140px] items-center">
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
                  
                  {activeDraft === "A" ? (
                    <Button
                      onClick={resetDraftAToBase}
                      variant="outline"
                      className="h-8 text-sm px-3 text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                      data-testid="button-reset-draft-a"
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1" />
                      Reset to Base
                    </Button>
                  ) : (
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

              {/* Bulk Actions */}
              {savedDrafts.length > 0 && activeDraft === "Base" && (
                <div className="flex gap-2 flex-wrap pl-[140px] items-center">
                  <Button
                    onClick={deleteAllDrafts}
                    variant="outline"
                    className="h-8 text-sm px-3 text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950/20"
                    data-testid="button-delete-all-drafts"
                  >
                    Delete All Drafts
                  </Button>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t" />

            {/* Lineup Subsection */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="text-base font-semibold min-w-[120px]">Select Lineup</div>
              <div className="flex gap-2 flex-wrap items-center">
                <Button
                  variant={plannerMode === "manual" ? "default" : "outline"}
                  className="h-9 text-base px-3"
                  onClick={() => setPlannerMode("manual")}
                  data-testid="mode-button-manual"
                >
                  Manual lineup
                </Button>
                <Button
                  variant={plannerMode === "auto" ? "default" : "outline"}
                  className="h-9 text-base px-3"
                  onClick={() => setPlannerMode("auto")}
                  data-testid="mode-button-auto"
                >
                  Auto lineup
                </Button>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t" />

            {/* Gameweek Subsection */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="text-base font-semibold min-w-[120px]">Select Gameweek</div>
              <div className="flex gap-2 flex-wrap items-center">
                {nextGameweeks.map(gw => (
                  <Button
                    key={gw.id}
                    variant={selectedGameweek === gw.id ? "default" : "outline"}
                    className="h-9 text-base font-semibold min-w-[2.5rem] md:min-w-[3rem] px-3"
                    onClick={() => {
                      setSelectedPlayer(null);
                      setSelectedGameweek(gw.id);
                    }}
                    data-testid={`gw-button-${gw.id}`}
                  >
                    {gw.id}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chips Planning */}
      {searchedId && teamData && selectedGameweek && (
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-background">
          <CardHeader className="pb-2 md:pb-4">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-amber-600" />
              <span>Chips Planning</span>
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
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 md:space-y-4 pt-2 md:pt-4">
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
                  <p><strong>⚠️ Deadline:</strong> Bench Boost 1 and Free Hit 1 must be used before GW 19</p>
                  <p><strong>Coming Soon:</strong> Second set of chips available from GW 20 onwards</p>
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

            {/* Chip Planning for Upcoming Gameweeks */}
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

            {/* Chip Recommendations */}
            {(() => {
              const recommendations = getChipRecommendations();
              const hasRecommendations = recommendations && (recommendations.bboost.length > 0 || recommendations.tripleC.length > 0 || recommendations.freehit.length > 0);
              
              return hasRecommendations ? (
                <div className="border-t pt-3">
                  <div className="mb-2">
                    <h4 className="text-xs md:text-sm font-semibold flex items-center gap-2">
                      <Sparkles className="h-3 w-3 md:h-4 md:w-4 text-blue-600" />
                      Chip Recommendations
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Based on next 6 gameweek projections
                    </p>
                  </div>
                  <div className="space-y-2">
                    {recommendations.bboost.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-green-700 dark:text-green-300 min-w-[100px]">
                          Bench Boost:
                        </span>
                        <div className="flex gap-1.5">
                          {recommendations.bboost.map((gw, index) => (
                            <div key={gw} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                              <span className="text-xs font-medium text-green-700 dark:text-green-300">
                                Option {index + 1}: GW{gw}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {recommendations.tripleC.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 min-w-[100px]">
                          Triple Captain:
                        </span>
                        <div className="flex gap-1.5">
                          {recommendations.tripleC.map((gw, index) => (
                            <div key={gw} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
                              <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                                Option {index + 1}: GW{gw}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {recommendations.freehit.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 min-w-[100px]">
                          Free Hit:
                        </span>
                        <div className="flex gap-1.5">
                          {recommendations.freehit.map((gw, index) => (
                            <div key={gw} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                              <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                                Option {index + 1}: GW{gw}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : null;
            })()}

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
        </Card>
      )}

      {/* Team Summary Stats */}
      {searchedId && teamData && selectedGameweek && (
        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white dark:from-green-950/20 dark:to-background">
          <CardHeader>
            <CardTitle className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                {activeDraft === "Base" ? "Base Draft Team Summary" : `Draft ${activeDraft} Team Summary`}
              </div>
              <div className="flex gap-1 md:gap-2">
                {(completedTransfers.length > 0 || transferredOutPlayers.length > 0) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetTransfers}
                    className="text-orange-600 border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/20 h-7 px-2 md:h-9 md:px-3"
                    data-testid="button-reset-gw-transfers"
                  >
                    <RotateCcw className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
                    <span className="hidden sm:inline">Undo This GW</span>
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
                    <span className="hidden sm:inline">Undo All GWs</span>
                  </Button>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {/* Formation */}
              <div className="p-4 rounded-lg bg-white dark:bg-gray-900 border">
                <div className="text-sm text-muted-foreground mb-1">Formation</div>
                <div className="text-2xl font-bold text-indigo-600">
                  {(() => {
                    if (plannerMode === "auto" && optimizedLineup) {
                      return optimizedLineup.formation;
                    } else {
                      const starting11 = manualLineup.slice(0, 11);
                      const defs = starting11.filter(p => getPlayerById(p.element)?.element_type === 2).length;
                      const mids = starting11.filter(p => getPlayerById(p.element)?.element_type === 3).length;
                      const fwds = starting11.filter(p => getPlayerById(p.element)?.element_type === 4).length;
                      return `${defs}-${mids}-${fwds}`;
                    }
                  })()}
                </div>
              </div>

              {/* Total Projected Points for Selected GW */}
              <div className="p-4 rounded-lg bg-white dark:bg-gray-900 border">
                <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
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
                <div className="text-2xl font-bold text-green-600">
                  {(() => {
                    const isBenchBoostActive = plannedChips[selectedGameweek] === 'bboost';
                    const isTripleCaptainActive = plannedChips[selectedGameweek] === '3xc';
                    const captainMultiplier = isTripleCaptainActive ? 3 : 2;
                    let total = 0;
                    if (plannerMode === "manual") {
                      const activePlayers = isBenchBoostActive ? manualLineup : manualLineup.slice(0, 11);
                      activePlayers.forEach((pick: TeamPick) => {
                        const points = getPlayerProjectedPoints(pick.element);
                        if (points !== null) {
                          const multiplier = pick.is_captain ? captainMultiplier : 1;
                          total += points * multiplier;
                        }
                      });
                    } else if (optimizedLineup) {
                      if (isBenchBoostActive) {
                        // With Bench Boost, include all 15 players
                        [...optimizedLineup.starting11, ...optimizedLineup.bench].forEach((pick: any) => {
                          const points = getPlayerProjectedPoints(pick.element);
                          if (points !== null) {
                            const multiplier = pick.isCaptain ? captainMultiplier : 1;
                            total += points * multiplier;
                          }
                        });
                      } else {
                        optimizedLineup.starting11.forEach((pick: any) => {
                          const points = getPlayerProjectedPoints(pick.element);
                          if (points !== null) {
                            const multiplier = pick.isCaptain ? captainMultiplier : 1;
                            total += points * multiplier;
                          }
                        });
                      }
                    }
                    return total.toFixed(2);
                  })()}
                </div>
              </div>

              {/* Total Projected Points for Next 6 GWs */}
              <div className="p-4 rounded-lg bg-white dark:bg-gray-900 border">
                <div className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
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
                <div className="text-2xl font-bold text-blue-600" key={JSON.stringify(plannedChips)}>
                  {(() => {
                    if (!playerProjections6GW || !Array.isArray(playerProjections6GW) || !teamData?.picks) return '0.0';
                    
                    let grandTotal = 0;
                    const nextGWs = nextGameweeks.map(gw => gw.id);
                    
                    // For each gameweek, calculate the optimal lineup's points for THAT specific gameweek
                    nextGWs.forEach(gw => {
                      // Get the lineup for this specific gameweek (with cumulative transfers applied)
                      const lineupForGW = getBaselineLineup(gw);
                      
                      if (plannerMode === "auto") {
                        // Check if Bench Boost is planned for this gameweek
                        const isBenchBoostActive = plannedChips[gw] === 'bboost';
                        // Check if Triple Captain is active for this gameweek
                        const isTripleCaptainActive = plannedChips[gw] === '3xc';
                        const captainMultiplier = isTripleCaptainActive ? 2 : 1; // Additional multiplier (captain always gets 2x base, TC adds another 1x)
                        
                        // For auto mode: simulate auto-optimization for THIS specific gameweek
                        // Get all 15 players with their projections for this gameweek
                        const playersWithPoints = lineupForGW.map(pick => {
                          const player = getPlayerById(pick.element);
                          const playerData = playerProjections6GW.find((p: any) => p.playerId === pick.element);
                          const gwPoints = playerData?.gameweekProjections?.[gw.toString()] || 0;
                          
                          return {
                            element: pick.element,
                            position: player?.element_type || 0,
                            projectedPoints: gwPoints
                          };
                        });
                        
                        if (isBenchBoostActive) {
                          // With Bench Boost, all 15 players score points
                          const allPlayersPoints = playersWithPoints.reduce((sum, p) => sum + p.projectedPoints, 0);
                          // Add captain bonus (best player gets 2x or 3x with TC)
                          const captain = playersWithPoints.reduce((best, p) => p.projectedPoints > best.projectedPoints ? p : best, playersWithPoints[0]);
                          const gwTotal = allPlayersPoints + (captain?.projectedPoints || 0) * captainMultiplier;
                          grandTotal += gwTotal;
                        } else {
                          // Group by position
                          const gkps = playersWithPoints.filter(p => p.position === 1).sort((a, b) => b.projectedPoints - a.projectedPoints);
                          const defs = playersWithPoints.filter(p => p.position === 2).sort((a, b) => b.projectedPoints - a.projectedPoints);
                          const mids = playersWithPoints.filter(p => p.position === 3).sort((a, b) => b.projectedPoints - a.projectedPoints);
                          const fwds = playersWithPoints.filter(p => p.position === 4).sort((a, b) => b.projectedPoints - a.projectedPoints);
                          
                          // Try all valid formations and find best for this gameweek
                          const validFormations = [
                            { def: 3, mid: 4, fwd: 3 }, { def: 3, mid: 5, fwd: 2 },
                            { def: 4, mid: 3, fwd: 3 }, { def: 4, mid: 4, fwd: 2 },
                            { def: 4, mid: 5, fwd: 1 }, { def: 5, mid: 3, fwd: 2 },
                            { def: 5, mid: 4, fwd: 1 }, { def: 5, mid: 2, fwd: 3 }
                          ];
                          
                          let bestPoints = 0;
                          validFormations.forEach(formation => {
                            if (defs.length >= formation.def && mids.length >= formation.mid && fwds.length >= formation.fwd) {
                              const starting11 = [
                                gkps[0],
                                ...defs.slice(0, formation.def),
                                ...mids.slice(0, formation.mid),
                                ...fwds.slice(0, formation.fwd)
                              ].filter(Boolean);
                              
                              const formationPoints = starting11.reduce((sum, p) => sum + p.projectedPoints, 0);
                              // Add captain bonus (best player gets 2x or 3x with TC)
                              const captain = starting11.reduce((best, p) => p.projectedPoints > best.projectedPoints ? p : best, starting11[0]);
                              const totalWithCaptain = formationPoints + (captain?.projectedPoints || 0) * captainMultiplier;
                              
                              if (totalWithCaptain > bestPoints) {
                                bestPoints = totalWithCaptain;
                              }
                            }
                          });
                          
                          grandTotal += bestPoints;
                        }
                      } else {
                        // For manual mode: use the manual lineup for this gameweek
                        // Check if Bench Boost is planned for this gameweek
                        const isBenchBoostActive = plannedChips[gw] === 'bboost';
                        const playersToInclude = isBenchBoostActive ? lineupForGW : lineupForGW.slice(0, 11);
                        
                        // Check if Triple Captain is active for THIS gameweek
                        const isTripleCaptainActive = plannedChips[gw] === '3xc';
                        
                        playersToInclude.forEach(pick => {
                          const playerData = playerProjections6GW.find((p: any) => p.playerId === pick.element);
                          const gwPoints = playerData?.gameweekProjections?.[gw.toString()] || 0;
                          
                          // Apply captain multiplier for each gameweek (not just selected GW)
                          let multiplier = 1;
                          if (pick.is_captain) {
                            multiplier = isTripleCaptainActive ? 3 : 2;
                          }
                          
                          grandTotal += gwPoints * multiplier;
                        });
                      }
                    });
                    
                    return grandTotal.toFixed(2);
                  })()}
                </div>
              </div>

              {/* Cash in Bank */}
              <div className="p-4 rounded-lg bg-white dark:bg-gray-900 border">
                <div className="text-sm text-muted-foreground mb-1">Cash in Bank</div>
                <div className={`text-2xl font-bold ${calculateInitialBank() < 0 ? 'text-red-600' : 'text-yellow-600'}`}>
                  £{calculateInitialBank().toFixed(1)}m
                </div>
              </div>

              {/* Cash in Bank After Transfers */}
              <div className="p-4 rounded-lg bg-white dark:bg-gray-900 border">
                <div className="text-sm text-muted-foreground mb-1">Cash After Transfers</div>
                <div className={`text-2xl font-bold ${calculateBankAfterTransfers() < 0 ? 'text-red-600' : 'text-yellow-600'}`}>
                  £{calculateBankAfterTransfers().toFixed(1)}m
                </div>
                {calculateBankAfterTransfers() < 0 && (
                  <div className="text-xs text-red-600 mt-1">
                    These transfers may not be possible. But it depends on your actual sell value of the transferred out players.
                  </div>
                )}
              </div>

              {/* Transfers */}
              <div className="p-4 rounded-lg bg-white dark:bg-gray-900 border">
                <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                  <span>Transfers</span>
                  {(plannedChips[selectedGameweek] === 'freehit' || plannedChips[selectedGameweek] === 'wildcard') && (
                    <Sparkles className="h-3 w-3 text-amber-600" />
                  )}
                </div>
                <div className={`text-2xl font-bold ${(() => {
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
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual Selection Section */}
      {searchedId && teamData && selectedGameweek && plannerMode === "manual" && (
        <Card ref={teamLineupRef} className="border-blue-200 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-background">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                {activeDraft === "Base" ? "Base Draft Manual Team Selection" : `Draft ${activeDraft} Manual Team Selection`}
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
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground mb-2 italic">
              Sell prices are calculated estimates. Click the pencil icon to enter actual Buy prices to get exact sell prices.
            </div>

            {/* View Toggle */}
            <div className="flex justify-center gap-2 mb-4">
              <Button
                variant={teamView === "pitch" ? "default" : "outline"}
                onClick={() => setTeamView("pitch")}
                className="flex items-center gap-2"
                data-testid="button-team-pitch-view"
              >
                <Target className="h-4 w-4" />
                Pitch View
              </Button>
              <Button
                variant={teamView === "list" ? "default" : "outline"}
                onClick={() => setTeamView("list")}
                className="flex items-center gap-2"
                data-testid="button-team-list-view"
              >
                <Users className="h-4 w-4" />
                List View
              </Button>
            </div>

            <div>
            {/* List View */}
            {teamView === "list" && (
            <div>
              {/* Horizontal Aligned Lineup */}
              <div className="space-y-3">
                {(() => {
                  // Calculate formation from starting 11
                  const starting11 = manualLineup.slice(0, 11).map(pick => getPlayerById(pick.element)).filter(Boolean);
                  const defs = starting11.filter(p => p!.element_type === 2).length;
                  const mids = starting11.filter(p => p!.element_type === 3).length;
                  const fwds = starting11.filter(p => p!.element_type === 4).length;
                  const formation = `${defs}-${mids}-${fwds}`;
                  
                  return (
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                      <Crown className="h-3.5 w-3.5 text-yellow-500" />
                      Starting 11 
                      <span className="text-xs font-normal text-muted-foreground">({formation})</span>
                    </h3>
                  );
                })()}
                
                {/* Horizontal layout with starting and bench aligned */}
                {[1, 2, 3, 4].map((posType, posIndex) => {
                  const positionPlayers = manualLineup.slice(0, 11).filter(pick => {
                    const player = getPlayerById(pick.element);
                    return player?.element_type === posType;
                  });
                  
                  if (positionPlayers.length === 0) return null;
                  
                  // Get bench players for this row
                  let benchPlayersForRow: typeof manualLineup = [];
                  if (posType === 1) {
                    // GK row - show bench GK
                    benchPlayersForRow = manualLineup.slice(11, 15).filter(pick => {
                      const player = getPlayerById(pick.element);
                      return player?.element_type === 1;
                    });
                  } else if (posType === 2) {
                    // DEF row - show 3 bench outfield players
                    benchPlayersForRow = manualLineup.slice(11, 15).filter(pick => {
                      const player = getPlayerById(pick.element);
                      return player?.element_type !== 1;
                    });
                  }
                  
                  return (
                    <div key={posType}>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="text-[10px] font-semibold text-muted-foreground uppercase min-w-[30px]">
                          {posType === 1 ? 'GKP' : posType === 2 ? 'DEF' : posType === 3 ? 'MID' : 'FWD'}
                        </div>
                        <div className="h-px bg-gray-200 flex-1"></div>
                      </div>
                      <div className="grid lg:grid-cols-[2fr_auto_1fr] gap-2">
                        {/* Starting players */}
                        <div className="grid gap-1">
                          {positionPlayers.map((pick) => {
                            const player = getPlayerById(pick.element);
                            const projectedPoints = getPlayerProjectedPoints(pick.element);
                            if (!player) return null;
                            const actualIndex = manualLineup.findIndex(p => p.position === pick.position);
                    
                            // Check if this is an empty slot (transferred out)
                            if (pick.is_transferred_out) {
                              return (
                                <div
                                  key={`empty-${pick.position}`}
                                  className="flex items-center justify-between p-1.5 rounded border-2 border-dashed border-red-300 bg-red-50 dark:bg-red-950/20 text-xs"
                                  data-testid={`empty-slot-${pick.position}`}
                                >
                                  <div className="flex items-center gap-3 flex-1">
                                    <div className="flex-1">
                                      <div className="font-medium text-red-600">Empty Slot</div>
                                      <div className="text-sm text-muted-foreground">
                                        {getPositionShortName(player.element_type)} • Click "Replace" to find a player
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleUndoTransfer(pick.position)}
                                      className="text-blue-600 border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                                      data-testid={`undo-transfer-${pick.position}`}
                                    >
                                      <RotateCcw className="h-4 w-4 mr-1" />
                                      Undo
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleUndoGameweekTransfersForPosition(pick.position)}
                                      className="text-purple-600 border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/20"
                                      data-testid={`undo-gw-transfers-${pick.position}`}
                                    >
                                      <RotateCcw className="h-4 w-4 mr-1" />
                                      Undo GW
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleUndoAllTransfersForPosition(pick.position)}
                                      className="text-orange-600 border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/20"
                                      data-testid={`undo-all-transfers-${pick.position}`}
                                    >
                                      <X className="h-4 w-4 mr-1" />
                                      Undo All
                                    </Button>
                                    {plannerMode === "manual" && (
                                      <div 
                                        className="text-sm text-red-600 font-medium bg-red-100 dark:bg-red-900 px-3 py-1 rounded cursor-pointer hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                                        onClick={() => handleScrollToReplacement(player.element_type)}
                                        data-testid={`replace-${pick.position}`}
                                      >
                                        Replace
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            }
                            
                            return (
                              <div
                                key={pick.element}
                                className={`flex items-center justify-between p-1.5 rounded border gap-0 min-h-[52px] ${
                                  pick.is_captain ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20' :
                                  pick.is_vice_captain ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/20' :
                                  isPlayerTransferredIn(pick) ? 'border-green-500 bg-green-50 dark:bg-green-950/20' :
                                  'border-gray-200'
                                }`}
                                data-testid={`starting-player-${pick.element}`}
                              >
                                <div className="flex items-center gap-1 flex-1 min-w-0">
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs font-medium flex items-center gap-1 flex-wrap">
                                      <span className="truncate">{player.web_name}</span>
                                      {pick.is_captain && (
                                        <span className="text-[10px] font-bold text-yellow-600 bg-yellow-100 dark:bg-yellow-900 px-1 py-0.5 rounded">C</span>
                                      )}
                                      {pick.is_vice_captain && (
                                        <span className="text-[10px] font-bold text-blue-600 bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded">VC</span>
                                      )}
                                      {!pick.is_captain && (
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-5 w-5 p-0 text-yellow-600 hover:bg-yellow-50 hover:text-yellow-700"
                                          onClick={() => handleSetCaptain(pick.element)}
                                          data-testid={`set-captain-${pick.element}`}
                                          title="Set as Captain"
                                        >
                                          <Crown className="h-3 w-3" />
                                        </Button>
                                      )}
                                      {!pick.is_vice_captain && (
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-5 w-5 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                          onClick={() => handleSetViceCaptain(pick.element)}
                                          data-testid={`set-vice-${pick.element}`}
                                          title="Set as Vice Captain"
                                        >
                                          <Crown className="h-3 w-3" />
                                        </Button>
                                      )}
                                      {isPlayerTransferredIn(pick) && (
                                        <span className="text-[10px] font-bold text-green-600 bg-green-100 dark:bg-green-900 px-1 py-0.5 rounded">NEW</span>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground truncate">
                                      {getTeamName(player.team)} • {getPositionShortName(player.element_type)}
                                      {(() => {
                                        const fixture = getPlayerFixture(pick.element, selectedGameweek);
                                        if (fixture) {
                                          return <> • vs {fixture.opponent} {fixture.isHome ? '(H)' : '(A)'}</>;
                                        }
                                        return null;
                                      })()}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground">
                                      {editingSellPrice === pick.element ? (
                                        <div className="flex flex-col gap-0.5">
                                          <div className="flex items-center gap-1">
                                            <span className="font-semibold text-blue-600">Buy: £</span>
                                            <Input
                                              type="number"
                                              step="0.1"
                                              min="4.0"
                                              max="15.0"
                                              value={editSellPriceValue}
                                              onChange={(e) => setEditSellPriceValue(e.target.value)}
                                              className="h-5 w-14 text-[10px] p-1"
                                              autoFocus
                                              data-testid={`input-sell-price-${pick.element}`}
                                            />
                                            <span>m</span>
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              className="h-5 w-5 text-green-600 hover:bg-green-50"
                                              onClick={() => {
                                                const price = parseFloat(editSellPriceValue);
                                                if (!isNaN(price) && price >= 4.0 && price <= 15.0) {
                                                  updateSellPrice(pick.element, price);
                                                }
                                              }}
                                              data-testid={`button-save-sell-price-${pick.element}`}
                                            >
                                              <Check className="h-3 w-3" />
                                            </Button>
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              className="h-5 w-5 text-red-600 hover:bg-red-50"
                                              onClick={cancelEditingSellPrice}
                                              data-testid={`button-cancel-sell-price-${pick.element}`}
                                            >
                                              <X className="h-3 w-3" />
                                            </Button>
                                          </div>
                                          <span className="text-[9px] italic text-gray-500">Sell price auto-calculated</span>
                                        </div>
                                      ) : (
                                        <div className="flex gap-2 items-center">
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-4 w-4 p-0 hover:bg-blue-50"
                                            onClick={() => startEditingSellPrice(pick.element, getSellingPrice(pick))}
                                            data-testid={`button-edit-sell-price-${pick.element}`}
                                          >
                                            <Edit2 className="h-2.5 w-2.5 text-blue-600" />
                                          </Button>
                                          <span>Sell: £{getSellingPrice(pick).toFixed(1)}m</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <div className="text-right min-w-[32px]">
                                    {projectedPoints !== null ? (
                                      <>
                                        <div className="text-xs font-bold text-blue-600">{projectedPoints.toFixed(1)}</div>
                                        {pick.is_captain && (
                                          <div className="text-[10px] text-muted-foreground">({(projectedPoints * 2).toFixed(1)})</div>
                                        )}
                                      </>
                                    ) : (
                                      <div className="text-[10px] text-muted-foreground">-</div>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-0.5 shrink-0">
                                    <Select onValueChange={(value) => swapPlayers(actualIndex, parseInt(value))}>
                                      <SelectTrigger className="h-6 w-6 p-0 border-0 hover:bg-gray-100" data-testid={`swap-${pick.element}`} title="Swap with bench">
                                        <ArrowUpDown className="h-3 w-3" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {manualLineup.slice(11, 15).map((benchPick, benchIndex) => {
                                          const benchPlayer = getPlayerById(benchPick.element);
                                          const startingPlayer = getPlayerById(pick.element);
                                          
                                          // Filter: GK can only swap with GK, outfield can only swap with outfield
                                          if (startingPlayer?.element_type === 1 && benchPlayer?.element_type !== 1) {
                                            return null; // Don't show outfield players for GK swap
                                          }
                                          if (startingPlayer?.element_type !== 1 && benchPlayer?.element_type === 1) {
                                            return null; // Don't show GK for outfield player swap
                                          }
                                          
                                          // Additional check: if swapping out a defender, ensure we keep at least 3
                                          if (startingPlayer?.element_type === 2 && benchPlayer?.element_type !== 2) {
                                            const starting11 = manualLineup.slice(0, 11);
                                            const defendersInStarting = starting11.filter(p => {
                                              const pl = getPlayerById(p.element);
                                              return pl?.element_type === 2;
                                            }).length;
                                            
                                            if (defendersInStarting <= 3) {
                                              return null; // Don't show non-defenders if we only have 3 defenders
                                            }
                                          }
                                          
                                          return (
                                            <SelectItem key={benchPick.element} value={benchIndex.toString()}>
                                              {benchPlayer?.web_name}
                                            </SelectItem>
                                          );
                                        })}
                                      </SelectContent>
                                    </Select>
                                    {plannerMode === "manual" && (
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-6 w-6 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                                        onClick={() => handleTransferOut(pick)}
                                        data-testid={`transfer-out-${pick.element}`}
                                        title="Transfer Out"
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Divider */}
                        {benchPlayersForRow.length > 0 && (
                          <div className="hidden lg:flex items-center justify-center">
                            <div className="w-px h-full bg-gray-300"></div>
                          </div>
                        )}
                        
                        {/* Bench players for this row */}
                        <div className="grid gap-1">
                          {benchPlayersForRow.map((pick, index) => {
                    const player = getPlayerById(pick.element);
                    const projectedPoints = getPlayerProjectedPoints(pick.element);
                    const isGK = player?.element_type === 1;
                    if (!player) return null;
                    
                    // Check if this is an empty slot (transferred out)
                    if (pick.is_transferred_out) {
                      return (
                        <div
                          key={`empty-bench-${pick.position}`}
                          className="flex items-center justify-between p-1.5 rounded border-2 border-dashed border-red-300 bg-red-50 dark:bg-red-950/20 text-xs"
                          data-testid={`empty-slot-bench-${pick.position}`}
                        >
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <span className="text-[10px] font-bold text-red-600 bg-red-200 dark:bg-red-700 px-1 py-0.5 rounded">
                              {index + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium text-red-600">Empty</div>
                              <div className="text-[10px] text-muted-foreground truncate">
                                {getPositionShortName(player.element_type)}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 md:gap-2 flex-wrap">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUndoTransfer(pick.position)}
                              className="text-blue-600 border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/20 h-7 px-2 md:h-9 md:px-3"
                              data-testid={`undo-transfer-bench-${pick.position}`}
                            >
                              <RotateCcw className="h-3 w-3 md:h-4 md:w-4 md:mr-1" />
                              <span className="hidden md:inline">Undo</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUndoGameweekTransfersForPosition(pick.position)}
                              className="text-purple-600 border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/20 h-7 px-2 md:h-9 md:px-3"
                              data-testid={`undo-gw-transfers-bench-${pick.position}`}
                            >
                              <RotateCcw className="h-3 w-3 md:h-4 md:w-4 md:mr-1" />
                              <span className="hidden md:inline">Undo GW</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUndoAllTransfersForPosition(pick.position)}
                              className="text-orange-600 border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/20 h-7 px-2 md:h-9 md:px-3"
                              data-testid={`undo-all-transfers-bench-${pick.position}`}
                            >
                              <X className="h-3 w-3 md:h-4 md:w-4 md:mr-1" />
                              <span className="hidden md:inline">Undo All</span>
                            </Button>
                            {plannerMode === "manual" && (
                              <div 
                                className="text-xs md:text-sm text-red-600 font-medium bg-red-100 dark:bg-red-900 px-2 md:px-3 py-1 rounded cursor-pointer hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                                onClick={() => handleScrollToReplacement(player.element_type)}
                                data-testid={`replace-bench-${pick.position}`}
                              >
                                Replace
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    
                    return (
                      <div
                        key={pick.element}
                        className={`flex items-center justify-between p-1.5 rounded border gap-0 min-h-[52px] ${
                          isPlayerTransferredIn(pick) 
                            ? 'border-green-500 bg-green-50 dark:bg-green-950/20' 
                            : 'border-gray-200 bg-gray-50 dark:bg-gray-900'
                        }`}
                        data-testid={`bench-player-${pick.element}`}
                      >
                        <div className="flex items-center gap-1 flex-1 min-w-0">
                          <span className="text-[10px] font-bold text-gray-600 bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded">
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium flex items-center gap-1 flex-wrap">
                              <span className="truncate">{player.web_name}</span>
                              {isPlayerTransferredIn(pick) && (
                                <span className="text-[10px] font-bold text-green-600 bg-green-100 dark:bg-green-900 px-1 py-0.5 rounded">NEW</span>
                              )}
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate">
                              {getTeamName(player.team)} • {getPositionShortName(player.element_type)}
                              {(() => {
                                const fixture = getPlayerFixture(pick.element, selectedGameweek);
                                if (fixture) {
                                  return <> • vs {fixture.opponent} {fixture.isHome ? '(H)' : '(A)'}</>;
                                }
                                return null;
                              })()}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {editingSellPrice === pick.element ? (
                                <div className="flex flex-col gap-0.5">
                                  <div className="flex items-center gap-1">
                                    <span className="font-semibold text-blue-600">Buy: £</span>
                                    <Input
                                      type="number"
                                      step="0.1"
                                      min="4.0"
                                      max="15.0"
                                      value={editSellPriceValue}
                                      onChange={(e) => setEditSellPriceValue(e.target.value)}
                                      className="h-5 w-14 text-[10px] p-1"
                                      autoFocus
                                      data-testid={`input-sell-price-${pick.element}`}
                                    />
                                    <span>m</span>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-5 w-5 text-green-600 hover:bg-green-50"
                                      onClick={() => {
                                        const price = parseFloat(editSellPriceValue);
                                        if (!isNaN(price) && price >= 4.0 && price <= 15.0) {
                                          updateSellPrice(pick.element, price);
                                        }
                                      }}
                                      data-testid={`button-save-sell-price-${pick.element}`}
                                    >
                                      <Check className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-5 w-5 text-red-600 hover:bg-red-50"
                                      onClick={cancelEditingSellPrice}
                                      data-testid={`button-cancel-sell-price-${pick.element}`}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  <span className="text-[9px] italic text-gray-500">Sell price auto-calculated</span>
                                </div>
                              ) : (
                                <div className="flex gap-2 items-center">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-4 w-4 p-0 hover:bg-blue-50"
                                    onClick={() => startEditingSellPrice(pick.element, getSellingPrice(pick))}
                                    data-testid={`button-edit-sell-price-${pick.element}`}
                                  >
                                    <Edit2 className="h-2.5 w-2.5 text-blue-600" />
                                  </Button>
                                  <span>Sell: £{getSellingPrice(pick).toFixed(1)}m</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-[10px] text-muted-foreground min-w-[32px] text-right">
                            {projectedPoints !== null ? `${projectedPoints.toFixed(1)}` : '-'}
                          </div>
                          {!isGK && (
                            <div className="flex flex-col gap-0.5 shrink-0">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-4 w-4 p-0"
                                onClick={() => moveBenchPlayer(index, 'up')}
                                disabled={index === 1}
                                data-testid={`move-up-${pick.element}`}
                              >
                                <ChevronUp className="h-2.5 w-2.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-4 w-4 p-0"
                                onClick={() => moveBenchPlayer(index, 'down')}
                                disabled={index === 3}
                                data-testid={`move-down-${pick.element}`}
                              >
                                <ChevronDown className="h-2.5 w-2.5" />
                              </Button>
                            </div>
                          )}
                          {plannerMode === "manual" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-red-600 hover:bg-red-50 hover:text-red-700 shrink-0"
                              onClick={() => handleTransferOut(pick)}
                              data-testid={`bench-transfer-out-${pick.element}`}
                              title="Transfer Out"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total Projected Points */}
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <span className="font-semibold">Total Projected Points (GW{selectedGameweek})</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {manualLineup
                      .slice(0, 11)
                      .reduce((total, pick) => {
                        const projectedPoints = getPlayerProjectedPoints(pick.element);
                        const multiplier = pick.is_captain ? 2 : 1;
                        return total + (projectedPoints || 0) * multiplier;
                      }, 0)
                      .toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
            )}

            {/* Pitch View */}
            {teamView === "pitch" && (
              <div className="space-y-4">
                {/* Pitch */}
                <div className="relative bg-gradient-to-b from-green-600 to-green-700 rounded-lg p-4 sm:p-6 md:p-8 lg:p-10 overflow-hidden">
                  {/* Pitch Lines and Graphics */}
                  <div className="absolute inset-0 opacity-30 pointer-events-none">
                    <div className="absolute top-1/2 left-0 w-full h-px bg-white"></div>
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-white"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-white rounded-full"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full"></div>
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-28 border-2 border-t-0 border-white"></div>
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-14 border-2 border-t-0 border-white"></div>
                    <div className="absolute top-20 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full"></div>
                    <div className="absolute top-20 left-1/2 -translate-x-1/2 w-20 h-10 border-2 border-b-0 border-l-0 border-r-0 border-white rounded-t-full"></div>
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-2 border-2 border-white bg-white/10">
                      <div className="absolute left-0 top-0 w-1 h-4 bg-white"></div>
                      <div className="absolute right-0 top-0 w-1 h-4 bg-white"></div>
                    </div>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-28 border-2 border-b-0 border-white"></div>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-14 border-2 border-b-0 border-white"></div>
                    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full"></div>
                    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-20 h-10 border-2 border-t-0 border-l-0 border-r-0 border-white rounded-b-full"></div>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-2 border-2 border-white bg-white/10">
                      <div className="absolute left-0 bottom-0 w-1 h-4 bg-white"></div>
                      <div className="absolute right-0 bottom-0 w-1 h-4 bg-white"></div>
                    </div>
                    <div className="absolute top-0 left-0 w-4 h-4 border-2 border-t-0 border-l-0 border-white rounded-br-full"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-2 border-t-0 border-r-0 border-white rounded-bl-full"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-2 border-b-0 border-l-0 border-white rounded-tr-full"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-2 border-b-0 border-r-0 border-white rounded-tl-full"></div>
                  </div>

                  <div className="relative space-y-4 sm:space-y-6 md:space-y-8 lg:space-y-10">
                    {/* Formation sections */}
                    {[1, 2, 3, 4].map((posType) => {
                      const positionPlayers = manualLineup.slice(0, 11).filter(pick => {
                        const player = getPlayerById(pick.element);
                        return player?.element_type === posType;
                      });
                      
                      if (positionPlayers.length === 0) return null;
                      
                      return (
                        <div key={posType} className={`flex justify-center flex-wrap ${positionPlayers.length >= 5 ? 'gap-2' : 'gap-4'}`}>
                          {positionPlayers.map(pick => {
                            const player = getPlayerById(pick.element);
                            if (!player) return null;
                            
                            const playerTeam = getPlayerTeam(player);
                            const jerseyColor = getTeamJerseyColor(playerTeam?.id || 0);
                            const textColor = getTextColor(jerseyColor);
                            const projectedPoints = getPlayerProjectedPoints(pick.element);
                            const actualIndex = manualLineup.findIndex(p => p.position === pick.position);
                            const fixture = getPlayerFixture(pick.element, selectedGameweek);
                            
                            // Check if player is transferred out
                            if (pick.is_transferred_out) {
                              console.log('DEBUG - Showing empty slot for position:', pick.position, 'pick:', pick);
                              return (
                                <div key={`empty-${pick.position}`} className="flex flex-col items-center w-40" data-testid={`pitch-empty-${pick.position}`}>
                                  <div className="relative w-full">
                                    <div className="rounded-lg p-3 text-center shadow-lg border-2 border-dashed border-red-400 bg-red-50 dark:bg-red-950/20 flex flex-col gap-2">
                                      <div className="text-sm font-bold text-red-600">EMPTY SLOT</div>
                                      <div className="text-xs text-red-500">{getPositionShortName(player.element_type)}</div>
                                      <div className="text-3xl font-bold text-red-600">-</div>
                                      
                                      {/* Action Buttons for Transferred Out */}
                                      <div className="flex flex-col gap-1.5">
                                        <Button
                                          size="sm"
                                          className="w-full h-8 text-sm font-semibold bg-red-600 text-white hover:bg-red-700"
                                          onClick={() => handleScrollToReplacement(player.element_type)}
                                          data-testid={`pitch-replace-${pick.position}`}
                                        >
                                          Replace
                                        </Button>
                                        <div className="grid grid-cols-2 gap-1">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-[10px] text-blue-600 border-blue-300 bg-white hover:bg-blue-50 px-1"
                                            onClick={() => handleUndoTransfer(pick.position)}
                                            data-testid={`pitch-undo-${pick.position}`}
                                            title="Undo last transfer"
                                          >
                                            <RotateCcw className="h-3 w-3 mr-0.5" />
                                            Undo
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-[10px] text-purple-600 border-purple-300 bg-white hover:bg-purple-50 px-1"
                                            onClick={() => handleUndoGameweekTransfersForPosition(pick.position)}
                                            data-testid={`pitch-undo-gw-${pick.position}`}
                                            title="Undo gameweek transfers"
                                          >
                                            <RotateCcw className="h-3 w-3 mr-0.5" />
                                            GW
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-[10px] text-orange-600 border-orange-300 bg-white hover:bg-orange-50 px-1 col-span-2"
                                            onClick={() => handleUndoAllTransfersForPosition(pick.position)}
                                            data-testid={`pitch-undo-all-${pick.position}`}
                                            title="Undo all transfers"
                                          >
                                            <X className="h-3 w-3 mr-0.5" />
                                            Undo All
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            
                            return (
                              <div key={pick.element} className={`flex flex-col items-center w-[18vw] sm:w-28 md:w-36 lg:w-44 ${selectedPlayer === pick.element ? 'relative z-[100]' : ''}`} data-testid={`pitch-player-${player.id}`}>
                                <div className="relative w-full">
                                  {/* Action Buttons Popup */}
                                  {selectedPlayer === pick.element && (
                                    <>
                                      {/* Backdrop */}
                                      <div 
                                        className="fixed inset-0 bg-black/50 z-[60]"
                                        onClick={() => setSelectedPlayer(null)}
                                        data-testid={`pitch-backdrop-${pick.element}`}
                                      />
                                      
                                      {/* Centered Popup */}
                                      <div 
                                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-300 dark:border-gray-600 overflow-hidden w-[320px]"
                                        onClick={(e) => e.stopPropagation()}
                                        data-testid={`pitch-actions-${pick.element}`}
                                      >
                                        {/* Header with player info */}
                                        <div className="relative bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-700 dark:to-blue-800 px-4 py-3">
                                          <div className="text-white text-base font-bold text-center mb-1">{player.web_name}</div>
                                          <div className="flex justify-center items-center gap-3 text-white/90 text-xs mb-2">
                                            <span>{playerTeam?.short_name || 'UNK'}</span>
                                            <span>•</span>
                                            <span>{player.element_type === 1 ? 'GKP' : player.element_type === 2 ? 'DEF' : player.element_type === 3 ? 'MID' : 'FWD'}</span>
                                            <span>•</span>
                                            <span>{player.selected_by_percent}%</span>
                                          </div>
                                          <div className="flex justify-center items-center gap-4 text-white/95 text-[11px] font-medium">
                                            <span>Buy: £{(pick.purchase_price ? pick.purchase_price / 10 : player.now_cost / 10).toFixed(1)}m</span>
                                            <span>•</span>
                                            <span>Current: £{(player.now_cost / 10).toFixed(1)}m</span>
                                            <span>•</span>
                                            <span>Sell: £{getSellingPrice(pick).toFixed(1)}m</span>
                                          </div>
                                          <button
                                            className="absolute right-2 top-3 text-white hover:text-gray-200 transition-colors"
                                            onClick={(e) => { e.stopPropagation(); setSelectedPlayer(null); }}
                                            data-testid={`pitch-close-${pick.element}`}
                                            aria-label="Close"
                                          >
                                            <X className="h-5 w-5" />
                                          </button>
                                        </div>
                                        
                                        <Select onValueChange={(value) => { swapPlayers(actualIndex, parseInt(value)); setSelectedPlayer(null); }}>
                                          <SelectTrigger className="w-full h-12 rounded-none border-0 border-b border-gray-200 dark:border-gray-700 bg-sky-50 hover:bg-sky-100 dark:bg-sky-900 dark:hover:bg-sky-800 text-base font-semibold text-gray-900 dark:text-white [&>svg]:hidden [&_span]:text-base [&_span]:font-semibold" data-testid={`pitch-swap-${pick.element}`}>
                                            <span className="w-full text-center text-base font-semibold">Swap</span>
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
                                        {plannerMode === "manual" && (
                                          <>
                                            <button 
                                              className="w-full h-12 border-b border-gray-200 dark:border-gray-700 bg-sky-50 hover:bg-sky-100 dark:bg-sky-900 dark:hover:bg-sky-800 font-semibold text-base text-gray-900 dark:text-white transition-colors" 
                                              onClick={() => handleTransferOut(pick)} 
                                              data-testid={`pitch-transfer-out-${pick.element}`}
                                            >
                                              Transfer Out
                                            </button>
                                            {!pick.is_captain && (
                                              <button 
                                                className="w-full h-12 border-b border-gray-200 dark:border-gray-700 bg-sky-50 hover:bg-sky-100 dark:bg-sky-900 dark:hover:bg-sky-800 font-semibold text-base text-gray-900 dark:text-white transition-colors" 
                                                onClick={() => handleSetCaptain(pick.element)} 
                                                data-testid={`pitch-make-captain-${pick.element}`}
                                              >
                                                Make Captain
                                              </button>
                                            )}
                                            {!pick.is_vice_captain && (
                                              <button 
                                                className="w-full h-12 border-b border-gray-200 dark:border-gray-700 bg-sky-50 hover:bg-sky-100 dark:bg-sky-900 dark:hover:bg-sky-800 font-semibold text-base text-gray-900 dark:text-white transition-colors" 
                                                onClick={() => handleSetViceCaptain(pick.element)} 
                                                data-testid={`pitch-make-vice-${pick.element}`}
                                              >
                                                Make Vice Captain
                                              </button>
                                            )}
                                            <button 
                                              className="w-full h-12 bg-sky-50 hover:bg-sky-100 dark:bg-sky-900 dark:hover:bg-sky-800 font-semibold text-base text-gray-900 dark:text-white transition-colors" 
                                              onClick={() => { setSelectedPlayer(null); openBuyPriceDialog(pick.element, getSellingPrice(pick)); }} 
                                              data-testid={`pitch-edit-buy-price-${pick.element}`}
                                            >
                                              Edit Buy Price
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </>
                                  )}
                                  
                                  {/* Jersey Card */}
                                  <svg 
                                    viewBox="0 0 403 302" 
                                    className={`w-full drop-shadow-xl cursor-pointer transition-all ${selectedPlayer === pick.element ? 'ring-4 ring-blue-500 ring-offset-2 rounded-lg' : ''}`}
                                    onClick={() => setSelectedPlayer(selectedPlayer === pick.element ? null : pick.element)}
                                    data-testid={`pitch-jersey-${pick.element}`}
                                  >
                                    <defs><clipPath id={`jersey-manual-${player.id}`}><path d="M 84 43 L 46 43 L 46 115 L 65 122 L 84 122 L 84 43 L 130 14 Q 137 14 144 23 L 158 36 L 173 43 Q 187 43 202 43 L 216 43 Q 230 43 245 36 L 259 23 Q 266 14 274 14 L 319 43 L 319 122 L 338 122 L 358 115 L 358 43 L 319 43 L 319 295 L 84 295 L 84 43 Z" /></clipPath></defs>
                                    <rect width="403" height="302" fill={jerseyColor} clipPath={`url(#jersey-manual-${player.id})`} />
                                    <path d="M 84 43 L 46 43 L 46 115 L 65 122 L 84 122 L 84 43 L 130 14 Q 137 14 144 23 L 158 36 L 173 43 Q 187 43 202 43 L 216 43 Q 230 43 245 36 L 259 23 Q 266 14 274 14 L 319 43 L 319 122 L 338 122 L 358 115 L 358 43 L 319 43 L 319 295 L 84 295 L 84 43 Z" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5" />
                                    <path d="M 130 14 L 144 26 L 158 36 L 173 42 Q 187 42 202 42 L 216 42 Q 230 42 245 36 L 259 26 L 274 14" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
                                    {isPlayerTransferredIn(pick) && (<g><circle cx="295" cy="70" r="17" fill="#22C55E" stroke="white" strokeWidth="2.5" /><text x="295" y="78" fontSize="16" fontWeight="bold" textAnchor="middle" fill="white">+</text></g>)}
                                    {pick.is_captain ? (
                                      <g><rect x="96" y="55" width="34" height="34" fill="rgb(254 240 138)" stroke="rgb(161 98 7)" strokeWidth="2" rx="4" /><text x="113" y="80" fontSize="22" fontWeight="bold" textAnchor="middle" fill="rgb(161 98 7)">C</text></g>
                                    ) : null}
                                    {pick.is_vice_captain ? (
                                      <g><rect x="96" y="55" width="38" height="34" fill="rgb(191 219 254)" stroke="rgb(29 78 216)" strokeWidth="2" rx="4" /><text x="115" y="80" fontSize="19" fontWeight="bold" textAnchor="middle" fill="rgb(29 78 216)">VC</text></g>
                                    ) : null}
                                    {player.in_dreamteam && (
                                      <g>
                                        <circle cx="307" cy="72" r="18" fill="rgb(234 179 8)" stroke="white" strokeWidth="2.5" />
                                        <path d="M 307 59 L 310 68 L 320 68 L 312 74 L 315 83 L 307 77 L 299 83 L 302 74 L 294 68 L 304 68 Z" fill="white" />
                                      </g>
                                    )}
                                    <text x="202" y="112" fontSize="clamp(18px, 4vw, 32px)" fontWeight="bold" textAnchor="middle" fill={textColor}>{playerTeam?.short_name || 'UNK'}</text>
                                    <text x="202" y="165" fontSize="clamp(20px, 4.2vw, 34px)" fontWeight="bold" textAnchor="middle" fill={textColor}>{player.web_name}</text>
                                    <text x="202" y="218" fontSize="clamp(22px, 4.5vw, 38px)" fontWeight="bold" textAnchor="middle" fill={textColor}>
                                      {projectedPoints !== null ? projectedPoints.toFixed(1) : '-'}
                                      {pick.is_captain && projectedPoints !== null && (
                                        <tspan fontSize="clamp(14px, 3vw, 24px)" dx="5">({(projectedPoints * 2).toFixed(1)})</tspan>
                                      )}
                                    </text>
                                    {fixture && (
                                      <text x="202" y="268" fontSize="clamp(16px, 3.5vw, 30px)" fontWeight="bold" textAnchor="middle" fill={textColor}>vs {fixture.opponent} {fixture.isHome ? '(H)' : '(A)'}</text>
                                    )}
                                  </svg>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}

                    {/* Bench */}
                    <div className="mt-8 pt-4 border-t border-white/30">
                      <h4 className="text-xs font-semibold text-white mb-3 text-center">Bench</h4>
                      <div className="flex justify-center gap-0.5 sm:gap-1 md:gap-1.5">
                    {(() => {
                      const benchPlayers = manualLineup.slice(11, 15);
                      const gkBench = benchPlayers.find(pick => {
                        const player = getPlayerById(pick.element);
                        return player?.element_type === 1;
                      });
                      const outfieldBench = benchPlayers.filter(pick => {
                        const player = getPlayerById(pick.element);
                        return player?.element_type !== 1;
                      });
                      const reorderedBench = gkBench ? [gkBench, ...outfieldBench] : outfieldBench;
                      return reorderedBench.map((pick) => {
                        const benchIndex = manualLineup.indexOf(pick) - 11;
                      const player = getPlayerById(pick.element);
                      if (!player) return null;
                      
                      const playerTeam = getPlayerTeam(player);
                      const jerseyColor = getTeamJerseyColor(playerTeam?.id || 0);
                      const textColor = getTextColor(jerseyColor);
                      const projectedPoints = getPlayerProjectedPoints(pick.element);
                      const fixture = getPlayerFixture(pick.element, selectedGameweek);
                      const actualIndex = 11 + benchIndex;
                      
                      // Check if bench player is transferred out
                      if (pick.is_transferred_out) {
                        return (
                          <div key={`empty-bench-${pick.position}`} className="flex flex-col items-center w-40" data-testid={`pitch-bench-empty-${pick.position}`}>
                            <div className="relative w-full">
                              <div className="rounded-lg p-2 text-center shadow-md border-2 border-dashed border-red-400 bg-red-50 dark:bg-red-950/20 flex flex-col gap-1.5">
                                <div className="text-xs font-bold text-red-600">EMPTY SLOT</div>
                                <div className="text-[11px] text-red-500">{getPositionShortName(player.element_type)}</div>
                                <div className="text-2xl font-bold text-red-600">-</div>
                                
                                {/* Action Buttons for Transferred Out */}
                                <div className="flex flex-col gap-1 mt-1">
                                  <Button
                                    size="sm"
                                    className="h-7 text-xs font-semibold bg-red-600 text-white hover:bg-red-700"
                                    onClick={() => handleScrollToReplacement(player.element_type)}
                                    data-testid={`pitch-bench-replace-${pick.position}`}
                                  >
                                    Replace
                                  </Button>
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 px-2 text-[10px] flex-1 text-blue-600 border-blue-300"
                                      onClick={() => handleUndoTransfer(pick.position)}
                                      data-testid={`pitch-bench-undo-${pick.position}`}
                                      title="Undo last transfer"
                                    >
                                      <RotateCcw className="h-3 w-3 mr-0.5" />
                                      Undo
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 px-2 text-[10px] flex-1 text-orange-600 border-orange-300"
                                      onClick={() => handleUndoAllTransfersForPosition(pick.position)}
                                      data-testid={`pitch-bench-undo-all-${pick.position}`}
                                      title="Undo all transfers"
                                    >
                                      <X className="h-3 w-3 mr-0.5" />
                                      All
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      
                      return (
                        <div key={pick.element} className={`flex flex-col items-center w-[18vw] sm:w-28 md:w-36 lg:w-44 ${selectedPlayer === pick.element ? 'relative z-[100]' : ''}`} data-testid={`pitch-bench-${player.id}`}>
                          <div className="relative w-full opacity-90">
                            {/* Action Buttons Popup */}
                            {selectedPlayer === pick.element && (
                              <>
                                {/* Backdrop */}
                                <div 
                                  className="fixed inset-0 bg-black/50 z-[60]"
                                  onClick={() => setSelectedPlayer(null)}
                                  data-testid={`pitch-bench-backdrop-${pick.element}`}
                                />
                                
                                {/* Centered Popup */}
                                <div 
                                  className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-300 dark:border-gray-600 overflow-hidden w-[320px]"
                                  onClick={(e) => e.stopPropagation()}
                                  data-testid={`pitch-bench-actions-${pick.element}`}
                                >
                                  {/* Header with player info */}
                                  <div className="relative bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-700 dark:to-blue-800 px-4 py-3">
                                    <div className="text-white text-base font-bold text-center mb-1">{player.web_name}</div>
                                    <div className="flex justify-center items-center gap-3 text-white/90 text-xs mb-2">
                                      <span>{playerTeam?.short_name || 'UNK'}</span>
                                      <span>•</span>
                                      <span>{player.element_type === 1 ? 'GKP' : player.element_type === 2 ? 'DEF' : player.element_type === 3 ? 'MID' : 'FWD'}</span>
                                      <span>•</span>
                                      <span>{player.selected_by_percent}%</span>
                                    </div>
                                    <div className="flex justify-center items-center gap-4 text-white/95 text-[11px] font-medium">
                                      <span>Buy: £{(pick.purchase_price ? pick.purchase_price / 10 : player.now_cost / 10).toFixed(1)}m</span>
                                      <span>•</span>
                                      <span>Current: £{(player.now_cost / 10).toFixed(1)}m</span>
                                      <span>•</span>
                                      <span>Sell: £{getSellingPrice(pick).toFixed(1)}m</span>
                                    </div>
                                    <button
                                      className="absolute right-2 top-3 text-white hover:text-gray-200 transition-colors"
                                      onClick={(e) => { e.stopPropagation(); setSelectedPlayer(null); }}
                                      data-testid={`pitch-bench-close-${pick.element}`}
                                      aria-label="Close"
                                    >
                                      <X className="h-5 w-5" />
                                    </button>
                                  </div>
                                  
                                  <Select onValueChange={(value) => { swapPlayers(parseInt(value), benchIndex); setSelectedPlayer(null); }}>
                                    <SelectTrigger className="w-full h-12 rounded-none border-0 border-b border-gray-200 dark:border-gray-700 bg-sky-50 hover:bg-sky-100 dark:bg-sky-900 dark:hover:bg-sky-800 text-base font-semibold text-gray-900 dark:text-white [&>svg]:hidden [&_span]:text-base [&_span]:font-semibold" data-testid={`pitch-bench-swap-${pick.element}`}>
                                      <span className="w-full text-center text-base font-semibold">Swap</span>
                                    </SelectTrigger>
                                    <SelectContent className="z-[200]">
                                      {manualLineup.slice(0, 11).map((startPick, startIndex) => {
                                        const startPlayer = getPlayerById(startPick.element);
                                        const benchPlayer = getPlayerById(pick.element);
                                        if (benchPlayer?.element_type === 1 && startPlayer?.element_type !== 1) return null;
                                        if (benchPlayer?.element_type !== 1 && startPlayer?.element_type === 1) return null;
                                        return (<SelectItem key={startPick.element} value={startIndex.toString()}>{startPlayer?.web_name}</SelectItem>);
                                      })}
                                    </SelectContent>
                                  </Select>
                                  {plannerMode === "manual" && (
                                    <>
                                      <button 
                                        className="w-full h-12 border-b border-gray-200 dark:border-gray-700 bg-sky-50 hover:bg-sky-100 dark:bg-sky-900 dark:hover:bg-sky-800 font-semibold text-base text-gray-900 dark:text-white transition-colors" 
                                        onClick={() => handleTransferOut(pick)} 
                                        data-testid={`pitch-bench-transfer-out-${pick.element}`}
                                      >
                                        Transfer Out
                                      </button>
                                      {benchIndex > 0 && (
                                        <>
                                          <button 
                                            className="w-full h-12 border-b border-gray-200 dark:border-gray-700 bg-sky-50 hover:bg-sky-100 dark:bg-sky-900 dark:hover:bg-sky-800 font-semibold text-base text-gray-900 dark:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                                            onClick={() => moveBenchPlayer(benchIndex, 'up')} 
                                            disabled={benchIndex === 1} 
                                            data-testid={`pitch-bench-move-up-${pick.element}`}
                                          >
                                            Move Up
                                          </button>
                                          <button 
                                            className="w-full h-12 border-b border-gray-200 dark:border-gray-700 bg-sky-50 hover:bg-sky-100 dark:bg-sky-900 dark:hover:bg-sky-800 font-semibold text-base text-gray-900 dark:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                                            onClick={() => moveBenchPlayer(benchIndex, 'down')} 
                                            disabled={benchIndex === 3} 
                                            data-testid={`pitch-bench-move-down-${pick.element}`}
                                          >
                                            Move Down
                                          </button>
                                        </>
                                      )}
                                      <button 
                                        className="w-full h-12 bg-sky-50 hover:bg-sky-100 dark:bg-sky-900 dark:hover:bg-sky-800 font-semibold text-base text-gray-900 dark:text-white transition-colors" 
                                        onClick={() => { setSelectedPlayer(null); openBuyPriceDialog(pick.element, getSellingPrice(pick)); }} 
                                        data-testid={`pitch-bench-edit-buy-price-${pick.element}`}
                                      >
                                        Edit Buy Price
                                      </button>
                                    </>
                                  )}
                                </div>
                              </>
                            )}
                            
                            <svg 
                              viewBox="0 0 403 302" 
                              className={`w-full drop-shadow-lg cursor-pointer transition-all ${selectedPlayer === pick.element ? 'ring-4 ring-blue-500 ring-offset-2 rounded-lg' : ''}`}
                              onClick={() => setSelectedPlayer(selectedPlayer === pick.element ? null : pick.element)}
                              data-testid={`pitch-bench-jersey-${pick.element}`}
                            >
                              <defs><clipPath id={`jersey-bench-manual-${player.id}`}><path d="M 84 43 L 46 43 L 46 115 L 65 122 L 84 122 L 84 43 L 130 14 Q 137 14 144 23 L 158 36 L 173 43 Q 187 43 202 43 L 216 43 Q 230 43 245 36 L 259 23 Q 266 14 274 14 L 319 43 L 319 122 L 338 122 L 358 115 L 358 43 L 319 43 L 319 295 L 84 295 L 84 43 Z" /></clipPath></defs>
                              <rect width="403" height="302" fill={jerseyColor} clipPath={`url(#jersey-bench-manual-${player.id})`} />
                              <path d="M 84 43 L 46 43 L 46 115 L 65 122 L 84 122 L 84 43 L 130 14 Q 137 14 144 23 L 158 36 L 173 43 Q 187 43 202 43 L 216 43 Q 230 43 245 36 L 259 23 Q 266 14 274 14 L 319 43 L 319 122 L 338 122 L 358 115 L 358 43 L 319 43 L 319 295 L 84 295 L 84 43 Z" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5" />
                              <path d="M 130 14 L 144 26 L 158 36 L 173 42 Q 187 42 202 42 L 216 42 Q 230 42 245 36 L 259 26 L 274 14" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
                              {pick.is_captain ? (
                                <g><rect x="96" y="55" width="34" height="34" fill="rgb(254 240 138)" stroke="rgb(161 98 7)" strokeWidth="2" rx="4" /><text x="113" y="80" fontSize="22" fontWeight="bold" textAnchor="middle" fill="rgb(161 98 7)">C</text></g>
                              ) : null}
                              {pick.is_vice_captain ? (
                                <g><rect x="96" y="55" width="38" height="34" fill="rgb(191 219 254)" stroke="rgb(29 78 216)" strokeWidth="2" rx="4" /><text x="115" y="80" fontSize="19" fontWeight="bold" textAnchor="middle" fill="rgb(29 78 216)">VC</text></g>
                              ) : null}
                              {player.in_dreamteam && (
                                <g>
                                  <circle cx="307" cy="72" r="18" fill="rgb(234 179 8)" stroke="white" strokeWidth="2.5" />
                                  <path d="M 307 59 L 310 68 L 320 68 L 312 74 L 315 83 L 307 77 L 299 83 L 302 74 L 294 68 L 304 68 Z" fill="white" />
                                </g>
                              )}
                              <text x="202" y="112" fontSize="clamp(18px, 4vw, 32px)" fontWeight="bold" textAnchor="middle" fill={textColor}>{playerTeam?.short_name || 'UNK'}</text>
                              <text x="202" y="165" fontSize="clamp(20px, 4.2vw, 34px)" fontWeight="bold" textAnchor="middle" fill={textColor}>{player.web_name}</text>
                              <text x="202" y="218" fontSize="clamp(22px, 4.5vw, 38px)" fontWeight="bold" textAnchor="middle" fill={textColor}>{projectedPoints !== null ? projectedPoints.toFixed(1) : '-'}</text>
                              {fixture && (
                                <text x="202" y="268" fontSize="clamp(16px, 3.5vw, 30px)" fontWeight="bold" textAnchor="middle" fill={textColor}>vs {fixture.opponent} {fixture.isHome ? '(H)' : '(A)'}</text>
                              )}
                            </svg>
                          </div>
                        </div>
                      );
                    });
                    })()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Total Projected Points */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <span className="font-semibold">Total Projected Points (GW{selectedGameweek})</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {manualLineup
                        .slice(0, 11)
                        .reduce((total, pick) => {
                          const projectedPoints = getPlayerProjectedPoints(pick.element);
                          const multiplier = pick.is_captain ? 2 : 1;
                          return total + (projectedPoints || 0) * multiplier;
                        }, 0)
                        .toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Multi-Gameweek Evolution View */}
      {searchedId && teamData && activeDraft !== "Base" && (
        <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/20 dark:to-background">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                {activeDraft === "Base" ? "Base Draft Auto Team Selection" : `Draft ${activeDraft} Auto Team Selection`}
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
          </CardHeader>
          <CardContent>
            {/* View Toggle Buttons */}
            <div className="flex justify-center gap-2 mb-4">
              <Button
                variant={teamView === "pitch" ? "default" : "outline"}
                onClick={() => setTeamView("pitch")}
                className="flex items-center gap-2"
                data-testid="button-auto-pitch-view"
              >
                <div className="h-4 w-4 grid grid-cols-2 gap-0.5">
                  <div className="bg-current rounded-sm"></div>
                  <div className="bg-current rounded-sm"></div>
                  <div className="bg-current rounded-sm"></div>
                  <div className="bg-current rounded-sm"></div>
                </div>
                Pitch View
              </Button>
              <Button
                variant={teamView === "list" ? "default" : "outline"}
                onClick={() => setTeamView("list")}
                className="flex items-center gap-2"
                data-testid="button-auto-list-view"
              >
                <List className="h-4 w-4" />
                List View
              </Button>
            </div>

            {optimizeMutation.isPending && (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4"></div>
                <p className="text-muted-foreground">Optimizing your team...</p>
              </div>
            )}

            {optimizedLineup && !optimizeMutation.isPending && (
              <div className="mt-4">
                <div className="text-xs text-muted-foreground mb-2 italic">
                  * All player transfers should be done from the Manual lineup section, and it will automatically reflect in the Auto lineup.
                </div>

                {/* List View */}
                {teamView === "list" && (
                <div>
                  {/* Starting 11 */}
                  <div>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                      <Crown className="h-3.5 w-3.5 text-yellow-500" />
                      Starting 11
                      <span className="text-xs font-normal text-muted-foreground">({optimizedLineup.formation})</span>
                    </h3>
                    <div className="space-y-2">
                      {/* Group players by position */}
                      {[1, 2, 3, 4].map(posType => {
                        const positionPlayers = optimizedLineup.starting11.filter(player => {
                          const fullPlayer = getPlayerById(player.element);
                          return fullPlayer?.element_type === posType;
                        });
                        
                        if (positionPlayers.length === 0) return null;
                        
                        // Get bench outfield players sorted by projected points
                        const benchOutfield = optimizedLineup.bench
                          .filter(bp => {
                            const benchFullPlayer = getPlayerById(bp.element);
                            return benchFullPlayer?.element_type !== 1; // Not GK
                          })
                          .sort((a, b) => b.projectedPoints - a.projectedPoints)
                          .map((bp, idx) => ({ ...bp, benchPriority: idx + 1 }));
                        
                        // Get bench GK
                        const benchGK = optimizedLineup.bench.filter(bp => {
                          const benchFullPlayer = getPlayerById(bp.element);
                          return benchFullPlayer?.element_type === 1;
                        });
                        
                        return (
                          <div key={posType}>
                            <div className="flex items-center gap-2 mb-1">
                              <div className="text-[10px] font-semibold text-muted-foreground uppercase min-w-[30px]">
                                {posType === 1 ? 'GKP' : posType === 2 ? 'DEF' : posType === 3 ? 'MID' : 'FWD'}
                              </div>
                              <div className="h-px bg-gray-200 flex-1"></div>
                            </div>
                            
                            {/* For defenders, show each defender with corresponding bench player */}
                            {posType === 2 ? (
                              <div className="space-y-1">
                                {positionPlayers.map((player, defIndex) => {
                                  const benchPlayer = benchOutfield[defIndex]; // Get corresponding bench player
                                  
                                  return (
                                    <div key={player.element} className="grid lg:grid-cols-[2fr_auto_1fr] gap-2">
                                      {/* Starting defender */}
                                      <div className="grid gap-1">
                                        {(() => {
                              const fullPlayer = getPlayerById(player.element);
                              const pick = manualLineup.find(p => p.element === player.element);
                              
                              // Check if this player slot is transferred out
                              if (pick && pick.is_transferred_out) {
                                return (
                                  <div
                                    key={`empty-auto-${player.element}`}
                                    className="flex items-center justify-between p-3 rounded-lg border-2 border-dashed border-red-300 bg-red-50 dark:bg-red-950/20"
                                    data-testid={`empty-slot-auto-${player.element}`}
                                  >
                                    <div className="flex items-center gap-3 flex-1">
                                      <div className="flex-1">
                                        <div className="font-medium text-red-600">Empty Slot</div>
                                        <div className="text-sm text-muted-foreground">
                                          {fullPlayer && getPositionShortName(fullPlayer.element_type)} • Click "Replace" to find a player
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <div className="text-sm text-red-600 font-medium">
                                        Switch to Manual mode to add replacement
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                              
                              return (
                                <div
                                  key={player.element}
                                  className={`flex items-center justify-between p-1.5 rounded border gap-0 min-h-[52px] ${
                                    player.isCaptain ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20' :
                                    player.isViceCaptain ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/20' :
                                    pick && isPlayerTransferredIn(pick) ? 'border-green-500 bg-green-50 dark:bg-green-950/20' :
                                    'border-gray-200'
                                  }`}
                                  data-testid={`optimized-player-${player.element}`}
                                >
                                  <div className="flex items-center gap-1 flex-1 min-w-0">
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs font-medium flex items-center gap-1 flex-wrap">
                                        <span className="truncate">{player.web_name}</span>
                                        {pick && isPlayerTransferredIn(pick) && (
                                          <span className="text-[10px] font-bold text-green-600 bg-green-100 dark:bg-green-900 px-1 py-0.5 rounded">NEW</span>
                                        )}
                                        {player.isCaptain && (
                                          <span className="text-[10px] font-bold text-yellow-600 bg-yellow-100 dark:bg-yellow-900 px-1 py-0.5 rounded">C</span>
                                        )}
                                        {player.isViceCaptain && (
                                          <span className="text-[10px] font-bold text-blue-600 bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded">VC</span>
                                        )}
                                      </div>
                                      <div className="text-[10px] text-muted-foreground truncate">
                                        {fullPlayer && getTeamName(fullPlayer.team)} • {fullPlayer && getPositionShortName(fullPlayer.element_type)}
                                        {(() => {
                                          const fixture = getPlayerFixture(player.element, selectedGameweek);
                                          if (fixture) {
                                            return <> • vs {fixture.opponent} {fixture.isHome ? '(H)' : '(A)'}</>;
                                          }
                                          return null;
                                        })()}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <div className="text-right min-w-[32px]">
                                      <div className="text-xs font-bold text-purple-600">{player.projectedPoints.toFixed(1)}</div>
                                      {player.isCaptain && (
                                        <div className="text-[10px] text-muted-foreground">({(player.projectedPoints * 2).toFixed(1)})</div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                                        })()}
                                      </div>
                                      
                                      {/* Divider */}
                                      {benchPlayer && (
                                        <div className="hidden lg:flex items-center justify-center">
                                          <div className="w-px h-full bg-gray-300"></div>
                                        </div>
                                      )}
                                      
                                      {/* Corresponding bench player */}
                                      <div className="grid gap-1">
                                        {benchPlayer && (() => {
                                          const fullPlayer = getPlayerById(benchPlayer.element);
                                          const pick = manualLineup.find(p => p.element === benchPlayer.element);
                                          
                                          // Check if this bench player is transferred out
                                          if (pick && pick.is_transferred_out) {
                                            return (
                                              <div
                                                key={`empty-bench-auto-${benchPlayer.element}`}
                                                className="flex items-center justify-between p-1.5 rounded border-2 border-dashed border-red-300 bg-red-50 dark:bg-red-950/20 text-xs min-h-[52px]"
                                                data-testid={`empty-slot-bench-auto-${benchPlayer.element}`}
                                              >
                                                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                                  <span className="text-[10px] font-bold text-red-600 bg-red-200 dark:bg-red-700 px-1 py-0.5 rounded">
                                                    {benchPlayer.benchPriority || 'B'}
                                                  </span>
                                                  <div className="flex-1 min-w-0">
                                                    <div className="text-xs font-medium text-red-600">Empty</div>
                                                    <div className="text-[10px] text-muted-foreground truncate">
                                                      {fullPlayer && getPositionShortName(fullPlayer.element_type)}
                                                    </div>
                                                  </div>
                                                </div>
                                                <div className="text-xs text-red-600 font-medium">
                                                  Switch to Manual
                                                </div>
                                              </div>
                                            );
                                          }
                                          
                                          return (
                                            <div
                                              key={benchPlayer.element}
                                              className={`flex items-center justify-between p-1.5 rounded border gap-0 min-h-[52px] ${
                                                pick && isPlayerTransferredIn(pick) 
                                                  ? 'border-green-500 bg-green-50 dark:bg-green-950/20' 
                                                  : 'border-gray-200 bg-gray-50 dark:bg-gray-900'
                                              }`}
                                              data-testid={`bench-player-${benchPlayer.element}`}
                                            >
                                              <div className="flex items-center gap-1 flex-1 min-w-0">
                                                <span className="text-[10px] font-bold text-gray-600 bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded">
                                                  {benchPlayer.benchPriority || 'B'}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                  <div className="text-xs font-medium flex items-center gap-1 flex-wrap">
                                                    <span className="truncate">{benchPlayer.web_name}</span>
                                                    {pick && isPlayerTransferredIn(pick) && (
                                                      <span className="text-[10px] font-bold text-green-600 bg-green-100 dark:bg-green-900 px-1 py-0.5 rounded">NEW</span>
                                                    )}
                                                  </div>
                                                  <div className="text-[10px] text-muted-foreground truncate">
                                                    {fullPlayer && getTeamName(fullPlayer.team)} • {fullPlayer && getPositionShortName(fullPlayer.element_type)}
                                                    {(() => {
                                                      const fixture = getPlayerFixture(benchPlayer.element, selectedGameweek);
                                                      if (fixture) {
                                                        return <> • vs {fixture.opponent} {fixture.isHome ? '(H)' : '(A)'}</>;
                                                      }
                                                      return null;
                                                    })()}
                                                  </div>
                                                </div>
                                              </div>
                                              <div className="flex items-center gap-2 shrink-0">
                                                <div className="text-[10px] text-muted-foreground min-w-[32px] text-right">{benchPlayer.projectedPoints.toFixed(1)}</div>
                                              </div>
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              /* For GKP, MID, FWD - show with bench only for GKP */
                              <div className="grid lg:grid-cols-[2fr_auto_1fr] gap-2">
                                {/* Starting players */}
                                <div className="grid gap-1">
                                  {positionPlayers.map((player) => {
                              const fullPlayer = getPlayerById(player.element);
                              const pick = manualLineup.find(p => p.element === player.element);
                              
                              // Check if this player slot is transferred out
                              if (pick && pick.is_transferred_out) {
                                return (
                                  <div
                                    key={`empty-auto-${player.element}`}
                                    className="flex items-center justify-between p-3 rounded-lg border-2 border-dashed border-red-300 bg-red-50 dark:bg-red-950/20"
                                    data-testid={`empty-slot-auto-${player.element}`}
                                  >
                                    <div className="flex items-center gap-3 flex-1">
                                      <div className="flex-1">
                                        <div className="font-medium text-red-600">Empty Slot</div>
                                        <div className="text-sm text-muted-foreground">
                                          {fullPlayer && getPositionShortName(fullPlayer.element_type)} • Click "Replace" to find a player
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <div className="text-sm text-red-600 font-medium">
                                        Switch to Manual mode to add replacement
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                              
                              return (
                                <div
                                  key={player.element}
                                  className={`flex items-center justify-between p-1.5 rounded border gap-0 min-h-[52px] ${
                                    player.isCaptain ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20' :
                                    player.isViceCaptain ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/20' :
                                    pick && isPlayerTransferredIn(pick) ? 'border-green-500 bg-green-50 dark:bg-green-950/20' :
                                    'border-gray-200'
                                  }`}
                                  data-testid={`optimized-player-${player.element}`}
                                >
                                  <div className="flex items-center gap-1 flex-1 min-w-0">
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs font-medium flex items-center gap-1 flex-wrap">
                                        <span className="truncate">{player.web_name}</span>
                                        {pick && isPlayerTransferredIn(pick) && (
                                          <span className="text-[10px] font-bold text-green-600 bg-green-100 dark:bg-green-900 px-1 py-0.5 rounded">NEW</span>
                                        )}
                                        {player.isCaptain && (
                                          <span className="text-[10px] font-bold text-yellow-600 bg-yellow-100 dark:bg-yellow-900 px-1 py-0.5 rounded">C</span>
                                        )}
                                        {player.isViceCaptain && (
                                          <span className="text-[10px] font-bold text-blue-600 bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded">VC</span>
                                        )}
                                      </div>
                                      <div className="text-[10px] text-muted-foreground truncate">
                                        {fullPlayer && getTeamName(fullPlayer.team)} • {fullPlayer && getPositionShortName(fullPlayer.element_type)}
                                        {(() => {
                                          const fixture = getPlayerFixture(player.element, selectedGameweek);
                                          if (fixture) {
                                            return <> • vs {fixture.opponent} {fixture.isHome ? '(H)' : '(A)'}</>;
                                          }
                                          return null;
                                        })()}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <div className="text-right min-w-[32px]">
                                      <div className="text-xs font-bold text-purple-600">{player.projectedPoints.toFixed(1)}</div>
                                      {player.isCaptain && (
                                        <div className="text-[10px] text-muted-foreground">({(player.projectedPoints * 2).toFixed(1)})</div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                              </div>
                              
                              {/* Divider */}
                              {posType === 1 && benchGK.length > 0 && (
                                <div className="hidden lg:flex items-center justify-center">
                                  <div className="w-px h-full bg-gray-300"></div>
                                </div>
                              )}
                              
                              {/* Bench players for this row - only for GKP */}
                              <div className="grid gap-1">
                                {posType === 1 && benchGK.map((benchPlayer: any) => {
                                  const fullPlayer = getPlayerById(benchPlayer.element);
                                  const pick = manualLineup.find(p => p.element === benchPlayer.element);
                                  
                                  // Check if this bench player is transferred out
                                  if (pick && pick.is_transferred_out) {
                                    return (
                                      <div
                                        key={`empty-bench-auto-${benchPlayer.element}`}
                                        className="flex items-center justify-between p-1.5 rounded border-2 border-dashed border-red-300 bg-red-50 dark:bg-red-950/20 text-xs"
                                        data-testid={`empty-slot-bench-auto-${benchPlayer.element}`}
                                      >
                                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                          <span className="text-[10px] font-bold text-red-600 bg-red-200 dark:bg-red-700 px-1 py-0.5 rounded">
                                            {benchPlayer.benchPriority || 'B'}
                                          </span>
                                          <div className="flex-1 min-w-0">
                                            <div className="text-xs font-medium text-red-600">Empty</div>
                                            <div className="text-[10px] text-muted-foreground truncate">
                                              {fullPlayer && getPositionShortName(fullPlayer.element_type)}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="text-xs text-red-600 font-medium">
                                          Switch to Manual
                                        </div>
                                      </div>
                                    );
                                  }
                                  
                                  return (
                                    <div
                                      key={benchPlayer.element}
                                      className={`flex items-center justify-between p-1.5 rounded border gap-0 min-h-[52px] ${
                                        pick && isPlayerTransferredIn(pick) 
                                          ? 'border-green-500 bg-green-50 dark:bg-green-950/20' 
                                          : 'border-gray-200 bg-gray-50 dark:bg-gray-900'
                                      }`}
                                      data-testid={`bench-player-${benchPlayer.element}`}
                                    >
                                      <div className="flex items-center gap-1 flex-1 min-w-0">
                                        <span className="text-[10px] font-bold text-gray-600 bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded">
                                          {benchPlayer.benchPriority || 'B'}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                          <div className="text-xs font-medium flex items-center gap-1 flex-wrap">
                                            <span className="truncate">{benchPlayer.web_name}</span>
                                            {pick && isPlayerTransferredIn(pick) && (
                                              <span className="text-[10px] font-bold text-green-600 bg-green-100 dark:bg-green-900 px-1 py-0.5 rounded">NEW</span>
                                            )}
                                          </div>
                                          <div className="text-[10px] text-muted-foreground truncate">
                                            {fullPlayer && getTeamName(fullPlayer.team)} • {fullPlayer && getPositionShortName(fullPlayer.element_type)}
                                            {(() => {
                                              const fixture = getPlayerFixture(benchPlayer.element, selectedGameweek);
                                              if (fixture) {
                                                return <> • vs {fixture.opponent} {fixture.isHome ? '(H)' : '(A)'}</>;
                                              }
                                              return null;
                                            })()}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        <div className="text-[10px] text-muted-foreground min-w-[32px] text-right">{benchPlayer.projectedPoints.toFixed(1)}</div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Total Projected Points */}
                    <div className="pt-4 border-t mt-4">
                      <div className="flex justify-between items-center p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                        <span className="font-semibold">Total Projected Points (GW{selectedGameweek})</span>
                        <span className="text-2xl font-bold text-purple-600">
                          {optimizedLineup.starting11
                            .reduce((total, player) => {
                              const multiplier = player.isCaptain ? 2 : 1;
                              return total + (player.projectedPoints || 0) * multiplier;
                            }, 0)
                            .toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bench - Hidden since bench is now integrated above */}
                  <div className="hidden">
                    <h3 className="text-sm font-semibold mb-2">Bench</h3>
                    <div className="grid gap-1">
                    {optimizedLineup.bench.map((player) => {
                      const fullPlayer = getPlayerById(player.element);
                      const pick = manualLineup.find(p => p.element === player.element);
                      
                      // Check if this bench player is transferred out
                      if (pick && pick.is_transferred_out) {
                        return (
                          <div
                            key={`empty-bench-auto-${player.element}`}
                            className="flex items-center justify-between p-3 rounded-lg border-2 border-dashed border-red-300 bg-red-50 dark:bg-red-950/20"
                            data-testid={`empty-slot-bench-auto-${player.element}`}
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <span className="text-xs font-bold text-red-600 bg-red-200 dark:bg-red-700 px-2 py-1 rounded">
                                {player.benchPosition}
                              </span>
                              <div className="flex-1">
                                <div className="font-medium text-red-600">Empty Slot</div>
                                <div className="text-sm text-muted-foreground">
                                  {fullPlayer && getPositionShortName(fullPlayer.element_type)} • Click "Replace" to find a player
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-sm text-red-600 font-medium">
                                Switch to Manual mode to add replacement
                              </div>
                            </div>
                          </div>
                        );
                      }
                      
                      return (
                        <div
                          key={player.element}
                          className={`flex items-center justify-between p-1.5 rounded border gap-0 min-h-[52px] ${
                            pick && isPlayerTransferredIn(pick) 
                              ? 'border-green-500 bg-green-50 dark:bg-green-950/20' 
                              : 'border-gray-200 bg-gray-50 dark:bg-gray-900'
                          }`}
                          data-testid={`bench-player-${player.element}`}
                        >
                          <div className="flex items-center gap-1 flex-1 min-w-0">
                            <span className="text-[10px] font-bold text-gray-600 bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded">
                              {player.benchPosition}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium flex items-center gap-1 flex-wrap">
                                <span className="truncate">{player.web_name}</span>
                                {pick && isPlayerTransferredIn(pick) && (
                                  <span className="text-[10px] font-bold text-green-600 bg-green-100 dark:bg-green-900 px-1 py-0.5 rounded">NEW</span>
                                )}
                              </div>
                              <div className="text-[10px] text-muted-foreground truncate">
                                {fullPlayer && getTeamName(fullPlayer.team)} • {fullPlayer && getPositionShortName(fullPlayer.element_type)}
                                {(() => {
                                  const fixture = getPlayerFixture(player.element, selectedGameweek);
                                  if (fixture) {
                                    return <> • vs {fixture.opponent} {fixture.isHome ? '(H)' : '(A)'}</>;
                                  }
                                  return null;
                                })()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-[10px] text-muted-foreground min-w-[32px] text-right">{player.projectedPoints.toFixed(1)}</div>
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  </div>
                </div>
                )}

                {/* Pitch View for Auto Lineup */}
                {teamView === "pitch" && (
                  <div>
                    {/* Formation Display */}
                    <div className="text-center mb-4 p-2 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                      <h3 className="text-sm font-semibold flex items-center justify-center gap-2">
                        <Crown className="h-4 w-4 text-yellow-500" />
                        Optimized Formation: {optimizedLineup.formation}
                      </h3>
                    </div>

                    {/* Pitch Layout */}
                    <div className="relative bg-gradient-to-b from-green-600 to-green-700 rounded-lg p-4 sm:p-6 md:p-8 lg:p-10 min-h-[600px]">
                      {/* Field Lines */}
                      <div className="absolute inset-0 opacity-20">
                        <div className="absolute top-1/2 left-0 right-0 h-px bg-white"></div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border border-white rounded-full"></div>
                      </div>

                      {/* Starting XI */}
                      <div className="relative space-y-4 sm:space-y-6 md:space-y-8 lg:space-y-10">
                        {/* Group by position */}
                        {[1, 2, 3, 4].map(posType => {
                          const positionPlayers = optimizedLineup.starting11.filter(player => {
                            const fullPlayer = getPlayerById(player.element);
                            return fullPlayer?.element_type === posType;
                          });
                          
                          if (positionPlayers.length === 0) return null;
                          
                          return (
                            <div key={posType} className="flex justify-center gap-0.5 sm:gap-1 md:gap-1.5">
                              {positionPlayers.map(player => {
                                const fullPlayer = getPlayerById(player.element);
                                const pick = manualLineup.find(p => p.element === player.element);
                                
                                if (!fullPlayer) return null;

                                // Check if transferred out
                                if (pick && pick.is_transferred_out) {
                                  return (
                                    <div
                                      key={player.element}
                                      className="w-24 p-2 rounded-lg border-2 border-dashed border-red-300 bg-red-50 dark:bg-red-950/20 text-center"
                                      data-testid={`auto-pitch-empty-${player.element}`}
                                    >
                                      <div className="text-xs font-medium text-red-600">Empty Slot</div>
                                      <div className="text-[10px] text-muted-foreground mt-1">
                                        {getPositionShortName(fullPlayer.element_type)}
                                      </div>
                                    </div>
                                  );
                                }

                                const teamColor = getTeamJerseyColor(fullPlayer.team);
                                const hexTextColor = getTextColor(teamColor);
                                const textColor = hexTextColor === '#000000' ? 'text-black' : 'text-white';

                                return (
                                  <div key={player.element} className="flex flex-col items-center w-[19%]" data-testid={`auto-pitch-player-${player.element}`}>
                                    <div className="relative w-full">
                                      <svg viewBox="0 0 403 302" className="w-full drop-shadow-xl">
                                        <defs><clipPath id={`jersey-auto-${player.element}`}><path d="M 84 43 L 46 43 L 46 115 L 65 122 L 84 122 L 84 43 L 130 14 Q 137 14 144 23 L 158 36 L 173 43 Q 187 43 202 43 L 216 43 Q 230 43 245 36 L 259 23 Q 266 14 274 14 L 319 43 L 319 122 L 338 122 L 358 115 L 358 43 L 319 43 L 319 295 L 84 295 L 84 43 Z" /></clipPath></defs>
                                        <rect width="403" height="302" fill={teamColor} clipPath={`url(#jersey-auto-${player.element})`} />
                                        <path d="M 84 43 L 46 43 L 46 115 L 65 122 L 84 122 L 84 43 L 130 14 Q 137 14 144 23 L 158 36 L 173 43 Q 187 43 202 43 L 216 43 Q 230 43 245 36 L 259 23 Q 266 14 274 14 L 319 43 L 319 122 L 338 122 L 358 115 L 358 43 L 319 43 L 319 295 L 84 295 L 84 43 Z" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5" />
                                        <path d="M 130 14 L 144 26 L 158 36 L 173 42 Q 187 42 202 42 L 216 42 Q 230 42 245 36 L 259 26 L 274 14" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
                                        {player.isCaptain && (<g><rect x="96" y="55" width="34" height="34" fill="rgb(254 240 138)" stroke="rgb(161 98 7)" strokeWidth="2" rx="4" /><text x="113" y="80" fontSize="22" fontWeight="bold" textAnchor="middle" fill="rgb(161 98 7)">C</text></g>)}
                                        {player.isViceCaptain && (<g><rect x="96" y="55" width="38" height="34" fill="rgb(191 219 254)" stroke="rgb(29 78 216)" strokeWidth="2" rx="4" /><text x="115" y="80" fontSize="19" fontWeight="bold" textAnchor="middle" fill="rgb(29 78 216)">VC</text></g>)}
                                        {pick && isPlayerTransferredIn(pick) && (<g><circle cx="295" cy="70" r="17" fill="#22C55E" stroke="white" strokeWidth="2.5" /><text x="295" y="78" fontSize="16" fontWeight="bold" textAnchor="middle" fill="white">+</text></g>)}
                                        <text x="202" y="108" fontSize="clamp(16px, 3.5vw, 28px)" fontWeight="bold" textAnchor="middle" fill={hexTextColor}>{bootstrapData?.teams.find(t => t.id === fullPlayer.team)?.short_name || ''}</text>
                                        <text x="202" y="150" fontSize="clamp(18px, 4vw, 32px)" fontWeight="bold" textAnchor="middle" fill={hexTextColor}>{player.web_name}</text>
                                        <text x="202" y="225" fontSize="clamp(26px, 6vw, 52px)" fontWeight="bold" textAnchor="middle" fill={hexTextColor}>{player.projectedPoints.toFixed(1)}</text>
                                        {(() => {
                                          const fixture = getPlayerFixture(player.element, selectedGameweek);
                                          if (fixture) {
                                            return <text x="202" y="270" fontSize="clamp(14px, 3vw, 24px)" fontWeight="bold" textAnchor="middle" fill={hexTextColor}>vs {fixture.opponent} {fixture.isHome ? '(H)' : '(A)'}</text>;
                                          }
                                          return null;
                                        })()}
                                      </svg>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>

                      {/* Bench */}
                      <div className="mt-8 pt-4 border-t border-white/30">
                        <h4 className="text-xs font-semibold text-white mb-3 text-center">Bench</h4>
                        <div className="flex justify-center gap-0.5 sm:gap-1 md:gap-1.5">
                          {(() => {
                            const gkBench = optimizedLineup.bench.find(player => {
                              const fullPlayer = getPlayerById(player.element);
                              return fullPlayer?.element_type === 1;
                            });
                            const outfieldBench = optimizedLineup.bench
                              .filter(player => {
                                const fullPlayer = getPlayerById(player.element);
                                return fullPlayer?.element_type !== 1;
                              })
                              .sort((a, b) => b.projectedPoints - a.projectedPoints);
                            const reorderedBench = gkBench ? [gkBench, ...outfieldBench] : outfieldBench;
                            return reorderedBench.map((player) => {
                            const fullPlayer = getPlayerById(player.element);
                            const pick = manualLineup.find(p => p.element === player.element);
                            
                            if (!fullPlayer) return null;

                            // Check if transferred out
                            if (pick && pick.is_transferred_out) {
                              return (
                                <div
                                  key={player.element}
                                  className="w-20 p-2 rounded-lg border-2 border-dashed border-red-300 bg-red-50 dark:bg-red-950/20 text-center"
                                  data-testid={`auto-pitch-bench-empty-${player.element}`}
                                >
                                  <div className="text-xs font-medium text-red-600">Empty</div>
                                  <div className="text-[10px] text-muted-foreground mt-1">
                                    {getPositionShortName(fullPlayer.element_type)}
                                  </div>
                                </div>
                              );
                            }

                            const teamColor = getTeamJerseyColor(fullPlayer.team);
                            const hexTextColor = getTextColor(teamColor);
                            const textColor = hexTextColor === '#000000' ? 'text-black' : 'text-white';

                            return (
                              <div key={player.element} className="flex flex-col items-center w-[19%] opacity-90" data-testid={`auto-pitch-bench-${player.element}`}>
                                <div className="relative w-full">
                                  <svg viewBox="0 0 403 302" className="w-full drop-shadow-lg">
                                    <defs><clipPath id={`jersey-bench-auto-${player.element}`}><path d="M 84 43 L 46 43 L 46 115 L 65 122 L 84 122 L 84 43 L 130 14 Q 137 14 144 23 L 158 36 L 173 43 Q 187 43 202 43 L 216 43 Q 230 43 245 36 L 259 23 Q 266 14 274 14 L 319 43 L 319 122 L 338 122 L 358 115 L 358 43 L 319 43 L 319 295 L 84 295 L 84 43 Z" /></clipPath></defs>
                                    <rect width="403" height="302" fill={teamColor} clipPath={`url(#jersey-bench-auto-${player.element})`} />
                                    <path d="M 84 43 L 46 43 L 46 115 L 65 122 L 84 122 L 84 43 L 130 14 Q 137 14 144 23 L 158 36 L 173 43 Q 187 43 202 43 L 216 43 Q 230 43 245 36 L 259 23 Q 266 14 274 14 L 319 43 L 319 122 L 338 122 L 358 115 L 358 43 L 319 43 L 319 295 L 84 295 L 84 43 Z" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5" />
                                    <path d="M 130 14 L 144 26 L 158 36 L 173 42 Q 187 42 202 42 L 216 42 Q 230 42 245 36 L 259 26 L 274 14" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
                                    {pick?.is_captain && (<g><rect x="96" y="55" width="34" height="34" fill="rgb(254 240 138)" stroke="rgb(161 98 7)" strokeWidth="2" rx="4" /><text x="113" y="80" fontSize="22" fontWeight="bold" textAnchor="middle" fill="rgb(161 98 7)">C</text></g>)}
                                    {pick?.is_vice_captain && (<g><rect x="96" y="55" width="38" height="34" fill="rgb(191 219 254)" stroke="rgb(29 78 216)" strokeWidth="2" rx="4" /><text x="115" y="80" fontSize="19" fontWeight="bold" textAnchor="middle" fill="rgb(29 78 216)">VC</text></g>)}
                                    {pick && isPlayerTransferredIn(pick) && (<g><circle cx="295" cy="70" r="17" fill="#22C55E" stroke="white" strokeWidth="2.5" /><text x="295" y="78" fontSize="16" fontWeight="bold" textAnchor="middle" fill="white">+</text></g>)}
                                    <text x="202" y="108" fontSize="clamp(16px, 3.5vw, 28px)" fontWeight="bold" textAnchor="middle" fill={hexTextColor}>{bootstrapData?.teams.find(t => t.id === fullPlayer.team)?.short_name || ''}</text>
                                    <text x="202" y="150" fontSize="clamp(18px, 4vw, 32px)" fontWeight="bold" textAnchor="middle" fill={hexTextColor}>{player.web_name}</text>
                                    <text x="202" y="225" fontSize="clamp(26px, 6vw, 52px)" fontWeight="bold" textAnchor="middle" fill={hexTextColor}>{player.projectedPoints.toFixed(1)}</text>
                                    {(() => {
                                      const fixture = getPlayerFixture(player.element, selectedGameweek);
                                      if (fixture) {
                                        return <text x="202" y="270" fontSize="clamp(14px, 3vw, 24px)" fontWeight="bold" textAnchor="middle" fill={hexTextColor}>vs {fixture.opponent} {fixture.isHome ? '(H)' : '(A)'}</text>;
                                      }
                                      return null;
                                    })()}
                                  </svg>
                                </div>
                              </div>
                            );
                          });
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Total Projected Points */}
                    <div className="mt-4">
                      <div className="flex justify-between items-center p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                        <span className="font-semibold">Total Projected Points (GW{selectedGameweek})</span>
                        <span className="text-2xl font-bold text-purple-600">
                          {optimizedLineup.starting11
                            .reduce((total, player) => {
                              const multiplier = player.isCaptain ? 2 : 1;
                              return total + (player.projectedPoints || 0) * multiplier;
                            }, 0)
                            .toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
            </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Auto-Optimization Section */}
      {searchedId && teamData && selectedGameweek && plannerMode === "auto" && (
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-background">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-indigo-600" />
                Team Evolution - {activeDraft === "Base" ? "Base Draft" : `Draft ${activeDraft}`}
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
          </CardHeader>
          <CardContent>
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
                        {/* Starting 11 */}
                        {baseLineup.slice(0, 11).map((pick, idx) => {
                          const player = getPlayerById(pick.element);
                          if (!player) return null;
                          const isCaptain = pick.element === captain?.element;
                          const isViceCaptain = pick.element === viceCaptain?.element;
                          
                          return (
                            <div
                              key={idx}
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
                        })}
                        {/* Bench spacing */}
                        <div className="my-1 py-1"></div>
                        {/* Bench */}
                        {baseLineup.slice(11, 15).map((pick, idx) => {
                          const player = getPlayerById(pick.element);
                          if (!player) return null;
                          
                          return (
                            <div
                              key={idx + 11}
                              className={`px-2 py-0.5 rounded text-[10px] font-medium opacity-70 ${
                                player.element_type === 1 ? 'bg-indigo-600 text-white' :
                                player.element_type === 2 ? 'bg-cyan-600 text-white' :
                                player.element_type === 3 ? 'bg-emerald-600 text-white' :
                                'bg-red-600 text-white'
                              }`}
                              data-testid={`evolution-base-bench-${pick.element}`}
                            >
                              <span className="truncate">{player.web_name}</span>
                            </div>
                          );
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
                  
                  // Find transferred in players - compare finalLineup (after transfers) against gwLineup (before transfers)
                  // If previous GW had Free Hit, don't mark any players as transfers (they're reverting back)
                  const baselinePlayerIds = new Set(gwLineup.map(p => p.element));
                  const transferredInIds = new Set<number>();
                  
                  if (!prevHadFreeHit) {
                    finalLineup.forEach(pick => {
                      if (!baselinePlayerIds.has(pick.element)) {
                        transferredInIds.add(pick.element);
                      }
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
                  
                  // Determine captain (for auto mode, use optimized; for manual, use current lineup)
                  let captain, viceCaptain;
                  if (plannerMode === "auto" && selectedGameweek === gw.id && optimizedLineup) {
                    captain = optimizedLineup.starting11.find(p => p.isCaptain);
                    viceCaptain = optimizedLineup.starting11.find(p => p.isViceCaptain);
                  } else {
                    captain = finalLineup.find(p => p.is_captain);
                    viceCaptain = finalLineup.find(p => p.is_vice_captain);
                  }
                  
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
                        {/* Starting 11 */}
                        {finalLineup.slice(0, 11).map((pick, idx) => {
                          const player = getPlayerById(pick.element);
                          if (!player) return null;
                          const isCaptain = plannerMode === "auto" && selectedGameweek === gw.id && optimizedLineup
                            ? captain?.element === pick.element
                            : pick.element === captain?.element;
                          const isViceCaptain = plannerMode === "auto" && selectedGameweek === gw.id && optimizedLineup
                            ? viceCaptain?.element === pick.element
                            : pick.element === viceCaptain?.element;
                          const isTransferredIn = transferredInIds.has(pick.element);
                          
                          return (
                            <div
                              key={idx}
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
                        })}
                        {/* Bench spacing */}
                        <div className="my-1 py-1"></div>
                        {/* Bench */}
                        {finalLineup.slice(11, 15).map((pick, idx) => {
                          const player = getPlayerById(pick.element);
                          if (!player) return null;
                          const isTransferredIn = transferredInIds.has(pick.element);
                          
                          return (
                            <div
                              key={idx + 11}
                              className={`px-2 py-0.5 rounded text-[10px] font-medium opacity-70 ${
                                isTransferredIn ? 'bg-green-100 text-green-900 border-2 border-green-500 dark:bg-green-950/40 dark:text-green-300' :
                                player.element_type === 1 ? 'bg-indigo-600 text-white' :
                                player.element_type === 2 ? 'bg-cyan-600 text-white' :
                                player.element_type === 3 ? 'bg-emerald-600 text-white' :
                                'bg-red-600 text-white'
                              }`}
                              data-testid={`evolution-gw${gw.id}-bench-${pick.element}`}
                            >
                              <span className="truncate">{player.web_name}</span>
                            </div>
                          );
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
        </Card>
      )}


      {/* Draft Comparison Table */}
      {searchedId && teamData && playerProjections && playerProjections6GW && (
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-background">
          <CardHeader>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  Draft Comparison
                </CardTitle>
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
              </div>
              
              {/* Filter Buttons */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Show:</span>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant={comparisonFilter === "all" ? "default" : "outline"}
                    onClick={() => setComparisonFilter("all")}
                    className="h-7 px-3 text-xs"
                    data-testid="filter-all"
                  >
                    All Lineups
                  </Button>
                  <Button
                    size="sm"
                    variant={comparisonFilter === "manual" ? "default" : "outline"}
                    onClick={() => setComparisonFilter("manual")}
                    className="h-7 px-3 text-xs"
                    data-testid="filter-manual"
                  >
                    Manual Only
                  </Button>
                  <Button
                    size="sm"
                    variant={comparisonFilter === "auto" ? "default" : "outline"}
                    onClick={() => setComparisonFilter("auto")}
                    className="h-7 px-3 text-xs"
                    data-testid="filter-auto"
                  >
                    Auto Only
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              const comparisonData = buildDraftComparisonData();
              const nextGWs = getNextGameweeks();
              
              if (comparisonData.length === 0 || nextGWs.length === 0) {
                return <p className="text-muted-foreground text-sm">No comparison data available</p>;
              }
              
              // Filter comparison data based on selected filter
              const filteredComparisonData = comparisonData.filter(row => {
                if (comparisonFilter === "all") return true;
                if (comparisonFilter === "manual") return row.mode === "Manual lineup";
                if (comparisonFilter === "auto") return row.mode === "Auto lineup";
                return true;
              });
              
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
                        const isDuplicate = row.mode === 'Manual lineup' && duplicateInfo[row.draftKey]?.isDuplicate;
                        const duplicateOf = duplicateInfo[row.draftKey]?.duplicateOfKey;
                        
                        return (
                          <tr 
                            key={`${row.draftKey}-${row.mode}`} 
                            className={`border-b hover:bg-gray-50 dark:hover:bg-gray-900 ${
                              row.draftKey === activeDraft && row.mode === 'Manual lineup' ? 'bg-blue-50 dark:bg-blue-950/10' : 
                              row.mode === 'Auto lineup' ? 'bg-purple-50/30 dark:bg-purple-950/10' : ''
                            }`}
                            data-testid={`row-${row.draftKey}-${row.mode.toLowerCase()}`}
                          >
                            <td className="p-2 font-medium" data-testid={`cell-draft-${row.draftKey}`}>
                              <div className="flex items-center gap-2">
                                <span>{row.draftKey}</span>
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  row.mode === 'Manual lineup' 
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
                                    : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                                }`}>
                                  {row.mode}
                                </span>
                                {row.draftKey === activeDraft && row.mode === 'Manual lineup' && <span className="text-blue-600">●</span>}
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
                                
                                {isDuplicate && row.draftKey !== 'Base' && (
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
                                            switchToDraft("Base");
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
                                            {row.gameweeks[gw.id]?.toFixed(1) || '0.0'}
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
                                    <span>{row.gameweeks[gw.id]?.toFixed(1) || '0.0'}</span>
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
                            {row.total.toFixed(1)}
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
        </Card>
      )}

      {/* Projected Points Section */}
      {searchedId && teamData && selectedGameweek && (
        <div className="space-y-4">
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
              Set the price you paid for this player. This affects the selling price and available budget.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Buy Price (£m):</label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="15"
                value={editBuyPriceValue}
                onChange={(e) => setEditBuyPriceValue(e.target.value)}
                className="w-32"
                data-testid="input-buy-price"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    saveBuyPriceFromDialog();
                  }
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Current sell price: £{editBuyPriceDialog ? getSellingPrice(manualLineup.find(p => p.element === editBuyPriceDialog.playerId)!).toFixed(1) : '0.0'}m
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEditBuyPriceDialog(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={saveBuyPriceFromDialog} data-testid="button-save-buy-price">
              Save
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
  );
}
