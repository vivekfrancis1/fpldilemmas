import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Search, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputPanel, SectionCard, SegmentedControl } from "@/components/tool-ui";
import { MyTeamPlacementPanel, YouBadge, useMyEntry } from "@/components/my-team-placement";
import type { LeagueRow } from "@shared/group-placement";

type LeagueResponse = { league: { id: number; name: string }; capped: boolean; rows: LeagueRow[] };
type SortBy = "total" | "gameweek";
type Row = LeagueRow & { place: number; isMe: boolean; isAdded: boolean };

const LEAGUE_KEY = "fpl-league-rank-league-id";
const read = (): string => {
  try {
    return localStorage.getItem(LEAGUE_KEY) ?? "";
  } catch {
    return "";
  }
};
const write = (v: string) => {
  try {
    localStorage.setItem(LEAGUE_KEY, v);
  } catch {
    /* storage unavailable: still works for this visit */
  }
};

const GROUP_LINKS = [
  { href: "/top-managers", label: "All time Top 100" },
  { href: "/elite-64", label: "Elite 64" },
  { href: "/analytics-elite-64", label: "Analytics Elite 64" },
  { href: "/content-creators", label: "Content creators" },
];

export default function LeagueRankPage() {
  const [, navigate] = useLocation();
  const [leagueInput, setLeagueInput] = useState("");
  const [leagueId, setLeagueId] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("total");
  const my = useMyEntry();

  useEffect(() => {
    const fromLink = new URLSearchParams(window.location.search).get("league") ?? "";
    const start = /^\d+$/.test(fromLink) ? fromLink : read();
    setLeagueInput(start);
    setLeagueId(start);
  }, []);

  const show = () => {
    const v = leagueInput.trim();
    if (!/^\d+$/.test(v)) return;
    setLeagueId(v);
    write(v);
    // keep the league in the link so a shared URL opens the same league
    window.history.replaceState(window.history.state, "", `${window.location.pathname}?league=${v}`);
  };

  const { data, isFetching, error } = useQuery<LeagueResponse>({
    queryKey: ["/api/league-standings", leagueId],
    enabled: /^\d+$/.test(leagueId),
    retry: false,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const res = await fetch(`/api/league-standings/${encodeURIComponent(leagueId)}`);
      if (res.status === 404) throw new Error("We couldn't find a classic league with that ID.");
      if (!res.ok) throw new Error("Couldn't load that league from FPL. Please try again shortly.");
      return res.json();
    },
  });

  const members = useMemo(() => (data?.rows ?? []).map((r) => ({ managerId: r.managerId, totalPoints: r.totalPoints, gameweekPoints: r.gameweekPoints })), [data]);

  // League rows plus your team (when not already in it), ordered by the chosen measure; ties share a place
  const rows: Row[] = useMemo(() => {
    if (!data) return [];
    const me = my.entry;
    const all: Array<LeagueRow & { isMe: boolean; isAdded: boolean }> = data.rows.map((r) => ({ ...r, isMe: r.managerId === me?.managerId, isAdded: false }));
    if (me && !all.some((r) => r.managerId === me.managerId)) {
      all.push({ rank: 0, managerId: me.managerId, name: me.name, teamName: me.teamName, totalPoints: me.totalPoints, gameweekPoints: me.gameweekPoints, isMe: true, isAdded: true });
    }
    const value = (r: LeagueRow) => (sortBy === "total" ? r.totalPoints : r.gameweekPoints);
    all.sort((a, b) => value(b) - value(a) || b.totalPoints - a.totalPoints);
    return all.map((r) => ({ ...r, place: 1 + all.filter((o) => value(o) > value(r)).length }));
  }, [data, my.entry, sortBy]);

  const myIndex = rows.findIndex((r) => r.isMe);

  return (
    <div className="min-h-screen">
      <div className="w-full py-4 sm:py-8">
        <div className="fpl-page-header">
          <div className="fpl-page-header-content">
            <div className="fpl-page-title">
              <Trophy />
              <h1 data-testid="text-page-title">League Rank</h1>
            </div>
            <p className="fpl-page-subtitle">Your points and rank against any classic league, whether or not you are in it.</p>
          </div>
        </div>

        <InputPanel icon={Search} title="Pick a league" subtitle="The classic league ID is in the league page's web address">
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              value={leagueInput}
              onChange={(e) => setLeagueInput(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && show()}
              placeholder="Classic league ID"
              inputMode="numeric"
              className="h-11 rounded-xl text-base"
              data-testid="input-league-id"
            />
            <Button
              onClick={show}
              disabled={!/^\d+$/.test(leagueInput.trim())}
              className="h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 font-bold text-white hover:from-indigo-500 hover:to-violet-500"
              data-testid="button-load"
            >
              Show league
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Or compare against:{" "}
            {GROUP_LINKS.map((g, i) => (
              <span key={g.href}>
                {i > 0 && " · "}
                <Link href={g.href} className="underline">{g.label}</Link>
              </span>
            ))}
          </p>
        </InputPanel>

        {error && <p className="mb-4 text-sm text-red-600" data-testid="text-league-error">{(error as Error).message}</p>}
        {isFetching && !data && <p className="mb-4 text-sm text-gray-500" data-testid="text-league-loading">Loading the league…</p>}

        {data && (
          <div className="space-y-4">
            <MyTeamPlacementPanel
              my={my}
              members={members}
              groupLabel={data.league.name || "this league"}
              note={data.capped ? `This league is too big to read in full, so you are ranked against its top ${data.rows.length.toLocaleString()} managers.` : undefined}
            />

            <SectionCard
              icon={Trophy}
              title={data.league.name || `League ${data.league.id}`}
              subtitle={`${data.rows.length.toLocaleString()} managers${data.capped ? " (top of a larger league)" : ""}${myIndex >= 0 ? ` · you are ${rows[myIndex].isAdded ? "added at" : "at"} #${rows[myIndex].place}` : ""}`}
              action={
                <SegmentedControl
                  ariaLabel="Rank by"
                  testIdPrefix="sort"
                  value={sortBy}
                  onChange={setSortBy}
                  options={[{ value: "total", label: "Total points" }, { value: "gameweek", label: "Gameweek points" }]}
                />
              }
              bodyClassName="p-0"
              testId="league-table"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50/80 text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="px-3 py-2 w-12">#</th>
                      <th className="px-3 py-2">Manager</th>
                      <th className="px-3 py-2 text-right">GW pts</th>
                      <th className="px-3 py-2 text-right">Total pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr
                        key={r.managerId}
                        onClick={() => navigate(`/manager-team/${r.managerId}`)}
                        className={`cursor-pointer border-b hover:bg-gray-50 ${r.isMe ? "bg-indigo-50 hover:bg-indigo-100" : ""}`}
                        data-testid={r.isMe ? "row-me" : `row-league-${r.managerId}`}
                      >
                        <td className="px-3 py-2 font-semibold tabular-nums">{r.place}</td>
                        <td className="px-3 py-2">
                          <div className="font-medium">{r.isMe && <YouBadge />}{r.name}</div>
                          <div className="text-xs text-gray-500">{r.teamName}</div>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{r.gameweekPoints}</td>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums">{r.totalPoints.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>
        )}
      </div>
    </div>
  );
}
