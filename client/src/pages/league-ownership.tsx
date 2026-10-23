import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Crown, Flame, Search, Shirt, Sparkles, Star, Target, Users } from "lucide-react";
import type { LeagueOwnership, OwnedPlayer } from "@shared/league-ownership";
import { extractManagerId } from "@/lib/manager-id-utils";
import { readToolManagerId, saveToolManagerId } from "@/lib/manager-id-storage";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import JerseyIcon from "@/components/jersey-icon";
import { EmptyNote, HeroPanel, InputPanel, PercentBar, Pill, PosChip, RankBadge, SectionCard, TeamChip, asPos } from "@/components/tool-ui";

type Response = LeagueOwnership & {
  league: { id: number; name: string };
  gameweek: number;
  finishedGameweeks: number[];
  hasMore: boolean;
};

const LEAGUE_KEY = "fpl-league-id";
const read = (k: string) => {
  try {
    return localStorage.getItem(k) ?? "";
  } catch {
    return "";
  }
};
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* storage unavailable: still works for this visit */
  }
};

function PlayerLine({ p }: { p: OwnedPlayer }) {
  return (
    <li className="flex items-center gap-2.5 py-2" data-testid={`line-${p.playerId}`}>
      <JerseyIcon team={p.teamShort} position={p.position} className="h-7 w-7 shrink-0 object-contain" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold text-gray-900">{p.name}</div>
        <div className="mt-0.5 flex items-center gap-1"><TeamChip>{p.teamShort}</TeamChip><PosChip pos={asPos(p.position)} /></div>
      </div>
      <Pill tone="indigo">{p.ownedBy} manager{p.ownedBy === 1 ? "" : "s"} · {p.percent}%</Pill>
    </li>
  );
}

