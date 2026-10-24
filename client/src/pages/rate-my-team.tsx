import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { compareUrl } from "@shared/compare-utils";
import { ArrowRight, CalendarRange, ClipboardCheck, Crown, Search, ShieldAlert, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { extractManagerId } from "@/lib/manager-id-utils";
import { readToolManagerId, saveToolManagerId } from "@/lib/manager-id-storage";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyNote, HeroPanel, HeroStat, InputPanel, Pill, SectionCard, SegmentedControl, StatusPill, TeamChip, XptsBar } from "@/components/tool-ui";
import { teamColor } from "@/lib/team-colors";
import { ShareImageButton } from "@/components/share-image-button";
import { shareFileName, thingsToCheckCard } from "@shared/share-cards";

interface RmtResponse {
  managerId: number;
  resolvedGameweek: number | null;
  activeChip: string | null;
  gameweeks: number[];
  projectedTotal: number;
  benchTotal: number;
  rating: {
    percent: number | null;
    yourTotal: number;
    optimalTotal: number;
    budget: number;
    optimalSquad: Array<{ id: number; name: string; position: string; teamShort: string; price: number; horizonXPts: number; inYourSquad: boolean }>;
  };
  perGameweek: Array<{ gameweek: number; total: number; captainName: string | null; benchTotal: number }>;
  rank: { rank: number | null; fieldSize: number; average: number | null; best: number | null };
  upgrades: Array<{
    outId: number; inId: number; outName: string; inName: string; outTeam: string; inTeam: string;
    gain: number; priceDelta: number; inPrice: number; outHorizonXPts: number; inHorizonXPts: number;
  }>;
  flags: {
    availability: Array<{ playerId: number; name: string; status: string; chanceOfPlayingNextRound: number | null; news: string }>;
    blanks: Array<{ playerId: number; name: string; gameweeks: number[] }>;
    doubles: Array<{ playerId: number; name: string; gameweeks: number[] }>;
    tbc: Array<{ playerId: number; name: string; gameweeks: number[] }>;
  };
  bank: number;
  sellingPricesApproximate: boolean;
}

const HORIZONS = [1, 3, 6, 8];
const CHIP_LABEL: Record<string, string> = { bboost: "Bench Boost", "3xc": "Triple Captain", freehit: "Free Hit", wildcard: "Wildcard", manager: "Assistant Manager" };
const money = (tenths: number) => `£${(tenths / 10).toFixed(1)}m`;
const signedMoney = (tenths: number) => `${tenths > 0 ? "+" : tenths < 0 ? "-" : ""}£${Math.abs(tenths / 10).toFixed(1)}m`;

