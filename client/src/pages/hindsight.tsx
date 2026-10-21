import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import { extractManagerId } from "@/lib/manager-id-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Pick { id: number; name: string; position: string; points: number; multiplier: number; started: boolean; isCaptain: boolean; inBestXI: boolean }
interface HindsightResponse {
  managerId: number;
  gameweek: number;
  finishedGameweeks: number[];
  chip: string | null;
  officialPoints: number;
  transferCost: number;
  pointsOnBench: number;
  bestPossible: number;
  gap: number;
  formation: string | null;
  captainMultiplier: 2 | 3;
  captain: { chosen: { id: number; name: string; points: number } | null; best: { id: number; name: string; points: number } | null };
  bestXI: Array<{ id: number; name: string; position: string; points: number }>;
  picks: Pick[];
}

const STORAGE_KEY = "fpl-manager-id";
const CHIP_LABEL: Record<string, string> = { bboost: "Bench Boost", "3xc": "Triple Captain", freehit: "Free Hit", wildcard: "Wildcard", manager: "Assistant Manager" };

const readSaved = (): string => {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
};

export default function Hindsight() {
  const [input, setInput] = useState("");
  const [managerId, setManagerId] = useState("");
  const [gameweek, setGameweek] = useState<number | null>(null);

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
    setGameweek(null);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* storage unavailable: still works for this visit */
    }
  };

  const { data, isFetching, error } = useQuery<HindsightResponse>({
    queryKey: ["/api/hindsight", managerId, gameweek],
    enabled: !!managerId,
    retry: false,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const res = await fetch(`/api/hindsight/${encodeURIComponent(managerId)}${gameweek ? `?gw=${gameweek}` : ""}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Something went wrong");
      }
      return res.json();
    },
    staleTime: 10 * 60 * 1000,
  });

  const best = data?.captain.best;
  const chosen = data?.captain.chosen;

  return (
    <div className="min-h-screen">
      <div className="w-full py-4 sm:py-8">
        <div className="fpl-page-header">
          <div className="fpl-page-header-content">
            <div className="fpl-page-title">
              <History />
              <h1 data-testid="text-page-title">Hindsight</h1>
            </div>
            <p className="fpl-page-subtitle">Your points last gameweek versus the best XI you could have fielded from the same 15 players.</p>
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
              <Button onClick={submit} disabled={!input.trim() || isFetching} data-testid="button-show">
                {isFetching ? "Loading…" : "Show hindsight"}
              </Button>
            </div>
            {data && (
              <Select value={String(data.gameweek)} onValueChange={(v) => setGameweek(Number(v))}>
                <SelectTrigger className="w-[150px]" data-testid="select-gameweek"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[...data.finishedGameweeks].reverse().map((gw) => (
                    <SelectItem key={gw} value={String(gw)}>Gameweek {gw}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        {error && <Card><CardContent className="p-6 text-sm" data-testid="text-error">{(error as Error).message}</CardContent></Card>}

        {data && !error && (
          <div className="space-y-4">
            <Card>
              <CardContent className="grid gap-4 p-4 sm:grid-cols-3" data-testid="summary">
                <div>
                  <div className="text-xs text-muted-foreground">You scored (GW{data.gameweek})</div>
                  <div className="text-3xl font-bold" data-testid="text-official">{data.officialPoints}</div>
                  <div className="text-xs text-muted-foreground">
                    {data.transferCost > 0 ? `before a −${data.transferCost} transfer cost` : "no transfer cost"}
                    {data.chip ? ` · ${CHIP_LABEL[data.chip] ?? data.chip}` : ""}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Best possible from your 15</div>
                  <div className="text-3xl font-bold" data-testid="text-best">{data.bestPossible}</div>
                  <div className="text-xs text-muted-foreground">{data.formation ? `${data.formation} formation` : "All 15 count (Bench Boost)"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Difference</div>
                  <div className="text-3xl font-bold" data-testid="text-gap">{data.gap}</div>
                  <div className="text-xs text-muted-foreground">{data.pointsOnBench} points were on your bench</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Captain</CardTitle></CardHeader>
              <CardContent className="text-sm" data-testid="captain">
                You chose <span className="font-semibold">{chosen?.name ?? "—"}</span> ({chosen?.points ?? 0} pts). The highest scorer in your squad was{" "}
                <span className="font-semibold">{best?.name ?? "—"}</span> ({best?.points ?? 0} pts)
                {chosen && best && chosen.id === best.id ? ", so that was the best captain available." : "."}
                {data.captainMultiplier === 3 && " Triple Captain: the captain counts three times."}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Your 15 players</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full min-w-[420px] text-sm" data-testid="table-picks">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="p-2 text-left font-medium">Player</th>
                      <th className="p-2 text-right font-medium">Points</th>
                      <th className="p-2 text-center font-medium">Picked to start</th>
                      <th className="p-2 text-center font-medium">In best XI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...data.picks].sort((a, b) => b.points - a.points).map((p) => (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="p-2">
                          <span className="font-medium">{p.name}</span>{" "}
                          <span className="text-xs text-muted-foreground">{p.position}</span>
                          {p.isCaptain && <span className="ml-1 rounded bg-gray-900 px-1 text-[9px] text-white">C</span>}
                        </td>
                        <td className="p-2 text-right font-semibold">{p.points}</td>
                        <td className="p-2 text-center">{p.started ? "Yes" : "Bench"}</td>
                        <td className="p-2 text-center">{p.inBestXI ? "Yes" : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground">
              "Best possible" uses each player's final points from the same 15 and the best legal formation, with the best captain counted
              {data.captainMultiplier === 3 ? " three times" : " twice"}. It ignores auto-subs (your official score includes them) and
              describes what was available in hindsight, not what could have been known. "Picked to start" is your original XI.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
