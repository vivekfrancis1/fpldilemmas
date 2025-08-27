import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  Crown,
  DollarSign,
  Home,
  Plus,
  RefreshCw,
  Trophy,
  TrendingDown,
  TrendingUp,
  Users,
  Youtube,
  Zap,
  ArrowUpDown,
} from "lucide-react";
import { SiInstagram, SiTiktok } from "react-icons/si";

type FPLCreator = {
  id: number;
  name: string;
  handle: string;
  managerId: number;
  managerName: string;
  playerName?: string;
  platform: string;
  description?: string;
  website?: string;
  followers?: number;
  isActive: boolean;
  addedDate: string;
  lastUpdated: string;
  rankChange?: number;
  latestTracking?: FPLCreatorTracking;
};

type FPLCreatorTracking = {
  id: number;
  creatorId: number;
  gameweek: number;
  overallRank: number;
  overallPoints: number;
  gameweekPoints: number;
  gameweekRank?: number;
  teamValue: number;
  totalTransfers: number;
  recordedAt: string;
};

type CreatorWithLatestData = FPLCreator;

function getPlatformIcon(platform: string) {
  switch (platform.toLowerCase()) {
    case "youtube":
      return <Youtube className="h-4 w-4 text-red-600" />;
    case "twitter":
      return <Trophy className="h-4 w-4 text-blue-500" />;
    case "podcast":
      return <Crown className="h-4 w-4 text-purple-600" />;
    case "blog":
      return <Trophy className="h-4 w-4 text-green-600" />;
    case "tiktok":
      return <SiTiktok className="h-4 w-4 text-black" />;
    case "instagram":
      return <SiInstagram className="h-4 w-4 text-pink-500" />;
    default:
      return <Users className="h-4 w-4 text-gray-500" />;
  }
}

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

// Creator Table Row Component
function CreatorTableRow({ creator }: { creator: CreatorWithLatestData }) {
  const latest = creator.latestTracking;
  const [, setLocation] = useLocation();

  const handleViewTeam = (creatorId: number) => {
    setLocation(`/content-creators/${creatorId}/team`);
  };

  return (
    <TableRow className="hover:bg-muted/50">
      <TableCell>
        <div className="flex items-center gap-3">
          {getPlatformIcon(creator.platform)}
          <div>
            <div className="font-medium">{creator.name}</div>
            {creator.description && (
              <div className="text-xs text-muted-foreground mt-1 max-w-xs">{creator.description}</div>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="text-center">
        <span className="font-mono text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
          {creator.managerId}
        </span>
      </TableCell>
      <TableCell className="text-left">
        <span className="text-sm font-medium">
          {creator.playerName || 'N/A'}
        </span>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex flex-col items-end">
          <Badge variant={getRankBadgeVariant(latest?.overallRank)} className="mb-1">
            {latest?.overallRank ? `#${latest.overallRank.toLocaleString()}` : "N/A"}
          </Badge>
          {getRankChangeDisplay(creator.rankChange)}
        </div>
      </TableCell>
      <TableCell className="text-right font-mono">
        {latest?.overallPoints !== undefined && latest?.overallPoints !== null ? latest.overallPoints : "N/A"}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex flex-col items-end">
          <span className="font-mono font-bold">{latest?.gameweekPoints !== undefined && latest?.gameweekPoints !== null ? latest.gameweekPoints : "N/A"}</span>
          {latest?.gameweekRank && (
            <span className="text-xs text-muted-foreground">#{latest.gameweekRank.toLocaleString()}</span>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right font-mono">
        £{latest?.teamValue || 'N/A'}m
      </TableCell>
      <TableCell className="text-right font-mono">
        {latest?.totalTransfers !== undefined && latest?.totalTransfers !== null ? latest.totalTransfers : "N/A"}
      </TableCell>
      <TableCell className="text-center">
        <Button
          size="default"
          onClick={() => handleViewTeam(creator.id)}
          className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white"
          title="View Team"
        >
          View Team
        </Button>
      </TableCell>
    </TableRow>
  );
}

// Main Content Creators Component
export default function ContentCreators() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [sortBy, setSortBy] = useState<string>("rank");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const { data: creators, isLoading } = useQuery<FPLCreator[]>({
    queryKey: ["/api/content-creators"],
  });

  // Refresh FPL data mutation
  const refreshDataMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/content-creators/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error("Failed to refresh FPL data");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-creators"] });
      toast({
        title: "Success",
        description: "FPL data refreshed successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh FPL data. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Sort creators
  const sortedCreators = [...((creators || []) as FPLCreator[])].sort((a, b) => {
    let valueA, valueB;
    
    switch (sortBy) {
      case "rank":
        valueA = a.latestTracking?.overallRank || 999999999;
        valueB = b.latestTracking?.overallRank || 999999999;
        break;
      case "points":
        valueA = a.latestTracking?.overallPoints || 0;
        valueB = b.latestTracking?.overallPoints || 0;
        break;
      case "gw_points":
        valueA = a.latestTracking?.gameweekPoints || 0;
        valueB = b.latestTracking?.gameweekPoints || 0;
        break;
      case "name":
        valueA = a.name.toLowerCase();
        valueB = b.name.toLowerCase();
        break;
      case "managerId":
        valueA = a.managerId;
        valueB = b.managerId;
        break;
      default:
        return 0;
    }

    if (sortOrder === "asc") {
      return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
    } else {
      return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
    }
  });

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">FPL Content Creators</h1>
            <p className="text-muted-foreground">
              Track top FPL content creators
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading content creators...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">FPL Content Creators</h1>
          <p className="text-muted-foreground">
            Track top FPL content creators
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/">
            <Button variant="outline" size="sm">
              <Home className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <Button
          onClick={() => refreshDataMutation.mutate()}
          disabled={refreshDataMutation.isPending}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshDataMutation.isPending ? 'animate-spin' : ''}`} />
          {refreshDataMutation.isPending ? 'Refreshing...' : 'Refresh FPL Data'}
        </Button>

        <div className="text-sm text-muted-foreground">
          Click column headers to sort • Showing {sortedCreators?.length || 0} creators
        </div>
      </div>

      {/* Content Creators Table */}
      {sortedCreators && sortedCreators.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Creator</TableHead>
                <TableHead 
                  className="text-center cursor-pointer hover:bg-muted/50" 
                  onClick={() => handleSort('managerId')}
                >
                  Manager ID 
                  {sortBy === 'managerId' && <ArrowUpDown className="h-4 w-4 inline ml-1" />}
                </TableHead>
                <TableHead className="text-left">Player Name</TableHead>
                <TableHead 
                  className="text-right cursor-pointer hover:bg-muted/50" 
                  onClick={() => handleSort('rank')}
                >
                  Overall Rank 
                  {sortBy === 'rank' && <ArrowUpDown className="h-4 w-4 inline ml-1" />}
                </TableHead>
                <TableHead 
                  className="text-right cursor-pointer hover:bg-muted/50" 
                  onClick={() => handleSort('points')}
                >
                  Total Points 
                  {sortBy === 'points' && <ArrowUpDown className="h-4 w-4 inline ml-1" />}
                </TableHead>
                <TableHead 
                  className="text-right cursor-pointer hover:bg-muted/50" 
                  onClick={() => handleSort('gw_points')}
                >
                  GW Points 
                  {sortBy === 'gw_points' && <ArrowUpDown className="h-4 w-4 inline ml-1" />}
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
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Users className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Content Creators Found</h3>
            <p className="text-gray-500 text-center max-w-md">
              Get started by adding some FPL content creators to track their performance.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}