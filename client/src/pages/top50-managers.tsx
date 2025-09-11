import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Crown,
  DollarSign,
  Home,
  RefreshCw,
  Trophy,
  TrendingDown,
  TrendingUp,
  Users,
  ArrowUpDown,
} from "lucide-react";

type Top50Manager = {
  rank: number;
  name: string;
  managerId: number;
  latestTracking?: {
    gameweek: number;
    overallRank: number;
    overallPoints: number;
    gameweekPoints: number;
    gameweekRank?: number;
    teamValue: number;
    totalTransfers: number;
    chipsUsed?: number;
  };
};

function getRankBadgeVariant(rank?: number): "default" | "secondary" | "destructive" | "outline" {
  if (!rank) return "outline";
  if (rank <= 1000000) return "default";
  if (rank <= 3000000) return "secondary";
  return "destructive";
}

function getRankChangeDisplay(change: number | undefined) {
  if (!change || change === 0) return null;
  if (change > 0) {
    return (
      <div className="flex items-center text-red-600 text-xs">
        <TrendingDown className="h-3 w-3 mr-1" />
        +{change.toLocaleString()}
      </div>
    );
  } else {
    return (
      <div className="flex items-center text-green-600 text-xs">
        <TrendingUp className="h-3 w-3 mr-1" />
        {change.toLocaleString()}
      </div>
    );
  }
}

// Manager Table Row Component
function ManagerTableRow({ manager }: { manager: Top50Manager }) {
  const [, setLocation] = useLocation();

  const handleViewTeam = (rank: number) => {
    setLocation(`/top50-managers/${rank}/team`);
  };

  return (
    <TableRow 
      className="hover:bg-green-50 hover:shadow-md cursor-pointer transition-all duration-200 hover:border-l-4 hover:border-l-green-500" 
      onClick={() => handleViewTeam(manager.rank)}
      data-testid={`row-manager-${manager.rank}`}
      title="Click to view team details"
    >
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">#{manager.rank}</span>
          </div>
          <div>
            <div className="font-medium">{manager.name}</div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        {manager.latestTracking?.overallRank !== undefined && manager.latestTracking?.overallRank !== null ? (
          <div className="space-y-1">
            <Badge variant={getRankBadgeVariant(manager.latestTracking.overallRank)} className="font-mono">
              #{manager.latestTracking.overallRank.toLocaleString()}
            </Badge>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">Loading...</span>
        )}
      </TableCell>
      <TableCell className="text-right font-mono">
        {manager.latestTracking?.overallPoints !== undefined && manager.latestTracking?.overallPoints !== null ? manager.latestTracking.overallPoints : "N/A"}
      </TableCell>
      <TableCell className="text-right font-mono">
        {manager.latestTracking?.gameweekPoints !== undefined && manager.latestTracking?.gameweekPoints !== null ? manager.latestTracking.gameweekPoints : "N/A"}
      </TableCell>
      <TableCell className="text-right font-mono">
        {manager.latestTracking?.teamValue !== undefined && manager.latestTracking?.teamValue !== null 
          ? `£${(manager.latestTracking.teamValue / 10).toFixed(1)}m` 
          : "N/A"}
      </TableCell>
      <TableCell className="text-right font-mono">
        {manager.latestTracking?.totalTransfers !== undefined && manager.latestTracking?.totalTransfers !== null ? manager.latestTracking.totalTransfers : "N/A"}
      </TableCell>
      <TableCell className="text-right font-mono">
        {manager.latestTracking?.chipsUsed !== undefined ? manager.latestTracking.chipsUsed : "N/A"}
      </TableCell>
    </TableRow>
  );
}

export default function Top50Managers() {
  const [managersWithData, setManagersWithData] = useState<Top50Manager[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch top 25 managers data from API
  const { data: top50Data } = useQuery<Top50Manager[]>({
    queryKey: ['/api/top50-managers'],
    retry: 2,
  });

  // Fetch latest tracking data for all managers
  const fetchManagerData = async (managerId: number) => {
    try {
      // Fetch basic manager data
      const [managerResponse, historyResponse] = await Promise.all([
        fetch(`/api/manager/${managerId}`),
        fetch(`/api/manager/${managerId}/history`)
      ]);
      
      if (managerResponse.ok && historyResponse.ok) {
        const managerData = await managerResponse.json();
        const historyData = await historyResponse.json();
        
        // Count chips used
        const chipsUsed = historyData.chips ? historyData.chips.length : 0;
        
        return {
          gameweek: managerData.current_event || 0,
          overallRank: managerData.summary_overall_rank,
          overallPoints: managerData.summary_overall_points,
          gameweekPoints: managerData.summary_event_points,
          teamValue: managerData.last_deadline_value,
          totalTransfers: managerData.last_deadline_total_transfers,
          chipsUsed: chipsUsed,
        };
      }
    } catch (error) {
      console.error(`Failed to fetch data for manager ${managerId}:`, error);
    }
    return null;
  };

  const refreshAllData = async () => {
    if (!top50Data) return;
    setIsRefreshing(true);
    const updatedManagers = await Promise.all(
      top50Data.map(async (manager) => {
        const latestTracking = await fetchManagerData(manager.managerId);
        return {
          ...manager,
          latestTracking: latestTracking || undefined,
        };
      })
    );
    setManagersWithData(updatedManagers);
    setIsRefreshing(false);
  };

  useEffect(() => {
    if (top50Data) {
      setManagersWithData(top50Data);
      refreshAllData();
    }
  }, [top50Data]);

  return (
    <div className="fpl-page-wrapper">
      <div className="fpl-container fpl-content-area">
        {/* Page Header */}
        <div className="fpl-page-header">
          <div className="fpl-page-header-content">
            <div className="fpl-page-title">
              <Trophy className="h-8 w-8" />
              <h1>Top 25 FPL Managers (Current)</h1>
            </div>
            <p className="fpl-page-subtitle">
              Current top 25 Fantasy Premier League managers from the overall league
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="fpl-controls">
          <div className="fpl-controls-right">
            <Button
              onClick={refreshAllData}
              disabled={isRefreshing}
              variant="outline"
              className="hover:bg-blue-50"
              data-testid="button-refresh-data"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
            </Button>
          </div>
        </div>


      {/* Managers Table */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Manager</TableHead>
                <TableHead>Current Rank</TableHead>
                <TableHead className="text-right">Total Points</TableHead>
                <TableHead className="text-right">GW Points</TableHead>
                <TableHead className="text-right">Team Value</TableHead>
                <TableHead className="text-right">Transfers</TableHead>
                <TableHead className="text-right">Chips</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {managersWithData.length > 0 ? (
                managersWithData.map((manager) => (
                  <ManagerTableRow key={manager.rank} manager={manager} />
                ))
              ) : (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-8 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-12" /></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
        </Card>
      </div>
    </div>
  );
}