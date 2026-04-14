import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Database, Clock, CheckCircle, AlertCircle, Zap, Activity, Users, Shield, BarChart3, Info } from "lucide-react";

function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}

interface CacheStatusItem {
  type: string;
  count: string | number;
  lastUpdated: string | null;
  isStale: boolean;
}

interface CacheRefreshState {
  [key: string]: boolean;
}

interface CacheDefinition {
  key: string;
  name: string;
  description: string;
  statusType?: string;
  note?: string;
  inMemory?: boolean;
}

const PLAYER_PROJECTION_CACHES: CacheDefinition[] = [
  { key: 'goals', name: 'Goals Scored', description: 'Player goal probability projections per GW', statusType: 'Goals' },
  { key: 'assists', name: 'Assists', description: 'Player assist probability projections per GW', statusType: 'Assists' },
  { key: 'minutes', name: 'Minutes', description: 'Expected minutes played per GW', statusType: 'Minutes' },
  { key: 'defensive', name: 'Defensive Contributions', description: 'DC projections (clearances, blocks, interceptions, tackles)', statusType: 'Defensive' },
  { key: 'saves', name: 'Goalkeeper Saves', description: 'GK save projections — runs full scoring refresh', statusType: 'Player Total Points', note: 'Shared refresh with all scoring components' },
  { key: 'goals-conceded', name: 'Goals Conceded', description: 'Goals conceded projections for clean sheet bonus — runs full scoring refresh', statusType: 'Player Total Points', note: 'Shared refresh with all scoring components' },
  { key: 'yellow-cards', name: 'Yellow Cards', description: 'Yellow card probability projections — runs full scoring refresh', statusType: 'Player Total Points', note: 'Shared refresh with all scoring components' },
  { key: 'red-cards', name: 'Red Cards', description: 'Red card probability projections — runs full scoring refresh', statusType: 'Player Total Points', note: 'Shared refresh with all scoring components' },
  { key: 'bonus', name: 'Bonus Points', description: 'BPS-based bonus point projections — runs full scoring refresh', statusType: 'Player Total Points', note: 'Shared refresh with all scoring components' },
  { key: 'goal-share', name: 'Goal & Assist Share', description: 'Player share of team goals and assists — both refreshed together', statusType: 'Goal Share' },
  { key: 'total-points', name: 'Player Total Points', description: 'Complete FPL points aggregation across all components (dynamic GW range)', statusType: 'Player Total Points' },
];

const TEAM_PROJECTION_CACHES: CacheDefinition[] = [
  { key: 'team-goals', name: 'Team Goal Projections', description: 'Expected goals per team per GW based on xG and fixture difficulty', statusType: 'Team Projections' },
  { key: 'team-assists', name: 'Team Assist Projections', description: 'Expected assists per team per GW', statusType: 'Team Projections', note: 'Shared refresh with Team Goals' },
  { key: 'clean-sheets', name: 'Team Clean Sheets', description: 'Clean sheet probabilities per team per GW', statusType: 'Team Clean Sheets' },
  { key: 'team-goals-against', name: 'Team Goals Against', description: 'Expected goals conceded per team per GW — in-memory cache only', inMemory: true, note: 'Clears in-memory cache; auto-recomputes on next request' },
];

const BULK_OPERATIONS = [
  { key: 'essential', name: 'Essential Cache', description: 'Goals, Assists, Minutes only — fast refresh', icon: Zap },
  { key: 'all', name: 'All Projections', description: 'Full refresh of every projection cache — may take several minutes', icon: Database },
];

