import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { GitCompareArrows, Search, X, Link2, Check, CalendarRange, Radar, ListChecks, UserPlus } from "lucide-react";
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
import {
  MAX_RADAR_AXES,
  MIN_RADAR_AXES,
  MIN_RADAR_MINUTES,
  RADAR_AXES,
  buildRadarSeries,
  encodeRadarAxes,
  parseRadarAxes,
} from "@shared/compare-radar";
import { shareFileName } from "@shared/share-cards";
import { DEFAULT_COMPARISON_SIZE, trendingIn, type PickElement } from "@shared/default-picks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShareImageButton } from "@/components/share-image-button";
import CompareRadarChart, { RADAR_CARD_THEME, RADAR_COLORS, RADAR_SCREEN_THEME } from "@/components/compare-radar-chart";
import { PlayerAvailabilityBadge } from "@/components/player-availability-badge";
import JerseyIcon from "@/components/jersey-icon";
import { getFdrCellClass } from "@/lib/heatmap-colors";
import { Pill, PosChip, SectionCard, TeamChip, asPos } from "@/components/tool-ui";

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
  const axisKeys = useMemo(() => parseRadarAxes(new URLSearchParams(search).get("a")), [search]);

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

  const goTo = (nextIds: number[], nextAxes: string[]) => {
    if (!nextIds.length) return navigate("/compare", { replace: true });
    const a = encodeRadarAxes(nextAxes);
    navigate(`/compare?p=${nextIds.join(",")}${a ? `&a=${a}` : ""}`, { replace: true });
  };
  const setIds = (next: number[]) => goTo(next, axisKeys);
  const toggleAxis = (key: string) => {
    const on = axisKeys.includes(key);
    if (on && axisKeys.length <= MIN_RADAR_AXES) return;
    if (!on && axisKeys.length >= MAX_RADAR_AXES) return;
    goTo(ids, on ? axisKeys.filter((k) => k !== key) : [...axisKeys, key]);
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

  // With nothing chosen, open on the three most transferred-in players this gameweek, so the page is never an empty form.
  // Only on arrival: once the person adds or removes anyone, their choice stands (even an empty one).
  const defaulted = useRef(false);
  useEffect(() => {
    if (defaulted.current || !bootstrap) return;
    defaulted.current = true;
    if (ids.length > 0) return;
    const picks = trendingIn(bootstrap.elements as unknown as PickElement[], DEFAULT_COMPARISON_SIZE);
    if (picks.length >= 2) navigate(`/compare?p=${picks.join(",")}`, { replace: true });
  }, [bootstrap, ids.length, navigate]);

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

  const radar = useMemo(
    () =>
      buildRadarSeries(
        selected.map((e) => {
          const w = projectionWindow(projectionById.get(e.id)?.gameweekProjections, windowGameweeks);
          const count = w.perGameweek.filter((v) => v !== null).length;
          return { id: e.id, element: e as any, xptsPerGw: w.total !== null && count ? w.total / count : null };
        }),
        axisKeys,
      ),
    [selected, projectionById, windowGameweeks, axisKeys],
  );
  const radarNames = selected.map((e) => e.web_name);
  const radarValueText = (i: number, v: number | null) => (v === null ? "—" : v.toFixed(radar.axes[i].decimals));

  const renderRadarShareCard = () => (
    <div
      style={{
        width: 1080, height: 1350, boxSizing: "border-box", padding: "40px 36px 28px", display: "flex", flexDirection: "column",
        background: "linear-gradient(170deg, #0b1020 0%, #121936 100%)", color: "#f8fafc", border: "6px solid #fbbf24",
        fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif", overflow: "hidden",
      }}
    >
      <div style={{ fontSize: 46, fontWeight: 900, lineHeight: 1.1, letterSpacing: 0.5, textTransform: "uppercase" }}>Player profile</div>
      <div style={{ fontSize: 22, color: "#94a3b8", marginTop: 10 }}>
        2026/27 season · outer ring = best of these players · per-90 stats need {MIN_RADAR_MINUTES}+ minutes
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 26px", marginTop: 20 }}>
        {radarNames.map((name, k) => (
          <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 10, fontSize: 30, fontWeight: 800 }}>
            <span style={{ width: 22, height: 22, borderRadius: 999, background: RADAR_COLORS[k] }} />
            {name}
          </span>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
        <CompareRadarChart size={600} fontSize={24} axes={radar.axes} series={radar.series} colors={RADAR_COLORS} names={radarNames} theme={RADAR_CARD_THEME} />
      </div>
      <div style={{ marginTop: 6, background: "rgba(255,255,255,0.06)", borderRadius: 18, padding: "10px 20px" }}>
        {radar.axes.map((a, i) => (
          <div key={a.key} style={{ display: "flex", alignItems: "center", fontSize: 21, lineHeight: 1.5 }}>
            <span style={{ flex: 1, color: "#cbd5e1", fontWeight: 600 }}>{a.label}</span>
            {radar.series.map((sr, k) => (
              <span key={sr.id} style={{ width: 110, textAlign: "right", fontWeight: 800, color: RADAR_COLORS[k] }}>{radarValueText(i, sr.raw[i])}</span>
            ))}
          </div>
        ))}
      </div>
      <div style={{ marginTop: "auto", fontSize: 22, color: "#94a3b8", display: "flex", justifyContent: "space-between" }}>
        <span>fpldilemmas.com/compare</span>
        <span>FPL data + our projections</span>
      </div>
    </div>
  );

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

        <section className="mb-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-indigo-500" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                ids.length >= MAX_COMPARE_PLAYERS ? "Remove a player to add another" : "Search a player to add…"
              }
              disabled={ids.length >= MAX_COMPARE_PLAYERS || bootstrapLoading}
              className="h-12 rounded-xl border-gray-200 bg-gray-50/70 pl-11 text-base"
              data-testid="input-player-search"
            />
            {suggestions.length > 0 && (
              <ul className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-xl">
                {suggestions.map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => addPlayer(e.id)}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-accent"
                      data-testid={`option-player-${e.id}`}
                    >
                      <JerseyIcon team={teamById.get(e.team)?.short_name} position={POSITION_SHORT[e.element_type]} className="h-8 w-8 shrink-0 object-contain" />
                      <span className="font-bold">{e.web_name}</span>
                      <TeamChip>{teamById.get(e.team)?.short_name}</TeamChip>
                      <PosChip pos={asPos(POSITION_SHORT[e.element_type])} />
                      <span className="ml-auto text-xs text-muted-foreground">£{(e.now_cost / 10).toFixed(1)}m · {e.selected_by_percent}% owned</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {selected.length > 0 ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5" data-testid="selected-players">
              {selected.map((e, k) => {
                const team = teamById.get(e.team);
                return (
                  <div
                    key={e.id}
                    className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-b from-gray-50/80 to-white p-3.5 shadow-sm"
                    data-testid={`player-card-${e.id}`}
                  >
                    <span className="absolute inset-x-0 top-0 h-1.5" style={{ background: RADAR_COLORS[k] }} />
                    <button
                      type="button"
                      onClick={() => setIds(ids.filter((id) => id !== e.id))}
                      aria-label={`Remove ${e.web_name}`}
                      className="absolute right-2 top-3 rounded-full p-1 text-gray-400 hover:bg-gray-200/70 hover:text-gray-700"
                      data-testid={`button-remove-${e.id}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <div className="flex items-center gap-3 pt-1.5">
                      <JerseyIcon team={team?.short_name} position={POSITION_BY_TYPE[e.element_type]} className="h-14 w-14 shrink-0 object-contain" />
                      <div className="min-w-0 pr-5">
                        <div className="truncate text-base font-extrabold leading-tight text-gray-900">{e.web_name}</div>
                        <div className="mt-1 flex items-center gap-1">
                          <TeamChip>{team?.short_name}</TeamChip>
                          <PosChip pos={asPos(POSITION_SHORT[e.element_type])} />
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
                      {[
                        ["Price", `£${(e.now_cost / 10).toFixed(1)}m`],
                        ["Owned", `${e.selected_by_percent}%`],
                        ["Form", String(e.form)],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-lg bg-gray-100/80 px-1 py-1.5">
                          <div className="text-sm font-bold tabular-nums text-gray-900">{value}</div>
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {ids.length < MAX_COMPARE_PLAYERS && (
                <div className="flex min-h-[132px] items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 text-sm font-semibold text-gray-400">
                  <UserPlus className="mr-2 h-5 w-5" /> Add another player
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50/60 px-4 py-5 text-sm text-gray-600">
              <UserPlus className="h-6 w-6 shrink-0 text-indigo-500" />
              Search above to add players. Pick at least two to compare them side by side.
            </div>
          )}
        </section>

        {selected.length > 0 && (
          <>
            <SectionCard
              icon={CalendarRange}
              title="Upcoming fixtures & expected points"
              subtitle="Our projection for each gameweek, with the fixture difficulty underneath"
              className="mb-5"
              bodyClassName="overflow-x-auto p-0"
            >
                {windowGameweeks.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">
                    {projections ? "No upcoming projections available yet." : "Loading projections…"}
                  </p>
                ) : (
                  <table className="w-full min-w-[560px] text-sm" data-testid="table-upcoming">
                    <thead>
                      <tr className="border-b bg-gray-50/70 text-xs uppercase tracking-wide text-gray-500">
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
                        const maxCell = Math.max(0, ...windows.flatMap((w) => w.perGameweek.filter((v): v is number => v !== null)));
                        return selected.map((e, row) => {
                          const w = windows[row];
                          const perTeam = fixtures
                            ? fixturesForGameweeks(e.team, fixtures as any, windowGameweeks)
                            : [];
                          const proj = projectionById.get(e.id);
                          return (
                            <tr key={e.id} className="border-b last:border-0 align-top odd:bg-gray-50/40">
                              <td className="sticky left-0 z-10 bg-card p-2 whitespace-nowrap">
                                <span className="flex items-center gap-2">
                                  <span className="h-8 w-1.5 shrink-0 rounded-full" style={{ background: RADAR_COLORS[row] }} />
                                  <JerseyIcon team={teamById.get(e.team)?.short_name} position={POSITION_BY_TYPE[e.element_type]} className="h-8 w-8 shrink-0 object-contain" />
                                  <span>
                                    <span className="block text-sm font-bold text-gray-900">{e.web_name}</span>
                                    <span className="text-xs text-muted-foreground">{teamById.get(e.team)?.short_name}</span>
                                  </span>
                                  {proj && <PlayerAvailabilityBadge player={proj} compact />}
                                </span>
                              </td>
                              {windowGameweeks.map((gw, i) => {
                                const gwFixtures = perTeam[i]?.fixtures ?? [];
                                return (
                                  <td key={gw} className="p-2 text-center">
                                    <div
                                      className="mx-auto w-fit min-w-[44px] rounded-lg px-2 py-0.5 text-base font-extrabold tabular-nums text-gray-900"
                                      style={{ background: w.perGameweek[i] === null ? undefined : `rgba(99,102,241,${(0.06 + 0.26 * (w.perGameweek[i]! / Math.max(0.1, maxCell))).toFixed(3)})` }}
                                    >
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
                              <td className="p-2 text-center">
                                <span
                                  className={`inline-flex min-w-[52px] items-center justify-center gap-1 rounded-full px-2.5 py-1 text-base font-extrabold tabular-nums ${
                                    bestTotals.includes(row) ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-sm" : "text-gray-900"
                                  }`}
                                >
                                  {w.total === null ? "—" : w.total.toFixed(1)}
                                </span>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                )}
            </SectionCard>

            <SectionCard
              icon={Radar}
              title="Player profile"
              subtitle={<>The outer ring is the best of these players on each stat. This season only; per-90 stats need {MIN_RADAR_MINUTES}+ minutes.</>}
              className="mb-5"
              testId="card-radar"
              bodyClassName="space-y-4 p-4 sm:p-5"
              action={
                <ShareImageButton
                  renderCard={renderRadarShareCard}
                  title="Player profile"
                  width={1080}
                  height={1350}
                  fileName={shareFileName(["compare", ...radarNames])}
                />
              }
            >
                <div className="flex flex-wrap gap-1.5" data-testid="radar-axis-chips">
                  {RADAR_AXES.map((a) => {
                    const on = axisKeys.includes(a.key);
                    return (
                      <button
                        key={a.key}
                        type="button"
                        onClick={() => toggleAxis(a.key)}
                        aria-pressed={on}
                        title={a.label}
                        className={`rounded-full border px-3 py-1 text-xs font-bold transition-colors ${
                          on ? "border-transparent bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-sm" : "border-gray-200 text-gray-600 hover:bg-gray-100"
                        }`}
                        data-testid={`chip-axis-${a.key}`}
                      >
                        {a.short}
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {selected.map((e, k) => (
                    <span key={e.id} className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-sm font-bold text-gray-900">
                      <span className="inline-block h-3 w-3 rounded-full" style={{ background: RADAR_COLORS[k] }} />
                      {e.web_name}
                    </span>
                  ))}
                </div>
                <div className="mx-auto w-full max-w-[760px]">
                  <CompareRadarChart
                    size={520}
                    fontSize={13}
                    axes={radar.axes}
                    series={radar.series}
                    colors={RADAR_COLORS}
                    names={radarNames}
                    theme={RADAR_SCREEN_THEME}
                  />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[320px] text-sm" data-testid="table-radar-values">
                    <tbody>
                      {radar.axes.map((a, i) => (
                        <tr key={a.key} className="border-t first:border-t-0">
                          <td className="py-1.5 pr-2 text-muted-foreground whitespace-nowrap">{a.label}</td>
                          {radar.series.map((sr, k) => (
                            <td key={sr.id} className="py-1.5 px-2 text-right font-semibold" style={{ color: RADAR_COLORS[k] }}>
                              {radarValueText(i, sr.raw[i])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            </SectionCard>

            <SectionCard
              icon={ListChecks}
              title="Season stats"
              subtitle="The best value in each row is highlighted"
              bodyClassName="overflow-x-auto p-0"
              action={
                <Tabs value={season} onValueChange={setSeason} className="max-w-full overflow-x-auto">
                  <TabsList>
                    <TabsTrigger value="current">{CURRENT_SEASON}</TabsTrigger>
                    {pastSeasons.map((s) => (
                      <TabsTrigger key={s} value={s}>{s}</TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              }
            >
                {!isCurrent && historicalLoading ? (
                  <p className="p-4 text-sm text-muted-foreground">Loading {season}…</p>
                ) : (
                  <table className="w-full min-w-[420px] text-sm" data-testid="table-stats">
                    <thead>
                      <tr className="border-b bg-gray-50/70 text-xs uppercase tracking-wide text-gray-500">
                        <th className="sticky left-0 z-10 bg-card p-2.5 text-left font-semibold">Stat</th>
                        {selected.map((e, k) => (
                          <th key={e.id} className="p-2.5 text-center font-bold" style={{ boxShadow: `inset 0 -3px 0 0 ${RADAR_COLORS[k]}` }}>
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
                          <tr key={stat.key} className="border-b last:border-0 odd:bg-gray-50/40">
                            <td className="sticky left-0 z-10 bg-card p-2.5 text-sm font-semibold whitespace-nowrap text-gray-700">{stat.label}</td>
                            {values.map((v, i) => (
                              <td key={selected[i].id} className="p-2.5 text-center tabular-nums">
                                {best.includes(i) ? (
                                  <span className="inline-flex min-w-[48px] justify-center rounded-full bg-emerald-500/15 px-2.5 py-0.5 font-extrabold text-emerald-700 dark:text-emerald-300">
                                    {formatStat(stat.key, v)}
                                  </span>
                                ) : (
                                  <span className="font-semibold text-gray-900">{formatStat(stat.key, v)}</span>
                                )}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
                <p className="p-4 text-xs text-muted-foreground">
                  Highlighted = best value in the row (lowest for goals conceded, cards, own goals and missed
                  penalties). Past seasons are matched by FPL player code, so a player with no record that season
                  shows “No data”. Expected points come from the same projections as the Points page.
                </p>
            </SectionCard>
          </>
        )}
      </div>
    </div>
  );
}
