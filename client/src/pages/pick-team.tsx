import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UserPlus, X, Save, CheckCircle2, Search } from "lucide-react";
import { PitchView, type PitchPlayer } from "@/components/pitch-view";
import { LoadingExperience } from "@/components/loading-experience";
import { isSeasonEnded, computeCurrentGameweek } from "@shared/gameweek-utils";
import { SeasonEndedNotice } from "@/components/season-ended-notice";
import { useToast } from "@/hooks/use-toast";
import { savePreseasonDraft, getPreseasonDraft } from "@/lib/preseason-draft-cache";

interface PlayerSnapshot {
  playerId: number;
  playerName: string;
  teamName: string;
  position: string; // 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Forward'
  price: number;
  ownership: number;
  totalProjectedPoints: number; // across the fixed 6-GW window
  gameweekBreakdown: Record<string, number>;
}

const SQUAD_CONSTRAINTS = {
  goalkeepers: 2,
  defenders: 5,
  midfielders: 5,
  forwards: 3,
  maxPlayersPerTeam: 3,
};
const TOTAL_BUDGET = 100;
const SQUAD_SIZE = 15;

const VALID_FORMATIONS = [
  { def: 3, mid: 4, fwd: 3, name: '3-4-3' },
  { def: 3, mid: 5, fwd: 2, name: '3-5-2' },
  { def: 4, mid: 3, fwd: 3, name: '4-3-3' },
  { def: 4, mid: 4, fwd: 2, name: '4-4-2' },
  { def: 4, mid: 5, fwd: 1, name: '4-5-1' },
  { def: 5, mid: 3, fwd: 2, name: '5-3-2' },
  { def: 5, mid: 4, fwd: 1, name: '5-4-1' },
];

const POSITIONS: Array<'Goalkeeper' | 'Defender' | 'Midfielder' | 'Forward'> = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'];
const POSITION_SHORT: Record<string, string> = { Goalkeeper: 'GKP', Defender: 'DEF', Midfielder: 'MID', Forward: 'FWD' };
const POSITION_TO_ELEMENT_TYPE: Record<string, number> = { Goalkeeper: 1, Defender: 2, Midfielder: 3, Forward: 4 };
const POSITION_REQUIRED: Record<string, number> = {
  Goalkeeper: SQUAD_CONSTRAINTS.goalkeepers,
  Defender: SQUAD_CONSTRAINTS.defenders,
  Midfielder: SQUAD_CONSTRAINTS.midfielders,
  Forward: SQUAD_CONSTRAINTS.forwards,
};

function normalizePosition(position: string): 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Forward' {
  const pos = (position || '').toLowerCase();
  if (pos.includes('goalkeeper') || pos === 'gkp') return 'Goalkeeper';
  if (pos.includes('defender') || pos === 'def') return 'Defender';
  if (pos.includes('midfielder') || pos === 'mid') return 'Midfielder';
  return 'Forward';
}

function getGameweekPoints(player: PlayerSnapshot, gameweek: number): number {
  return player.gameweekBreakdown[gameweek.toString()] || player.gameweekBreakdown[`gw${gameweek}`] || 0;
}

/** Picks the best valid-formation starting XI + captain/vice from a squad, ranked by whatever
 * points function is supplied — a single gameweek's projection, or the whole-window total for
 * the "Set & Forget" tab. Same algorithm shape as optimizeStartingXIForGameweek in
 * wildcard-optimizer.tsx, generalized over the points source since Pick Team needs both. */
