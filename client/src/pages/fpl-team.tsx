import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  Trophy, 
  TrendingUp, 
  DollarSign, 
  RefreshCw, 
  LogOut,
  Shield,
  Target,
  Star,
  ArrowUpDown
} from "lucide-react";
import { useFplAuth } from "@/hooks/useFplAuth";
import { FplLoginForm } from "@/components/fpl-login-form";
import type { FplTeam } from "@shared/fpl-auth-schema";

export default function FplTeamPage() {
  const { isAuthenticated, user, isLoading, logout, sessionId } = useFplAuth();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch team data
  const { 
    data: teamData, 
    isLoading: teamLoading, 
    error: teamError,
    refetch: refetchTeam
  } = useQuery<{ success: boolean; team: FplTeam }>({
    queryKey: ["/api/fpl/team"],
    enabled: isAuthenticated && !!sessionId,
    retry: false,
    staleTime: 30000, // 30 seconds
  });

  // Fetch transfer history
  const { 
    data: transfersData, 
    isLoading: transfersLoading 
  } = useQuery<{ success: boolean; transfers: any[] }>({
    queryKey: ["/api/fpl/transfers"],
    enabled: isAuthenticated && !!sessionId,
    retry: false,
    staleTime: 60000, // 1 minute
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetchTeam();
    setRefreshing(false);
  };

  const handleLogout = () => {
    logout();
  };

  // Show login form if not authenticated
  if (!isAuthenticated && !isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">My FPL Team</h1>
          <p className="text-lg text-muted-foreground">
            Connect your Fantasy Premier League account to view and manage your team
          </p>
        </div>
        
        <FplLoginForm onSuccess={() => {
          // Optional: Show success message or redirect
        }} />
      </div>
    );
  }

  // Show loading state
  if (isLoading || teamLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Loading your FPL team...</p>
        </div>
      </div>
    );
  }

  // Show error if team fetch failed
  if (teamError && !teamData) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Alert variant="destructive" data-testid="team-error">
          <AlertDescription>
            Failed to load your FPL team. Please try refreshing or login again.
          </AlertDescription>
        </Alert>
        <div className="mt-4 flex gap-2">
          <Button onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    );
  }

  const team = teamData?.team;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl" data-testid="fpl-team-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2" data-testid="team-name">
            {team?.name || user?.teamName || 'My Team'}
          </h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.firstName || 'Manager'}! 
            {team && (
              <span className="ml-2">
                Gameweek {team.event}
              </span>
            )}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            size="sm"
            data-testid="refresh-button"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            data-testid="logout-button"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {team && (
        <>
          {/* Key Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card data-testid="card-overall-points">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Overall Points</p>
                    <p className="text-2xl font-bold">{team.overallPoints.toLocaleString()}</p>
                  </div>
                  <Trophy className="w-8 h-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card data-testid="card-overall-rank">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Overall Rank</p>
                    <p className="text-2xl font-bold">{team.overallRank.toLocaleString()}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card data-testid="card-gameweek-points">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">GW Points</p>
                    <p className="text-2xl font-bold">{team.gameweekPoints}</p>
                  </div>
                  <Star className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card data-testid="card-team-value">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Team Value</p>
                    <p className="text-2xl font-bold">£{(team.teamValue / 10).toFixed(1)}m</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Team Management Tabs */}
          <Tabs defaultValue="squad" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="squad" data-testid="tab-squad">
                <Users className="w-4 h-4 mr-2" />
                Squad
              </TabsTrigger>
              <TabsTrigger value="transfers" data-testid="tab-transfers">
                <ArrowUpDown className="w-4 h-4 mr-2" />
                Transfers
              </TabsTrigger>
              <TabsTrigger value="stats" data-testid="tab-stats">
                <Target className="w-4 h-4 mr-2" />
                Statistics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="squad" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Current Squad
                  </CardTitle>
                  <CardDescription>
                    Your 15-player squad for Gameweek {team.event}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge variant="outline">
                        Free Transfers: {team.freeTransfers}
                      </Badge>
                      <Badge variant="outline">
                        Bank: £{(team.bank / 10).toFixed(1)}m
                      </Badge>
                      <Badge variant="outline">
                        Total Transfers: {team.totalTransfers}
                      </Badge>
                    </div>
                    
                    {team.picks && team.picks.length > 0 ? (
                      <div className="text-center py-8">
                        <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Squad Details</h3>
                        <p className="text-muted-foreground">
                          Found {team.picks.length} players in your squad
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                          Detailed player information will be integrated with our player database
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No squad data available</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="transfers" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowUpDown className="w-5 h-5" />
                    Transfer History
                  </CardTitle>
                  <CardDescription>
                    Your transfer activity this season
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {transfersLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
                      <p className="text-muted-foreground">Loading transfers...</p>
                    </div>
                  ) : transfersData?.transfers && transfersData.transfers.length > 0 ? (
                    <div className="text-center py-8">
                      <ArrowUpDown className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Transfer History</h3>
                      <p className="text-muted-foreground">
                        Found {transfersData.transfers.length} transfers this season
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Detailed transfer analysis coming soon
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <ArrowUpDown className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No transfers found</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="stats" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Season Performance</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Overall Points</span>
                      <span className="font-semibold">{team.overallPoints.toLocaleString()}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Overall Rank</span>
                      <span className="font-semibold">{team.overallRank.toLocaleString()}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Gameweek Rank</span>
                      <span className="font-semibold">{team.gameweekRank.toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Team Economics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Team Value</span>
                      <span className="font-semibold">£{(team.teamValue / 10).toFixed(1)}m</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Bank</span>
                      <span className="font-semibold">£{(team.bank / 10).toFixed(1)}m</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Free Transfers</span>
                      <span className="font-semibold">{team.freeTransfers}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}