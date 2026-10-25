import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, BarChart3, CalendarClock, CalendarRange, Check, Crown, GitCompareArrows, Image as ImageIcon, ImagePlus, Link2, Newspaper, Search, Shirt, SlidersHorizontal, Sparkles, TrendingUp, Trophy, Package, Download, ClipboardCopy, HeartPulse, UserRound, Users, X, Target, ListChecks, Eye, FileText, Medal, LineChart, ListOrdered, Table2, Activity, BarChart2, ClipboardList, ClipboardCheck, type LucideIcon } from "lucide-react";
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
  MAX_GW_POINTS_PLAYERS,
  MAX_MANAGER_NAME,
  type ChipId,
  GAMEWEEK_PACK,
  REVIEW_PACK,
  reviewPackSpecs,
  reviewZipName,
  isEmptyGraphic,
  MIN_WATCH_OWNERSHIP,
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
  type PredictedLineupContent,
  type PriceChangeInput,
  type SizeId,
  type TemplateId,
  type ThemeId,
} from "@shared/graphics";
import { projectionWindow } from "@shared/compare-utils";
import { resolveHistoryGameweeks, type HistoryRowInput } from "@shared/graphics-players";
import { MATCH_LIST_LIMIT, predictionPageCount, resultsPageCount } from "@shared/graphics-matches";
import { TEAM_METRICS, formExtremes, resolveProjectedEndGameweek, teamGraphicUrl } from "@shared/graphics-teams";
import { isFixtureResult, isFixtureUpcoming, predictionGameweeks, resolveMatch, resolvePredictionGameweek, resolveResultsGameweek, resultGameweeks, type MatchFixtureInput, type MatchModelInput } from "@shared/graphics-matches";
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
  "my-gameweek": ClipboardCheck,
  cover: ImageIcon,
  "player-news": Newspaper,
  "captain-picks": Crown,
  "fixture-ticker": CalendarClock,
  "transfer-trends": ArrowLeftRight,
  "team-of-the-week": Trophy,
  "stat-leaders": BarChart3,
  "availability-watch": HeartPulse,
  "match-predictions": Target,
  "match-results": ListChecks,
  "match-preview": Eye,
  "match-report": FileText,
  "player-projections": ListOrdered,
  "gw-top-scorers": Medal,
  "gw-points": ClipboardList,
  "player-history": LineChart,
  "team-projections": BarChart2,
  "projected-table": Table2,
  "league-table": ListOrdered,
  "team-history": Activity,
};
// Templates are grouped so the picker stays short; each group has its own colour.
type TemplateGroupId = "all" | "players" | "my-team" | "matches" | "teams" | "social";
const TEMPLATE_GROUPS: Array<{ id: TemplateGroupId; label: string; tile: string; solid: string; chip: string; templates: string[] }> = [
  { id: "all", label: "All", tile: "from-indigo-500/15 to-violet-500/15 text-indigo-600 dark:text-indigo-300", solid: "from-indigo-600 to-violet-600", chip: "from-indigo-600 to-violet-600", templates: [] },
  { id: "players", label: "Players", tile: "from-indigo-500/15 to-violet-500/15 text-indigo-600 dark:text-indigo-300", solid: "from-indigo-600 to-violet-600", chip: "from-indigo-600 to-violet-600",
    templates: ["player-card", "player-comparison", "price-change", "top-differentials", "captain-picks", "transfer-trends", "stat-leaders", "availability-watch", "player-projections", "gw-top-scorers", "gw-points", "player-history"] },
  { id: "my-team", label: "My team & lineups", tile: "from-amber-500/20 to-orange-500/15 text-amber-700 dark:text-amber-300", solid: "from-amber-500 to-orange-600", chip: "from-amber-500 to-orange-600",
    templates: ["team-reveal", "my-gameweek", "predicted-lineup", "team-of-the-week"] },
  { id: "matches", label: "Matches", tile: "from-emerald-500/20 to-teal-500/15 text-emerald-700 dark:text-emerald-300", solid: "from-emerald-500 to-teal-600", chip: "from-emerald-500 to-teal-600",
    templates: ["fixtures-comparison", "fixture-ticker", "match-predictions", "match-results", "match-preview", "match-report"] },
  { id: "teams", label: "Clubs & tables", tile: "from-sky-500/20 to-cyan-500/15 text-sky-700 dark:text-sky-300", solid: "from-sky-500 to-blue-600", chip: "from-sky-500 to-blue-600",
    templates: ["team-projections", "projected-table", "league-table", "team-history"] },
  { id: "social", label: "Social", tile: "from-fuchsia-500/20 to-pink-500/15 text-fuchsia-700 dark:text-fuchsia-300", solid: "from-fuchsia-500 to-pink-600", chip: "from-fuchsia-500 to-pink-600",
    templates: ["cover", "player-news"] },
];
const groupOfTemplate = (id: string): TemplateGroupId => TEMPLATE_GROUPS.find((g) => g.id !== "all" && g.templates.includes(id))?.id ?? "players";
const ACTIVE_CHIP = "border-transparent bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-sm";
import { extractManagerId } from "@/lib/manager-id-utils";
import { readToolManagerId, saveToolManagerId } from "@/lib/manager-id-storage";
import { defaultSelectionPatch, needsDefaults } from "@shared/graphic-defaults";
import { FORMATIONS } from "@shared/formations";
import { arrangeInFormation, rankForSlot, replaceSlot, type EditPlayer } from "@shared/lineup-edit";
import { DETAILED_POSITIONS_URL, computeGraphicData, detailedPositionsFromResponse, loadGraphicData, longDate, makeGraphicDataContext, managerDataFromBodies, managerRequests, matchModelGameweek, resolveGameweeks, resolveStartedGw, resolveTotwGw, type LiveElement, type PlayerProjection } from "@/lib/graphic-data";
import { prepareFontEmbedCSS, renderToPng } from "@/lib/render-png";
import { createZip } from "@shared/zip";
import { selectableGameweeks } from "@shared/league-ownership";

const DEFAULT_WEEKS = 5;
const POSITIONS: Array<GraphicPosition | "ALL"> = ["ALL", "GKP", "DEF", "MID", "FWD"];
const OWNERSHIP_OPTIONS = [1, 2, 3, 5, 10, 15, 20];
const POSITION_BY_TYPE: Record<number, GraphicPosition> = { 1: "GKP", 2: "DEF", 3: "MID", 4: "FWD" };
// Templates about one gameweek keep it in `from` (and `to`) of the link, so it is not carried into other templates' ranges.
const SINGLE_GAMEWEEK: TemplateId[] = ["predicted-lineup", "team-reveal", "my-gameweek", "captain-picks", "team-of-the-week", "match-predictions", "match-results", "match-preview", "match-report", "gw-top-scorers", "gw-points", "projected-table"];
const MATCH_TEMPLATES: TemplateId[] = ["match-predictions", "match-results", "match-preview", "match-report"];
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

