import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeftRight, Check, ChartScatter, Download, Link2, Search, SlidersHorizontal, Star, TrendingDown, TrendingUp, X } from "lucide-react";
import { BootstrapData } from "@shared/schema";
import { getDefaultGameweekRange } from "@shared/gameweek-utils";
import { compareUrl } from "@shared/compare-utils";
import {
  PLOT_POSITIONS,
  PLOT_STATS,
  STAT_GROUPS,
  buildPlotPlayers,
  decodePlotState,
  encodePlotState,
  filterPlayers,
  findPreset,
  formatStatValue,
  getStat,
  median,
  COLOR_MODES,
  SIZE_MODES,
  colorLegend,
  fitLine,
  mineRows,
  plotCsv,
  parseManagerId,
  plotTitle,
  presetsForPositions,
  quadrantPicks,
  trendOutliers,
  withMine,
  type ColorMode,
  type SizeMode,
  stateForPosition,
  stateForPreset,
  topByStat,
  type PlotElement,
  type PlotPlayer,
  type PlotPosition,
  type PlotProjection,
  type PlotState,
  type ScaleKind,
  type TeamProjection,
} from "@shared/player-plot";
import { shareFileName } from "@shared/share-cards";
import { csvFileName } from "@shared/csv";
import JerseyIcon from "@/components/jersey-icon";
import { IconTile, PosChip, SectionCard, SegmentedControl, TeamChip, asPos } from "@/components/tool-ui";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShareImageButton } from "@/components/share-image-button";
import PlayerPlotChart, { CARD_THEME, SCREEN_THEME } from "@/components/player-plot-chart";
import { teamColor } from "@/lib/team-colors";
import { getJerseyUrl } from "@/lib/jersey";
import { readToolManagerId, saveToolManagerId } from "@/lib/manager-id-storage";
import badge from "@/assets/fpl-dilemmas-badge.png?inline";

const PROJECTION_WEEKS = 4;
const MIN_MINUTES_OPTIONS = [0, 90, 180, 300, 450, 600];
const MAX_PRICE_OPTIONS = [5, 6, 7, 8, 10, 12];
const TOP_OPTIONS = [10, 15, 24, 40, 60, 100];
const POSITION_LABEL: Record<PlotPosition, string> = { GKP: "GKP", DEF: "DEF", MID: "MID", FWD: "FWD" };

function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(Math.round(el.getBoundingClientRect().width));
    update();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

// Share-image chart: takes whatever height the card has left (the title and chips can wrap to a different
// number of lines), measured once the card is laid out, so it never runs into the lists or footer below it.
function FillChart(props: Omit<ComponentProps<typeof PlayerPlotChart>, "width" | "height">) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 1008, height: 700 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) setSize({ width: Math.round(r.width), height: Math.floor(r.height) });
  }, []);
  return (
    <div ref={ref} style={{ position: "relative", flex: 1, minHeight: 0, marginTop: 16 }}>
      <div style={{ position: "absolute", inset: 0 }}>
        <PlayerPlotChart {...props} width={size.width} height={size.height} />
      </div>
    </div>
  );
}

