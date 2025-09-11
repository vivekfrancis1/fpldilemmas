import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, ArrowLeft, Trophy } from "lucide-react";
import { Link, useLocation } from "wouter";

interface LeagueEntry {
  id: number;
  event_total: number;
  player_name: string;
  rank: number;
  last_rank: number;
  rank_sort: number;
  total: number;
  entry: number;
  entry_name: string;
}

interface LeagueAnalysisProps {
  leagueId: number;
  managerId: string;
  leagueName: string;
}

export default function LeagueAnalysisPage() {
  const [location] = useLocation();
  const params = new URLSearchParams(location.split('?')[1] || '');
  const leagueId = params.get('leagueId');
  const managerId = params.get('managerId');
  const leagueName = params.get('leagueName') || 'League Analysis';
  
  console.log('League Analysis Page - URL:', location);
  console.log('League Analysis Page - Params:', { leagueId, managerId, leagueName });

  if (!leagueId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Missing league information</p>
            <Link href="/">
              <Button variant="outline" className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { data: leagueData, isLoading, error } = useQuery({
    queryKey: [`/api/leagues-classic/${leagueId}/standings`],
    enabled: !!leagueId
  });

  const { data: leagueAnalysisData } = useQuery({
    queryKey: [`/api/leagues/${leagueId}/analyze`],
    enabled: !!leagueId
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-4">
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !leagueData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Failed to load league data</p>
            <Link href="/">
              <Button variant="outline" className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentManagerEntry = (leagueData as any).standings?.results?.find(
    (entry: any) => entry.entry.toString() === managerId
  );

  // Show top 100 or all entries if less than 100
  const allEntries = (leagueData as any).standings?.results || [];
  const topEntries = allEntries.length > 100 ? allEntries.slice(0, 100) : allEntries;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="fpl-heading-page flex items-center gap-2">
                <Trophy className="h-6 w-6" />
                {decodeURIComponent(leagueName)}
              </h1>
              <p className="text-muted-foreground">League ID: {leagueId}</p>
            </div>
          </div>
        </div>

        {/* League Standings */}
        <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <CardTitle className="fpl-heading-card flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Top 100 League Managers
            </CardTitle>
            <p className="text-muted-foreground">
              Showing {topEntries.length === 100 ? 'top 100' : 'all'} managers
              {allEntries.length > 100 && ` of ${allEntries.length} total members`}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topEntries.map((entry: any, index: number) => {
                const isCurrentManager = entry.entry.toString() === managerId;
                return (
                  <div 
                    key={entry.entry} 
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-200 ${
                      isCurrentManager ? 'bg-blue-50 border-blue-200 shadow-md' : 'hover:bg-gray-50 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-800' :
                        index === 1 ? 'bg-gray-100 text-gray-800' :
                        index === 2 ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {entry.rank}
                      </div>
                      <div>
                        <p className="font-medium">
                          {entry.player_name}
                          {isCurrentManager && <Badge className="ml-2 bg-blue-600">You</Badge>}
                        </p>
                        <p className="text-sm text-muted-foreground">{entry.entry_name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{entry.total?.toLocaleString()} pts</p>
                      <p className="text-sm text-muted-foreground">GW: {entry.event_total || 0}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}