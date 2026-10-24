import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Crown, ShieldAlert, Shirt, Sparkles, Star, Target } from "lucide-react";
import type { LeagueOwnership, OwnedPlayer, Threat, YourPlayer } from "@shared/league-ownership";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import JerseyIcon from "@/components/jersey-icon";
import { HeroPanel, PercentBar, Pill, PosChip, RankBadge, SectionCard, TeamChip, asPos } from "@/components/tool-ui";

type Response = LeagueOwnership & {
  league: { id: number; name: string };
  gameweek: number;
  gameweeks: number[];
  live: boolean;
  liveGameweek: number | null;
  hasMore: boolean;
};

const pts = (p?: number) => (p === undefined ? null : <Pill tone="green">{p} pt{p === 1 ? "" : "s"}</Pill>);

function PlayerLine({ p }: { p: OwnedPlayer | YourPlayer }) {
  const starting = "starting" in p ? p.starting : undefined;
  return (
    <li className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 py-2" data-testid={`line-${p.playerId}`}>
      <JerseyIcon team={p.teamShort} position={p.position} className="h-7 w-7 shrink-0 object-contain" />
      <div className="min-w-[110px] flex-1">
        <div className="truncate text-sm font-bold text-gray-900">{p.name}</div>
        <div className="mt-0.5 flex items-center gap-1"><TeamChip>{p.teamShort}</TeamChip><PosChip pos={asPos(p.position)} /></div>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-1">
        {starting !== undefined && <Pill tone={starting ? "indigo" : "gray"}>{starting ? "Starting XI" : "Bench"}</Pill>}
        {pts(p.points)}
        <Pill tone="indigo">{p.ownedBy} manager{p.ownedBy === 1 ? "" : "s"} · {p.percent}%</Pill>
      </div>
    </li>
  );
}

function ThreatLine({ t }: { t: Threat }) {
  return (
    <li className="py-2" data-testid={`threat-${t.playerId}`}>
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <JerseyIcon team={t.teamShort} position={t.position} className="h-7 w-7 shrink-0 object-contain" />
        <div className="min-w-[110px] flex-1">
          <div className="truncate text-sm font-bold text-gray-900">{t.name}</div>
          <div className="mt-0.5 flex items-center gap-1"><TeamChip>{t.teamShort}</TeamChip><PosChip pos={asPos(t.position)} /></div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1">
          {pts(t.points)}
          <Pill tone="indigo">{t.ownedBy} manager{t.ownedBy === 1 ? "" : "s"} · {t.percent}%</Pill>
        </div>
      </div>
      <p className="mt-1 pl-[38px] text-xs text-gray-500" data-testid={`owners-${t.playerId}`}>
        <span className="font-semibold text-gray-700">Owned by: </span>
        {t.owners.map((o, i) => (
          <span key={o.managerId}>
            {i > 0 && ", "}
            {o.name ?? `Team ${o.managerId}`}{o.rank || o.starting === false ? ` (${[o.rank ? `#${o.rank}` : "", o.starting === false ? "bench" : ""].filter(Boolean).join(", ")})` : ""}
          </span>
        ))}
      </p>
    </li>
  );
}

const POS = ["GKP", "DEF", "MID", "FWD"] as const;

/** Ownership, captains, template XI, and (with a team ID) differentials and threats for one classic league. */
export default function LeagueOwnershipView({ leagueId, managerId }: { leagueId: string; managerId: string }) {
  const [gameweek, setGameweek] = useState<number | null>(null);
  const [showAllOwned, setShowAllOwned] = useState(false);

  const { data, isFetching, error } = useQuery<Response>({
    queryKey: ["/api/league-ownership", leagueId, managerId, gameweek],
    retry: false,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (gameweek) params.set("gw", String(gameweek));
      if (managerId) params.set("managerId", managerId);
      const qs = params.toString();
      const res = await fetch(`/api/league-ownership/${encodeURIComponent(leagueId)}${qs ? `?${qs}` : ""}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Something went wrong");
      }
      return res.json();
    },
    staleTime: 10 * 60 * 1000,
  });

  const maxCaptain = data ? Math.max(1, ...data.captains.map((c) => c.percent)) : 1;

  return (
    <div className="space-y-5" data-testid="league-ownership-view">
      {data && (
        <div className="flex flex-wrap items-center gap-2">
          <Select value={String(data.gameweek)} onValueChange={(v) => setGameweek(Number(v))}>
            <SelectTrigger className="h-10 w-[170px] rounded-xl" data-testid="select-gameweek"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[...data.gameweeks].reverse().map((gw) => (
                <SelectItem key={gw} value={String(gw)}>Gameweek {gw}{gw === data.liveGameweek ? " (live)" : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isFetching && <span className="text-sm text-gray-500">Loading…</span>}
        </div>
      )}
      {!data && isFetching && <p className="text-sm text-gray-500" data-testid="text-loading">Loading the league's squads…</p>}

        {error && <Card><CardContent className="p-6 text-sm" data-testid="text-error">{(error as Error).message}</CardContent></Card>}

        {data && !error && (
          <div className="space-y-5">
            <HeroPanel testId="sample">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Mini-league</div>
              <h2 className="mt-1 text-2xl font-extrabold leading-tight sm:text-3xl">{data.league.name}</h2>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold">
                <span className="rounded-full bg-white/15 px-3 py-1 ring-1 ring-white/25">GW{data.gameweek} squads{data.live ? " · live points" : ""}</span>
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
                  <SectionCard icon={Target} title="You versus your league" subtitle="Where your squad stands out, and the popular players you are missing" testId="you">
                    {!data.you.hasFullSquad ? (
                      <p className="text-sm text-gray-500">We couldn't load a full 15-player squad for that team in GW{data.gameweek}.</p>
                    ) : (
                      <>
                        {!data.you.inSample && <p className="mb-3 text-xs text-gray-500">You're outside the managers counted, so this compares your squad with them.</p>}
                        <div className="space-y-4">
                          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.05] p-3">
                            <h3 className="flex items-center gap-1.5 text-sm font-bold text-emerald-700 dark:text-emerald-300"><Sparkles className="h-4 w-4" /> Your differentials</h3>
                            <p className="text-xs text-gray-500">Owned by under 50% of the league</p>
                            {data.you.differentials.length === 0 ? <p className="py-2 text-sm text-gray-500">None.</p> : <ul className="mt-1 divide-y divide-gray-200/70">{data.you.differentials.map((p) => <PlayerLine key={p.playerId} p={p} />)}</ul>}
                          </div>
                          <div className="rounded-xl border border-rose-500/30 bg-rose-500/[0.06] p-3">
                            <h3 className="flex items-center gap-1.5 text-sm font-bold text-rose-700 dark:text-rose-300"><ShieldAlert className="h-4 w-4" /> Threats</h3>
                            <p className="text-xs text-gray-500">Owned by more than 25% of the league, but not by you. Most owned first, with their points and every manager who holds them</p>
                            {data.you.threats.length === 0 ? <p className="py-2 text-sm text-gray-500">None.</p> : <ul className="mt-1 divide-y divide-gray-200/70" data-testid="list-threats">{data.you.threats.map((t) => <ThreatLine key={t.playerId} t={t} />)}</ul>}
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
  );
}
