import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Database, Clock, CheckCircle, AlertCircle, Zap, Activity } from "lucide-react";
// Helper function for auth errors
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

export default function AdminCacheManagement() {
  const { toast } = useToast();
  const [cacheStatus, setCacheStatus] = useState<CacheStatusItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState<CacheRefreshState>({});

  const cacheTypes = [
    { key: 'goals', name: 'Player Goals', description: 'Individual player goal projections' },
    { key: 'assists', name: 'Player Assists', description: 'Individual player assist projections' },
    { key: 'minutes', name: 'Player Minutes', description: 'Expected minutes played' },
    { key: 'clean-sheets', name: 'Clean Sheets', description: 'Team clean sheet probabilities' },
    { key: 'defensive', name: 'Defensive', description: 'Defensive contribution projections' },
    { key: 'team', name: 'Team Projections', description: 'Team-level goal and assist projections' },
    { key: 'goal-share', name: 'Goal Share', description: 'Player share of team goals' },
    { key: 'assist-share', name: 'Assist Share', description: 'Player share of team assists' },
    { key: 'total-points', name: 'Player Total Points', description: 'Complete FPL points projections' },
    { key: 'saves', name: 'Player Saves', description: 'Goalkeeper save projections' },
    { key: 'goals-conceded', name: 'Goals Conceded', description: 'Player goals conceded projections' },
    { key: 'yellow-cards', name: 'Yellow Cards', description: 'Player yellow card projections' },
    { key: 'red-cards', name: 'Red Cards', description: 'Player red card projections' },
    { key: 'bonus-points', name: 'Bonus Points', description: 'Player bonus point projections' }
  ];

  const bulkOperations = [
    { key: 'essential', name: 'Essential Cache', description: 'Goals, Assists, Minutes only', icon: Zap },
    { key: 'all', name: 'All Projections', description: 'Complete cache refresh', icon: Database }
  ];

  const fetchCacheStatus = async () => {
    try {
      const response = await fetch("/api/admin/cache/status");
      if (response.ok) {
        const data = await response.json();
        setCacheStatus(data);
      }
    } catch (error) {
      console.error("Error fetching cache status:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCacheStatus();
  }, []);

  const refreshCache = async (type: string) => {
    setRefreshing(prev => ({ ...prev, [type]: true }));
    
    try {
      const response = await fetch(`/api/admin/cache/refresh/${type}`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Cache Refreshed",
          description: `${cacheTypes.find(c => c.key === type)?.name} cache updated successfully`,
          variant: "default",
        });
        await fetchCacheStatus(); // Refresh status
      }
    } catch (error) {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      toast({
        title: "Error",
        description: `Failed to refresh ${cacheTypes.find(c => c.key === type)?.name} cache`,
        variant: "destructive",
      });
    } finally {
      setRefreshing(prev => ({ ...prev, [type]: false }));
    }
  };

  const refreshBulkCache = async (operation: string) => {
    setRefreshing(prev => ({ ...prev, [operation]: true }));
    
    try {
      const endpoint = operation === 'essential' ? 'refresh-essential' : 'refresh-all';
      const response = await fetch(`/api/admin/cache/${endpoint}`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Bulk Refresh Complete",
          description: data.message,
          variant: "default",
        });
        await fetchCacheStatus(); // Refresh status
      }
    } catch (error) {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      toast({
        title: "Error",
        description: `Failed to refresh ${operation} cache`,
        variant: "destructive",
      });
    } finally {
      setRefreshing(prev => ({ ...prev, [operation]: false }));
    }
  };

  const mapCacheKeyToType = (key: string): string => {
    const typeMap: Record<string, string> = {
      'goals': 'Goals',
      'assists': 'Assists',
      'minutes': 'Minutes', 
      'clean-sheets': 'Team Clean Sheets',
      'defensive': 'Defensive',
      'team': 'Team Projections',
      'goal-share': 'Goal Share',
      'assist-share': 'Assist Share',
      'total-points': 'Total Points',
      'saves': 'Player Saves',
      'goals-conceded': 'Goals Conceded',
      'yellow-cards': 'Yellow Cards', 
      'red-cards': 'Red Cards',
      'bonus-points': 'Bonus Points'
    };
    return typeMap[key] || key;
  };

  const getStatusBadge = (isStale: boolean, count: string | number) => {
    if (count === 0 || count === '0') {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Empty
        </Badge>
      );
    }
    
    if (isStale) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Stale
        </Badge>
      );
    }
    
    return (
      <Badge variant="default" className="flex items-center gap-1 bg-green-600">
        <CheckCircle className="h-3 w-3" />
        Fresh
      </Badge>
    );
  };

  const formatTimeAgo = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      
      if (diffMinutes < 60) {
        return `${diffMinutes}m ago`;
      } else if (diffMinutes < 1440) {
        return `${Math.floor(diffMinutes / 60)}h ago`;
      } else {
        return `${Math.floor(diffMinutes / 1440)}d ago`;
      }
    } catch {
      return 'Unknown';
    }
  };

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
        {/* Page Header */}
        <div className="fpl-page-header">
          <div className="fpl-page-header-content">
            <div className="fpl-page-title">
              <Database className="h-8 w-8" />
              <h1>Cache Management</h1>
            </div>
            <p className="fpl-page-subtitle">
              Manage and refresh projection caches for optimal performance
            </p>
          </div>
        </div>

        {/* Bulk Operations */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Bulk Operations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bulkOperations.map((operation) => {
                const IconComponent = operation.icon;
                return (
                  <div key={operation.key} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <IconComponent className="h-5 w-5 text-indigo-600" />
                      <div>
                        <h3 className="font-medium">{operation.name}</h3>
                        <p className="text-sm text-muted-foreground">{operation.description}</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => refreshBulkCache(operation.key)}
                      disabled={refreshing[operation.key]}
                      size="sm"
                      variant={operation.key === 'all' ? 'default' : 'secondary'}
                    >
                      {refreshing[operation.key] ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Refresh
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Individual Cache Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Individual Cache Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {cacheTypes.map((cache) => {
                // Find matching cache status by type name
                const status = cacheStatus?.find(s => {
                  const mappedType = mapCacheKeyToType(cache.key);
                  return s.type === mappedType;
                });
                return (
                  <div key={cache.key} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">{cache.name}</h3>
                        {status && getStatusBadge(status.isStale, status.count)}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{cache.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Records: {status?.count?.toLocaleString() || 0}</span>
                        {status?.lastUpdated && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Updated {formatTimeAgo(status.lastUpdated)}
                          </span>
                        )}
                        {!status?.lastUpdated && status?.count && Number(status.count) > 0 && (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="h-3 w-3" />
                            Cached
                          </span>
                        )}
                        {(!status?.count || Number(status.count) === 0) && (
                          <span className="flex items-center gap-1 text-orange-600">
                            <AlertCircle className="h-3 w-3" />
                            Never cached
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={() => refreshCache(cache.key)}
                      disabled={refreshing[cache.key]}
                      size="sm"
                      variant="outline"
                      className="ml-4"
                    >
                      {refreshing[cache.key] ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Refresh Status Button */}
        <div className="mt-6 text-center">
          <Button onClick={fetchCacheStatus} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Status
          </Button>
        </div>
      </div>
    </div>
  );
}