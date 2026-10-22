import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Crown } from "lucide-react";
import type { TemplateTeam, TemplatePlayer } from "@shared/template-team";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PitchView, type PitchPlayer } from "@/components/pitch-view";
import { ShareImageButton } from "@/components/share-image-button";
import { templateCard, shareFileName } from "@shared/share-cards";

type TemplateResponse = TemplateTeam & { gameweek: number | null; fetchedAt: string | null };

const ELEMENT_TYPE: Record<TemplatePlayer["position"], number> = { GKP: 1, DEF: 2, MID: 3, FWD: 4 };

// Same shape the other pitch pages feed PitchView; the badge under each name is the squad-ownership share.
function toPitchPlayer(p: TemplatePlayer, position: number, captainId?: number): PitchPlayer {
  return {
    element: p.playerId,
    element_type: ELEMENT_TYPE[p.position],
    position,
    is_captain: captainId === p.playerId,
    is_vice_captain: false,
    web_name: p.name,
    team_short_name: p.teamShort,
    team_code: p.teamCode,
    price: p.price,
    points_display: `${p.ownershipPercent}%`,
  };
}

export default function TemplateTeamPage() {
  const { data, isLoading, error } = useQuery<TemplateResponse>({
    queryKey: ["/api/template-team"],
    staleTime: 5 * 60 * 1000,
  });

  const hasTeam = !!data && data.startingXI.length === 11;
  const pitchPlayers = hasTeam ? data.startingXI.map((p, i) => toPitchPlayer(p, i + 1, data.captain?.playerId)) : [];
  const benchPlayers = hasTeam ? data.bench.map((p, i) => toPitchPlayer(p, i + 12)) : [];

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
                  <ShareImageButton
                    getCard={() => templateCard({ ...data, captain: data.captain ? { name: data.captain.name, percent: data.captain.percent } : null })}
                    fileName={shareFileName(["template-team", `gw${data.gameweek ?? ""}`])}
                    className="ml-auto"
                  />
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 sm:p-4" data-testid="pitch">
                <PitchView players={pitchPlayers} benchPlayers={benchPlayers} />
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