export default function RateMyTeam() {
  const [input, setInput] = useState("");
  const [managerId, setManagerId] = useState("");
  const [horizon, setHorizon] = useState(6);

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
    saveToolManagerId(id);
  };

  const { data, isFetching, error } = useQuery<RmtResponse>({
    queryKey: ["/api/rate-my-team", managerId, horizon],
    enabled: !!managerId,
    retry: false,
    queryFn: async () => {
      const res = await fetch(`/api/rate-my-team/${encodeURIComponent(managerId)}?horizon=${horizon}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Something went wrong");
      }
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const gwLabel = data ? `GW${data.gameweeks[0]}${data.gameweeks.length > 1 ? `-${data.gameweeks[data.gameweeks.length - 1]}` : ""}` : "";

  const maxGw = data ? Math.max(0.1, ...data.perGameweek.map((g) => g.total)) : 1;
  const maxGain = data ? Math.max(0.1, ...data.upgrades.map((u) => u.gain)) : 1;
  const noFlags = data
    ? data.flags.availability.length === 0 && data.flags.blanks.length === 0 && data.flags.doubles.length === 0 && data.flags.tbc.length === 0
    : false;

  return (
    <div className="min-h-screen">
      <div className="w-full py-4 sm:py-8">
        <div className="fpl-page-header">
          <div className="fpl-page-header-content">
            <div className="fpl-page-title">
              <ClipboardCheck />
              <h1 data-testid="text-page-title">Rate My Team</h1>
            </div>
            <p className="fpl-page-subtitle">
              Your team rating (your points against the best possible team), how you compare with the all-time Top 100 managers, and the best single upgrades.
            </p>
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
            <Button onClick={submit} disabled={!input.trim() || isFetching} className="h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 font-bold text-white hover:from-indigo-500 hover:to-violet-500" data-testid="button-rate">
              {isFetching ? "Rating…" : "Rate my team"}
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Look ahead</span>
            <SegmentedControl
              ariaLabel="Horizon"
              testIdPrefix="horizon"
              value={horizon}
              onChange={setHorizon}
              options={HORIZONS.map((h) => ({ value: h, label: `${h} GW${h > 1 ? "s" : ""}` }))}
            />
          </div>
        </InputPanel>

        {error && (
          <Card><CardContent className="p-6 text-sm" data-testid="text-error">{(error as Error).message}</CardContent></Card>
        )}

        {data && (
          <div className="space-y-5">
            <HeroPanel testId="summary">
              <div className="grid gap-6 sm:grid-cols-3">
                <HeroStat
                  label={`Team rating · ${gwLabel}`}
                  value={data.rating.percent === null ? "n/a" : `${data.rating.percent}%`}
                  valueTestId="text-rating"
                  sub="Your points as a share of the best possible team's points"
                />
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/70">Rank vs All-time Top 100 Managers' Projected Points</div>
                  {data.rank.rank === null ? (
                    <div className="mt-2 text-sm text-white/85">No All-time Top 100 squads loaded right now.</div>
                  ) : (
                    <>
                      <div className="mt-1 text-4xl font-extrabold leading-none tabular-nums sm:text-5xl" data-testid="text-rank">
                        {data.rank.rank}
                        <span className="ml-1.5 text-base font-semibold text-white/70">of {data.rank.fieldSize}</span>
                      </div>
                      {data.rank.best !== null && data.rank.best > 0 && (
                        <div className="mt-3">
                          <div className="relative h-2.5 rounded-full bg-white/20">
                            <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-300 to-amber-400" style={{ width: `${Math.min(100, (data.projectedTotal / data.rank.best) * 100)}%` }} />
                            {data.rank.average !== null && (
                              <div className="absolute -top-1 w-0.5 rounded bg-white" style={{ left: `${Math.min(100, (data.rank.average / data.rank.best) * 100)}%`, height: 18 }} title="All-time Top 100 average" />
                            )}
                          </div>
                          <div className="mt-1.5 text-xs font-medium text-white/75">
                            Bar: your projected points against the All-time Top 100 highest · marker: their average
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/70">{`Projected points · ${gwLabel}`}</div>
                  <dl className="mt-2 space-y-1.5 tabular-nums" data-testid="summary-points">
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-sm font-medium text-white/80">Your total</dt>
                      <dd className="text-2xl font-extrabold leading-none" data-testid="text-total-points">{data.projectedTotal.toFixed(1)}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-sm font-medium text-white/80">All-time Top 100 average</dt>
                      <dd className="text-lg font-bold leading-none" data-testid="text-top100-average">{data.rank.average === null ? "n/a" : data.rank.average.toFixed(1)}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-sm font-medium text-white/80">All-time Top 100 highest</dt>
                      <dd className="text-lg font-bold leading-none" data-testid="text-top100-best">{data.rank.best === null ? "n/a" : data.rank.best.toFixed(1)}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-sm font-medium text-white/80">Best possible team</dt>
                      <dd className="text-lg font-bold leading-none" data-testid="text-optimal-points">{data.rating.optimalTotal.toFixed(1)}</dd>
                    </div>
                  </dl>
                </div>
              </div>
              {data.activeChip && (
                <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold ring-1 ring-white/25">
                  <Crown className="h-3.5 w-3.5" /> {CHIP_LABEL[data.activeChip] ?? data.activeChip} was active in your last squad
                </div>
              )}
            </HeroPanel>

            <SectionCard icon={CalendarRange} title="Gameweek by gameweek" subtitle="Your best XI and captain for each gameweek" bodyClassName="p-0">
              <ul className="divide-y divide-gray-100" data-testid="table-gameweeks">
                {data.perGameweek.map((g) => (
                  <li key={g.gameweek} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-5">
                    <span className="w-14 rounded-lg bg-indigo-500/10 py-1 text-center text-sm font-extrabold text-indigo-700 dark:text-indigo-300">GW{g.gameweek}</span>
                    <XptsBar value={g.total} max={maxGw} label="projected" />
                    <span className="inline-flex min-w-[130px] items-center gap-1.5 text-sm font-semibold text-gray-800">
                      <Crown className="h-4 w-4 text-amber-500" /> {g.captainName ?? "—"}
                    </span>
                    <Pill>Bench {g.benchTotal.toFixed(1)}</Pill>
                  </li>
                ))}
              </ul>
            </SectionCard>

            <SectionCard
              icon={Sparkles}
              title="Best possible team"
              subtitle={`The highest-scoring squad we can build over ${gwLabel} with your ${money(data.rating.budget)} (squad value plus bank), free to change every player. Your rating is your points as a share of its points.`}
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="list-optimal-squad">
                {(["GKP", "DEF", "MID", "FWD"] as const).map((pos) => (
                  <div key={pos}>
                    <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">{pos}</div>
                    <ul className="divide-y divide-gray-100">
                      {data.rating.optimalSquad
                        .filter((p) => p.position === pos)
                        .sort((a, b) => b.horizonXPts - a.horizonXPts)
                        .map((p) => (
                          <li key={p.id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                            <span className="min-w-0 truncate font-semibold text-gray-900">
                              {p.name} <span className="text-xs font-normal text-gray-500">{p.teamShort}</span>
                              {p.inYourSquad && <span className="ml-1.5 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">yours</span>}
                            </span>
                            <span className="shrink-0 text-xs tabular-nums text-gray-500">{money(p.price)} · {p.horizonXPts.toFixed(1)}</span>
                          </li>
                        ))}
                    </ul>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard
              icon={TrendingUp}
              title="Best single upgrades"
              subtitle={`The swaps that add the most projected points over ${gwLabel}`}
            >
              {data.upgrades.length === 0 ? (
                <EmptyNote icon={ShieldCheck}>No affordable single swap improves your projected points over {gwLabel}.</EmptyNote>
              ) : (
                <ul className="space-y-3" data-testid="list-upgrades">
                  {data.upgrades.map((u) => (
                    <li key={u.outId} className="rounded-2xl border border-gray-200 bg-gray-50/60 p-3 sm:p-4">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <div className="flex min-w-[130px] flex-1 items-center gap-2.5 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-3 py-2" style={{ boxShadow: `inset 4px 0 0 0 ${teamColor(u.outTeam)}` }}>
                          <div className="min-w-0 pl-1">
                            <div className="truncate text-sm font-extrabold text-gray-900">{u.outName}</div>
                            <div className="mt-0.5 flex items-center gap-1"><TeamChip>{u.outTeam}</TeamChip><span className="text-xs text-gray-500">{u.outHorizonXPts.toFixed(1)} xPts</span></div>
                          </div>
                        </div>
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-300">
                          <ArrowRight className="h-4 w-4" />
                        </span>
                        <div className="flex min-w-[130px] flex-1 items-center gap-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.07] px-3 py-2" style={{ boxShadow: `inset 4px 0 0 0 ${teamColor(u.inTeam)}` }}>
                          <div className="min-w-0 pl-1">
                            <div className="truncate text-sm font-extrabold text-gray-900">{u.inName}</div>
                            <div className="mt-0.5 flex items-center gap-1"><TeamChip>{u.inTeam}</TeamChip><span className="text-xs text-gray-500">{u.inHorizonXPts.toFixed(1)} xPts · {money(u.inPrice)}</span></div>
                          </div>
                        </div>
                        <div className="ml-auto flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-xl font-extrabold tabular-nums text-emerald-600 dark:text-emerald-300">+{u.gain.toFixed(1)}<span className="ml-0.5 text-xs font-bold"> pts</span></div>
                            <div className="text-[11px] font-semibold text-gray-500">cost {signedMoney(u.priceDelta)}</div>
                          </div>
                          <Link href={compareUrl([u.outId, u.inId])} className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-500/20 dark:text-indigo-300" data-testid={`compare-${u.outId}-${u.inId}`}>
                            Compare
                          </Link>
                        </div>
                      </div>
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-gray-200/70 dark:bg-white/10">
                        <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500" style={{ width: `${Math.max(6, (u.gain / maxGain) * 100)}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-xs text-gray-500">
                Each row is an alternative, not an add-on: the gain is your squad's projected total with only that
                one swap. Transfer cost (a free transfer or −4 points) is not included.
                {data.sellingPricesApproximate && " Selling prices are approximate: we use current prices, so what you'd actually receive can differ."}
              </p>
            </SectionCard>

            <SectionCard
              icon={ShieldAlert}
              title="Things to check"
              subtitle={`Injuries, blanks and doubles in your squad over ${gwLabel}`}
              action={
                <ShareImageButton
                  getCard={() => thingsToCheckCard({ gwLabel, flags: data.flags })}
                  fileName={shareFileName(["things-to-check", gwLabel])}
                />
              }
            >
              <div className="space-y-2" data-testid="flags">
                {noFlags && <EmptyNote icon={ShieldCheck}>No injury flags, blank or double gameweeks in your squad over {gwLabel}.</EmptyNote>}
                {data.flags.availability.map((a) => (
                  <div key={a.playerId} className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-gray-50/60 px-3 py-2">
                    <span className="text-sm font-bold text-gray-900">{a.name}</span>
                    <StatusPill status={a.status} chance={a.chanceOfPlayingNextRound} />
                    {a.news && <span className="text-xs text-gray-600">{a.news}</span>}
                  </div>
                ))}
                {data.flags.blanks.map((b) => (
                  <div key={`b${b.playerId}`} className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-300/60 bg-gray-500/[0.06] px-3 py-2 text-sm">
                    <span className="font-bold text-gray-900">{b.name}</span>
                    <Pill>Blank</Pill> no fixture in {b.gameweeks.map((g) => `GW${g}`).join(", ")}
                  </div>
                ))}
                {data.flags.tbc.map((b) => (
                  <div key={`t${b.playerId}`} className="flex flex-wrap items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/[0.07] px-3 py-2 text-sm">
                    <span className="font-bold text-gray-900">{b.name}</span>
                    <Pill tone="indigo">TBC</Pill> fixture TBC in {b.gameweeks.map((g) => `GW${g}`).join(", ")} (not yet scheduled)
                  </div>
                ))}
                {data.flags.doubles.map((d) => (
                  <div key={`d${d.playerId}`} className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/[0.08] px-3 py-2 text-sm">
                    <span className="font-bold text-gray-900">{d.name}</span>
                    <Pill tone="amber">Double</Pill> double gameweek in {d.gameweeks.map((g) => `GW${g}`).join(", ")}
                  </div>
                ))}
              </div>
            </SectionCard>

            <p className="text-xs text-gray-500">
              Squad as at GW{data.resolvedGameweek}
              {data.activeChip ? ` (${CHIP_LABEL[data.activeChip] ?? data.activeChip} was active; chips are not modelled)` : ""}. Projections are our
              model's estimates, not guarantees, and are the same ones shown on the Points page. The All-time Top 100 squads are
              from our fixed list (FPL Research skill rating), as at the last completed gameweek, scored with the same method.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
