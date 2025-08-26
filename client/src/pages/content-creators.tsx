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
  Crown, 
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
  TrendingDown
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { FplContentCreator, FplCreatorTracking } from "@shared/schema";

interface CreatorWithLatestData extends FplContentCreator {
  latestTracking?: FplCreatorTracking;
  rankChange?: number;
  pointsThisGw?: number;
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
    if (!rank) return "N/A";
    return `#${rank.toLocaleString()}`;
  };

  const formatPoints = (points: number | null) => {
    if (!points) return "0";
    return points.toLocaleString();
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
          <AddCreatorDialog 
            isOpen={isAddDialogOpen} 
            onOpenChange={setIsAddDialogOpen}
            onSuccess={() => refetch()}
          />
          
          <Button
            onClick={handleRefresh}
            disabled={refreshDataMutation.isPending}
            variant="outline"
            data-testid="button-refresh-data"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshDataMutation.isPending ? 'animate-spin' : ''}`} />
            {refreshDataMutation.isPending ? 'Refreshing...' : 'Refresh Data'}
          </Button>

          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rank">Overall Rank</SelectItem>
              <SelectItem value="points">Total Points</SelectItem>
              <SelectItem value="gw_points">GW Points</SelectItem>
              <SelectItem value="name">Name</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Content Creators Grid */}
        {sortedCreators.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sortedCreators.map((creator) => (
              <CreatorCard
                key={creator.id}
                creator={creator}
                onViewDetails={() => setSelectedCreator(creator.id)}
              />
            ))}
          </div>
        ) : (
          <Card className="bg-gray-50">
            <CardContent className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No content creators added yet.</p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Creator
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

// Add Creator Dialog Component
function AddCreatorDialog({ 
  isOpen, 
  onOpenChange, 
  onSuccess 
}: { 
  isOpen: boolean; 
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    handle: "",
    teamId: "",
    teamName: "",
    platform: "",
    description: "",
    website: "",
    followers: ""
  });

  const addCreatorMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/content-creators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          teamId: parseInt(data.teamId),
          followers: data.followers ? parseInt(data.followers) : null
        }),
      });
      if (!response.ok) throw new Error("Failed to add creator");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Creator Added",
        description: "Content creator has been added successfully.",
      });
      onSuccess();
      onOpenChange(false);
      setFormData({
        name: "",
        handle: "",
        teamId: "",
        teamName: "",
        platform: "",
        description: "",
        website: "",
        followers: ""
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add content creator.",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.handle || !formData.teamId || !formData.teamName || !formData.platform) {
      toast({
        variant: "destructive",
        title: "Missing Fields",
        description: "Please fill in all required fields.",
      });
      return;
    }
    addCreatorMutation.mutate(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-creator">
          <Plus className="h-4 w-4 mr-2" />
          Add Creator
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Content Creator</DialogTitle>
          <DialogDescription>
            Add a new FPL content creator to track their performance.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Creator name"
                data-testid="input-creator-name"
              />
            </div>
            <div>
              <Label htmlFor="handle">Handle *</Label>
              <Input
                id="handle"
                value={formData.handle}
                onChange={(e) => setFormData(prev => ({ ...prev, handle: e.target.value }))}
                placeholder="@handle"
                data-testid="input-creator-handle"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="teamId">FPL Team ID *</Label>
              <Input
                id="teamId"
                type="number"
                value={formData.teamId}
                onChange={(e) => setFormData(prev => ({ ...prev, teamId: e.target.value }))}
                placeholder="123456"
                data-testid="input-team-id"
              />
            </div>
            <div>
              <Label htmlFor="teamName">Team Name *</Label>
              <Input
                id="teamName"
                value={formData.teamName}
                onChange={(e) => setFormData(prev => ({ ...prev, teamName: e.target.value }))}
                placeholder="Team name"
                data-testid="input-team-name"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="platform">Platform *</Label>
              <Select value={formData.platform} onValueChange={(value) => setFormData(prev => ({ ...prev, platform: value }))}>
                <SelectTrigger data-testid="select-platform">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="YouTube">YouTube</SelectItem>
                  <SelectItem value="Twitter">Twitter</SelectItem>
                  <SelectItem value="Podcast">Podcast</SelectItem>
                  <SelectItem value="Blog">Blog</SelectItem>
                  <SelectItem value="TikTok">TikTok</SelectItem>
                  <SelectItem value="Instagram">Instagram</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="followers">Followers</Label>
              <Input
                id="followers"
                type="number"
                value={formData.followers}
                onChange={(e) => setFormData(prev => ({ ...prev, followers: e.target.value }))}
                placeholder="100000"
                data-testid="input-followers"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              value={formData.website}
              onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
              placeholder="https://..."
              data-testid="input-website"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of the creator..."
              rows={2}
              data-testid="textarea-description"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={addCreatorMutation.isPending} className="flex-1">
              {addCreatorMutation.isPending ? 'Adding...' : 'Add Creator'}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
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