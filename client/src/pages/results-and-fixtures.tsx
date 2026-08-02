import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Calendar, Clock, Trophy, Target, Home, Plane, ArrowUpDown, ArrowUp, ArrowDown, X, User, Shield, Star, Zap, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { BootstrapData, CURRENT_SEASON } from "@shared/schema";
import { computeCurrentGameweek } from "@shared/gameweek-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SeasonSelector, PREVIOUS_SEASON } from "@/components/season-selector";
import { SeasonBadge } from "@/components/season-badge";

interface Fixture {
  id: number;
  event: number;
  team_h: number;
  team_a: number;
  team_h_difficulty?: number;
  team_a_difficulty?: number;
  kickoff_time: string;
  finished: boolean;
  team_h_score?: number;
  team_a_score?: number;
  minutes?: number;
  started?: boolean;
  // Only present on historical (season_fixtures_archive-backed) fixtures — embedded directly
  // since relegated clubs from that season no longer appear in the current bootstrap teams
  // list, so an ID-based join against it can't resolve their name/short name.
  team_h_name?: string;
  team_h_short_name?: string;
  team_h_code?: number;
  team_a_name?: string;
  team_a_short_name?: string;
  team_a_code?: number;
}

interface Team {
  id: number;
  name: string;
  short_name: string;
}

// Common shape processedFixtures normalizes both live (bootstrap-joined) and historical
// (archive-embedded) team data into, so the rest of the component can render either uniformly.
type TeamRef = { id: number; name?: string; short_name?: string; code?: number };


