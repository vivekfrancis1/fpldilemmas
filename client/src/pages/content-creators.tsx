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
  managerId: number;
  managerName: string;
  playerName?: string;
  description?: string;
  twitterHandle?: string | null;
  youtubeUrl?: string | null;
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
          <Users className="h-4 w-4 text-blue-600" />
          <div>
            <div className="font-medium">{creator.name}</div>
            {creator.description && (
              <div className="text-xs text-muted-foreground mt-1 max-w-xs">{creator.description}</div>
            )}
            <div className="flex flex-wrap gap-3 mt-2">
              {creator.twitterHandle && (
                <a
                  href={`https://x.com/${creator.twitterHandle.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                  data-testid={`link-creator-twitter-${creator.id}`}
                >
                  {creator.twitterHandle}
                </a>
              )}
              {creator.youtubeUrl && (
                <a
                  href={creator.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-red-600 hover:underline break-all"
                  data-testid={`link-creator-youtube-${creator.id}`}
                >
                  {creator.youtubeUrl.split('/').pop() || 'YouTube'}
                </a>
              )}
            </div>
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
      <div className="fpl-page-wrapper">
        <div className="fpl-container fpl-content-area">
          {/* Page Header */}
          <div className="fpl-page-header">
            <div className="fpl-page-header-content">
              <div className="fpl-page-title">
                <Users className="h-8 w-8" />
                <h1>FPL Content Creators</h1>
              </div>
              <p className="fpl-page-subtitle">
                Track performance of top Fantasy Premier League content creators and influencers
              </p>
            </div>
          </div>

          {/* Loading State */}
          <div className="fpl-loading">
            <RefreshCw className="fpl-loading-spinner" />
            <p className="fpl-loading-text">Loading content creators data...</p>
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
              <Users className="h-8 w-8" />
              <h1>FPL Content Creators</h1>
            </div>
            <p className="fpl-page-subtitle">
              Track performance of top Fantasy Premier League content creators and influencers
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="fpl-controls">
          <div className="fpl-controls-left">
            <Button
              onClick={() => refreshDataMutation.mutate()}
              disabled={refreshDataMutation.isPending}
              className="fpl-button-primary"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshDataMutation.isPending ? 'animate-spin' : ''}`} />
              {refreshDataMutation.isPending ? 'Refreshing...' : 'Refresh FPL Data'}
            </Button>
            <Link href="/">
              <Button variant="outline" className="fpl-button-secondary">
                <Home className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
          <div className="fpl-controls-right">
            <p className="fpl-text-muted">
              Click column headers to sort • Showing {sortedCreators?.length || 0} creators
            </p>
          </div>
        </div>

        {/* Content Creators Table */}
        {sortedCreators && sortedCreators.length > 0 ? (
          <div className="fpl-table-container">
            <div className="fpl-table-scroll">
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
          </div>
        ) : (
          <div className="fpl-empty">
            <Users className="fpl-empty-icon" />
            <h3 className="fpl-empty-title">No Content Creators Found</h3>
            <p className="fpl-empty-message">
              Get started by adding some FPL content creators to track their performance.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}