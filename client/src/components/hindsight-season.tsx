import { useQuery } from "@tanstack/react-query";
import { CalendarRange, Crown } from "lucide-react";
import { HeroPanel, HeroStat, Pill, SectionCard } from "@/components/tool-ui";

export interface SeasonPlayer { id: number; name: string; position: string; weeks: number; captainWeeks: number }
export interface SeasonResponse {
  managerId: number;
  finishedGameweeks: number[];
  gameweeks: number;
  rows: Array<{
    gameweek: number;
    chip: string | null;
    officialPoints: number;
    transferCost: number;
    pointsOnBench: number;
    bestPossible: number;
    gap: number;
    captainMultiplier: 2 | 3;
    captainHit: boolean | null;
    captainCost: number;
    captain: { chosen: { name: string; points: number } | null; best: { name: string; points: number } | null };
  }>;
  totals: { officialPoints: number; bestPossible: number; gap: number; pointsOnBench: number; transferCost: number; efficiencyPct: number };
  captaincy: { gameweeks: number; hits: number; pointsLost: number };
  biggestGap: { gameweek: number; gap: number } | null;
  smallestGap: { gameweek: number; gap: number } | null;
  chips: Array<{ gameweek: number; chip: string }>;
  players: SeasonPlayer[];
}

export const CHIP_LABEL: Record<string, string> = { bboost: "Bench Boost", "3xc": "Triple Captain", freehit: "Free Hit", wildcard: "Wildcard", manager: "Assistant Manager" };

export function useSeason(managerId: string, enabled: boolean) {
  return useQuery<SeasonResponse>({
    queryKey: ["/api/hindsight", managerId, "season"],
    enabled: enabled && !!managerId,
    retry: false,
    queryFn: async () => {
      const res = await fetch(`/api/hindsight/${encodeURIComponent(managerId)}/season`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Something went wrong");
      }
      return res.json();
    },
    staleTime: 10 * 60 * 1000,
  });
}

function Tile({ label, value, sub, testId }: { label: string; value: string; sub: string; testId?: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4" data-testid={testId}>
      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-extrabold tabular-nums text-gray-900">{value}</div>
      <div className="text-xs font-medium text-gray-600">{sub}</div>
    </div>
  );
}

