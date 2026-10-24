import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Crown, Flame, Search, ShieldAlert, Shirt, Sparkles, Star, Target, Users } from "lucide-react";
import type { LeagueOwnership, OwnedPlayer, Threat } from "@shared/league-ownership";
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

type ClassicLeague = { id: number; name: string; league_type?: string };

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

function ThreatLine({ t }: { t: Threat }) {
  const shown = t.owners.slice(0, 3).map((o) => (o.rank ? `${o.name ?? `Team ${o.managerId}`} (#${o.rank})` : o.name ?? `Team ${o.managerId}`));
  const more = t.owners.length - shown.length;
  return (
    <li className="flex items-center gap-2.5 py-2" data-testid={`threat-${t.playerId}`}>
      <JerseyIcon team={t.teamShort} position={t.position} className="h-7 w-7 shrink-0 object-contain" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold text-gray-900">{t.name}</div>
        <div className="mt-0.5 flex items-center gap-1"><TeamChip>{t.teamShort}</TeamChip><PosChip pos={asPos(t.position)} /></div>
      </div>
      <div className="max-w-[55%] text-right text-xs text-gray-500">
        <span className="font-semibold text-gray-700">{shown.join(", ")}{more > 0 ? ` +${more}` : ""}</span>
      </div>
    </li>
  );
}

