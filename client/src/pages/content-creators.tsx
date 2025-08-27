import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Users, 
  TrendingUp, 
  Target, 
  Youtube, 
  Twitter, 
  Plus, 
  RefreshCw, 
  Activity, 
  BarChart3, 
  Calendar,
  ArrowUpDown,
  Eye,
  Edit,
  Trophy,
  Star,
  Zap,
  DollarSign,
  TrendingDown,
  Crown
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { FplContentCreator, FplCreatorTracking } from "@shared/schema";

interface CreatorWithLatestData extends FplContentCreator {
  latestTracking?: FplCreatorTracking;
  rankChange?: number;
  pointsThisGw?: number;
}

// Helper functions
function getPlatformIcon(platform: string) {
  switch (platform.toLowerCase()) {
    case 'youtube':
      return <Youtube className="h-4 w-4 text-red-600" />;
    case 'twitter':
      return <Twitter className="h-4 w-4 text-blue-500" />;
    case 'podcast':
      return <Star className="h-4 w-4 text-purple-600" />;
    case 'blog':
      return <Trophy className="h-4 w-4 text-green-600" />;
    case 'tiktok':
      return <Activity className="h-4 w-4 text-black" />;
    case 'instagram':
      return <BarChart3 className="h-4 w-4 text-pink-500" />;
    default:
      return <Trophy className="h-4 w-4 text-gray-500" />;
  }
}

function getRankBadgeVariant(rank?: number): "default" | "secondary" | "destructive" | "outline" {
  if (!rank) return "outline";
  if (rank <= 10000) return "default";
  if (rank <= 100000) return "secondary";
  return "outline";
}

function formatRank(rank?: number): string {
  if (!rank) return "N/A";
  if (rank >= 1000000) return `${(rank / 1000000).toFixed(1)}M`;
  if (rank >= 1000) return `${(rank / 1000).toFixed(0)}K`;
  return rank.toLocaleString();
}

function formatPoints(points?: number): string {
  if (!points) return "N/A";
  return points.toLocaleString();
}

function getRankChangeDisplay(change: number) {
  if (change > 0) {
    return (
      <div className="flex items-center text-green-600 text-xs">
        <TrendingUp className="h-3 w-3 mr-1" />
        +{change.toLocaleString()}
      </div>
    );
  } else if (change < 0) {
    return (
      <div className="flex items-center text-red-600 text-xs">
        <TrendingDown className="h-3 w-3 mr-1" />
        {change.toLocaleString()}
      </div>
    );
  }
  return (
    <div className="flex items-center text-gray-500 text-xs">
      <Star className="h-3 w-3 mr-1" />
      No change
    </div>
  );
}

