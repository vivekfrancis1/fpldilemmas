import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, Search, Calendar, BarChart3, RefreshCw, ChevronUp, ChevronDown, Sparkles, Filter } from "lucide-react";
import { BootstrapData } from "@shared/schema";

interface PricePrediction {
  player_id: number;
  player_name: string;
  team_name: string;
  position: string;
  current_price: number;
  status: string;
  progress: number;
  predicted_progress: number;
  hourly_rate: number;
  hours_remaining: number;
  likelihood: number;
  ownership_trend: 'up' | 'down' | 'flat';
  ownership_percentage: number;
  locked_until: string | null;
  hours_to_threshold: number | null;
  days_to_threshold: number | null;
}

type PredictionSortField = 'progress' | 'predicted_progress' | 'hourly_rate' | 'hours_to_threshold' | 'ownership_percentage' | 'current_price';
type PredictionMovementFilter = 'all' | 'rise' | 'drop' | 'locked';
type PredictionTeamFilter = 'all' | 'my-team';

interface PriceChange {
  player_id: number;
  player_name: string;
  team_name: string;
  position: string;
  old_price: number;
  current_price: number;
  price_change: number;
  change_date: string;
  ownership: number;
  transfers_in: number;
  transfers_out: number;
  transfers_in_gw: number;
  transfers_out_gw: number;
  is_recent_change: boolean;
  total_season_change: number;
}

type SortField = 'change_date' | 'player_name' | 'team_name' | 'position' | 'old_price' | 'current_price' | 'price_change' | 'ownership' | 'transfers_in' | 'transfers_out' | 'transfers_in_gw' | 'transfers_out_gw';
type SortDirection = 'asc' | 'desc';

interface MyTeamData {
  picks: Array<{ element: number }>;
}

// Seconds until FPL's next price update (00:00 UK time) — mirrors the server's own
// /api/price-predictions calculation so the client-side countdown always agrees with hours_remaining.
function getSecondsUntilNextPriceChange(): number {
  const now = new Date();
  const ukParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(now);
  const ukField = (type: string) => parseInt(ukParts.find((p) => p.type === type)?.value || "0", 10);
  const secondsSinceUkMidnight = ukField("hour") * 3600 + ukField("minute") * 60 + ukField("second");
  return Math.max(24 * 3600 - secondsSinceUkMidnight, 0);
}

function formatCountdown(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return [hours, minutes, seconds].map((n) => n.toString().padStart(2, '0')).join(':');
}

