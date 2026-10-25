import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Crown, History, ListChecks, Search, Target } from "lucide-react";
import { extractManagerId } from "@/lib/manager-id-utils";
import { readToolManagerId, saveToolManagerId } from "@/lib/manager-id-storage";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShareImageButton } from "@/components/share-image-button";
import { hindsightCard, shareFileName } from "@shared/share-cards";
import { HeroPanel, HeroStat, InputPanel, Pill, PosChip, SectionCard, SegmentedControl, asPos } from "@/components/tool-ui";
import { SeasonView } from "@/components/hindsight-season";
import { WhatIfView } from "@/components/hindsight-what-if";

interface Pick { id: number; name: string; position: string; points: number; multiplier: number; started: boolean; isCaptain: boolean; inBestXI: boolean }
interface HindsightResponse {
  managerId: number;
  gameweek: number;
  finishedGameweeks: number[];
  chip: string | null;
  officialPoints: number;
  transferCost: number;
  pointsOnBench: number;
  bestPossible: number;
  gap: number;
  formation: string | null;
  captainMultiplier: 2 | 3;
  captain: { chosen: { id: number; name: string; points: number } | null; best: { id: number; name: string; points: number } | null };
  bestXI: Array<{ id: number; name: string; position: string; points: number }>;
  picks: Pick[];
}

type View = "gameweek" | "season" | "what-if";

const CHIP_LABEL: Record<string, string> = { bboost: "Bench Boost", "3xc": "Triple Captain", freehit: "Free Hit", wildcard: "Wildcard", manager: "Assistant Manager" };

