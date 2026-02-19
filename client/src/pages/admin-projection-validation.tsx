import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Search, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, ChevronRight, Filter, Eye, EyeOff } from "lucide-react";

function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}

interface ComponentData {
  raw?: number;
  pts: number;
}

interface PlayerValidation {
  playerId: number;
  playerName: string;
  fullName: string;
  position: string;
  team: string;
  teamId: number;
  matchesPlayed: number;
  projectedGWs: number;
  actual: Record<string, ComponentData>;
  projected: Record<string, ComponentData>;
}

const COMPONENTS = [
  { key: "goals", label: "Goals", hasRaw: true },
  { key: "assists", label: "Assists", hasRaw: true },
  { key: "cleanSheets", label: "Clean Sheets", hasRaw: true },
  { key: "minutes", label: "Minutes", hasRaw: true },
  { key: "goalsConceded", label: "Goals Conceded", hasRaw: true },
  { key: "yellowCards", label: "Yellow Cards", hasRaw: true },
  { key: "redCards", label: "Red Cards", hasRaw: true },
  { key: "bonus", label: "Bonus", hasRaw: true },
  { key: "saves", label: "Saves", hasRaw: true },
  { key: "defensiveContributions", label: "Def. Contributions", hasRaw: true },
  { key: "totalPoints", label: "Total Points", hasRaw: false },
];

type ViewMode = "pts" | "raw" | "both";
type SortDir = "asc" | "desc";

function getDiffColor(diff: number, absThreshold: number = 0.3): string {
  const absDiff = Math.abs(diff);
  if (absDiff <= absThreshold * 0.5) return "text-green-600";
  if (absDiff <= absThreshold) return "text-amber-600";
  return "text-red-600";
}

function getDiffBg(diff: number, absThreshold: number = 0.3): string {
  const absDiff = Math.abs(diff);
  if (absDiff <= absThreshold * 0.5) return "";
  if (absDiff <= absThreshold) return "bg-amber-50";
  return "bg-red-50";
}

