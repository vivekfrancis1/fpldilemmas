import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Target } from "lucide-react";
import { Input } from "@/components/ui/input";
import { InputPanel } from "@/components/tool-ui";
import { extractManagerId } from "@/lib/manager-id-utils";
import { readToolManagerId, saveToolManagerId } from "@/lib/manager-id-storage";
import { placeInGroup, type PlacementMember } from "@shared/group-placement";

/** The user's own team, read from FPL's entry summary (same fields the Top Managers tables show for their managers). */
export interface MyEntry {
  managerId: number;
  name: string;
  teamName: string;
  totalPoints: number;
  gameweekPoints: number;
  overallRank: number | null;
  gameweekRank: number | null;
  currentEvent: number;
  teamValue: number;
  bank: number;
  totalTransfers: number;
}

export function useMyEntry() {
  const [input, setInput] = useState("");
  const [id, setId] = useState("");

  useEffect(() => {
    const saved = readToolManagerId();
    setInput(saved);
    setId(/^\d+$/.test(saved) ? saved : "");
  }, []);

  // look the team up once the ID has stopped changing for a moment
  useEffect(() => {
    const clean = extractManagerId(input).trim();
    if (!/^\d+$/.test(clean)) {
      setId("");
      return;
    }
    const t = setTimeout(() => {
      setId(clean);
      saveToolManagerId(clean);
    }, 500);
    return () => clearTimeout(t);
  }, [input]);

  const query = useQuery<MyEntry | null>({
    queryKey: ["/api/entry", id, "placement"],
    enabled: id !== "",
    retry: false,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const res = await fetch(`/api/entry/${encodeURIComponent(id)}`);
      if (!res.ok) return null;
      const e = await res.json();
      return {
        managerId: Number(e.id),
        name: `${e.player_first_name ?? ""} ${e.player_last_name ?? ""}`.trim() || e.name,
        teamName: e.name,
        totalPoints: Number(e.summary_overall_points) || 0,
        gameweekPoints: Number(e.summary_event_points) || 0,
        overallRank: e.summary_overall_rank ?? null,
        gameweekRank: e.summary_event_rank ?? null,
        currentEvent: Number(e.current_event) || 0,
        teamValue: Number(e.last_deadline_value) || 0,
        bank: Number(e.last_deadline_bank) || 0,
        totalTransfers: Number(e.last_deadline_total_transfers) || 0,
      };
    },
  });

  return {
    input,
    setInput: (v: string) => setInput(extractManagerId(v)),
    entry: id !== "" ? query.data ?? null : null,
    isLoading: id !== "" && query.isFetching,
    notFound: id !== "" && !query.isFetching && query.data === null,
  };
}

export type MyEntryState = ReturnType<typeof useMyEntry>;

/** Adds the user's team to a table's rows unless they are already in it. `toRow` builds the table's own row shape. */
export function withMyTeam<T extends { managerId: number }>(rows: T[], entry: MyEntry | null, toRow: (e: MyEntry) => T): T[] {
  if (!entry || rows.some((r) => r.managerId === entry.managerId)) return rows;
  return [toRow(entry), ...rows];
}

const ordinalRank = (n: number | null) => (n === null ? "n/a" : `#${n.toLocaleString()}`);

function Tile({ label, rank, size, points, testId, detail }: { label: string; rank: number | null; size: number; points: number; testId: string; detail?: string }) {
  return (
    <div className="rounded-xl border border-indigo-200 bg-white/80 px-4 py-3" data-testid={testId}>
      <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-3xl font-extrabold leading-none tabular-nums text-indigo-700" data-testid={`${testId}-rank`}>{ordinalRank(rank)}</span>
        <span className="text-sm font-semibold text-gray-600">of {size.toLocaleString()}</span>
      </div>
      <div className="mt-1 text-xs text-gray-600">{points.toLocaleString()} pts{detail ? ` · ${detail}` : ""}</div>
    </div>
  );
}

/** "Where would my team place?" - team ID box plus the rank of that team by total and gameweek points among `members`. */
export function MyTeamPlacementPanel({
  my,
  members,
  groupLabel,
  note,
}: {
  my: MyEntryState;
  members: PlacementMember[];
  groupLabel: string;
  /** Extra caveat, e.g. a league too big to read in full. */
  note?: string;
}) {
  const placement = useMemo(
    () => (my.entry ? placeInGroup(members, { managerId: my.entry.managerId, totalPoints: my.entry.totalPoints, gameweekPoints: my.entry.gameweekPoints }) : null),
    [my.entry, members],
  );
  const e = my.entry;

  return (
    <InputPanel icon={Target} title="Where does my team place?" subtitle={`Enter your team ID to see your points and rank among ${groupLabel}`}>
      <Input
        value={my.input}
        onChange={(ev) => my.setInput(ev.target.value)}
        placeholder="Your team ID"
        inputMode="numeric"
        className="h-11 max-w-sm rounded-xl text-base"
        data-testid="input-my-team-id"
      />
      {my.isLoading && <p className="text-sm text-gray-500" data-testid="text-my-team-loading">Finding your team…</p>}
      {my.notFound && <p className="text-sm text-red-600" data-testid="text-my-team-notfound">We couldn't find a team with that ID.</p>}
      {e && placement && (
        <div className="space-y-2" data-testid="my-team-placement">
          <p className="text-sm text-gray-700">
            <span className="font-bold">{e.teamName}</span> ({e.name}){" "}
            {placement.isMember ? `is already one of ${groupLabel}.` : `added to ${groupLabel} for comparison.`}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Tile
              label="Total points"
              rank={placement.totalRank}
              size={placement.size}
              points={e.totalPoints}
              testId="placement-total"
              detail={
                placement.totalPointsToNextPlace !== null
                  ? `${placement.totalPointsToNextPlace} behind the place above`
                  : placement.totalPointsAheadOfNext !== null
                    ? `${placement.totalPointsAheadOfNext} clear of the place below`
                    : undefined
              }
            />
            <Tile label={`GW${e.currentEvent || ""} points`} rank={placement.gameweekRank} size={placement.size} points={e.gameweekPoints} testId="placement-gameweek" />
          </div>
          {(placement.missing > 0 || note) && (
            <p className="text-xs text-gray-500" data-testid="text-placement-note">
              {[placement.missing > 0 ? `${placement.missing} manager${placement.missing === 1 ? "" : "s"} left out: their points aren't available yet.` : "", note ?? ""].filter(Boolean).join(" ")}
            </p>
          )}
        </div>
      )}
    </InputPanel>
  );
}

/** A highlighted "You" label for the table's name cell. */
export function YouBadge() {
  return <span className="mr-1.5 rounded-md bg-indigo-600 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-white" data-testid="badge-you">You</span>;
}