export default function Hindsight() {
  const [input, setInput] = useState("");
  const [managerId, setManagerId] = useState("");
  const [gameweek, setGameweek] = useState<number | null>(null);
  const [view, setView] = useState<View>("gameweek");

  useEffect(() => {
    const saved = readToolManagerId();
    if (saved) {
      setInput(saved);
      setManagerId(saved);
    }
  }, []);

  const submit = () => {
    const id = extractManagerId(input).trim();
    if (!id) return;
    setManagerId(id);
    setGameweek(null);
    saveToolManagerId(id);
  };

  const { data, isFetching, error } = useQuery<HindsightResponse>({
    queryKey: ["/api/hindsight", managerId, gameweek],
    enabled: !!managerId,
    retry: false,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const res = await fetch(`/api/hindsight/${encodeURIComponent(managerId)}${gameweek ? `?gw=${gameweek}` : ""}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Something went wrong");
      }
      return res.json();
    },
    staleTime: 10 * 60 * 1000,
  });

  const best = data?.captain.best;
  const chosen = data?.captain.chosen;

  const maxPts = data ? Math.max(1, ...data.picks.map((p) => p.points)) : 1;
  const starters = data ? [...data.picks].filter((p) => p.started).sort((a, b) => b.points - a.points) : [];
  const bench = data ? [...data.picks].filter((p) => !p.started).sort((a, b) => b.points - a.points) : [];
  const scoredPct = data && data.bestPossible > 0 ? Math.min(100, (data.officialPoints / data.bestPossible) * 100) : 0;

  const PickRow = ({ p }: { p: Pick }) => {
    const missed = !p.started && p.inBestXI;
    return (
      <li className={`flex items-center gap-3 px-4 py-2.5 sm:px-5 ${missed ? "bg-amber-500/[0.07]" : ""}`}>
        <span className="w-[130px] min-w-[110px] flex-1 basis-1/3">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-sm font-bold text-gray-900">{p.name}</span>
            {p.isCaptain && <span className="rounded bg-gray-900 px-1.5 py-px text-[10px] font-extrabold text-white dark:bg-white dark:text-gray-900" title="Captain">C</span>}
          </span>
          <span className="mt-0.5 flex items-center gap-1"><PosChip pos={asPos(p.position)} /></span>
        </span>
        <span className="flex flex-1 items-center gap-2">
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200/70 dark:bg-white/10">
            <span className={`block h-full rounded-full bg-gradient-to-r ${p.inBestXI ? "from-emerald-400 to-emerald-500" : "from-gray-300 to-gray-400"}`} style={{ width: `${Math.max(3, (Math.max(0, p.points) / maxPts) * 100)}%` }} />
          </span>
          <span className="w-8 text-right text-sm font-extrabold tabular-nums text-gray-900">{p.points}</span>
        </span>
        <span className="flex w-[92px] justify-end">
          {p.inBestXI ? (
            <Pill tone="green"><Check className="mr-0.5 h-3 w-3" /> Best XI</Pill>
          ) : (
            <span className="text-xs text-gray-400">—</span>
          )}
        </span>
      </li>
    );
  };

  return (
    <div className="min-h-screen">
      <div className="w-full py-4 sm:py-8">
        <div className="fpl-page-header">
          <div className="fpl-page-header-content">
            <div className="fpl-page-title">
              <History />
              <h1 data-testid="text-page-title">Hindsight</h1>
            </div>
            <p className="fpl-page-subtitle">Your points versus the best XI you could have fielded from the same 15 players: one gameweek, the whole season, or a what-if.</p>
          </div>
        </div>

        <InputPanel icon={Search} title="Find your team" subtitle="Paste your FPL team ID or the link to your entry page">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={input}
              onChange={(e) => setInput(extractManagerId(e.target.value))}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Paste your FPL team ID or entry link"
              className="h-11 flex-1 rounded-xl text-base"
              data-testid="input-manager-id"
            />
            <Button onClick={submit} disabled={!input.trim() || isFetching} className="h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 font-bold text-white hover:from-indigo-500 hover:to-violet-500" data-testid="button-show">
              {isFetching ? "Loading…" : "Show hindsight"}
            </Button>
          </div>
          {data && view === "gameweek" && (
            <Select value={String(data.gameweek)} onValueChange={(v) => setGameweek(Number(v))}>
              <SelectTrigger className="h-10 w-[170px] rounded-xl" data-testid="select-gameweek"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[...data.finishedGameweeks].reverse().map((gw) => (
                  <SelectItem key={gw} value={String(gw)}>Gameweek {gw}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </InputPanel>

        {managerId && (
          <div className="mb-5">
            <SegmentedControl
              ariaLabel="Hindsight view"
              value={view}
              onChange={setView}
              testIdPrefix="view"
              options={[
                { value: "gameweek", label: "Gameweek" },
                { value: "season", label: "Season" },
                { value: "what-if", label: "What if" },
              ]}
            />
          </div>
        )}

        {managerId && view === "season" && <SeasonView managerId={managerId} onOpenGameweek={(gw) => { setGameweek(gw); setView("gameweek"); }} />}
        {managerId && view === "what-if" && <WhatIfView managerId={managerId} />}

        {view === "gameweek" && error && <Card><CardContent className="p-6 text-sm" data-testid="text-error">{(error as Error).message}</CardContent></Card>}

        {view === "gameweek" && data && !error && (
          <div className="space-y-5">
            <HeroPanel testId="summary">
              <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-bold">
                <span className="rounded-full bg-white/15 px-3 py-1 uppercase tracking-widest ring-1 ring-white/25">Gameweek {data.gameweek}</span>
                {data.chip && <span className="inline-flex items-center gap-1 rounded-full bg-amber-300/25 px-3 py-1 ring-1 ring-amber-200/40"><Crown className="h-3.5 w-3.5" />{CHIP_LABEL[data.chip] ?? data.chip}</span>}
                <span className="rounded-full bg-white/15 px-3 py-1 ring-1 ring-white/25">{data.formation ? `${data.formation} best formation` : "All 15 count (Bench Boost)"}</span>
              </div>
              <div className="grid gap-6 sm:grid-cols-3">
                <HeroStat
                  label="You scored"
                  value={data.officialPoints}
                  valueTestId="text-official"
                  sub={`${data.transferCost > 0 ? `before a −${data.transferCost} transfer cost` : "no transfer cost"}`}
                />
                <HeroStat label="Best possible from your 15" value={data.bestPossible} valueTestId="text-best" sub="In hindsight, from the same squad" />
                <HeroStat
                  label="Difference"
                  value={<span className={data.gap > 0 ? "text-amber-200" : "text-emerald-200"}>{data.gap}</span>}
                  valueTestId="text-gap"
                  sub={`${data.pointsOnBench} points were on your bench`}
                />
              </div>
              <div className="mt-5">
                <div className="h-3 overflow-hidden rounded-full bg-white/20">
                  <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-400" style={{ width: `${scoredPct}%` }} />
                </div>
                <div className="mt-1.5 flex justify-between text-xs font-semibold text-white/75">
                  <span>You: {Math.round(scoredPct)}% of the best possible</span>
                  <span>Best: {data.bestPossible}</span>
                </div>
              </div>
            </HeroPanel>

            <SectionCard
              icon={Target}
              title="Captain"
              subtitle="Your armband against the highest scorer in your squad"
              testId="captain"
              action={
                chosen && best && (
                  <ShareImageButton
                    getCard={() => hindsightCard({
                      gameweek: data.gameweek,
                      officialPoints: data.officialPoints,
                      bestPossible: data.bestPossible,
                      gap: data.gap,
                      chip: data.chip,
                      captain: { chosen: chosen.name, chosenPoints: chosen.points, best: best.name, bestPoints: best.points },
                    })}
                    fileName={shareFileName(["hindsight", `gw${data.gameweek}`])}
                  />
                )
              }
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500">You chose</div>
                  <div className="mt-1 text-xl font-extrabold text-gray-900">{chosen?.name ?? "—"}</div>
                  <div className="text-sm font-semibold text-gray-600">{chosen?.points ?? 0} pts</div>
                </div>
                <div className={`rounded-2xl border p-4 ${chosen && best && chosen.id === best.id ? "border-emerald-500/30 bg-emerald-500/[0.07]" : "border-amber-500/30 bg-amber-500/[0.07]"}`}>
                  <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500">Best captain available</div>
                  <div className="mt-1 text-xl font-extrabold text-gray-900">{best?.name ?? "—"}</div>
                  <div className="text-sm font-semibold text-gray-600">{best?.points ?? 0} pts</div>
                </div>
              </div>
              <p className="mt-3 text-sm text-gray-700">
                {chosen && best && chosen.id === best.id ? "You picked the best captain available. " : ""}
                {data.captainMultiplier === 3 && "Triple Captain: the captain counts three times."}
              </p>
            </SectionCard>

            <SectionCard
              icon={ListChecks}
              title="Your 15 players"
              subtitle="Green bars are in the best XI. Amber rows sat on your bench but belonged in it."
              bodyClassName="p-0"
            >
              <div data-testid="table-picks">
                <div className="border-b border-gray-100 bg-gray-50/70 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500 sm:px-5">Picked to start</div>
                <ul className="divide-y divide-gray-100">{starters.map((p) => <PickRow key={p.id} p={p} />)}</ul>
                <div className="border-y border-gray-100 bg-gray-50/70 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500 sm:px-5">Bench</div>
                <ul className="divide-y divide-gray-100">{bench.map((p) => <PickRow key={p.id} p={p} />)}</ul>
              </div>
            </SectionCard>

            <p className="text-xs text-gray-500">
              "Best possible" uses each player's final points from the same 15 and the best legal formation, with the best captain counted
              {data.captainMultiplier === 3 ? " three times" : " twice"}. It ignores auto-subs (your official score includes them) and
              describes what was available in hindsight, not what could have been known. "Picked to start" is your original XI.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
