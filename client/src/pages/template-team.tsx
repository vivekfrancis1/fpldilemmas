import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Crown, Shirt, Users } from "lucide-react";
import { TEMPLATE_GROUPS, type TemplateGroup, type TemplateTeam, type TemplatePlayer } from "@shared/template-team";
import { Card, CardContent } from "@/components/ui/card";
import { PitchView, type PitchPlayer } from "@/components/pitch-view";
import { ShareImageButton } from "@/components/share-image-button";
import { shareFileName } from "@shared/share-cards";
import { TemplateTeamShareCard, TEMPLATE_CARD_WIDTH, TEMPLATE_CARD_HEIGHT } from "@/components/template-team-share-card";
import { HeroPanel, HeroStat, SectionCard, SegmentedControl } from "@/components/tool-ui";

type TemplateResponse = TemplateTeam & { group?: TemplateGroup; gameweek: number | null; fetchedAt: string | null };

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
  const [group, setGroup] = useState<TemplateGroup>(() => {
    const g = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("group") : null;
    return g === "creators" ? "creators" : "top100";
  });
  const chooseGroup = (g: TemplateGroup) => {
    setGroup(g);
    // keep the choice in the link so a shared URL opens the same group
    window.history.replaceState(window.history.state, "", g === "top100" ? window.location.pathname : `${window.location.pathname}?group=${g}`);
  };

  const { data, isLoading, error } = useQuery<TemplateResponse>({
    queryKey: ["/api/template-team", group],
    queryFn: async () => {
      const res = await fetch(group === "top100" ? "/api/template-team" : `/api/template-team?group=${group}`);
      if (!res.ok) throw new Error("Failed to load the template team");
      return res.json();
    },
    placeholderData: (prev) => prev,
    staleTime: 5 * 60 * 1000,
  });

  const groupLabel = TEMPLATE_GROUPS[group].label;
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
              The most-owned squad among our{" "}
              {group === "top100" ? <Link href="/top-managers" className="underline">Top 100 managers</Link> : <Link href="/content-creators" className="underline">content creators</Link>}.
            </p>
          </div>
        </div>

        <div className="mb-4">
          <SegmentedControl
            ariaLabel="Group"
            testIdPrefix="group"
            value={group}
            onChange={chooseGroup}
            options={(Object.keys(TEMPLATE_GROUPS) as TemplateGroup[]).map((g) => ({ value: g, label: TEMPLATE_GROUPS[g].label }))}
          />
        </div>

        {error && <Card><CardContent className="p-6">Couldn't load the template team. Please try again shortly.</CardContent></Card>}
        {isLoading && <Card><CardContent className="p-6 text-muted-foreground">Loading…</CardContent></Card>}

        {data && !hasTeam && (
          <Card><CardContent className="p-6 text-muted-foreground">
            Not enough squad data yet ({data.managersCounted} of {data.managersRequested} squads loaded).
          </CardContent></Card>
        )}

        {data && hasTeam && (
          <div className="space-y-5">
            <HeroPanel>
              <div className="grid gap-6 sm:grid-cols-3">
                <HeroStat label={groupLabel} value={data.formation} sub={`Most-owned formation · GW${data.gameweek}`} />
                <HeroStat
                  label="Squads counted"
                  value={<span data-testid="text-sample">{data.managersCounted}<span className="ml-1.5 text-base font-semibold text-white/70">of {data.managersRequested}</span></span>}
                  sub="Squads that returned a full 15"
                />
                <HeroStat label="Squad value" value={`£${data.totalValue.toFixed(1)}m`} sub="At today's prices" />
              </div>
            </HeroPanel>

            <SectionCard
              icon={Shirt}
              title={`Starting XI (${data.formation})`}
              subtitle="The badge under each player is the share of squads holding that player in their 15"
              bodyClassName="p-2 sm:p-4"
              testId="pitch"
              action={
                <ShareImageButton
                  renderCard={() => (
                    <TemplateTeamShareCard
                      gameweek={data.gameweek}
                      formation={data.formation}
                      managersCounted={data.managersCounted}
                      managersRequested={data.managersRequested}
                      totalValue={data.totalValue}
                      startingXI={data.startingXI}
                      bench={data.bench}
                      captain={data.captain}
                      groupLabel={group === "top100" ? undefined : groupLabel}
                    />
                  )}
                  title="Template Team"
                  width={TEMPLATE_CARD_WIDTH}
                  height={TEMPLATE_CARD_HEIGHT}
                  fileName={shareFileName(["template-team", group === "top100" ? "" : group, `gw${data.gameweek ?? ""}`])}
                />
              }
            >
              <PitchView players={pitchPlayers} benchPlayers={benchPlayers} />
            </SectionCard>

            {data.captain && (
              <SectionCard icon={Users} title="Most popular captain" bodyClassName="p-4 sm:p-5">
                <div className="flex items-center gap-4" data-testid="text-captain">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 text-amber-950 shadow">
                    <Crown className="h-6 w-6" />
                  </span>
                  <p className="text-sm text-gray-700">
                    <span className="text-lg font-extrabold text-gray-900">{data.captain.name}</span>, chosen by {data.captain.count} of {data.managersCounted} managers ({data.captain.percent}%).
                  </p>
                </div>
              </SectionCard>
            )}

            <p className="text-xs text-gray-500">
              Percentages show how many of the squads counted hold each player in their 15 (bench included). The
              squad is the most-owned players in each position (2 GKP, 5 DEF, 5 MID, 3 FWD), with no more than 3
              from one club; the XI is the most-owned legal formation from those 15. It is the squads as they stood in
              GW{data.gameweek}
              {group === "top100" ? ", from our fixed Top 100 list, not the current-season Top 100 by rank" : ", from our list of FPL content creators"}.
              Prices are today's.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
