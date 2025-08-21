import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Shield, TrendingUp, TrendingDown, Users, Trophy, Clock } from "lucide-react";
import { useEffect } from "react";

interface FplTeam {
  id: number;
  name: string;
  teamName: string;
  gameweek: number;
  totalPoints: number;
  gameweekPoints: number;
  rank: number;
  lastRank: number;
  bank: number;
  teamValue: number;
  transfers: number;
  transfersRemaining: number;
}

interface Transfer {
  id: number;
  gameweek: number;
  playerIn: string;
  playerOut: string;
  cost: number;
  date: string;
}

export default function FplTeamPage() {
  const { user, isAuthenticated, sessionId } = useAuth();

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated && sessionId === null) {
      window.location.href = "/auth/login";
    }
  }, [isAuthenticated, sessionId]);

  const { data: teamData, isLoading: teamLoading, error: teamError } = useQuery({
    queryKey: ['/api/fpl/team'],
    queryFn: async (): Promise<{ success: boolean; team: FplTeam }> => {
      const response = await fetch('/api/fpl/team', {
        headers: {
          'X-Session-ID': sessionId || '',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch team');
      }

      return response.json();
    },
    enabled: !!sessionId && !!user?.fplTeamId,
    retry: false,
  });

  const { data: transferData, isLoading: transfersLoading } = useQuery({
    queryKey: ['/api/fpl/transfers'],
    queryFn: async (): Promise<{ success: boolean; transfers: Transfer[] }> => {
      const response = await fetch('/api/fpl/transfers', {
        headers: {
          'X-Session-ID': sessionId || '',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch transfers');
      }

      return response.json();
    },
    enabled: !!sessionId && !!user?.fplTeamId,
  });

  const { data: statusData } = useQuery({
    queryKey: ['/api/fpl/status'],
    queryFn: async () => {
      const response = await fetch('/api/fpl/status', {
        headers: {
          'X-Session-ID': sessionId || '',
        },
      });
      return response.json();
    },
    enabled: !!sessionId,
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">Authentication Required</h3>
              <p className="text-muted-foreground mt-2">Please login to view your FPL team.</p>
              <Button 
                className="mt-4" 
                onClick={() => window.location.href = "/auth/login"}
              >
                Login to Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user?.fplTeamId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">FPL Team Not Connected</h3>
              <p className="text-muted-foreground mt-2">Connect your FPL team to view your data.</p>
              <Button 
                className="mt-4" 
                onClick={() => window.location.href = "/auth/setup-team"}
              >
                Connect FPL Team
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const team = teamData?.team;
  const transfers = transferData?.transfers || [];

  if (teamError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-red-500">
                <Trophy className="mx-auto h-12 w-12 mb-4" />
              </div>
              <h3 className="text-lg font-semibold">Error Loading Team</h3>
              <p className="text-muted-foreground mt-2">{teamError.message}</p>
              <Button 
                className="mt-4" 
                onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/fpl/team'] })}
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">My FPL Team</h1>
        <p className="text-muted-foreground">
          Connected as {user?.firstName} {user?.lastName} • {user?.provider}
        </p>
      </div>

      {teamLoading ? (
        <div className="grid gap-6 md:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                  <div className="h-8 bg-muted rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : team ? (
        <>
          {/* Team Overview */}
          <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Team Name</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{team.teamName}</div>
                <p className="text-sm text-muted-foreground">Manager: {team.name}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Points</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{team.totalPoints?.toLocaleString()}</div>
                <p className="text-sm text-muted-foreground">Gameweek: {team.gameweekPoints}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Overall Rank</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{team.rank?.toLocaleString()}</div>
                <div className="flex items-center text-sm">
                  {team.rank < team.lastRank ? (
                    <>
                      <TrendingUp className="mr-1 h-3 w-3 text-green-600" />
                      <span className="text-green-600">↗ {(team.lastRank - team.rank).toLocaleString()}</span>
                    </>
                  ) : team.rank > team.lastRank ? (
                    <>
                      <TrendingDown className="mr-1 h-3 w-3 text-red-600" />
                      <span className="text-red-600">↘ {(team.rank - team.lastRank).toLocaleString()}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">No change</span>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Team Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">£{(team.teamValue / 10).toFixed(1)}m</div>
                <p className="text-sm text-muted-foreground">Bank: £{(team.bank / 10).toFixed(1)}m</p>
              </CardContent>
            </Card>
          </div>

          {/* Transfer Info */}
          <Card>
            <CardHeader>
              <CardTitle>Transfer Information</CardTitle>
              <CardDescription>Your transfer activity and remaining transfers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Transfers Made</div>
                  <div className="text-2xl font-bold">{team.transfers}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Transfers Remaining</div>
                  <div className="text-2xl font-bold text-green-600">{team.transfersRemaining}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Transfers */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Transfers</CardTitle>
              <CardDescription>Your latest transfer activity</CardDescription>
            </CardHeader>
            <CardContent>
              {transfersLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse space-y-2">
                      <div className="h-4 bg-muted rounded w-full"></div>
                      <div className="h-3 bg-muted rounded w-3/4"></div>
                    </div>
                  ))}
                </div>
              ) : transfers.length > 0 ? (
                <div className="space-y-4">
                  {transfers.slice(0, 5).map((transfer, index) => (
                    <div key={index} className="flex items-center justify-between py-2">
                      <div className="flex-1">
                        <div className="text-sm">
                          <span className="font-medium text-green-600">{transfer.playerIn}</span>
                          <span className="text-muted-foreground"> → </span>
                          <span className="font-medium text-red-600">{transfer.playerOut}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Gameweek {transfer.gameweek} • {new Date(transfer.date).toLocaleDateString()}
                        </div>
                      </div>
                      <Badge variant={transfer.cost > 0 ? "destructive" : "secondary"}>
                        {transfer.cost > 0 ? `-${transfer.cost}pt` : 'Free'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="mx-auto h-8 w-8 mb-2" />
                  No transfers yet this season
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Info */}
          {statusData && (
            <Card>
              <CardHeader>
                <CardTitle>Connection Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Authentication:</span>
                    <Badge variant={statusData.authenticated ? "default" : "destructive"}>
                      {statusData.authenticated ? "Connected" : "Disconnected"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>FPL Team:</span>
                    <Badge variant={statusData.fplTeamConnected ? "default" : "secondary"}>
                      {statusData.fplTeamConnected ? "Connected" : "Not Connected"}
                    </Badge>
                  </div>
                  {statusData.fplTeam && (
                    <div className="flex justify-between">
                      <span>Team ID:</span>
                      <span className="font-mono text-sm">{statusData.fplTeam.teamId}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <div className="text-center py-8">
          <Trophy className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Team Data</h3>
          <p className="text-muted-foreground">Unable to load your FPL team data.</p>
        </div>
      )}
    </div>
  );
}