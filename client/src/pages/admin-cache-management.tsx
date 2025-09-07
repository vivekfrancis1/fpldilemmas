import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Database, Clock, CheckCircle, AlertCircle, Zap, Activity } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

interface CacheStatus {
  [key: string]: {
    lastUpdated: string;
    recordCount: number;
    status: "fresh" | "stale" | "empty";
  };
}

interface CacheRefreshState {
  [key: string]: boolean;
}

export default function AdminCacheManagement() {
  const { toast } = useToast();
  const [cacheStatus, setCacheStatus] = useState<CacheStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState<CacheRefreshState>({});

  const cacheTypes = [
    { key: 'goals', name: 'Player Goals', description: 'Individual player goal projections' },
    { key: 'assists', name: 'Player Assists', description: 'Individual player assist projections' },
    { key: 'minutes', name: 'Player Minutes', description: 'Expected minutes played' },
    { key: 'clean-sheets', name: 'Clean Sheets', description: 'Team clean sheet probabilities' },
    { key: 'defensive', name: 'Defensive', description: 'Defensive contribution projections' },
    { key: 'team', name: 'Team Projections', description: 'Team-level goal and assist projections' },
    { key: 'goal-assist-share', name: 'Goal/Assist Share', description: 'Player share of team goals/assists' },
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
      const response = await apiRequest('POST', `/api/admin/cache/refresh/${type}`);
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
      const response = await apiRequest('POST', `/api/admin/cache/${endpoint}`);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'fresh':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Fresh</Badge>;
      case 'stale':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Stale</Badge>;
      case 'empty':
        return <Badge variant="destructive" className="bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1" />Empty</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatLastUpdated = (dateString: string) => {
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
                const status = cacheStatus?.[cache.key];
                return (
                  <div key={cache.key} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">{cache.name}</h3>
                        {status && getStatusBadge(status.status)}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{cache.description}</p>
                      {status && (
                        <div className="text-xs text-muted-foreground">
                          <div>Records: {status.recordCount.toLocaleString()}</div>
                          <div>Updated: {formatLastUpdated(status.lastUpdated)}</div>
                        </div>
                      )}
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