function StatSelect({ value, onChange, label, testId }: { value: string; onChange: (key: string) => void; label: string; testId: string }) {
  return (
    <div className="flex-1 min-w-0 space-y-1">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full" data-testid={testId}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-[60vh]">
          {STAT_GROUPS.map((group) => (
            <SelectGroup key={group}>
              <SelectLabel>{group}</SelectLabel>
              {PLOT_STATS.filter((s) => s.group === group).map((s) => (
                <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ScaleToggle({ value, onChange, label, testId }: { value: ScaleKind; onChange: (v: ScaleKind) => void; label: string; testId: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-gray-600">{label}</span>
      <div className="inline-flex rounded-lg border border-gray-200 p-0.5 text-xs" role="group" aria-label={`${label} scale`}>
        {(["linear", "sqrt"] as ScaleKind[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => onChange(k)}
            aria-pressed={value === k}
            className={`rounded-md px-2.5 py-1 font-medium ${value === k ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
            data-testid={`${testId}-${k}`}
          >
            {k === "linear" ? "Linear" : "Stretched"}
          </button>
        ))}
      </div>
    </div>
  );
}

function SmallSelect({ label, value, onChange, options, testId }: { label: string; value: string; onChange: (v: string) => void; options: Array<{ value: string; label: string }>; testId: string }) {
  return (
    <div className="space-y-1 min-w-0">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full" data-testid={testId}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-[60vh]">
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function PlayerPlotPage() {
  const [state, setState] = useState<PlotState>(() => decodePlotState(typeof window !== "undefined" ? window.location.search : ""));
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(() => typeof window !== "undefined" && window.innerWidth >= 768);
  const [copied, setCopied] = useState(false);
  const [chartRef, chartWidth] = useElementWidth<HTMLDivElement>();

  const { data: bootstrap, isLoading: bootstrapLoading, error: bootstrapError } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000,
  });
  const { data: projections, isLoading: projectionsLoading } = useQuery<PlotProjection[]>({
    queryKey: ["/api/cached/player-total-points"],
    staleTime: 5 * 60 * 1000,
  });

  // keep the address bar in step with the controls, so the current plot can be shared as a link
  useEffect(() => {
    const qs = encodePlotState(state);
    window.history.replaceState(window.history.state, "", qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
  }, [state]);

  const update = (patch: Partial<PlotState>) => setState((s) => ({ ...s, ...patch }));

  const defaultRange = useMemo(() => {
    if (!bootstrap?.events) return { from: 1, to: PROJECTION_WEEKS };
    const r = getDefaultGameweekRange(bootstrap.events as any, PROJECTION_WEEKS);
    return { from: parseInt(r.startGameweek, 10), to: parseInt(r.endGameweek, 10) };
  }, [bootstrap?.events]);
  const fromGW = state.from || defaultRange.from;
  const toGW = Math.max(fromGW, state.to || defaultRange.to);

  const teams = bootstrap?.teams ?? [];
  const teamShortById = useMemo(() => new Map(teams.map((t) => [t.id, t.short_name])), [teams]);

  // Team fixture stats (our projected team goals / clean-sheet chance over the range) come from the team projection
  // endpoints; they are fetched only when one of them is on an axis.
  const needsTeamData = getStat(state.x)?.group === "Team fixtures" || getStat(state.y)?.group === "Team fixtures";
  const { data: teamGoals, isLoading: teamGoalsLoading } = useQuery<TeamProjection[]>({
    queryKey: [`/api/team-goal-projections?startGameweek=${fromGW}&endGameweek=${toGW}`],
    enabled: needsTeamData,
    staleTime: 30 * 60 * 1000,
  });
  const { data: teamCs, isLoading: teamCsLoading } = useQuery<Array<{ id: number; gameweekProjections: Record<string, number> }>>({
    queryKey: [`/api/team-cs-projections?startGameweek=${fromGW}&endGameweek=${toGW}`],
    enabled: needsTeamData,
    staleTime: 30 * 60 * 1000,
  });
  const teamProjections = useMemo(
    () => ({ goals: teamGoals ?? [], cs: (teamCs ?? []).map((t) => ({ teamId: t.id, gameweekProjections: t.gameweekProjections })) }),
    [teamGoals, teamCs],
  );

  const allPlayers = useMemo(
    () =>
      bootstrap
        ? buildPlotPlayers({
            elements: bootstrap.elements as unknown as PlotElement[],
            projections: projections ?? [],
            teamShortById,
            fromGW,
            toGW,
            teamProjections,
          })
        : [],
    [bootstrap, projections, teamShortById, fromGW, toGW, teamProjections],
  );

  const filtered = useMemo(
    () =>
      filterPlayers(allPlayers, {
        positions: state.positions,
        teamIds: state.teamIds,
        minMinutes: state.minMinutes,
        maxPrice: state.maxPrice,
        ownershipMin: null,
        ownershipMax: null,
      }).filter((p) => p.values[state.x] != null),
    [allPlayers, state.positions, state.teamIds, state.minMinutes, state.maxPrice, state.x],
  );

  const searchMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [] as PlotPlayer[];
    return filtered.filter((p) => p.values[state.y] != null && p.name.toLowerCase().includes(q)).slice(0, 5);
  }, [query, filtered, state.y]);
  const highlightIds = useMemo(() => new Set(searchMatches.map((p) => p.id)), [searchMatches]);

  const shown = useMemo(() => {
    const top = topByStat(filtered, state.y, state.top);
    const ids = new Set(top.map((p) => p.id));
    return [...top, ...searchMatches.filter((p) => !ids.has(p.id))];
  }, [filtered, state.y, state.top, searchMatches]);

  // Your squad (from the team ID in the link): ringed on the chart and always plotted, even when a filter or Top N drops it.
  const [mineInput, setMineInput] = useState(() => state.mine || readToolManagerId());
  const { data: mineTeam, isFetching: mineLoading, error: mineError } = useQuery<{ picks?: Array<{ element: number }> }>({
    queryKey: ["/api/manager", state.mine, "team"],
    enabled: !!state.mine,
    retry: false,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const res = await fetch(`/api/manager/${encodeURIComponent(state.mine)}/team`);
      if (!res.ok) throw new Error("We couldn't find that team. Check the ID and try again.");
      return res.json();
    },
  });
  const mineIds = useMemo(() => new Set((mineTeam?.picks ?? []).map((p) => p.element)), [mineTeam]);
  const plotted = useMemo(() => withMine(shown, allPlayers, mineIds, state.x, state.y), [shown, allPlayers, mineIds, state.x, state.y]);
  const trendLine = useMemo(
    () =>
      state.trend
        ? fitLine(plotted.filter((p) => p.values[state.x] != null && p.values[state.y] != null).map((p) => ({ x: p.values[state.x] as number, y: p.values[state.y] as number })))
        : null,
    [plotted, state.trend, state.x, state.y],
  );
  const outliers = useMemo(() => (trendLine ? trendOutliers(plotted, state.x, state.y, trendLine, 3) : null), [plotted, trendLine, state.x, state.y]);
  const mineList = useMemo(() => mineRows(allPlayers, mineIds, state.x, state.y, new Set(plotted.map((p) => p.id))), [allPlayers, mineIds, state.x, state.y, plotted]);
  const downloadCsv = () => {
    const blob = new Blob(["\uFEFF" + plotCsv(plotted, state.x, state.y, mineIds)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = csvFileName(["fpl-dilemmas", "player-plot", state.y, "vs", state.x], new Date().toISOString().slice(0, 10));
    a.click();
    URL.revokeObjectURL(url);
  };
  // A team ID saved by any tool (Rate My Team, Hindsight, League Ownership, Graphics Maker...) is used automatically on
  // arrival, unless the link already names a team. Clearing it afterwards sticks for the visit.
  const autoMine = useRef(false);
  useEffect(() => {
    if (autoMine.current) return;
    autoMine.current = true;
    const saved = parseManagerId(readToolManagerId());
    if (saved && !state.mine) setState((st) => ({ ...st, mine: saved }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const applyMine = () => {
    const id = parseManagerId(mineInput);
    if (!id) return;
    saveToolManagerId(id);
    update({ mine: id });
  };

  const selected = selectedId !== null ? allPlayers.find((p) => p.id === selectedId) ?? null : null;
  const xDef = getStat(state.x);
  const yDef = getStat(state.y);
  const preset = findPreset(state);
  const presets = presetsForPositions(state.positions);
  const goodCorners = preset?.goodTopLeft !== false;
  const usesHorizon = !!xDef?.usesHorizon || !!yDef?.usesHorizon;
  const title = plotTitle(state);

  const phone = chartWidth > 0 && chartWidth < 520;
  const chartHeight = chartWidth ? Math.round(Math.min(phone ? chartWidth * 1.15 : chartWidth * 0.6, phone ? 520 : 640)) : 400;
  const fontSize = phone ? 10 : 12;

  const horizonLabel = `GW${fromGW}${toGW !== fromGW ? `–GW${toGW}` : ""}`;
  const gwOptions = useMemo(() => {
    const set = new Set<number>();
    for (let g = Math.min(defaultRange.from, fromGW); g <= 38; g++) set.add(g);
    set.add(fromGW);
    set.add(toGW);
    return [...set].sort((a, b) => a - b);
  }, [defaultRange.from, fromGW, toGW]);

  const applyPreset = (id: string) => {
    const p = presets.find((x) => x.id === id);
    if (!p) return;
    setSelectedId(null);
    setState((s) => stateForPreset(s, p));
  };

  // One position opens on its own default graph; All (or several positions, from the filters) uses the general ones
  const selectPosition = (pos: PlotPosition | null) => {
    setSelectedId(null);
    setState((s) => stateForPosition(s, pos));
  };
  const activePosition: PlotPosition | "ALL" | null = state.positions.length === 0 ? "ALL" : state.positions.length === 1 ? state.positions[0] : null;

  const togglePosition = (pos: PlotPosition) =>
    update({ positions: state.positions.includes(pos) ? state.positions.filter((p) => p !== pos) : PLOT_POSITIONS.filter((p) => p === pos || state.positions.includes(p)) });

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the address bar already holds the link */
    }
  };

  const filterSummary = [
    state.positions.length ? state.positions.join("/") : null,
    state.teamIds.length ? teams.filter((t) => state.teamIds.includes(t.id)).map((t) => t.short_name).join("/") : null,
    state.minMinutes ? `${state.minMinutes}+ mins` : null,
    state.maxPrice ? `up to £${state.maxPrice.toFixed(1)}m` : null,
  ].filter(Boolean) as string[];

  const imageTitle = state.headline.trim() || title;
  // The player you tapped is called out on the share image: shirt, name, price and both plotted values, with their rank
  const featured = selected && plotted.some((p) => p.id === selected.id) ? selected : null;
  const featuredRank = featured
    ? [...plotted].filter((p) => p.values[state.y] != null).sort((a, b) => (b.values[state.y] as number) - (a.values[state.y] as number)).findIndex((p) => p.id === featured.id) + 1
    : 0;

  const renderShareCard = () => {
    const medX = median(shown.map((p) => p.values[state.x]));
    const medY = median(shown.map((p) => p.values[state.y]));
    const picks = preset?.quadrants && goodCorners && medX !== null && medY !== null ? quadrantPicks(shown, state.x, state.y, medX, medY, 3) : null;
    const chips = [
      "2026/27 season",
      usesHorizon ? horizonLabel : null,
      `Top ${state.top} by ${yDef?.label ?? state.y}`,
      ...filterSummary,
    ].filter(Boolean) as string[];
    const list = (heading: string, color: string, border: string, bg: string, players: PlotPlayer[]) => (
      <div style={{ flex: 1, background: bg, border: `2px solid ${border}`, borderRadius: 22, padding: "18px 24px" }}>
        <div style={{ color, fontSize: 22, fontWeight: 800, letterSpacing: 1, marginBottom: 8 }}>{heading}</div>
        {players.length === 0 && <div style={{ color: "#94a3b8", fontSize: 22 }}>None in this corner</div>}
        {players.map((p, i) => (
          <div key={p.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 24, fontWeight: 700, lineHeight: 1.5 }}>
            <span style={{ color: "#f8fafc" }}>{i + 1}. {p.name}</span>
            <span style={{ color: "#94a3b8", fontSize: 20, fontWeight: 600 }}>
              {formatStatValue(xDef, p.values[state.x])} · {formatStatValue(yDef, p.values[state.y])}
            </span>
          </div>
        ))}
      </div>
    );
    return (
      <div
        style={{
          width: 1080, height: 1350, boxSizing: "border-box", padding: "44px 40px 28px", display: "flex", flexDirection: "column",
          background: "radial-gradient(circle at 92% -4%, rgba(129,140,248,0.38), transparent 42%), radial-gradient(circle at -6% 104%, rgba(251,191,36,0.18), transparent 38%), linear-gradient(170deg, #0b1020 0%, #121936 100%)",
          color: "#f8fafc", position: "relative",
          fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif", overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 10, background: "linear-gradient(90deg, #fbbf24, #f472b6 45%, #818cf8)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <img src={badge} alt="" width={40} height={40} style={{ width: 40, height: 40 }} />
          <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: 4, color: "#fbbf24" }}>PLAYER PLOT</span>
        </div>
        <div style={{ fontSize: 50, fontWeight: 900, lineHeight: 1.08, letterSpacing: 0.3, textTransform: "uppercase" }}>{imageTitle}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 }}>
          {chips.map((c, i) => (
            <span key={c} style={{ fontSize: 20, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", padding: "8px 16px", borderRadius: 999, background: i === 0 ? "rgba(251,191,36,0.16)" : "rgba(255,255,255,0.07)", border: `1px solid ${i === 0 ? "rgba(251,191,36,0.5)" : "rgba(255,255,255,0.14)"}`, color: i === 0 ? "#fde68a" : "#f8fafc" }}>{c}</span>
          ))}
        </div>
        <div style={{ marginTop: 18, padding: "14px 20px", borderLeft: "5px solid #fbbf24", background: "linear-gradient(90deg, rgba(251,191,36,0.10), rgba(255,255,255,0.04))", borderRadius: 14, fontSize: 21, lineHeight: 1.35, color: "#cbd5e1" }}>
          <b style={{ color: "#fbbf24", letterSpacing: 1.5 }}>HOW TO READ </b>
          {preset?.hint ?? "Each dot is a player. Further right means more of the horizontal stat, higher up means more of the vertical stat."}
        </div>
        <FillChart
          fontSize={22}
          players={plotted}
          xKey={state.x}
          yKey={state.y}
          xScale={state.xScale}
          yScale={state.yScale}
          showMedian={state.median}
          quadrants={preset?.quadrants}
          tint={goodCorners}
          theme={CARD_THEME}
          colorMode={state.color}
          sizeMode={state.size}
          mineIds={mineIds}
          trend={trendLine}
          interactive={false}
        />
        {featured && (
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 10, padding: "12px 22px", borderRadius: 20, background: "rgba(251,191,36,0.10)", border: "2px solid rgba(251,191,36,0.6)" }}>
            <img src={getJerseyUrl(featured.teamShort, featured.position)} alt="" width={70} height={70} style={{ width: 70, height: 70, objectFit: "contain", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 2, color: "#fbbf24" }}>FEATURED</div>
              <div style={{ fontSize: 34, fontWeight: 900, lineHeight: 1.1 }}>{featured.name}</div>
              <div style={{ fontSize: 20, color: "#cbd5e1", fontWeight: 600 }}>
                {featured.teamShort} · {featured.position} · £{featured.price.toFixed(1)}m · {featured.ownership.toFixed(1)}% owned
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 40, fontWeight: 900, color: "#fbbf24", lineHeight: 1 }}>{formatStatValue(yDef, featured.values[state.y])}</div>
              <div style={{ fontSize: 18, color: "#94a3b8", fontWeight: 600 }}>{yDef?.label}</div>
              <div style={{ fontSize: 18, color: "#cbd5e1", fontWeight: 700 }}>
                {formatStatValue(xDef, featured.values[state.x])} {xDef ? `· ${featuredRank ? `#${featuredRank} of ${plotted.length}` : ""}` : ""}
              </div>
            </div>
          </div>
        )}
        {picks && (
          <div style={{ display: "flex", gap: 18, marginTop: 8 }}>
            {list(`TARGET: ${preset!.quadrants!.tl.toUpperCase()}`, "#34d399", "rgba(52,211,153,0.5)", "rgba(52,211,153,0.07)", picks.tl)}
            {list(`AVOID: ${preset!.quadrants!.br.toUpperCase()}`, "#f87171", "rgba(248,113,113,0.5)", "rgba(248,113,113,0.07)", picks.br)}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, fontSize: 18, color: "#94a3b8", fontWeight: 600 }}>
          <span>Projections are estimates, not guarantees. Season stats: FPL API.</span>
          <span style={{ letterSpacing: 1.5 }}>FPLDILEMMAS.COM</span>
        </div>
      </div>
    );
  };

  const loading = bootstrapLoading || projectionsLoading || (needsTeamData && (teamGoalsLoading || teamCsLoading));

  return (
    <div className="min-h-screen">
      <div className="w-full py-4 sm:py-8 fpl-page-container">
        <div className="fpl-page-header">
          <div className="fpl-page-header-content">
            <div className="fpl-page-title">
              <ChartScatter />
              <h1 data-testid="text-page-title">Player Plot</h1>
            </div>
            <p className="fpl-page-subtitle">Pick any stat for each axis and see every player plotted. Spot differentials, bargains and lucky streaks.</p>
          </div>
        </div>

        {/* position, then that position's quick views (the first is its default graph) */}
        <div className="mb-4 space-y-3 rounded-2xl border border-gray-200 bg-gradient-to-br from-indigo-500/[0.06] via-white to-violet-500/[0.04] p-3 shadow-sm sm:p-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2" data-testid="plot-positions">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500">Position</span>
            <SegmentedControl
              ariaLabel="Position"
              testIdPrefix="tab-position"
              value={(activePosition ?? "MULTI") as string}
              onChange={(v) => selectPosition(v === "ALL" ? null : (v as PlotPosition))}
              options={(["ALL", ...PLOT_POSITIONS] as string[]).map((pos) => ({ value: pos, label: pos === "ALL" ? "All" : POSITION_LABEL[pos as PlotPosition] }))}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2" data-testid="plot-presets">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500">Quick views</span>
            {presets.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id)}
                aria-pressed={preset?.id === p.id}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors ${
                  preset?.id === p.id ? "border-transparent bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-sm" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
                data-testid={`preset-${p.id}`}
              >
                {p.label}
              </button>
            ))}
            {!preset && <span className="text-xs text-gray-500">Custom axes</span>}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,330px)_minmax(0,1fr)] lg:items-start">
        <SectionCard icon={SlidersHorizontal} title="Choose what to plot" subtitle="Any stat on each axis, with filters to narrow the players" className="order-2 lg:sticky lg:top-16 lg:order-1 lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto" bodyClassName="space-y-4 p-4">
            {/* find a player: first, because it is the quickest way to see where someone sits */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find a player on the chart..."
                className="rounded-xl pl-9"
                data-testid="input-plot-search"
              />
            </div>
            {/* axes */}
            <div className="space-y-2 rounded-2xl border border-indigo-500/15 bg-gradient-to-b from-indigo-500/[0.06] to-transparent p-3">
              <StatSelect label="Horizontal axis (X)" value={state.x} onChange={(x) => update({ x })} testId="select-x" />
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label="Swap axes"
                onClick={() => update({ x: state.y, y: state.x, xScale: state.yScale, yScale: state.xScale })}
                className="w-full gap-2 rounded-full text-xs font-semibold text-indigo-700 dark:text-indigo-300"
                data-testid="button-swap-axes"
              >
                <ArrowLeftRight className="h-3.5 w-3.5 rotate-90" /> Swap axes
              </Button>
              <StatSelect label="Vertical axis (Y)" value={state.y} onChange={(y) => update({ y })} testId="select-y" />
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5">
              <ScaleToggle label="X scale" value={state.xScale} onChange={(xScale) => update({ xScale })} testId="xscale" />
              <ScaleToggle label="Y scale" value={state.yScale} onChange={(yScale) => update({ yScale })} testId="yscale" />
              <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
                <Switch checked={state.median} onCheckedChange={(median) => update({ median })} data-testid="switch-median" />
                Median
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
                <Switch checked={state.trend} onCheckedChange={(trend) => update({ trend })} data-testid="switch-trend" />
                Trend line
              </label>
              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-indigo-500/25 bg-indigo-500/[0.06] px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-500/10 dark:text-indigo-300"
                aria-expanded={showFilters}
                data-testid="button-toggle-filters"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filters
              </button>
            </div>

            <div className="space-y-3 border-t border-gray-100 pt-3" data-testid="plot-dimensions">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500">Colour by</span>
                <SegmentedControl ariaLabel="Colour by" testIdPrefix="color" value={state.color} onChange={(color) => update({ color: color as ColorMode })} options={COLOR_MODES.map((m) => ({ value: m.id, label: m.label }))} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500">Size by</span>
                <SegmentedControl ariaLabel="Size by" testIdPrefix="size" value={state.size} onChange={(size) => update({ size: size as SizeMode })} options={SIZE_MODES.map((m) => ({ value: m.id, label: m.label }))} />
              </div>
            </div>

            <div className="border-t border-gray-100 pt-3" data-testid="plot-mine">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex basis-full items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-gray-500">
                  <Star className="h-3.5 w-3.5 text-amber-500" /> My team
                </span>
                <Input
                  value={mineInput}
                  onChange={(e) => setMineInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applyMine()}
                  placeholder="Your FPL team ID or entry link, to ring your 15 players"
                  className="h-9 min-w-0 basis-full rounded-xl"
                  data-testid="input-my-team"
                />
                <Button type="button" size="sm" onClick={applyMine} disabled={!parseManagerId(mineInput) || mineLoading} className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 font-bold text-white hover:from-amber-400 hover:to-orange-400" data-testid="button-my-team">
                  {mineLoading ? "Loading…" : "Show my team"}
                </Button>
                {state.mine && (
                  <button type="button" onClick={() => update({ mine: "" })} className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100" data-testid="button-clear-my-team">
                    <X className="h-3.5 w-3.5" /> Clear
                  </button>
                )}
              </div>
              {mineError && <p className="mt-1.5 text-xs text-red-600" role="alert">{(mineError as Error).message}</p>}
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3" data-testid="plot-headline">
              <span className="basis-full text-xs font-bold uppercase tracking-[0.12em] text-gray-500">Image headline</span>
              <Input
                value={state.headline}
                maxLength={60}
                onChange={(e) => update({ headline: e.target.value })}
                placeholder="Optional: your own title for the shared image"
                className="h-9 min-w-0 basis-full rounded-xl"
                data-testid="input-plot-headline"
              />
              <span className="text-[11px] text-gray-500">Tap a dot to feature that player on the image.</span>
            </div>

            {showFilters && (
              <div className="space-y-3 border-t border-gray-100 pt-3" data-testid="plot-filters">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-gray-600">Position:</span>
                  {PLOT_POSITIONS.map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => togglePosition(pos)}
                      aria-pressed={state.positions.includes(pos)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${state.positions.includes(pos) ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"}`}
                      data-testid={`position-${pos}`}
                    >
                      {POSITION_LABEL[pos]}
                    </button>
                  ))}
                  {state.positions.length === 0 && <span className="text-xs text-gray-500">All positions</span>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <SmallSelect
                    label="Team"
                    testId="select-team"
                    value={state.teamIds.length === 1 ? String(state.teamIds[0]) : "all"}
                    onChange={(v) => update({ teamIds: v === "all" ? [] : [parseInt(v, 10)] })}
                    options={[{ value: "all", label: "All teams" }, ...[...teams].sort((a, b) => a.name.localeCompare(b.name)).map((t) => ({ value: String(t.id), label: t.name }))]}
                  />
                  <SmallSelect
                    label="Minimum minutes"
                    testId="select-min-minutes"
                    value={String(state.minMinutes)}
                    onChange={(v) => update({ minMinutes: parseInt(v, 10) })}
                    options={[...new Set([...MIN_MINUTES_OPTIONS, state.minMinutes])].sort((a, b) => a - b).map((m) => ({ value: String(m), label: m === 0 ? "Any" : `${m}+` }))}
                  />
                  <SmallSelect
                    label="Max price"
                    testId="select-max-price"
                    value={state.maxPrice === null ? "any" : String(state.maxPrice)}
                    onChange={(v) => update({ maxPrice: v === "any" ? null : parseFloat(v) })}
                    options={[{ value: "any", label: "Any" }, ...[...new Set([...MAX_PRICE_OPTIONS, ...(state.maxPrice !== null ? [state.maxPrice] : [])])].sort((a, b) => a - b).map((m) => ({ value: String(m), label: `£${m.toFixed(1)}m` }))]}
                  />
                  <SmallSelect
                    label="Players shown"
                    testId="select-top"
                    value={String(state.top)}
                    onChange={(v) => update({ top: parseInt(v, 10) })}
                    options={[...new Set([...TOP_OPTIONS, state.top])].sort((a, b) => a - b).map((n) => ({ value: String(n), label: `Top ${n}` }))}
                  />
                  <SmallSelect
                    label="From gameweek"
                    testId="select-from-gw"
                    value={String(fromGW)}
                    onChange={(v) => update({ from: parseInt(v, 10), to: Math.max(toGW, parseInt(v, 10)) })}
                    options={gwOptions.map((g) => ({ value: String(g), label: `GW${g}` }))}
                  />
                  <SmallSelect
                    label="To gameweek"
                    testId="select-to-gw"
                    value={String(toGW)}
                    onChange={(v) => update({ to: parseInt(v, 10), from: Math.min(fromGW, parseInt(v, 10)) })}
                    options={gwOptions.map((g) => ({ value: String(g), label: `GW${g}` }))}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  {usesHorizon ? `Projection stats cover ${horizonLabel}. ` : "The gameweek range only affects our projection stats. "}
                  The chart shows the top players by the vertical stat after these filters; players you search for are always added.
                </p>
              </div>
            )}

        </SectionCard>

        <div className="order-1 min-w-0 lg:order-2">
        <section className="relative overflow-hidden rounded-3xl border border-indigo-500/15 bg-white shadow-[0_12px_40px_-14px_rgba(79,70,229,0.28)]">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-24 top-1/2 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="relative p-3 sm:p-5">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <IconTile icon={ChartScatter} />
                <div className="min-w-0">
                <h2 className="bg-gradient-to-r from-indigo-700 to-violet-600 bg-clip-text text-lg font-extrabold leading-tight tracking-tight text-transparent sm:text-xl dark:from-indigo-300 dark:to-violet-300" data-testid="text-plot-title">{title}</h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  {plotted.length} players
                  {usesHorizon ? ` · ${horizonLabel}` : ""}
                  {filterSummary.length ? ` · ${filterSummary.join(" · ")}` : ""}
                </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={downloadCsv} disabled={plotted.length === 0} className="gap-2" data-testid="button-export-csv">
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">CSV</span>
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={copyLink} className="gap-2" data-testid="button-copy-link">
                  {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy link"}
                </Button>
                <ShareImageButton
                  renderCard={renderShareCard}
                  title={imageTitle}
                  width={1080}
                  height={1350}
                  fileName={shareFileName(["player-plot", state.y, "vs", state.x])}
                  className="border-transparent bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-500 hover:to-violet-500 hover:text-white"
                />
              </div>
            </div>

            {preset && (
              <p className="mb-3 rounded-xl border-l-4 border-indigo-400 bg-indigo-500/[0.06] px-3 py-2 text-xs leading-snug text-gray-700" data-testid="text-plot-hint">{preset.hint}</p>
            )}

            {plotted.length > 0 && (
              <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] font-semibold text-gray-700" data-testid="plot-colour-legend">
                <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">{state.color === "club" ? "Clubs" : `Colour = ${state.color}`}</span>
                {(state.color === "club"
                  ? Array.from(new Set(plotted.map((p) => p.teamShort))).sort().map((t) => ({ key: t, label: t, color: teamColor(t) }))
                  : colorLegend(state.color)
                ).map((l) => (
                  <span key={l.key} className="inline-flex items-center gap-1.5 rounded-full bg-gray-100/80 py-0.5 pl-1 pr-2 dark:bg-white/5">
                    <span className="inline-block h-3 w-3 rounded-full ring-2 ring-white shadow-sm dark:ring-white/80" style={{ background: l.color }} /> {l.label}
                  </span>
                ))}
              </div>
            )}

            <div ref={chartRef} className="w-full rounded-2xl" data-testid="plot-chart">
              {loading || bootstrapError || chartWidth === 0 ? (
                <div className="py-16 text-center text-sm text-gray-500" role="status">
                  {bootstrapError ? "Couldn't load player data. Please refresh." : "Loading players…"}
                </div>
              ) : (
                <PlayerPlotChart
                  width={chartWidth}
                  height={chartHeight}
                  fontSize={fontSize}
                  players={plotted}
                  xKey={state.x}
                  yKey={state.y}
                  xScale={state.xScale}
                  yScale={state.yScale}
                  showMedian={state.median}
                  quadrants={preset?.quadrants}
                  tint={goodCorners}
                  theme={SCREEN_THEME}
                  colorMode={state.color}
                  sizeMode={state.size}
                  mineIds={mineIds}
                  trend={trendLine}
                  highlightIds={highlightIds}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
              )}
            </div>

            {(state.size !== "none" || mineIds.size > 0 || trendLine) && (
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-semibold text-gray-600" data-testid="plot-legend">
                {state.size !== "none" && (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 rounded-full bg-gray-400" />
                    <span className="inline-block h-3.5 w-3.5 rounded-full bg-gray-400" /> Bigger = more {SIZE_MODES.find((m) => m.id === state.size)?.label.toLowerCase()}
                  </span>
                )}
                {mineIds.size > 0 && (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-amber-500" /> ★ Your team
                  </span>
                )}
                {trendLine && (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block h-0 w-6 border-t-[3px] border-dashed border-violet-500" /> Trend ({Math.round(trendLine.r2 * 100)}% of the spread)
                  </span>
                )}
              </div>
            )}

            <p className="mt-1 text-[11px] text-gray-500">
              Faded dashed dots are doubtful or unavailable players. Hover a dot for its numbers; click or tap it to pin the details below.
              {state.xScale === "sqrt" || state.yScale === "sqrt" ? " Stretched scale spreads out the crowded low end, so distances are not proportional." : ""}
            </p>

            {selected && (
              <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-b from-gray-50/80 to-white shadow-sm" style={{ boxShadow: `inset 0 4px 0 0 ${teamColor(selected.teamShort)}` }} data-testid="plot-selected">
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 pt-4 sm:p-4 sm:pt-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <JerseyIcon team={selected.teamShort} position={selected.position} className="h-12 w-12 shrink-0 object-contain" />
                    <div className="min-w-0">
                      <div className="truncate text-lg font-extrabold leading-tight text-gray-900">{selected.name}</div>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <TeamChip>{selected.teamShort}</TeamChip>
                        <PosChip pos={asPos(selected.position)} />
                        {!selected.available && <span className="text-xs font-semibold text-amber-600">doubtful / out</span>}
                      </div>
                    </div>
                  </div>
                  <Link href={compareUrl([selected.id])} className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-500/20 dark:text-indigo-300" data-testid="link-plot-compare">
                    Compare →
                  </Link>
                </div>
                <dl className="grid grid-cols-2 gap-2 px-3 pb-3 sm:grid-cols-4 sm:px-4 sm:pb-4">
                  {[
                    [xDef?.label, formatStatValue(xDef, selected.values[state.x])],
                    [yDef?.label, formatStatValue(yDef, selected.values[state.y])],
                    ["Price", `£${selected.price.toFixed(1)}m`],
                    ["Ownership", `${selected.ownership.toFixed(1)}%`],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-xl bg-gray-100/80 px-3 py-2">
                      <dt className="text-[10px] font-bold uppercase tracking-wide text-gray-500">{label}</dt>
                      <dd className="text-base font-extrabold tabular-nums text-gray-900">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </section>

        {outliers && trendLine && (outliers.above.length > 0 || outliers.below.length > 0) && (
          <SectionCard
            icon={TrendingUp}
            title="Beating and missing the trend"
            subtitle={`The line explains ${Math.round(trendLine.r2 * 100)}% of the spread in ${yDef?.label ?? state.y}. The biggest gaps from it:`}
            className="mt-4"
            testId="plot-outliers"
          >
            <div className="grid gap-4 md:grid-cols-2">
              {([["above", "Above the line", TrendingUp, "emerald"], ["below", "Below the line", TrendingDown, "red"]] as const).map(([key, label, Icon, tone]) => (
                <div key={key} className={`rounded-xl border p-3 ${tone === "emerald" ? "border-emerald-500/25 bg-emerald-500/[0.05]" : "border-red-500/25 bg-red-500/[0.05]"}`}>
                  <h3 className={`mb-1 flex items-center gap-1.5 text-sm font-bold ${tone === "emerald" ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}>
                    <Icon className="h-4 w-4" /> {label}
                  </h3>
                  <ul className="divide-y divide-gray-200/70">
                    {outliers[key].map((o) => (
                      <li key={o.player.id} className="flex items-center gap-2.5 py-2">
                        <JerseyIcon team={o.player.teamShort} position={o.player.position} className="h-7 w-7 shrink-0 object-contain" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-bold text-gray-900">{o.player.name}</div>
                          <div className="text-xs text-gray-500">{o.player.teamShort} · {o.player.position}</div>
                        </div>
                        <span className={`text-sm font-extrabold tabular-nums ${tone === "emerald" ? "text-emerald-600 dark:text-emerald-300" : "text-red-600 dark:text-red-300"}`}>
                          {o.residual > 0 ? "+" : "−"}{formatStatValue(yDef, Math.abs(o.residual))}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {mineList.length > 0 && (
          <SectionCard
            icon={Star}
            title="Your squad on this chart"
            subtitle={`${mineList.length} players, best first by ${yDef?.label ?? state.y}`}
            className="mt-4"
            testId="plot-mine-list"
          >
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {mineList.map((r) => (
                <li key={r.player.id} className="flex items-center gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/[0.05] px-3 py-2">
                  <JerseyIcon team={r.player.teamShort} position={r.player.position} className="h-8 w-8 shrink-0 object-contain" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-gray-900">{r.player.name}</div>
                    <div className="text-xs text-gray-500">
                      {r.x === null || r.y === null ? "No data for these stats" : `${formatStatValue(xDef, r.x)} · ${formatStatValue(yDef, r.y)}`}
                    </div>
                  </div>
                  <button type="button" onClick={() => setSelectedId(r.player.id)} className="rounded-full border border-amber-500/30 px-2.5 py-1 text-[11px] font-bold text-amber-700 hover:bg-amber-500/10 dark:text-amber-300" disabled={!r.onChart}>
                    Locate
                  </button>
                </li>
              ))}
            </ul>
          </SectionCard>
        )}
        </div>
        </div>
      </div>
    </div>
  );
}
