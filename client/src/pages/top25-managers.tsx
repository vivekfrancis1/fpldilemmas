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

type Top25Manager = {
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

const TOP_25_MANAGERS: Top25Manager[] = [
  { rank: 1, name: "Tom Dollimore", managerId: 497000 },
  { rank: 2, name: "Ben Crellin", managerId: 6586 },
  { rank: 3, name: "Fábio Borges", managerId: 4783108 },
  { rank: 4, name: "John Walsh", managerId: 1277598 },
  { rank: 5, name: "Abhinav C", managerId: 175376 },
  { rank: 6, name: "Harry Daniels", managerId: 1320 },
  { rank: 7, name: "» elevenify.com", managerId: 9325733 },
  { rank: 8, name: "Cameron Scott", managerId: 43164 },
  { rank: 9, name: "Huss E", managerId: 10421 },
  { rank: 10, name: "Khaled Zaki", managerId: 202269 },
  { rank: 11, name: "Rob Mayes", managerId: 294590 },
  { rank: 12, name: "Mark Hurst", managerId: 62110 },
  { rank: 13, name: "Jesper Øiestad", managerId: 4455 },
  { rank: 14, name: "Even Skärholen", managerId: 227102 },
  { rank: 15, name: "Tom N", managerId: 386057 },
  { rank: 16, name: "Anthony Moylette", managerId: 78351 },
  { rank: 17, name: "Lukasz Woźniak", managerId: 859923 },
  { rank: 18, name: "Michael Giovanni", managerId: 69716 },
  { rank: 19, name: "Tommy Shinton", managerId: 155602 },
  { rank: 20, name: "Sean Connors", managerId: 207939 },
  { rank: 21, name: "Raphael Crettol", managerId: 1559332 },
  { rank: 22, name: "Simon MacNair", managerId: 742000 },
  { rank: 23, name: "Jovan Popović", managerId: 226819 },
  { rank: 24, name: "William Johansson", managerId: 3676 },
  { rank: 25, name: "Louis Reddington", managerId: 121680 },
];

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
function ManagerTableRow({ manager }: { manager: Top25Manager }) {
  const [, setLocation] = useLocation();

  const handleViewTeam = (rank: number) => {
    setLocation(`/top25-managers/${rank}/team`);
  };

  return (
    <TableRow 
      className="hover:bg-blue-50 hover:shadow-md cursor-pointer transition-all duration-200 hover:border-l-4 hover:border-l-blue-500" 
      onClick={() => handleViewTeam(manager.rank)}
      data-testid={`row-manager-${manager.rank}`}
      title="Click to view team details"
    >
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
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
    </TableRow>
  );
}

export default function Top25Managers() {
  const [managersWithData, setManagersWithData] = useState<Top25Manager[]>(TOP_25_MANAGERS);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
    setIsRefreshing(true);
    const updatedManagers = await Promise.all(
      TOP_25_MANAGERS.map(async (manager) => {
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
    refreshAllData();
  }, []);

  return (
    <div className="fpl-page-wrapper">
      <div className="fpl-container fpl-content-area">
        {/* Page Header */}
        <div className="fpl-page-header">
          <div className="fpl-page-header-content">
            <div className="fpl-page-title">
              <Crown className="h-8 w-8" />
              <h1>Top 25 FPL Managers</h1>
            </div>
            <p className="fpl-page-subtitle">
              Elite Fantasy Premier League managers and their current standings
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-600" />
            Elite FPL Managers
          </CardTitle>
          <CardDescription>
            Track the performance and teams of the top Fantasy Premier League managers
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {managersWithData.map((manager) => (
                <ManagerTableRow key={manager.rank} manager={manager} />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

        {/* Footer */}
        <div className="text-center py-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Data based on{' '}
            <a 
              href="https://www.fplresearch.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              FPL Research
            </a>{' '}
            as on September 10, 2025
          </p>
        </div>
      </div>
    </div>
  );
}