export default function AdminCacheManagement() {
  const { toast } = useToast();
  const [cacheStatus, setCacheStatus] = useState<CacheStatusItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState<CacheRefreshState>({});

  const fetchCacheStatus = async () => {
    try {
      const response = await fetch("/api/admin/cache/status");
      if (response.ok) {
        const data = await response.json();
        setCacheStatus(data);
      } else if (response.status === 401 || response.status === 403) {
        toast({ title: "Authentication Required", description: "Please log in as admin to view cache status", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 2000);
      }
    } catch (error) {
      console.error("Error fetching cache status:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCacheStatus(); }, []);

  const refreshCache = async (type: string, displayName: string) => {
    setRefreshing(prev => ({ ...prev, [type]: true }));
    try {
      const response = await fetch(`/api/admin/cache/refresh/${type}`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: "Cache Refreshed", description: `${displayName} cache updated successfully` });
        await fetchCacheStatus();
      } else {
        toast({ title: "Refresh Failed", description: data.message || `Failed to refresh ${displayName}`, variant: "destructive" });
      }
    } catch (error) {
      if (isUnauthorizedError(error as Error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: `Failed to refresh ${displayName}`, variant: "destructive" });
    } finally {
      setRefreshing(prev => ({ ...prev, [type]: false }));
    }
  };

  const refreshBulkCache = async (operation: string, displayName: string) => {
    setRefreshing(prev => ({ ...prev, [operation]: true }));
    try {
      const endpoint = operation === 'essential' ? 'refresh-essential' : 'refresh-all';
      const response = await fetch(`/api/admin/cache/${endpoint}`, { method: 'POST', credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        toast({ title: "Bulk Refresh Complete", description: data.message });
        await fetchCacheStatus();
      } else {
        toast({ title: "Bulk Refresh Failed", description: data.message, variant: "destructive" });
      }
    } catch (error) {
      if (isUnauthorizedError(error as Error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: `Failed to run ${displayName}`, variant: "destructive" });
    } finally {
      setRefreshing(prev => ({ ...prev, [operation]: false }));
    }
  };

  const getStatusForCache = (cache: CacheDefinition): CacheStatusItem | undefined => {
    if (!cacheStatus || cache.inMemory) return undefined;
    return cacheStatus.find(s => s.type === cache.statusType);
  };

  const formatTimeAgo = (dateString: string) => {
    try {
      const date = new Date(dateString + (dateString.includes('Z') ? '' : 'Z'));
      const diffMinutes = Math.floor((new Date().getTime() - date.getTime()) / (1000 * 60));
      if (diffMinutes < 1) return 'Just now';
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
      return `${Math.floor(diffMinutes / 1440)}d ago`;
    } catch { return 'Unknown'; }
  };

  const getStatusBadge = (cache: CacheDefinition) => {
    if (cache.inMemory) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1 text-xs">
          <Activity className="h-3 w-3" />
          In-memory
        </Badge>
      );
    }
    const status = getStatusForCache(cache);
    if (!status) return null;
    const count = Number(status.count);
    if (count === 0) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1 text-xs">
          <AlertCircle className="h-3 w-3" />
          Empty
        </Badge>
      );
    }
    if (status.isStale) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1 text-xs">
          <Clock className="h-3 w-3" />
          Stale
        </Badge>
      );
    }
    return (
      <Badge className="flex items-center gap-1 text-xs bg-green-600">
        <CheckCircle className="h-3 w-3" />
        Fresh
      </Badge>
    );
  };

  const getStatusMeta = (cache: CacheDefinition) => {
    if (cache.inMemory) return null;
    const status = getStatusForCache(cache);
    if (!status) return null;
    const count = Number(status.count);
    return (
      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
        <span>Records: {count.toLocaleString()}</span>
        {status.lastUpdated && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatTimeAgo(status.lastUpdated)}
          </span>
        )}
        {!status.lastUpdated && count > 0 && (
          <span className="flex items-center gap-1 text-green-600">
            <CheckCircle className="h-3 w-3" />
            Cached
          </span>
        )}
        {count === 0 && (
          <span className="flex items-center gap-1 text-orange-600">
            <AlertCircle className="h-3 w-3" />
            Never cached
          </span>
        )}
      </div>
    );
  };

  const CacheRow = ({ cache }: { cache: CacheDefinition }) => (
    <div className="flex items-center justify-between p-3 border rounded-lg gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <h3 className="font-medium text-sm">{cache.name}</h3>
          {getStatusBadge(cache)}
        </div>
        <p className="text-xs text-muted-foreground">{cache.description}</p>
        {cache.note && (
          <p className="text-xs text-blue-600 flex items-center gap-1 mt-0.5">
            <Info className="h-3 w-3 flex-shrink-0" />
            {cache.note}
          </p>
        )}
        {getStatusMeta(cache)}
      </div>
      <Button
        onClick={() => refreshCache(cache.key, cache.name)}
        disabled={refreshing[cache.key]}
        size="sm"
        variant="outline"
        className="flex-shrink-0"
      >
        {refreshing[cache.key] ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
      </Button>
    </div>
  );

  if (loading) {
    return (
      <div className="fpl-page-wrapper">
        <div className="fpl-container fpl-content-area fpl-section-spacing">
          <div className="flex items-center justify-center min-h-[200px]">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading cache status...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fpl-page-wrapper">
      <div className="fpl-container fpl-content-area fpl-section-spacing">
        <div className="fpl-page-header">
          <div className="fpl-page-header-content">
            <div className="fpl-page-title">
              <Database className="h-8 w-8" />
              <h1>Cache Management</h1>
            </div>
            <p className="fpl-page-subtitle">
              Manage and refresh projection caches for all player and team tools
            </p>
          </div>
        </div>

        {/* Bulk Operations */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-5 w-5" />
              Bulk Operations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {BULK_OPERATIONS.map((op) => {
                const Icon = op.icon;
                return (
                  <div key={op.key} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-indigo-600 flex-shrink-0" />
                      <div>
                        <h3 className="font-medium text-sm">{op.name}</h3>
                        <p className="text-xs text-muted-foreground">{op.description}</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => refreshBulkCache(op.key, op.name)}
                      disabled={refreshing[op.key]}
                      size="sm"
                      variant={op.key === 'all' ? 'default' : 'secondary'}
                      className="flex-shrink-0 ml-3"
                    >
                      {refreshing[op.key] ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                      Refresh
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Player Projections */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-5 w-5" />
                Player Projections
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {PLAYER_PROJECTION_CACHES.map(cache => (
                  <CacheRow key={cache.key} cache={cache} />
                ))}
              </div>
              {/* Scoring components legend */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-2">
                  <BarChart3 className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-blue-800">
                    <p className="font-medium mb-1">About scoring components</p>
                    <p>Saves, Goals Conceded, Yellow Cards, Red Cards, and Bonus Points are all computed in a single pipeline. Refreshing any one of them runs the full scoring aggregation and updates all of them simultaneously.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Projections */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-5 w-5" />
                Team Projections
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {TEAM_PROJECTION_CACHES.map(cache => (
                  <CacheRow key={cache.key} cache={cache} />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Refresh Status Button */}
        <div className="text-center">
          <Button onClick={fetchCacheStatus} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Status
          </Button>
        </div>
      </div>
    </div>
  );
}
