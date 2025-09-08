import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Brain, BarChart3, Target, AlertTriangle, TrendingUp, Star, Clock, DollarSign, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BootstrapData {
  elements: any[];
  teams: any[];
  element_types: any[];
  events: any[];
}

interface OpenFPLProjection {
  player_id: number;
  player_name: string;
  team_name: string;
  position: string;
  gameweek: number;
  horizon: number;
  current_price: number;
  predicted_points: number;
  predicted_minutes: number;
  predicted_goals: number;
  predicted_assists: number;
  predicted_clean_sheets: number;
  predicted_bonus: number;
  cbit_percentage: number;
  ensemble_confidence: number;
  investment_risk: string;
  ownership_percentage: number;
  availability_status: number;
  position_rank?: number;
  form_3gw?: number;
  xg_per_game?: number;
  xa_per_game?: number;
}

export default function OpenFPLProjections() {
  const [searchTerm, setSearchTerm] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");
  const [startGameweek, setStartGameweek] = useState<number>(4); // Default to GW4
  const [endGameweek, setEndGameweek] = useState<number>(9); // Default next 6 GWs (GW4-9)
  const gameweekFilter = "all"; // Always use all available data
  const [teamFilter, setTeamFilter] = useState("all");
  const [activeMetric, setActiveMetric] = useState("predicted_points");
  const [sortBy, setSortBy] = useState<keyof OpenFPLProjection>("predicted_points");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [sortColumn, setSortColumn] = useState<string>("total");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const { data: bootstrapData, isLoading: isLoadingBootstrap } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000,
  });

  // Calculate current gameweek and set proper defaults
  const currentGameweek = bootstrapData?.events?.find(event => event.is_current)?.id || 3;
  const nextGameweek = currentGameweek + 1;
  
  // Update defaults when bootstrap data loads
  useEffect(() => {
    if (bootstrapData && startGameweek === 4 && endGameweek === 9) {
      // Only update if still using initial defaults
      setStartGameweek(Math.max(nextGameweek, 4));
      setEndGameweek(Math.max(nextGameweek, 4) + 5); // Default to 6 gameweeks
    }
  }, [bootstrapData, nextGameweek, startGameweek, endGameweek]);

  // Fetch data for the selected gameweek range
  const numberOfGameweeks = Math.max(1, endGameweek - startGameweek + 1);
  const { data: projections, isLoading: isLoadingProjections, error: projectionsError } = useQuery({
    queryKey: ["/api/openfpl-projections-gameweek-range", startGameweek, endGameweek, gameweekFilter],
    queryFn: async () => {
      const allProjections = [];
      
      // Fetch data for each horizon needed to cover the range
      for (let horizon = 1; horizon <= numberOfGameweeks; horizon++) {
        const params = new URLSearchParams();
        params.append('horizon', horizon.toString());
        params.append('gameweek', gameweekFilter);
        const response = await fetch(`/api/openfpl-projections?${params.toString()}`);
        const data = await response.json();
        allProjections.push(...data);
      }
      
      return allProjections;
    },
    enabled: numberOfGameweeks > 0 && numberOfGameweeks <= 12, // Max 12 gameweeks
    refetchInterval: 300000, // 5 minutes
  });

  const { data: modelMetrics, isLoading: isLoadingMetrics } = useQuery({
    queryKey: ["/api/openfpl-metrics"],
    refetchInterval: 600000, // 10 minutes
  });

  const getPlayersByPosition = () => {
    if (!bootstrapData) return [];
    return bootstrapData.element_types.map(position => ({
      id: position.id,
      name: position.singular_name_short
    }));
  };

  const handleSort = (column: keyof OpenFPLProjection) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDirection("desc");
    }
  };

  const getSortIcon = (column: keyof OpenFPLProjection) => {
    if (sortBy !== column) return <ArrowUpDown className="h-4 w-4" />;
    return sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  const getTableSortIcon = (column: string) => {
    if (sortColumn !== column) return <ArrowUpDown className="h-3 w-3" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  const handleTableSort = (column: string) => {
    if (sortColumn === column) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDir("desc");
    }
  };

  const filteredProjections = Array.isArray(projections) ? projections.filter((projection: OpenFPLProjection) => {
    const matchesSearch = !searchTerm || 
      projection.player_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      projection.team_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPosition = positionFilter === "all" || projection.position === positionFilter;
    
    const matchesTeam = teamFilter === "all" || projection.team_name === teamFilter;
    
    return matchesSearch && matchesPosition && matchesTeam;
  }).sort((a: OpenFPLProjection, b: OpenFPLProjection) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    }
    
    const aStr = String(aValue || '');
    const bStr = String(bValue || '');
    
    if (sortDirection === "asc") {
      return aStr.localeCompare(bStr);
    } else {
      return bStr.localeCompare(aStr);
    }
  }) : [];

  // Calculate unique player counts for display
  const uniqueFilteredPlayers = filteredProjections.reduce((acc, proj) => {
    acc[proj.player_id] = true;
    return acc;
  }, {} as Record<number, boolean>);

  const uniqueTotalPlayers = (Array.isArray(projections) ? projections : []).reduce((acc, proj) => {
    acc[proj.player_id] = true;
    return acc;
  }, {} as Record<number, boolean>);

  const formatPrice = (price: number) => `£${(price / 10).toFixed(1)}m`;
  
  const getAvailabilityColor = (status: number) => {
    if (status === 100) return "bg-green-50 text-green-700 border-green-200";
    if (status >= 75) return "bg-yellow-50 text-yellow-700 border-yellow-200";
    if (status >= 50) return "bg-orange-50 text-orange-700 border-orange-200";
    if (status >= 25) return "bg-red-50 text-red-700 border-red-200";
    return "bg-gray-50 text-gray-700 border-gray-200";
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "text-green-600 bg-green-50 border-green-200";
    if (confidence >= 60) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const getRiskColor = (risk: string) => {
    if (risk === "Low") return "bg-green-50 text-green-700 border-green-200";
    if (risk === "Medium") return "bg-yellow-50 text-yellow-700 border-yellow-200";
    return "bg-red-50 text-red-700 border-red-200";
  };

  const getPositionIcon = (position: string) => {
    switch (position) {
      case "GKP": return "🥅";
      case "DEF": return "🛡️";
      case "MID": return "⚡";
      case "FWD": return "⚽";
      default: return "👤";
    }
  };

  return (
    <>
      <div className="fpl-page-container">
        {/* Unified Page Header */}
        <div className="fpl-page-header">
          <div className="fpl-page-header-content">
            <div className="fpl-page-title">
              <Brain className="h-8 w-8" />
              <h1>OpenFPL Projections</h1>
            </div>
            <p className="fpl-page-subtitle">
              Advanced ML ensemble predictions using XGBoost + Random Forest models for comprehensive player analysis
            </p>
          </div>
        </div>

        <div className="fpl-section-spacing">

          {/* Unified Filters */}
          <div className="fpl-filters">
            <div className="fpl-card-header">
              <div className="fpl-card-title">
                <Search className="h-5 w-5 text-blue-600" />
                Smart Filters & Search
              </div>
            </div>
            <div className="fpl-card-content">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="relative sm:col-span-2 lg:col-span-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search players..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-10 md:h-12 border-2"
                    data-testid="input-search"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:col-span-1">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">Start GW</label>
                    <Select value={startGameweek.toString()} onValueChange={(value) => {
                      const newStart = parseInt(value);
                      setStartGameweek(newStart);
                      if (newStart > endGameweek) {
                        setEndGameweek(Math.min(newStart + 5, Math.min(newStart + 11, 38))); // Default 6 GWs, max 12
                      }
                    }}>
                      <SelectTrigger className="h-10 md:h-12 border-2" data-testid="select-start-gw">
                        <SelectValue placeholder={`GW${startGameweek}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({length: 35}, (_, i) => i + 4).map(gw => (
                          <SelectItem key={gw} value={gw.toString()}>GW{gw}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">End GW</label>
                    <Select value={endGameweek.toString()} onValueChange={(value) => {
                      const newEnd = parseInt(value);
                      if (newEnd >= startGameweek && (newEnd - startGameweek + 1) <= 12) {
                        setEndGameweek(newEnd);
                      }
                    }}>
                      <SelectTrigger className="h-10 md:h-12 border-2" data-testid="select-end-gw">
                        <SelectValue placeholder={`GW${endGameweek}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({length: Math.min(12, 38 - startGameweek + 1)}, (_, i) => startGameweek + i).map(gw => (
                          <SelectItem key={gw} value={gw.toString()}>GW{gw}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">Position</label>
                    <Select value={positionFilter} onValueChange={setPositionFilter}>
                      <SelectTrigger className="h-10 md:h-12 border-2" data-testid="select-position">
                        <SelectValue placeholder="All Positions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Positions</SelectItem>
                        {getPlayersByPosition().map(position => (
                          <SelectItem key={position.id} value={position.name}>
                            {position.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">Team</label>
                    <Select value={teamFilter} onValueChange={setTeamFilter}>
                      <SelectTrigger className="h-10 md:h-12 border-2" data-testid="select-team">
                        <SelectValue placeholder="All Teams" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Teams</SelectItem>
                        {bootstrapData?.teams?.map(team => (
                          <SelectItem key={team.id} value={team.name}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Unified Results Section */}
          <div className="fpl-table-container">
            <div className="fpl-card-header">
              <div className="fpl-card-title">
                <Target className="h-5 w-5 text-blue-600" />
                ML Projections Results
                {numberOfGameweeks > 0 && (
                  <Badge variant="outline" className="fpl-badge-info text-xs px-2 py-1 ml-2">
                    GW{startGameweek}-{endGameweek} ({numberOfGameweeks} GW{numberOfGameweeks !== 1 ? "s" : ""})
                  </Badge>
                )}
              </div>
            </div>
            <div className="fpl-card-content">
              {isLoadingProjections ? (
                <div className="grid gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="fpl-loading-card" />
                  ))}
                </div>
              ) : projectionsError ? (
                <div className="text-center py-16">
                  <div className="fpl-error-container">
                    <AlertTriangle className="h-20 w-20 text-red-500 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-red-700 mb-2">OpenFPL System Offline</h3>
                    <p className="text-red-600 text-lg">Model training in progress or API temporarily unavailable</p>
                    <p className="text-sm text-red-500 mt-2">Please try again in a few minutes</p>
                  </div>
                </div>
              ) : !Array.isArray(projections) || projections.length === 0 ? (
                <div className="text-center py-16">
                  <div className="fpl-empty-state">
                    <Brain className="h-20 w-20 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-gray-600 mb-2">No predictions match your criteria</h3>
                    <p className="text-gray-500 text-lg">Try adjusting your filters or selecting a different gameweek</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Metric Tabs with Gameweek Columns */}
                  <Tabs value={activeMetric} onValueChange={setActiveMetric} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-6">
                      <TabsTrigger value="predicted_points" className="text-xs">Points</TabsTrigger>
                      <TabsTrigger value="predicted_goals" className="text-xs">Goals</TabsTrigger>
                      <TabsTrigger value="predicted_assists" className="text-xs">Assists</TabsTrigger>
                    </TabsList>

                    {['predicted_points', 'predicted_goals', 'predicted_assists'].map((metric) => (
                      <TabsContent key={metric} value={metric} className="mt-0">
                        <div className="w-full table-scroll overflow-y-auto max-h-[70vh] bg-white rounded-xl border border-gray-200">
                          <table className="fpl-table text-xs min-w-[800px] w-full lg:min-w-full xl:min-w-full">
                            <thead className="fpl-table-header">
                              <tr>
                                <th className="px-2 sm:px-3 py-2 sm:py-3 text-left min-w-[120px] sm:min-w-[160px] font-semibold text-gray-900 text-xs sm:text-sm sticky left-0 bg-gray-50 z-10 border-r border-gray-200">
                                  Player
                                </th>
                                <th className="px-1 sm:px-2 py-2 sm:py-3 text-center min-w-[40px] sm:min-w-[50px] font-semibold text-gray-900 text-xs sm:text-sm">Team</th>
                                <th className="px-1 sm:px-2 py-2 sm:py-3 text-center min-w-[35px] sm:min-w-[50px] font-semibold text-gray-900 text-xs sm:text-sm">Pos</th>
                                <th className="px-1 sm:px-2 py-2 sm:py-3 text-center min-w-[50px] sm:min-w-[60px] font-semibold text-gray-900 text-xs sm:text-sm">Price</th>

                                <th className="px-1 sm:px-2 py-2 sm:py-3 text-center min-w-[50px] sm:min-w-[60px] font-semibold text-gray-900 text-xs sm:text-sm">
                                  <button 
                                    onClick={() => handleTableSort("ownership_total")}
                                    className="flex items-center justify-center gap-1 hover:text-blue-600 transition-colors text-xs sm:text-sm"
                                  >
                                    Own% {getTableSortIcon("ownership_total")}
                                  </button>
                                </th>
                                {Array.from({length: numberOfGameweeks}, (_, i) => {
                                  const actualGW = startGameweek + i;
                                  
                                  return (
                                    <th key={i} className="px-1 sm:px-2 py-2 sm:py-3 text-center min-w-[50px] sm:min-w-[70px] font-semibold text-gray-900 text-xs sm:text-sm">
                                      <button 
                                        onClick={() => handleTableSort(`gw${i}`)}
                                        className="flex items-center justify-center gap-1 hover:text-blue-600 transition-colors text-xs sm:text-sm"
                                      >
                                        GW{actualGW} {getTableSortIcon(`gw${i}`)}
                                      </button>
                                    </th>
                                  );
                                })}
                                <th className="px-1 sm:px-2 py-2 sm:py-3 text-center min-w-[50px] sm:min-w-[70px] font-semibold text-blue-900 bg-blue-50 text-xs sm:text-sm">
                                  <button 
                                    onClick={() => handleTableSort("total")}
                                    className="flex items-center justify-center gap-1 hover:text-blue-800 transition-colors text-xs sm:text-sm"
                                  >
                                    Total {getTableSortIcon("total")}
                                  </button>
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                // Group projections by player and horizon
                                const playerGroups = filteredProjections.reduce((acc, proj) => {
                                  if (!acc[proj.player_id]) {
                                    acc[proj.player_id] = {
                                      player: proj,
                                      horizons: {}
                                    };
                                  }
                                  acc[proj.player_id].horizons[proj.horizon] = proj;
                                  return acc;
                                }, {} as Record<number, any>);

                                return Object.values(playerGroups)
                                  .map((group: any) => {
                                    const player = group.player;
                                    const horizonData = group.horizons;
                                    
                                    // Get horizon projections for calculating individual gameweek values
                                    const getHorizonValue = (horizon: number) => {
                                      return horizonData[horizon]?.[metric] || 0;
                                    };

                                    // Calculate individual gameweek values using horizon differences
                                    const gwValues = Array.from({length: numberOfGameweeks}, (_, i) => {
                                      const gwIndex = i + 1;
                                      let value;
                                      
                                      if (gwIndex === 1) {
                                        // GW1 = 1 horizon value
                                        value = Math.abs(getHorizonValue(1));
                                      } else {
                                        // GWn = n horizon - (n-1) horizon, use absolute value to avoid negatives
                                        const difference = getHorizonValue(gwIndex) - getHorizonValue(gwIndex - 1);
                                        value = Math.abs(difference);
                                      }
                                      
                                      return value;
                                    });

                                    // Total is the highest horizon value (cumulative)
                                    const total = getHorizonValue(numberOfGameweeks);

                                    // Calculate minutes and ownership totals for additional columns
                                    const minutesTotal = horizonData[numberOfGameweeks]?.predicted_minutes || 0;
                                    const ownershipTotal = horizonData[numberOfGameweeks]?.ownership_percentage || 0;

                                    return { ...group, total, gwValues, minutesTotal, ownershipTotal };
                                  })
                                  .sort((a: any, b: any) => {
                                    let aValue: number, bValue: number;
                                    
                                    if (sortColumn === "total") {
                                      aValue = a.total;
                                      bValue = b.total;
                                    } else if (sortColumn === "minutes_total") {
                                      aValue = a.minutesTotal;
                                      bValue = b.minutesTotal;
                                    } else if (sortColumn === "ownership_total") {
                                      aValue = a.ownershipTotal;
                                      bValue = b.ownershipTotal;
                                    } else if (sortColumn.startsWith("gw")) {
                                      const gwIndex = parseInt(sortColumn.replace("gw", ""));
                                      aValue = a.gwValues[gwIndex] || 0;
                                      bValue = b.gwValues[gwIndex] || 0;
                                    } else {
                                      aValue = a.total;
                                      bValue = b.total;
                                    }
                                    
                                    return sortDir === "asc" ? aValue - bValue : bValue - aValue;
                                  })
                                  .map((group: any, index) => {
                                    const player = group.player;
                                    const gwData = group.gameweeks;
                                    const total = group.total;

                                  return (
                                    <tr 
                                      key={player.player_id}
                                      className={`border-b border-gray-100 hover:bg-blue-50/30 transition-colors ${
                                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                                      }`}
                                    >
                                      <td className="px-2 sm:px-3 py-2 sm:py-3 text-left sticky left-0 bg-white dark:bg-gray-950 z-10 border-r border-gray-200">
                                        <div className="flex flex-col">
                                          <span className="font-medium text-gray-900 text-xs sm:text-sm">
                                            {player.player_name}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="px-1 sm:px-2 py-2 sm:py-3 text-center">
                                        <span className="text-xs text-gray-600">{player.team_name}</span>
                                      </td>
                                      <td className="px-1 sm:px-2 py-2 sm:py-3 text-center">
                                        <span className={`inline-block w-4 h-4 sm:w-6 sm:h-6 rounded-full text-xs font-bold text-white flex items-center justify-center ${
                                          player.position === 'GKP' ? 'bg-yellow-500' :
                                          player.position === 'DEF' ? 'bg-green-500' :
                                          player.position === 'MID' ? 'bg-blue-500' :
                                          'bg-red-500'
                                        }`}>
                                          {player.position === 'MID' ? 'MID' : player.position.charAt(0)}
                                        </span>
                                      </td>
                                      <td className="px-1 sm:px-2 py-2 sm:py-3 text-center">
                                        <span className="text-xs sm:text-sm font-medium">£{(player.current_price / 10).toFixed(1)}m</span>
                                      </td>
                                      <td className="px-1 sm:px-2 py-2 sm:py-3 text-center">
                                        <span className="text-xs sm:text-sm font-medium text-purple-700">
                                          {group.ownershipTotal.toFixed(1)}%
                                        </span>
                                      </td>
                                      {Array.from({length: numberOfGameweeks}, (_, i) => {
                                        const value = group.gwValues[i] || 0;
                                        
                                        return (
                                          <td key={i} className="px-1 sm:px-2 py-2 sm:py-3 text-center">
                                            <span className={`text-xs sm:text-sm font-medium ${
                                              metric === 'predicted_points' && value >= 6 ? 'text-green-700' :
                                              metric === 'predicted_points' && value >= 4 ? 'text-blue-700' :
                                              metric === 'predicted_minutes' && value >= 75 ? 'text-green-700' :
                                              metric === 'predicted_minutes' && value >= 60 ? 'text-blue-700' :
                                              metric.includes('predicted_goals') && value >= 0.5 ? 'text-green-700' :
                                              metric.includes('predicted_assists') && value >= 0.3 ? 'text-green-700' :
                                              'text-gray-700'
                                            }`}>
                                              {metric === 'predicted_minutes' ? `${Math.round(value)}'` :
                                               value.toFixed(metric.includes('predicted_') && !metric.includes('minutes') ? 2 : 1)}
                                            </span>
                                          </td>
                                        );
                                      })}
                                      <td className="px-1 sm:px-2 py-2 sm:py-3 text-center bg-blue-50">
                                        <span className="text-xs sm:text-sm font-bold text-blue-900">
                                          {metric === 'predicted_minutes' ? `${Math.round(total)}'` :
                                           total.toFixed(metric.includes('predicted_') && !metric.includes('minutes') ? 2 : 1)}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                });
                              })()}
                            </tbody>
                          </table>
                        </div>
                        
                        {/* Table Footer with Average Confidence */}
                        <div className="mt-4 text-center bg-gradient-to-r from-purple-50 to-purple-100 p-3 rounded-lg border border-purple-200">
                          <div className="text-sm text-purple-700">
                            Average Model Confidence: <span className="font-bold">{(filteredProjections.reduce((sum, p) => sum + (p.ensemble_confidence || 0), 0) / filteredProjections.length)?.toFixed(1) || "0.0"}%</span>
                          </div>
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>

                  {/* Results Summary */}
                  <div className="mt-12 text-center bg-gradient-to-r from-gray-50 to-blue-50 p-6 rounded-xl border border-gray-200">
                    <div className="text-lg text-gray-700 font-medium">
                      Showing <span className="font-bold text-blue-600">{Object.keys(uniqueFilteredPlayers).length}</span> unique players from <span className="font-bold">{Object.keys(uniqueTotalPlayers).length}</span> total players
                    </div>

                    <div className="text-sm text-gray-500 mt-2">
                      Updated every hour • Processing all 693 active FPL players
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Responsive Model Performance Metrics - Moved to Bottom */}
          {modelMetrics && (
            <div className="fpl-card border-2 border-blue-200 shadow-lg">
              <div className="fpl-card-header">
                <div className="fpl-card-title">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <span className="hidden sm:inline">Model Performance vs Commercial Benchmarks</span>
                  <span className="sm:hidden">Model Performance</span>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Real-time accuracy metrics compared to leading FPL services
                </p>
              </div>
              <div className="fpl-card-content">
                <div className="grid grid-cols-5 gap-2 md:gap-4">
                  <div className="text-center p-2 md:p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-lg md:text-xl font-bold text-green-600">{(modelMetrics as any).rmse_overall?.toFixed(3)}</div>
                    <div className="text-xs text-green-700 font-medium">Overall RMSE</div>
                  </div>
                  <div className="text-center p-2 md:p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-lg md:text-xl font-bold text-blue-600">{(modelMetrics as any).rmse_haulers?.toFixed(3)}</div>
                    <div className="text-xs text-blue-700 font-medium">Haulers (5+ pts)</div>
                  </div>
                  <div className="text-center p-2 md:p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="text-lg md:text-xl font-bold text-purple-600">{(modelMetrics as any).rmse_tickers?.toFixed(3)}</div>
                    <div className="text-xs text-purple-700 font-medium">Tickers (3-4 pts)</div>
                  </div>
                  <div className="text-center p-2 md:p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="text-lg md:text-xl font-bold text-orange-600">{(modelMetrics as any).rmse_blanks?.toFixed(3)}</div>
                    <div className="text-xs text-orange-700 font-medium">Blanks (≤2 pts)</div>
                  </div>
                  <div className="text-center p-2 md:p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                    <div className="text-lg md:text-xl font-bold text-indigo-600">{((modelMetrics as any).accuracy_rate * 100)?.toFixed(1)}%</div>
                    <div className="text-xs text-indigo-700 font-medium">Accuracy Rate</div>
                  </div>
                </div>
                <div className="mt-4 md:mt-6 text-center text-xs md:text-sm text-gray-600 bg-gray-50 p-2 md:p-3 rounded-lg">
                  Last updated: {(modelMetrics as any).last_updated} • Models retrained weekly with latest data • Lower RMSE = Better accuracy
                </div>
                
                {/* OpenFPL Credit */}
                <div className="mt-4 text-center text-xs text-gray-500 bg-blue-50 p-3 rounded-lg border border-blue-200">
                  Projections powered by <strong>OpenFPL</strong> research • Position-specific ensemble models trained on 4 seasons of FPL + Understat data
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}