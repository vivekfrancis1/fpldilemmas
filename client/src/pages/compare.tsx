import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { GitCompareArrows, Search, X, Link2, Check } from "lucide-react";
import { BootstrapData, Fixture, CURRENT_SEASON } from "@shared/schema";
import {
  COMPARE_STATS,
  MAX_COMPARE_PLAYERS,
  bestValueIndexes,
  findHistoricalByCode,
  fixturesForGameweeks,
  parseCompareIds,
  projectionWindow,
} from "@shared/compare-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlayerAvailabilityBadge } from "@/components/player-availability-badge";
import JerseyIcon from "@/components/jersey-icon";
import { getFdrCellClass } from "@/lib/heatmap-colors";

type Element = BootstrapData["elements"][number];

interface PlayerProjection {
  playerId: number;
  gameweekProjections?: Record<string, number>;
  chanceOfPlayingNextRound?: number | null;
  status?: string;
  news?: string;
}

const WINDOW = 5; // upcoming gameweeks shown
const POSITION_BY_TYPE: Record<number, string> = { 1: "Goalkeeper", 2: "Defender", 3: "Midfielder", 4: "Forward" };
const POSITION_SHORT: Record<number, string> = { 1: "GKP", 2: "DEF", 3: "MID", 4: "FWD" };

// Stats the past-season data does not carry, so they are not shown on those tabs.
const CURRENT_ONLY_STATS = new Set(["now_cost", "selected_by_percent", "transfers_in_event", "transfers_out_event"]);

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

function formatStat(key: string, value: number | null): string {
  if (value === null) return "—";
  switch (key) {
    case "now_cost":
      return `£${(value / 10).toFixed(1)}m`;
    case "selected_by_percent":
      return `${value}%`;
    case "influence":
    case "creativity":
    case "threat":
    case "ict_index":
      return value.toFixed(1);
    default:
      return String(value);
  }
}

