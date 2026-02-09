import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Calendar, Clock, Trophy, Target, Home, Plane, ArrowUpDown, ArrowUp, ArrowDown, X, User, Shield, Star, Zap, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { BootstrapData } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface Fixture {
  id: number;
  event: number;
  team_h: number;
  team_a: number;
  team_h_difficulty: number;
  team_a_difficulty: number;
  kickoff_time: string;
  finished: boolean;
  team_h_score?: number;
  team_a_score?: number;
  minutes?: number;
  started?: boolean;
}

interface Team {
  id: number;
  name: string;
  short_name: string;
}


export default function ResultsAndFixtures() {
  const [selectedGameweek, setSelectedGameweek] = useState<"all" | number>(5);
  const [, navigate] = useLocation();

  const { data: bootstrapData, isLoading: isLoadingBootstrap } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: fixturesData, isLoading: isLoadingFixtures } = useQuery<Fixture[]>({
    queryKey: ["/api/fixtures"],
    staleTime: 5 * 60 * 1000,
  });

  // Get available gameweeks
  const availableGameweeks = useMemo(() => {
    if (!bootstrapData?.events) return [];
    return bootstrapData.events
      .map(event => event.id)
      .sort((a, b) => a - b);
  }, [bootstrapData]);

  // Navigation functions for gameweek
  const handlePreviousGameweek = () => {
    if (selectedGameweek === "all") return;
    const currentIndex = availableGameweeks.indexOf(selectedGameweek as number);
    if (currentIndex > 0) {
      setSelectedGameweek(availableGameweeks[currentIndex - 1]);
    }
  };

  const handleNextGameweek = () => {
    if (selectedGameweek === "all") return;
    const currentIndex = availableGameweeks.indexOf(selectedGameweek as number);
    if (currentIndex < availableGameweeks.length - 1) {
      setSelectedGameweek(availableGameweeks[currentIndex + 1]);
    }
  };

  // Get current gameweek for context
  const currentGameweek = useMemo(() => {
    if (!bootstrapData?.events) return 5;
    const currentEvent = bootstrapData.events.find(event => event.is_current);
    return currentEvent ? currentEvent.id : 5;
  }, [bootstrapData]);

  // Update selected gameweek to current gameweek when data loads
  useEffect(() => {
    if (bootstrapData?.events && currentGameweek) {
      setSelectedGameweek(currentGameweek);
    }
  }, [bootstrapData, currentGameweek]);

  // Process fixtures data
  const processedFixtures = useMemo(() => {
    if (!fixturesData || !bootstrapData?.teams) return [];

    return fixturesData.map(fixture => {
      const homeTeam = bootstrapData.teams.find(t => t.id === fixture.team_h);
      const awayTeam = bootstrapData.teams.find(t => t.id === fixture.team_a);
      
      return {
        ...fixture,
        homeTeam,
        awayTeam,
        isResult: fixture.finished,
        isUpcoming: !fixture.finished && !fixture.started,
        isLive: fixture.started && !fixture.finished,
      };
    });
  }, [fixturesData, bootstrapData]);

  // Filter fixtures based on selected gameweek
  const filteredFixtures = useMemo(() => {
    let filtered = processedFixtures;

    // Filter by gameweek
    if (selectedGameweek !== "all") {
      filtered = filtered.filter(f => f.event === selectedGameweek);
    }

    // Sort by gameweek and kickoff time
    return filtered.sort((a, b) => {
      if (a.event !== b.event) {
        return a.event - b.event;
      }
      // Secondary sort by date within gameweek
      return new Date(a.kickoff_time).getTime() - new Date(b.kickoff_time).getTime();
    });
  }, [processedFixtures, selectedGameweek]);

  // Group fixtures by gameweek for organized display
  const fixturesByGameweek = useMemo(() => {
    const grouped: Record<number, typeof filteredFixtures> = {};
    
    filteredFixtures.forEach(fixture => {
      if (!grouped[fixture.event]) {
        grouped[fixture.event] = [];
      }
      grouped[fixture.event].push(fixture);
    });

    return Object.entries(grouped)
      .map(([gw, fixtures]) => ({
        gameweek: parseInt(gw),
        fixtures: fixtures.sort((a, b) => 
          new Date(a.kickoff_time).getTime() - new Date(b.kickoff_time).getTime()
        )
      }))
      .sort((a, b) => a.gameweek - b.gameweek);
  }, [filteredFixtures]);

  // Format date and time
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-GB', { 
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      }),
      time: date.toLocaleTimeString('en-GB', { 
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  };

  const handleMatchClick = (fixture: any) => {
    if (!fixture.isResult && !fixture.isLive) return;
    navigate(`/match-stats/${fixture.id}`);
  };


  // Get match status badge
  const getStatusBadge = (fixture: any) => {
    if (fixture.isResult) {
      return <Badge variant="secondary" className="bg-green-100 text-green-800">FT</Badge>;
    } else if (fixture.isLive) {
      return <Badge variant="secondary" className="bg-red-100 text-red-800 animate-pulse">LIVE</Badge>;
    } else {
      const { time } = formatDateTime(fixture.kickoff_time);
      return <Badge variant="outline" className="text-gray-600">{time}</Badge>;
    }
  };


  // Statistics
  const stats = useMemo(() => {
    const completed = processedFixtures.filter(f => f.isResult).length;
    const upcoming = processedFixtures.filter(f => f.isUpcoming).length;
    const live = processedFixtures.filter(f => f.isLive).length;
    
    return {
      total: processedFixtures.length,
      completed,
      upcoming,
      live,
      currentGW: currentGameweek
    };
  }, [processedFixtures, currentGameweek]);

  if (isLoadingBootstrap || isLoadingFixtures) {
    return (
      <div className="fpl-page-container">
        <div className="fpl-page-header">
          <div className="fpl-page-title">
            <Calendar className="h-8 w-8" />
            <h1>Results and Fixtures</h1>
          </div>
          <p className="fpl-page-subtitle">
            Complete Premier League schedule with results and upcoming fixtures
          </p>
        </div>
        <div className="fpl-section-spacing">
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
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
          <h1>Results and Fixtures</h1>
        </div>
        <p className="fpl-page-subtitle">
          Complete Premier League schedule with results and upcoming fixtures
        </p>
      </div>

      <div className="fpl-section-spacing">
        {/* Gameweek Navigation */}
        <div className="fpl-filters">
          <div className="fpl-card-content">
            <div className="flex items-center justify-center space-x-2 sm:space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePreviousGameweek()}
                disabled={selectedGameweek === "all" || selectedGameweek === Math.min(...availableGameweeks)}
                className="px-2 sm:px-3 min-w-[44px]"
                data-testid="button-previous-gameweek"
              >
                <ChevronLeft className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Previous</span>
              </Button>
              
              <Select value={selectedGameweek.toString()} onValueChange={(value) => 
                setSelectedGameweek(value === "all" ? "all" : parseInt(value))
              }>
                <SelectTrigger data-testid="select-gameweek" className="w-32 sm:w-48">
                  <SelectValue placeholder="All Gameweeks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Gameweeks</SelectItem>
                  {availableGameweeks.map(gw => (
                    <SelectItem key={gw} value={gw.toString()}>
                      GW{gw} {gw === currentGameweek ? "(Current)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleNextGameweek()}
                disabled={selectedGameweek === "all" || selectedGameweek === Math.max(...availableGameweeks)}
                className="px-2 sm:px-3 min-w-[44px]"
                data-testid="button-next-gameweek"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="h-4 w-4 sm:ml-1" />
              </Button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="fpl-table-container">
          <div className="fpl-card-header">
            <div className="fpl-card-title">
              <Trophy className="h-5 w-5 text-blue-600" />
              {selectedGameweek === "all" 
                ? `All Gameweeks (${filteredFixtures.length} matches)`
                : `Gameweek ${selectedGameweek} (${filteredFixtures.length} matches)`
              }
            </div>
          </div>
          <div className="fpl-card-content">
            {selectedGameweek === "all" ? (
              // Grouped by gameweek view
              <div className="space-y-6">
                {fixturesByGameweek.map(({ gameweek, fixtures }) => (
                  <div key={gameweek} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Gameweek {gameweek}
                        {gameweek === currentGameweek && (
                          <Badge variant="outline" className="ml-2 text-blue-600">Current</Badge>
                        )}
                      </h3>
                      <div className="text-sm text-gray-600">
                        {fixtures.length} match{fixtures.length !== 1 ? "es" : ""}
                      </div>
                    </div>
                    
                    <div className="grid gap-2">
                      {fixtures.map((fixture) => (
                        <div 
                          key={fixture.id} 
                          className={`p-3 bg-gray-50 rounded-lg transition-colors ${
                            (fixture.isResult || fixture.isLive)
                              ? 'hover:bg-blue-50 cursor-pointer border-l-4 border-l-transparent hover:border-l-blue-500' 
                              : 'hover:bg-gray-100'
                          }`}
                          onClick={() => (fixture.isResult || fixture.isLive) && handleMatchClick(fixture)}
                          title={(fixture.isResult || fixture.isLive) ? 'Click to view match statistics' : ''}
                        >
                          {/* Mobile layout: stacked */}
                          <div className="flex flex-col space-y-2 md:hidden">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2 flex-1 min-w-0">
                                {fixture.homeTeam?.code ? (
                                  <img 
                                    src={fixture.homeTeam.code === 14 
                                      ? 'https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg'
                                      : `https://resources.premierleague.com/premierleague/badges/t${fixture.homeTeam.code}.png`}
                                    alt={`${fixture.homeTeam.short_name} badge`}
                                    className="w-4 h-4 object-contain shrink-0"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                  />
                                ) : <Home className="h-3 w-3 text-blue-500 shrink-0" />}
                                <span className="font-medium text-gray-900 text-sm truncate">
                                  {fixture.homeTeam?.short_name || "TBD"}
                                </span>
                              </div>
                              {fixture.isResult && (
                                <span className="text-lg font-bold text-gray-900 mx-2 shrink-0">
                                  {fixture.team_h_score}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2 flex-1 min-w-0">
                                {fixture.awayTeam?.code ? (
                                  <img 
                                    src={fixture.awayTeam.code === 14 
                                      ? 'https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg'
                                      : `https://resources.premierleague.com/premierleague/badges/t${fixture.awayTeam.code}.png`}
                                    alt={`${fixture.awayTeam.short_name} badge`}
                                    className="w-4 h-4 object-contain shrink-0"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                  />
                                ) : <Plane className="h-3 w-3 text-gray-500 shrink-0" />}
                                <span className="font-medium text-gray-900 text-sm truncate">
                                  {fixture.awayTeam?.short_name || "TBD"}
                                </span>
                              </div>
                              {fixture.isResult && (
                                <span className="text-lg font-bold text-gray-900 mx-2 shrink-0">
                                  {fixture.team_a_score}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center justify-between pt-1 border-t border-gray-200">
                              <div className="flex items-center space-x-2">
                                {!fixture.isResult && (
                                  <span className="text-xs text-gray-600">
                                    {formatDateTime(fixture.kickoff_time).time}
                                  </span>
                                )}
                                <span className="text-xs text-gray-500">
                                  {formatDateTime(fixture.kickoff_time).date}
                                </span>
                                {getStatusBadge(fixture)}
                              </div>
                              
                            </div>
                          </div>
                          
                          {/* Desktop layout: horizontal */}
                          <div className="hidden md:flex items-center justify-between">
                            <div className="flex items-center space-x-4 flex-1">
                              {/* Home Team */}
                              <div className="flex items-center space-x-2 min-w-[120px]">
                                <div className="text-right flex-1">
                                  <span className="font-medium text-gray-900">
                                    {fixture.homeTeam?.short_name || "TBD"}
                                  </span>
                                </div>
                                {fixture.homeTeam?.code ? (
                                  <img 
                                    src={fixture.homeTeam.code === 14 
                                      ? 'https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg'
                                      : `https://resources.premierleague.com/premierleague/badges/t${fixture.homeTeam.code}.png`}
                                    alt={`${fixture.homeTeam.short_name} badge`}
                                    className="w-5 h-5 object-contain"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                  />
                                ) : <Home className="h-3 w-3 text-blue-500" />}
                              </div>

                              {/* Score or Time */}
                              <div className="flex items-center justify-center min-w-[80px]">
                                {fixture.isResult ? (
                                  <span className="text-lg font-bold text-gray-900">
                                    {fixture.team_h_score} - {fixture.team_a_score}
                                  </span>
                                ) : (
                                  <span className="text-sm text-gray-600">
                                    {formatDateTime(fixture.kickoff_time).time}
                                  </span>
                                )}
                              </div>

                              {/* Away Team */}
                              <div className="flex items-center space-x-2 min-w-[120px]">
                                {fixture.awayTeam?.code ? (
                                  <img 
                                    src={fixture.awayTeam.code === 14 
                                      ? 'https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg'
                                      : `https://resources.premierleague.com/premierleague/badges/t${fixture.awayTeam.code}.png`}
                                    alt={`${fixture.awayTeam.short_name} badge`}
                                    className="w-5 h-5 object-contain"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                  />
                                ) : <Plane className="h-3 w-3 text-gray-500" />}
                                <div className="flex-1">
                                  <span className="font-medium text-gray-900">
                                    {fixture.awayTeam?.short_name || "TBD"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2">
                              {/* Date */}
                              <span className="text-xs text-gray-500 min-w-[60px]">
                                {formatDateTime(fixture.kickoff_time).date}
                              </span>
                              
                              {/* Status */}
                              {getStatusBadge(fixture)}
                              
                              {/* Click indicator for completed and live matches */}
                              {(fixture.isResult || fixture.isLive) && (
                                <Badge variant="outline" className="text-xs text-blue-600 opacity-70">
                                  Player Stats
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Single gameweek view
              <div className="grid gap-2">
                {filteredFixtures.map((fixture) => (
                  <div 
                    key={fixture.id} 
                    className={`p-3 sm:p-4 bg-white border rounded-lg transition-all ${
                      (fixture.isResult || fixture.isLive)
                        ? 'hover:shadow-md cursor-pointer border-l-4 border-l-transparent hover:border-l-blue-500 hover:bg-blue-50' 
                        : 'hover:shadow-sm'
                    }`}
                    onClick={() => (fixture.isResult || fixture.isLive) && handleMatchClick(fixture)}
                    title={(fixture.isResult || fixture.isLive) ? 'Click to view match statistics' : ''}
                  >
                    {/* Mobile layout: stacked */}
                    <div className="flex flex-col space-y-2 md:hidden">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          {fixture.homeTeam?.code ? (
                            <img 
                              src={fixture.homeTeam.code === 14 
                                ? 'https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg'
                                : `https://resources.premierleague.com/premierleague/badges/t${fixture.homeTeam.code}.png`}
                              alt={`${fixture.homeTeam.short_name} badge`}
                              className="w-4 h-4 object-contain shrink-0"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          ) : <Home className="h-3 w-3 text-blue-500 shrink-0" />}
                          <span className="font-medium text-gray-900 text-sm truncate">
                            {fixture.homeTeam?.short_name || "TBD"}
                          </span>
                        </div>
                        {fixture.isResult && (
                          <span className="text-xl font-bold text-gray-900 mx-2 shrink-0">
                            {fixture.team_h_score}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          {fixture.awayTeam?.code ? (
                            <img 
                              src={fixture.awayTeam.code === 14 
                                ? 'https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg'
                                : `https://resources.premierleague.com/premierleague/badges/t${fixture.awayTeam.code}.png`}
                              alt={`${fixture.awayTeam.short_name} badge`}
                              className="w-4 h-4 object-contain shrink-0"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          ) : <Plane className="h-3 w-3 text-gray-500 shrink-0" />}
                          <span className="font-medium text-gray-900 text-sm truncate">
                            {fixture.awayTeam?.short_name || "TBD"}
                          </span>
                        </div>
                        {fixture.isResult && (
                          <span className="text-xl font-bold text-gray-900 mx-2 shrink-0">
                            {fixture.team_a_score}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between pt-1 border-t border-gray-200">
                        <div className="flex items-center space-x-2">
                          {!fixture.isResult && (
                            <>
                              <span className="text-xs text-gray-600">
                                {formatDateTime(fixture.kickoff_time).time}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatDateTime(fixture.kickoff_time).date}
                              </span>
                            </>
                          )}
                          {getStatusBadge(fixture)}
                        </div>
                        
                      </div>
                    </div>
                    
                    {/* Desktop layout: horizontal */}
                    <div className="hidden md:flex items-center justify-between">
                      <div className="flex items-center space-x-6 flex-1">
                        {/* Home Team */}
                        <div className="flex items-center space-x-3 min-w-[140px]">
                          <div className="text-right flex-1">
                            <span className="font-medium text-gray-900 text-sm">
                              {fixture.homeTeam?.name || "TBD"}
                            </span>
                          </div>
                          {fixture.homeTeam?.code ? (
                            <img 
                              src={fixture.homeTeam.code === 14 
                                ? 'https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg'
                                : `https://resources.premierleague.com/premierleague/badges/t${fixture.homeTeam.code}.png`}
                              alt={`${fixture.homeTeam.short_name} badge`}
                              className="w-5 h-5 object-contain"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          ) : <Home className="h-4 w-4 text-blue-500" />}
                        </div>

                        {/* Score or Time */}
                        <div className="flex items-center justify-center min-w-[100px]">
                          {fixture.isResult ? (
                            <span className="text-xl font-bold text-gray-900">
                              {fixture.team_h_score} - {fixture.team_a_score}
                            </span>
                          ) : (
                            <div className="text-center">
                              <div className="text-sm text-gray-600">
                                {formatDateTime(fixture.kickoff_time).time}
                              </div>
                              <div className="text-xs text-gray-500">
                                {formatDateTime(fixture.kickoff_time).date}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Away Team */}
                        <div className="flex items-center space-x-3 min-w-[140px]">
                          {fixture.awayTeam?.code ? (
                            <img 
                              src={fixture.awayTeam.code === 14 
                                ? 'https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg'
                                : `https://resources.premierleague.com/premierleague/badges/t${fixture.awayTeam.code}.png`}
                              alt={`${fixture.awayTeam.short_name} badge`}
                              className="w-5 h-5 object-contain"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          ) : <Plane className="h-4 w-4 text-gray-500" />}
                          <div className="flex-1">
                            <span className="font-medium text-gray-900 text-sm">
                              {fixture.awayTeam?.name || "TBD"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {/* Status */}
                        {getStatusBadge(fixture)}
                        
                        {/* Click indicator for completed and live matches */}
                        {(fixture.isResult || fixture.isLive) && (
                          <Badge variant="outline" className="text-xs text-blue-600 opacity-70">
                            Player Stats
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {filteredFixtures.length === 0 && (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No matches found</h3>
                <p className="text-gray-600">Try adjusting your filters to see more results.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
