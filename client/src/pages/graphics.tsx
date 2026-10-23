import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, BarChart3, CalendarClock, CalendarRange, Check, Crown, GitCompareArrows, Image as ImageIcon, ImagePlus, Link2, Newspaper, Search, Shirt, SlidersHorizontal, Sparkles, TrendingUp, Trophy, Package, Download, ClipboardCopy, UserRound, Users, X, type LucideIcon } from "lucide-react";
import { BootstrapData, Fixture } from "@shared/schema";
import { getDefaultGameweekRange } from "@shared/gameweek-utils";
import {
  DEFAULT_COMPARE_STATS,
  GRAPHIC_SIZES,
  GRAPHIC_STATS,
  GRAPHIC_TEMPLATES,
  GRAPHIC_THEMES,
  MAX_RANGE_GAMEWEEKS,
  MAX_STATS,
  PRICE_LIST_LIMIT,
  THEME_LABEL,
  buildComparison,
  buildCaptainPicks,
  buildCover,
  buildFixtureTicker,
  buildStatLeaders,
  buildTeamOfTheWeek,
  buildTransferTrends,
  LEADER_STATS,
  MIN_RATE_MINUTES,
  buildNewsQuote,
  MAX_QUOTE,
  MAX_SOURCE,
  MAX_SUBTITLE,
  MAX_TAG,
  buildDifferentials,
  buildFixturesGrid,
  buildPlayerCard,
  buildPredictedLineup,
  buildPriceChanges,
  buildTeamReveal,
  canAddToSquad,
  squadCounts,
  squadFromPicks,
  suggestSquadSetup,
  CHIP_LABELS,
  SQUAD_QUOTA,
  SQUAD_SIZE,
  BENCH_PLAYERS,
  MAX_MANAGER_NAME,
  type ChipId,
  GAMEWEEK_PACK,
  buildCaption,
  buildCaptionsFile,
  normaliseAccent,
  normaliseHandle,
  packFileName,
  packSpecs,
  packZipName,
  withAccent,
  decodeSpec,
  encodeSpec,
  gameweekLabel,
  graphicFileName,
  resolveTheme,
  type GraphicElement,
  type GraphicPosition,
  type GraphicSpec,
  type PriceChangeInput,
  type SizeId,
  type TemplateId,
  type ThemeId,
} from "@shared/graphics";
import { projectionWindow } from "@shared/compare-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShareImageButton } from "@/components/share-image-button";
import { GraphicCanvas, type GraphicData } from "@/components/graphics/graphic-faces";
import { teamColor } from "@/lib/team-colors";
import { SectionCard } from "@/components/tool-ui";

const TEMPLATE_ICON: Record<string, LucideIcon> = {
  "player-card": UserRound,
  "player-comparison": GitCompareArrows,
  "fixtures-comparison": CalendarRange,
  "price-change": TrendingUp,
  "top-differentials": Sparkles,
  "predicted-lineup": Shirt,
  "team-reveal": Users,
  cover: ImageIcon,
  "player-news": Newspaper,
  "captain-picks": Crown,
  "fixture-ticker": CalendarClock,
  "transfer-trends": ArrowLeftRight,
  "team-of-the-week": Trophy,
  "stat-leaders": BarChart3,
};
const ACTIVE_CHIP = "border-transparent bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-sm";
import { extractManagerId } from "@/lib/manager-id-utils";
import { computeGraphicData, longDate, resolveGameweeks, resolveTotwGw, type LiveElement, type PlayerProjection } from "@/lib/graphic-data";
import { renderToPng } from "@/lib/render-png";
import { createZip } from "@shared/zip";

const DEFAULT_WEEKS = 5;
const POSITIONS: Array<GraphicPosition | "ALL"> = ["ALL", "GKP", "DEF", "MID", "FWD"];
const OWNERSHIP_OPTIONS = [1, 2, 3, 5, 10, 15, 20];
const POSITION_BY_TYPE: Record<number, GraphicPosition> = { 1: "GKP", 2: "DEF", 3: "MID", 4: "FWD" };
// Templates about one gameweek keep it in `from` (and `to`) of the link, so it is not carried into other templates' ranges.
const SINGLE_GAMEWEEK: TemplateId[] = ["predicted-lineup", "team-reveal", "captain-picks", "team-of-the-week"];
const TOP_OPTIONS = [3, 4, 5, 6, 7, 8, 9, 10];

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1 min-w-0">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      {children}
    </div>
  );
}

function SimpleSelect({ value, onChange, options, testId }: { value: string; onChange: (v: string) => void; options: Array<{ value: string; label: string }>; testId: string }) {
  return (
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
  );
}

