import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Crown } from "lucide-react";
import type { TemplateTeam, TemplatePlayer } from "@shared/template-team";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import JerseyIcon from "@/components/jersey-icon";

type TemplateResponse = TemplateTeam & { gameweek: number | null; fetchedAt: string | null };

const POSITION_NAME: Record<string, string> = { GKP: "Goalkeeper", DEF: "Defender", MID: "Midfielder", FWD: "Forward" };
const ROWS: Array<TemplatePlayer["position"]> = ["GKP", "DEF", "MID", "FWD"];

function PlayerTile({ p, captainId }: { p: TemplatePlayer; captainId?: number }) {
  return (
    <div
      className="flex w-[72px] flex-col items-center rounded-lg bg-white/90 px-1 py-1.5 text-center shadow-sm sm:w-24"
      data-testid={`tile-player-${p.playerId}`}
    >
      <JerseyIcon team={p.teamName} position={POSITION_NAME[p.position]} className="h-8 w-8 object-contain sm:h-10 sm:w-10" />
      <span className="mt-0.5 w-full truncate text-xs font-semibold text-gray-900">
        {p.name}
        {captainId === p.playerId && <span className="ml-0.5 rounded bg-gray-900 px-1 text-[9px] text-white">C</span>}
      </span>
      <span className="text-[11px] font-medium text-gray-600">{p.ownershipPercent}%</span>
    </div>
  );
}

export default function TemplateTeamPage() {
  const { data, isLoading, error } = useQuery<TemplateResponse>({
    queryKey: ["/api/template-team"],
    staleTime: 5 * 60 * 1000,
  });

  const hasTeam = !!data && data.startingXI.length === 11;

  return (
    <div className="min-h-screen">
      <div className="w-full py-4 sm:py-8">
        <div className="fpl-page-header">
          <div className="fpl-page-header-content">
            <div className="fpl-page-title">
              <Crown />
              <h1 data-testid="text-page-title">Template Team{data?.gameweek ? ` - GW${data.gameweek}` : ""}</h1>
            </div>
            <p className="fpl-page-subtitle">
              The most-owned squad among our <Link href="/top-managers" className="underline">Top 100 managers</Link>.
            </p>
          </div>
        </div>

        {error && <Card><CardContent className="p-6">Couldn't load the template team. Please try again shortly.</CardContent></Card>}
        {isLoading && <Card><CardContent className="p-6 text-muted-foreground">Loading…</CardContent></Card>}

        {data && !hasTeam && (
          <Card><CardContent className="p-6 text-muted-foreground">
            Not enough squad data yet ({data.managersCounted} of {data.managersRequested} squads loaded).
          </CardContent></Card>
        )}

        {data && hasTeam && (
          <>
            <Card className="mb-4 overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="flex flex-wrap items-center gap-x-4 gap-y-1 text-base">
                  <span>Starting XI ({data.formation})</span>
                  <span className="text-sm font-normal text-muted-foreground" data-testid="text-sample">
                    {data.managersCounted} of {data.managersRequested} squads · squad value £{data.totalValue.toFixed(1)}m
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-3 bg-gradient-to-b from-emerald-600 to-emerald-700 px-2 py-4 sm:py-6" data-testid="pitch">
                  {ROWS.map((pos) => (
                    <div key={pos} className="flex flex-wrap justify-center gap-2 sm:gap-3">
                      {data.startingXI.filter((p) => p.position === pos).map((p) => (
                        <PlayerTile key={p.playerId} p={p} captainId={data.captain?.playerId} />
                      ))}
                    </div>
                  ))}
                </div>
                <div className="border-t bg-muted/40 px-2 py-3">
                  <p className="mb-2 text-center text-xs font-medium text-muted-foreground">Bench</p>
                  <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                    {data.bench.map((p) => (
                      <PlayerTile key={p.playerId} p={p} />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {data.captain && (
              <Card className="mb-4">
                <CardContent className="p-4 text-sm" data-testid="text-captain">
                  Most popular captain: <span className="font-semibold">{data.captain.name}</span>, chosen by{" "}
                  {data.captain.count} of {data.managersCounted} managers ({data.captain.percent}%).
                </CardContent>
              </Card>
            )}

            <p className="text-xs text-muted-foreground">
              Percentages show how many of the squads counted hold each player in their 15 (bench included). The
              squad is the most-owned players in each position (2 GKP, 5 DEF, 5 MID, 3 FWD), with no more than 3
              from one club; the XI is the most-owned legal formation from those 15. It is the squads as they stood in
              GW{data.gameweek}, from our fixed Top 100 list, not the current-season Top 100 by rank. Prices are
              today's.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
