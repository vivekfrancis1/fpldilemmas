import { useState, useEffect, useMemo } from "react";
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
import { ResponsiveTable, ResponsiveTableColumn } from "@/components/ui/responsive-table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
  BarChart3,
} from "lucide-react";
import Top25TeamAnalysis from "./top25-team-analysis";

type Top25Manager = {
  rank: number;
  name: string;
  managerId: number;
  rankChange?: number | null;
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
      <div className="flex items-center text-green-600 text-xs">
        <TrendingUp className="h-3 w-3 mr-1" />
        +{change.toLocaleString()}
      </div>
    );
  } else {
    return (
      <div className="flex items-center text-red-600 text-xs">
        <TrendingDown className="h-3 w-3 mr-1" />
        {change.toLocaleString()}
      </div>
    );
  }
}

// Column configuration for ResponsiveTable
const getTop25ManagerColumns = (): ResponsiveTableColumn<Top25Manager>[] => [
  {
    key: 'rank',
    header: 'Rank',
    priority: 'essential',
    align: 'center',
    mobileLabel: 'Rank',
    cardOrder: 1,
    sortable: true,
    render: (value, manager) => (
      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto">
        <span className="text-white font-bold text-sm">#{manager.rank}</span>
      </div>
    )
  },
  {
    key: 'name',
    header: 'Manager',
    priority: 'essential',
    align: 'left',
    mobileLabel: 'Manager',
    cardOrder: 2,
    sortable: true,
    render: (value, manager) => (
      <div className="font-medium">{manager.name}</div>
    )
  },
  {
    key: 'latestTracking.overallRank',
    header: 'Current Rank',
    priority: 'important',
    align: 'left',
    mobileLabel: 'Current Rank',
    cardOrder: 3,
    sortable: true,
    render: (value, manager) => {
      const rank = manager.latestTracking?.overallRank;
      if (rank !== undefined && rank !== null) {
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant={getRankBadgeVariant(rank)} className="font-mono">
                #{rank.toLocaleString()}
              </Badge>
              {getRankChangeDisplay(manager.rankChange)}
            </div>
          </div>
        );
      }
      return <span className="text-muted-foreground text-sm">Loading...</span>;
    }
  },
  {
    key: 'latestTracking.overallPoints',
    header: 'Total Points',
    priority: 'important',
    align: 'right',
    mobileLabel: 'Points',
    cardOrder: 4,
    sortable: true,
    className: 'font-mono',
    render: (value, manager) => {
      const points = manager.latestTracking?.overallPoints;
      return points !== undefined && points !== null ? points : "N/A";
    }
  },
  {
    key: 'latestTracking.gameweekPoints',
    header: 'GW Points',
    priority: 'secondary',
    align: 'right',
    mobileLabel: 'GW Points',
    cardOrder: 5,
    sortable: true,
    className: 'font-mono',
    render: (value, manager) => {
      const gwPoints = manager.latestTracking?.gameweekPoints;
      return gwPoints !== undefined && gwPoints !== null ? gwPoints : "N/A";
    }
  },
  {
    key: 'latestTracking.squadValue',
    header: 'Squad Value',
    priority: 'secondary',
    align: 'right',
    mobileLabel: 'Squad',
    cardOrder: 6,
    sortable: true,
    className: 'font-mono',
    render: (value, manager) => {
      const teamValue = manager.latestTracking?.teamValue;
      const bank = manager.latestTracking?.bank;
      if (teamValue === undefined || teamValue === null) return "N/A";
      const bankValue = bank !== undefined && bank !== null ? bank : 0;
      return `£${((teamValue - bankValue) / 10).toFixed(1)}m`;
    }
  },
  {
    key: 'latestTracking.bank',
    header: 'Bank',
    priority: 'optional',
    align: 'right',
    mobileLabel: 'Bank',
    cardOrder: 7,
    sortable: true,
    className: 'font-mono',
    render: (value, manager) => {
      const bank = manager.latestTracking?.bank;
      return bank !== undefined && bank !== null 
        ? `£${(bank / 10).toFixed(1)}m` 
        : "N/A";
    }
  },
  {
    key: 'latestTracking.totalTransfers',
    header: 'Transfers',
    priority: 'optional',
    align: 'right',
    mobileLabel: 'Transfers',
    cardOrder: 7,
    sortable: true,
    className: 'font-mono',
    render: (value, manager) => {
      const transfers = manager.latestTracking?.totalTransfers;
      return transfers !== undefined && transfers !== null ? transfers : "N/A";
    }
  },
  {
    key: 'latestTracking.chipsUsed',
    header: 'Chips',
    priority: 'optional',
    align: 'right',
    mobileLabel: 'Chips',
    cardOrder: 8,
    sortable: true,
    className: 'font-mono',
    render: (value, manager) => {
      const chips = manager.latestTracking?.chipsUsed;
      return chips !== undefined ? chips : "N/A";
    }
  }
];

