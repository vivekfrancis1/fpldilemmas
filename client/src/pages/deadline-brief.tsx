import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { AlarmClock } from "lucide-react";
import type { DeadlineBrief, BriefPlayer, PriceRow } from "@shared/deadline-brief";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlayerAvailabilityBadge } from "@/components/player-availability-badge";

function countdown(deadlineIso: string, now: number): string {
  const ms = new Date(deadlineIso).getTime() - now;
  if (ms <= 0) return "Deadline passed";
  const mins = Math.floor(ms / 60000);
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  return d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`;
}

function PlayerRow({ p }: { p: BriefPlayer }) {
  return (
    <tr className="border-t" data-testid={`row-player-${p.playerId}`}>
      <td className="py-1.5">
        <span className="font-medium">{p.name}</span>{" "}
        <span className="text-xs text-muted-foreground">{p.teamShort} · {p.position}</span>
        <PlayerAvailabilityBadge
          player={{ status: p.status, chanceOfPlayingNextRound: p.chanceOfPlayingNextRound, news: p.news }}
          compact
        />
      </td>
      <td className="py-1.5 text-right">{p.xPts.toFixed(1)}</td>
      <td className="py-1.5 text-right font-semibold">{p.captainPoints.toFixed(1)}</td>
    </tr>
  );
}

function PriceList({ title, rows }: { title: string; rows: PriceRow[] }) {
  return (
    <div>
      <h3 className="mb-1 text-sm font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">None predicted.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {rows.map((r) => (
            <li key={r.playerId} className="flex flex-wrap items-baseline gap-x-2" data-testid={`price-${r.playerId}`}>
              <span className="font-medium">{r.name}</span>
              <span className="text-xs text-muted-foreground">{r.teamShort} · £{(r.currentPrice / 10).toFixed(1)}m · {r.ownership}% owned</span>
              <span className="ml-auto text-xs">{r.status}{r.calibrating ? " (calibrating)" : ""}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function DeadlineBriefPage() {
  const { data, isLoading, error } = useQuery<DeadlineBrief>({
    queryKey: ["/api/deadline-brief"],
    staleTime: 5 * 60 * 1000,
  });
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen">
      <div className="w-full py-4 sm:py-8">
        <div className="fpl-page-header">
          <div className="fpl-page-header-content">
            <div className="fpl-page-title">
              <AlarmClock />
              <h1 data-testid="text-page-title">Pre-deadline Brief{data ? ` - GW${data.gameweek}` : ""}</h1>
            </div>
            <p className="fpl-page-subtitle">Everything worth checking before the deadline, from official FPL data and our projections.</p>
          </div>
        </div>

        {error && <Card><CardContent className="p-6">Couldn't load the brief. Please try again shortly.</CardContent></Card>}
        {isLoading && <Card><CardContent className="p-6 text-muted-foreground">Loading…</CardContent></Card>}

        {data && (
          <div className="space-y-4">
            <Card>
              <CardContent className="flex flex-wrap items-center justify-between gap-2 p-4" data-testid="deadline">
                <div>
                  <div className="text-xs text-muted-foreground">Gameweek {data.gameweek} deadline</div>
                  <div className="font-semibold">{new Date(data.deadlineTime).toLocaleString(undefined, { weekday: "long", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                </div>
                <div className="text-2xl font-bold" data-testid="text-countdown">{countdown(data.deadlineTime, now)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Top captain options</CardTitle></CardHeader>
              <CardContent>
                {!data.projectionsAvailable ? (
                  <p className="text-sm text-muted-foreground">Projections for this gameweek aren't available yet.</p>
                ) : (
                  <table className="w-full text-sm" data-testid="table-captains">
                    <thead>
                      <tr className="text-xs text-muted-foreground">
                        <th className="py-1 text-left font-medium">Player</th>
                        <th className="py-1 text-right font-medium">xPts</th>
                        <th className="py-1 text-right font-medium">Captain</th>
                      </tr>
                    </thead>
                    <tbody>{data.captains.map((p) => <PlayerRow key={p.playerId} p={p} />)}</tbody>
                  </table>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  Captain points are 2 × our expected points. <Link href="/captaincy-matrix" className="underline">See every team's options</Link>.
                </p>
              </CardContent>
            </Card>

            {data.projectionsAvailable && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Best picks by position</CardTitle></CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2" data-testid="by-position">
                  {(["GKP", "DEF", "MID", "FWD"] as const).map((pos) => (
                    <div key={pos}>
                      <h3 className="mb-1 text-sm font-semibold">{pos}</h3>
                      <table className="w-full text-sm">
                        <tbody>{data.byPosition[pos].map((p) => <PlayerRow key={p.playerId} p={p} />)}</tbody>
                      </table>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Availability watch</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm" data-testid="availability">
                {data.availability.length === 0 ? (
                  <p className="text-muted-foreground">No injury or suspension flags among players owned by 10% or more.</p>
                ) : (
                  data.availability.map((a) => (
                    <div key={a.playerId} className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{a.name}</span>
                      <span className="text-xs text-muted-foreground">{a.teamShort} · {a.ownership}% owned</span>
                      <PlayerAvailabilityBadge player={{ status: a.status, chanceOfPlayingNextRound: a.chanceOfPlayingNextRound, news: a.news }} />
                      {a.news && <span className="text-xs text-muted-foreground">{a.news}</span>}
                    </div>
                  ))
                )}
                <p className="text-xs text-muted-foreground">FPL's own status and news. It can change before the deadline.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Price-change watch</CardTitle></CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2" data-testid="price-watch">
                <PriceList title="May rise" rows={data.priceWatch.risers} />
                <PriceList title="May fall" rows={data.priceWatch.fallers} />
                <p className="text-xs text-muted-foreground sm:col-span-2">
                  These are predictions from transfer momentum, not certainties. Full list on the <Link href="/price-changes" className="underline">Price Changes</Link> page.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Double and blank gameweeks</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm" data-testid="dgw-bgw">
                <div>
                  <span className="font-medium">Double: </span>
                  {data.doubles.length ? data.doubles.map((t) => t.name).join(", ") : <span className="text-muted-foreground">none</span>}
                </div>
                <div>
                  <span className="font-medium">Blank: </span>
                  {data.blanks.length ? data.blanks.map((t) => t.name).join(", ") : <span className="text-muted-foreground">none</span>}
                </div>
              </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground">
              More: <Link href="/template-team" className="underline">Template Team</Link> · <Link href="/fixtures" className="underline">Fixture Analyzer</Link> · <Link href="/rate-my-team" className="underline">Rate My Team</Link>.
              Expected points are model estimates, not guarantees.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