/** Predicted Lineup: pick a formation and switch players slot by slot. Anything changed marks the image as user-edited. */
function LineupEditor({ spec, update, lineup, squad, elementById }: {
  spec: GraphicSpec;
  update: (patch: Partial<GraphicSpec>) => void;
  lineup: PredictedLineupContent | null;
  squad: EditPlayer[];
  elementById: Map<number, GraphicElement>;
}) {
  const edited = !!spec.formation;
  const changeFormation = (v: string) => {
    if (v === "auto") return update({ formation: "", xi: [] });
    // players already chosen by hand stay (moved to where they fit); otherwise the club's likeliest players are used
    const xi = spec.xi.length === 11 ? arrangeInFormation(v, spec.xi.filter((id) => id > 0), squad).map((id) => id ?? 0) : [];
    update({ formation: v, xi });
  };
  const changeSlot = (slot: number, v: string) => {
    if (!lineup) return;
    const current = lineup.slots.map((x) => x.id);
    const next = v === "none" ? current.map((id, i) => (i === slot ? null : id)) : replaceSlot(current, slot, parseInt(v, 10));
    update({ xi: next.map((id) => id ?? 0) });
  };
  const optionLabel = (p: EditPlayer) => {
    const e = elementById.get(p.id);
    const warn = e?.status === "i" || e?.status === "d" || e?.status === "s" ? " ⚠" : "";
    return `${e?.web_name ?? p.id} · ${p.codes?.[0] ?? p.fplPosition}${warn}`;
  };
  return (
    <div className="space-y-3" data-testid="lineup-editor">
      <Field label="Formation">
        <SimpleSelect
          value={spec.formation || "auto"}
          onChange={changeFormation}
          options={[{ value: "auto", label: `Our prediction${lineup?.modelFormation ? ` (${lineup.modelFormation})` : ""}` }, ...FORMATIONS.map((f) => ({ value: f, label: f }))]}
          testId="select-lineup-formation"
        />
      </Field>
      {edited && lineup && lineup.slots.length === 11 && (
        <>
          <div className="space-y-1.5" data-testid="lineup-slots">
            {lineup.slots.map((slot, i) => {
              const options = rankForSlot(slot.role, squad);
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-11 shrink-0 rounded-md bg-gray-100 px-1.5 py-1 text-center text-xs font-semibold text-gray-700">{slot.role}</span>
                  <div className="min-w-0 flex-1">
                    <SimpleSelect
                      value={slot.id === null ? "none" : String(slot.id)}
                      onChange={(v) => changeSlot(i, v)}
                      options={[...(slot.id === null ? [{ value: "none", label: "Empty" }] : []), ...options.map((p) => ({ value: String(p.id), label: optionLabel(p) }))]}
                      testId={`select-lineup-slot-${i}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-500">Choosing a player who is already in the XI swaps the two. The image is marked as user-edited.</p>
        </>
      )}
      {edited && (
        <button
          type="button"
          onClick={() => update({ formation: "", xi: [] })}
          className="text-xs font-medium text-indigo-700 underline underline-offset-2 hover:text-indigo-900"
          data-testid="lineup-reset"
        >
          Back to our prediction
        </button>
      )}
    </div>
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

/**
 * My Gameweek: the team ID (shared with the other tools) and the gameweek. The team's name is filled in as the manager name,
 * which can be changed. Once an ID is known the graphic is drawn straight away.
 */
function MyGameweekControls({ spec, update, startedGameweeks, finishedGameweeks, gameweek }: {
  spec: GraphicSpec;
  update: (patch: Partial<GraphicSpec>) => void;
  startedGameweeks: number[];
  finishedGameweeks: number[];
  gameweek: number;
}) {
  const [idText, setIdText] = useState(() => (spec.entry > 0 ? String(spec.entry) : readToolManagerId()));
  const [state, setState] = useState<LoadState>({ busy: false, error: null, info: null });
  const autoNameRef = useRef("");

  const apply = async (raw: string) => {
    const id = extractManagerId(raw);
    if (!id || id === "0") {
      setState({ busy: false, error: "Enter your FPL team ID, or paste your team link from the FPL site.", info: null });
      return;
    }
    setState({ busy: true, error: null, info: null });
    try {
      const res = await fetch(`/api/manager/${id}`);
      if (!res.ok) {
        setState({ busy: false, error: res.status === 404 ? "No FPL team was found with that ID." : "Couldn't load that team right now. Please try again.", info: null });
        return;
      }
      const info = await res.json().catch(() => ({}));
      const name = `${info?.player_first_name ?? ""} ${info?.player_last_name ?? ""}`.trim().slice(0, MAX_MANAGER_NAME);
      const patch: Partial<GraphicSpec> = { entry: parseInt(id, 10) };
      if (!spec.manager.trim() || spec.manager === autoNameRef.current) {
        patch.manager = name;
        autoNameRef.current = name;
      }
      update(patch);
      saveToolManagerId(id); // so Rate My Team, Hindsight, League Ownership and Player Plot open on the same team
      setState({ busy: false, error: null, info: name ? `Showing ${name}${info?.name ? ` (${info.name})` : ""}.` : "Team loaded." });
    } catch {
      setState({ busy: false, error: "Couldn't load that team right now. Please try again.", info: null });
    }
  };

  // a saved ID is used as soon as the template opens
  const triedRef = useRef(false);
  useEffect(() => {
    if (triedRef.current) return;
    triedRef.current = true;
    if (spec.entry > 0) return;
    const saved = extractManagerId(readToolManagerId());
    if (saved && saved !== "0") void apply(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-3" data-testid="my-gameweek-controls">
      <Field label="Your FPL team ID">
        <div className="flex gap-2">
          <Input value={idText} onChange={(e) => setIdText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void apply(idText); }} inputMode="numeric" placeholder="Team ID or team link" data-testid="input-my-gw-id" />
          <Button type="button" variant="outline" onClick={() => void apply(idText)} disabled={state.busy} data-testid="button-my-gw-load">{state.busy ? "Loading…" : "Load"}</Button>
        </div>
        {state.error && <p className="text-xs text-red-600" role="alert" data-testid="my-gw-error">{state.error}</p>}
        {state.info && <p className="text-xs text-emerald-700" role="status" data-testid="my-gw-info">{state.info}</p>}
      </Field>
      <Field label="Gameweek">
        <SimpleSelect
          value={String(gameweek || "")}
          onChange={(v) => update({ from: parseInt(v, 10), to: parseInt(v, 10) })}
          options={[...startedGameweeks].reverse().map((gw) => ({ value: String(gw), label: finishedGameweeks.includes(gw) ? `GW${gw}` : `GW${gw} (live)` }))}
          testId="select-my-gw"
        />
      </Field>
      <Field label="Name on the graphic (optional)">
        <Input value={spec.manager} maxLength={MAX_MANAGER_NAME} onChange={(e) => update({ manager: e.target.value })} placeholder="Your name or team name" data-testid="input-my-gw-name" />
      </Field>
      <p className="text-xs text-gray-500">Your team as FPL scored it: each player's points (the captain's doubled), automatic substitutions, your gameweek points and rank, and your overall points and rank. A live gameweek's figures can still change.</p>
    </div>
  );
}

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
  // the team ID is shared with Rate My Team, Hindsight, League Ownership and Player Plot: pre-filled once entered anywhere
  const [idText, setIdText] = useState(() => (spec.entry > 0 ? String(spec.entry) : readToolManagerId()));
  const [load, setLoad] = useState<LoadState>({ busy: false, error: null, info: null });
  // the ID whose squad is in the builder (or was already tried), so an unchanged ID is never loaded twice; a squad that came
  // from the link counts as "already chosen" and is not replaced just because an ID is saved
  const loadedIdRef = useRef<string>(spec.squad.length > 0 ? extractManagerId(readToolManagerId()) : "");
  // the manager name we filled in ourselves from a loaded team: replaced when another team loads, whereas a name typed by the person stays
  const autoManagerRef = useRef<string>("");
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

  const loadSquad = async (id: string, auto = false) => {
    if (!id || id === "0") {
      setLoad({ busy: false, error: "Enter your FPL team ID, or paste your team link from the FPL site.", info: null });
      return;
    }
    loadedIdRef.current = id; // also when it fails, so an automatic load never retries the same ID in a loop
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
      const patch: Partial<GraphicSpec> = { ...loaded, entry: /^\d+$/.test(id) ? parseInt(id, 10) : 0 };
      // FPL's own bench and captain are used; if the picks lack them, fall back to our suggestion from expected points
      if (!loaded.captain || loaded.bench.length !== BENCH_PLAYERS) {
        const suggested = suggestSquadSetup({ elements, squad: loaded.squad, xptsById });
        if (suggested.bench.length) Object.assign(patch, { bench: suggested.bench, captain: loaded.captain || suggested.captain, vice: loaded.vice || suggested.vice });
      }
      if (!spec.manager.trim() || spec.manager === autoManagerRef.current) {
        let name = typeof body.manager === "string" && body.manager.trim() ? body.manager.trim() : null;
        if (!name) {
          try {
            const info = await (await fetch(`/api/manager/${id}`)).json();
            name = `${info?.player_first_name ?? ""} ${info?.player_last_name ?? ""}`.trim() || null;
          } catch {
            /* the name is optional */
          }
        }
        const managerName = name ? name.slice(0, MAX_MANAGER_NAME) : "";
        patch.manager = managerName;
        autoManagerRef.current = managerName;
      }
      update(patch);
      saveToolManagerId(id); // so Rate My Team, Hindsight, League Ownership and Player Plot open on the same team
      const from = body.resolvedGameweek ?? body.gameweek;
      setNote(null);
      setLoad({
        busy: false,
        error: null,
        info: auto
          ? `Picked your squad automatically from team ${id} (GW${from ?? "?"}). Make this week's transfers below, then pick your chip.`
          : `Loaded the GW${from ?? "?"} squad. Make this week's transfers below, then pick your chip.`,
      });
    } catch {
      setLoad({ busy: false, error: "Couldn't load that team right now. Please try again.", info: null });
    }
  };
  const loadFromId = () => loadSquad(extractManagerId(idText));

  // Once a team ID is known (saved from another tool, or typed here) its squad is picked automatically; a new ID replaces it
  // (a short pause after typing, so half-typed IDs are not looked up). Nothing happens without an ID: no random squad.
  const firstCheckRef = useRef(true);
  useEffect(() => {
    if (!elements.length) return;
    const id = extractManagerId(idText);
    // the saved ID is used straight away when the template opens; a typed ID after a short pause
    const delay = firstCheckRef.current ? 0 : 800;
    firstCheckRef.current = false;
    if (!id || id === "0" || id === loadedIdRef.current) return;
    const t = setTimeout(() => void loadSquad(id, true), delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idText, elements.length]);

  const toggleBtn = (active: boolean) =>
    `rounded-md border px-2 py-1 text-xs font-bold leading-none ${active ? ACTIVE_CHIP : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"}`;

  return (
    <div className="space-y-4" data-testid="squad-builder">
      <Field label="Load your squad from your FPL team ID (optional)">
        <div className="flex gap-2">
          <Input value={idText} onChange={(e) => setIdText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") loadFromId(); }} inputMode="numeric" placeholder="Team ID or team link" data-testid="input-fpl-id" />
          <Button type="button" variant="outline" onClick={loadFromId} disabled={load.busy} data-testid="button-load-fpl">{load.busy ? "Loading…" : "Load"}</Button>
        </div>
        {!extractManagerId(idText) && spec.squad.length === 0 && (
          <p className="text-xs text-indigo-700" role="status" data-testid="id-prompt">Enter your FPL team ID and your squad is picked for you. It is remembered for the other tools too.</p>
        )}
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

const kickoffShort = (iso: string | null | undefined): string => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short" }).format(d);
};

/** Gameweek, page (long gameweeks) and match pickers for the four match templates. */
function MatchControls({
  spec, update, fixtures, teamShortById, pages,
}: {
  spec: GraphicSpec;
  update: (patch: Partial<GraphicSpec>) => void;
  fixtures: MatchFixtureInput[];
  teamShortById: Map<number, string>;
  pages: number;
}) {
  const upcoming = spec.template === "match-predictions" || spec.template === "match-preview";
  const single = spec.template === "match-preview" || spec.template === "match-report";
  const gameweeks = upcoming ? predictionGameweeks(fixtures) : [...resultGameweeks(fixtures)].reverse();
  const chosen = single ? resolveMatch(spec, fixtures, upcoming ? "upcoming" : "finished") : null;
  const gw = chosen?.event ?? (upcoming ? resolvePredictionGameweek(spec.from, fixtures) : resolveResultsGameweek(spec.from, fixtures));
  const matches = single
    ? fixtures
        .filter((f) => f.event === gw && (upcoming ? isFixtureUpcoming(f) : isFixtureResult(f)))
        .sort((a, b) => (a.kickoff_time ?? "").localeCompare(b.kickoff_time ?? "") || a.id - b.id)
    : [];
  const label = (f: MatchFixtureInput) => {
    const score = !upcoming && typeof f.team_h_score === "number" ? ` ${f.team_h_score}-${f.team_a_score}` : " v";
    return `${teamShortById.get(f.team_h) ?? "?"}${score} ${teamShortById.get(f.team_a) ?? "?"} · ${kickoffShort(f.kickoff_time)}`;
  };
  if (!gameweeks.length) {
    return <p className="text-xs text-gray-600" data-testid="match-controls-empty">{upcoming ? "There are no fixtures left to play yet." : "No match has finished yet."}</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Gameweek">
        <SimpleSelect
          value={String(gw)}
          onChange={(v) => update({ from: parseInt(v, 10), to: parseInt(v, 10), fixture: 0, page: 1 })}
          options={gameweeks.map((g) => ({ value: String(g), label: `GW${g}` }))}
          testId="select-match-gw"
        />
      </Field>
      {single ? (
        <div className="col-span-2">
          <Field label="Match">
            <SimpleSelect
              value={chosen ? String(chosen.id) : ""}
              onChange={(v) => update({ fixture: parseInt(v, 10), from: gw, to: gw })}
              options={matches.map((f) => ({ value: String(f.id), label: label(f) }))}
              testId="select-match"
            />
          </Field>
        </div>
      ) : (
        pages > 1 && (
          <Field label="Page">
            <SimpleSelect
              value={String(Math.min(spec.page, pages))}
              onChange={(v) => update({ page: parseInt(v, 10) })}
              options={Array.from({ length: pages }, (_, i) => ({ value: String(i + 1), label: `Page ${i + 1} of ${pages}` }))}
              testId="select-match-page"
            />
          </Field>
        )
      )}
      {upcoming && <p className="col-span-2 text-xs text-gray-500">Expected goals and clean-sheet chances are our projections; win chances are the latest market odds, shown only when a market is open.</p>}
      {!upcoming && <p className="col-span-2 text-xs text-gray-500">Scores, scorers, cards and bonus points are FPL's official match data. Live matches are not shown until they finish.</p>}
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

type PackKind = "preview" | "review";
type PackState = { busy: boolean; kind: PackKind | null; done: number; total: number; message: string | null; ok: boolean; messageKind: PackKind | null };

export default function GraphicsPage() {
  const [spec, setSpec] = useState<GraphicSpec>(() => {
    const fromLink = decodeSpec(typeof window !== "undefined" ? window.location.search : "");
    // a link made by someone else keeps its own handle and accent; otherwise start from this browser's saved ones
    return fromLink.handle || fromLink.accent || typeof window === "undefined" ? fromLink : { ...fromLink, ...loadBrand() };
  });
  const [group, setGroup] = useState<TemplateGroupId>(() => groupOfTemplate(spec.template));
  const [handleText, setHandleText] = useState(() => (spec.handle ? `@${spec.handle}` : ""));
  const [copied, setCopied] = useState(false);
  const [captionCopied, setCaptionCopied] = useState(false);
  const [packGw, setPackGw] = useState<number | null>(null);
  const [reviewGw, setReviewGw] = useState<number | null>(null);
  const [pack, setPack] = useState<PackState>({ busy: false, kind: null, done: 0, total: GAMEWEEK_PACK.length, message: null, ok: true, messageKind: null });
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

  // work out the font embedding in the background, so the first image (Share or pack) does not have to wait for it
  useEffect(() => {
    const t = setTimeout(() => void prepareFontEmbedCSS().catch(() => undefined), 1500);
    return () => clearTimeout(t);
  }, []);

  // on a phone the template cards scroll sideways: keep the chosen one in view
  useEffect(() => {
    document.querySelector(`[data-testid="template-${spec.template}"]`)?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [spec.template, group]);

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
  // Player Points works for any gameweek that has started, the live one included
  const startedGameweeks = useMemo(() => selectableGameweeks((bootstrap?.events ?? []) as Array<{ id: number; finished?: boolean; deadline_time?: string | null }>), [bootstrap?.events]);
  const pointsGw = resolveStartedGw(spec, startedGameweeks);
  const liveGw = spec.template === "gw-points" || spec.template === "my-gameweek" ? pointsGw : totwGw;
  const { data: liveData, isLoading: liveLoading } = useQuery<{ elements: LiveElement[] }>({
    queryKey: [`/api/event/${liveGw}/live`],
    staleTime: (spec.template === "gw-points" || spec.template === "my-gameweek") && !finishedGameweeks.includes(liveGw) ? 60 * 1000 : 5 * 60 * 1000,
    enabled: (spec.template === "team-of-the-week" || spec.template === "gw-top-scorers" || spec.template === "gw-points" || spec.template === "my-gameweek") && liveGw > 0,
  });

  // Team Reveal / My Gameweek: the manager's picks, transfers and (for the reveal) previous gameweek's picks. Picks that are not
  // out yet, or a failed request, are not errors: the figures are left off.
  const managerReq = useMemo(() => managerRequests(spec, { defaultRange, startedGameweeks }), [spec.template, spec.entry, spec.from, defaultRange, startedGameweeks]);
  const { data: managerBodies } = useQuery<{ picks: any; previous: any; transfers: any }>({
    queryKey: ["graphic-manager", ...managerReq.urls],
    enabled: managerReq.urls.length > 0,
    staleTime: 60 * 1000,
    retry: false,
    queryFn: async () => {
      const get = async (url: string | null) => {
        if (!url) return null;
        try {
          const r = await fetch(url);
          return r.ok ? await r.json() : null;
        } catch {
          return null;
        }
      };
      const [picks, previous, transfers] = await Promise.all([get(managerReq.picks), get(managerReq.previous), get(managerReq.transfers)]);
      return { picks, previous, transfers };
    },
  });
  const managerData = useMemo(
    () => (managerReq.gameweek > 0 && managerBodies ? managerDataFromBodies(spec, managerReq.gameweek, managerBodies) : undefined),
    [managerReq.gameweek, managerBodies, spec.entry],
  );

  // Player History: FPL's match history of the chosen player (the same request the player page makes)
  const historyPlayerId = spec.template === "player-history" ? spec.players[0] : undefined;
  const { data: historyData } = useQuery<{ history: HistoryRowInput[] }>({
    queryKey: ["/api/element-summary", String(historyPlayerId ?? "")],
    staleTime: 5 * 60 * 1000,
    enabled: !!historyPlayerId,
  });
  // Predicted Lineup: each player's detailed position (FotMob), so the XI is drawn where they actually play. If the request
  // fails the lineup falls back on FPL's positions rather than waiting forever.
  const { data: detailedPositionRows, isError: detailedPositionsFailed } = useQuery<Array<{ fplPlayerId: number; mainPosition: string; otherPositions: string[] }>>({
    queryKey: [DETAILED_POSITIONS_URL],
    staleTime: 60 * 60 * 1000,
    enabled: spec.template === "predicted-lineup",
  });
  const detailedPositions = useMemo(
    () => (detailedPositionRows ? detailedPositionsFromResponse(detailedPositionRows) : detailedPositionsFailed ? new Map<number, string[]>() : undefined),
    [detailedPositionRows, detailedPositionsFailed],
  );
  // Team graphics: the one request each is built from (the same URL the pack uses)
  const nextGw = useMemo(() => ((bootstrap?.events ?? []) as Array<{ id: number; is_next?: boolean }>).find((e) => e.is_next)?.id ?? 39, [bootstrap?.events]);
  const teamUrl = teamGraphicUrl(spec, defaultRange, nextGw);
  const { data: teamResponse } = useQuery<any[]>({ queryKey: [teamUrl ?? ""], staleTime: 5 * 60 * 1000, enabled: !!teamUrl });
  const resultGws = useMemo(() => resultGameweeks((fixtures ?? []) as unknown as MatchFixtureInput[]), [fixtures]);

  // Match Predictions and Match Preview: the team projections and market odds for the one gameweek being drawn
  const matchGw = matchModelGameweek(spec, fixtures);
  const needsMatchModel = (spec.template === "match-predictions" || spec.template === "match-preview") && matchGw > 0;
  const { data: matchGoals } = useQuery<any[]>({ queryKey: [`/api/team-goal-projections?startGameweek=${matchGw}&endGameweek=${matchGw}`], staleTime: 5 * 60 * 1000, enabled: needsMatchModel });
  const { data: matchCs } = useQuery<any[]>({ queryKey: [`/api/team-cs-projections?startGameweek=${matchGw}&endGameweek=${matchGw}`], staleTime: 5 * 60 * 1000, enabled: needsMatchModel });
  const { data: matchOdds } = useQuery<{ odds: MatchModelInput["odds"] }>({ queryKey: [`/api/fixture-odds-current`], staleTime: 5 * 60 * 1000, enabled: needsMatchModel });
  const matchModel = useMemo<MatchModelInput | undefined>(
    () => (needsMatchModel && matchGoals && matchCs && matchOdds ? { goals: matchGoals, cs: matchCs, odds: matchOdds.odds ?? [] } : undefined),
    [needsMatchModel, matchGoals, matchCs, matchOdds],
  );

  // Nothing opens empty: a template with nothing chosen gets a sensible default (best projected, trending in, next club...)
  // once the data is in. It never overwrites a choice: it only fills an empty selection, once per template, and a template
  // that already had a selection (a link, or the person's own pick) is marked as decided so clearing it later stays cleared.
  const defaultedRef = useRef<Set<string>>(new Set());
  const rangeTotals = useMemo(
    () => new Map<number, number | null>((projections ?? []).map((p) => [p.playerId, projectionWindow(p.gameweekProjections, gameweeks).total])),
    [projections, gameweeks],
  );
  const tickerRows = useMemo(
    () => (fixtures && teams.length ? buildFixtureTicker({ teamIds: teams.map((t) => t.id), gameweeks, fixtures: fixtures as any, teamShortById, teamNameById }).rows : []),
    [fixtures, teams, gameweeks, teamShortById, teamNameById],
  );
  useEffect(() => {
    if (!elements.length) return;
    if (!needsDefaults(spec)) {
      defaultedRef.current.add(spec.template);
      return;
    }
    if (defaultedRef.current.has(spec.template)) return;
    const patch = defaultSelectionPatch(spec, { elements, totals: rangeTotals, fixtures: fixtures as any, gameweek: lineupGw, tickerRows });
    if (!patch) return; // the data it needs has not loaded yet
    defaultedRef.current.add(spec.template);
    update(patch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elements, spec.template, spec.players.length, spec.teams.length, rangeTotals, fixtures, lineupGw, tickerRows]);

  const squadXptsById = useMemo(
    () => new Map<number, number | null>((projections ?? []).map((p) => [p.playerId, p.gameweekProjections?.[String(lineupGw)] ?? null])),
    [projections, lineupGw],
  );

  const selectedElements = useMemo(() => {
    const byId = new Map(elements.map((e) => [e.id, e]));
    return spec.players.map((id) => byId.get(id)).filter((e): e is GraphicElement => !!e);
  }, [elements, spec.players]);

  const clubColor = useMemo(() => {
    const matchFixture = spec.template === "match-preview" ? resolveMatch(spec, (fixtures ?? []) as unknown as MatchFixtureInput[], "upcoming")
      : spec.template === "match-report" ? resolveMatch(spec, (fixtures ?? []) as unknown as MatchFixtureInput[], "finished") : null;
    const team =
      matchFixture ? matchFixture.team_h
      : spec.template === "fixtures-comparison" || spec.template === "predicted-lineup" || spec.template === "team-history" ? spec.teams[0]
      : spec.template === "team-reveal" ? elements.find((e) => e.id === spec.captain)?.team
      : selectedElements[0]?.team;
    return team !== undefined ? teamColor(teamShortById.get(team)) : null;
  }, [spec, fixtures, elements, selectedElements, teamShortById]);
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

  // everything the graphics are built from; the Gameweek pack builds each of its images from the same kind of context
  const dataContext = useMemo(
    () => makeGraphicDataContext({
      bootstrap,
      projections,
      fixtures,
      liveElements: liveData?.elements,
      priceChanges: pricesLoading ? undefined : priceChanges ?? [],
      defaultWeeks: DEFAULT_WEEKS,
      matchModel,
      matchModelGw: matchModel ? matchGw : undefined,
      playerHistory: historyPlayerId && historyData?.history ? { playerId: historyPlayerId, history: historyData.history } : undefined,
      teamData: teamUrl && teamResponse ? { url: teamUrl, data: teamResponse } : undefined,
      detailedPositions,
      manager: managerData,
    }),
    [bootstrap, projections, fixtures, liveData, pricesLoading, priceChanges, matchModel, matchGw, historyPlayerId, historyData, teamUrl, teamResponse, detailedPositions, managerData],
  );
  const { data, problem } = useMemo(() => computeGraphicData(spec, dataContext), [spec, dataContext]);

  // Predicted Lineup editor: the club's FPL squad with detailed positions and expected minutes, to rank who fits each slot
  const elementById = useMemo(() => new Map(elements.map((e) => [e.id, e])), [elements]);
  const lineupSquad = useMemo<EditPlayer[]>(() => {
    if (spec.template !== "predicted-lineup" || !spec.teams[0]) return [];
    const minutesById = new Map((projections ?? []).map((p) => [p.playerId, p.xMinsPerGW?.[String(lineupGw)] ?? 0]));
    return elements
      .filter((e) => e.team === spec.teams[0] && e.status !== "u" && POSITION_BY_TYPE[e.element_type])
      .map((e) => ({ id: e.id, fplPosition: POSITION_BY_TYPE[e.element_type], codes: detailedPositions?.get(e.id) ?? null, minutes: minutesById.get(e.id) ?? 0 }));
  }, [spec.template, spec.teams, elements, projections, lineupGw, detailedPositions]);

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
  const selectedReviewGw = reviewGw && finishedGameweeks.includes(reviewGw) ? reviewGw : finishedGameweeks[finishedGameweeks.length - 1] ?? 0;

  // Both packs work the same way: plan the images, load each one's own data (cached, so shared data is fetched once), draw
  // them with the fonts embedded once, and zip them with a captions.txt. A graphic with nothing to show is left out and named.
  const runPack = async (kind: PackKind) => {
    if (pack.busy) return;
    const gameweek = kind === "preview" ? selectedPackGw : selectedReviewGw;
    const zipLabel = kind === "preview" ? "GW pack" : "review pack";
    const fail = (message: string) => setPack((p) => ({ ...p, busy: false, kind, ok: false, message, messageKind: kind }));
    if (!gameweek) {
      fail("There is no finished gameweek to review yet.");
      return;
    }
    setPack({ busy: true, kind, done: 0, total: kind === "preview" ? GAMEWEEK_PACK.length : REVIEW_PACK.length, message: null, ok: true, messageKind: kind });
    const fresh = { staleTime: 5 * 60 * 1000 };
    const fetchJson = (url: string) => queryClient.fetchQuery<any>({ queryKey: [url], ...fresh });
    let baseContext: ReturnType<typeof makeGraphicDataContext>;
    let fixtureList: Fixture[];
    try {
      // the pack loads its own data (so it never depends on what the page happened to have loaded)
      const [bs, projs, fx, changes] = await Promise.all([
        queryClient.fetchQuery<BootstrapData>({ queryKey: ["/api/bootstrap-static"], ...fresh }),
        queryClient.fetchQuery<PlayerProjection[]>({ queryKey: ["/api/cached/player-total-points"], ...fresh }),
        queryClient.fetchQuery<Fixture[]>({ queryKey: ["/api/fixtures"], ...fresh }),
        kind === "preview" ? queryClient.fetchQuery<PriceChangeInput[]>({ queryKey: ["/api/price-changes/recent"], ...fresh }) : Promise.resolve([] as PriceChangeInput[]),
      ]);
      fixtureList = fx;
      baseContext = makeGraphicDataContext({ bootstrap: bs, projections: projs, fixtures: fx, liveElements: undefined, priceChanges: changes ?? [], defaultWeeks: DEFAULT_WEEKS });
    } catch {
      fail("Couldn't load the data for the pack. Please try again.");
      return;
    }
    try {
      const matches = fixtureList as unknown as import("@shared/graphics-matches").MatchFixtureInput[];
      const limit = MATCH_LIST_LIMIT[spec.size];
      let planned: ReturnType<typeof packSpecs>;
      if (kind === "preview") {
        const events = (bootstrap?.events ?? []) as Array<{ id: number; deadline_time?: string }>;
        const deadline = events.find((e) => e.id === gameweek)?.deadline_time ?? null;
        planned = packSpecs(spec, gameweek, { deadline, matchPages: predictionPageCount(matches, gameweek, limit) });
      } else {
        const form = formExtremes(matches, gameweek, baseContext.teams.map((t) => t.id));
        planned = reviewPackSpecs(spec, gameweek, { resultsPages: resultsPageCount(matches, gameweek, limit), bestForm: form.best, worstForm: form.worst });
      }
      const total = planned.length;
      setPack((p) => ({ ...p, total }));
      // fonts are embedded once for the whole pack, and shirt images are fetched once and reused: far faster than per image
      const fontEmbedCSS = await prepareFontEmbedCSS();
      const files: Array<{ name: string; data: Uint8Array }> = [];
      const captions: Array<{ fileName: string; caption: string }> = [];
      const skipped: string[] = [];
      for (let i = 0; i < planned.length; i++) {
        const { item, spec: s } = planned[i];
        setPack((p) => ({ ...p, done: i }));
        const itemContext = await loadGraphicData(s, baseContext, fetchJson);
        const { data: graphic } = computeGraphicData(s, itemContext);
        // nothing to show yet (e.g. no projections for that gameweek, or no price changes today): skip it rather than draw a blank card
        if (!graphic || isEmptyGraphic(graphic)) {
          skipped.push(item.label);
          continue;
        }
        const size = GRAPHIC_SIZES[s.size];
        const clubForTheme = s.template === "team-history" ? itemContext.teams.find((t) => t.id === s.teams[0]) : undefined;
        const blob = await renderToPng(
          <GraphicCanvas spec={s} theme={withAccent(resolveTheme(s.theme, clubForTheme ? teamColor(itemContext.teamShortById.get(clubForTheme.id)) : null), s.accent)} data={graphic} />,
          size.width,
          size.height,
          { fontEmbedCSS, cacheBust: false },
        );
        const fileName = packFileName(i, s.template);
        files.push({ name: fileName, data: new Uint8Array(await blob.arrayBuffer()) });
        captions.push({ fileName, caption: buildCaption(graphic, s) });
      }
      if (files.length === 0) {
        setPack({ busy: false, kind, done: total, total, ok: false, messageKind: kind, message: `Nothing to put in a GW${gameweek} ${zipLabel} yet: ${skipped.join(", ")} have no data. ${kind === "preview" ? "Try again closer to the deadline." : "Try again once matches have finished."}` });
        return;
      }
      files.push({ name: "captions.txt", data: new TextEncoder().encode(buildCaptionsFile(captions)) });
      const zip = createZip(files);
      const url = URL.createObjectURL(new Blob([zip.buffer as ArrayBuffer], { type: "application/zip" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = kind === "preview" ? packZipName(gameweek) : reviewZipName(gameweek);
      a.click();
      URL.revokeObjectURL(url);
      setPack({
        busy: false,
        kind,
        done: total,
        total,
        ok: true,
        messageKind: kind,
        message: `Downloaded ${captions.length} image${captions.length === 1 ? "" : "s"} and captions.txt${skipped.length ? `. Left out because there is nothing to show yet: ${skipped.join(", ")}.` : "."}`,
      });
    } catch {
      fail("Couldn't build the pack. Please try again.");
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

  const usesRange = spec.template === "player-card" || spec.template === "player-comparison" || spec.template === "fixtures-comparison" || spec.template === "top-differentials" || spec.template === "fixture-ticker" || spec.template === "player-projections" || spec.template === "team-projections";
  const activeStats = spec.stats.length ? spec.stats : DEFAULT_COMPARE_STATS;
  const loading = bootstrapLoading;
  const fileParts =
    spec.template === "price-change" ? [priceContent.date ?? ""]
    : spec.template === "predicted-lineup" ? [teamShortById.get(spec.teams[0]) ?? "", `gw${lineupGw}`]
    : spec.template === "team-reveal" ? [spec.manager || "squad", `gw${lineupGw}`]
    : spec.template === "my-gameweek" ? [spec.manager || "team", `gw${pointsGw}`]
    : spec.template === "player-news" ? selectedElements.map((e) => e.web_name)
    : spec.template === "captain-picks" ? [`gw${lineupGw}`]
    : spec.template === "fixture-ticker" ? [gwLabel]
    : spec.template === "transfer-trends" ? [`gw${transfersGw}`]
    : spec.template === "team-of-the-week" ? [`gw${totwGw}`]
    : data?.kind === "match-predictions" ? [`gw${data.predictions.gameweek}`, ...(data.predictions.pages > 1 ? [`p${data.predictions.page}`] : [])]
    : data?.kind === "match-results" ? [`gw${data.results.gameweek}`, ...(data.results.pages > 1 ? [`p${data.results.page}`] : [])]
    : data?.kind === "match-preview" ? [data.preview.home.short, data.preview.away.short, `gw${data.preview.gameweek}`]
    : data?.kind === "match-report" ? [data.report.home.short, data.report.away.short, `gw${data.report.gameweek}`]
    : data?.kind === "player-projections" ? [gwLabel, spec.pos ?? "all"]
    : data?.kind === "gw-top-scorers" ? [`gw${data.scorers.gameweek}`]
    : data?.kind === "gw-points" ? [`gw${data.points.gameweek}`, ...data.points.rows.slice(0, 3).map((r) => r.name)]
    : data?.kind === "player-history" ? [data.history.name, data.gwLabel]
    : data?.kind === "team-projections" ? [gwLabel, spec.metric]
    : data?.kind === "projected-table" ? [`gw${resolveProjectedEndGameweek(spec.to, nextGw)}`]
    : data?.kind === "league-table" ? [spec.venue]
    : data?.kind === "team-history" ? [data.history.short]
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

        <div className="mb-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Template groups" data-testid="graphics-groups">
          {TEMPLATE_GROUPS.map((g) => {
            const on = group === g.id;
            const count = g.id === "all" ? GRAPHIC_TEMPLATES.length : g.templates.length;
            return (
              <button
                key={g.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setGroup(g.id)}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition-all ${on ? `border-transparent bg-gradient-to-r ${g.chip} text-white shadow-md` : "border-gray-200 bg-white text-gray-700 shadow-sm hover:-translate-y-0.5 hover:shadow-md"}`}
                data-testid={`group-${g.id}`}
              >
                {g.label} <span className={`ml-1 text-xs font-semibold ${on ? "text-white/75" : "text-gray-400"}`}>{count}</span>
              </button>
            );
          })}
        </div>

        <div className="mb-6 overflow-x-auto pb-2 sm:overflow-visible sm:pb-0">
        <div className="flex snap-x gap-3 sm:grid sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6" role="group" aria-label="Template" data-testid="graphics-templates">
          {GRAPHIC_TEMPLATES.filter((t) => group === "all" || TEMPLATE_GROUPS.find((g) => g.id === group)?.templates.includes(t.id)).map((t) => {
            const Icon = TEMPLATE_ICON[t.id] ?? ImagePlus;
            const on = spec.template === t.id;
            const tg = TEMPLATE_GROUPS.find((g) => g.id === groupOfTemplate(t.id))!;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() =>
                  update({
                    template: t.id as TemplateId,
                    fixture: 0,
                    page: 1,
                    // a lineup is one gameweek; do not carry that single gameweek into other templates' ranges (or the reverse)
                    ...(SINGLE_GAMEWEEK.includes(t.id as TemplateId) || SINGLE_GAMEWEEK.includes(spec.template) ? { from: 0, to: 0 } : {}),
                  })
                }
                aria-pressed={on}
                className={`group relative flex w-44 shrink-0 snap-start items-center gap-3 overflow-hidden rounded-2xl border p-3 text-left transition-all sm:w-auto sm:shrink sm:flex-col sm:items-start sm:gap-1.5 sm:p-3.5 ${
                  on
                    ? `border-transparent bg-gradient-to-br ${tg.solid} text-white shadow-lg ring-2 ring-white/60 ring-offset-2 ring-offset-transparent`
                    : "border-gray-200 bg-white text-gray-800 shadow-sm hover:-translate-y-0.5 hover:border-indigo-300/50 hover:shadow-lg"
                }`}
                data-testid={`template-${t.id}`}
              >
                {on && <span className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/20 blur-2xl" />}
                <span className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105 ${on ? "bg-white/20 text-white" : `bg-gradient-to-br ${tg.tile}`}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="relative min-w-0">
                  <span className="block text-sm font-extrabold leading-tight">{t.label}</span>
                  <span className={`mt-0.5 hidden text-[11px] leading-snug sm:line-clamp-2 ${on ? "text-white/85" : "text-gray-500"}`}>{t.description}</span>
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

              {spec.template === "availability-watch" && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Position">
                    <SimpleSelect value={spec.pos ?? "ALL"} onChange={(v) => update({ pos: v === "ALL" ? null : (v as GraphicPosition) })} options={POSITIONS.map((p) => ({ value: p, label: p === "ALL" ? "All positions" : p }))} testId="select-position" />
                  </Field>
                  <Field label="How many players">
                    <SimpleSelect value={String(spec.top)} onChange={(v) => update({ top: parseInt(v, 10) })} options={TOP_OPTIONS.map((n) => ({ value: String(n), label: `Top ${n}` }))} testId="select-top" />
                  </Field>
                  <p className="col-span-2 text-xs text-gray-500">The most-owned players (owned by {MIN_WATCH_OWNERSHIP}%+) who are injured, doubtful or suspended, with FPL's own news.</p>
                </div>
              )}

              {spec.template === "player-projections" && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Position">
                    <SimpleSelect value={spec.pos ?? "ALL"} onChange={(v) => update({ pos: v === "ALL" ? null : (v as GraphicPosition) })} options={POSITIONS.map((p) => ({ value: p, label: p === "ALL" ? "All positions (best of each)" : p }))} testId="select-position" />
                  </Field>
                  {spec.pos && (
                    <Field label="How many players">
                      <SimpleSelect value={String(spec.top)} onChange={(v) => update({ top: parseInt(v, 10) })} options={TOP_OPTIONS.map((n) => ({ value: String(n), label: `Top ${n}` }))} testId="select-top" />
                    </Field>
                  )}
                  <p className="col-span-2 text-xs text-gray-500">Expected points are our projections summed over the gameweeks below. Injured and suspended players are left out.{spec.pos ? " The columns show where each player's points come from." : " Pick a position to see where the points come from."}</p>
                </div>
              )}

              {spec.template === "gw-top-scorers" && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Finished gameweek">
                    <SimpleSelect
                      value={String(totwGw || "")}
                      onChange={(v) => update({ from: parseInt(v, 10), to: parseInt(v, 10) })}
                      options={[...finishedGameweeks].reverse().map((gw) => ({ value: String(gw), label: `GW${gw}` }))}
                      testId="select-scorers-gw"
                    />
                  </Field>
                  <Field label="Position">
                    <SimpleSelect value={spec.pos ?? "ALL"} onChange={(v) => update({ pos: v === "ALL" ? null : (v as GraphicPosition) })} options={POSITIONS.map((p) => ({ value: p, label: p === "ALL" ? "All positions" : p }))} testId="select-position" />
                  </Field>
                  <Field label="How many players">
                    <SimpleSelect value={String(spec.top)} onChange={(v) => update({ top: parseInt(v, 10) })} options={TOP_OPTIONS.map((n) => ({ value: String(n), label: `Top ${n}` }))} testId="select-top" />
                  </Field>
                  <p className="col-span-2 text-xs text-gray-500">FPL's own points for a finished gameweek, with the scoring that made them.</p>
                </div>
              )}

              {spec.template === "gw-points" && (
                <div className="space-y-3">
                  <Field label="Gameweek">
                    <SimpleSelect
                      value={String(pointsGw || "")}
                      onChange={(v) => update({ from: parseInt(v, 10), to: parseInt(v, 10) })}
                      options={[...startedGameweeks].reverse().map((gw) => ({ value: String(gw), label: finishedGameweeks.includes(gw) ? `GW${gw}` : `GW${gw} (live)` }))}
                      testId="select-points-gw"
                    />
                  </Field>
                  <Field label={`Players (up to ${MAX_GW_POINTS_PLAYERS})`}>
                    <PlayerPicker elements={elements} teamShortById={teamShortById} selected={spec.players} max={MAX_GW_POINTS_PLAYERS} onChange={(players) => update({ players, bench: spec.bench.filter((id) => players.includes(id)), captain: players.includes(spec.captain) ? spec.captain : 0 })} />
                  </Field>
                  {spec.players.length > 0 && (
                    <div className="space-y-1.5" data-testid="points-roles">
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Captain and bench</div>
                      {spec.players.map((id) => {
                        const e = elements.find((x) => x.id === id);
                        if (!e) return null;
                        const isBench = spec.bench.includes(id);
                        const benchFull = !isBench && spec.bench.length >= BENCH_PLAYERS;
                        return (
                          <div key={id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-1.5 text-sm" data-testid={`points-role-${id}`}>
                            <span className="font-medium">{e.web_name} <span className="text-xs text-gray-500">{teamShortById.get(e.team)}</span></span>
                            <span className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={() => update({ captain: spec.captain === id ? 0 : id })}
                                className={`rounded-full border px-3 py-0.5 text-xs font-bold ${spec.captain === id ? ACTIVE_CHIP : "bg-white text-gray-700 hover:bg-gray-50"}`}
                                data-testid={`button-captain-${id}`}
                                aria-pressed={spec.captain === id}
                              >
                                Captain
                              </button>
                              <button
                                type="button"
                                disabled={benchFull}
                                onClick={() => update({ bench: isBench ? spec.bench.filter((x) => x !== id) : [...spec.bench, id] })}
                                className={`rounded-full border px-3 py-0.5 text-xs font-bold disabled:opacity-40 ${isBench ? ACTIVE_CHIP : "bg-white text-gray-700 hover:bg-gray-50"}`}
                                data-testid={`button-bench-${id}`}
                                aria-pressed={isBench}
                              >
                                Bench
                              </button>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <p className="text-xs text-gray-500">FPL's own points for the gameweek, with the scoring that made them. A live gameweek's points can still change (bonus is confirmed after the last match). The captain is marked; points are not doubled. Up to {BENCH_PLAYERS} players can go on the bench.</p>
                </div>
              )}

              {spec.template === "my-gameweek" && (
                <MyGameweekControls spec={spec} update={update} startedGameweeks={startedGameweeks} finishedGameweeks={finishedGameweeks} gameweek={pointsGw} />
              )}

              {spec.template === "team-projections" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Field label="Measure">
                      <SimpleSelect value={spec.metric} onChange={(v) => update({ metric: v as GraphicSpec["metric"] })} options={Object.values(TEAM_METRICS).map((m) => ({ value: m.id, label: m.label }))} testId="select-team-metric" />
                    </Field>
                  </div>
                  <p className="col-span-2 text-xs text-gray-500">All clubs with a fixture in the range, ranked by our projection per game ({TEAM_METRICS[spec.metric].better === "lower" ? "fewest first" : "best first"}). A double gameweek counts as two games.</p>
                </div>
              )}

              {spec.template === "projected-table" && (
                <Field label="Projected to">
                  <SimpleSelect
                    value={String(resolveProjectedEndGameweek(spec.to, nextGw))}
                    onChange={(v) => update({ from: parseInt(v, 10), to: parseInt(v, 10) })}
                    options={Array.from({ length: Math.max(0, 38 - Math.min(nextGw, 38) + 1) }, (_, i) => Math.min(nextGw, 38) + i).map((gw) => ({ value: String(gw), label: gw === 38 ? "GW38 (final table)" : `After GW${gw}` }))}
                    testId="select-projected-end"
                  />
                </Field>
              )}

              {spec.template === "league-table" && (
                <Field label="Matches">
                  <SimpleSelect value={spec.venue} onChange={(v) => update({ venue: v as GraphicSpec["venue"] })} options={[{ value: "all", label: "All matches" }, { value: "home", label: "Home matches only" }, { value: "away", label: "Away matches only" }]} testId="select-venue" />
                </Field>
              )}

              {spec.template === "team-history" && (
                <>
                  <Field label="Club">
                    <SimpleSelect
                      value={spec.teams[0] ? String(spec.teams[0]) : ""}
                      onChange={(v) => update({ teams: [parseInt(v, 10)] })}
                      options={[...teams].sort((a, b) => a.name.localeCompare(b.name)).map((t) => ({ value: String(t.id), label: t.name }))}
                      testId="select-history-club"
                    />
                  </Field>
                  {resultGws.length > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="From gameweek">
                        <SimpleSelect
                          value={spec.from > 0 ? String(spec.from) : "auto"}
                          onChange={(v) => (v === "auto" ? update({ from: 0, to: 0 }) : update({ from: parseInt(v, 10), to: Math.min(parseInt(v, 10) + MAX_RANGE_GAMEWEEKS - 1, Math.max(parseInt(v, 10), spec.to || resultGws[resultGws.length - 1])) }))}
                          options={[{ value: "auto", label: "Last 8 matches" }, ...resultGws.map((gw) => ({ value: String(gw), label: `GW${gw}` }))]}
                          testId="select-team-history-from"
                        />
                      </Field>
                      {spec.from > 0 && (
                        <Field label="To gameweek">
                          <SimpleSelect
                            value={String(spec.to || spec.from)}
                            onChange={(v) => update({ to: parseInt(v, 10) })}
                            options={resultGws.filter((gw) => gw >= spec.from && gw < spec.from + MAX_RANGE_GAMEWEEKS).map((gw) => ({ value: String(gw), label: `GW${gw}` }))}
                            testId="select-team-history-to"
                          />
                        </Field>
                      )}
                      <p className="col-span-2 text-xs text-gray-500">The results are finished matches only. Position and season figures come from the live table.</p>
                    </div>
                  )}
                </>
              )}

              {spec.template === "player-history" && (
                <>
                  <Field label="Player">
                    <PlayerPicker elements={elements} teamShortById={teamShortById} selected={spec.players} max={1} onChange={(players) => update({ players })} />
                  </Field>
                  {resultGws.length > 0 && (() => {
                    const shown = resolveHistoryGameweeks(spec, resultGws);
                    const first = shown[0];
                    const last = shown[shown.length - 1];
                    return (
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="From gameweek">
                          <SimpleSelect
                            value={String(first)}
                            onChange={(v) => {
                              const f = parseInt(v, 10);
                              update({ from: f, to: Math.min(f + MAX_RANGE_GAMEWEEKS - 1, Math.max(f, last)) });
                            }}
                            options={resultGws.map((gw) => ({ value: String(gw), label: `GW${gw}` }))}
                            testId="select-history-from"
                          />
                        </Field>
                        <Field label="To gameweek">
                          <SimpleSelect
                            value={String(last)}
                            onChange={(v) => update({ from: first, to: parseInt(v, 10) })}
                            options={resultGws.filter((gw) => gw >= first && gw < first + MAX_RANGE_GAMEWEEKS).map((gw) => ({ value: String(gw), label: `GW${gw}` }))}
                            testId="select-history-to"
                          />
                        </Field>
                        <p className="col-span-2 text-xs text-gray-500">Up to {MAX_RANGE_GAMEWEEKS} gameweeks, from FPL's match history. Only finished matches count.</p>
                      </div>
                    );
                  })()}
                </>
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
                      onChange={(v) => update({ teams: [parseInt(v, 10)], xi: [] })}
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
                  <p className="col-span-2 text-xs text-gray-500" data-testid="lineup-explainer">
                    {spec.formation ? "Your own lineup: change the formation or any player below." : "Picked automatically: the 11 players with the most expected minutes, one goalkeeper. Pick a formation to make your own."}
                  </p>
                  <div className="col-span-2">
                    <LineupEditor spec={spec} update={update} lineup={data?.kind === "predicted-lineup" ? data.lineup : null} squad={lineupSquad} elementById={elementById} />
                  </div>
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

              {MATCH_TEMPLATES.includes(spec.template) && (
                <MatchControls spec={spec} update={update} fixtures={(fixtures ?? []) as unknown as MatchFixtureInput[]} teamShortById={teamShortById} pages={data?.kind === "match-predictions" ? data.predictions.pages : data?.kind === "match-results" ? data.results.pages : 1} />
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

              <div className="space-y-4 rounded-xl border border-indigo-200/60 bg-indigo-50/40 p-3" data-testid="gameweek-pack">
                <div className="flex items-center gap-2 text-sm font-extrabold">
                  <Package className="h-4 w-4 text-indigo-600" />
                  Gameweek packs
                </div>
                <p className="text-xs text-gray-600">One download per pack: the images plus a captions.txt with a ready-to-post caption for each. Uses your size, colours and handle.</p>

                <div className="space-y-2" data-testid="preview-pack">
                  <div className="text-xs font-extrabold uppercase tracking-wide text-indigo-700">Preview pack</div>
                  <p className="text-xs text-gray-600">For an upcoming gameweek: {GAMEWEEK_PACK.map((x) => x.label.toLowerCase()).join(", ")}.</p>
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
                    <Button type="button" onClick={() => void runPack("preview")} disabled={pack.busy || !elements.length} className="gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-500 hover:to-violet-500" data-testid="button-pack">
                      <Download className="h-4 w-4" />
                      {pack.busy && pack.kind === "preview" ? `Making ${Math.min(pack.done + 1, pack.total)} of ${pack.total}…` : "Download preview pack"}
                    </Button>
                  </div>
                  {pack.message && pack.messageKind === "preview" && <p className={`text-xs ${pack.ok ? "text-emerald-700" : "text-red-600"}`} role="status" data-testid="pack-message">{pack.message}</p>}
                </div>

                <div className="space-y-2 border-t border-indigo-200/60 pt-3" data-testid="review-pack">
                  <div className="text-xs font-extrabold uppercase tracking-wide text-indigo-700">Review pack</div>
                  <p className="text-xs text-gray-600">For a finished gameweek: {REVIEW_PACK.map((x) => x.label.toLowerCase()).join(", ")}. The two form images are the clubs in the best and worst form over their last five results. The league table is the live table now.</p>
                  {finishedGameweeks.length === 0 ? (
                    <p className="text-xs text-gray-500" data-testid="review-pack-empty">No gameweek has finished yet.</p>
                  ) : (
                    <div className="flex items-end gap-2">
                      <div className="min-w-0 flex-1">
                        <Field label="Finished gameweek">
                          <SimpleSelect
                            value={String(selectedReviewGw)}
                            onChange={(v) => setReviewGw(parseInt(v, 10))}
                            options={[...finishedGameweeks].reverse().map((gw) => ({ value: String(gw), label: `GW${gw}` }))}
                            testId="select-review-gw"
                          />
                        </Field>
                      </div>
                      <Button type="button" onClick={() => void runPack("review")} disabled={pack.busy || !elements.length} className="gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-500 hover:to-violet-500" data-testid="button-review-pack">
                        <Download className="h-4 w-4" />
                        {pack.busy && pack.kind === "review" ? `Making ${Math.min(pack.done + 1, pack.total)} of ${pack.total}…` : "Download review pack"}
                      </Button>
                    </div>
                  )}
                  {pack.message && pack.messageKind === "review" && <p className={`text-xs ${pack.ok ? "text-emerald-700" : "text-red-600"}`} role="status" data-testid="review-pack-message">{pack.message}</p>}
                </div>
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

            <div className="relative overflow-hidden rounded-3xl border border-slate-700/60 bg-slate-900 p-3 shadow-[0_20px_60px_-20px_rgba(30,27,75,0.6)] [background-image:radial-gradient(circle_at_50%_-10%,rgba(129,140,248,0.35),transparent_55%),radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.07)_1px,transparent_0)] [background-size:auto,20px_20px] sm:p-6">
            <div ref={previewRef} className="w-full" data-testid="graphics-preview">
              {bootstrapError ? (
                <div className="py-16 text-center text-sm text-slate-300" role="status">Couldn't load player data. Please refresh.</div>
              ) : loading || (!data && !problem) ? (
                <div className="py-16 text-center text-sm text-slate-300" role="status">Loading…</div>
              ) : problem ? (
                <div className="rounded-xl border border-dashed border-slate-500 py-16 text-center text-sm text-slate-200" role="status" data-testid="graphics-problem">{problem}</div>
              ) : (
                <div style={{ width: fullWidth * scale, height: fullHeight * scale, overflow: "hidden", borderRadius: 14, boxShadow: "0 24px 60px -12px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.08)" }}>
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
