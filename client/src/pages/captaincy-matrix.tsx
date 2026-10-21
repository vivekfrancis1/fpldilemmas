import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { compareUrl } from "@shared/compare-utils";
import { Crown } from "lucide-react";
import type { MatrixTeamRow } from "@shared/captaincy-matrix";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlayerAvailabilityBadge } from "@/components/player-availability-badge";
import { ShareImageButton } from "@/components/share-image-button";
import { captainsCard, shareFileName } from "@shared/share-cards";
import JerseyIcon from "@/components/jersey-icon";
import { getFixtureDifficultyColor } from "@/lib/heatmap-colors";

interface MatrixResponse {
  gameweek: number;
  availableGameweeks: number[];
  teams: MatrixTeamRow[];
}

const POSITION_NAME: Record<string, string> = { GKP: "Goalkeeper", DEF: "Defender", MID: "Midfielder", FWD: "Forward" };

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
                  <SelectTrigger className="w-[130px]" data-testid="select-gameweek">
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
              The best captain options from every team, ranked by our expected points. Captain points are 2 × xPts.
            </p>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-100 p-0.5" role="group" aria-label="Position filter">
          {["ALL", "GKP", "DEF", "MID", "FWD"].map((pos) => (
            <button
              key={pos}
              type="button"
              onClick={() => setPosition(pos)}
              aria-pressed={position === pos}
              data-testid={`filter-position-${pos}`}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                position === pos ? "bg-white text-blue-700 shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {pos === "ALL" ? "All" : pos}
            </button>
          ))}
        </div>
        {data && (() => {
          const top = data.teams
            .flatMap((t) => t.candidates.map((c) => ({ name: c.name, teamShort: t.shortName, xPts: c.xPts, captainPoints: c.captainPoints, id: c.playerId })))
            .sort((a, b) => b.xPts - a.xPts || a.id - b.id);
          const card = captainsCard({ gameweek: data.gameweek, players: top });
          return (
            <ShareImageButton
              card={position === "ALL" ? card : { ...card, subtitle: `${card.subtitle} · ${position}` }}
              fileName={shareFileName(["captains", `gw${data.gameweek}`, position === "ALL" ? "" : position])}
            />
          );
        })()}
        </div>

        {error && (
          <Card><CardContent className="p-6">Couldn't load the matrix. Please try again shortly.</CardContent></Card>
        )}
        {isLoading && <Card><CardContent className="p-6 text-muted-foreground">Loading…</CardContent></Card>}

        {data && (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" data-testid="grid-matrix">
            {data.teams.map((team) => (
              <Card key={team.teamId} data-testid={`card-team-${team.teamId}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                    <span>{team.teamName}</span>
                    {team.fixtures.length === 0 ? (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                        No fixture
                      </span>
                    ) : (
                      team.fixtures.map((f, i) => (
                        <span
                          key={i}
                          className={`rounded px-1.5 py-0.5 text-xs font-medium ${getFixtureDifficultyColor(f.difficulty)}`}
                        >
                          {f.opponentShort} ({f.isHome ? "H" : "A"})
                        </span>
                      ))
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {team.candidates.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {team.fixtures.length === 0
                        ? "Blank gameweek: no captain options."
                        : position === "ALL"
                          ? "No projections available."
                          : "No projected players in this position."}
                    </p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-muted-foreground">
                          <th className="py-1 text-left font-medium">Player</th>
                          <th className="py-1 text-right font-medium">xPts</th>
                          <th className="py-1 text-right font-medium">Captain</th>
                          <th className="py-1 text-right font-medium">Owned</th>
                        </tr>
                      </thead>
                      <tbody>
                        {team.candidates.map((c) => (
                          <tr key={c.playerId} className="border-t" data-testid={`row-candidate-${c.playerId}`}>
                            <td className="py-1.5">
                              <span className="flex items-center gap-1.5">
                                <JerseyIcon team={team.teamName} position={POSITION_NAME[c.position]} />
                                <Link href={compareUrl([c.playerId])} className="font-medium hover:underline" title="Compare this player">{c.name}</Link>
                                <span className="text-xs text-muted-foreground">{c.position}</span>
                                <PlayerAvailabilityBadge
                                  player={{ status: c.status, chanceOfPlayingNextRound: c.chanceOfPlayingNextRound, news: c.news }}
                                  compact
                                />
                              </span>
                            </td>
                            <td className="py-1.5 text-right">{c.xPts.toFixed(1)}</td>
                            <td className="py-1.5 text-right font-semibold">{c.captainPoints.toFixed(1)}</td>
                            <td className="py-1.5 text-right text-muted-foreground">
                              {c.ownership === null ? "—" : `${c.ownership}%`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
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