export default function ResultsAndFixtures() {
  const [selectedGameweek, setSelectedGameweek] = useState<"all" | number>(5);
  const [selectedSeason, setSelectedSeason] = useState<string>(CURRENT_SEASON);
  const isHistorical = selectedSeason !== CURRENT_SEASON;
  const [, navigate] = useLocation();

  const { data: bootstrapData, isLoading: isLoadingBootstrap } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: liveFixturesData, isLoading: isLoadingFixtures } = useQuery<Fixture[]>({
    queryKey: ["/api/fixtures"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: historicalFixturesData, isLoading: isLoadingHistorical } = useQuery<Fixture[]>({
    queryKey: ["/api/fixtures-history", selectedSeason],
    queryFn: () => fetch(`/api/fixtures-history?season=${encodeURIComponent(selectedSeason)}`).then(r => r.json()),
    staleTime: 10 * 60 * 1000,
    enabled: isHistorical,
  });

  const fixturesData = isHistorical ? historicalFixturesData : liveFixturesData;

  // Current (2026/27) season has zero real fixtures until kickoff — default to the last
  // completed season so the page isn't just empty. Only runs once, and only if the user
  // hasn't already picked a season themselves.
  const hasAutoDefaulted = useRef(false);
  useEffect(() => {
    if (hasAutoDefaulted.current) return;
    if (!bootstrapData?.events) return;
    hasAutoDefaulted.current = true;
    if (computeCurrentGameweek(bootstrapData.events as any) === 0) {
      setSelectedSeason(PREVIOUS_SEASON);
    }
  }, [bootstrapData]);

  // Historical seasons have no live "current" gameweek — default to the latest gameweek in
  // that season's archive (e.g. GW38) once its fixtures load, so the page opens on the most
  // recent action instead of the full 38-gameweek list.
  useEffect(() => {
    if (!isHistorical) return;
    if (!historicalFixturesData || historicalFixturesData.length === 0) {
      setSelectedGameweek("all");
      return;
    }
    const latestGameweek = Math.max(...historicalFixturesData.map(f => f.event));
    setSelectedGameweek(latestGameweek);
  }, [isHistorical, historicalFixturesData]);

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
    // Floored at 1 — this selects which gameweek's fixtures to show by default, and GW0
    // isn't a real gameweek.
    return Math.max(1, computeCurrentGameweek((bootstrapData?.events || []) as any));
  }, [bootstrapData]);

  // Update selected gameweek to current gameweek when data loads
  useEffect(() => {
    if (isHistorical) return;
    if (bootstrapData?.events && currentGameweek) {
      setSelectedGameweek(currentGameweek);
    }
  }, [bootstrapData, currentGameweek, isHistorical]);

  // Process fixtures data. Historical fixtures embed their own team name/short name/crest
  // (see the Fixture interface comment) instead of being joined against the current bootstrap
  // teams list, since relegated clubs no longer appear there at all.
  const processedFixtures = useMemo(() => {
    if (!fixturesData) return [];

    if (isHistorical) {
      return fixturesData.map(fixture => {
        const homeTeam: TeamRef | undefined = { id: fixture.team_h, name: fixture.team_h_name, short_name: fixture.team_h_short_name, code: fixture.team_h_code };
        const awayTeam: TeamRef | undefined = { id: fixture.team_a, name: fixture.team_a_name, short_name: fixture.team_a_short_name, code: fixture.team_a_code };
        return {
          ...fixture,
          homeTeam,
          awayTeam,
          isResult: fixture.finished,
          isUpcoming: false,
          isLive: false,
        };
      });
    }

    if (!bootstrapData?.teams) return [];

    return fixturesData.map(fixture => {
      const homeTeamData = bootstrapData.teams.find(t => t.id === fixture.team_h);
      const awayTeamData = bootstrapData.teams.find(t => t.id === fixture.team_a);
      const homeTeam: TeamRef | undefined = homeTeamData && { id: homeTeamData.id, name: homeTeamData.name, short_name: homeTeamData.short_name, code: homeTeamData.code };
      const awayTeam: TeamRef | undefined = awayTeamData && { id: awayTeamData.id, name: awayTeamData.name, short_name: awayTeamData.short_name, code: awayTeamData.code };

      return {
        ...fixture,
        homeTeam,
        awayTeam,
        isResult: fixture.finished,
        isUpcoming: !fixture.finished && !fixture.started,
        isLive: fixture.started && !fixture.finished,
      };
    });
  }, [fixturesData, bootstrapData, isHistorical]);

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

  // Historical fixture IDs come from season_fixtures_archive, a separate ID space from FPL's
  // live fixture IDs — the season query param tells /match-stats/:id which one it's looking at.
  const isClickableFixture = (fixture: any) =>
    isHistorical ? !!fixture.isResult : (fixture.isResult || fixture.isLive);

  const handleMatchClick = (fixture: any) => {
    if (!isClickableFixture(fixture)) return;
    const query = isHistorical ? `?season=${encodeURIComponent(selectedSeason)}` : '';
    navigate(`/match-stats/${fixture.id}${query}`);
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

  if (isLoadingBootstrap || isLoadingFixtures || (isHistorical && isLoadingHistorical)) {
    return (
      <div className="fpl-page-container">
        <div className="fpl-page-header">
          <div className="fpl-page-title">
            <Calendar className="h-8 w-8" />
            <h1>Match Stats</h1>
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
          <h1>Match Stats</h1>
          <SeasonBadge season={selectedSeason} />
        </div>
        <p className="fpl-page-subtitle">
          Complete Premier League schedule with results and upcoming fixtures
        </p>
      </div>

      <div className="fpl-section-spacing">
        {/* Season + Gameweek Navigation */}
        <div className="fpl-filters">
          <div className="fpl-card-content">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <SeasonSelector value={selectedSeason} onChange={setSelectedSeason} />
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
                  <SelectTrigger data-testid="select-gameweek" className="w-28 h-8 text-xs">
                    <SelectValue placeholder="All Gameweeks" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Gameweeks</SelectItem>
                    {availableGameweeks.map(gw => (
                      <SelectItem key={gw} value={gw.toString()}>
                        GW{gw} {!isHistorical && gw === currentGameweek ? "(Current)" : ""}
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
                        {!isHistorical && gameweek === currentGameweek && (
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
                            isClickableFixture(fixture)
                              ? 'hover:bg-blue-50 cursor-pointer border-l-4 border-l-transparent hover:border-l-blue-500' 
                              : 'hover:bg-gray-100'
                          }`}
                          onClick={() => isClickableFixture(fixture) && handleMatchClick(fixture)}
                          title={isClickableFixture(fixture) ? 'Click to view match statistics' : ''}
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
                              {isClickableFixture(fixture) && (
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
                      isClickableFixture(fixture)
                        ? 'hover:shadow-md cursor-pointer border-l-4 border-l-transparent hover:border-l-blue-500 hover:bg-blue-50' 
                        : 'hover:shadow-sm'
                    }`}
                    onClick={() => isClickableFixture(fixture) && handleMatchClick(fixture)}
                    title={isClickableFixture(fixture) ? 'Click to view match statistics' : ''}
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
                        {isClickableFixture(fixture) && (
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
