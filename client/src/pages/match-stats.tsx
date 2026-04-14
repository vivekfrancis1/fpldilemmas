import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Trophy, Calendar } from "lucide-react";

interface PlayerStats {
  playerId: number;
  playerName: string;
  teamName: string;
  position: string;
  minutes: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  goals_conceded: number;
  own_goals: number;
  penalties_saved: number;
  penalties_missed: number;
  yellow_cards: number;
  red_cards: number;
  saves: number;
  bonus: number;
  bps: number;
  influence: number;
  creativity: number;
  threat: number;
  ict_index: number;
  total_points: number;
  defensive_contribution?: number;
}

interface MatchData {
  fixture: any;
  homeTeam: any;
  awayTeam: any;
  homeTeamStats: PlayerStats[];
  awayTeamStats: PlayerStats[];
}

export default function MatchStats() {
  const { fixtureId } = useParams<{ fixtureId: string }>();
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { data: bootstrapData } = useQuery<any>({
    queryKey: ['/api/bootstrap-static'],
  });

  const { data: fixturesData } = useQuery<any[]>({
    queryKey: ['/api/fixtures'],
  });

  const fixture = fixturesData?.find((f: any) => f.id === parseInt(fixtureId || '0'));

  const homeTeam = bootstrapData?.teams?.find((t: any) => t.id === fixture?.team_h);
  const awayTeam = bootstrapData?.teams?.find((t: any) => t.id === fixture?.team_a);

  const isLive = fixture?.started && !fixture?.finished && !fixture?.finished_provisional;
  const isFinished = fixture?.finished || fixture?.finished_provisional;

  const formatDateTime = (kickoffTime: string) => {
    const date = new Date(kickoffTime);
    return {
      date: date.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }),
      time: date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  };

  const fetchMatchStats = async () => {
    if (!fixture || !bootstrapData || (!isFinished && !isLive)) {
      setIsLoading(false);
      return;
    }

    try {
      const gameweek = fixture.event;
      const response = await fetch(`/api/event/${gameweek}/live`);
      if (!response.ok) throw new Error('Failed to fetch live data');
      const liveData = await response.json();

      const liveElements = liveData.elements || [];

      const fixtureId = fixture.id;

      const homeTeamPlayers = bootstrapData.elements.filter((p: any) => p.team === fixture.team_h) || [];
      const awayTeamPlayers = bootstrapData.elements.filter((p: any) => p.team === fixture.team_a) || [];

      const getExplainValue = (explainStats: any[], identifier: string): number => {
        const stat = explainStats.find((s: any) => s.identifier === identifier);
        return stat ? (stat.value || 0) : 0;
      };

      const buildPlayerStats = (players: any[], teamName: string): PlayerStats[] => {
        return players.map((player: any) => {
          const liveElement = liveElements.find((e: any) => e.id === player.id);
          if (!liveElement) return null;

          const explainData = liveElement.explain || [];
          const fixtureExplain = explainData.find((e: any) => e.fixture === fixtureId);

          if (!fixtureExplain) return null;

          const fxStats = fixtureExplain.stats || [];
          const isDGW = explainData.length > 1;

          const minutes = getExplainValue(fxStats, 'minutes');

          if (isDGW) {
            const totalFixturePoints = fxStats.reduce((sum: number, s: any) => sum + (s.points || 0) + (s.points_modification || 0), 0);
            return {
              playerId: player.id,
              playerName: player.web_name,
              teamName,
              position: ['', 'GKP', 'DEF', 'MID', 'FWD'][player.element_type] || 'Unknown',
              minutes,
              goals_scored: getExplainValue(fxStats, 'goals_scored'),
              assists: getExplainValue(fxStats, 'assists'),
              clean_sheets: getExplainValue(fxStats, 'clean_sheets'),
              goals_conceded: getExplainValue(fxStats, 'goals_conceded'),
              own_goals: getExplainValue(fxStats, 'own_goals'),
              penalties_saved: getExplainValue(fxStats, 'penalties_saved'),
              penalties_missed: getExplainValue(fxStats, 'penalties_missed'),
              yellow_cards: getExplainValue(fxStats, 'yellow_cards'),
              red_cards: getExplainValue(fxStats, 'red_cards'),
              saves: getExplainValue(fxStats, 'saves'),
              bonus: getExplainValue(fxStats, 'bonus'),
              bps: (liveElement.stats || {}).bps || 0,
              influence: parseFloat((liveElement.stats || {}).influence) || 0,
              creativity: parseFloat((liveElement.stats || {}).creativity) || 0,
              threat: parseFloat((liveElement.stats || {}).threat) || 0,
              ict_index: parseFloat((liveElement.stats || {}).ict_index) || 0,
              total_points: totalFixturePoints,
              defensive_contribution: getExplainValue(fxStats, 'defensive_contribution')
            } as PlayerStats;
          }

          const stats = liveElement.stats || {};
          return {
            playerId: player.id,
            playerName: player.web_name,
            teamName,
            position: ['', 'GKP', 'DEF', 'MID', 'FWD'][player.element_type] || 'Unknown',
            minutes: stats.minutes || 0,
            goals_scored: stats.goals_scored || 0,
            assists: stats.assists || 0,
            clean_sheets: stats.clean_sheets || 0,
            goals_conceded: stats.goals_conceded || 0,
            own_goals: stats.own_goals || 0,
            penalties_saved: stats.penalties_saved || 0,
            penalties_missed: stats.penalties_missed || 0,
            yellow_cards: stats.yellow_cards || 0,
            red_cards: stats.red_cards || 0,
            saves: stats.saves || 0,
            bonus: stats.bonus || 0,
            bps: stats.bps || 0,
            influence: parseFloat(stats.influence) || 0,
            creativity: parseFloat(stats.creativity) || 0,
            threat: parseFloat(stats.threat) || 0,
            ict_index: parseFloat(stats.ict_index) || 0,
            total_points: stats.total_points || 0,
            defensive_contribution: stats.defensive_contribution || 0
          } as PlayerStats;
        }).filter((s: PlayerStats | null): s is PlayerStats => s !== null);
      };

      const homeTeamStats = buildPlayerStats(homeTeamPlayers, homeTeam?.short_name || 'Home').sort((a, b) => b.total_points - a.total_points);
      const awayTeamStats = buildPlayerStats(awayTeamPlayers, awayTeam?.short_name || 'Away').sort((a, b) => b.total_points - a.total_points);

      setMatchData({
        fixture,
        homeTeam,
        awayTeam,
        homeTeamStats,
        awayTeamStats
      });
    } catch (error) {
      console.error('Error fetching match stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (fixture && bootstrapData) {
      fetchMatchStats();
    }
  }, [fixture, bootstrapData]);

  useEffect(() => {
    if (autoRefreshIntervalRef.current) {
      clearInterval(autoRefreshIntervalRef.current);
      autoRefreshIntervalRef.current = null;
    }

    if (isLive && matchData) {
      autoRefreshIntervalRef.current = setInterval(() => {
        if (fixture?.finished || fixture?.finished_provisional) {
          if (autoRefreshIntervalRef.current) {
            clearInterval(autoRefreshIntervalRef.current);
            autoRefreshIntervalRef.current = null;
          }
          return;
        }
        fetchMatchStats();
      }, 30000);
    }

    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
        autoRefreshIntervalRef.current = null;
      }
    };
  }, [isLive, matchData, fixture]);

  const getGoalPoints = (goals: number, position: string) => {
    if (position === 'FWD') return goals * 4;
    if (position === 'MID') return goals * 5;
    if (position === 'DEF' || position === 'GKP') return goals * 6;
    return goals * 4;
  };

  const renderStatSection = (
    title: string,
    homePlayers: PlayerStats[],
    awayPlayers: PlayerStats[],
    renderBadge: (player: PlayerStats) => { value: string; color: string } | null,
    renderLabel: (player: PlayerStats) => string
  ) => {
    if (homePlayers.length === 0 && awayPlayers.length === 0) return null;

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-800 to-gray-700 text-white text-center py-2 px-3 font-semibold text-sm">
          {title}
        </div>
        <div className="grid grid-cols-2 divide-x divide-gray-100">
          <div className="p-2.5 sm:p-4 space-y-1.5">
            {homePlayers.map((player) => {
              const badge = renderBadge(player);
              return (
                <div key={player.playerId} className="flex items-center gap-1.5">
                  {badge && (
                    <span className={`inline-flex items-center justify-center min-w-[26px] sm:min-w-[30px] h-5 sm:h-6 ${badge.color} text-white text-[10px] sm:text-xs font-bold rounded-md px-1 shrink-0`}>
                      {badge.value}
                    </span>
                  )}
                  <span className="text-xs sm:text-sm text-gray-800 truncate">{renderLabel(player)}</span>
                </div>
              );
            })}
            {homePlayers.length === 0 && <div className="text-xs text-gray-300 text-center py-1">-</div>}
          </div>
          <div className="p-2.5 sm:p-4 space-y-1.5">
            {awayPlayers.map((player) => {
              const badge = renderBadge(player);
              return (
                <div key={player.playerId} className="flex items-center gap-1.5">
                  {badge && (
                    <span className={`inline-flex items-center justify-center min-w-[26px] sm:min-w-[30px] h-5 sm:h-6 ${badge.color} text-white text-[10px] sm:text-xs font-bold rounded-md px-1 shrink-0`}>
                      {badge.value}
                    </span>
                  )}
                  <span className="text-xs sm:text-sm text-gray-800 truncate">{renderLabel(player)}</span>
                </div>
              );
            })}
            {awayPlayers.length === 0 && <div className="text-xs text-gray-300 text-center py-1">-</div>}
          </div>
        </div>
      </div>
    );
  };

  if (!fixture && !isLoading && fixturesData) {
    return (
      <div className="w-full py-4 sm:py-6 space-y-4 sm:space-y-6">
        <Button variant="outline" size="sm" onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Match Not Found</h3>
            <p className="text-gray-500">The requested match could not be found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || !fixturesData || !bootstrapData) {
    return (
      <div className="w-full py-4 sm:py-6 space-y-4 sm:space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  const dateTime = fixture?.kickoff_time ? formatDateTime(fixture.kickoff_time) : null;

  return (
    <div className="w-full py-3 sm:py-6 space-y-3 sm:space-y-5">
      <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900 -ml-1" onClick={() => window.history.back()}>
        <ArrowLeft className="h-4 w-4 mr-1.5" />
        <span className="text-sm">Back to Results</span>
      </Button>

      <div className="rounded-2xl overflow-hidden shadow-lg">
        <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white px-3 sm:px-6 py-5 sm:py-8">
          <div className="flex items-center justify-between gap-2">
            <div className="text-center flex-1 min-w-0">
              <div className="text-sm sm:text-lg md:text-xl font-bold truncate">{homeTeam?.name}</div>
            </div>
            <div className="text-center shrink-0 px-2">
              <div className="text-3xl sm:text-5xl font-black tracking-tight tabular-nums">
                {fixture?.team_h_score ?? '-'} <span className="text-gray-500 mx-1">-</span> {fixture?.team_a_score ?? '-'}
              </div>
              <div className="mt-2 flex items-center justify-center gap-1.5 flex-wrap">
                {isLive && (
                  <Badge className="bg-red-600 text-white animate-pulse text-[10px] sm:text-xs px-2">
                    LIVE
                  </Badge>
                )}
                {isFinished && (
                  <Badge className="bg-emerald-600 text-white text-[10px] sm:text-xs px-2">
                    Full Time
                  </Badge>
                )}
                <span className="text-[10px] sm:text-xs text-gray-400">
                  GW{fixture?.event}{dateTime ? ` \u00B7 ${dateTime.date}` : ''}
                </span>
              </div>
            </div>
            <div className="text-center flex-1 min-w-0">
              <div className="text-sm sm:text-lg md:text-xl font-bold truncate">{awayTeam?.name}</div>
            </div>
          </div>
        </div>
        {isLive && (
          <div className="bg-red-500/10 text-red-600 text-center py-1 text-[10px] sm:text-xs font-medium">
            Auto-updating every 30s
          </div>
        )}
      </div>

      {!matchData && !isLoading ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No statistics available</h3>
            <p className="text-gray-600">Match statistics will be available once the match has started.</p>
          </CardContent>
        </Card>
      ) : matchData ? (
        <div className="space-y-3 sm:space-y-4">
          {renderStatSection(
            "Goals Scored",
            matchData.homeTeamStats.filter(p => p.goals_scored > 0).sort((a, b) => b.goals_scored - a.goals_scored),
            matchData.awayTeamStats.filter(p => p.goals_scored > 0).sort((a, b) => b.goals_scored - a.goals_scored),
            (player) => ({ value: `+${getGoalPoints(player.goals_scored, player.position)}`, color: 'bg-green-500' }),
            (player) => `${player.playerName}${player.goals_scored > 1 ? ` (${player.goals_scored})` : ''}`
          )}

          {renderStatSection(
            "Assists",
            matchData.homeTeamStats.filter(p => p.assists > 0).sort((a, b) => b.assists - a.assists),
            matchData.awayTeamStats.filter(p => p.assists > 0).sort((a, b) => b.assists - a.assists),
            (player) => ({ value: `+${player.assists * 3}`, color: 'bg-green-500' }),
            (player) => `${player.playerName}${player.assists > 1 ? ` (${player.assists})` : ''}`
          )}

          {renderStatSection(
            "Clean Sheets",
            matchData.homeTeamStats.filter(p => p.clean_sheets > 0 && p.minutes >= 60).sort((a, b) => b.total_points - a.total_points),
            matchData.awayTeamStats.filter(p => p.clean_sheets > 0 && p.minutes >= 60).sort((a, b) => b.total_points - a.total_points),
            (player) => {
              const pts = player.position === 'GKP' || player.position === 'DEF' ? 4 : player.position === 'MID' ? 1 : 0;
              return pts > 0 ? { value: `+${pts}`, color: 'bg-green-500' } : null;
            },
            (player) => `${player.playerName} (${player.position})`
          )}

          {renderStatSection(
            "Yellow Cards",
            matchData.homeTeamStats.filter(p => p.yellow_cards > 0),
            matchData.awayTeamStats.filter(p => p.yellow_cards > 0),
            () => ({ value: '-1', color: 'bg-red-500' }),
            (player) => player.playerName
          )}

          {renderStatSection(
            "Red Cards",
            matchData.homeTeamStats.filter(p => p.red_cards > 0),
            matchData.awayTeamStats.filter(p => p.red_cards > 0),
            () => ({ value: '-3', color: 'bg-red-500' }),
            (player) => player.playerName
          )}

          {renderStatSection(
            "Own Goals",
            matchData.homeTeamStats.filter(p => p.own_goals > 0),
            matchData.awayTeamStats.filter(p => p.own_goals > 0),
            (player) => ({ value: `-${player.own_goals * 2}`, color: 'bg-red-500' }),
            (player) => `${player.playerName}${player.own_goals > 1 ? ` (${player.own_goals})` : ''}`
          )}

          {renderStatSection(
            "Penalties Saved",
            matchData.homeTeamStats.filter(p => p.penalties_saved > 0),
            matchData.awayTeamStats.filter(p => p.penalties_saved > 0),
            (player) => ({ value: `+${player.penalties_saved * 5}`, color: 'bg-green-500' }),
            (player) => `${player.playerName}${player.penalties_saved > 1 ? ` (${player.penalties_saved})` : ''}`
          )}

          {renderStatSection(
            "Penalties Missed",
            matchData.homeTeamStats.filter(p => p.penalties_missed > 0),
            matchData.awayTeamStats.filter(p => p.penalties_missed > 0),
            (player) => ({ value: `-${player.penalties_missed * 2}`, color: 'bg-red-500' }),
            (player) => `${player.playerName}${player.penalties_missed > 1 ? ` (${player.penalties_missed})` : ''}`
          )}

          {renderStatSection(
            "Saves",
            matchData.homeTeamStats.filter(p => p.saves > 0).sort((a, b) => b.saves - a.saves),
            matchData.awayTeamStats.filter(p => p.saves > 0).sort((a, b) => b.saves - a.saves),
            (player) => {
              const pts = Math.floor(player.saves / 3);
              return pts > 0 ? { value: `+${pts}`, color: 'bg-green-500' } : null;
            },
            (player) => `${player.playerName} (${player.saves})`
          )}

          {renderStatSection(
            "Bonus Points System",
            matchData.homeTeamStats.filter(p => p.bps > 0).sort((a, b) => b.bps - a.bps).slice(0, 10),
            matchData.awayTeamStats.filter(p => p.bps > 0).sort((a, b) => b.bps - a.bps).slice(0, 10),
            (player) => player.bonus > 0 ? { value: `+${player.bonus}`, color: 'bg-green-500' } : null,
            (player) => `${player.playerName} (${player.bps})`
          )}

          {(() => {
            const homeDC = matchData.homeTeamStats.filter(p => (p.defensive_contribution || 0) > 0).sort((a, b) => (b.defensive_contribution || 0) - (a.defensive_contribution || 0)).slice(0, 10);
            const awayDC = matchData.awayTeamStats.filter(p => (p.defensive_contribution || 0) > 0).sort((a, b) => (b.defensive_contribution || 0) - (a.defensive_contribution || 0)).slice(0, 10);
            if (homeDC.length === 0 && awayDC.length === 0) return null;

            return renderStatSection(
              "Defensive Contributions",
              homeDC,
              awayDC,
              (player) => {
                const dc = player.defensive_contribution || 0;
                const pts = (player.position === 'DEF' || player.position === 'GKP') && dc >= 10 ? 2 : (player.position === 'MID' || player.position === 'FWD') && dc >= 12 ? 2 : 0;
                return pts > 0 ? { value: `+${pts}`, color: 'bg-green-500' } : null;
              },
              (player) => `${player.playerName} (${player.defensive_contribution || 0})`
            );
          })()}

        </div>
      ) : null}
    </div>
  );
}
