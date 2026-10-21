import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClipboardCheck, ArrowRight } from "lucide-react";
import { extractManagerId } from "@/lib/manager-id-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlayerAvailabilityBadge } from "@/components/player-availability-badge";

interface RmtResponse {
  managerId: number;
  resolvedGameweek: number | null;
  activeChip: string | null;
  gameweeks: number[];
  projectedTotal: number;
  benchTotal: number;
  perGameweek: Array<{ gameweek: number; total: number; captainName: string | null; benchTotal: number }>;
  rank: { rank: number | null; fieldSize: number; average: number | null; best: number | null };
  upgrades: Array<{
    outId: number; inId: number; outName: string; inName: string; outTeam: string; inTeam: string;
    gain: number; priceDelta: number; inPrice: number; outHorizonXPts: number; inHorizonXPts: number;
  }>;
  flags: {
    availability: Array<{ playerId: number; name: string; status: string; chanceOfPlayingNextRound: number | null; news: string }>;
    blanks: Array<{ playerId: number; name: string; gameweeks: number[] }>;
    doubles: Array<{ playerId: number; name: string; gameweeks: number[] }>;
  };
  bank: number;
  sellingPricesApproximate: boolean;
}

const HORIZONS = [1, 3, 5, 8];
const STORAGE_KEY = "fpl-manager-id";

const readSaved = (): string => {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
};

const money = (tenths: number) => `£${(tenths / 10).toFixed(1)}m`;
const signedMoney = (tenths: number) => `${tenths > 0 ? "+" : tenths < 0 ? "-" : ""}£${Math.abs(tenths / 10).toFixed(1)}m`;