export default function LeagueOwnershipPage() {
  const [managerInput, setManagerInput] = useState("");
  const [lookupId, setLookupId] = useState("");
  const [selectedLeague, setSelectedLeague] = useState("");
  const [customMode, setCustomMode] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [query, setQuery] = useState<{ league: string; manager: string } | null>(null);
  const [gameweek, setGameweek] = useState<number | null>(null);
  const [showAllOwned, setShowAllOwned] = useState(false);
  const restored = useRef(false);

  const load = (league: string, manager: string) => {
    write(LEAGUE_KEY, league);
    if (manager) saveToolManagerId(manager);
    setSelectedLeague(league);
    setGameweek(null);
    setQuery({ league, manager });
  };

  useEffect(() => {
    const league = read(LEAGUE_KEY);
    const manager = readToolManagerId();
    setManagerInput(manager);
    setLookupId(manager);
    setSelectedLeague(league);
    if (league) setQuery({ league, manager });
    else restored.current = true;
  }, []);

  // Look the leagues up once the team ID has stopped changing for a moment
  useEffect(() => {
    const id = extractManagerId(managerInput).trim();
    if (!/^\d+$/.test(id)) return;
    const t = setTimeout(() => setLookupId(id), 500);
    return () => clearTimeout(t);
  }, [managerInput]);

  const { data: leagueList, isFetching: leaguesLoading } = useQuery<ClassicLeague[] | null>({
    queryKey: ["/api/manager", lookupId, "leagues"],
    enabled: /^\d+$/.test(lookupId),
    retry: false,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const res = await fetch(`/api/manager/${encodeURIComponent(lookupId)}/leagues`);
      if (!res.ok) return null;
      const body = await res.json().catch(() => null);
      return Array.isArray(body?.classic) ? body.classic : null;
    },
  });

  // Only the manager's private (invitational) leagues; system leagues (Overall, country, club fans) are left out
  const leagues = useMemo(
    () => (leagueList ?? []).filter((l) => l.league_type === "x").sort((a, b) => a.name.localeCompare(b.name)),
    [leagueList],
  );

  // On the first lookup after a reload, a saved league the manager is not a member of goes into the "another league" box
  useEffect(() => {
    if (!leagueList || restored.current) return;
    restored.current = true;
    if (selectedLeague && !leagues.some((l) => String(l.id) === selectedLeague)) {
      setCustomMode(true);
      setCustomInput(selectedLeague);
    }
  }, [leagueList, selectedLeague]);

  const manager = () => extractManagerId(managerInput).trim();
  const chooseLeague = (v: string) => {
    if (v === "other") {
      setCustomMode(true);
      return;
    }
    setCustomMode(false);
    load(v, manager());
  };
  const loadCustom = () => {
    const league = customInput.trim();
    if (/^\d+$/.test(league)) load(league, manager());
  };
  const showCustom = customMode || !leagueList;
  const noLeagues = /^\d+$/.test(lookupId) && !leaguesLoading && !leagueList;

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

        <InputPanel icon={Search} title="Find your league" subtitle="Enter your team ID and pick one of your classic leagues">
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              value={managerInput}
              onChange={(e) => setManagerInput(extractManagerId(e.target.value))}
              onKeyDown={(e) => e.key === "Enter" && /^\d+$/.test(manager()) && setLookupId(manager())}
              placeholder="Your team ID"
              inputMode="numeric"
              className="h-11 rounded-xl text-base"
              data-testid="input-manager-id"
            />
            {leagueList && (
              <Select value={customMode ? "other" : leagues.some((l) => String(l.id) === selectedLeague) ? selectedLeague : ""} onValueChange={chooseLeague}>
                <SelectTrigger className="h-11 rounded-xl text-base" data-testid="select-league"><SelectValue placeholder="Choose a league" /></SelectTrigger>
                <SelectContent>
                  {leagues.map((l) => (
                    <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>
                  ))}
                  <SelectItem value="other">Another league (enter its ID)…</SelectItem>
                </SelectContent>
              </Select>
            )}
            {!leagueList && (
              <div className="flex h-11 items-center text-sm text-gray-500" data-testid="text-league-hint">
                {leaguesLoading ? "Finding your leagues…" : noLeagues ? "We couldn't find leagues for that team ID." : "Your leagues will appear here."}
              </div>
            )}
          </div>
          {showCustom && (
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && loadCustom()}
                placeholder="Classic league ID (from the league page URL)"
                inputMode="numeric"
                className="h-11 rounded-xl text-base"
                data-testid="input-league-id"
              />
              <Button onClick={loadCustom} disabled={!/^\d+$/.test(customInput.trim()) || isFetching} className="h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 font-bold text-white hover:from-indigo-500 hover:to-violet-500" data-testid="button-load">
                {isFetching ? "Loading…" : "Show league"}
              </Button>
            </div>
          )}
          {data && (
            <div className="flex flex-wrap items-center gap-2">
              <Select value={String(data.gameweek)} onValueChange={(v) => setGameweek(Number(v))}>
                <SelectTrigger className="h-10 w-[170px] rounded-xl" data-testid="select-gameweek"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[...data.finishedGameweeks].reverse().map((gw) => (
                    <SelectItem key={gw} value={String(gw)}>Gameweek {gw}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isFetching && <span className="text-sm text-gray-500">Loading…</span>}
            </div>
          )}
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
                  <SectionCard icon={Target} title="You versus your league" subtitle="Where your squad stands out, what it is missing, and which rivals hold players you do not" testId="you">
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
                        <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/[0.06] p-3">
                          <h3 className="flex items-center gap-1.5 text-sm font-bold text-rose-700 dark:text-rose-300"><ShieldAlert className="h-4 w-4" /> Threats</h3>
                          <p className="text-xs text-gray-500">Players you don't own that fewer than 25% of the league do, with the rivals who hold them. Best-ranked rival first</p>
                          {data.you.threats.length === 0 ? <p className="py-2 text-sm text-gray-500">None.</p> : <ul className="mt-1 divide-y divide-gray-200/70" data-testid="list-threats">{data.you.threats.map((t) => <ThreatLine key={t.playerId} t={t} />)}</ul>}
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
                    <div className="relative overflow-hidden rounded-2xl border-2 border-white/40 bg-[repeating-linear-gradient(180deg,#1e7a3b_0px,#1e7a3b_70px,#23893f_70px,#23893f_140px)] px-2 py-6 shadow-inner sm:px-4 sm:py-8">
                      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-0.5 bg-white/40" />
                      <div className="pointer-events-none absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/40 sm:h-36 sm:w-36" />
                      <div className="pointer-events-none absolute inset-x-[27%] top-0 h-[14%] rounded-b-md border-2 border-t-0 border-white/40" />
                      <div className="pointer-events-none absolute inset-x-[27%] bottom-0 h-[14%] rounded-t-md border-2 border-b-0 border-white/40" />
                      <div className="relative flex flex-col gap-8 sm:gap-12">
                        {POS.map((pos) => (
                          <div key={pos} className="flex justify-evenly gap-1">
                            {data.template.startingXI.filter((p) => p.position === pos).map((p) => (
                              <div key={p.playerId} className="flex w-[84px] flex-col items-center sm:w-[132px]">
                                <JerseyIcon team={p.teamShort} position={p.position} className="h-14 w-14 object-contain sm:h-20 sm:w-20" />
                                <span className="mt-1 max-w-full truncate rounded-full bg-black/60 px-2.5 py-0.5 text-xs font-bold text-white sm:text-sm">{p.name}</span>
                                <span className="mt-0.5 text-xs font-extrabold text-white drop-shadow sm:text-sm">{p.ownershipPercent}%</span>
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
