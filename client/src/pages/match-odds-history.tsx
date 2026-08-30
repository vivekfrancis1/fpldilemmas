import { useMemo } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, TrendingUp, Loader2, AlertTriangle } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface OddsSnapshotPoint {
  snapshotAt: string;
  bookmakerCount: number;
  homeWinProb: number | null;
  drawProb: number | null;
  awayWinProb: number | null;
  over25Prob: number | null;
  expectedHomeGoals: number | null;
  expectedAwayGoals: number | null;
}

interface FixtureOddsHistory {
  oddsApiEventId: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  snapshots: OddsSnapshotPoint[];
}

export default function MatchOddsHistory() {
  const { eventId } = useParams<{ eventId: string }>();

  const { data, isLoading, error } = useQuery<FixtureOddsHistory>({
    queryKey: [`/api/fixture-odds-history/${eventId}`],
    enabled: !!eventId,
  });

  const chartData = useMemo(() => {
    if (!data?.snapshots) return [];
    return data.snapshots.map((s) => ({
      ...s,
      label: new Date(s.snapshotAt).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
    }));
  }, [data]);

  // Indices worth labeling with their actual value on the chart, rather than leaving every
  // point as a bare dot: the first and last snapshots (where the line started/currently stands)
  // and the lowest/highest points reached (how far the market swung), per series independently
  // since home and away xG don't necessarily peak at the same snapshot.
  const getHighlightIndices = (key: "expectedHomeGoals" | "expectedAwayGoals"): Set<number> => {
    const indices = new Set<number>();
    const values = chartData
      .map((d, i) => ({ v: d[key], i }))
      .filter((d): d is { v: number; i: number } => d.v !== null && d.v !== undefined);
    if (values.length === 0) return indices;
    indices.add(values[0].i);
    indices.add(values[values.length - 1].i);
    let minEntry = values[0];
    let maxEntry = values[0];
    for (const entry of values) {
      if (entry.v < minEntry.v) minEntry = entry;
      if (entry.v > maxEntry.v) maxEntry = entry;
    }
    indices.add(minEntry.i);
    indices.add(maxEntry.i);
    return indices;
  };

  const renderAnnotatedDot = (color: string, highlightIndices: Set<number>, labelAbove: boolean) => (props: any) => {
    const { cx, cy, index, value } = props;
    if (value === null || value === undefined) return <g key={`dot-${index}`} />;
    if (!highlightIndices.has(index)) {
      return <circle key={`dot-${index}`} cx={cx} cy={cy} r={3} fill={color} stroke={color} />;
    }
    return (
      <g key={`dot-${index}`}>
        <circle cx={cx} cy={cy} r={4.5} fill={color} stroke="#fff" strokeWidth={1.5} />
        <text
          x={cx}
          y={labelAbove ? cy - 10 : cy + 18}
          textAnchor="middle"
          fontSize={11}
          fontWeight={600}
          fill={color}
        >
          {value.toFixed(2)}
        </text>
      </g>
    );
  };

  // Viewer's own local time zone abbreviation (e.g. "IST", "GMT+1", "PDT") — whatever the
  // browser's own Intl data resolves to for their device, not a hardcoded zone.
  const commenceDate = data?.commenceTime ? new Date(data.commenceTime) : null;
  const commenceTimeLabel = commenceDate
    ? commenceDate.toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;
  const commenceTimeZoneAbbr = commenceDate
    ? new Intl.DateTimeFormat([], { timeZoneName: "short" })
        .formatToParts(commenceDate)
        .find((part) => part.type === "timeZoneName")?.value || ""
    : "";

  return (
    <div className="fpl-page-container">
      <div className="fpl-page-header">
        <div className="fpl-page-header-content">
          <div className="fpl-page-title">
            <TrendingUp className="h-8 w-8" />
            <h1>Odds Over Time</h1>
          </div>
          <p className="fpl-page-subtitle">
            How the consensus betting-market projection for this fixture has moved since it was first tracked
          </p>
        </div>
      </div>

      <div className="mb-4">
        <Link href="/projected-goals-cs">
          <Button variant="outline" size="sm" className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            Back to Match Predictions
          </Button>
        </Link>
      </div>

      {isLoading && (
        <Card>
          <CardContent className="py-10 flex items-center justify-center gap-2 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading odds history...
          </CardContent>
        </Card>
      )}

      {!isLoading && (error || !data) && (
        <Card>
          <CardContent className="py-10 flex flex-col items-center justify-center gap-2 text-gray-500 text-center">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            <p className="font-medium">No odds history found for this fixture yet.</p>
            <p className="text-sm">
              Betting markets are usually only posted 5–7 days before kickoff, and history only starts
              accumulating once the first refresh runs after that.
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && data && (
        <>
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="flex items-center justify-between flex-wrap gap-2">
                <span>{data.homeTeam} vs {data.awayTeam}</span>
                {commenceTimeLabel && (
                  <span className="text-sm font-normal text-gray-500">Kickoff: {commenceTimeLabel} {commenceTimeZoneAbbr}</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length < 2 ? (
                <p className="text-sm text-gray-500 py-6 text-center">
                  Only {chartData.length} snapshot{chartData.length === 1 ? "" : "s"} collected so far —
                  check back after a few more refreshes (every 4 hours) to see the trend.
                </p>
              ) : (
                <div className="h-72 sm:h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={24} />
                      <YAxis tick={{ fontSize: 11 }} domain={[0, "auto"]} />
                      <Tooltip
                        formatter={(value: number, name: string) => [value?.toFixed(2), name]}
                        labelFormatter={(label) => `Snapshot: ${label}`}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="expectedHomeGoals"
                        name={`${data.homeTeam} (xG)`}
                        stroke="#059669"
                        strokeWidth={2}
                        dot={renderAnnotatedDot("#059669", getHighlightIndices("expectedHomeGoals"), true)}
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        dataKey="expectedAwayGoals"
                        name={`${data.awayTeam} (xG)`}
                        stroke="#2563eb"
                        strokeWidth={2}
                        dot={renderAnnotatedDot("#2563eb", getHighlightIndices("expectedAwayGoals"), false)}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Snapshot Detail</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase">
                      <th className="px-3 py-2">Snapshot</th>
                      <th className="px-3 py-2 text-center">Books</th>
                      <th className="px-3 py-2 text-center">Home Win%</th>
                      <th className="px-3 py-2 text-center">Draw%</th>
                      <th className="px-3 py-2 text-center">Away Win%</th>
                      <th className="px-3 py-2 text-center">{data.homeTeam} xG</th>
                      <th className="px-3 py-2 text-center">{data.awayTeam} xG</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...chartData].reverse().map((s, i) => (
                      <tr key={i} className="border-b border-gray-100 last:border-0">
                        <td className="px-3 py-2 whitespace-nowrap">{s.label}</td>
                        <td className="px-3 py-2 text-center">{s.bookmakerCount}</td>
                        <td className="px-3 py-2 text-center">{s.homeWinProb !== null ? `${Math.round(s.homeWinProb * 100)}%` : '-'}</td>
                        <td className="px-3 py-2 text-center">{s.drawProb !== null ? `${Math.round(s.drawProb * 100)}%` : '-'}</td>
                        <td className="px-3 py-2 text-center">{s.awayWinProb !== null ? `${Math.round(s.awayWinProb * 100)}%` : '-'}</td>
                        <td className="px-3 py-2 text-center font-medium text-emerald-700">{s.expectedHomeGoals !== null ? s.expectedHomeGoals.toFixed(2) : '-'}</td>
                        <td className="px-3 py-2 text-center font-medium text-blue-700">{s.expectedAwayGoals !== null ? s.expectedAwayGoals.toFixed(2) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
