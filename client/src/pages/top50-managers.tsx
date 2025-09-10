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
    <TableRow className="hover:bg-muted/50">
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
      <TableCell className="text-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleViewTeam(manager.rank)}
          className="hover:bg-blue-50"
          data-testid={`button-view-team-${manager.rank}`}
        >
          <Users className="h-4 w-4 mr-1" />
          View Team
        </Button>
      </TableCell>
    </TableRow>
  );
}

export default function Top50Managers() {
  const [managersWithData, setManagersWithData] = useState<Top50Manager[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch top 50 managers data from API
  const { data: top50Data } = useQuery<Top50Manager[]>({
    queryKey: ['/api/top50-managers'],
    retry: 2,
  });

  // Fetch latest tracking data for all managers
  const fetchManagerData = async (managerId: number) => {
    try {
      const response = await fetch(`/api/manager/${managerId}`);
      if (response.ok) {
        const data = await response.json();
        return {
          gameweek: data.current_event || 0,
          overallRank: data.summary_overall_rank,
          overallPoints: data.summary_overall_points,
          gameweekPoints: data.summary_event_points,
          teamValue: data.last_deadline_value,
          totalTransfers: data.last_deadline_total_transfers,
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
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-green-400 to-blue-500 rounded-xl">
                <Crown className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                  Current Top 50 Managers
                </h1>
                <p className="text-muted-foreground text-lg">
                  Current top 50 Fantasy Premier League managers from the overall league
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
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
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-700">50</div>
                <div className="text-sm text-muted-foreground">Top Managers</div>
              </div>
              <Crown className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-700">Live</div>
                <div className="text-sm text-muted-foreground">Tracking</div>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-purple-700">Real-time</div>
                <div className="text-sm text-muted-foreground">Updates</div>
              </div>
              <RefreshCw className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500 bg-gradient-to-r from-orange-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-orange-700">Teams</div>
                <div className="text-sm text-muted-foreground">Analysis</div>
              </div>
              <Users className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Managers Table */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-green-600" />
            Current Top 50 FPL Managers
          </CardTitle>
          <CardDescription>
            Track the performance and teams of the current top 50 Fantasy Premier League managers
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Manager</TableHead>
                <TableHead>Current Rank</TableHead>
                <TableHead className="text-right">Total Points</TableHead>
                <TableHead className="text-right">GW Points</TableHead>
                <TableHead className="text-right">Team Value</TableHead>
                <TableHead className="text-center">Actions</TableHead>
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
                    <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}