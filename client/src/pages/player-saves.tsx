import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shield, Search, ArrowUpDown, Users } from "lucide-react";
import { getDefaultGameweekRange, getNextGameweeksForDropdown } from "@shared/gameweek-utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlayerNameCell } from "@/components/enhanced-table";

interface BootstrapData {
  elements: any[];
  teams: any[];
  events: any[];
}

interface SavesProjection {
  playerId: number;
  playerName: string;
  teamName: string;
  position: string;
  saves: { [key: string]: number };
  pointsFromSaves: { [key: string]: number };
  totalSaves: number;
  totalPoints: number;
  averagePerGameweek: number;
}

type SortField = 'name' | 'team' | 'totalSaves' | string;
type SortDirection = 'asc' | 'desc';

export default function PlayerSaves() {
  const [searchTerm, setSearchTerm] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("totalSaves");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [startGameweek, setStartGameweek] = useState<number>(0);
  const [endGameweek, setEndGameweek] = useState<number>(0);
  const [initialized, setInitialized] = useState(false);

  const { data: bootstrapData, isLoading: isLoadingBootstrap } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000,
  });

  // Get available gameweeks for dropdown (next 12 gameweeks)
  const availableGameweeks = useMemo(() => {
    if (!bootstrapData?.events) {
      return [];
    }
    return getNextGameweeksForDropdown(bootstrapData.events, 12); // Show 12 gameweeks in dropdown
  }, [bootstrapData?.events]);

  // Initialize gameweek range once bootstrap data is loaded
  useEffect(() => {
    if (!bootstrapData || initialized) return;
    
    const range = getDefaultGameweekRange(bootstrapData.events, 6); // Default to 6 gameweeks
    const start = parseInt(range.startGameweek);
    const end = parseInt(range.endGameweek);
    
    console.log('🔍 Player Saves Initialization:', { range, start, end, valid: start > 0 && end > 0 && start <= end && end <= 38 });
    
    // Validate range
    if (start > 0 && end > 0 && start <= end && end <= 38) {
      setStartGameweek(start);
      setEndGameweek(end);
      setInitialized(true);
      console.log('✅ Player Saves Initialized:', { startGameweek: start, endGameweek: end });
    } else {
      console.error('❌ Invalid gameweek range:', { start, end });
    }
  }, [bootstrapData, initialized]);

  // API call for saves projections with dynamic gameweek range
  const { data: savesProjections, isLoading: isLoadingProjections } = useQuery({
    queryKey: ["/api/player-saves-projections", startGameweek, endGameweek],
    queryFn: () => fetch(`/api/player-saves-projections?startGameweek=${startGameweek}&endGameweek=${endGameweek}`).then(res => res.json()),
    enabled: initialized && startGameweek > 0 && endGameweek > 0,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Create playerIdToWebName mapping for short names
  const playerIdToWebName = useMemo(() => {
    if (!bootstrapData?.elements) return null;
    const map = new Map<number, string>();
    bootstrapData.elements.forEach(player => {
      map.set(player.id, player.web_name);
    });
    return map;
  }, [bootstrapData]);

  const teams = useMemo(() => {
    if (!savesProjections || !Array.isArray(savesProjections)) return [];
    const uniqueTeams = Array.from(new Set(savesProjections.map((p: SavesProjection) => p.teamName)));
    return uniqueTeams.sort();
  }, [savesProjections]);

  // Generate dynamic gameweek columns based on selected range
  const dynamicGameweekColumns = useMemo(() => {
    const columns = [];
    for (let gw = startGameweek; gw <= endGameweek; gw++) {
      columns.push(gw);
    }
    return columns;
  }, [startGameweek, endGameweek]);

  // Calculate dynamic totals based on selected gameweek range
  const getFilteredTotal = (player: SavesProjection) => {
    let total = 0;
    for (let gw = startGameweek; gw <= endGameweek; gw++) {
      total += player.saves?.[`gw${gw}`] || 0;
    }
    return total;
  };

  const filteredAndSortedData = useMemo(() => {
    if (!savesProjections || !Array.isArray(savesProjections)) return [];
    
    let filtered = savesProjections.filter((projection: SavesProjection) => {
      const matchesSearch = !searchTerm || 
        projection.playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        projection.teamName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesTeam = teamFilter === "all" || projection.teamName === teamFilter;
      
      return matchesSearch && matchesTeam;
    });

    // Sort data
    filtered.sort((a: SavesProjection, b: SavesProjection) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'name':
          aValue = a.playerName;
          bValue = b.playerName;
          break;
        case 'team':
          aValue = a.teamName;
          bValue = b.teamName;
          break;
        case 'totalSaves':
          aValue = getFilteredTotal(a);
          bValue = getFilteredTotal(b);
          break;
        default:
          // Handle dynamic gameweek fields (like 'gw4', 'gw5', etc.)
          if (sortField.startsWith('gw')) {
            const gwNumber = sortField.replace('gw', '');
            aValue = a.saves?.[`gw${gwNumber}`] || 0;
            bValue = b.saves?.[`gw${gwNumber}`] || 0;
          } else {
            aValue = getFilteredTotal(a);
            bValue = getFilteredTotal(b);
          }
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return filtered;
  }, [savesProjections, searchTerm, teamFilter, sortField, sortDirection, startGameweek, endGameweek]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    return sortDirection === 'asc' ? 
      <ArrowUpDown className="h-4 w-4 text-blue-600 rotate-180" /> : 
      <ArrowUpDown className="h-4 w-4 text-blue-600" />;
  };

  // Show loading state while data is loading OR while initializing gameweeks
  if (isLoadingBootstrap || isLoadingProjections || !initialized) {
    return (
      <div className="fpl-page-container">
        <div className="fpl-page-header">
          <div className="fpl-page-header-content">
            <div className="fpl-page-title">
              <Shield className="h-8 w-8" />
              <h1>Goalkeeper Saves Projections</h1>
            </div>
            <p className="fpl-page-subtitle">
              Goalkeeper save predictions and FPL points analysis for upcoming gameweeks
            </p>
          </div>
        </div>
        <div className="grid gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="fpl-loading-card" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="fpl-page-container">
      {/* Page Header */}
      <div className="fpl-page-header">
        <div className="fpl-page-header-content">
          <div className="fpl-page-title">
            <Shield className="h-8 w-8" />
            <h1>Goalkeeper Saves Projections</h1>
          </div>
          <p className="fpl-page-subtitle">
            Goalkeeper save predictions and FPL points analysis for upcoming gameweeks
          </p>
        </div>
      </div>

      <div className="fpl-section-spacing">
        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">From GW</label>
                <Select value={String(startGameweek)} onValueChange={(value) => setStartGameweek(parseInt(value))}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableGameweeks.map(gw => (
                      <SelectItem key={gw} value={gw.toString()}>GW{gw}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">To GW</label>
                <Select value={String(endGameweek)} onValueChange={(value) => setEndGameweek(parseInt(value))}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableGameweeks.filter(gw => gw >= startGameweek).map(gw => (
                      <SelectItem key={gw} value={gw.toString()}>GW{gw}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Team</label>
                <Select value={teamFilter} onValueChange={setTeamFilter}>
                  <SelectTrigger className="w-full" data-testid="select-team">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Teams</SelectItem>
                    {teams.map((team, index) => (
                      <SelectItem key={`team-${team}-${index}`} value={team}>
                        {team}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Search className="h-4 w-4 text-gray-500" />
                  Search
                </label>
                <Input
                  placeholder="Search goalkeepers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                  data-testid="input-search"
                />
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600 justify-center sm:justify-end">
                <Users className="h-4 w-4" />
                <span>{filteredAndSortedData.length} goalkeepers</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {filteredAndSortedData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                Expected Saves: GW{startGameweek}-GW{endGameweek}
              </CardTitle>
              <CardDescription>
                Projected number of saves for each goalkeeper based on opponent strength and team defensive quality
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="min-w-full inline-block align-middle">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 min-w-[140px] sm:min-w-[180px] border-r border-gray-100">
                          <Button variant="ghost" size="sm" onClick={() => handleSort('name')} className="h-auto p-0 font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700">
                            Player {getSortIcon('name')}
                          </Button>
                        </th>
                        {dynamicGameweekColumns.map((gw) => (
                          <th key={`saves-header-gw${gw}`} className="px-2 sm:px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[60px]">
                            <Button variant="ghost" size="sm" onClick={() => handleSort(`gw${gw}`)} className="h-auto p-0 font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700">
                              GW{gw} {getSortIcon(`gw${gw}`)}
                            </Button>
                          </th>
                        ))}
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-l border-gray-200 bg-blue-50">
                          <Button variant="ghost" size="sm" onClick={() => handleSort('totalSaves')} className="h-auto p-0 font-medium text-gray-500 hover:bg-blue-100 hover:text-gray-700">
                            Total Saves {getSortIcon('totalSaves')}
                          </Button>
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-green-50">
                          Avg/GW
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAndSortedData.map((projection: SavesProjection, index) => {
                        const filteredTotal = getFilteredTotal(projection);
                        const filteredAverage = filteredTotal / dynamicGameweekColumns.length;
                        return (
                        <tr key={projection.playerId} className={`border-b border-gray-100 hover:bg-blue-50/50 ${index < 10 ? 'bg-blue-50/30' : ''}`}>
                          <td className="py-2 sm:py-3 px-2 sm:px-4 sticky left-0 bg-white border-r border-gray-100">
                            <PlayerNameCell 
                              name={(playerIdToWebName && playerIdToWebName.get(projection.playerId)) || projection.playerName}
                              position={projection.position}
                              team={projection.teamName}
                              compact={true}
                            />
                          </td>
                          {dynamicGameweekColumns.map((gw) => (
                            <td key={`saves-cell-${projection.playerId}-gw${gw}`} className="text-center py-2 sm:py-3 px-2 text-sm">
                              {projection.saves?.[`gw${gw}`] ? (projection.saves[`gw${gw}`]).toFixed(2) : '-'}
                            </td>
                          ))}
                          <td className="text-center py-3 px-1 font-semibold bg-blue-50">
                            <span className="text-lg font-bold text-blue-900">
                              {filteredTotal.toFixed(2)}
                            </span>
                          </td>
                          <td className="text-center py-3 px-1 bg-green-50">
                            <span className="text-sm font-medium text-green-900">
                              {filteredAverage.toFixed(2)}
                            </span>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Results */}
        {filteredAndSortedData.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No goalkeepers found</h3>
              <p className="text-gray-600">Try adjusting your filters to see more results.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}