// Creator Table Row Component
function CreatorTableRow({ creator }: { creator: CreatorWithLatestData }) {
  const latest = creator.latestTracking;

  const handleViewTeam = async (creatorId: number) => {
    try {
      const response = await fetch(`/api/content-creators/${creatorId}/team`);
      const teamData = await response.json();
      
      console.log("Team data:", teamData);
      alert(`Fetched team data with ${teamData.picks?.length || 0} players`);
    } catch (error) {
      alert("Failed to fetch team data");
    }
  };

  const handleViewTransfers = async (creatorId: number) => {
    try {
      const response = await fetch(`/api/content-creators/${creatorId}/transfers`);
      const transferData = await response.json();
      
      console.log("Transfer data:", transferData);
      alert(`Found ${transferData.length || 0} transfers`);
    } catch (error) {
      alert("Failed to fetch transfer data");
    }
  };

  return (
    <TableRow className="hover:bg-muted/50">
      <TableCell>
        <div className="flex items-center gap-3">
          {getPlatformIcon(creator.platform)}
          <div>
            <div className="font-medium">{creator.name}</div>
            <div className="text-sm text-muted-foreground">{creator.handle}</div>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-right font-mono">
        {creator.managerId}
      </TableCell>
      <TableCell>
        {creator.playerName || 'N/A'}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex flex-col items-end">
          <Badge variant={getRankBadgeVariant(latest?.overallRank)} className="mb-1">
            {latest?.overallRank ? `#${latest.overallRank.toLocaleString()}` : "N/A"}
          </Badge>
          {creator.rankChange && (
            <div className="text-xs">{getRankChangeDisplay(creator.rankChange)}</div>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right font-mono">
        {latest?.overallPoints || "0"}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex flex-col items-end">
          <span className="font-mono font-bold">{latest?.gameweekPoints || "0"}</span>
          {latest?.gameweekRank && (
            <span className="text-xs text-muted-foreground">#{latest.gameweekRank.toLocaleString()}</span>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right font-mono">
        £{latest?.teamValue || 'N/A'}m
      </TableCell>
      <TableCell className="text-right font-mono">
        {latest?.totalTransfers || "0"}
      </TableCell>
      <TableCell className="text-center">
        <div className="flex gap-1 justify-center">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleViewTeam(creator.id)}
            className="h-8 px-2"
            title="View Team"
          >
            <Eye className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleViewTransfers(creator.id)}
            className="h-8 px-2"
            title="View Transfers"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function ContentCreators() {
  const { toast } = useToast();
  const [selectedCreator, setSelectedCreator] = useState<number | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'rank' | 'points' | 'gw_points' | 'name'>('rank');

  // Fetch all content creators with their latest tracking data
  const { data: creators, isLoading, refetch } = useQuery<CreatorWithLatestData[]>({
    queryKey: ["/api/content-creators"],
  });

  // Fetch tracking history for selected creator
  const { data: trackingHistory } = useQuery<FplCreatorTracking[]>({
    queryKey: ["/api/content-creators", selectedCreator, "history"],
    enabled: !!selectedCreator,
  });

  // Refresh data mutation
  const refreshDataMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/content-creators/refresh", {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to refresh data");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Data Refreshed",
        description: "Content creator data has been updated with latest FPL information.",
      });
      refetch();
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Refresh Failed",
        description: "Failed to refresh content creator data.",
      });
    }
  });

  const handleRefresh = () => {
    refreshDataMutation.mutate();
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'youtube':
        return <Youtube className="h-4 w-4 text-red-600" />;
      case 'twitter':
        return <Twitter className="h-4 w-4 text-blue-500" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const getRankBadgeVariant = (rank: number | null) => {
    if (!rank) return "outline";
    if (rank <= 10000) return "default";
    if (rank <= 100000) return "secondary";
    return "outline";
  };

  const formatRank = (rank: number | null) => {
    if (!rank || rank === 0) return "N/A";
    return `#${rank.toLocaleString()}`;
  };

  const formatPoints = (points: number | null | undefined): string => {
    if (!points || points === 0) return "0";
    return points.toString();
  };



  const getRankChangeDisplay = (change: number | undefined) => {
    if (!change || change === 0) return null;
    if (change > 0) {
      return <span className="text-green-600 text-xs flex items-center gap-1"><TrendingUp className="h-3 w-3" />+{change.toLocaleString()}</span>;
    }
    return <span className="text-red-600 text-xs flex items-center gap-1"><TrendingDown className="h-3 w-3" />{change.toLocaleString()}</span>;
  };

  const sortedCreators = creators ? [...creators].sort((a, b) => {
    switch (sortBy) {
      case 'rank':
        return (a.latestTracking?.overallRank || 999999) - (b.latestTracking?.overallRank || 999999);
      case 'points':
        return (b.latestTracking?.overallPoints || 0) - (a.latestTracking?.overallPoints || 0);
      case 'gw_points':
        return (b.latestTracking?.gameweekPoints || 0) - (a.latestTracking?.gameweekPoints || 0);
      case 'name':
        return a.name.localeCompare(b.name);
      default:
        return 0;
    }
  }) : [];

  if (isLoading) {
    return (
      <div className="fpl-page-container">
        <div className="animate-pulse space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-muted/20 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="fpl-page-container">
      {/* Page Header */}
      <div className="fpl-page-header">
        <div className="fpl-page-title">
          <Users className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" />
          FPL Content Creators
        </div>
        <p className="fpl-page-subtitle">
          Track ranks, teams, and transfers of top FPL content creators
        </p>
      </div>

      <div className="fpl-section-spacing">
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <Button
            onClick={handleRefresh}
            disabled={refreshDataMutation.isPending}
            variant="default"
            data-testid="button-refresh-data"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshDataMutation.isPending ? 'animate-spin' : ''}`} />
            {refreshDataMutation.isPending ? 'Refreshing...' : 'Refresh FPL Data'}
          </Button>

          <div className="text-sm text-muted-foreground">
            Click column headers to sort • Showing {sortedCreators.length} creators
          </div>
        </div>

        {/* Content Creators Table */}
        {sortedCreators.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Creator</TableHead>
                  <TableHead className="text-right">Manager ID</TableHead>
                  <TableHead className="w-[150px]">Player Name</TableHead>
                  <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => setSortBy('rank')}>
                    Overall Rank {sortBy === 'rank' && <ArrowUpDown className="h-4 w-4 inline ml-1" />}
                  </TableHead>
                  <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => setSortBy('points')}>
                    Total Points {sortBy === 'points' && <ArrowUpDown className="h-4 w-4 inline ml-1" />}
                  </TableHead>
                  <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => setSortBy('gw_points')}>
                    GW Points {sortBy === 'gw_points' && <ArrowUpDown className="h-4 w-4 inline ml-1" />}
                  </TableHead>
                  <TableHead className="text-right">Team Value</TableHead>
                  <TableHead className="text-right">Transfers</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedCreators.map((creator) => (
                  <CreatorTableRow key={creator.id} creator={creator} />
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <Card className="bg-gray-50">
            <CardContent className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">Loading FPL content creators...</p>
              <Button onClick={handleRefresh} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Data
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Creator Details Dialog */}
        {selectedCreator && (
          <CreatorDetailsDialog
            creatorId={selectedCreator}
            trackingHistory={trackingHistory}
            onClose={() => setSelectedCreator(null)}
          />
        )}
      </div>
    </div>
  );
}

// Creator Card Component
function CreatorCard({ creator, onViewDetails }: { 
  creator: CreatorWithLatestData;
  onViewDetails: () => void;
}) {
  const latest = creator.latestTracking;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              {getPlatformIcon(creator.platform)}
              <span className="truncate">{creator.name}</span>
              {!creator.isActive && <Badge variant="secondary">Inactive</Badge>}
            </CardTitle>
            <CardDescription className="mt-1">
              @{creator.handle} • Team ID: {creator.teamId}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Performance Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <Badge variant={getRankBadgeVariant(latest?.overallRank)} className="mb-1">
                <Trophy className="h-3 w-3 mr-1" />
                {formatRank(latest?.overallRank)}
              </Badge>
              <p className="text-xs text-muted-foreground">Overall Rank</p>
              {creator.rankChange && (
                <div className="mt-1">{getRankChangeDisplay(creator.rankChange)}</div>
              )}
            </div>
            
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="font-bold text-lg">{formatPoints(latest?.overallPoints)}</p>
              <p className="text-xs text-muted-foreground">Total Points</p>
            </div>
          </div>

          {/* Latest Gameweek */}
          {latest && (
            <div className="flex items-center justify-between p-2 bg-purple-50 rounded">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium">GW{latest.gameweek}</span>
              </div>
              <div className="text-right">
                <p className="font-bold">{latest.gameweekPoints} pts</p>
                <p className="text-xs text-muted-foreground">
                  {latest.gameweekRank ? `#${latest.gameweekRank.toLocaleString()}` : 'N/A'}
                </p>
              </div>
            </div>
          )}

          {/* Team Value */}
          {latest?.teamValue && (
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                Team Value
              </span>
              <span className="font-mono">£{latest.teamValue}m</span>
            </div>
          )}

          {/* View Details Button */}
          <Button
            onClick={onViewDetails}
            variant="outline"
            size="sm"
            className="w-full"
            data-testid={`button-view-creator-${creator.id}`}
          >
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}