export function SeasonView({ managerId, onOpenGameweek }: { managerId: string; onOpenGameweek: (gw: number) => void }) {
  const { data, isLoading, error } = useSeason(managerId, true);

  if (error) return <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm" data-testid="text-season-error">{(error as Error).message}</div>;
  if (isLoading || !data) return <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600" data-testid="text-season-loading">Loading every finished gameweek…</div>;

  const { totals, captaincy } = data;
  const maxBest = Math.max(1, ...data.rows.map((r) => r.bestPossible));

  return (
    <div className="space-y-5" data-testid="season-view">
      <HeroPanel testId="season-summary">
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-bold">
          <span className="rounded-full bg-white/15 px-3 py-1 uppercase tracking-widest ring-1 ring-white/25">{data.gameweeks} gameweek{data.gameweeks === 1 ? "" : "s"}</span>
          {data.chips.map((c) => (
            <span key={`${c.gameweek}-${c.chip}`} className="inline-flex items-center gap-1 rounded-full bg-amber-300/25 px-3 py-1 ring-1 ring-amber-200/40">
              <Crown className="h-3.5 w-3.5" />{CHIP_LABEL[c.chip] ?? c.chip} · GW{c.gameweek}
            </span>
          ))}
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          <HeroStat label="You scored" value={totals.officialPoints} valueTestId="text-season-official" sub={totals.transferCost > 0 ? `before −${totals.transferCost} in transfer costs` : "no transfer costs"} />
          <HeroStat label="Best possible from your squads" value={totals.bestPossible} valueTestId="text-season-best" sub="Each week, from the same 15" />
          <HeroStat label="Difference" value={<span className={totals.gap > 0 ? "text-amber-200" : "text-emerald-200"}>{totals.gap}</span>} valueTestId="text-season-gap" sub={`${totals.pointsOnBench} points were on your bench`} />
        </div>
        <div className="mt-5">
          <div className="h-3 overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-400" style={{ width: `${Math.min(100, totals.efficiencyPct)}%` }} />
          </div>
          <div className="mt-1.5 flex justify-between text-xs font-semibold text-white/75">
            <span>You: {Math.round(totals.efficiencyPct)}% of the best possible</span>
            <span>Best: {totals.bestPossible}</span>
          </div>
        </div>
      </HeroPanel>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Captain picks" value={captaincy.gameweeks ? `${captaincy.hits} of ${captaincy.gameweeks}` : "—"} sub="weeks you named your squad's top scorer" testId="tile-captain-hits" />
        <Tile label="Armband cost" value={`${captaincy.pointsLost}`} sub="extra points missed by captain choices" testId="tile-captain-cost" />
        <Tile label="Biggest gap" value={data.biggestGap ? `GW${data.biggestGap.gameweek}` : "—"} sub={data.biggestGap ? `${data.biggestGap.gap} point${data.biggestGap.gap === 1 ? "" : "s"} from the best XI` : ""} testId="tile-biggest-gap" />
        <Tile label="Closest week" value={data.smallestGap ? `GW${data.smallestGap.gameweek}` : "—"} sub={data.smallestGap ? `${data.smallestGap.gap} point${data.smallestGap.gap === 1 ? "" : "s"} from the best XI` : ""} testId="tile-smallest-gap" />
      </div>

      <SectionCard icon={CalendarRange} title="Gameweek by gameweek" subtitle="Tap a row to open that gameweek in detail" bodyClassName="p-0" testId="season-table">
        <div className="hidden border-b border-gray-100 bg-gray-50/70 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500 sm:flex sm:px-5">
          <span className="w-24">GW</span>
          <span className="flex-1">You vs best possible</span>
          <span className="w-16 text-right">Gap</span>
          <span className="w-[210px] pl-4">Captain (yours → best)</span>
        </div>
        <ul className="divide-y divide-gray-100">
          {data.rows.map((r) => (
            <li key={r.gameweek}>
              <button type="button" onClick={() => onOpenGameweek(r.gameweek)} className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-left hover:bg-indigo-500/[0.04] sm:flex-nowrap sm:px-5" data-testid={`row-gw-${r.gameweek}`}>
                <span className="flex w-24 flex-col text-sm font-extrabold leading-tight text-gray-900">
                  GW{r.gameweek}
                  {r.chip && <span className="whitespace-nowrap text-[10px] font-bold text-amber-600">{CHIP_LABEL[r.chip] ?? r.chip}</span>}
                </span>
                <span className="flex min-w-[140px] flex-1 flex-col gap-1">
                  <span className="relative h-2 overflow-hidden rounded-full bg-gray-200/70 dark:bg-white/10">
                    <span className="absolute inset-y-0 left-0 rounded-full bg-gray-300" style={{ width: `${(r.bestPossible / maxBest) * 100}%` }} />
                    <span className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${(Math.max(0, r.officialPoints) / maxBest) * 100}%` }} />
                  </span>
                  <span className="text-xs font-semibold tabular-nums text-gray-600">{r.officialPoints} of {r.bestPossible}</span>
                </span>
                <span className="w-16 text-right"><Pill tone={r.gap === 0 ? "green" : r.gap >= 15 ? "amber" : "gray"}>{r.gap === 0 ? "0" : `−${r.gap}`}</Pill></span>
                <span className="w-full text-xs text-gray-600 sm:w-[210px] sm:pl-4">
                  {r.captain.chosen ? (
                    <>
                      <span className="font-semibold text-gray-900">{r.captain.chosen.name}</span> {r.captain.chosen.points}
                      {r.captainHit ? <span className="ml-1 text-emerald-600">✓</span> : r.captain.best && <> → <span className="font-semibold text-gray-900">{r.captain.best.name}</span> {r.captain.best.points}</>}
                    </>
                  ) : "—"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </SectionCard>

      <p className="text-xs text-gray-500">
        Each week is compared with the best XI and captain from the 15 players you held that week, using final player points. Auto-subs are not re-run (your
        official score includes them), and a tie for the top captain score counts as a good pick. Weeks before your team existed are left out.
      </p>
    </div>
  );
}