export default function RateMyTeam() {
  const [input, setInput] = useState("");
  const [managerId, setManagerId] = useState("");
  const [horizon, setHorizon] = useState(5);

  useEffect(() => {
    const saved = readSaved();
    if (saved) {
      setInput(saved);
      setManagerId(saved);
    }
  }, []);

  const submit = () => {
    const id = extractManagerId(input).trim();
    if (!id) return;
    setManagerId(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* storage unavailable: still works for this visit */
    }
  };

  const { data, isFetching, error } = useQuery<RmtResponse>({
    queryKey: ["/api/rate-my-team", managerId, horizon],
    enabled: !!managerId,
    retry: false,
    queryFn: async () => {
      const res = await fetch(`/api/rate-my-team/${encodeURIComponent(managerId)}?horizon=${horizon}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Something went wrong");
      }
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const gwLabel = data ? `GW${data.gameweeks[0]}${data.gameweeks.length > 1 ? `-${data.gameweeks[data.gameweeks.length - 1]}` : ""}` : "";

  return (
    <div className="min-h-screen">
      <div className="w-full py-4 sm:py-8">
        <div className="fpl-page-header">
          <div className="fpl-page-header-content">
            <div className="fpl-page-title">
              <ClipboardCheck />
              <h1 data-testid="text-page-title">Rate My Team</h1>
            </div>
            <p className="fpl-page-subtitle">
              Your squad's projected points, how it compares with the Top 100 managers, and the best single upgrades.
            </p>
          </div>
        </div>

        <Card className="mb-4">
          <CardContent className="space-y-3 p-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={input}
                onChange={(e) => setInput(extractManagerId(e.target.value))}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="Paste your FPL team ID or entry link"
                className="flex-1 text-base"
                data-testid="input-manager-id"
              />
              <Button onClick={submit} disabled={!input.trim() || isFetching} data-testid="button-rate">
                {isFetching ? "Rating…" : "Rate my team"}
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">Look ahead:</span>
              <div className="inline-flex rounded-lg border border-gray-200 bg-gray-100 p-0.5" role="group" aria-label="Horizon">
                {HORIZONS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHorizon(h)}
                    aria-pressed={horizon === h}
                    data-testid={`horizon-${h}`}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium ${horizon === h ? "bg-white text-blue-700 shadow-sm" : "text-gray-600"}`}
                  >
                    {h} GW{h > 1 ? "s" : ""}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Card><CardContent className="p-6 text-sm" data-testid="text-error">{(error as Error).message}</CardContent></Card>
        )}

        {data && (
          <div className="space-y-4">
            <Card>
              <CardContent className="grid gap-4 p-4 sm:grid-cols-3" data-testid="summary">
                <div>
                  <div className="text-xs text-muted-foreground">Projected points, {gwLabel}</div>
                  <div className="text-3xl font-bold" data-testid="text-projected-total">{data.projectedTotal.toFixed(1)}</div>
                  <div className="text-xs text-muted-foreground">Best XI + captain each gameweek</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Rank among the Top 100 squads</div>
                  {data.rank.rank === null ? (
                    <div className="text-sm">No Top 100 squads loaded right now.</div>
                  ) : (
                    <>
                      <div className="text-3xl font-bold" data-testid="text-rank">
                        {data.rank.rank}
                        <span className="text-base font-normal text-muted-foreground"> of {data.rank.fieldSize}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Top 100 average {data.rank.average?.toFixed(1)} · highest {data.rank.best?.toFixed(1)}
                      </div>
                    </>
                  )}
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Bench, {gwLabel}</div>
                  <div className="text-3xl font-bold">{data.benchTotal.toFixed(1)}</div>
                  <div className="text-xs text-muted-foreground">Projected points sitting on your bench</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Gameweek by gameweek</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full min-w-[360px] text-sm" data-testid="table-gameweeks">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="p-2 text-left font-medium">GW</th>
                      <th className="p-2 text-right font-medium">Projected</th>
                      <th className="p-2 text-left font-medium">Captain</th>
                      <th className="p-2 text-right font-medium">Bench</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.perGameweek.map((g) => (
                      <tr key={g.gameweek} className="border-b last:border-0">
                        <td className="p-2 font-medium">GW{g.gameweek}</td>
                        <td className="p-2 text-right font-semibold">{g.total.toFixed(1)}</td>
                        <td className="p-2">{g.captainName ?? "—"}</td>
                        <td className="p-2 text-right text-muted-foreground">{g.benchTotal.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Best single upgrades</CardTitle></CardHeader>
              <CardContent>
                {data.upgrades.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No affordable single swap improves your projected points over {gwLabel}.
                  </p>
                ) : (
                  <ul className="space-y-2" data-testid="list-upgrades">
                    {data.upgrades.map((u) => (
                      <li key={u.outId} className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border p-2 text-sm">
                        <span className="font-medium">{u.outName}</span>
                        <span className="text-xs text-muted-foreground">{u.outTeam}</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{u.inName}</span>
                        <span className="text-xs text-muted-foreground">{u.inTeam} · {money(u.inPrice)}</span>
                        <span className="ml-auto font-semibold text-primary">+{u.gain.toFixed(1)} pts</span>
                        <span className="w-full text-xs text-muted-foreground">
                          Player xPts {u.outHorizonXPts.toFixed(1)} → {u.inHorizonXPts.toFixed(1)} · cost {signedMoney(u.priceDelta)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-3 text-xs text-muted-foreground">
                  Each row is an alternative, not an add-on: the gain is your squad's projected total with only that
                  one swap. Transfer cost (a free transfer or −4 points) is not included.
                  {data.sellingPricesApproximate && " Selling prices are approximate: we use current prices, so what you'd actually receive can differ."}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Things to check</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm" data-testid="flags">
                {data.flags.availability.length === 0 && data.flags.blanks.length === 0 && data.flags.doubles.length === 0 && (
                  <p className="text-muted-foreground">No injury flags, blank or double gameweeks in your squad over {gwLabel}.</p>
                )}
                {data.flags.availability.map((a) => (
                  <div key={a.playerId} className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{a.name}</span>
                    <PlayerAvailabilityBadge player={{ status: a.status, chanceOfPlayingNextRound: a.chanceOfPlayingNextRound, news: a.news }} />
                    {a.news && <span className="text-xs text-muted-foreground">{a.news}</span>}
                  </div>
                ))}
                {data.flags.blanks.map((b) => (
                  <div key={`b${b.playerId}`}>
                    <span className="font-medium">{b.name}</span>: no fixture in {b.gameweeks.map((g) => `GW${g}`).join(", ")}
                  </div>
                ))}
                {data.flags.doubles.map((d) => (
                  <div key={`d${d.playerId}`}>
                    <span className="font-medium">{d.name}</span>: double gameweek in {d.gameweeks.map((g) => `GW${g}`).join(", ")}
                  </div>
                ))}
              </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground">
              Squad as at GW{data.resolvedGameweek}
              {data.activeChip ? ` (${data.activeChip} was active; chips are not modelled)` : ""}. Projections are our
              model's estimates, not guarantees, and are the same ones shown on the Points page. The Top 100 squads are
              from our fixed all-time list, as at the last completed gameweek, scored with the same method.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