export default function AdminProjectionValidation() {
  const { isAdmin, isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>("pts");
  const [sortColumn, setSortColumn] = useState("totalPoints_diff_pts");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [visibleComponents, setVisibleComponents] = useState<Set<string>>(
    new Set(["goals", "assists", "cleanSheets", "bonus", "defensiveContributions", "totalPoints"])
  );
  const [showColumnPicker, setShowColumnPicker] = useState(false);

  const { data, isLoading, error } = useQuery<{ currentGameweek: number; playerCount: number; players: PlayerValidation[] }>({
    queryKey: ["/api/admin/projection-validation"],
    enabled: isAdmin && isAuthenticated,
  });

  const teams = useMemo(() => {
    if (!data?.players) return [];
    const teamSet = new Map<string, number>();
    for (const p of data.players) {
      if (!teamSet.has(p.team)) teamSet.set(p.team, p.teamId);
    }
    return [...teamSet.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [data]);

  const filteredPlayers = useMemo(() => {
    if (!data?.players) return [];
    let players = data.players;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      players = players.filter(p =>
        p.playerName.toLowerCase().includes(q) ||
        p.fullName.toLowerCase().includes(q)
      );
    }
    if (positionFilter !== "all") {
      players = players.filter(p => p.position === positionFilter);
    }
    if (teamFilter !== "all") {
      players = players.filter(p => p.team === teamFilter);
    }

    players = [...players].sort((a, b) => {
      let valA = 0, valB = 0;

      if (sortColumn === "playerName") {
        return sortDir === "asc"
          ? a.playerName.localeCompare(b.playerName)
          : b.playerName.localeCompare(a.playerName);
      }
      if (sortColumn === "matchesPlayed") {
        valA = a.matchesPlayed; valB = b.matchesPlayed;
      } else if (sortColumn === "position") {
        return sortDir === "asc"
          ? a.position.localeCompare(b.position)
          : b.position.localeCompare(a.position);
      } else {
        const parts = sortColumn.split("_");
        const compKey = parts[0];
        const type = parts[1];
        const metric = parts[2];

        if (type === "actual") {
          valA = metric === "raw" ? (a.actual[compKey]?.raw ?? 0) : (a.actual[compKey]?.pts ?? 0);
          valB = metric === "raw" ? (b.actual[compKey]?.raw ?? 0) : (b.actual[compKey]?.pts ?? 0);
        } else if (type === "proj") {
          valA = metric === "raw" ? (a.projected[compKey]?.raw ?? 0) : (a.projected[compKey]?.pts ?? 0);
          valB = metric === "raw" ? (b.projected[compKey]?.raw ?? 0) : (b.projected[compKey]?.pts ?? 0);
        } else if (type === "diff") {
          const projVal = metric === "raw" ? (a.projected[compKey]?.raw ?? 0) : (a.projected[compKey]?.pts ?? 0);
          const actVal = metric === "raw" ? (a.actual[compKey]?.raw ?? 0) : (a.actual[compKey]?.pts ?? 0);
          valA = projVal - actVal;

          const projValB = metric === "raw" ? (b.projected[compKey]?.raw ?? 0) : (b.projected[compKey]?.pts ?? 0);
          const actValB = metric === "raw" ? (b.actual[compKey]?.raw ?? 0) : (b.actual[compKey]?.pts ?? 0);
          valB = projValB - actValB;
        }
      }

      return sortDir === "asc" ? valA - valB : valB - valA;
    });

    return players;
  }, [data, searchQuery, positionFilter, teamFilter, sortColumn, sortDir]);

  const handleSort = (col: string) => {
    if (sortColumn === col) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(col);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortColumn !== col) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-30" />;
    return sortDir === "asc"
      ? <ArrowUp className="w-3 h-3 ml-1 text-blue-500" />
      : <ArrowDown className="w-3 h-3 ml-1 text-blue-500" />;
  };

  const toggleComponent = (key: string) => {
    setVisibleComponents(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectPreset = (preset: string) => {
    if (preset === "all") {
      setVisibleComponents(new Set(COMPONENTS.map(c => c.key)));
    } else if (preset === "key") {
      setVisibleComponents(new Set(["goals", "assists", "cleanSheets", "bonus", "defensiveContributions", "totalPoints"]));
    } else if (preset === "offensive") {
      setVisibleComponents(new Set(["goals", "assists", "bonus", "totalPoints"]));
    } else if (preset === "defensive") {
      setVisibleComponents(new Set(["cleanSheets", "goalsConceded", "saves", "defensiveContributions", "totalPoints"]));
    } else if (preset === "minimal") {
      setVisibleComponents(new Set(["totalPoints"]));
    }
  };

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Admin access required.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-600" />
          <p className="text-sm text-muted-foreground">Loading projection validation data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-red-500">
              {isUnauthorizedError(error as Error) ? "Admin access required." : "Failed to load data."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeComponents = COMPONENTS.filter(c => visibleComponents.has(c.key));

  return (
    <div className="p-2 sm:p-4 space-y-4 max-w-full">
      <Card className="border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg sm:text-xl bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Projection Validation
              </CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Past avg/game ({data?.currentGameweek} GWs) vs Projected avg/game ({data?.players?.[0]?.projectedGWs || 12} GWs) &middot; {filteredPlayers.length} players
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search player..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>

            <Select value={positionFilter} onValueChange={setPositionFilter}>
              <SelectTrigger className="w-[100px] h-9 text-sm">
                <SelectValue placeholder="Position" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Pos</SelectItem>
                <SelectItem value="GKP">GKP</SelectItem>
                <SelectItem value="DEF">DEF</SelectItem>
                <SelectItem value="MID">MID</SelectItem>
                <SelectItem value="FWD">FWD</SelectItem>
              </SelectContent>
            </Select>

            <Select value={teamFilter} onValueChange={setTeamFilter}>
              <SelectTrigger className="w-[110px] h-9 text-sm">
                <SelectValue placeholder="Team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {teams.map(([name]) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={viewMode} onValueChange={v => setViewMode(v as ViewMode)}>
              <SelectTrigger className="w-[140px] h-9 text-sm">
                <SelectValue placeholder="View" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pts">Scoring Points</SelectItem>
                <SelectItem value="raw">Raw Metrics</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              className="h-9 text-sm gap-1"
              onClick={() => setShowColumnPicker(!showColumnPicker)}
            >
              <Filter className="w-3.5 h-3.5" />
              Columns
              {showColumnPicker ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </Button>
          </div>

          {showColumnPicker && (
            <Card className="bg-gray-50 border">
              <CardContent className="py-3 px-4 space-y-2">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <Badge variant="outline" className="cursor-pointer hover:bg-purple-100 text-xs" onClick={() => selectPreset("all")}>All</Badge>
                  <Badge variant="outline" className="cursor-pointer hover:bg-purple-100 text-xs" onClick={() => selectPreset("key")}>Key Stats</Badge>
                  <Badge variant="outline" className="cursor-pointer hover:bg-purple-100 text-xs" onClick={() => selectPreset("offensive")}>Offensive</Badge>
                  <Badge variant="outline" className="cursor-pointer hover:bg-purple-100 text-xs" onClick={() => selectPreset("defensive")}>Defensive</Badge>
                  <Badge variant="outline" className="cursor-pointer hover:bg-purple-100 text-xs" onClick={() => selectPreset("minimal")}>Minimal</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {COMPONENTS.map(comp => (
                    <button
                      key={comp.key}
                      onClick={() => toggleComponent(comp.key)}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs border transition-colors ${
                        visibleComponents.has(comp.key)
                          ? "bg-purple-100 border-purple-300 text-purple-700"
                          : "bg-white border-gray-200 text-gray-400"
                      }`}
                    >
                      {visibleComponents.has(comp.key) ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      {comp.label}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> Close (&lt;0.15)</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Moderate (0.15-0.3)</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Large (&gt;0.3)</span>
            <span className="italic ml-2">All values exact from per-match FPL live data</span>
          </div>

          <div className="overflow-x-auto -mx-2 sm:-mx-4">
            <div className="min-w-fit px-2 sm:px-4">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="sticky left-0 bg-gray-50 z-10 min-w-[120px] cursor-pointer" onClick={() => handleSort("playerName")}>
                      <div className="flex items-center text-xs">Player <SortIcon col="playerName" /></div>
                    </TableHead>
                    <TableHead className="text-center text-xs min-w-[40px] cursor-pointer" onClick={() => handleSort("position")}>
                      <div className="flex items-center justify-center">Pos <SortIcon col="position" /></div>
                    </TableHead>
                    <TableHead className="text-center text-xs min-w-[40px] cursor-pointer" onClick={() => handleSort("matchesPlayed")}>
                      <div className="flex items-center justify-center">MP <SortIcon col="matchesPlayed" /></div>
                    </TableHead>
                    {activeComponents.map(comp => {
                      const showRaw = viewMode !== "pts" && comp.hasRaw && comp.key !== "totalPoints";
                      const showPts = viewMode !== "raw" || comp.key === "totalPoints";
                      const colSpan = (showRaw && showPts) ? 6 : 3;
                      return (
                        <TableHead key={comp.key} colSpan={colSpan} className="text-center text-xs border-l border-gray-200">
                          {comp.label}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                  <TableRow className="bg-gray-50/80">
                    <TableHead className="sticky left-0 bg-gray-50/80 z-10" />
                    <TableHead />
                    <TableHead />
                    {activeComponents.map(comp => {
                      const showRaw = viewMode !== "pts" && comp.hasRaw && comp.key !== "totalPoints";
                      const showPts = viewMode !== "raw" || comp.key === "totalPoints";
                      const cells = [];
                      if (showRaw) {
                        cells.push(
                          <TableHead key={`${comp.key}_actual_raw`} className="text-center text-[10px] px-1.5 border-l border-gray-200 cursor-pointer whitespace-nowrap" onClick={() => handleSort(`${comp.key}_actual_raw`)}>
                            <div className="flex items-center justify-center">Past<SortIcon col={`${comp.key}_actual_raw`} /></div>
                          </TableHead>,
                          <TableHead key={`${comp.key}_proj_raw`} className="text-center text-[10px] px-1.5 cursor-pointer whitespace-nowrap" onClick={() => handleSort(`${comp.key}_proj_raw`)}>
                            <div className="flex items-center justify-center">Proj<SortIcon col={`${comp.key}_proj_raw`} /></div>
                          </TableHead>,
                          <TableHead key={`${comp.key}_diff_raw`} className="text-center text-[10px] px-1.5 cursor-pointer whitespace-nowrap" onClick={() => handleSort(`${comp.key}_diff_raw`)}>
                            <div className="flex items-center justify-center">Diff<SortIcon col={`${comp.key}_diff_raw`} /></div>
                          </TableHead>
                        );
                      }
                      if (showPts) {
                        cells.push(
                          <TableHead key={`${comp.key}_actual_pts`} className={`text-center text-[10px] px-1.5 cursor-pointer whitespace-nowrap ${showRaw ? 'border-l border-gray-100' : 'border-l border-gray-200'}`} onClick={() => handleSort(`${comp.key}_actual_pts`)}>
                            <div className="flex items-center justify-center">{showRaw ? 'Past₽' : 'Past'}<SortIcon col={`${comp.key}_actual_pts`} /></div>
                          </TableHead>,
                          <TableHead key={`${comp.key}_proj_pts`} className="text-center text-[10px] px-1.5 cursor-pointer whitespace-nowrap" onClick={() => handleSort(`${comp.key}_proj_pts`)}>
                            <div className="flex items-center justify-center">{showRaw ? 'Proj₽' : 'Proj'}<SortIcon col={`${comp.key}_proj_pts`} /></div>
                          </TableHead>,
                          <TableHead key={`${comp.key}_diff_pts`} className="text-center text-[10px] px-1.5 cursor-pointer whitespace-nowrap" onClick={() => handleSort(`${comp.key}_diff_pts`)}>
                            <div className="flex items-center justify-center">{showRaw ? 'Diff₽' : 'Diff'}<SortIcon col={`${comp.key}_diff_pts`} /></div>
                          </TableHead>
                        );
                      }
                      return cells;
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPlayers.slice(0, 200).map(player => (
                    <TableRow key={player.playerId} className="hover:bg-gray-50/50">
                      <TableCell className="sticky left-0 bg-white z-10 font-medium text-xs py-1.5">
                        <div>{player.playerName}</div>
                        <div className="text-[10px] text-muted-foreground">{player.team}</div>
                      </TableCell>
                      <TableCell className="text-center text-xs py-1.5">
                        <Badge variant="outline" className={`text-[10px] px-1 py-0 ${
                          player.position === 'FWD' ? 'border-red-300 text-red-600' :
                          player.position === 'MID' ? 'border-green-300 text-green-600' :
                          player.position === 'DEF' ? 'border-blue-300 text-blue-600' :
                          'border-amber-300 text-amber-600'
                        }`}>
                          {player.position}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-xs py-1.5">{player.matchesPlayed}</TableCell>
                      {activeComponents.map(comp => {
                        const showRaw = viewMode !== "pts" && comp.hasRaw && comp.key !== "totalPoints";
                        const showPts = viewMode !== "raw" || comp.key === "totalPoints";

                        const actualRaw = player.actual[comp.key]?.raw ?? 0;
                        const projRaw = player.projected[comp.key]?.raw ?? 0;
                        const diffRaw = projRaw - actualRaw;

                        const actualPts = player.actual[comp.key]?.pts ?? 0;
                        const projPts = player.projected[comp.key]?.pts ?? 0;
                        const diffPts = projPts - actualPts;

                        const rawThreshold = comp.key === "minutes" ? 10 : comp.key === "totalPoints" ? 0.5 : 0.1;
                        const ptsThreshold = comp.key === "totalPoints" ? 0.5 : 0.3;

                        const cells = [];
                        if (showRaw) {
                          cells.push(
                            <TableCell key={`${comp.key}_ar`} className="text-center text-xs py-1.5 px-1.5 border-l border-gray-200 tabular-nums">{actualRaw.toFixed(2)}</TableCell>,
                            <TableCell key={`${comp.key}_pr`} className="text-center text-xs py-1.5 px-1.5 tabular-nums">{projRaw.toFixed(2)}</TableCell>,
                            <TableCell key={`${comp.key}_dr`} className={`text-center text-xs py-1.5 px-1.5 tabular-nums font-medium ${getDiffColor(diffRaw, rawThreshold)} ${getDiffBg(diffRaw, rawThreshold)}`}>
                              {diffRaw >= 0 ? "+" : ""}{diffRaw.toFixed(2)}
                            </TableCell>
                          );
                        }
                        if (showPts) {
                          cells.push(
                            <TableCell key={`${comp.key}_ap`} className={`text-center text-xs py-1.5 px-1.5 tabular-nums ${showRaw ? 'border-l border-gray-100' : 'border-l border-gray-200'}`}>{actualPts.toFixed(2)}</TableCell>,
                            <TableCell key={`${comp.key}_pp`} className="text-center text-xs py-1.5 px-1.5 tabular-nums">{projPts.toFixed(2)}</TableCell>,
                            <TableCell key={`${comp.key}_dp`} className={`text-center text-xs py-1.5 px-1.5 tabular-nums font-medium ${getDiffColor(diffPts, ptsThreshold)} ${getDiffBg(diffPts, ptsThreshold)}`}>
                              {diffPts >= 0 ? "+" : ""}{diffPts.toFixed(2)}
                            </TableCell>
                          );
                        }
                        return cells;
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          {filteredPlayers.length > 200 && (
            <p className="text-xs text-muted-foreground text-center">Showing first 200 of {filteredPlayers.length} players</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