export default function LeagueOwnershipPage() {
  const [leagueInput, setLeagueInput] = useState("");
  const [managerInput, setManagerInput] = useState("");
  const [query, setQuery] = useState<{ league: string; manager: string } | null>(null);
  const [gameweek, setGameweek] = useState<number | null>(null);
  const [showAllOwned, setShowAllOwned] = useState(false);

  useEffect(() => {
    const league = read(LEAGUE_KEY);
    const manager = readToolManagerId();
    setLeagueInput(league);
    setManagerInput(manager);
    if (league) setQuery({ league, manager });
  }, []);

  const submit = () => {
    const league = leagueInput.trim();
    if (!/^\d+$/.test(league)) return;
    const manager = extractManagerId(managerInput).trim();
    write(LEAGUE_KEY, league);
    if (manager) saveToolManagerId(manager);
    setGameweek(null);
    setQuery({ league, manager });
  };

  const { data, isFetching, error } = useQuery<Response>({
    queryKey: ["/api/league-ownership", query?.league, query?.manager, gameweek],
    enabled: !!query,
    retry: false,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (gameweek) params.set("gw", String(gameweek));
      if (query?.manager) params.set("managerId", query.manager);
      const qs = params.toString();
      const res = await fetch(`/api/league-ownership/${encodeURIComponent(query!.league)}${qs ? `?${qs}` : ""}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Something went wrong");
      }
      return res.json();
    },
    staleTime: 10 * 60 * 1000,
  });

  const POS = ["GKP", "DEF", "MID", "FWD"] as const;
  const maxCaptain = data ? Math.max(1, ...data.captains.map((c) => c.percent)) : 1;

  return (
    <div className="min-h-screen">
      <div className="w-full py-4 sm:py-8">
        <div className="fpl-page-header">
          <div className="fpl-page-header-content">
            <div className="fpl-page-title">
              <Users />
              <h1 data-testid="text-page-title">Mini-league Ownership</h1>
            </div>
            <p className="fpl-page-subtitle">Who your league owns and captains, its template XI, and your differentials.</p>
          </div>
        </div>

        <InputPanel icon={Search} title="Find your league" subtitle="The classic league ID is in the league page URL; add your team ID to see your differentials">
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              value={leagueInput}
              onChange={(e) => setLeagueInput(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Classic league ID (from the league page URL)"
              className="h-11 rounded-xl text-base"
              data-testid="input-league-id"
            />
            <Input
              value={managerInput}
              onChange={(e) => setManagerInput(extractManagerId(e.target.value))}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Your team ID (optional, for differentials)"
              className="h-11 rounded-xl text-base"
              data-testid="input-manager-id"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={submit} disabled={!/^\d+$/.test(leagueInput.trim()) || isFetching} className="h-10 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 font-bold text-white hover:from-indigo-500 hover:to-violet-500" data-testid="button-load">
              {isFetching ? "Loading…" : "Show league"}
            </Button>
            {data && (
              <Select value={String(data.gameweek)} onValueChange={(v) => setGameweek(Number(v))}>
                <SelectTrigger className="h-10 w-[170px] rounded-xl" data-testid="select-gameweek"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[...data.finishedGameweeks].reverse().map((gw) => (
                    <SelectItem key={gw} value={String(gw)}>Gameweek {gw}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </InputPanel>

        {error && <Card><CardContent className="p-6 text-sm" data-testid="text-error">{(error as Error).message}</CardContent></Card>}

        {data && !error && (
          <div className="space-y-5">
            <HeroPanel testId="sample">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Mini-league</div>
              <h2 className="mt-1 text-2xl font-extrabold leading-tight sm:text-3xl">{data.league.name}</h2>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold">
                <span className="rounded-full bg-white/15 px-3 py-1 ring-1 ring-white/25">GW{data.gameweek} squads</span>
                <span className="rounded-full bg-white/15 px-3 py-1 ring-1 ring-white/25">
                  {data.hasMore ? `Top ${data.managersRequested} managers by rank` : `All ${data.managersRequested} managers`}
                </span>
                <span className="rounded-full bg-white/15 px-3 py-1 ring-1 ring-white/25">{data.managersCounted} squads counted</span>
              </div>
              <p className="mt-3 text-sm text-white/80">
                {data.hasMore ? "The league has more managers than we load. " : ""}
                {data.managersCounted < data.managersRequested &&
                  `${data.managersRequested - data.managersCounted} squads couldn't be loaded and aren't counted. `}
                Percentages are of the {data.managersCounted} squads counted.
              </p>
            </HeroPanel>

            {data.managersCounted === 0 ? (
              <Card><CardContent className="p-6 text-sm text-muted-foreground">No squads available for this league and gameweek.</CardContent></Card>
            ) : (
              <>
                {data.you && (
                  <SectionCard icon={Target} title="You versus your league" subtitle="Where your squad stands out, and where it is missing the crowd's picks" testId="you">
                    {!data.you.hasFullSquad ? (
                      <p className="text-sm text-gray-500">We couldn't load a full 15-player squad for that team in GW{data.gameweek}.</p>
                    ) : (
                      <>
                        {!data.you.inSample && <p className="mb-3 text-xs text-gray-500">You're outside the managers counted, so this compares your squad with them.</p>}
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.05] p-3">
                            <h3 className="flex items-center gap-1.5 text-sm font-bold text-emerald-700 dark:text-emerald-300"><Sparkles className="h-4 w-4" /> Your differentials</h3>
                            <p className="text-xs text-gray-500">Owned by under 25% of the league</p>
                            {data.you.differentials.length === 0 ? <p className="py-2 text-sm text-gray-500">None.</p> : <ul className="mt-1 divide-y divide-gray-200/70">{data.you.differentials.map((p) => <PlayerLine key={p.playerId} p={p} />)}</ul>}
                          </div>
                          <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-3">
                            <h3 className="flex items-center gap-1.5 text-sm font-bold text-amber-700 dark:text-amber-300"><Flame className="h-4 w-4" /> Gaps</h3>
                            <p className="text-xs text-gray-500">Owned by half or more of the league, not by you</p>
                            {data.you.gaps.length === 0 ? <p className="py-2 text-sm text-gray-500">None.</p> : <ul className="mt-1 divide-y divide-gray-200/70">{data.you.gaps.map((p) => <PlayerLine key={p.playerId} p={p} />)}</ul>}
                          </div>
                        </div>
                      </>
                    )}
                  </SectionCard>
                )}

                <SectionCard icon={Star} title="Most owned players" subtitle="Share of the counted squads that hold each player">
                  <ul className="divide-y divide-gray-100" data-testid="list-ownership">
                    {data.ownership.slice(0, showAllOwned ? undefined : 15).map((p, i) => (
                      <li key={p.playerId} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                        <RankBadge rank={i + 1} />
                        <JerseyIcon team={p.teamShort} position={p.position} className="h-7 w-7 shrink-0 object-contain" />
                        <div className="min-w-[110px] flex-1 basis-1/4">
                          <div className="truncate text-sm font-bold text-gray-900">{p.name}</div>
                          <div className="mt-0.5 flex items-center gap-1"><TeamChip>{p.teamShort}</TeamChip><PosChip pos={asPos(p.position)} /></div>
                        </div>
                        <PercentBar percent={p.percent} tone={asPos(p.position)} label={`${p.ownedBy} · ${p.percent}%`} />
                      </li>
                    ))}
                  </ul>
                  {data.ownership.length > 15 && (
                    <button
                      type="button"
                      onClick={() => setShowAllOwned((v) => !v)}
                      className="mt-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-500/20 dark:text-indigo-300"
                      data-testid="button-toggle-owned"
                    >
                      {showAllOwned ? "Show fewer" : `Show all ${data.ownership.length}`}
                    </button>
                  )}
                </SectionCard>

                <SectionCard icon={Crown} title="Captains" subtitle="Who the league gave the armband to">
                  <ul className="divide-y divide-gray-100" data-testid="list-captains">
                    {data.captains.map((c, i) => (
                      <li key={c.playerId} className="flex items-center gap-3 py-2.5">
                        <RankBadge rank={i + 1} />
                        <span className="w-[140px] min-w-[110px] truncate text-sm font-bold text-gray-900">{c.name}</span>
                        <PercentBar percent={(c.percent / maxCaptain) * 100} label={`${c.count} · ${c.percent}%`} />
                      </li>
                    ))}
                  </ul>
                </SectionCard>

                {data.template.startingXI.length === 11 && (
                  <SectionCard
                    icon={Shirt}
                    title={`League template XI (${data.template.formation})`}
                    subtitle="Built from the most-owned players, max 3 per club"
                    testId="template"
                  >
                    <div className="relative overflow-hidden rounded-2xl border-2 border-white/40 bg-[repeating-linear-gradient(180deg,#1e7a3b_0px,#1e7a3b_56px,#23893f_56px,#23893f_112px)] px-2 py-4 shadow-inner">
                      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-0.5 bg-white/40" />
                      <div className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/40" />
                      <div className="relative flex flex-col gap-4">
                        {[...POS].reverse().map((pos) => (
                          <div key={pos} className="flex justify-evenly gap-1">
                            {data.template.startingXI.filter((p) => p.position === pos).map((p) => (
                              <div key={p.playerId} className="flex w-[88px] flex-col items-center sm:w-[112px]">
                                <JerseyIcon team={p.teamShort} position={p.position} className="h-12 w-12 object-contain sm:h-14 sm:w-14" />
                                <span className="mt-0.5 max-w-full truncate rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-bold text-white sm:text-xs">{p.name}</span>
                                <span className="mt-0.5 text-[11px] font-extrabold text-white drop-shadow sm:text-xs">{p.ownershipPercent}%</span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span className="font-bold uppercase tracking-wide">Bench</span>
                      {data.template.bench.map((p) => (
                        <span key={p.playerId} className="inline-flex items-center gap-1 rounded-full bg-gray-500/10 py-0.5 pl-1 pr-2 font-semibold text-gray-700">
                          <JerseyIcon team={p.teamShort} position={p.position} className="h-5 w-5 object-contain" />
                          {p.name} {p.ownershipPercent}%
                        </span>
                      ))}
                    </div>
                  </SectionCard>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
