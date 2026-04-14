import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, Database, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import ProtectedRoute from "@/components/protected-route";

interface GameweekCacheStatus {
  cachedGameweeks: number[];
  recentUpdates: UpdateLogEntry[];
  totalCached: number;
}

interface UpdateLogEntry {
  gameweek: number;
  season: string;
  updateType: "completed" | "partial" | "failed";
  playersUpdated: number;
  errors: any[] | null;
  startedAt: string;
  completedAt: string | null;
  duration: number | null;
}

interface PlayerData {
  playerId: number;
  gameweek: number;
  data: any | null;
  cached: boolean;
}

export default function AdminGameweekCache() {
  const [manualGameweek, setManualGameweek] = useState("");
  const [playerQuery, setPlayerQuery] = useState({ playerId: "", gameweek: "" });
  const queryClient = useQueryClient();

  // Fetch cache status
  const { data: cacheStatus, isLoading: statusLoading } = useQuery<GameweekCacheStatus>({
    queryKey: ["/api/gameweek-cache/status"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Manual cache mutation
  const cacheGameweekMutation = useMutation({
    mutationFn: async (gameweek: number) => {
      const response = await fetch(`/api/gameweek-cache/cache/${gameweek}`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to cache gameweek");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gameweek-cache/status"] });
      setManualGameweek("");
    },
  });

  // Auto-cache mutation
  const autoCacheMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/gameweek-cache/auto-cache", {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to trigger auto-cache");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gameweek-cache/status"] });
    },
  });

  // Player data query
  const { data: playerData, refetch: refetchPlayerData } = useQuery<PlayerData>({
    queryKey: ["/api/gameweek-cache/player-data", playerQuery.playerId, playerQuery.gameweek],
    enabled: !!(playerQuery.playerId && playerQuery.gameweek),
  });

  const handleManualCache = () => {
    const gw = parseInt(manualGameweek);
    if (gw >= 1 && gw <= 38) {
      cacheGameweekMutation.mutate(gw);
    }
  };

  const handlePlayerQuery = () => {
    if (playerQuery.playerId && playerQuery.gameweek) {
      refetchPlayerData();
    }
  };

  const getUpdateTypeIcon = (type: string) => {
    switch (type) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "partial":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return "N/A";
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  return (
    <ProtectedRoute requireAdmin={true}>
      <div className="w-full p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gameweek Data Cache Admin</h1>
          <p className="text-muted-foreground mt-2">
            Monitor and manage the automated FPL gameweek data caching system
          </p>
        </div>
        <Button
          onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/gameweek-cache/status"] })}
          variant="outline"
          size="sm"
          data-testid="button-refresh-status"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Cache Status Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cached</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-cached">
              {statusLoading ? "..." : cacheStatus?.totalCached || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Gameweeks with cached data
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Update</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statusLoading ? "..." : 
                cacheStatus?.recentUpdates?.[0] ? 
                  `GW${cacheStatus.recentUpdates[0].gameweek}` : "None"}
            </div>
            <p className="text-xs text-muted-foreground">
              {cacheStatus?.recentUpdates?.[0] ? 
                new Date(cacheStatus.recentUpdates[0].startedAt).toLocaleString() : 
                "No recent updates"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Active</div>
            <p className="text-xs text-muted-foreground">
              Auto-cache running every 2 hours
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cached Gameweeks */}
      <Card>
        <CardHeader>
          <CardTitle>Cached Gameweeks</CardTitle>
          <CardDescription>
            Gameweeks that have been successfully cached in the database
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {statusLoading ? (
              <p>Loading...</p>
            ) : cacheStatus?.cachedGameweeks?.length ? (
              cacheStatus.cachedGameweeks.map((gw) => (
                <Badge key={gw} variant="secondary" data-testid={`badge-gameweek-${gw}`}>
                  GW{gw}
                </Badge>
              ))
            ) : (
              <p className="text-muted-foreground">No gameweeks cached yet</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Manual Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Manual Cache</CardTitle>
            <CardDescription>
              Manually cache a specific gameweek
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <div className="flex-1">
                <Label htmlFor="manual-gameweek">Gameweek (1-38)</Label>
                <Input
                  id="manual-gameweek"
                  type="number"
                  min="1"
                  max="38"
                  value={manualGameweek}
                  onChange={(e) => setManualGameweek(e.target.value)}
                  placeholder="Enter gameweek number"
                  data-testid="input-manual-gameweek"
                />
              </div>
            </div>
            <Button
              onClick={handleManualCache}
              disabled={cacheGameweekMutation.isPending || !manualGameweek}
              className="w-full"
              data-testid="button-manual-cache"
            >
              {cacheGameweekMutation.isPending ? "Caching..." : "Cache Gameweek"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Auto-Cache</CardTitle>
            <CardDescription>
              Trigger automatic caching of all completed gameweeks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => autoCacheMutation.mutate()}
              disabled={autoCacheMutation.isPending}
              className="w-full"
              data-testid="button-auto-cache"
            >
              {autoCacheMutation.isPending ? "Processing..." : "Run Auto-Cache"}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              This will check for finished gameweeks and cache any missing data
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Player Data Query */}
      <Card>
        <CardHeader>
          <CardTitle>Query Player Data</CardTitle>
          <CardDescription>
            Check cached data for a specific player and gameweek
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="player-id">Player ID</Label>
              <Input
                id="player-id"
                type="number"
                value={playerQuery.playerId}
                onChange={(e) => setPlayerQuery(prev => ({ ...prev, playerId: e.target.value }))}
                placeholder="Enter player ID"
                data-testid="input-player-id"
              />
            </div>
            <div>
              <Label htmlFor="query-gameweek">Gameweek</Label>
              <Input
                id="query-gameweek"
                type="number"
                min="1"
                max="38"
                value={playerQuery.gameweek}
                onChange={(e) => setPlayerQuery(prev => ({ ...prev, gameweek: e.target.value }))}
                placeholder="Enter gameweek"
                data-testid="input-query-gameweek"
              />
            </div>
          </div>
          <Button
            onClick={handlePlayerQuery}
            disabled={!playerQuery.playerId || !playerQuery.gameweek}
            data-testid="button-query-player"
          >
            Query Player Data
          </Button>
          
          {playerData && (
            <div className="mt-4 p-4 bg-muted rounded-lg" data-testid="player-data-result">
              <p className="font-medium">
                Player {playerData.playerId} - Gameweek {playerData.gameweek}
              </p>
              <p className="text-sm text-muted-foreground">
                Status: {playerData.cached ? 
                  <Badge variant="secondary">Cached</Badge> : 
                  <Badge variant="destructive">Not Cached</Badge>
                }
              </p>
              {playerData.data && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm font-medium">Raw Data</summary>
                  <pre className="text-xs mt-2 p-2 bg-background rounded border">
                    {JSON.stringify(playerData.data, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Updates Log */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Updates</CardTitle>
          <CardDescription>
            Log of recent caching operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {statusLoading ? (
            <p>Loading updates...</p>
          ) : cacheStatus?.recentUpdates?.length ? (
            <div className="space-y-4">
              {cacheStatus.recentUpdates.map((update, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getUpdateTypeIcon(update.updateType)}
                    <div>
                      <p className="font-medium">Gameweek {update.gameweek}</p>
                      <p className="text-sm text-muted-foreground">
                        {update.playersUpdated} players • {formatDuration(update.duration)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge 
                      variant={update.updateType === "completed" ? "secondary" : 
                              update.updateType === "partial" ? "destructive" : "destructive"}
                    >
                      {update.updateType}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(update.startedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No recent updates</p>
          )}
        </CardContent>
      </Card>
    </div>
    </ProtectedRoute>
  );
}