function pickBestXI(squad: PlayerSnapshot[], pointsFor: (player: PlayerSnapshot) => number) {
  const byPosition = {
    Goalkeeper: squad.filter(p => normalizePosition(p.position) === 'Goalkeeper').sort((a, b) => pointsFor(b) - pointsFor(a)),
    Defender: squad.filter(p => normalizePosition(p.position) === 'Defender').sort((a, b) => pointsFor(b) - pointsFor(a)),
    Midfielder: squad.filter(p => normalizePosition(p.position) === 'Midfielder').sort((a, b) => pointsFor(b) - pointsFor(a)),
    Forward: squad.filter(p => normalizePosition(p.position) === 'Forward').sort((a, b) => pointsFor(b) - pointsFor(a)),
  };

  let bestFormation: typeof VALID_FORMATIONS[0] | null = null;
  let bestXI: PlayerSnapshot[] = [];
  let bestPoints = -1;

  for (const formation of VALID_FORMATIONS) {
    if (byPosition.Goalkeeper.length < 1 || byPosition.Defender.length < formation.def ||
        byPosition.Midfielder.length < formation.mid || byPosition.Forward.length < formation.fwd) continue;
    const xi = [
      byPosition.Goalkeeper[0],
      ...byPosition.Defender.slice(0, formation.def),
      ...byPosition.Midfielder.slice(0, formation.mid),
      ...byPosition.Forward.slice(0, formation.fwd),
    ];
    const total = xi.reduce((sum, p) => sum + pointsFor(p), 0);
    if (total > bestPoints) {
      bestPoints = total;
      bestXI = xi;
      bestFormation = formation;
    }
  }

  if (bestXI.length === 0) return null;

  const captain = bestXI.reduce((best, p) => (pointsFor(p) > pointsFor(best) ? p : best));
  const viceCaptain = bestXI
    .filter(p => p.playerId !== captain.playerId)
    .reduce((best, p) => (pointsFor(p) > pointsFor(best) ? p : best), bestXI.find(p => p.playerId !== captain.playerId)!);

  const totalPoints = bestXI.reduce((sum, p) => sum + (p.playerId === captain.playerId ? pointsFor(p) * 2 : pointsFor(p)), 0);

  return { starting11: bestXI, captain, viceCaptain, totalPoints, formation: bestFormation?.name || '4-5-1' };
}

