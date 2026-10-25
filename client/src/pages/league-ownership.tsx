import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Users } from "lucide-react";
import { extractManagerId } from "@/lib/manager-id-utils";
import { readToolManagerId, saveToolManagerId } from "@/lib/manager-id-storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import LeagueOwnershipView from "@/components/league-ownership-view";
import { InputPanel } from "@/components/tool-ui";

type ClassicLeague = { id: number; name: string; league_type?: string };

const LEAGUE_KEY = "fpl-league-id";
const read = (k: string) => {
  try {
    return localStorage.getItem(k) ?? "";
  } catch {
    return "";
  }
};
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* storage unavailable: still works for this visit */
  }
};

export default function LeagueOwnershipPage() {
  const [managerInput, setManagerInput] = useState("");
  const [lookupId, setLookupId] = useState("");
  const [selectedLeague, setSelectedLeague] = useState("");
  const [customMode, setCustomMode] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [query, setQuery] = useState<{ league: string; manager: string } | null>(null);
  const restored = useRef(false);

  const load = (league: string, manager: string) => {
    write(LEAGUE_KEY, league);
    if (manager) saveToolManagerId(manager);
    setSelectedLeague(league);
    setQuery({ league, manager });
  };

  useEffect(() => {
    const league = read(LEAGUE_KEY);
    const manager = readToolManagerId();
    setManagerInput(manager);
    setLookupId(manager);
    setSelectedLeague(league);
    if (league) setQuery({ league, manager });
    else restored.current = true;
  }, []);

  // Look the leagues up once the team ID has stopped changing for a moment
  useEffect(() => {
    const id = extractManagerId(managerInput).trim();
    if (!/^\d+$/.test(id)) return;
    const t = setTimeout(() => setLookupId(id), 500);
    return () => clearTimeout(t);
  }, [managerInput]);

  const { data: leagueList, isFetching: leaguesLoading } = useQuery<ClassicLeague[] | null>({
    queryKey: ["/api/manager", lookupId, "leagues"],
    enabled: /^\d+$/.test(lookupId),
    retry: false,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const res = await fetch(`/api/manager/${encodeURIComponent(lookupId)}/leagues`);
      if (!res.ok) return null;
      const body = await res.json().catch(() => null);
      return Array.isArray(body?.classic) ? body.classic : null;
    },
  });

  // Only the manager's private (invitational) leagues; system leagues (Overall, country, club fans) are left out
  const leagues = useMemo(
    () => (leagueList ?? []).filter((l) => l.league_type === "x").sort((a, b) => a.name.localeCompare(b.name)),
    [leagueList],
  );

  // On the first lookup after a reload, a saved league the manager is not a member of goes into the "another league" box
  useEffect(() => {
    if (!leagueList || restored.current) return;
    restored.current = true;
    if (selectedLeague && !leagues.some((l) => String(l.id) === selectedLeague)) {
      setCustomMode(true);
      setCustomInput(selectedLeague);
    }
  }, [leagueList, selectedLeague]);

  const manager = () => extractManagerId(managerInput).trim();
  const chooseLeague = (v: string) => {
    if (v === "other") {
      setCustomMode(true);
      return;
    }
    setCustomMode(false);
    load(v, manager());
  };
  const loadCustom = () => {
    const league = customInput.trim();
    if (/^\d+$/.test(league)) load(league, manager());
  };
  const showCustom = customMode || !leagueList;
  const noLeagues = /^\d+$/.test(lookupId) && !leaguesLoading && !leagueList;

  return (
    <div className="min-h-screen">
      <div className="w-full py-4 sm:py-8">
        <div className="fpl-page-header">
          <div className="fpl-page-header-content">
            <div className="fpl-page-title">
              <Users />
              <h1 data-testid="text-page-title">Mini-league Ownership</h1>
            </div>
            <p className="fpl-page-subtitle">Who your league owns and captains, its template XI, and your differentials.</p>
          </div>
        </div>

        <InputPanel icon={Search} title="Find your league" subtitle="Enter your team ID, then pick one of your leagues">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="manager-id" className="text-sm font-semibold">1. Your team ID</Label>
              <Input
                id="manager-id"
                value={managerInput}
                onChange={(e) => setManagerInput(extractManagerId(e.target.value))}
                onKeyDown={(e) => e.key === "Enter" && /^\d+$/.test(manager()) && setLookupId(manager())}
                placeholder="e.g. 1234567"
                inputMode="numeric"
                className="h-11 rounded-xl text-base"
                data-testid="input-manager-id"
              />
              <p className="text-xs text-gray-500">The number in the URL when you open your team on the FPL site.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="league-select" className="text-sm font-semibold">2. Your league</Label>
              <Select
                value={customMode ? "other" : leagues.some((l) => String(l.id) === selectedLeague) ? selectedLeague : ""}
                onValueChange={chooseLeague}
                disabled={!leagueList}
              >
                <SelectTrigger id="league-select" className="h-11 rounded-xl text-base" data-testid="select-league">
                  <SelectValue placeholder={leagueList ? "Choose a league" : leaguesLoading ? "Finding your leagues…" : "Enter your team ID first"} />
                </SelectTrigger>
                <SelectContent>
                  {leagues.map((l) => (
                    <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>
                  ))}
                  <SelectItem value="other">Another league (enter its ID)…</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500" data-testid="text-league-hint">
                {leagueList
                  ? "Private leagues only. Not listed? Choose “Another league”."
                  : noLeagues
                    ? "We couldn't find leagues for that team ID. Check it, or enter a league ID below."
                    : "Your private leagues appear here once your team ID is in."}
              </p>
            </div>
          </div>
          {showCustom && (
            <div className="space-y-1.5">
              <Label htmlFor="league-id" className="text-sm font-semibold">League ID</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  id="league-id"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => e.key === "Enter" && loadCustom()}
                  placeholder="e.g. 123456"
                  inputMode="numeric"
                  className="h-11 rounded-xl text-base"
                  data-testid="input-league-id"
                />
                <Button onClick={loadCustom} disabled={!/^\d+$/.test(customInput.trim())} className="h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 font-bold text-white hover:from-indigo-500 hover:to-violet-500" data-testid="button-load">
                  Show league
                </Button>
              </div>
              <p className="text-xs text-gray-500">The number in the URL when you open the league's standings page on the FPL site.</p>
            </div>
          )}
        </InputPanel>

        {query && <LeagueOwnershipView key={`${query.league}:${query.manager}`} leagueId={query.league} managerId={query.manager} />}
      </div>
    </div>
  );
}