export default function Top25Managers() {
  const [managersWithData, setManagersWithData] = useState<Top25Manager[]>(TOP_25_MANAGERS);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sortField, setSortField] = useState<string>('rank');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [, navigate] = useLocation();

  // Fetch top 50 managers with rank change data
  const { data: top50Data, isLoading: isLoadingTop50 } = useQuery({
    queryKey: ['/api/top50-managers'],
    refetchInterval: 30000,
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

  // Update managers with rank change data when top50Data is available
  useEffect(() => {
    if (top50Data) {
      const updatedManagers = managersWithData.map(manager => {
        const top50Manager = top50Data.find((m: any) => m.managerId === manager.managerId);
        return {
          ...manager,
          rankChange: top50Manager?.rankChange || null
        };
      });
      setManagersWithData(updatedManagers);
    }
  }, [top50Data]);

  // Sorting logic
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sort the managers data
  const sortedManagersData = useMemo(() => {
    const sorted = [...managersWithData].sort((a, b) => {
      const getValue = (manager: Top25Manager, field: string) => {
        switch (field) {
          case 'rank':
            return manager.rank;
          case 'latestTracking.overallRank':
            return manager.latestTracking?.overallRank || Number.MAX_SAFE_INTEGER;
          case 'latestTracking.overallPoints':
            return manager.latestTracking?.overallPoints || 0;
          case 'latestTracking.gameweekPoints':
            return manager.latestTracking?.gameweekPoints || 0;
          case 'latestTracking.teamValue':
            return manager.latestTracking?.teamValue || 0;
          case 'latestTracking.totalTransfers':
            return manager.latestTracking?.totalTransfers || 0;
          case 'latestTracking.chipsUsed':
            return manager.latestTracking?.chipsUsed || 0;
          case 'name':
            return manager.name;
          default:
            return 0;
        }
      };

      const aVal = getValue(a, sortField);
      const bVal = getValue(b, sortField);
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      return sortDirection === 'asc' 
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    return sorted;
  }, [managersWithData, sortField, sortDirection]);

  return (
    <div className="fpl-page-wrapper">
      <div className="fpl-container fpl-content-area">
        {/* Page Header */}
        <div className="fpl-page-header">
          <div className="fpl-page-header-content">
            <div className="fpl-page-title">
              <Crown className="h-8 w-8" />
              <h1>Top 25 Managers (All Time)</h1>
            </div>
            <p className="fpl-page-subtitle">
              Elite Fantasy Premier League managers and their current standings
            </p>
          </div>
        </div>

        <Tabs defaultValue="managers" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="managers" data-testid="tab-managers">
              <Crown className="h-4 w-4 mr-2" />
              Managers
            </TabsTrigger>
            <TabsTrigger value="team-analysis" data-testid="tab-team-analysis">
              <BarChart3 className="h-4 w-4 mr-2" />
              Team Analysis
            </TabsTrigger>
          </TabsList>

          <TabsContent value="managers">
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
                <ResponsiveTable
                  data={sortedManagersData}
                  columns={getTop25ManagerColumns()}
                  enableMobileCards={true}
                  mobileCardTitle={(manager) => manager.name}
                  loading={isRefreshing}
                  emptyMessage="No manager data available"
                  onRowClick={(manager) => {
                    navigate(`/top25-managers/${manager.rank}/team`);
                  }}
                  onSort={handleSort}
                  sortField={sortField}
                  sortDirection={sortDirection}
                  className="hover:shadow-sm"
                  stickyHeader={true}
                  enableHorizontalScroll={true}
                  getRowTestId={(manager, index) => `row-manager-${manager.rank || index}`}
                  data-testid="top25-managers-table"
                />
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
          </TabsContent>

          <TabsContent value="team-analysis">
            <Top25TeamAnalysis />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}