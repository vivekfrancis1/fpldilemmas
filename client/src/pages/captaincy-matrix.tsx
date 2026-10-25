import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { compareUrl } from "@shared/compare-utils";
import { Crown } from "lucide-react";
import type { MatrixTeamRow } from "@shared/captaincy-matrix";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlayerAvailabilityBadge } from "@/components/player-availability-badge";
import { ShareImageButton } from "@/components/share-image-button";
import { captainsCard, shareFileName } from "@shared/share-cards";
import JerseyIcon from "@/components/jersey-icon";
import { getFdrCellClass } from "@/lib/heatmap-colors";
import { Pill, PosChip, RankBadge, TeamChip, XptsBar, asPos } from "@/components/tool-ui";
import { teamColor } from "@/lib/team-colors";

interface MatrixResponse {
  gameweek: number;
  availableGameweeks: number[];
  teams: MatrixTeamRow[];
}

export default function CaptaincyMatrix() {
  const [gameweek, setGameweek] = useState<number | null>(null);
  const [position, setPosition] = useState<string>("ALL");

  const { data, isLoading, error } = useQuery<MatrixResponse>({
    queryKey: ["/api/captaincy-matrix", gameweek, position],
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (gameweek) params.set("gw", String(gameweek));
      if (position !== "ALL") params.set("position", position);
      const qs = params.toString();
      const res = await fetch(qs ? `/api/captaincy-matrix?${qs}` : "/api/captaincy-matrix");
      if (!res.ok) throw new Error("Failed to load captaincy matrix");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  // The single best option across every team (the page's spotlight) and the scale for the xPts bars.
  const all = data
    ? data.teams.flatMap((t) => t.candidates.map((c) => ({ c, t })))
    : [];
  const best = all.reduce<(typeof all)[number] | null>((b, x) => (!b || x.c.xPts > b.c.xPts ? x : b), null);
  const maxXpts = Math.max(0.1, ...all.map((x) => x.c.xPts));

  return (
    <div className="min-h-screen">
      <div className="w-full py-4 sm:py-8">
        <div className="fpl-page-header">
          <div className="fpl-page-header-content">
            <div className="fpl-page-title">
              <Crown />
              <h1 data-testid="text-page-title">Captaincy Matrix{data ? ` - GW${data.gameweek}` : ""}</h1>
            </div>
            <div className="fpl-page-actions">
              {data && (
                <Select value={String(data.gameweek)} onValueChange={(v) => setGameweek(Number(v))}>
                  <SelectTrigger className="w-[160px]" data-testid="select-gameweek">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {data.availableGameweeks.map((gw) => (
                      <SelectItem key={gw} value={String(gw)}>Gameweek {gw}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <p className="fpl-page-subtitle">
              The best captain options from every team, ranked by our expected points. A captain's points count double, so captaining a player is worth 2 × xPts.
            </p>
          </div>
        </div>

        {/* Spotlight: the best option across all teams */}
        {best && (
          <section
            className="relative mb-4 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-800 via-indigo-600 to-blue-700 p-5 text-white shadow-lg sm:p-6"
            data-testid="spotlight"
          >
            <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 left-1/4 h-56 w-56 rounded-full bg-amber-300/20 blur-3xl" />
            <div className="relative flex flex-wrap items-center gap-x-6 gap-y-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm sm:h-24 sm:w-24">
                <JerseyIcon team={best.t.shortName} position={best.c.position} className="h-16 w-16 object-contain sm:h-20 sm:w-20" />
              </div>
              <div className="min-w-[200px] flex-1">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.18em] text-amber-200">
                  <Crown className="h-4 w-4" /> Best captain pick{position === "ALL" ? "" : ` · ${position}`}
                </div>
                <Link href={compareUrl([best.c.playerId])} className="mt-1 block text-3xl font-extrabold leading-tight hover:underline sm:text-4xl" title="Compare this player">
                  {best.c.name}
                </Link>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                  <span className="rounded-md bg-white/15 px-2 py-0.5 font-semibold">{best.t.teamName}</span>
                  <span className="rounded-md bg-white/15 px-2 py-0.5 font-semibold">{best.c.position}</span>
                  {best.t.fixtures.map((f, i) => (
                    <span key={i} className={`rounded-md px-2 py-0.5 text-xs font-bold ${getFdrCellClass(f.difficulty)}`}>
                      {f.opponentShort} ({f.isHome ? "H" : "A"})
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-right">
                <div className="text-5xl font-extrabold tabular-nums leading-none sm:text-6xl">{best.c.xPts.toFixed(1)}</div>
                <div className="mt-1 text-xs font-semibold uppercase tracking-widest text-white/70">expected points</div>
              </div>
            </div>
          </section>
        )}

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-xl border border-gray-200 bg-gray-100 p-1" role="group" aria-label="Position filter">
            {["ALL", "GKP", "DEF", "MID", "FWD"].map((pos) => (
              <button
                key={pos}
                type="button"
                onClick={() => setPosition(pos)}
                aria-pressed={position === pos}
                data-testid={`filter-position-${pos}`}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${
                  position === pos ? "bg-white text-indigo-700 shadow-sm" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {pos === "ALL" ? "All" : pos}
              </button>
            ))}
          </div>
          {data && (
            <ShareImageButton
              getCard={() => {
                const top = data.teams
                  .flatMap((t) => t.candidates.map((c) => ({ name: c.name, teamShort: t.shortName, xPts: c.xPts, captainPoints: c.captainPoints, id: c.playerId })))
                  .sort((a, b) => b.xPts - a.xPts || a.id - b.id);
                const card = captainsCard({ gameweek: data.gameweek, players: top });
                return position === "ALL" ? card : { ...card, subtitle: `${card.subtitle} · ${position}` };
              }}
              fileName={shareFileName(["captains", `gw${data.gameweek}`, position === "ALL" ? "" : position])}
            />
          )}
        </div>

        {error && (
          <Card><CardContent className="p-6">Couldn't load the matrix. Please try again shortly.</CardContent></Card>
        )}
        {isLoading && <Card><CardContent className="p-6 text-muted-foreground">Loading…</CardContent></Card>}

        {data && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" data-testid="grid-matrix">
            {data.teams.map((team) => (
              <section
                key={team.teamId}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                style={{ boxShadow: `inset 4px 0 0 0 ${teamColor(team.shortName)}` }}
                data-testid={`card-team-${team.teamId}`}
              >
                <header className="flex items-center gap-3 border-b border-gray-100 bg-gradient-to-r from-indigo-500/[0.05] to-transparent py-3 pl-5 pr-4">
                  <JerseyIcon team={team.shortName} position="MID" className="h-9 w-9 shrink-0 object-contain" />
                  <h2 className="min-w-0 flex-1 truncate text-base font-extrabold text-gray-900">{team.teamName}</h2>
                  {team.fixtures.length === 0 ? (
                    <Pill>{team.fixtureTbc ? "Fixture TBC" : "No fixture"}</Pill>
                  ) : (
                    <span className="flex flex-wrap justify-end gap-1">
                      {team.fixtures.map((f, i) => (
                        <span key={i} className={`rounded-md px-2 py-0.5 text-xs font-bold ${getFdrCellClass(f.difficulty)}`}>
                          {f.opponentShort} ({f.isHome ? "H" : "A"})
                        </span>
                      ))}
                    </span>
                  )}
                </header>
                <div className="py-1 pl-5 pr-4">
                  {team.candidates.length === 0 ? (
                    <p className="py-4 text-sm text-gray-500">
                      {team.fixtures.length === 0
                        ? "Blank gameweek: no captain options."
                        : position === "ALL"
                          ? "No projections available."
                          : `No ${position} options for this team.`}
                    </p>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {team.candidates.map((c, i) => (
                        <li key={c.playerId} className="flex items-center gap-2.5 py-2.5" data-testid={`row-candidate-${c.playerId}`}>
                          <RankBadge rank={i + 1} />
                          <JerseyIcon team={team.shortName} position={c.position} className="h-7 w-7 shrink-0 object-contain" />
                          <div className="min-w-0 flex-1 basis-1/3">
                            <div className="flex flex-wrap items-center gap-x-1.5">
                              <Link href={compareUrl([c.playerId])} className="truncate text-sm font-bold text-gray-900 hover:underline" title="Compare this player">
                                {c.name}
                              </Link>
                              <PlayerAvailabilityBadge
                                player={{ status: c.status, chanceOfPlayingNextRound: c.chanceOfPlayingNextRound, news: c.news }}
                                compact
                              />
                            </div>
                            <div className="mt-0.5 flex items-center gap-1">
                              <PosChip pos={asPos(c.position)} />
                              <TeamChip>{c.ownership === null ? "—" : `${c.ownership}% owned`}</TeamChip>
                            </div>
                          </div>
                          <XptsBar value={c.xPts} max={maxXpts} tone={i === 0 ? "indigo" : asPos(c.position)} />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            ))}
          </div>
        )}

        {data && (
          <p className="mt-4 text-xs text-muted-foreground">
            Expected points are the same projections shown on the Points page, including availability adjustments.
            “Owned” is the overall ownership percentage, not effective ownership. Teams are ordered by their best
            option; teams without a fixture are listed last.
          </p>
        )}
      </div>
    </div>
  );
}
