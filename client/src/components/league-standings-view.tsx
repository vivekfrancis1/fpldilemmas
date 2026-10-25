import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Trophy } from "lucide-react";
import { SectionCard, SegmentedControl } from "@/components/tool-ui";
import { PlacementResults, YouBadge, useEntryById } from "@/components/my-team-placement";
import type { LeagueRow } from "@shared/group-placement";

type LeagueResponse = { league: { id: number; name: string }; capped: boolean; rows: LeagueRow[] };
type SortBy = "total" | "gameweek";
type Row = LeagueRow & { place: number; isMe: boolean; isAdded: boolean };

/** A classic league's table, with where `managerId`'s team places in it (added to the table when it is not a member). */
export default function LeagueStandingsView({ leagueId, managerId }: { leagueId: string; managerId: string }) {
  const [, navigate] = useLocation();
  const [sortBy, setSortBy] = useState<SortBy>("total");
  const me = useEntryById(managerId);

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
    const all: Array<LeagueRow & { isMe: boolean; isAdded: boolean }> = data.rows.map((r) => ({ ...r, isMe: r.managerId === me?.managerId, isAdded: false }));
    if (me && !all.some((r) => r.managerId === me.managerId)) {
      all.push({ rank: 0, managerId: me.managerId, name: me.name, teamName: me.teamName, totalPoints: me.totalPoints, gameweekPoints: me.gameweekPoints, isMe: true, isAdded: true });
    }
    const value = (r: LeagueRow) => (sortBy === "total" ? r.totalPoints : r.gameweekPoints);
    all.sort((a, b) => value(b) - value(a) || b.totalPoints - a.totalPoints);
    return all.map((r) => ({ ...r, place: 1 + all.filter((o) => value(o) > value(r)).length }));
  }, [data, me, sortBy]);

  const myIndex = rows.findIndex((r) => r.isMe);

  if (error) return <p className="mb-4 text-sm text-red-600" data-testid="text-league-error">{(error as Error).message}</p>;
  if (isFetching && !data) return <p className="mb-4 text-sm text-gray-500" data-testid="text-league-loading">Loading the league…</p>;
  if (!data) return null;

  return (
    <div className="mb-5 space-y-4" data-testid="league-standings-view">
      {me && (
        <PlacementResults
          entry={me}
          members={members}
          groupLabel={data.league.name || "this league"}
          note={data.capped ? `This league is too big to read in full, so you are ranked against its top ${data.rows.length.toLocaleString()} managers.` : undefined}
        />
      )}

      <SectionCard
        icon={Trophy}
        title={`${data.league.name || `League ${data.league.id}`} standings`}
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
        <div className="max-h-[28rem] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="w-12 px-3 py-2">#</th>
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
  );
}