function PlayerPicker({
  elements, teamShortById, selected, max, onChange,
}: {
  elements: GraphicElement[];
  teamShortById: Map<number, string>;
  selected: number[];
  max: number;
  onChange: (ids: number[]) => void;
}) {
  const [query, setQuery] = useState("");
  const byId = useMemo(() => new Map(elements.map((e) => [e.id, e])), [elements]);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return elements
      .filter((e) => !selected.includes(e.id) && `${e.web_name} ${e.first_name ?? ""} ${e.second_name ?? ""}`.toLowerCase().includes(q))
      .sort((a, b) => (Number(b.total_points) || 0) - (Number(a.total_points) || 0))
      .slice(0, 8);
  }, [elements, query, selected]);
  const full = selected.length >= max;
  const add = (id: number) => {
    onChange(max === 1 ? [id] : [...selected, id].slice(0, max));
    setQuery("");
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {selected.map((id) => {
          const e = byId.get(id);
          if (!e) return null;
          return (
            <span key={id} className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-900" data-testid={`chip-player-${id}`}>
              {e.web_name} <span className="text-xs text-indigo-600">{teamShortById.get(e.team)}</span>
              <button type="button" aria-label={`Remove ${e.web_name}`} onClick={() => onChange(selected.filter((x) => x !== id))} className="rounded-full p-0.5 hover:bg-indigo-100">
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          );
        })}
      </div>
      {(!full || max === 1) && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={max === 1 ? "Search a player…" : "Search a player to add…"}
            className="pl-9"
            data-testid="input-graphics-player-search"
          />
          {matches.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full rounded-lg border bg-white shadow-lg" role="listbox">
              {matches.map((e) => (
                <li key={e.id}>
                  <button type="button" onClick={() => add(e.id)} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50" data-testid={`option-player-${e.id}`}>
                    <span className="font-medium">{e.web_name}</span>
                    <span className="text-xs text-gray-500">{teamShortById.get(e.team)} · {POSITION_BY_TYPE[e.element_type]} · £{(e.now_cost / 10).toFixed(1)}m</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

const POSITION_ORDER: GraphicPosition[] = ["GKP", "DEF", "MID", "FWD"];

type LoadState = { busy: boolean; error: string | null; info: string | null };

function SquadBuilder({
  spec, update, elements, teamShortById, xptsById, gameweek, gameweekOptions,
}: {
  spec: GraphicSpec;
  update: (patch: Partial<GraphicSpec>) => void;
  elements: GraphicElement[];
  teamShortById: Map<number, string>;
  xptsById: Map<number, number | null>;
  gameweek: number;
  gameweekOptions: number[];
}) {
  const [query, setQuery] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [idText, setIdText] = useState("");
  const [load, setLoad] = useState<LoadState>({ busy: false, error: null, info: null });
  const byId = useMemo(() => new Map(elements.map((e) => [e.id, e])), [elements]);
  const counts = squadCounts(elements, spec.squad);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return elements
      .filter((e) => !spec.squad.includes(e.id) && `${e.web_name} ${e.first_name ?? ""} ${e.second_name ?? ""}`.toLowerCase().includes(q))
      .sort((a, b) => (Number(b.total_points) || 0) - (Number(a.total_points) || 0))
      .slice(0, 8);
  }, [elements, query, spec.squad]);

  const applySuggestion = (squad: number[]) => {
    const s = suggestSquadSetup({ elements, squad, xptsById });
    if (s.bench.length) update({ squad, bench: s.bench, captain: s.captain, vice: s.vice });
    else update({ squad });
    return s.bench.length > 0;
  };

  const add = (id: number) => {
    const check = canAddToSquad({ elements, squad: spec.squad, id, teamShortById });
    if (!check.ok) {
      setNote(check.reason);
      return;
    }
    setNote(null);
    setQuery("");
    const squad = [...spec.squad, id];
    if (squad.length === SQUAD_SIZE && spec.bench.length === 0) {
      if (applySuggestion(squad)) setNote("Squad complete. We suggested a bench, captain and vice from expected points. Change anything you like.");
    } else {
      update({ squad });
    }
  };

  const remove = (id: number) => {
    setNote(null);
    update({
      squad: spec.squad.filter((x) => x !== id),
      bench: spec.bench.filter((x) => x !== id),
      captain: spec.captain === id ? 0 : spec.captain,
      vice: spec.vice === id ? 0 : spec.vice,
    });
  };

  const toggleBench = (id: number) => {
    if (spec.bench.includes(id)) {
      setNote(null);
      update({ bench: spec.bench.filter((x) => x !== id) });
    } else if (spec.bench.length >= BENCH_PLAYERS) {
      setNote("The bench is full (4). Move someone to the XI first.");
    } else {
      setNote(null);
      update({ bench: [...spec.bench, id] });
    }
  };

  const setCaptain = (id: number) => update({ captain: spec.captain === id ? 0 : id, vice: spec.vice === id ? 0 : spec.vice });
  const setVice = (id: number) => update({ vice: spec.vice === id ? 0 : id, captain: spec.captain === id ? 0 : spec.captain });

  const loadFromId = async () => {
    const id = extractManagerId(idText);
    if (!id || id === "0") {
      setLoad({ busy: false, error: "Enter your FPL team ID, or paste your team link from the FPL site.", info: null });
      return;
    }
    setLoad({ busy: true, error: null, info: null });
    try {
      const res = await fetch(`/api/manager/${id}/team`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message =
          body?.code === "TEAM_NOT_AVAILABLE"
            ? "We couldn't get picks for that team. Check the ID, or the picks may still be hidden until the deadline. You can build the squad below instead."
            : res.status === 404 ? "No FPL team was found with that ID." : "Couldn't load that team right now. Please try again.";
        setLoad({ busy: false, error: message, info: null });
        return;
      }
      const picks = Array.isArray(body.picks) ? body.picks : [];
      if (picks.length !== SQUAD_SIZE) {
        setLoad({ busy: false, error: "That team doesn't have a full 15-player squad to load.", info: null });
        return;
      }
      const loaded = squadFromPicks(picks);
      const patch: Partial<GraphicSpec> = { ...loaded };
      if (!spec.manager.trim()) {
        const name = typeof body.manager === "string" && body.manager.trim() ? body.manager.trim() : null;
        if (name) patch.manager = name.slice(0, MAX_MANAGER_NAME);
        else {
          try {
            const info = await (await fetch(`/api/manager/${id}`)).json();
            const full = `${info?.player_first_name ?? ""} ${info?.player_last_name ?? ""}`.trim();
            if (full) patch.manager = full.slice(0, MAX_MANAGER_NAME);
          } catch {
            /* the name is optional */
          }
        }
      }
      update(patch);
      const from = body.resolvedGameweek ?? body.gameweek;
      setNote(null);
      setLoad({ busy: false, error: null, info: `Loaded the GW${from ?? "?"} squad. Make this week's transfers below, then pick your chip.` });
    } catch {
      setLoad({ busy: false, error: "Couldn't load that team right now. Please try again.", info: null });
    }
  };

  const toggleBtn = (active: boolean) =>
    `rounded-md border px-2 py-1 text-xs font-bold leading-none ${active ? ACTIVE_CHIP : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"}`;

  return (
    <div className="space-y-4" data-testid="squad-builder">
      <Field label="Load your squad from your FPL team ID (optional)">
        <div className="flex gap-2">
          <Input value={idText} onChange={(e) => setIdText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") loadFromId(); }} inputMode="numeric" placeholder="Team ID or team link" data-testid="input-fpl-id" />
          <Button type="button" variant="outline" onClick={loadFromId} disabled={load.busy} data-testid="button-load-fpl">{load.busy ? "Loading…" : "Load"}</Button>
        </div>
        {load.error && <p className="text-xs text-red-600" role="alert" data-testid="load-error">{load.error}</p>}
        {load.info && <p className="text-xs text-emerald-700" role="status" data-testid="load-info">{load.info}</p>}
      </Field>

      <Field label={`Squad (${spec.squad.length}/${SQUAD_SIZE})`}>
        <p className="text-xs text-gray-600" data-testid="squad-counts">
          {POSITION_ORDER.map((pos) => `${pos} ${counts[pos]}/${SQUAD_QUOTA[pos]}`).join(" · ")}
        </p>
        {spec.squad.length < SQUAD_SIZE && (
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search a player to add…" className="pl-9" data-testid="input-squad-search" />
            {matches.length > 0 && (
              <ul className="absolute z-20 mt-1 w-full rounded-lg border bg-white shadow-lg" role="listbox">
                {matches.map((e) => (
                  <li key={e.id}>
                    <button type="button" onClick={() => add(e.id)} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50" data-testid={`option-squad-${e.id}`}>
                      <span className="font-medium">{e.web_name}</span>
                      <span className="text-xs text-gray-500">{teamShortById.get(e.team)} · {POSITION_BY_TYPE[e.element_type]} · £{(e.now_cost / 10).toFixed(1)}m</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {note && <p className="text-xs text-amber-700" role="status" data-testid="squad-note">{note}</p>}

        {spec.squad.length > 0 && (
          <div className="space-y-2 pt-1" data-testid="squad-list">
            {POSITION_ORDER.map((pos) => {
              const rows = spec.squad.map((id) => byId.get(id)).filter((e): e is GraphicElement => !!e && POSITION_BY_TYPE[e.element_type] === pos);
              if (!rows.length) return null;
              return (
                <div key={pos}>
                  <div className="text-[11px] font-bold tracking-wide text-gray-500">{pos}</div>
                  {rows.map((e) => {
                    const onBench = spec.bench.includes(e.id);
                    return (
                      <div key={e.id} className="flex items-center justify-between gap-2 border-b border-gray-100 py-1.5" data-testid={`squad-row-${e.id}`}>
                        <div className="min-w-0 text-sm">
                          <span className="font-medium">{e.web_name}</span>{" "}
                          <span className="text-xs text-gray-500">{teamShortById.get(e.team)} · £{(e.now_cost / 10).toFixed(1)}m</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button type="button" className={toggleBtn(spec.captain === e.id)} aria-pressed={spec.captain === e.id} aria-label={`Captain ${e.web_name}`} onClick={() => setCaptain(e.id)} data-testid={`captain-${e.id}`}>C</button>
                          <button type="button" className={toggleBtn(spec.vice === e.id)} aria-pressed={spec.vice === e.id} aria-label={`Vice captain ${e.web_name}`} onClick={() => setVice(e.id)} data-testid={`vice-${e.id}`}>V</button>
                          <button type="button" className={toggleBtn(onBench)} aria-pressed={onBench} aria-label={`${e.web_name} on the bench`} onClick={() => toggleBench(e.id)} data-testid={`bench-${e.id}`}>Bench</button>
                          <button type="button" aria-label={`Remove ${e.web_name}`} onClick={() => remove(e.id)} className="rounded-md p-1 text-gray-500 hover:bg-gray-100" data-testid={`remove-${e.id}`}>
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
        {spec.squad.length === SQUAD_SIZE && (
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => { setNote(applySuggestion(spec.squad) ? "Bench, captain and vice set from expected points." : "Couldn't suggest a setup for this squad."); }} data-testid="button-suggest">
            <Sparkles className="h-4 w-4" />
            Suggest bench, captain &amp; vice
          </Button>
        )}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Chip this week (optional)">
          <SimpleSelect
            value={spec.chip || "none"}
            onChange={(v) => update({ chip: v === "none" ? "" : (v as ChipId) })}
            options={[{ value: "none", label: "No chip" }, ...(Object.keys(CHIP_LABELS) as Array<Exclude<ChipId, "">>).map((c) => ({ value: c, label: CHIP_LABELS[c] }))]}
            testId="select-chip"
          />
        </Field>
        <Field label="Gameweek">
          <SimpleSelect
            value={String(gameweek)}
            onChange={(v) => update({ from: parseInt(v, 10), to: parseInt(v, 10) })}
            options={gameweekOptions.map((gw) => ({ value: String(gw), label: `GW${gw}` }))}
            testId="select-reveal-gw"
          />
        </Field>
      </div>
      <Field label="Manager name (optional)">
        <Input value={spec.manager} maxLength={MAX_MANAGER_NAME} onChange={(e) => update({ manager: e.target.value })} placeholder="Shown under the headline" data-testid="input-manager" />
      </Field>
    </div>
  );
}

const BRAND_KEY = "fpld-graphics-brand";

/** The creator's own handle and accent, remembered in this browser. Never overrides a link that carries its own. */
function loadBrand(): { handle: string; accent: string } {
  try {
    const raw = window.localStorage.getItem(BRAND_KEY);
    const j = raw ? JSON.parse(raw) : {};
    return { handle: normaliseHandle(String(j?.handle ?? "")), accent: normaliseAccent(String(j?.accent ?? "")) };
  } catch {
    return { handle: "", accent: "" };
  }
}

function saveBrand(brand: { handle: string; accent: string }) {
  try {
    window.localStorage.setItem(BRAND_KEY, JSON.stringify(brand));
  } catch {
    /* storage can be blocked; the link still carries the handle */
  }
}

type PackState = { busy: boolean; done: number; total: number; message: string | null; ok: boolean };

export default function GraphicsPage() {
  const [spec, setSpec] = useState<GraphicSpec>(() => {
    const fromLink = decodeSpec(typeof window !== "undefined" ? window.location.search : "");
    // a link made by someone else keeps its own handle and accent; otherwise start from this browser's saved ones
    return fromLink.handle || fromLink.accent || typeof window === "undefined" ? fromLink : { ...fromLink, ...loadBrand() };
  });
  const [handleText, setHandleText] = useState(() => (spec.handle ? `@${spec.handle}` : ""));
  const [copied, setCopied] = useState(false);
  const [captionCopied, setCaptionCopied] = useState(false);
  const [packGw, setPackGw] = useState<number | null>(null);
  const [pack, setPack] = useState<PackState>({ busy: false, done: 0, total: GAMEWEEK_PACK.length, message: null, ok: true });
  const queryClient = useQueryClient();
  const [previewRef, previewWidth] = useElementWidth<HTMLDivElement>();

  const { data: bootstrap, isLoading: bootstrapLoading, error: bootstrapError } = useQuery<BootstrapData>({ queryKey: ["/api/bootstrap-static"], staleTime: 5 * 60 * 1000 });
  const { data: projections } = useQuery<PlayerProjection[]>({ queryKey: ["/api/cached/player-total-points"], staleTime: 5 * 60 * 1000 });
  const { data: fixtures } = useQuery<Fixture[]>({ queryKey: ["/api/fixtures"], staleTime: 5 * 60 * 1000 });
  const { data: priceChanges, isLoading: pricesLoading } = useQuery<PriceChangeInput[]>({
    queryKey: ["/api/price-changes/recent"],
    staleTime: 5 * 60 * 1000,
    enabled: spec.template === "price-change",
  });

  const update = (patch: Partial<GraphicSpec>) => setSpec((s) => ({ ...s, ...patch }));

  // on a phone the template cards scroll sideways: keep the chosen one in view
  useEffect(() => {
    document.querySelector(`[data-testid="template-${spec.template}"]`)?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [spec.template]);

  // keep the address bar in step with the controls, so the current graphic can be shared as a link
  useEffect(() => {
    const qs = encodeSpec(spec);
    window.history.replaceState(window.history.state, "", qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
  }, [spec]);

  const elements = useMemo(() => (bootstrap?.elements ?? []) as unknown as GraphicElement[], [bootstrap]);
  const teams = bootstrap?.teams ?? [];
  const teamShortById = useMemo(() => new Map(teams.map((t) => [t.id, t.short_name])), [teams]);
  const teamNameById = useMemo(() => new Map(teams.map((t) => [t.id, t.name])), [teams]);
  const projectionById = useMemo(() => new Map((projections ?? []).map((p) => [p.playerId, p.gameweekProjections])), [projections]);

  const defaultRange = useMemo(() => {
    if (!bootstrap?.events) return { from: 1, to: DEFAULT_WEEKS };
    const r = getDefaultGameweekRange(bootstrap.events as any, DEFAULT_WEEKS);
    return { from: parseInt(r.startGameweek, 10), to: parseInt(r.endGameweek, 10) };
  }, [bootstrap?.events]);
  const { from, to, gameweeks, gwLabel, singleGw: lineupGw } = resolveGameweeks(spec, defaultRange);

  const openGameweeks = useMemo(() => {
    const events = (bootstrap?.events ?? []) as Array<{ id: number; finished?: boolean }>;
    const ids = events.filter((e) => !e.finished).map((e) => e.id);
    return ids.length ? ids : [from];
  }, [bootstrap?.events, from]);

  // Team of the Week is about one FINISHED gameweek (default: the latest); Transfer Trends is about the gameweek being picked for now.
  const finishedGameweeks = useMemo(
    () => ((bootstrap?.events ?? []) as Array<{ id: number; finished?: boolean }>).filter((e) => e.finished).map((e) => e.id).sort((a, b) => a - b),
    [bootstrap?.events],
  );
  const totwGw = resolveTotwGw(spec, finishedGameweeks);
  const transfersGw = useMemo(() => {
    const events = (bootstrap?.events ?? []) as Array<{ id: number; is_next?: boolean; is_current?: boolean }>;
    return events.find((e) => e.is_next)?.id ?? events.find((e) => e.is_current)?.id ?? 0;
  }, [bootstrap?.events]);
  const { data: liveData, isLoading: liveLoading } = useQuery<{ elements: LiveElement[] }>({
    queryKey: [`/api/event/${totwGw}/live`],
    staleTime: 5 * 60 * 1000,
    enabled: spec.template === "team-of-the-week" && totwGw > 0,
  });

  // First visit: start with sensible picks so the preview is never empty (they go into the link too).
  useEffect(() => {
    if (!elements.length || !projections) return;
    if ((spec.template === "player-card" || spec.template === "player-comparison") && spec.players.length === 0) {
      const need = spec.template === "player-card" ? 1 : 2;
      const ranked = elements
        .filter((e) => (e.status ?? "a") === "a")
        .map((e) => ({ id: e.id, xpts: projectionWindow(projectionById.get(e.id), gameweeks).total ?? -1 }))
        .sort((a, b) => b.xpts - a.xpts)
        .slice(0, need)
        .map((x) => x.id);
      if (ranked.length === need) update({ players: ranked });
    }
    if (spec.template === "player-news" && spec.players.length === 0) {
      const top = elements
        .filter((e) => typeof e.news === "string" && e.news.trim() !== "")
        .sort((a, b) => (parseFloat(String(b.selected_by_percent)) || 0) - (parseFloat(String(a.selected_by_percent)) || 0))[0];
      if (top) update({ players: [top.id] });
    }
    if (spec.template === "predicted-lineup" && spec.teams.length === 0 && fixtures) {
      const next = (fixtures as any[]).find((f) => f.event === lineupGw && !f.finished) ?? (fixtures as any[]).find((f) => f.event !== null && !f.finished);
      if (next) update({ teams: [next.team_h] });
    }
    if (spec.template === "fixtures-comparison" && spec.teams.length === 0 && teams.length) {
      update({ teams: [...teams].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 3).map((t) => t.id) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elements.length, projections, fixtures, spec.template, spec.players.length, spec.teams.length, teams.length]);

  const squadXptsById = useMemo(
    () => new Map<number, number | null>((projections ?? []).map((p) => [p.playerId, p.gameweekProjections?.[String(lineupGw)] ?? null])),
    [projections, lineupGw],
  );

  const selectedElements = useMemo(() => {
    const byId = new Map(elements.map((e) => [e.id, e]));
    return spec.players.map((id) => byId.get(id)).filter((e): e is GraphicElement => !!e);
  }, [elements, spec.players]);

  const clubColor = useMemo(() => {
    const team =
      spec.template === "fixtures-comparison" || spec.template === "predicted-lineup" ? spec.teams[0]
      : spec.template === "team-reveal" ? elements.find((e) => e.id === spec.captain)?.team
      : selectedElements[0]?.team;
    return team !== undefined ? teamColor(teamShortById.get(team)) : null;
  }, [spec.template, spec.teams, spec.captain, elements, selectedElements, teamShortById]);
  const theme = withAccent(resolveTheme(spec.theme, clubColor), spec.accent);

  const officialNews = useMemo(() => {
    if (spec.template !== "player-news" || !selectedElements[0]) return null;
    const n = selectedElements[0].news;
    return typeof n === "string" ? n.trim() : "";
  }, [spec.template, selectedElements]);

  const priceContent = useMemo(
    () => buildPriceChanges({ changes: priceChanges ?? [], date: spec.date || null, limit: PRICE_LIST_LIMIT[spec.size] }),
    [priceChanges, spec.date, spec.size],
  );

  // everything the graphics are built from; the Gameweek pack builds each of its images from the same pieces
  const dataContext = useMemo(
    () => ({
      elements, teams, teamShortById, teamNameById, projections, fixtures, defaultRange, transfersGw, finishedGameweeks,
      liveElements: liveData?.elements,
      priceChanges: pricesLoading ? undefined : priceChanges ?? [],
    }),
    [elements, teams, teamShortById, teamNameById, projections, fixtures, defaultRange, transfersGw, finishedGameweeks, liveData, pricesLoading, priceChanges],
  );
  const { data, problem } = useMemo(() => computeGraphicData(spec, dataContext), [spec, dataContext]);

  const { width: fullWidth, height: fullHeight } = GRAPHIC_SIZES[spec.size];
  const scale = previewWidth > 0 ? Math.min(1, previewWidth / fullWidth) : 1;
  const canvas = data ? <GraphicCanvas spec={spec} theme={theme} data={data} /> : null;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the address bar already holds the link */
    }
  };

  const caption = data ? buildCaption(data, spec) : null;
  const copyCaption = async () => {
    if (!caption) return;
    try {
      await navigator.clipboard.writeText(caption);
      setCaptionCopied(true);
      setTimeout(() => setCaptionCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  };

  const changeHandle = (text: string) => {
    setHandleText(text);
    const handle = normaliseHandle(text);
    update({ handle });
    saveBrand({ handle, accent: spec.accent });
  };
  const changeAccent = (value: string) => {
    const accent = normaliseAccent(value);
    update({ accent });
    saveBrand({ handle: spec.handle, accent });
  };

  const selectedPackGw = packGw ?? defaultRange.from;
  const runPack = async () => {
    if (pack.busy) return;
    const total = GAMEWEEK_PACK.length;
    setPack({ busy: true, done: 0, total, message: null, ok: true });
    try {
      const changes = await queryClient.fetchQuery<PriceChangeInput[]>({ queryKey: ["/api/price-changes/recent"], staleTime: 5 * 60 * 1000 });
      const events = (bootstrap?.events ?? []) as Array<{ id: number; deadline_time?: string }>;
      const deadline = events.find((e) => e.id === selectedPackGw)?.deadline_time ?? null;
      const planned = packSpecs(spec, selectedPackGw, { deadline });
      const files: Array<{ name: string; data: Uint8Array }> = [];
      const captions: Array<{ fileName: string; caption: string }> = [];
      const skipped: string[] = [];
      for (let i = 0; i < planned.length; i++) {
        const { item, spec: s } = planned[i];
        setPack((p) => ({ ...p, done: i }));
        const { data: graphic } = computeGraphicData(s, { ...dataContext, priceChanges: changes ?? [] });
        if (!graphic) {
          skipped.push(item.label);
          continue;
        }
        const size = GRAPHIC_SIZES[s.size];
        const blob = await renderToPng(<GraphicCanvas spec={s} theme={withAccent(resolveTheme(s.theme, null), s.accent)} data={graphic} />, size.width, size.height);
        const fileName = packFileName(i, s.template);
        files.push({ name: fileName, data: new Uint8Array(await blob.arrayBuffer()) });
        captions.push({ fileName, caption: buildCaption(graphic, s) });
      }
      if (files.length === 0) throw new Error("nothing to build");
      files.push({ name: "captions.txt", data: new TextEncoder().encode(buildCaptionsFile(captions)) });
      const zip = createZip(files);
      const url = URL.createObjectURL(new Blob([zip.buffer as ArrayBuffer], { type: "application/zip" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = packZipName(selectedPackGw);
      a.click();
      URL.revokeObjectURL(url);
      setPack({ busy: false, done: total, total, ok: true, message: `Downloaded ${captions.length} images and captions.txt${skipped.length ? `. Skipped (no data yet): ${skipped.join(", ")}.` : "."}` });
    } catch {
      setPack({ busy: false, done: 0, total, ok: false, message: "Couldn't build the pack. Please try again." });
    }
  };

  const toggleStat = (key: string) => {
    const current = spec.stats.length ? spec.stats : DEFAULT_COMPARE_STATS;
    const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key].slice(0, MAX_STATS);
    update({ stats: next.length ? next : current });
  };
  const toggleTeam = (id: number) => {
    update({ teams: spec.teams.includes(id) ? spec.teams.filter((t) => t !== id) : [...spec.teams, id].slice(0, 4) });
  };

  const usesRange = spec.template === "player-card" || spec.template === "player-comparison" || spec.template === "fixtures-comparison" || spec.template === "top-differentials" || spec.template === "fixture-ticker";
  const activeStats = spec.stats.length ? spec.stats : DEFAULT_COMPARE_STATS;
  const loading = bootstrapLoading;
  const fileParts =
    spec.template === "price-change" ? [priceContent.date ?? ""]
    : spec.template === "predicted-lineup" ? [teamShortById.get(spec.teams[0]) ?? "", `gw${lineupGw}`]
    : spec.template === "team-reveal" ? [spec.manager || "squad", `gw${lineupGw}`]
    : spec.template === "player-news" ? selectedElements.map((e) => e.web_name)
    : spec.template === "captain-picks" ? [`gw${lineupGw}`]
    : spec.template === "fixture-ticker" ? [gwLabel]
    : spec.template === "transfer-trends" ? [`gw${transfersGw}`]
    : spec.template === "team-of-the-week" ? [`gw${totwGw}`]
    : spec.template === "stat-leaders" ? [spec.stat]
    : spec.template === "cover" ? [spec.headline.slice(0, 30), ...selectedElements.map((e) => e.web_name)]
    : selectedElements.map((e) => e.web_name);

  return (
    <div className="min-h-screen">
      <div className="w-full py-4 sm:py-8 fpl-page-container">
        <div className="fpl-page-header">
          <div className="fpl-page-header-content">
            <div className="fpl-page-title">
              <ImagePlus />
              <h1 data-testid="text-page-title">Graphics Maker</h1>
            </div>
            <p className="fpl-page-subtitle">Make a shareable FPL graphic in seconds. Pick a template, choose your data, then download the image or copy a link.</p>
          </div>
        </div>

        <div className="mb-5 overflow-x-auto pb-2 sm:overflow-visible sm:pb-0">
        <div className="flex snap-x gap-3 sm:grid sm:grid-cols-3 lg:grid-cols-5" role="group" aria-label="Template" data-testid="graphics-templates">
          {GRAPHIC_TEMPLATES.map((t) => {
            const Icon = TEMPLATE_ICON[t.id] ?? ImagePlus;
            const on = spec.template === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() =>
                  update({
                    template: t.id as TemplateId,
                    // a lineup is one gameweek; do not carry that single gameweek into other templates' ranges (or the reverse)
                    ...(SINGLE_GAMEWEEK.includes(t.id as TemplateId) || SINGLE_GAMEWEEK.includes(spec.template) ? { from: 0, to: 0 } : {}),
                  })
                }
                aria-pressed={on}
                className={`group flex w-44 shrink-0 snap-start items-center gap-3 rounded-2xl border p-3 text-left transition-all sm:w-auto sm:shrink sm:flex-col sm:items-start sm:gap-2 sm:p-4 ${
                  on
                    ? "border-transparent bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg ring-2 ring-indigo-300/50"
                    : "border-gray-200 bg-white text-gray-800 shadow-sm hover:-translate-y-0.5 hover:shadow-md"
                }`}
                data-testid={`template-${t.id}`}
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${on ? "bg-white/20 text-white" : "bg-gradient-to-br from-indigo-500/15 to-violet-500/15 text-indigo-600 dark:text-indigo-300"}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-extrabold leading-tight">{t.label}</span>
                  <span className={`mt-0.5 hidden text-xs leading-snug sm:block ${on ? "text-indigo-100" : "text-gray-500"}`}>{t.description}</span>
                </span>
              </button>
            );
          })}
        </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
          <SectionCard
            icon={SlidersHorizontal}
            title="Customise"
            subtitle="Pick your data, size and colours"
            className="lg:sticky lg:top-16 lg:self-start"
            bodyClassName="space-y-4 p-4 sm:p-5"
          >
              {spec.template === "player-card" && (
                <Field label="Player">
                  <PlayerPicker elements={elements} teamShortById={teamShortById} selected={spec.players} max={1} onChange={(players) => update({ players })} />
                </Field>
              )}

              {spec.template === "player-comparison" && (
                <>
                  <Field label="Players (2 or 3)">
                    <PlayerPicker elements={elements} teamShortById={teamShortById} selected={spec.players} max={3} onChange={(players) => update({ players })} />
                  </Field>
                  <Field label={`Stats to show (up to ${MAX_STATS})`}>
                    <div className="flex flex-wrap gap-1.5" data-testid="graphics-stats">
                      {GRAPHIC_STATS.map((s) => {
                        const on = activeStats.includes(s.key);
                        return (
                          <button
                            key={s.key}
                            type="button"
                            onClick={() => toggleStat(s.key)}
                            aria-pressed={on}
                            className={`rounded-full border px-2.5 py-1 text-xs font-medium ${on ? ACTIVE_CHIP : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"}`}
                            data-testid={`stat-${s.key}`}
                          >
                            {s.label}
                          </button>
                        );
                      })}
                    </div>
                  </Field>
                </>
              )}

              {spec.template === "player-news" && (
                <>
                  <Field label="Player">
                    <PlayerPicker elements={elements} teamShortById={teamShortById} selected={spec.players} max={1} onChange={(players) => update({ players })} />
                  </Field>
                  {officialNews !== null && (
                    <p className="text-xs text-gray-600" data-testid="official-news">
                      Official FPL news: {officialNews ? `“${officialNews}”` : "none right now"}
                    </p>
                  )}
                  <Field label="Your own quote (optional, replaces the FPL news)">
                    <Textarea value={spec.quote} maxLength={MAX_QUOTE} rows={3} onChange={(e) => update({ quote: e.target.value })} placeholder="Leave empty to use the official FPL news" data-testid="input-quote" />
                  </Field>
                  {spec.quote.trim() && (
                    <Field label="Who said it (optional)">
                      <Input value={spec.source} maxLength={MAX_SOURCE} onChange={(e) => update({ source: e.target.value })} placeholder="e.g. Arteta, pre-match press conference" data-testid="input-source" />
                    </Field>
                  )}
                  {spec.quote.trim() && <p className="text-xs text-gray-500">The graphic says this quote was entered by the creator, so only use words you can stand behind.</p>}
                </>
              )}

              {spec.template === "captain-picks" && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Gameweek">
                    <SimpleSelect
                      value={String(lineupGw)}
                      onChange={(v) => update({ from: parseInt(v, 10), to: parseInt(v, 10) })}
                      options={(openGameweeks.includes(lineupGw) ? openGameweeks : [...openGameweeks, lineupGw].sort((a, b) => a - b)).map((gw) => ({ value: String(gw), label: `GW${gw}` }))}
                      testId="select-captain-gw"
                    />
                  </Field>
                  <Field label="Position">
                    <SimpleSelect value={spec.pos ?? "ALL"} onChange={(v) => update({ pos: v === "ALL" ? null : (v as GraphicPosition) })} options={POSITIONS.map((p) => ({ value: p, label: p === "ALL" ? "All positions" : p }))} testId="select-position" />
                  </Field>
                  <Field label="How many players">
                    <SimpleSelect value={String(spec.top)} onChange={(v) => update({ top: parseInt(v, 10) })} options={TOP_OPTIONS.map((n) => ({ value: String(n), label: `Top ${n}` }))} testId="select-top" />
                  </Field>
                </div>
              )}

              {spec.template === "transfer-trends" && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Position">
                    <SimpleSelect value={spec.pos ?? "ALL"} onChange={(v) => update({ pos: v === "ALL" ? null : (v as GraphicPosition) })} options={POSITIONS.map((p) => ({ value: p, label: p === "ALL" ? "All positions" : p }))} testId="select-position" />
                  </Field>
                  <Field label="How many players">
                    <SimpleSelect value={String(spec.top)} onChange={(v) => update({ top: parseInt(v, 10) })} options={TOP_OPTIONS.map((n) => ({ value: String(n), label: `Top ${n}` }))} testId="select-top" />
                  </Field>
                  <p className="col-span-2 text-xs text-gray-500">Counts are FPL's own transfers for GW{transfersGw || "?"} so far. They reset at each deadline.</p>
                </div>
              )}

              {spec.template === "team-of-the-week" && (
                <Field label="Finished gameweek">
                  <SimpleSelect
                    value={String(totwGw || "")}
                    onChange={(v) => update({ from: parseInt(v, 10), to: parseInt(v, 10) })}
                    options={[...finishedGameweeks].reverse().map((gw) => ({ value: String(gw), label: `GW${gw}` }))}
                    testId="select-totw-gw"
                  />
                </Field>
              )}

              {spec.template === "stat-leaders" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Field label="Stat">
                      <SimpleSelect value={spec.stat} onChange={(v) => update({ stat: v })} options={LEADER_STATS.map((x) => ({ value: x.key, label: x.label }))} testId="select-leader-stat" />
                    </Field>
                  </div>
                  <Field label="Position">
                    <SimpleSelect value={spec.pos ?? "ALL"} onChange={(v) => update({ pos: v === "ALL" ? null : (v as GraphicPosition) })} options={POSITIONS.map((p) => ({ value: p, label: p === "ALL" ? "All positions" : p }))} testId="select-position" />
                  </Field>
                  <Field label="How many players">
                    <SimpleSelect value={String(spec.top)} onChange={(v) => update({ top: parseInt(v, 10) })} options={TOP_OPTIONS.map((n) => ({ value: String(n), label: `Top ${n}` }))} testId="select-top" />
                  </Field>
                  {LEADER_STATS.find((x) => x.key === spec.stat)?.rate && <p className="col-span-2 text-xs text-gray-500">Per-game and form stats only count players with {MIN_RATE_MINUTES}+ minutes.</p>}
                </div>
              )}

              {spec.template === "cover" && (
                <>
                  <Field label="Headline">
                    <Input value={spec.headline} maxLength={60} onChange={(e) => update({ headline: e.target.value })} placeholder="Gameweek Preview" data-testid="input-cover-headline" />
                  </Field>
                  <Field label="Subtitle (optional)">
                    <Input value={spec.subtitle} maxLength={MAX_SUBTITLE} onChange={(e) => update({ subtitle: e.target.value })} placeholder="Captains, differentials and the best budget picks" data-testid="input-cover-subtitle" />
                  </Field>
                  <Field label="Tag (optional)">
                    <div className="flex gap-2">
                      <Input value={spec.tag} maxLength={MAX_TAG} onChange={(e) => update({ tag: e.target.value })} placeholder="e.g. Deadline tonight" data-testid="input-cover-tag" />
                      <Button type="button" variant="outline" onClick={() => update({ tag: `GW${defaultRange.from}` })} data-testid="button-cover-gw">GW{defaultRange.from}</Button>
                    </div>
                  </Field>
                  <Field label="Featured players (up to 3, optional)">
                    <PlayerPicker elements={elements} teamShortById={teamShortById} selected={spec.players} max={3} onChange={(players) => update({ players })} />
                  </Field>
                </>
              )}

              {spec.template === "team-reveal" && (
                <SquadBuilder
                  spec={spec}
                  update={update}
                  elements={elements}
                  teamShortById={teamShortById}
                  xptsById={squadXptsById}
                  gameweek={lineupGw}
                  gameweekOptions={openGameweeks.includes(lineupGw) ? openGameweeks : [...openGameweeks, lineupGw].sort((a, b) => a - b)}
                />
              )}

              {spec.template === "predicted-lineup" && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Club">
                    <SimpleSelect
                      value={spec.teams[0] ? String(spec.teams[0]) : ""}
                      onChange={(v) => update({ teams: [parseInt(v, 10)] })}
                      options={[...teams].sort((a, b) => a.name.localeCompare(b.name)).map((t) => ({ value: String(t.id), label: t.name }))}
                      testId="select-lineup-club"
                    />
                  </Field>
                  <Field label="Gameweek">
                    <SimpleSelect
                      value={String(lineupGw)}
                      onChange={(v) => update({ from: parseInt(v, 10), to: parseInt(v, 10) })}
                      options={(openGameweeks.includes(lineupGw) ? openGameweeks : [...openGameweeks, lineupGw].sort((a, b) => a - b)).map((gw) => ({ value: String(gw), label: `GW${gw}` }))}
                      testId="select-lineup-gw"
                    />
                  </Field>
                </div>
              )}

              {spec.template === "fixtures-comparison" && (
                <Field label="Teams (2 to 4)">
                  <div className="flex flex-wrap gap-1.5" data-testid="graphics-teams">
                    {[...teams].sort((a, b) => a.name.localeCompare(b.name)).map((t) => {
                      const on = spec.teams.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => toggleTeam(t.id)}
                          aria-pressed={on}
                          disabled={!on && spec.teams.length >= 4}
                          className={`rounded-full border px-2.5 py-1 text-xs font-medium disabled:opacity-40 ${on ? ACTIVE_CHIP : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"}`}
                          data-testid={`team-${t.short_name}`}
                        >
                          {t.short_name}
                        </button>
                      );
                    })}
                  </div>
                </Field>
              )}

              {spec.template === "price-change" && (
                <Field label="Day">
                  <SimpleSelect
                    value={spec.date || "latest"}
                    onChange={(v) => update({ date: v === "latest" ? "" : v })}
                    options={[{ value: "latest", label: "Latest day with changes" }, ...priceContent.availableDates.map((d) => ({ value: d, label: longDate(d) }))]}
                    testId="select-price-day"
                  />
                </Field>
              )}

              {spec.template === "top-differentials" && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Position">
                    <SimpleSelect
                      value={spec.pos ?? "ALL"}
                      onChange={(v) => update({ pos: v === "ALL" ? null : (v as GraphicPosition) })}
                      options={POSITIONS.map((p) => ({ value: p, label: p === "ALL" ? "All positions" : p }))}
                      testId="select-position"
                    />
                  </Field>
                  <Field label="Owned by under">
                    <SimpleSelect
                      value={String(spec.maxOwn)}
                      onChange={(v) => update({ maxOwn: parseInt(v, 10) })}
                      options={(OWNERSHIP_OPTIONS.includes(spec.maxOwn) ? OWNERSHIP_OPTIONS : [...OWNERSHIP_OPTIONS, spec.maxOwn].sort((a, b) => a - b)).map((n) => ({ value: String(n), label: `${n}%` }))}
                      testId="select-ownership"
                    />
                  </Field>
                  <Field label="How many players">
                    <SimpleSelect value={String(spec.top)} onChange={(v) => update({ top: parseInt(v, 10) })} options={[3, 4, 5, 6, 7, 8, 9, 10].map((n) => ({ value: String(n), label: `Top ${n}` }))} testId="select-top" />
                  </Field>
                </div>
              )}

              {usesRange && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="From gameweek">
                    <SimpleSelect
                      value={String(from)}
                      onChange={(v) => {
                        const f = parseInt(v, 10);
                        update({ from: f, to: Math.min(f + MAX_RANGE_GAMEWEEKS - 1, Math.max(f, to)) });
                      }}
                      options={openGameweeks.map((gw) => ({ value: String(gw), label: `GW${gw}` }))}
                      testId="select-from"
                    />
                  </Field>
                  <Field label="To gameweek">
                    <SimpleSelect
                      value={String(to)}
                      onChange={(v) => update({ from, to: parseInt(v, 10) })}
                      options={openGameweeks.filter((gw) => gw >= from && gw < from + MAX_RANGE_GAMEWEEKS).map((gw) => ({ value: String(gw), label: `GW${gw}` }))}
                      testId="select-to"
                    />
                  </Field>
                </div>
              )}

              <div className="border-t pt-4 grid grid-cols-2 gap-3">
                <Field label="Size">
                  <SimpleSelect value={spec.size} onChange={(v) => update({ size: v as SizeId })} options={(Object.keys(GRAPHIC_SIZES) as SizeId[]).map((s) => ({ value: s, label: GRAPHIC_SIZES[s].label }))} testId="select-size" />
                </Field>
                <Field label="Colours">
                  <SimpleSelect value={spec.theme} onChange={(v) => update({ theme: v as ThemeId })} options={GRAPHIC_THEMES.map((t) => ({ value: t, label: THEME_LABEL[t] }))} testId="select-theme" />
                </Field>
                {spec.template !== "cover" && <div className="col-span-2">
                  <Field label="Headline (optional)">
                    <Input value={spec.headline} maxLength={60} onChange={(e) => update({ headline: e.target.value })} placeholder="Use the default headline" data-testid="input-headline" />
                  </Field>
                </div>}
              </div>

              <div className="grid grid-cols-2 gap-3 border-t pt-4">
                <Field label="Your handle (optional)">
                  <Input value={handleText} maxLength={16} onChange={(e) => changeHandle(e.target.value)} placeholder="@yourname" data-testid="input-handle" />
                </Field>
                <Field label="Accent colour (optional)">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={spec.accent || "#fbbf24"}
                      onChange={(e) => changeAccent(e.target.value)}
                      className="h-9 w-12 cursor-pointer rounded-md border border-gray-200 bg-transparent p-0.5"
                      aria-label="Accent colour"
                      data-testid="input-accent"
                    />
                    {spec.accent && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => changeAccent("")} data-testid="button-accent-reset">Reset</Button>
                    )}
                  </div>
                </Field>
                {handleText.trim() && !spec.handle && (
                  <p className="col-span-2 text-xs text-amber-700" role="status" data-testid="handle-hint">Use letters, numbers and _ only, up to 15 characters. No handle is shown until it is valid.</p>
                )}
                <p className="col-span-2 text-xs text-gray-500">Your handle sits next to the FPL Dilemmas watermark on the footer strip, and goes in the post caption. Saved in this browser.</p>
              </div>

              <div className="space-y-3 rounded-xl border border-indigo-200/60 bg-indigo-50/40 p-3" data-testid="gameweek-pack">
                <div className="flex items-center gap-2 text-sm font-extrabold">
                  <Package className="h-4 w-4 text-indigo-600" />
                  Gameweek pack
                </div>
                <p className="text-xs text-gray-600">One download with the standard set for a gameweek ({GAMEWEEK_PACK.map((x) => x.label.toLowerCase()).join(", ")}) plus a captions.txt with a ready-to-post caption for each image. Uses your size, colours and handle.</p>
                <div className="flex items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <Field label="Gameweek">
                      <SimpleSelect
                        value={String(selectedPackGw)}
                        onChange={(v) => setPackGw(parseInt(v, 10))}
                        options={(openGameweeks.includes(selectedPackGw) ? openGameweeks : [...openGameweeks, selectedPackGw].sort((a, b) => a - b)).map((gw) => ({ value: String(gw), label: `GW${gw}` }))}
                        testId="select-pack-gw"
                      />
                    </Field>
                  </div>
                  <Button type="button" onClick={runPack} disabled={pack.busy || !elements.length} className="gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-500 hover:to-violet-500" data-testid="button-pack">
                    <Download className="h-4 w-4" />
                    {pack.busy ? `Making ${Math.min(pack.done + 1, pack.total)} of ${pack.total}…` : "Download pack"}
                  </Button>
                </div>
                {pack.message && <p className={`text-xs ${pack.ok ? "text-emerald-700" : "text-red-600"}`} role="status" data-testid="pack-message">{pack.message}</p>}
              </div>
          </SectionCard>

          <div className="order-first min-w-0 space-y-3 lg:order-none">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <span className="rounded-full bg-indigo-500/10 px-2.5 py-1 font-bold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">Preview</span>
                The saved image is {fullWidth}×{fullHeight}px and carries the FPL Dilemmas watermark.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={copyLink} className="gap-2" data-testid="button-copy-link">
                  {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy link"}
                </Button>
                <Button variant="outline" size="sm" onClick={copyCaption} disabled={!caption} className="gap-2" data-testid="button-copy-caption">
                  {captionCopied ? <Check className="h-4 w-4" /> : <ClipboardCopy className="h-4 w-4" />}
                  {captionCopied ? "Copied" : "Copy caption"}
                </Button>
                {data && !(data.kind === "team-reveal" && !data.reveal.complete) && (
                  <ShareImageButton
                    renderCard={() => <GraphicCanvas spec={spec} theme={theme} data={data} />}
                    title={GRAPHIC_TEMPLATES.find((t) => t.id === spec.template)!.label}
                    width={fullWidth}
                    height={fullHeight}
                    fileName={graphicFileName(spec, fileParts)}
                    caption={caption ?? undefined}
                    className="border-transparent bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-500 hover:to-violet-500 hover:text-white"
                  />
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-100/60 p-3 [background-image:radial-gradient(circle_at_1px_1px,rgba(99,102,241,0.18)_1px,transparent_0)] [background-size:18px_18px] sm:p-5">
            <div ref={previewRef} className="w-full" data-testid="graphics-preview">
              {bootstrapError ? (
                <div className="py-16 text-center text-sm text-gray-500" role="status">Couldn't load player data. Please refresh.</div>
              ) : loading || (!data && !problem) ? (
                <div className="py-16 text-center text-sm text-gray-500" role="status">Loading…</div>
              ) : problem ? (
                <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center text-sm text-gray-600" role="status" data-testid="graphics-problem">{problem}</div>
              ) : (
                <div style={{ width: fullWidth * scale, height: fullHeight * scale, overflow: "hidden", borderRadius: 12, boxShadow: "0 4px 24px rgba(0,0,0,0.18)" }}>
                  <div style={{ width: fullWidth, height: fullHeight, transform: `scale(${scale})`, transformOrigin: "top left" }}>{canvas}</div>
                </div>
              )}
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