export default function Compare() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [season, setSeason] = useState<string>("current");
  const [copied, setCopied] = useState(false);

  const ids = useMemo(() => parseCompareIds(new URLSearchParams(search).get("p")), [search]);

  const { data: bootstrap, isLoading: bootstrapLoading, error: bootstrapError } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000,
  });
  const { data: projections } = useQuery<PlayerProjection[]>({
    queryKey: ["/api/cached/player-total-points"],
    staleTime: 5 * 60 * 1000,
  });
  const { data: fixtures } = useQuery<Fixture[]>({
    queryKey: ["/api/fixtures"],
    staleTime: 5 * 60 * 1000,
  });
  const { data: seasons } = useQuery<string[]>({
    queryKey: ["/api/seasons"],
    staleTime: 60 * 60 * 1000,
  });
  const pastSeasons = useMemo(
    () => (seasons ?? []).filter((s) => s !== CURRENT_SEASON).sort((a, b) => b.localeCompare(a)),
    [seasons],
  );

  // Past-season rows are fetched only for the tab being viewed.
  const { data: historical, isLoading: historicalLoading } = useQuery<any[]>({
    queryKey: ["/api/players/historical", season],
    queryFn: async () => {
      const res = await fetch(`/api/players/historical/${encodeURIComponent(season)}`);
      if (!res.ok) throw new Error("Failed to load season");
      return res.json();
    },
    enabled: season !== "current",
    staleTime: 60 * 60 * 1000,
  });

  const teams = bootstrap?.teams ?? [];
  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const projectionById = useMemo(
    () => new Map((projections ?? []).map((p) => [p.playerId, p])),
    [projections],
  );

  const selected = useMemo(() => {
    if (!bootstrap) return [] as Element[];
    const byId = new Map(bootstrap.elements.map((e) => [e.id, e]));
    return ids.map((id) => byId.get(id)).filter((e): e is Element => !!e);
  }, [bootstrap, ids]);

  const setIds = (next: number[]) => {
    navigate(next.length ? `/compare?p=${next.join(",")}` : "/compare", { replace: true });
  };

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!bootstrap || q.length < 2) return [];
    return bootstrap.elements
      .filter(
        (e) =>
          !ids.includes(e.id) &&
          (e.web_name.toLowerCase().includes(q) ||
            e.first_name.toLowerCase().includes(q) ||
            e.second_name.toLowerCase().includes(q) ||
            `${e.first_name} ${e.second_name}`.toLowerCase().includes(q)),
      )
      .sort((a, b) => b.total_points - a.total_points)
      .slice(0, 8);
  }, [bootstrap, query, ids]);

  const addPlayer = (id: number) => {
    if (ids.length >= MAX_COMPARE_PLAYERS) return;
    setIds([...ids, id]);
    setQuery("");
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable: the address bar already holds the shareable URL */
    }
  };

  // The same gameweeks for every player: the first WINDOW gameweeks present in any selected projection.
  const windowGameweeks = useMemo(() => {
    const all = new Set<number>();
    for (const e of selected) {
      const proj = projectionById.get(e.id)?.gameweekProjections;
      if (proj) Object.keys(proj).forEach((k) => all.add(Number(k)));
    }
    return Array.from(all).sort((a, b) => a - b).slice(0, WINDOW);
  }, [selected, projectionById]);

  const isCurrent = season === "current";
  const stats = COMPARE_STATS.filter((s) => isCurrent || !CURRENT_ONLY_STATS.has(s.key));

  const statValue = (e: Element, key: string): number | null => {
    if (isCurrent) return toNumber((e as any)[key]);
    const row = findHistoricalByCode(historical, e.code);
    return row ? toNumber(row[key]) : null;
  };
  const hasSeasonRow = (e: Element) => isCurrent || !!findHistoricalByCode(historical, e.code);

  if (bootstrapError) {
    return (
      <div className="min-h-screen">
        <div className="w-full py-4 sm:py-8">
          <Card><CardContent className="p-6">Failed to load player data. Please try again shortly.</CardContent></Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="w-full py-4 sm:py-8">
        <div className="fpl-page-header">
          <div className="fpl-page-header-content">
            <div className="fpl-page-title">
              <GitCompareArrows />
              <h1 data-testid="text-page-title">Compare Players</h1>
            </div>
            <div className="fpl-page-actions">
              <Button
                variant="outline"
                size="sm"
                onClick={copyLink}
                disabled={selected.length === 0}
                className="flex items-center gap-2"
                data-testid="button-copy-link"
              >
                {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                {copied ? "Link copied" : "Copy link"}
              </Button>
            </div>
            <p className="fpl-page-subtitle">
              Compare up to {MAX_COMPARE_PLAYERS} players: upcoming fixtures, our expected points and season stats.
            </p>
          </div>
        </div>

        <Card className="mb-4">
          <CardContent className="p-4 space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  ids.length >= MAX_COMPARE_PLAYERS ? "Remove a player to add another" : "Search a player to add…"
                }
                disabled={ids.length >= MAX_COMPARE_PLAYERS || bootstrapLoading}
                className="pl-9"
                data-testid="input-player-search"
              />
              {suggestions.length > 0 && (
                <ul className="absolute z-20 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
                  {suggestions.map((e) => (
                    <li key={e.id}>
                      <button
                        type="button"
                        onClick={() => addPlayer(e.id)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                        data-testid={`option-player-${e.id}`}
                      >
                        <JerseyIcon team={teamById.get(e.team)?.name} position={POSITION_BY_TYPE[e.element_type]} />
                        <span className="font-medium">{e.web_name}</span>
                        <span className="text-muted-foreground">
                          {teamById.get(e.team)?.short_name} · {POSITION_SHORT[e.element_type]}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {selected.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selected.map((e) => (
                  <Badge key={e.id} variant="secondary" className="flex items-center gap-1.5 py-1 pl-2 pr-1 text-sm">
                    <JerseyIcon team={teamById.get(e.team)?.name} position={POSITION_BY_TYPE[e.element_type]} />
                    {e.web_name}
                    <button
                      type="button"
                      onClick={() => setIds(ids.filter((id) => id !== e.id))}
                      aria-label={`Remove ${e.web_name}`}
                      className="rounded p-0.5 hover:bg-background"
                      data-testid={`button-remove-${e.id}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Search above to add players. Pick at least two to compare them side by side.
              </p>
            )}
          </CardContent>
        </Card>

        {selected.length > 0 && (
          <>
            <Card className="mb-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Upcoming fixtures &amp; expected points</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0 sm:p-0">
                {windowGameweeks.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">
                    {projections ? "No upcoming projections available yet." : "Loading projections…"}
                  </p>
                ) : (
                  <table className="w-full min-w-[560px] text-sm" data-testid="table-upcoming">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="sticky left-0 bg-card p-2 text-left font-medium">Player</th>
                        {windowGameweeks.map((gw) => (
                          <th key={gw} className="p-2 text-center font-medium">GW{gw}</th>
                        ))}
                        <th className="p-2 text-center font-medium">Total xPts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const windows = selected.map((e) =>
                          projectionWindow(projectionById.get(e.id)?.gameweekProjections, windowGameweeks),
                        );
                        const bestTotals = bestValueIndexes(windows.map((w) => w.total), "higher");
                        return selected.map((e, row) => {
                          const w = windows[row];
                          const perTeam = fixtures
                            ? fixturesForGameweeks(e.team, fixtures as any, windowGameweeks)
                            : [];
                          const proj = projectionById.get(e.id);
                          return (
                            <tr key={e.id} className="border-b last:border-0 align-top">
                              <td className="sticky left-0 bg-card p-2 font-medium whitespace-nowrap">
                                {e.web_name}
                                <span className="ml-1 text-xs text-muted-foreground">
                                  {teamById.get(e.team)?.short_name}
                                </span>
                                {proj && <PlayerAvailabilityBadge player={proj} compact />}
                              </td>
                              {windowGameweeks.map((gw, i) => {
                                const gwFixtures = perTeam[i]?.fixtures ?? [];
                                return (
                                  <td key={gw} className="p-2 text-center">
                                    <div className="font-semibold">
                                      {w.perGameweek[i] === null ? "—" : w.perGameweek[i]!.toFixed(1)}
                                    </div>
                                    <div className="mt-1 flex flex-col items-center gap-0.5">
                                      {fixtures && gwFixtures.length === 0 && (
                                        <span className="text-xs text-muted-foreground">No fixture</span>
                                      )}
                                      {gwFixtures.map((f, k) => (
                                        <span
                                          key={k}
                                          className={`rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap ${getFdrCellClass(f.difficulty)}`}
                                        >
                                          {teamById.get(f.opponentId)?.short_name ?? "?"} ({f.isHome ? "H" : "A"})
                                        </span>
                                      ))}
                                    </div>
                                  </td>
                                );
                              })}
                              <td
                                className={`p-2 text-center font-semibold ${bestTotals.includes(row) ? "bg-primary/10 text-primary" : ""}`}
                              >
                                {w.total === null ? "—" : w.total.toFixed(1)}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Season stats</CardTitle>
                <Tabs value={season} onValueChange={setSeason} className="w-full overflow-x-auto">
                  <TabsList>
                    <TabsTrigger value="current">{CURRENT_SEASON}</TabsTrigger>
                    {pastSeasons.map((s) => (
                      <TabsTrigger key={s} value={s}>{s}</TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0 sm:p-0">
                {!isCurrent && historicalLoading ? (
                  <p className="p-4 text-sm text-muted-foreground">Loading {season}…</p>
                ) : (
                  <table className="w-full min-w-[420px] text-sm" data-testid="table-stats">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="sticky left-0 bg-card p-2 text-left font-medium">Stat</th>
                        {selected.map((e) => (
                          <th key={e.id} className="p-2 text-center font-medium">
                            {e.web_name}
                            {!hasSeasonRow(e) && (
                              <div className="text-xs font-normal">No data</div>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {stats.map((stat) => {
                        const values = selected.map((e) => statValue(e, stat.key));
                        const best = stat.better ? bestValueIndexes(values, stat.better) : [];
                        return (
                          <tr key={stat.key} className="border-b last:border-0">
                            <td className="sticky left-0 bg-card p-2 font-medium whitespace-nowrap">{stat.label}</td>
                            {values.map((v, i) => (
                              <td
                                key={selected[i].id}
                                className={`p-2 text-center ${best.includes(i) ? "bg-primary/10 font-semibold text-primary" : ""}`}
                              >
                                {formatStat(stat.key, v)}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
                <p className="p-3 text-xs text-muted-foreground">
                  Highlighted = best value in the row (lowest for goals conceded, cards, own goals and missed
                  penalties). Past seasons are matched by FPL player code, so a player with no record that season
                  shows “No data”. Expected points come from the same projections as the Points page.
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
