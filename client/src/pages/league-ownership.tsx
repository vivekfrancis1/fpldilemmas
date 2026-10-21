import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import type { LeagueOwnership, OwnedPlayer } from "@shared/league-ownership";
import { extractManagerId } from "@/lib/manager-id-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Response = LeagueOwnership & {
  league: { id: number; name: string };
  gameweek: number;
  finishedGameweeks: number[];
  hasMore: boolean;
};

const LEAGUE_KEY = "fpl-league-id";
const MANAGER_KEY = "fpl-manager-id";
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
    <li className="flex items-baseline gap-2 text-sm" data-testid={`line-${p.playerId}`}>
      <span className="font-medium">{p.name}</span>
      <span className="text-xs text-muted-foreground">{p.teamShort} · {p.position}</span>
      <span className="ml-auto text-xs">{p.ownedBy} manager{p.ownedBy === 1 ? "" : "s"} ({p.percent}%)</span>
    </li>
  );
}

export default function LeagueOwnershipPage() {
  const [leagueInput, setLeagueInput] = useState("");
  const [managerInput, setManagerInput] = useState("");
  const [query, setQuery] = useState<{ league: string; manager: string } | null>(null);
  const [gameweek, setGameweek] = useState<number | null>(null);

  useEffect(() => {
    const league = read(LEAGUE_KEY);
    const manager = read(MANAGER_KEY);
    setLeagueInput(league);
    setManagerInput(manager);
    if (league) setQuery({ league, manager });
  }, []);

  const submit = () => {
    const league = leagueInput.trim();
    if (!/^\d+$/.test(league)) return;
    const manager = extractManagerId(managerInput).trim();
    write(LEAGUE_KEY, league);
    if (manager) write(MANAGER_KEY, manager);
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

        <Card className="mb-4">
          <CardContent className="space-y-3 p-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                value={leagueInput}
                onChange={(e) => setLeagueInput(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="Classic league ID (from the league page URL)"
                className="text-base"
                data-testid="input-league-id"
              />
              <Input
                value={managerInput}
                onChange={(e) => setManagerInput(extractManagerId(e.target.value))}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="Your team ID (optional, for differentials)"
                className="text-base"
                data-testid="input-manager-id"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={submit} disabled={!/^\d+$/.test(leagueInput.trim()) || isFetching} data-testid="button-load">
                {isFetching ? "Loading…" : "Show league"}
              </Button>
              {data && (
                <Select value={String(data.gameweek)} onValueChange={(v) => setGameweek(Number(v))}>
                  <SelectTrigger className="w-[150px]" data-testid="select-gameweek"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[...data.finishedGameweeks].reverse().map((gw) => (
                      <SelectItem key={gw} value={String(gw)}>Gameweek {gw}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardContent>
        </Card>

        {error && <Card><CardContent className="p-6 text-sm" data-testid="text-error">{(error as Error).message}</CardContent></Card>}

        {data && !error && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4 text-sm" data-testid="sample">
                <span className="font-semibold">{data.league.name}</span> · GW{data.gameweek} squads ·{" "}
                {data.hasMore
                  ? `the top ${data.managersRequested} managers by rank (the league has more)`
                  : `all ${data.managersRequested} managers`}
                {data.managersCounted < data.managersRequested &&
                  ` · ${data.managersRequested - data.managersCounted} squads couldn't be loaded and aren't counted`}
                . Percentages are of the {data.managersCounted} squads counted.
              </CardContent>
            </Card>

            {data.managersCounted === 0 ? (
              <Card><CardContent className="p-6 text-sm text-muted-foreground">No squads available for this league and gameweek.</CardContent></Card>
            ) : (
              <>
                {data.you && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base">You versus your league</CardTitle></CardHeader>
                    <CardContent className="space-y-3" data-testid="you">
                      {!data.you.hasFullSquad ? (
                        <p className="text-sm text-muted-foreground">We couldn't load a full 15-player squad for that team in GW{data.gameweek}.</p>
                      ) : (
                        <>
                          {!data.you.inSample && <p className="text-xs text-muted-foreground">You're outside the managers counted, so this compares your squad with them.</p>}
                          <div>
                            <h3 className="mb-1 text-sm font-semibold">Your differentials (owned by under 25% of the league)</h3>
                            {data.you.differentials.length === 0 ? <p className="text-sm text-muted-foreground">None.</p> : <ul className="space-y-1">{data.you.differentials.map((p) => <PlayerLine key={p.playerId} p={p} />)}</ul>}
                          </div>
                          <div>
                            <h3 className="mb-1 text-sm font-semibold">Gaps (owned by half or more of the league, not by you)</h3>
                            {data.you.gaps.length === 0 ? <p className="text-sm text-muted-foreground">None.</p> : <ul className="space-y-1">{data.you.gaps.map((p) => <PlayerLine key={p.playerId} p={p} />)}</ul>}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Most owned players</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="space-y-1.5" data-testid="list-ownership">
                      {data.ownership.map((p) => (
                        <li key={p.playerId} className="grid grid-cols-[1fr_auto] items-center gap-x-3 text-sm">
                          <span><span className="font-medium">{p.name}</span> <span className="text-xs text-muted-foreground">{p.teamShort} · {p.position}</span></span>
                          <span className="w-24 text-right text-xs">{p.ownedBy} ({p.percent}%)</span>
                          <Progress value={p.percent} className="col-span-2 h-1.5" />
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Captains</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="space-y-1 text-sm" data-testid="list-captains">
                      {data.captains.map((c) => (
                        <li key={c.playerId}><span className="font-medium">{c.name}</span> · {c.count} manager{c.count === 1 ? "" : "s"} ({c.percent}%)</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {data.template.startingXI.length === 11 && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base">League template XI ({data.template.formation})</CardTitle></CardHeader>
                    <CardContent className="space-y-1 text-sm" data-testid="template">
                      {POS.map((pos) => (
                        <div key={pos}>
                          <span className="mr-2 text-xs text-muted-foreground">{pos}</span>
                          {data.template.startingXI.filter((p) => p.position === pos).map((p) => `${p.name} ${p.ownershipPercent}%`).join(" · ")}
                        </div>
                      ))}
                      <div className="pt-1 text-xs text-muted-foreground">
                        Bench: {data.template.bench.map((p) => `${p.name} ${p.ownershipPercent}%`).join(" · ")}. Built from the most-owned players, max 3 per club.
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