// Enhanced Creator Card with authentic FPL data (kept for potential future use)
function CreatorDataCard({ creator }: { creator: CreatorWithLatestData }) {
  const latest = creator.latestTracking;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              {getPlatformIcon(creator.platform)}
              <span className="truncate">{creator.name}</span>
              {!creator.isActive && <Badge variant="secondary">Inactive</Badge>}
            </CardTitle>
            <CardDescription className="mt-1">
              {creator.handle} • Team ID: {creator.teamId}
            </CardDescription>
            {creator.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{creator.description}</p>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Performance Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <Badge variant={getRankBadgeVariant(latest?.overallRank)} className="mb-1">
                <Trophy className="h-3 w-3 mr-1" />
                {formatRank(latest?.overallRank)}
              </Badge>
              <p className="text-xs text-muted-foreground">Overall Rank</p>
              {creator.rankChange && (
                <div className="mt-1">{getRankChangeDisplay(creator.rankChange)}</div>
              )}
            </div>
            
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="font-bold text-lg">{formatPoints(latest?.overallPoints)}</p>
              <p className="text-xs text-muted-foreground">Total Points</p>
            </div>
          </div>

          {/* Latest Gameweek */}
          {latest && (
            <div className="flex items-center justify-between p-2 bg-purple-50 rounded">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium">GW{latest.gameweek}</span>
              </div>
              <div className="text-right">
                <p className="font-bold">{latest.gameweekPoints} pts</p>
                <p className="text-xs text-muted-foreground">
                  {latest.gameweekRank ? `#${latest.gameweekRank.toLocaleString()}` : 'N/A'}
                </p>
              </div>
            </div>
          )}

          {/* Team & Transfer Info */}
          <div className="space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              {latest?.teamValue && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    Team Value
                  </span>
                  <span className="font-mono">£{latest.teamValue || 'N/A'}m</span>
                </div>
              )}
              {latest?.totalTransfers !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <RefreshCw className="h-3 w-3" />
                    Transfers
                  </span>
                  <span className="font-mono">{latest.totalTransfers}</span>
                </div>
              )}
            </div>
            
            {/* Captain Info */}
            {latest?.captainPlayerName && (
              <div className="flex items-center justify-between p-1 bg-yellow-50 rounded">
                <span className="flex items-center gap-1">
                  <Crown className="h-3 w-3 text-yellow-600" />
                  Captain
                </span>
                <span className="font-medium">{latest.captainPlayerName}</span>
              </div>
            )}
            
            {/* Recent Transfers */}
            {(latest?.transfersIn || latest?.transfersOut) && (
              <div className="p-1 bg-blue-50 rounded">
                <div className="flex items-center gap-1 mb-1">
                  <RefreshCw className="h-3 w-3 text-blue-600" />
                  <span className="font-medium">GW{latest.gameweek} Transfers</span>
                </div>
                {latest.transfersIn && latest.transfersIn.length > 0 && (
                  <div className="text-green-600">
                    ↗ In: {latest.transfersIn.map((t: any) => t.playerName).join(', ')}
                  </div>
                )}
                {latest.transfersOut && latest.transfersOut.length > 0 && (
                  <div className="text-red-600">
                    ↙ Out: {latest.transfersOut.map((t: any) => t.playerName).join(', ')}
                  </div>
                )}
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                onClick={() => handleViewTeam(creator.id)}
                className="flex items-center justify-center gap-1 px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 rounded"
              >
                <Eye className="h-3 w-3" />
                View Team
              </button>
              <button
                onClick={() => handleViewTransfers(creator.id)}
                className="flex items-center justify-center gap-1 px-2 py-1 text-xs bg-green-100 hover:bg-green-200 rounded"
              >
                <RefreshCw className="h-3 w-3" />
                Transfers
              </button>
            </div>
          </div>

          {/* Platform & Followers */}
          <div className="flex items-center justify-between text-xs border-t pt-2">
            <span className="text-muted-foreground">{creator.platform}</span>
            {creator.followers && (
              <span className="text-muted-foreground">
                {creator.followers >= 1000000 
                  ? `${(creator.followers / 1000000).toFixed(1)}M followers`
                  : `${(creator.followers / 1000).toFixed(0)}K followers`
                }
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Creator Details Dialog Component
function CreatorDetailsDialog({
  creatorId,
  trackingHistory,
  onClose
}: {
  creatorId: number;
  trackingHistory?: FplCreatorTracking[];
  onClose: () => void;
}) {
  const { data: creator } = useQuery<FplContentCreator>({
    queryKey: ["/api/content-creators", creatorId],
  });

  if (!creator) return null;

  const latest = trackingHistory?.[0];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getPlatformIcon(creator.platform)}
            {creator.name}
          </DialogTitle>
          <DialogDescription>
            Performance tracking and team analysis
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="team">Team Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {latest && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <Trophy className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
                    <p className="text-2xl font-bold">{formatRank(latest.overallRank)}</p>
                    <p className="text-sm text-muted-foreground">Overall Rank</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <Star className="h-8 w-8 mx-auto mb-2 text-green-600" />
                    <p className="text-2xl font-bold">{formatPoints(latest.overallPoints)}</p>
                    <p className="text-sm text-muted-foreground">Total Points</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <Zap className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                    <p className="text-2xl font-bold">{latest.gameweekPoints}</p>
                    <p className="text-sm text-muted-foreground">GW{latest.gameweek} Points</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <DollarSign className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                    <p className="text-2xl font-bold">£{latest.teamValue}m</p>
                    <p className="text-sm text-muted-foreground">Team Value</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {trackingHistory && trackingHistory.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>GW</TableHead>
                    <TableHead>Rank</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>GW Points</TableHead>
                    <TableHead>Team Value</TableHead>
                    <TableHead>Transfers</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trackingHistory.slice(0, 10).map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.gameweek}</TableCell>
                      <TableCell>{formatRank(record.overallRank)}</TableCell>
                      <TableCell>{formatPoints(record.overallPoints)}</TableCell>
                      <TableCell>{record.gameweekPoints}</TableCell>
                      <TableCell>£{record.teamValue}m</TableCell>
                      <TableCell>{record.hitsTaken ? `${record.hitsTaken} hits` : 'No hits'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-8">No tracking history available.</p>
            )}
          </TabsContent>

          <TabsContent value="team" className="space-y-4">
            {latest && (
              <div className="space-y-4">
                {latest.captainPlayerName && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Crown className="h-5 w-5 text-yellow-600" />
                        Captain & Vice-Captain
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="font-medium">Captain</p>
                          <p className="text-sm text-muted-foreground">{latest.captainPlayerName}</p>
                        </div>
                        <div>
                          <p className="font-medium">Vice-Captain</p>
                          <p className="text-sm text-muted-foreground">{latest.viceCaptainPlayerName || 'N/A'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <RefreshCw className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">Transfers</span>
                      </div>
                      <p className="text-2xl font-bold">{latest.totalTransfers}</p>
                      <p className="text-sm text-muted-foreground">Total made</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="font-medium">Bank</span>
                      </div>
                      <p className="text-2xl font-bold">£{latest.bank}m</p>
                      <p className="text-sm text-muted-foreground">Available</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Chips Used */}
                <Card>
                  <CardHeader>
                    <CardTitle>Chips Used</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <Badge variant={latest.wildcardUsed ? "default" : "outline"}>
                        Wildcard {latest.wildcardUsed ? "✓" : ""}
                      </Badge>
                      <Badge variant={latest.benchBoostUsed ? "default" : "outline"}>
                        Bench Boost {latest.benchBoostUsed ? "✓" : ""}
                      </Badge>
                      <Badge variant={latest.freeHitUsed ? "default" : "outline"}>
                        Free Hit {latest.freeHitUsed ? "✓" : ""}
                      </Badge>
                      <Badge variant={latest.tripleCaptainUsed ? "default" : "outline"}>
                        Triple Captain {latest.tripleCaptainUsed ? "✓" : ""}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default ContentCreators;