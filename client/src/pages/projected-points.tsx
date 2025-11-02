import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Target, Search, TrendingUp, Crown, Users, AlertTriangle, Heart, XCircle, Clock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Player Availability Badge Component
function PlayerAvailabilityBadge({ player }: { player: any }) {
  const chanceOfPlaying = player.chanceOfPlayingNextRound ?? 100;
  const status = player.status || 'a';
  const news = player.news || '';

  if (chanceOfPlaying >= 100 && status === 'a') {
    return null;
  }

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
        <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-semibold cursor-help transition-colors hover:opacity-80 ${statusBg} ${statusBorder} border shadow-sm`}>
          <StatusIcon className={`h-3 w-3 ${statusColor}`} />
          <span className={statusColor}>{chanceOfPlaying}%</span>
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
  status: string;
  news: string;
  chance_of_playing_next_round?: number;
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

export default function ProjectedPoints() {
  const [managerId, setManagerId] = useState("");
  const [searchedId, setSearchedId] = useState("");
  const [selectedGameweek, setSelectedGameweek] = useState<number | null>(null);
  const [plannerMode, setPlannerMode] = useState<"auto" | "manual">("manual");
  const [optimizedLineup, setOptimizedLineup] = useState<OptimizedLineup | null>(null);
  const [manualLineup, setManualLineup] = useState<TeamPick[]>([]);
  
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

  const { data: bootstrapData } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
  });

  const { data: teamData, isLoading: isLoadingTeam } = useQuery<TeamData>({
    queryKey: ["/api/manager", searchedId, "team"],
    enabled: !!searchedId,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Fetch projections for next 6 gameweeks
  const { data: playerProjections6GW, isLoading: isLoadingProjections } = useQuery<any[]>({
    queryKey: ["/api/player-total-points"],
    staleTime: 10 * 60 * 1000,
  });

  // Initialize manual lineup when team data loads
  useEffect(() => {
    if (teamData?.picks && manualLineup.length === 0) {
      setManualLineup([...teamData.picks]);
    }
  }, [teamData]);

  // Set initial selected gameweek
  useEffect(() => {
    if (!selectedGameweek && bootstrapData) {
      const nextGWs = getNextGameweeks();
      if (nextGWs.length > 0) {
        setSelectedGameweek(nextGWs[0].id);
      }
    }
  }, [bootstrapData, selectedGameweek]);

  // Auto-optimize mutation
  const optimizeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedGameweek || !manualLineup.length) {
        throw new Error("No lineup or gameweek selected");
      }

      const response = await fetch("/api/optimize-lineup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          picks: manualLineup,
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
    
    const nextEvent = bootstrapData.events.find(e => !e.finished && !e.is_current);
    let startGW = nextEvent?.id || 1;
    
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
    for (let i = 0; i < 6; i++) {
      const gwNumber = startGW + i;
      const gw = bootstrapData.events.find(e => e.id === gwNumber);
      if (gw && gwNumber <= 38) {
        nextGameweeks.push(gw);
      }
    }
    
    return nextGameweeks;
  };

  // Get player by ID
  const getPlayerById = (id: number) => {
    return bootstrapData?.elements.find(p => p.id === id);
  };

  // Get team name
  const getTeamName = (player: Player) => {
    const team = bootstrapData?.teams.find(t => t.id === player.team);
    return team?.short_name || '';
  };

  // Get position name
  const getPositionName = (player: Player) => {
    const position = bootstrapData?.element_types.find(t => t.id === player.element_type);
    const positionMap: { [key: string]: string } = {
      'Goalkeeper': 'GKP',
      'Defender': 'DEF',
      'Midfielder': 'MID',
      'Forward': 'FWD'
    };
    return positionMap[position?.singular_name || ''] || position?.singular_name || '';
  };

  // Get player projected points
  const getPlayerProjectedPoints = (playerId: number, gameweek: number): number => {
    const playerData = playerProjections6GW?.find((p: any) => p.playerId === playerId);
    return playerData?.gameweekProjections?.[gameweek.toString()] || 0;
  };

  // Handle search
  const handleSearch = () => {
    if (!managerId.trim()) {
      toast({
        title: "Manager ID Required",
        description: "Please enter a valid FPL Manager ID",
        variant: "destructive"
      });
      return;
    }
    setSearchedId(managerId);
    saveManagerIdToCache(managerId);
  };

  // Trigger auto-optimization when switching to auto mode
  useEffect(() => {
    if (plannerMode === "auto" && selectedGameweek && manualLineup.length > 0) {
      optimizeMutation.mutate();
    }
  }, [plannerMode, selectedGameweek]);

  // Calculate total projected points for current lineup
  const calculateTotalProjectedPoints = (): number => {
    if (!selectedGameweek) return 0;
    
    let total = 0;
    
    if (plannerMode === "manual") {
      const starting11 = manualLineup.filter(p => p.position <= 11);
      starting11.forEach(pick => {
        const points = getPlayerProjectedPoints(pick.element, selectedGameweek);
        const multiplier = pick.is_captain ? 2 : (pick.is_vice_captain ? 1 : 1);
        total += points * multiplier;
      });
    } else {
      optimizedLineup?.starting11.forEach(pick => {
        const points = pick.projectedPoints;
        const multiplier = pick.isCaptain ? 2 : 1;
        total += points * multiplier;
      });
    }
    
    return total;
  };

  // Render player row for list view
  const renderPlayerRow = (pick: any, idx: number) => {
    const player = getPlayerById(pick.element || pick.element);
    if (!player) return null;

    const position = getPositionName(player);
    const teamName = getTeamName(player);
    const nextGWs = getNextGameweeks();
    
    // Get projected points for next 6 gameweeks
    const projections = nextGWs.map(gw => ({
      gw: gw.id,
      points: getPlayerProjectedPoints(player.id, gw.id)
    }));

    const isStarting = plannerMode === "manual" ? pick.position <= 11 : !pick.benchPosition;
    const isCaptain = plannerMode === "manual" ? pick.is_captain : pick.isCaptain;
    const isViceCaptain = plannerMode === "manual" ? pick.is_vice_captain : pick.isViceCaptain;

    return (
      <TableRow key={idx} className={!isStarting ? "bg-gray-50" : ""}>
        <TableCell className="font-medium">
          <div className="flex items-center gap-2">
            <div>
              <div className="font-semibold text-gray-900">{player.web_name}</div>
              <div className="flex items-center gap-1.5 mt-1">
                <Badge className={`text-xs px-1 py-0 h-4 ${
                  position === 'GKP' ? 'bg-yellow-100 text-yellow-800' :
                  position === 'DEF' ? 'bg-green-100 text-green-800' :
                  position === 'MID' ? 'bg-blue-100 text-blue-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {position}
                </Badge>
                <Badge variant="outline" className="text-xs px-1 py-0 h-4 text-gray-600">
                  {teamName}
                </Badge>
                {!isStarting && (
                  <Badge variant="outline" className="text-xs px-1 py-0 h-4 text-orange-600 border-orange-300">
                    Bench
                  </Badge>
                )}
              </div>
            </div>
            {isCaptain && (
              <Badge className="bg-yellow-500 text-white text-xs px-1.5 py-0.5 h-5 flex items-center gap-1">
                <Crown className="h-3 w-3" />C
              </Badge>
            )}
            {isViceCaptain && (
              <Badge variant="outline" className="text-xs px-1.5 py-0.5 h-5 border-yellow-500 text-yellow-600 flex items-center gap-1">
                <Crown className="h-3 w-3" />V
              </Badge>
            )}
            <PlayerAvailabilityBadge player={player} />
          </div>
        </TableCell>
        <TableCell className="text-center font-medium text-gray-900">
          £{(player.now_cost / 10).toFixed(1)}m
        </TableCell>
        {projections.map(proj => (
          <TableCell key={proj.gw} className="text-center">
            <span className={`font-medium ${
              proj.gw === selectedGameweek ? 'text-purple-600 font-bold' : 'text-gray-700'
            }`}>
              {proj.points.toFixed(1)}
            </span>
          </TableCell>
        ))}
        <TableCell className="text-center">
          <span className="font-bold text-purple-600">
            {projections.reduce((sum, p) => sum + p.points, 0).toFixed(1)}
          </span>
        </TableCell>
      </TableRow>
    );
  };

  if (!searchedId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50/30 p-4">
        <div className="max-w-2xl mx-auto pt-12">
          <Card>
            <CardHeader className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4 mx-auto">
                <Target className="h-8 w-8 text-purple-600" />
              </div>
              <CardTitle className="text-2xl">My Team Projected Points</CardTitle>
              <CardDescription>View projected points for your current FPL team</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="manager-id" className="block text-sm font-medium text-gray-700 mb-2">
                  Manager ID
                </label>
                <div className="flex gap-3">
                  <Input
                    id="manager-id"
                    type="text"
                    placeholder="Enter your FPL Manager ID"
                    value={managerId}
                    onChange={(e) => setManagerId(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    data-testid="input-manager-id"
                  />
                  <Button
                    onClick={handleSearch}
                    className="flex items-center gap-2"
                    data-testid="button-search-manager"
                  >
                    <Search className="h-4 w-4" />
                    Search
                  </Button>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                <p className="font-medium">To find your Manager ID:</p>
                <ol className="list-decimal list-inside space-y-1 mt-2 ml-2">
                  <li>Visit fantasy.premierleague.com and sign in</li>
                  <li>Click on the Points tab</li>
                  <li>Check the URL - your Manager ID is the number after "entry"</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isLoadingTeam || isLoadingProjections) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50/30 p-4">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!teamData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50/30 p-4">
        <div className="max-w-2xl mx-auto pt-12">
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load team data. Please check the Manager ID and try again.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const nextGameweeks = getNextGameweeks();
  const totalPoints = calculateTotalProjectedPoints();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50/30 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
            <Target className="h-8 w-8 text-purple-600" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">My Team Projected Points</h1>
          <p className="text-lg text-gray-600">View your current team's projected performance</p>
        </div>

        {/* Controls */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Manager ID</label>
                <Input
                  type="text"
                  value={managerId}
                  onChange={(e) => setManagerId(e.target.value)}
                  placeholder="Enter Manager ID"
                />
              </div>
              <Button onClick={handleSearch}>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Mode Toggle */}
        <Card>
          <CardHeader>
            <CardTitle>Lineup Mode</CardTitle>
            <CardDescription>Choose between your manual lineup or auto-optimized lineup</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={plannerMode} onValueChange={(v) => setPlannerMode(v as "auto" | "manual")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manual">Manual Lineup</TabsTrigger>
                <TabsTrigger value="auto">Auto Optimized</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        {/* Summary Card */}
        {selectedGameweek && (
          <Card className="bg-gradient-to-r from-purple-500 to-blue-500 text-white">
            <CardHeader>
              <CardTitle className="text-white">GW{selectedGameweek} Projected Points</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-bold">{totalPoints.toFixed(1)}</div>
              <div className="text-purple-100 mt-2">
                {plannerMode === "manual" ? "Manual Lineup" : "Auto-Optimized Lineup"}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Current Team */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Current Team ({plannerMode === "manual" ? "Manual" : "Auto-Optimized"})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead className="text-center">Price</TableHead>
                    {nextGameweeks.map(gw => (
                      <TableHead key={gw.id} className="text-center">
                        GW{gw.id}
                      </TableHead>
                    ))}
                    <TableHead className="text-center">Total (6GW)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plannerMode === "manual" 
                    ? manualLineup
                        .sort((a, b) => a.position - b.position)
                        .map((pick, idx) => renderPlayerRow(pick, idx))
                    : optimizedLineup
                      ? [...optimizedLineup.starting11, ...optimizedLineup.bench]
                          .map((pick, idx) => renderPlayerRow(pick, idx))
                      : null
                  }
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Projected Points by Gameweek */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Projected Points by Gameweek
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {nextGameweeks.map(gw => {
                // Calculate total for this gameweek
                let gwTotal = 0;
                const lineup = plannerMode === "manual" ? manualLineup : (optimizedLineup?.starting11 || []);
                
                if (plannerMode === "manual") {
                  const starting11 = lineup.filter((p: any) => p.position <= 11);
                  starting11.forEach((pick: any) => {
                    const points = getPlayerProjectedPoints(pick.element, gw.id);
                    const multiplier = pick.is_captain ? 2 : 1;
                    gwTotal += points * multiplier;
                  });
                } else {
                  optimizedLineup?.starting11.forEach(pick => {
                    // Recalculate for this GW
                    const points = getPlayerProjectedPoints(pick.element, gw.id);
                    gwTotal += points;
                  });
                }

                return (
                  <Card 
                    key={gw.id} 
                    className={`cursor-pointer transition-all ${
                      selectedGameweek === gw.id 
                        ? 'ring-2 ring-purple-500 bg-purple-50' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedGameweek(gw.id)}
                  >
                    <CardContent className="p-4 text-center">
                      <div className="text-sm font-medium text-gray-600 mb-2">GW{gw.id}</div>
                      <div className="text-2xl font-bold text-purple-600">{gwTotal.toFixed(1)}</div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
