import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeftRight, Check, ChartScatter, Link2, Search, SlidersHorizontal } from "lucide-react";
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
  plotTitle,
  presetsForPositions,
  quadrantPicks,
  stateForPosition,
  stateForPreset,
  topByStat,
  type PlotElement,
  type PlotPlayer,
  type PlotPosition,
  type PlotProjection,
  type PlotState,
  type ScaleKind,
} from "@shared/player-plot";
import { shareFileName } from "@shared/share-cards";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShareImageButton } from "@/components/share-image-button";
import PlayerPlotChart, { CARD_THEME, SCREEN_THEME } from "@/components/player-plot-chart";
import { teamColor } from "@/lib/team-colors";

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

  const allPlayers = useMemo(
    () =>
      bootstrap
        ? buildPlotPlayers({
            elements: bootstrap.elements as unknown as PlotElement[],
            projections: projections ?? [],
            teamShortById,
            fromGW,
            toGW,
          })
        : [],
    [bootstrap, projections, teamShortById, fromGW, toGW],
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
          width: 1080, height: 1350, boxSizing: "border-box", padding: "40px 36px 28px", display: "flex", flexDirection: "column",
          background: "linear-gradient(170deg, #0b1020 0%, #121936 100%)", color: "#f8fafc", border: "6px solid #fbbf24",
          fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif", overflow: "hidden",
        }}
      >
        <div style={{ fontSize: 46, fontWeight: 900, lineHeight: 1.1, letterSpacing: 0.5, textTransform: "uppercase" }}>{title}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 }}>
          {chips.map((c) => (
            <span key={c} style={{ fontSize: 20, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", padding: "8px 16px", borderRadius: 999, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>{c}</span>
          ))}
        </div>
        <div style={{ marginTop: 18, padding: "14px 20px", borderLeft: "5px solid #fbbf24", background: "rgba(255,255,255,0.05)", borderRadius: 12, fontSize: 21, lineHeight: 1.35, color: "#cbd5e1" }}>
          <b style={{ color: "#fbbf24", letterSpacing: 1.5 }}>HOW TO READ </b>
          {preset?.hint ?? "Each dot is a player. Further right means more of the horizontal stat, higher up means more of the vertical stat."}
        </div>
        <FillChart
          fontSize={22}
          players={shown}
          xKey={state.x}
          yKey={state.y}
          xScale={state.xScale}
          yScale={state.yScale}
          showMedian={state.median}
          quadrants={preset?.quadrants}
          tint={goodCorners}
          theme={CARD_THEME}
          interactive={false}
        />
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

  const loading = bootstrapLoading || projectionsLoading;

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
        <div className="flex flex-wrap items-center gap-2 mb-2" role="group" aria-label="Position" data-testid="plot-positions">
          {(["ALL", ...PLOT_POSITIONS] as Array<PlotPosition | "ALL">).map((pos) => (
            <button
              key={pos}
              type="button"
              onClick={() => selectPosition(pos === "ALL" ? null : pos)}
              aria-pressed={activePosition === pos}
              className={`rounded-lg border px-4 py-1.5 text-sm font-semibold ${activePosition === pos ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"}`}
              data-testid={`tab-position-${pos}`}
            >
              {pos === "ALL" ? "All" : POSITION_LABEL[pos]}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-3" data-testid="plot-presets">
          <span className="text-xs font-medium text-gray-600">Quick views:</span>
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p.id)}
              aria-pressed={preset?.id === p.id}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium ${preset?.id === p.id ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"}`}
              data-testid={`preset-${p.id}`}
            >
              {p.label}
            </button>
          ))}
          {!preset && <span className="text-xs text-gray-500">Custom axes</span>}
        </div>

        <Card className="mb-3">
          <CardContent className="p-3 sm:p-4 space-y-3">
            {/* axes */}
            <div className="flex items-end gap-2">
              <StatSelect label="Horizontal axis (X)" value={state.x} onChange={(x) => update({ x })} testId="select-x" />
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Swap axes"
                onClick={() => update({ x: state.y, y: state.x, xScale: state.yScale, yScale: state.xScale })}
                data-testid="button-swap-axes"
              >
                <ArrowLeftRight className="h-4 w-4" />
              </Button>
              <StatSelect label="Vertical axis (Y)" value={state.y} onChange={(y) => update({ y })} testId="select-y" />
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <ScaleToggle label="X scale" value={state.xScale} onChange={(xScale) => update({ xScale })} testId="xscale" />
              <ScaleToggle label="Y scale" value={state.yScale} onChange={(yScale) => update({ yScale })} testId="yscale" />
              <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
                <Switch checked={state.median} onCheckedChange={(median) => update({ median })} data-testid="switch-median" />
                Median lines
              </label>
              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                aria-expanded={showFilters}
                data-testid="button-toggle-filters"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filters
              </button>
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
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find a player on the chart..."
                className="pl-9"
                data-testid="input-plot-search"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-semibold" data-testid="text-plot-title">{title}</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {shown.length} players
                  {usesHorizon ? ` · ${horizonLabel}` : ""}
                  {filterSummary.length ? ` · ${filterSummary.join(" · ")}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={copyLink} className="gap-2" data-testid="button-copy-link">
                  {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy link"}
                </Button>
                <ShareImageButton
                  renderCard={renderShareCard}
                  title={title}
                  width={1080}
                  height={1350}
                  fileName={shareFileName(["player-plot", state.y, "vs", state.x])}
                />
              </div>
            </div>

            {preset && <p className="text-xs text-gray-600 mb-2" data-testid="text-plot-hint">{preset.hint}</p>}

            <div ref={chartRef} className="w-full" data-testid="plot-chart">
              {loading || bootstrapError || chartWidth === 0 ? (
                <div className="py-16 text-center text-sm text-gray-500" role="status">
                  {bootstrapError ? "Couldn't load player data. Please refresh." : "Loading players…"}
                </div>
              ) : (
                <PlayerPlotChart
                  width={chartWidth}
                  height={chartHeight}
                  fontSize={fontSize}
                  players={shown}
                  xKey={state.x}
                  yKey={state.y}
                  xScale={state.xScale}
                  yScale={state.yScale}
                  showMedian={state.median}
                  quadrants={preset?.quadrants}
                  tint={goodCorners}
                  theme={SCREEN_THEME}
                  highlightIds={highlightIds}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
              )}
            </div>

            <p className="mt-1 text-[11px] text-gray-500">
              Dot colour = club. Faded dashed dots are doubtful or unavailable players. Tap a dot for details.
              {state.xScale === "sqrt" || state.yScale === "sqrt" ? " Stretched scale spreads out the crowded low end, so distances are not proportional." : ""}
            </p>

            {selected && (
              <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3" data-testid="plot-selected">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="inline-block h-3 w-3 rounded-full" style={{ background: teamColor(selected.teamShort) }} />
                    <span className="font-semibold truncate">{selected.name}</span>
                    <span className="text-xs text-gray-500">{selected.teamShort} · {selected.position}{selected.available ? "" : " · doubtful / out"}</span>
                  </div>
                  <Link href={compareUrl([selected.id])} className="text-xs font-medium text-indigo-600 hover:underline" data-testid="link-plot-compare">
                    Compare
                  </Link>
                </div>
                <dl className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-sm">
                  <div><dt className="text-xs text-gray-500">{xDef?.label}</dt><dd className="font-semibold">{formatStatValue(xDef, selected.values[state.x])}</dd></div>
                  <div><dt className="text-xs text-gray-500">{yDef?.label}</dt><dd className="font-semibold">{formatStatValue(yDef, selected.values[state.y])}</dd></div>
                  <div><dt className="text-xs text-gray-500">Price</dt><dd className="font-semibold">£{selected.price.toFixed(1)}m</dd></div>
                  <div><dt className="text-xs text-gray-500">Ownership</dt><dd className="font-semibold">{selected.ownership.toFixed(1)}%</dd></div>
                </dl>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