export default function PickTeam() {
  const { toast } = useToast();
  const [savedDraftAt, setSavedDraftAt] = useState<string | null>(() => getPreseasonDraft()?.savedAt ?? null);
  const [squad, setSquad] = useState<PlayerSnapshot[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState<string>("ALL");

  const { data: bootstrapData, isLoading: isLoadingBootstrap } = useQuery<any>({
    queryKey: ['/api/bootstrap-static'],
    staleTime: 5 * 60 * 1000,
  });

  const teamInfoByName = useMemo(() => {
    const map = new Map<string, { code: number; short_name: string }>();
    (bootstrapData?.teams || []).forEach((team: any) => {
      map.set(team.name, { code: team.code, short_name: team.short_name });
    });
    return map;
  }, [bootstrapData]);

  const playerIdToWebName = useMemo(() => {
    const map = new Map<number, string>();
    (bootstrapData?.elements || []).forEach((player: any) => {
      map.set(player.id, player.web_name);
    });
    return map;
  }, [bootstrapData]);

  const currentGameweek = computeCurrentGameweek((bootstrapData?.events || []) as any);
  const startGameweek = currentGameweek + 1;
  const endGameweek = Math.min(startGameweek + 5, 38); // fixed 6-GW window, matching Transfer Planner
  const gameweekList = useMemo(() => {
    const list: number[] = [];
    for (let gw = startGameweek; gw <= endGameweek; gw++) list.push(gw);
    return list;
  }, [startGameweek, endGameweek]);

  const { data: allCachedData, isLoading: isLoadingProjections, error: projectionsError } = useQuery<any[]>({
    queryKey: ["/api/cached/player-total-points"],
    enabled: !!bootstrapData,
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const response = await fetch('/api/cached/player-total-points');
      if (!response.ok) throw new Error('Failed to fetch player projections');
      return response.json();
    },
  });

  const allPlayers: PlayerSnapshot[] = useMemo(() => {
    if (!Array.isArray(allCachedData)) return [];
    return allCachedData.map((player: any) => {
      const gameweekBreakdown: Record<string, number> = {};
      let totalProjectedPoints = 0;
      const original = player.gameweekProjections || {};
      for (const gw of gameweekList) {
        const points = original[gw.toString()] ?? original[`gw${gw}`] ?? 0;
        gameweekBreakdown[gw.toString()] = points;
        totalProjectedPoints += points;
      }
      return {
        playerId: player.playerId || 0,
        playerName: player.name || player.playerName || '',
        teamName: player.team || '',
        position: player.position || '',
        price: player.price || 0,
        ownership: player.ownership || 0,
        totalProjectedPoints,
        gameweekBreakdown,
      };
    });
  }, [allCachedData, gameweekList]);

  const toPitchPlayer = (player: PlayerSnapshot, slot: number, isCaptain: boolean, isViceCaptain: boolean, points: number): PitchPlayer => {
    const teamInfo = teamInfoByName.get(player.teamName);
    return {
      element: player.playerId,
      element_type: POSITION_TO_ELEMENT_TYPE[normalizePosition(player.position)] || 4,
      position: slot,
      is_captain: isCaptain,
      is_vice_captain: isViceCaptain,
      web_name: playerIdToWebName.get(player.playerId) || player.playerName,
      team_short_name: teamInfo?.short_name,
      team_code: teamInfo?.code,
      custom_badge_text: points.toFixed(1),
      custom_badge_color: isCaptain ? 'bg-yellow-500' : 'bg-purple-600',
    };
  };

  // ---- Squad derived state ----
  const squadIds = useMemo(() => new Set(squad.map(p => p.playerId)), [squad]);
  const spent = useMemo(() => squad.reduce((sum, p) => sum + p.price, 0), [squad]);
  const remaining = TOTAL_BUDGET - spent;
  const positionCounts = useMemo(() => {
    const counts: Record<string, number> = { Goalkeeper: 0, Defender: 0, Midfielder: 0, Forward: 0 };
    squad.forEach(p => { counts[normalizePosition(p.position)]++; });
    return counts;
  }, [squad]);
  const teamCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    squad.forEach(p => { counts[p.teamName] = (counts[p.teamName] || 0) + 1; });
    return counts;
  }, [squad]);
  const isSquadComplete = squad.length === SQUAD_SIZE;

  function canAdd(player: PlayerSnapshot): { allowed: boolean; reason?: string } {
    if (squadIds.has(player.playerId)) return { allowed: false, reason: 'Already in your squad' };
    if (squad.length >= SQUAD_SIZE) return { allowed: false, reason: 'Squad is full (15/15)' };
    const pos = normalizePosition(player.position);
    if (positionCounts[pos] >= POSITION_REQUIRED[pos]) return { allowed: false, reason: `Already have ${POSITION_REQUIRED[pos]} ${POSITION_SHORT[pos]}` };
    if ((teamCounts[player.teamName] || 0) >= SQUAD_CONSTRAINTS.maxPlayersPerTeam) return { allowed: false, reason: `Max ${SQUAD_CONSTRAINTS.maxPlayersPerTeam} players per club` };
    if (player.price > remaining + 0.001) return { allowed: false, reason: `Not enough budget (£${remaining.toFixed(1)}m left)` };
    return { allowed: true };
  }

  const addPlayer = (player: PlayerSnapshot) => {
    const check = canAdd(player);
    if (!check.allowed) return;
    setSquad(prev => [...prev, player]);
  };
  const removePlayer = (playerId: number) => {
    setSquad(prev => prev.filter(p => p.playerId !== playerId));
  };

  // ---- Player pool filtering ----
  const filteredPool = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return allPlayers
      .filter(p => !squadIds.has(p.playerId))
      .filter(p => positionFilter === 'ALL' || normalizePosition(p.position) === positionFilter)
      .filter(p => !query || p.playerName.toLowerCase().includes(query) || p.teamName.toLowerCase().includes(query))
      .sort((a, b) => b.totalProjectedPoints - a.totalProjectedPoints);
  }, [allPlayers, squadIds, positionFilter, searchQuery]);

  // ---- Lineups ----
  const aggregateLineup = useMemo(() => pickBestXI(squad, p => p.totalProjectedPoints), [squad]);
  const gameweekLineups = useMemo(() => {
    const map = new Map<number, ReturnType<typeof pickBestXI>>();
    gameweekList.forEach(gw => map.set(gw, pickBestXI(squad, p => getGameweekPoints(p, gw))));
    return map;
  }, [squad, gameweekList]);

  const renderLineupPitch = (lineup: ReturnType<typeof pickBestXI>, pointsFor: (p: PlayerSnapshot) => number) => {
    if (!lineup) return null;
    const bench = squad.filter(p => !lineup.starting11.some(s => s.playerId === p.playerId));
    const benchGK = bench.filter(p => normalizePosition(p.position) === 'Goalkeeper');
    const benchOutfield = bench.filter(p => normalizePosition(p.position) !== 'Goalkeeper').sort((a, b) => pointsFor(b) - pointsFor(a));
    const orderedBench = [...benchGK, ...benchOutfield];

    const pitchPlayers = lineup.starting11.map((p, i) => toPitchPlayer(p, i + 1, p.playerId === lineup.captain.playerId, p.playerId === lineup.viceCaptain.playerId, pointsFor(p)));
    const benchPitchPlayers = orderedBench.map((p, i) => toPitchPlayer(p, 12 + i, false, false, pointsFor(p)));

    return (
      <div className="space-y-4">
        <div className="bg-muted/30 rounded-lg p-3 md:p-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium text-purple-600 dark:text-purple-400">{lineup.formation}</span>
          <span className="text-muted-foreground">•</span>
          <span className="font-medium">{lineup.totalPoints.toFixed(1)} pts</span>
        </div>
        <div className="-mx-4 md:-mx-6">
          <PitchView players={pitchPlayers} benchPlayers={benchPitchPlayers} />
        </div>
      </div>
    );
  };

  if (bootstrapData && isSeasonEnded(bootstrapData.events)) {
    return (
      <div className="space-y-6">
        <div className="fpl-page-header">
          <div className="fpl-page-header-content">
            <div className="fpl-page-title">
              <UserPlus className="h-5 w-5 sm:h-6 sm:w-6" />
              <h1>Pick Team</h1>
            </div>
            <p className="fpl-page-subtitle">Build a squad from scratch — no login or Manager ID needed</p>
          </div>
        </div>
        <SeasonEndedNotice />
      </div>
    );
  }

  if (isLoadingBootstrap || isLoadingProjections) {
    return (
      <LoadingExperience
        variant="analysis"
        title="Loading Players"
        description="Fetching projected points for every player..."
        steps={[
          { text: "Connecting to projection service", delay: "0s" },
          { text: "Calculating player expected points", delay: "0.3s" },
        ]}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="fpl-page-header">
        <div className="fpl-page-header-content">
          <div className="fpl-page-title">
            <UserPlus className="h-5 w-5 sm:h-6 sm:w-6" />
            <h1>Pick Team</h1>
          </div>
          <p className="fpl-page-subtitle">
            Build your own 15-player squad from scratch, GW{startGameweek}-{endGameweek} — no login or Manager ID needed
          </p>
        </div>
      </div>

      {projectionsError && (
        <Card>
          <CardContent className="py-8 text-center text-red-600">
            Failed to load player data. Please try again.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Squad being built */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-lg">Your Squad</CardTitle>
                  <CardDescription>Pick players from the list on the right to fill your squad</CardDescription>
                </div>
                <Badge variant={isSquadComplete ? "default" : "secondary"}>{squad.length}/{SQUAD_SIZE} players</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                <div className="p-2 bg-muted/30 rounded text-center">
                  <div className={`text-lg font-bold ${remaining < 0 ? 'text-red-600' : 'text-blue-600'}`}>£{remaining.toFixed(1)}m</div>
                  <div className="text-xs text-muted-foreground">Budget Left</div>
                </div>
                <div className="p-2 bg-muted/30 rounded text-center">
                  <div className="text-lg font-bold text-green-600">£{spent.toFixed(1)}m</div>
                  <div className="text-xs text-muted-foreground">Spent</div>
                </div>
                <div className="p-2 bg-muted/30 rounded text-center col-span-2 sm:col-span-1">
                  <div className="text-lg font-bold text-orange-600">
                    {POSITIONS.map(pos => `${positionCounts[pos]}/${POSITION_REQUIRED[pos]}`).join(' • ')}
                  </div>
                  <div className="text-xs text-muted-foreground">GKP • DEF • MID • FWD</div>
                </div>
              </div>

              {squad.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {squad.map(p => (
                    <Badge key={p.playerId} variant="secondary" className="flex items-center gap-1">
                      {playerIdToWebName.get(p.playerId) || p.playerName}
                      <X className="h-3 w-3 cursor-pointer hover:text-red-600" onClick={() => removePlayer(p.playerId)} />
                    </Badge>
                  ))}
                </div>
              )}

              {savedDraftAt && (
                <div className="flex items-center gap-1.5 text-sm text-green-700 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" /> Saved as your GW1 team {new Date(savedDraftAt).toLocaleString()}
                </div>
              )}
              <Button
                className="w-full sm:w-auto"
                disabled={!isSquadComplete || remaining < 0}
                onClick={() => {
                  if (spent > TOTAL_BUDGET) {
                    toast({ variant: "destructive", title: "Squad exceeds £100m", description: "Remove a player or two before saving." });
                    return;
                  }
                  const starting = aggregateLineup?.starting11 ?? [];
                  const startingIds = new Set(starting.map(p => p.playerId));
                  const bench = squad.filter(p => !startingIds.has(p.playerId));
                  const players = [...starting, ...bench].map(p => ({
                    playerId: p.playerId,
                    isStarting: startingIds.has(p.playerId),
                    isCaptain: aggregateLineup?.captain.playerId === p.playerId,
                    isViceCaptain: aggregateLineup?.viceCaptain.playerId === p.playerId,
                  }));
                  savePreseasonDraft({ players, totalValue: spent });
                  setSavedDraftAt(new Date().toISOString());
                  toast({ title: "Saved as your GW1 team!", description: "Recommended Transfers and Transfer Planner will use this squad until your real GW1 team is available." });
                }}
                data-testid="button-save-pick-team-draft"
              >
                <Save className="h-4 w-4 mr-1.5" />
                {savedDraftAt ? "Update My GW1 Team" : "Save as My GW1 Team"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Lineup</CardTitle>
              <CardDescription>
                {isSquadComplete
                  ? `"Set & Forget" is your best XI across GW${startGameweek}-${endGameweek}. Each GW tab shows the best starting XI and captain for that specific gameweek.`
                  : "Add at least 11 players (with a full goalkeeper + outfield spread) to see a suggested lineup."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {aggregateLineup ? (
                <Tabs defaultValue="set-forget" className="w-full">
                  <TabsList className="flex w-full flex-wrap h-auto">
                    <TabsTrigger value="set-forget">Set & Forget</TabsTrigger>
                    {gameweekList.map(gw => (
                      <TabsTrigger key={gw} value={gw.toString()}>GW{gw}</TabsTrigger>
                    ))}
                  </TabsList>
                  <TabsContent value="set-forget">
                    {renderLineupPitch(aggregateLineup, p => p.totalProjectedPoints)}
                  </TabsContent>
                  {gameweekList.map(gw => (
                    <TabsContent key={gw} value={gw.toString()}>
                      {renderLineupPitch(gameweekLineups.get(gw) ?? null, p => getGameweekPoints(p, gw))}
                    </TabsContent>
                  ))}
                </Tabs>
              ) : (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  Your pitch will appear here once you've added enough players.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Player pool */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">All Players</CardTitle>
              <CardDescription>Projected points for GW{startGameweek}-{endGameweek}</CardDescription>
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search player or team..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-8 h-9"
                    data-testid="input-pick-team-search"
                  />
                </div>
                <Select value={positionFilter} onValueChange={setPositionFilter}>
                  <SelectTrigger className="w-full sm:w-28 h-9" data-testid="select-pick-team-position">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All</SelectItem>
                    <SelectItem value="Goalkeeper">GKP</SelectItem>
                    <SelectItem value="Defender">DEF</SelectItem>
                    <SelectItem value="Midfielder">MID</SelectItem>
                    <SelectItem value="Forward">FWD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <TooltipProvider>
                <div className="max-h-[70vh] overflow-y-auto divide-y">
                  {filteredPool.length === 0 && (
                    <div className="p-6 text-center text-sm text-muted-foreground">No players match your search.</div>
                  )}
                  {filteredPool.map(player => {
                    const check = canAdd(player);
                    const row = (
                      <div key={player.playerId} className="flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-muted/30">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium truncate">{playerIdToWebName.get(player.playerId) || player.playerName}</span>
                            <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">{POSITION_SHORT[normalizePosition(player.position)]}</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground truncate">{player.teamName} • £{player.price}m</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-medium">{player.totalProjectedPoints.toFixed(1)} pts</div>
                          <div className="text-xs text-muted-foreground">{player.ownership.toFixed(1)}% owned</div>
                        </div>
                        <Button
                          size="icon"
                          variant={check.allowed ? "default" : "outline"}
                          disabled={!check.allowed}
                          className="h-8 w-8 shrink-0"
                          onClick={() => addPlayer(player)}
                          data-testid={`button-add-player-${player.playerId}`}
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                    if (check.allowed) return row;
                    return (
                      <Tooltip key={player.playerId}>
                        <TooltipTrigger asChild>{row}</TooltipTrigger>
                        <TooltipContent>{check.reason}</TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </TooltipProvider>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
