import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowUp, ArrowDown, ArrowUpDown, Search, Brain, Target } from "lucide-react";

interface BootstrapData {
  elements: any[];
  teams: any[];
  element_types: any[];
  events: any[];
}

interface MyProjection {
  player_id: number;
  player_name: string;
  team_name: string;
  position: string;
  current_price: number;
  predicted_points: number;
  predicted_goals: number;
  predicted_assists: number;
  predicted_minutes: number;
  ownership_percentage: number;
  form_score: number;
  fixture_difficulty: number;
  confidence_score: number;
}

export default function MyPlayerProjections() {
  const [searchTerm, setSearchTerm] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");
  const [horizonFilter, setHorizonFilter] = useState("6");
  const [minOwnership, setMinOwnership] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [activeMetric, setActiveMetric] = useState("predicted_points");
  const [sortColumn, setSortColumn] = useState<string>("total");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const { data: bootstrapData, isLoading: isLoadingBootstrap } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000,
  });

  // Fetch our custom projections
  const { data: projections, isLoading: isLoadingProjections } = useQuery<MyProjection[]>({
    queryKey: ["/api/my-projections", horizonFilter],
    queryFn: async () => {
      const response = await fetch(`/api/my-projections?horizon=${horizonFilter}`);
      return response.json();
    },
    refetchInterval: 300000, // 5 minutes
  });

  const getPlayersByPosition = () => {
    if (!bootstrapData) return [];
    return bootstrapData.element_types.map(position => ({
      id: position.id,
      name: position.singular_name_short
    }));
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

  const filteredProjections = Array.isArray(projections) ? projections.filter((projection: MyProjection) => {
    const matchesSearch = !searchTerm || 
      projection.player_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      projection.team_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPosition = positionFilter === "all" || projection.position === positionFilter;
    
    const matchesOwnership = !minOwnership || projection.ownership_percentage >= parseFloat(minOwnership);
    
    const matchesPrice = !maxPrice || projection.current_price <= parseFloat(maxPrice) * 10;
    
    return matchesSearch && matchesPosition && matchesOwnership && matchesPrice;
  }) : [];

  if (isLoadingBootstrap || isLoadingProjections) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-gray-700 mb-2">Loading My Player Projections</h2>
            <p className="text-gray-500">Calculating custom predictions based on historical data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800">
            My Player Projections
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
            Custom machine learning predictions based on historical performance data and current season form
          </p>
        </div>

        {/* Filters */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-green-50 p-4 md:p-6">
            <CardTitle className="text-lg md:text-xl">🔍 Smart Filters & Search</CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
              <div className="relative sm:col-span-2 md:col-span-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search players..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 md:h-12 border-2"
                  data-testid="input-search"
                />
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
                <label className="text-xs font-medium text-gray-600">Horizon</label>
                <Select value={horizonFilter} onValueChange={setHorizonFilter}>
                  <SelectTrigger className="h-10 md:h-12 border-2" data-testid="select-horizon">
                    <SelectValue placeholder="6 GWs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 GW</SelectItem>
                    <SelectItem value="2">2 GWs</SelectItem>
                    <SelectItem value="3">3 GWs</SelectItem>
                    <SelectItem value="4">4 GWs</SelectItem>
                    <SelectItem value="5">5 GWs</SelectItem>
                    <SelectItem value="6">6 GWs</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Min Ownership</label>
                <Input
                  placeholder="Min own %"
                  value={minOwnership}
                  onChange={(e) => setMinOwnership(e.target.value)}
                  type="number"
                  min="0"
                  max="100"
                  className="h-10 md:h-12 border-2"
                  data-testid="input-ownership"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Max Price</label>
                <Input
                  placeholder="Max £X.Xm"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  type="number"
                  step="0.1"
                  min="3.9"
                  max="15.0"
                  className="h-10 md:h-12 border-2"
                  data-testid="input-price"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 p-4 md:p-6">
            <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-lg md:text-xl lg:text-2xl">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
                <span>My Player Projections</span>
              </div>
              <div className="text-sm text-gray-500">
                Based on historical performance analysis
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            {!filteredProjections.length ? (
              <div className="text-center py-16">
                <div className="bg-gray-50 p-8 rounded-2xl border-2 border-gray-200 shadow-lg">
                  <Brain className="h-20 w-20 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-gray-600 mb-2">No predictions match your criteria</h3>
                  <p className="text-gray-500 text-lg">Try adjusting your filters or selecting a different gameweek</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Metric Tabs */}
                <Tabs value={activeMetric} onValueChange={setActiveMetric} className="w-full">
                  <TabsList className="grid w-full grid-cols-3 mb-6">
                    <TabsTrigger value="predicted_points" className="text-xs">Pts</TabsTrigger>
                    <TabsTrigger value="predicted_goals" className="text-xs">Goals</TabsTrigger>
                    <TabsTrigger value="predicted_assists" className="text-xs">Assists</TabsTrigger>
                  </TabsList>

                  {['predicted_points', 'predicted_goals', 'predicted_assists'].map((metric) => (
                    <TabsContent key={metric} value={metric} className="mt-0">
                      <div className="w-full overflow-x-auto overflow-y-auto max-h-[70vh] bg-white rounded-xl border-2 border-gray-200 shadow-lg">
                        <table className="text-xs min-w-[800px] w-full">
                          <thead className="sticky top-0 z-10">
                            <tr className="bg-gradient-to-r from-gray-50 to-blue-50 border-b-2 border-gray-200">
                              <th className="px-3 py-3 text-left min-w-[160px] font-semibold text-gray-900">Player</th>
                              <th className="px-2 py-3 text-center min-w-[50px] font-semibold text-gray-900">Team</th>
                              <th className="px-2 py-3 text-center min-w-[50px] font-semibold text-gray-900">Pos</th>
                              <th className="px-2 py-3 text-center min-w-[60px] font-semibold text-gray-900">Price</th>
                              <th className="px-2 py-3 text-center min-w-[60px] font-semibold text-gray-900">
                                <button 
                                  onClick={() => handleTableSort("ownership_total")}
                                  className="flex items-center justify-center gap-1 hover:text-blue-600 transition-colors"
                                >
                                  Own% {getTableSortIcon("ownership_total")}
                                </button>
                              </th>
                              {Array.from({length: parseInt(horizonFilter)}, (_, i) => {
                                const currentGW = bootstrapData?.events?.find(event => event.is_current)?.id || 2;
                                const actualGW = currentGW + i + 1;
                                
                                return (
                                  <th key={i} className="px-2 py-3 text-center min-w-[70px] font-semibold text-gray-900">
                                    <button 
                                      onClick={() => handleTableSort(`gw${i}`)}
                                      className="flex items-center justify-center gap-1 hover:text-blue-600 transition-colors"
                                    >
                                      GW{actualGW} {getTableSortIcon(`gw${i}`)}
                                    </button>
                                  </th>
                                );
                              })}
                              <th className="px-2 py-3 text-center min-w-[70px] font-semibold text-blue-900 bg-blue-50">
                                <button 
                                  onClick={() => handleTableSort("total")}
                                  className="flex items-center justify-center gap-1 hover:text-blue-800 transition-colors"
                                >
                                  Total {getTableSortIcon("total")}
                                </button>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredProjections
                              .sort((a: any, b: any) => {
                                let aValue: number, bValue: number;
                                
                                if (sortColumn === "total") {
                                  aValue = a[metric] || 0;
                                  bValue = b[metric] || 0;
                                } else if (sortColumn === "ownership_total") {
                                  aValue = a.ownership_percentage;
                                  bValue = b.ownership_percentage;
                                } else {
                                  aValue = a[metric] || 0;
                                  bValue = b[metric] || 0;
                                }
                                
                                return sortDir === "asc" ? aValue - bValue : bValue - aValue;
                              })
                              .map((projection: MyProjection, index) => (
                                <tr 
                                  key={projection.player_id}
                                  className={`border-b border-gray-100 hover:bg-blue-50/30 transition-colors ${
                                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                                  }`}
                                >
                                  <td className="px-3 py-3 text-left">
                                    <div className="flex flex-col">
                                      <span className="font-medium text-gray-900 text-sm">
                                        {projection.player_name}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-2 py-3 text-center">
                                    <span className="text-xs text-gray-600">{projection.team_name}</span>
                                  </td>
                                  <td className="px-2 py-3 text-center">
                                    <span className={`inline-block w-6 h-6 rounded-full text-xs font-bold text-white flex items-center justify-center ${
                                      projection.position === 'GKP' ? 'bg-yellow-500' :
                                      projection.position === 'DEF' ? 'bg-green-500' :
                                      projection.position === 'MID' ? 'bg-blue-500' :
                                      'bg-red-500'
                                    }`}>
                                      {projection.position.charAt(0)}
                                    </span>
                                  </td>
                                  <td className="px-2 py-3 text-center">
                                    <span className="text-sm font-medium">£{(projection.current_price / 10).toFixed(1)}m</span>
                                  </td>
                                  <td className="px-2 py-3 text-center">
                                    <span className="text-sm font-medium text-purple-700">
                                      {projection.ownership_percentage.toFixed(1)}%
                                    </span>
                                  </td>
                                  {Array.from({length: parseInt(horizonFilter)}, (_, i) => {
                                    // Calculate individual gameweek values (simplified for now)
                                    const value = (projection[metric] as number) / parseInt(horizonFilter);
                                    
                                    return (
                                      <td key={i} className="px-2 py-3 text-center">
                                        <span className={`text-sm font-medium ${
                                          metric === 'predicted_points' && value >= 6 ? 'text-green-700' :
                                          metric === 'predicted_points' && value >= 4 ? 'text-blue-700' :
                                          metric.includes('predicted_goals') && value >= 0.5 ? 'text-green-700' :
                                          metric.includes('predicted_assists') && value >= 0.3 ? 'text-green-700' :
                                          'text-gray-700'
                                        }`}>
                                          {value.toFixed(2)}
                                        </span>
                                      </td>
                                    );
                                  })}
                                  <td className="px-2 py-3 text-center bg-blue-50">
                                    <span className="text-sm font-bold text-blue-900">
                                      {(projection[metric] as number).toFixed(2)}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                      
                      {/* Table Footer with Average Confidence */}
                      <div className="mt-4 text-center bg-gradient-to-r from-purple-50 to-purple-100 p-3 rounded-lg border border-purple-200">
                        <div className="text-sm text-purple-700">
                          Average Model Confidence: <span className="font-bold">
                            {(filteredProjections.reduce((sum, p) => sum + p.confidence_score, 0) / filteredProjections.length)?.toFixed(1) || "0.0"}%
                          </span>
                        </div>
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}