export default function RecentPriceChanges() {
  const [activeTab, setActiveTab] = useState<"predicted" | "recent">("predicted");
  const [searchTerm, setSearchTerm] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");
  const [changeTypeFilter, setChangeTypeFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>('change_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [predictionSearchTerm, setPredictionSearchTerm] = useState("");
  const [predictionPositionFilter, setPredictionPositionFilter] = useState("all");
  const [predictionSortField, setPredictionSortField] = useState<PredictionSortField>('progress');
  const [predictionSortDirection, setPredictionSortDirection] = useState<SortDirection>('desc');
  const [predictionMovementFilter, setPredictionMovementFilter] = useState<PredictionMovementFilter>('all');
  const [predictionTeamFilter, setPredictionTeamFilter] = useState<PredictionTeamFilter>('all');
  const [predictionClubFilter, setPredictionClubFilter] = useState("all");
  const [predictionStatusFilter, setPredictionStatusFilter] = useState("all");
  const [isPredictionFiltersOpen, setIsPredictionFiltersOpen] = useState(false); // collapsed by default, especially on mobile
  const [isRecentFiltersOpen, setIsRecentFiltersOpen] = useState(false); // collapsed by default, especially on mobile
  const [cachedManagerId, setCachedManagerId] = useState<string | null>(null);
  const [secondsUntilPriceChange, setSecondsUntilPriceChange] = useState(() => getSecondsUntilNextPriceChange());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    try {
      setCachedManagerId(localStorage.getItem('fpl-manager-id'));
    } catch {
      setCachedManagerId(null);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsUntilPriceChange(getSecondsUntilNextPriceChange());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const nextPriceChangeDate = new Date(Date.now() + secondsUntilPriceChange * 1000);
  const nextPriceChangeLocalTime = nextPriceChangeDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  // Viewer's own local time zone abbreviation (e.g. "IST", "GMT+1", "PDT") — whatever the
  // browser's own Intl data resolves to for their device, not a hardcoded zone.
  const localTimeZoneAbbr = new Intl.DateTimeFormat([], { timeZoneName: 'short' })
    .formatToParts(nextPriceChangeDate)
    .find((part) => part.type === 'timeZoneName')?.value || '';

  const { data: myTeamData } = useQuery<MyTeamData>({
    queryKey: ["/api/manager", cachedManagerId, "team"],
    enabled: activeTab === "predicted" && predictionTeamFilter === "my-team" && !!cachedManagerId,
  });
  const myTeamPlayerIds = new Set((myTeamData?.picks || []).map((p) => p.element));

  const { data: bootstrapData, isLoading: isLoadingBootstrap } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: predictionsData, isLoading: isLoadingPredictions, error: predictionsError } = useQuery<PricePrediction[]>({
    queryKey: ["/api/price-predictions"],
    enabled: activeTab === "predicted",
    staleTime: 5 * 60 * 1000,
  });

  const { data: priceChanges, isLoading: isLoadingChanges, error: changesError } = useQuery({
    queryKey: ["/api/price-changes/recent"],
    refetchInterval: 60000, // Refresh every minute
  });

  // Refresh mutation for manual data update
  const refreshMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/price-changes/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to refresh price data");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate and refetch the price changes data
      queryClient.invalidateQueries({ queryKey: ["/api/price-changes/recent"] });
      toast({
        title: "Price Data Refreshed",
        description: data.message || "Successfully fetched latest data from FPL API",
      });
    },
    onError: (error) => {
      toast({
        title: "Refresh Failed",
        description: error instanceof Error ? error.message : "Failed to refresh price data",
        variant: "destructive",
      });
    },
  });

  const handleRefresh = () => {
    refreshMutation.mutate();
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getPlayersByPosition = () => {
    if (!bootstrapData) return [];
    return bootstrapData.element_types.map(position => ({
      id: position.id,
      name: position.singular_name_short
    }));
  };

  const getClubs = () => {
    if (!bootstrapData) return [];
    return [...bootstrapData.teams]
      .sort((a: any, b: any) => a.short_name.localeCompare(b.short_name))
      .map((team: any) => ({ id: team.id, name: team.short_name }));
  };

  const resolveTeamName = (change: PriceChange): string => {
    if (!bootstrapData) return change.team_name;
    const player = bootstrapData.elements?.find((p: any) => p.id === change.player_id);
    if (!player) return change.team_name;
    const team = bootstrapData.teams?.find((t: any) => t.id === player.team);
    return team?.short_name || change.team_name;
  };

  const filteredAndSortedChanges = Array.isArray(priceChanges) ? priceChanges
    .map((change: PriceChange) => ({
      ...change,
      team_name: resolveTeamName(change),
    }))
    .filter((change: PriceChange) => {
      const matchesSearch = change.player_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           change.team_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPosition = positionFilter === "all" || change.position === positionFilter;
      const matchesChangeType = changeTypeFilter === "all" || 
                               (changeTypeFilter === "rises" && change.price_change > 0) ||
                               (changeTypeFilter === "falls" && change.price_change < 0) ||
                               (changeTypeFilter === "active" && change.price_change === 0);
      return matchesSearch && matchesPosition && matchesChangeType;
    })
    .sort((a: PriceChange, b: PriceChange) => {
      // First, sort by date (most recent first)
      const dateComparison = b.change_date.localeCompare(a.change_date);
      if (dateComparison !== 0) {
        return dateComparison;
      }
      
      // For same date, sort by price change type (rises first, then falls)
      const aPriceChange = a.price_change;
      const bPriceChange = b.price_change;
      
      // If one is rise and other is fall, rises come first
      if (aPriceChange > 0 && bPriceChange < 0) return -1;
      if (aPriceChange < 0 && bPriceChange > 0) return 1;
      
      // If both are rises or both are falls, sort by ownership (higher ownership first)
      if ((aPriceChange > 0 && bPriceChange > 0) || (aPriceChange < 0 && bPriceChange < 0)) {
        const aOwnership = typeof a.ownership === 'number' ? a.ownership : parseFloat(a.ownership || "0");
        const bOwnership = typeof b.ownership === 'number' ? b.ownership : parseFloat(b.ownership || "0");
        const ownershipComparison = bOwnership - aOwnership; // Higher ownership first
        if (ownershipComparison !== 0) {
          return ownershipComparison;
        }
      }
      
      // If ownership is the same, apply user-selected sorting
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      // Handle string comparison for dates and names
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const result = aValue.localeCompare(bValue);
        return sortDirection === 'asc' ? result : -result;
      }
      
      // Handle numeric comparison
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        const result = aValue - bValue;
        return sortDirection === 'asc' ? result : -result;
      }
      
      return 0;
    }) : [];

  // FPL's own price-change page shows every player, sortable by progress toward the next
  // change — real official data (not a guessed threshold), so a player sitting at 0% is a
  // real, meaningful data point too, not something to filter out.
  const allPredictions = Array.isArray(predictionsData) ? predictionsData : [];

  const filteredAndSortedPredictions = allPredictions
    .filter((p: PricePrediction) => {
      const matchesSearch = p.player_name.toLowerCase().includes(predictionSearchTerm.toLowerCase()) ||
                           p.team_name.toLowerCase().includes(predictionSearchTerm.toLowerCase());
      const matchesPosition = predictionPositionFilter === "all" || p.position === predictionPositionFilter;
      const matchesClub = predictionClubFilter === "all" || p.team_name === predictionClubFilter;
      const matchesMovement = predictionMovementFilter === "all" ? true
        : predictionMovementFilter === "locked" ? !!p.locked_until
        : predictionMovementFilter === "rise" ? p.predicted_progress > 0
        : p.predicted_progress < 0;
      const matchesStatus = predictionStatusFilter === "all" || p.status === predictionStatusFilter;
      const matchesTeam = predictionTeamFilter === "all" || myTeamPlayerIds.has(p.player_id);
      return matchesSearch && matchesPosition && matchesClub && matchesMovement && matchesStatus && matchesTeam;
    })
    .sort((a: PricePrediction, b: PricePrediction) => {
      // hours_to_threshold is null when there's no meaningful ETA (already crossed uses 0, not
      // null) — nulls should always sort last regardless of direction, not collapse to 0 and rank
      // as "soonest".
      if (predictionSortField === 'hours_to_threshold') {
        const aNull = a.hours_to_threshold === null;
        const bNull = b.hours_to_threshold === null;
        if (aNull && bNull) return 0;
        if (aNull) return 1;
        if (bNull) return -1;
        const result = a.hours_to_threshold! - b.hours_to_threshold!;
        return predictionSortDirection === 'asc' ? result : -result;
      }
      const aValue = a[predictionSortField] ?? 0;
      const bValue = b[predictionSortField] ?? 0;
      const result = aValue - bValue;
      return predictionSortDirection === 'asc' ? result : -result;
    });

  const handlePredictionSort = (field: PredictionSortField) => {
    if (predictionSortField === field) {
      setPredictionSortDirection(predictionSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setPredictionSortField(field);
      setPredictionSortDirection('desc');
    }
  };

  // Calculate today's price change statistics
  const getTodayStats = () => {
    if (!Array.isArray(priceChanges)) {
      return { todayRises: 0, todayFalls: 0, todayChanges: 0 };
    }

    const today = new Date().toISOString().split('T')[0];
    const todayChanges = priceChanges.filter((c: PriceChange) => c.change_date === today);
    const todayRises = todayChanges.filter((c: PriceChange) => c.price_change > 0);
    const todayFalls = todayChanges.filter((c: PriceChange) => c.price_change < 0);

    return {
      todayRises: todayRises.length,
      todayFalls: todayFalls.length,
      todayChanges: todayChanges.length
    };
  };

  const todayStats = getTodayStats();

  const formatPrice = (price: number | string | undefined | null) => {
    if (price === null || price === undefined) {
      return "£?.?m";
    }
    
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    
    if (isNaN(numPrice)) {
      return "£?.?m";
    }
    
    return `£${(numPrice / 10).toFixed(1)}m`;
  };

  // Colors mirror FPL's own price-changes page: darker/more saturated = closer to certain.
  const statusBadgeClass = (status: string): string => {
    switch (status) {
      case "Very likely to rise today": return "bg-green-700 text-white";
      case "May rise today": return "bg-green-100 text-green-800";
      case "Very likely to drop today": return "bg-red-800 text-white";
      case "May drop today": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-600"; // Unlikely to change today
    }
  };

  // Mirrors the same >100%/>=95% thresholds the Status column uses — a badge should only stand
  // out (light or dark green/red) when a player is actually in "Likely"/"Very likely" territory,
  // not for any nonzero progress (e.g. 87%/88% is real movement but still "Unlikely to change").
  const progressBadgeClass = (value: number): string => {
    const magnitude = Math.abs(value);
    if (magnitude < 95) return "bg-gray-100 text-gray-600";
    const isRise = value >= 0;
    if (magnitude > 100) return isRise ? "bg-green-700 text-white" : "bg-red-800 text-white";
    return isRise ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700";
  };

  // The actual calendar date/time a player will cross the ±100% threshold by, snapped to the next
  // 24h-recurring local cutoff on/after that point — null when there's no meaningful ETA at all.
  const getEtaCutoffDate = (prediction: PricePrediction): Date | null => {
    if (prediction.hours_to_threshold === null) return null;
    const hoursUntilTonightCutoff = secondsUntilPriceChange / 3600;
    const hours = Math.max(prediction.hours_to_threshold, 0); // already-crossed still waits for tonight's cutoff
    const dayOffset = hours <= hoursUntilTonightCutoff ? 0 : Math.ceil((hours - hoursUntilTonightCutoff) / 24);
    return new Date(Date.now() + (hoursUntilTonightCutoff + dayOffset * 24) * 3600 * 1000);
  };

  // Price changes only actually happen once every 24h at the same local cutoff time, so instead of
  // a vague "Tonight"/"Tomorrow"/raw duration, name the actual calendar cutoff a player will cross
  // by — "Monday 4:30 AM", "Tuesday 4:30 AM", etc. — for up to a week out; beyond that a named day
  // stops being useful (which Monday?) so it falls back to "> 7 days".
  const formatEta = (prediction: PricePrediction): string => {
    const cutoffDate = getEtaCutoffDate(prediction);
    if (!cutoffDate) return "-";
    const hoursUntilTonightCutoff = secondsUntilPriceChange / 3600;
    const hours = Math.max(prediction.hours_to_threshold!, 0);
    const dayOffset = hours <= hoursUntilTonightCutoff ? 0 : Math.ceil((hours - hoursUntilTonightCutoff) / 24);
    if (dayOffset > 6) return "> 7 days";
    const weekday = cutoffDate.toLocaleDateString([], { weekday: 'long' });
    const time = cutoffDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return `${weekday} ${time}`;
  };

  // Next unfinished gameweek's deadline, straight from bootstrap-static's own events — the same
  // deadline shown everywhere else in the app, not a hardcoded guess.
  const nextDeadline = bootstrapData?.events?.find((e: any) => e.is_next) as { deadline_time: string } | undefined;
  const nextDeadlineDate = nextDeadline ? new Date(nextDeadline.deadline_time) : null;

  const formatDeadlineComparison = (prediction: PricePrediction): string => {
    if (!nextDeadlineDate) return "-";
    const cutoffDate = getEtaCutoffDate(prediction);
    if (!cutoffDate) return "-";
    return cutoffDate <= nextDeadlineDate ? "Before Transfer Deadline" : "After Transfer Deadline";
  };

  return (
    <div className="fpl-page-container">
      {/* Unified Page Header */}
      <div className="fpl-page-header">
        <div className="fpl-page-title">
          <Calendar className="h-8 w-8" />
          <h1>Price Changes</h1>
        </div>
        <p className="fpl-page-subtitle">
          Upcoming price change predictions and this season's confirmed price changes
        </p>
      </div>

      <div className="fpl-section-spacing">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "predicted" | "recent")}>
          <TabsList className="mb-4">
            <TabsTrigger value="predicted" data-testid="tab-predicted-price-changes">
              <Sparkles className="h-4 w-4 mr-1.5" />
              Predicted Price Changes
            </TabsTrigger>
            <TabsTrigger value="recent" data-testid="tab-recent-price-changes">
              <Calendar className="h-4 w-4 mr-1.5" />
              Recent Price Changes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="predicted">
            {predictionsError && (
              <Alert variant="destructive" className="mb-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Unable to load price predictions from FPL API. Please check your connection and try again.
                </AlertDescription>
              </Alert>
            )}

            <Card className="mb-6 shadow-lg border-0 bg-gradient-to-br from-indigo-50 to-purple-50">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-center sm:text-left">
                  <div>
                    <p className="text-xs text-muted-foreground">Next Price Changes Happen in</p>
                    <p className="text-xl font-bold font-mono" data-testid="text-price-change-countdown">
                      {formatCountdown(secondsUntilPriceChange)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Next Price Change at</p>
                    <p className="text-xl font-bold" data-testid="text-price-change-local-time">
                      {nextPriceChangeLocalTime} <span className="text-sm font-normal text-muted-foreground">{localTimeZoneAbbr}</span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Collapsible open={isPredictionFiltersOpen} onOpenChange={setIsPredictionFiltersOpen} className="mb-6">
              <Card className="shadow-md border-0">
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors py-3 px-4">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                        <CardTitle className="text-sm sm:text-lg">Search &amp; Filters</CardTitle>
                      </div>
                      {isPredictionFiltersOpen ? (
                        <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 text-xs sm:text-sm">
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                      <div className="flex-1">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search players or teams..."
                            value={predictionSearchTerm}
                            onChange={(e) => setPredictionSearchTerm(e.target.value)}
                            className="pl-9 h-9 text-xs sm:text-sm"
                            data-testid="input-search-predictions"
                          />
                        </div>
                      </div>
                      <Select value={predictionTeamFilter} onValueChange={(v) => setPredictionTeamFilter(v as PredictionTeamFilter)}>
                        <SelectTrigger className="w-full sm:w-48 h-9 text-xs sm:text-sm" data-testid="select-prediction-team-filter">
                          <SelectValue placeholder="All Players" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Players</SelectItem>
                          <SelectItem value="my-team">My Team</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={predictionClubFilter} onValueChange={setPredictionClubFilter}>
                        <SelectTrigger className="w-full sm:w-48 h-9 text-xs sm:text-sm" data-testid="select-prediction-club-filter">
                          <SelectValue placeholder="All Teams" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Teams</SelectItem>
                          {getClubs().map(club => (
                            <SelectItem key={club.id} value={club.name}>
                              {club.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={predictionPositionFilter} onValueChange={setPredictionPositionFilter}>
                        <SelectTrigger className="w-full sm:w-48 h-9 text-xs sm:text-sm" data-testid="select-prediction-position-filter">
                          <SelectValue placeholder="All Positions" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Positions</SelectItem>
                          {getPlayersByPosition().map(pos => (
                            <SelectItem key={pos.id} value={pos.name}>
                              {pos.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={predictionMovementFilter} onValueChange={(v) => setPredictionMovementFilter(v as PredictionMovementFilter)}>
                        <SelectTrigger className="w-full sm:w-48 h-9 text-xs sm:text-sm" data-testid="select-prediction-movement-filter">
                          <SelectValue placeholder="Rise & drop" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Rise &amp; drop</SelectItem>
                          <SelectItem value="rise">Rise</SelectItem>
                          <SelectItem value="drop">Drop</SelectItem>
                          <SelectItem value="locked">Locked</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={predictionStatusFilter} onValueChange={setPredictionStatusFilter}>
                        <SelectTrigger className="w-full sm:w-48 h-9 text-xs sm:text-sm" data-testid="select-prediction-status-filter">
                          <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Statuses</SelectItem>
                          <SelectItem value="Very likely to rise today">Very likely to rise today</SelectItem>
                          <SelectItem value="May rise today">May rise today</SelectItem>
                          <SelectItem value="Unlikely to change today">Unlikely to change today</SelectItem>
                          <SelectItem value="May drop today">May drop today</SelectItem>
                          <SelectItem value="Very likely to drop today">Very likely to drop today</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {predictionTeamFilter === "my-team" && !cachedManagerId && (
                      <p className="text-xs text-muted-foreground mt-3">
                        Link your Manager ID on the My Team page to filter to your own squad.
                      </p>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Predicted Price Changes
                </CardTitle>
                <CardDescription>
                  Real-time progress toward each player's next price change, straight from FPL's own official data.
                  {" "}Status: predicted progress past <strong>100%</strong> is "Very likely", <strong>95–100%</strong> is "May", anything below is "Unlikely to change".
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingPredictions ? (
                  <div className="space-y-3">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div key={i} className="animate-pulse flex items-center p-3 border rounded">
                        <div className="h-4 w-4 bg-gray-200 rounded mr-3"></div>
                        <div className="flex-1 space-y-1">
                          <div className="h-4 w-32 bg-gray-200 rounded"></div>
                          <div className="h-3 w-20 bg-gray-200 rounded"></div>
                        </div>
                        <div className="text-right space-y-1">
                          <div className="h-4 w-16 bg-gray-200 rounded"></div>
                          <div className="h-3 w-12 bg-gray-200 rounded"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredAndSortedPredictions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b bg-muted/20">
                          <th className="text-left p-2 sm:p-3 font-medium">Player</th>
                          <th className="hidden md:table-cell text-center p-3 font-medium">Ownership Trend</th>
                          <th
                            className="hidden sm:table-cell text-right p-3 font-medium cursor-pointer hover:bg-muted/30 transition-colors"
                            onClick={() => handlePredictionSort('hourly_rate')}
                          >
                            <div className="flex items-center justify-end gap-1">
                              Per Hr
                              {predictionSortField === 'hourly_rate' && (
                                predictionSortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                              )}
                            </div>
                          </th>
                          <th
                            className="text-right p-2 sm:p-3 font-medium cursor-pointer hover:bg-muted/30 transition-colors"
                            onClick={() => handlePredictionSort('progress')}
                          >
                            <div className="flex items-center justify-end gap-1">
                              Progress
                              {predictionSortField === 'progress' && (
                                predictionSortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                              )}
                            </div>
                          </th>
                          <th
                            className="text-right p-2 sm:p-3 font-medium cursor-pointer hover:bg-muted/30 transition-colors"
                            onClick={() => handlePredictionSort('predicted_progress')}
                          >
                            <div className="flex items-center justify-end gap-1">
                              Predicted
                              {predictionSortField === 'predicted_progress' && (
                                predictionSortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                              )}
                            </div>
                          </th>
                          <th className="hidden sm:table-cell text-left p-3 font-medium">Status</th>
                          <th
                            className="hidden md:table-cell text-right p-3 font-medium cursor-pointer hover:bg-muted/30 transition-colors"
                            title="Time to reach the ±100% threshold at the current per-hour rate, shown in your device's local time zone"
                            onClick={() => handlePredictionSort('hours_to_threshold')}
                          >
                            <div className="flex items-center justify-end gap-1">
                              Time of Change
                              {predictionSortField === 'hours_to_threshold' && (
                                predictionSortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                              )}
                            </div>
                          </th>
                          <th className="hidden lg:table-cell text-center p-3 font-medium" title="Whether the crossing happens before or after the next transfer deadline">
                            Vs Transfer Deadline
                          </th>
                          <th
                            className="hidden sm:table-cell text-right p-3 font-medium cursor-pointer hover:bg-muted/30 transition-colors"
                            onClick={() => handlePredictionSort('current_price')}
                          >
                            <div className="flex items-center justify-end gap-1">
                              Current Price
                              {predictionSortField === 'current_price' && (
                                predictionSortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                              )}
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAndSortedPredictions.map((prediction: PricePrediction) => (
                          <tr
                            key={prediction.player_id}
                            className="border-b hover:bg-muted/50 transition-colors"
                            data-testid={`prediction-${prediction.player_id}`}
                          >
                            <td className="p-2 sm:p-3">
                              <div>
                                <p className="font-medium leading-tight">{prediction.player_name}</p>
                                <p className="text-[0.9em] text-muted-foreground leading-tight">{prediction.team_name} · {prediction.position}</p>
                              </div>
                            </td>
                            <td className="hidden md:table-cell p-3">
                              <div className="flex items-center justify-center gap-1">
                                {prediction.ownership_trend === 'up' ? (
                                  <TrendingUp className="h-4 w-4 text-green-600" />
                                ) : prediction.ownership_trend === 'down' ? (
                                  <TrendingDown className="h-4 w-4 text-red-600" />
                                ) : (
                                  <span className="h-4 w-4" />
                                )}
                                <span className="text-muted-foreground capitalize">{prediction.ownership_trend}</span>
                              </div>
                            </td>
                            <td className="hidden sm:table-cell p-3 text-right text-muted-foreground">
                              {prediction.hourly_rate > 0 ? "+" : ""}{prediction.hourly_rate.toFixed(2)}%
                            </td>
                            <td className="p-2 sm:p-3 text-right">
                              <Badge variant="outline" className={`text-xs sm:text-sm ${progressBadgeClass(prediction.progress)}`}>
                                {prediction.progress > 0 ? "+" : ""}{prediction.progress.toFixed(1)}%
                              </Badge>
                            </td>
                            <td className="p-2 sm:p-3 text-right">
                              <Badge variant="outline" className={`text-xs sm:text-sm ${progressBadgeClass(prediction.predicted_progress)}`}>
                                {prediction.predicted_progress > 0 ? "+" : ""}{prediction.predicted_progress.toFixed(1)}%
                              </Badge>
                            </td>
                            <td className="hidden sm:table-cell p-3">
                              <Badge variant="outline" className={`whitespace-nowrap text-xs sm:text-sm ${statusBadgeClass(prediction.status)}`}>
                                {prediction.status}
                              </Badge>
                            </td>
                            <td className="hidden md:table-cell p-3 text-right text-muted-foreground">
                              {formatEta(prediction)}
                            </td>
                            <td className="hidden lg:table-cell p-3 text-center text-muted-foreground">
                              {formatDeadlineComparison(prediction)}
                            </td>
                            <td className="hidden sm:table-cell p-3 text-right font-medium">
                              {formatPrice(prediction.current_price)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : !isLoadingPredictions && !predictionsError ? null : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No predicted price changes found matching your filters</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recent">
        {/* Today's Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 px-1">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-100 hover:shadow-xl transition-all duration-300">
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-200 rounded-full mr-3">
                  <TrendingUp className="h-6 w-6 text-green-700" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-green-700" data-testid="text-today-rises">
                    {todayStats.todayRises}
                  </p>
                  <p className="text-xs sm:text-sm text-green-600 font-medium">Price rises today</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-rose-100 hover:shadow-xl transition-all duration-300">
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-3 bg-red-200 rounded-full mr-3">
                  <TrendingDown className="h-6 w-6 text-red-700" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-red-700" data-testid="text-today-falls">
                    {todayStats.todayFalls}
                  </p>
                  <p className="text-xs sm:text-sm text-red-600 font-medium">Price falls today</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-100 hover:shadow-xl transition-all duration-300">
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-200 rounded-full mr-3">
                  <Calendar className="h-6 w-6 text-blue-700" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-blue-700" data-testid="text-today-changes">
                    {todayStats.todayChanges}
                  </p>
                  <p className="text-xs sm:text-sm text-blue-600 font-medium">Total price changes today</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>



        {/* Search and Filters */}
        <Collapsible open={isRecentFiltersOpen} onOpenChange={setIsRecentFiltersOpen} className="mb-6">
          <Card className="shadow-md border-0">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors py-3 px-4">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                    <CardTitle className="text-sm sm:text-lg">Search &amp; Filters</CardTitle>
                  </div>
                  {isRecentFiltersOpen ? (
                    <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 text-xs sm:text-sm">
                <div className="flex flex-col gap-3 sm:gap-4">
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search players or teams..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-9 h-9 text-xs sm:text-sm"
                          data-testid="input-search-players"
                        />
                      </div>
                    </div>
                    <Select value={positionFilter} onValueChange={setPositionFilter}>
                      <SelectTrigger className="w-full sm:w-48 h-9 text-xs sm:text-sm" data-testid="select-position-filter">
                        <SelectValue placeholder="All Positions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Positions</SelectItem>
                        {getPlayersByPosition().map(pos => (
                          <SelectItem key={pos.id} value={pos.name}>
                            {pos.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={changeTypeFilter} onValueChange={setChangeTypeFilter}>
                      <SelectTrigger className="w-full sm:w-48 h-9 text-xs sm:text-sm" data-testid="select-change-filter">
                        <SelectValue placeholder="All Changes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Changes</SelectItem>
                        <SelectItem value="rises">Price Rises</SelectItem>
                        <SelectItem value="falls">Price Falls</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Refresh Button */}
                  <div className="flex justify-end">
                    <Button
                      onClick={handleRefresh}
                      disabled={refreshMutation.isPending}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2 text-xs sm:text-sm"
                      data-testid="button-refresh-prices"
                    >
                      <RefreshCw className={`h-4 w-4 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
                      {refreshMutation.isPending ? "Refreshing..." : "Refresh from FPL API"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Error Display */}
        {changesError && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Unable to load price data from FPL API. Please check your connection and try again.
            </AlertDescription>
          </Alert>
        )}

        {/* Info message for new databases */}
        {!isLoadingChanges && Array.isArray(priceChanges) && priceChanges.length === 0 && (
          <Alert className="mb-6" data-testid="alert-no-recent-changes">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No 2026/27 price changes recorded yet — this fills in once FPL starts moving player prices for the new season. Click "Refresh from FPL API" to check for the latest data.
            </AlertDescription>
          </Alert>
        )}

        {/* Recent Price Changes */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Price Changes
            </CardTitle>
            <CardDescription>
              2026/27 season price changes ordered by recency and significance
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingChanges ? (
              <div className="space-y-3">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="animate-pulse flex items-center p-3 border rounded">
                    <div className="h-4 w-4 bg-gray-200 rounded mr-3"></div>
                    <div className="flex-1 space-y-1">
                      <div className="h-4 w-32 bg-gray-200 rounded"></div>
                      <div className="h-3 w-20 bg-gray-200 rounded"></div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="h-4 w-16 bg-gray-200 rounded"></div>
                      <div className="h-3 w-12 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredAndSortedChanges.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b bg-muted/20">
                      <th 
                        className="text-left p-2 sm:p-3 font-medium cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => handleSort('change_date')}
                      >
                        <div className="flex items-center gap-1">
                          Date
                          {sortField === 'change_date' && (
                            sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="text-left p-2 sm:p-3 font-medium cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => handleSort('player_name')}
                      >
                        <div className="flex items-center gap-1">
                          Player
                          {sortField === 'player_name' && (
                            sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="hidden sm:table-cell text-left p-3 font-medium cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => handleSort('team_name')}
                      >
                        <div className="flex items-center gap-1">
                          Team
                          {sortField === 'team_name' && (
                            sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="hidden sm:table-cell text-left p-3 font-medium cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => handleSort('position')}
                      >
                        <div className="flex items-center gap-1">
                          Pos
                          {sortField === 'position' && (
                            sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="hidden sm:table-cell text-right p-3 font-medium cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => handleSort('ownership')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          Own%
                          {sortField === 'ownership' && (
                            sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="hidden sm:table-cell text-right p-3 font-medium cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => handleSort('old_price')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          Old
                          {sortField === 'old_price' && (
                            sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="hidden sm:table-cell text-right p-3 font-medium cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => handleSort('price_change')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          Change
                          {sortField === 'price_change' && (
                            sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="text-right p-2 sm:p-3 font-medium cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => handleSort('current_price')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          Price
                          {sortField === 'current_price' && (
                            sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedChanges.map((change: PriceChange, index: number) => {
                      const currentDate = change.change_date;
                      const previousDate = index > 0 ? filteredAndSortedChanges[index - 1].change_date : null;
                      const isNewDateGroup = currentDate !== previousDate;
                      
                      return (
                        <React.Fragment key={`${change.player_id}-${index}`}>
                          {isNewDateGroup && index > 0 && (
                            <tr>
                              <td colSpan={8} className="p-0">
                                <div className="border-t-2 border-gray-200 dark:border-gray-700"></div>
                              </td>
                            </tr>
                          )}
                          <tr 
                            className="border-b hover:bg-muted/50 transition-colors"
                            data-testid={`price-change-${change.player_id}`}
                          >
                            <td className="p-2 sm:p-3">
                              <div className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                                {new Date(change.change_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                              </div>
                            </td>
                            <td className="p-2 sm:p-3">
                              <div className="flex items-center gap-1.5">
                                {change.price_change > 0 ? (
                                  <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 shrink-0" />
                                ) : change.price_change < 0 ? (
                                  <TrendingDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-600 shrink-0" />
                                ) : (
                                  <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 shrink-0" />
                                )}
                                <div>
                                  <p className="font-medium text-xs sm:text-sm leading-tight">{change.player_name}</p>
                                  <p className="text-xs text-muted-foreground sm:hidden leading-tight">{change.team_name} · {change.position}</p>
                                </div>
                              </div>
                            </td>
                            <td className="hidden sm:table-cell p-3">
                              <div className="font-medium">{change.team_name}</div>
                            </td>
                            <td className="hidden sm:table-cell p-3">
                              <div className="text-muted-foreground">{change.position}</div>
                            </td>
                            <td className="hidden sm:table-cell p-3 text-right font-medium">
                              {typeof change.ownership === 'number'
                                ? `${change.ownership.toFixed(1)}%`
                                : `${parseFloat(change.ownership || "0").toFixed(1)}%`}
                            </td>
                            <td className="hidden sm:table-cell p-3 text-right font-medium">
                              {formatPrice(change.old_price)}
                            </td>
                            <td className="hidden sm:table-cell p-3 text-right">
                              <Badge variant={change.price_change > 0 ? "success" : change.price_change < 0 ? "destructive" : "secondary"} className="text-xs sm:text-sm">
                                {change.price_change > 0 ? "+" : change.price_change < 0 ? "-" : ""}{formatPrice(Math.abs(change.price_change))}
                              </Badge>
                            </td>
                            <td className="p-2 sm:p-3 text-right">
                              <div className="font-medium text-xs sm:text-sm">{formatPrice(change.current_price)}</div>
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No price changes found matching your filters</p>
                <p className="text-sm">Try adjusting your search criteria or change type filter</p>
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}