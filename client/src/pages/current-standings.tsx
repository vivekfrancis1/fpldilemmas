import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trophy, TrendingUp, Target, Users, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface CurrentTeamStanding {
  id: number;
  name: string;
  shortName: string;
  position: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  // Enhanced statistics from backend API
  cleanSheets: number;
  yellowCards: number;
  redCards: number;
  saves: number;
  ownGoals: number;
  penaltiesSaved: number;
  penaltiesMissed: number;
  expectedGoalsFor: number;
  expectedGoalsAgainst: number;
  tackles: number;
  defensiveActions: number;
}

export default function CurrentStandings() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const { data: standingsData, isLoading, error } = useQuery<CurrentTeamStanding[]>({
    queryKey: ["/api/current-standings"],
    queryFn: async () => {
      const response = await fetch('/api/current-standings');
      if (!response.ok) {
        throw new Error('Failed to fetch current standings');
      }
      return response.json();
    },
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["/api/current-standings"] });
    setIsRefreshing(false);
  };

  const getPositionColor = (position: number) => {
    if (position <= 4) return 'bg-green-500 text-white'; // Champions League
    if (position === 5 || position === 6) return 'bg-blue-500 text-white'; // Europa League
    if (position === 7) return 'bg-purple-500 text-white'; // Conference League
    if (position >= 18) return 'bg-red-500 text-white'; // Relegation
    return 'bg-gray-500 text-white'; // Mid-table
  };

  const getPositionBadge = (position: number) => {
    if (position <= 4) return 'UCL';
    if (position === 5 || position === 6) return 'UEL';
    if (position === 7) return 'UECL';
    if (position >= 18) return 'REL';
    return '';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fpl-page-container">
        <div className="flex justify-center items-center min-h-screen">
          <Card className="p-6">
            <CardContent>
              <p className="text-red-600">Failed to load current standings. Please try again.</p>
              <Button onClick={handleRefresh} className="mt-4" data-testid="button-retry-standings">
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="fpl-page-container">
      {/* Unified Page Header */}
      <div className="fpl-page-header">
        <div className="fpl-page-header-content">
          <div className="fpl-page-title">
            <Trophy className="h-8 w-8" />
            <h1>Current Premier League Standings</h1>
          </div>
          <p className="fpl-page-subtitle">
            Enhanced Premier League table with detailed statistics from completed matches and official results
          </p>
          <div className="mt-6">
            <Button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="bg-purple-600 hover:bg-purple-700 text-white"
              data-testid="button-refresh-current-standings"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh Table'}
            </Button>
          </div>
        </div>
      </div>

      <div className="fpl-section-spacing">
        {/* Current Status Info */}
        <Card className="mb-6 shadow-md border-0">
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-6 items-center justify-between">
              <div className="flex flex-wrap gap-6 items-center">
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-semibold text-gray-700">
                    Official Premier League Table
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-semibold text-gray-700">
                    Based on: Completed Matches Only
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-semibold text-gray-700">
                    Updated: After Each Gameweek
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Current Standings Table */}
        <Card className="overflow-hidden shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
            <CardTitle className="flex items-center gap-3 text-xl">
              <Trophy className="h-6 w-6" />
              Enhanced Premier League Table
              <Badge className="bg-white/20 text-white border-white/30 ml-auto">
                Detailed Statistics
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1400px]">
                <thead className="bg-gray-50">
                  <tr>
                    {/* Position & Team Info */}
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 border-r">
                      Pos
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-16 bg-gray-50 z-10 border-r min-w-[140px]">
                      Team
                    </th>
                    
                    {/* Match Record */}
                    <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      P
                    </th>
                    <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      W
                    </th>
                    <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      D
                    </th>
                    <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      L
                    </th>
                    
                    {/* Goals */}
                    <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-l">
                      GF
                    </th>
                    <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      GA
                    </th>
                    <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      GD
                    </th>
                    
                    {/* Points */}
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-l bg-blue-50">
                      Pts
                    </th>
                    
                    {/* Clean Sheets */}
                    <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-l">
                      CS
                    </th>
                    
                    {/* Cards */}
                    <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-l">
                      YC
                    </th>
                    <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      RC
                    </th>
                    
                    {/* GK Stats */}
                    <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-l">
                      Saves
                    </th>
                    <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      PS
                    </th>
                    
                    {/* Other Events */}
                    <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-l">
                      OG
                    </th>
                    <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      PM
                    </th>
                    
                    {/* Expected Goals */}
                    <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-l">
                      xGF
                    </th>
                    <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      xGA
                    </th>
                    
                    {/* Defensive Stats */}
                    <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-l">
                      T
                    </th>
                    <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      DA
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {standingsData?.map((team) => (
                    <tr key={team.id} className="hover:bg-gray-50" data-testid={`current-standing-row-${team.shortName}`}>
                      {/* Position & Team Info */}
                      <td className="px-3 py-4 text-center sticky left-0 bg-white hover:bg-gray-50 border-r">
                        <div className="flex items-center justify-center gap-1">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${getPositionColor(team.position)}`}>
                            {team.position}
                          </div>
                          {getPositionBadge(team.position) && (
                            <Badge variant="outline" className="text-xs hidden sm:inline-flex">
                              {getPositionBadge(team.position)}
                            </Badge>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-4 py-4 sticky left-16 bg-white hover:bg-gray-50 border-r min-w-[140px]">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900" data-testid={`team-name-${team.shortName}`}>
                              {team.name}
                            </div>
                            <div className="text-xs text-gray-500">{team.shortName}</div>
                          </div>
                        </div>
                      </td>
                      
                      {/* Match Record */}
                      <td className="px-2 py-4 text-center text-sm font-medium text-gray-900" data-testid={`played-${team.shortName}`}>
                        {team.played}
                      </td>
                      <td className="px-2 py-4 text-center text-sm font-medium text-green-600" data-testid={`wins-${team.shortName}`}>
                        {team.wins}
                      </td>
                      <td className="px-2 py-4 text-center text-sm font-medium text-gray-600" data-testid={`draws-${team.shortName}`}>
                        {team.draws}
                      </td>
                      <td className="px-2 py-4 text-center text-sm font-medium text-red-600" data-testid={`losses-${team.shortName}`}>
                        {team.losses}
                      </td>
                      
                      {/* Goals */}
                      <td className="px-2 py-4 text-center text-sm font-medium text-gray-900 border-l" data-testid={`goals-for-${team.shortName}`}>
                        {team.goalsFor}
                      </td>
                      <td className="px-2 py-4 text-center text-sm font-medium text-gray-900" data-testid={`goals-against-${team.shortName}`}>
                        {team.goalsAgainst}
                      </td>
                      <td className="px-2 py-4 text-center text-sm font-medium" data-testid={`goal-difference-${team.shortName}`}>
                        <span className={team.goalDifference >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {team.goalDifference >= 0 ? '+' : ''}{team.goalDifference}
                        </span>
                      </td>
                      
                      {/* Points */}
                      <td className="px-3 py-4 text-center text-sm font-bold text-gray-900 border-l bg-blue-50" data-testid={`points-${team.shortName}`}>
                        {team.points}
                      </td>
                      
                      {/* Clean Sheets */}
                      <td className="px-2 py-4 text-center text-sm font-medium text-blue-600 border-l" data-testid={`clean-sheets-${team.shortName}`}>
                        {team.cleanSheets}
                      </td>
                      
                      {/* Cards */}
                      <td className="px-2 py-4 text-center text-sm font-medium text-yellow-600 border-l" data-testid={`yellow-cards-${team.shortName}`}>
                        {team.yellowCards}
                      </td>
                      <td className="px-2 py-4 text-center text-sm font-medium text-red-600" data-testid={`red-cards-${team.shortName}`}>
                        {team.redCards}
                      </td>
                      
                      {/* GK Stats */}
                      <td className="px-2 py-4 text-center text-sm font-medium text-purple-600 border-l" data-testid={`saves-${team.shortName}`}>
                        {team.saves}
                      </td>
                      <td className="px-2 py-4 text-center text-sm font-medium text-green-600" data-testid={`penalties-saved-${team.shortName}`}>
                        {team.penaltiesSaved}
                      </td>
                      
                      {/* Other Events */}
                      <td className="px-2 py-4 text-center text-sm font-medium text-orange-600 border-l" data-testid={`own-goals-${team.shortName}`}>
                        {team.ownGoals}
                      </td>
                      <td className="px-2 py-4 text-center text-sm font-medium text-red-500" data-testid={`penalties-missed-${team.shortName}`}>
                        {team.penaltiesMissed}
                      </td>
                      
                      {/* Expected Goals */}
                      <td className="px-2 py-4 text-center text-sm font-medium text-indigo-600 border-l" data-testid={`expected-goals-for-${team.shortName}`}>
                        {team.expectedGoalsFor.toFixed(1)}
                      </td>
                      <td className="px-2 py-4 text-center text-sm font-medium text-indigo-500" data-testid={`expected-goals-against-${team.shortName}`}>
                        {team.expectedGoalsAgainst.toFixed(1)}
                      </td>
                      
                      {/* Defensive Stats */}
                      <td className="px-2 py-4 text-center text-sm font-medium text-teal-600 border-l" data-testid={`tackles-${team.shortName}`}>
                        {team.tackles}
                      </td>
                      <td className="px-2 py-4 text-center text-sm font-medium text-teal-500" data-testid={`defensive-actions-${team.shortName}`}>
                        {team.defensiveActions}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Legend */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Enhanced Table Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Position Colors</h4>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                    1st-4th: Champions League
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                    5th-6th: Europa League
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
                    7th: Conference League
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                    18th-20th: Relegation
                  </li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Basic Statistics</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li><strong>P:</strong> Matches played</li>
                  <li><strong>W/D/L:</strong> Wins, Draws, Losses</li>
                  <li><strong>GF/GA:</strong> Goals For/Against</li>
                  <li><strong>GD:</strong> Goal Difference</li>
                  <li><strong>Pts:</strong> Points (3 for win, 1 for draw)</li>
                  <li><strong>CS:</strong> Clean Sheets</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Enhanced Statistics</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li><strong>YC/RC:</strong> Yellow/Red Cards</li>
                  <li><strong>Saves:</strong> Goalkeeper saves</li>
                  <li><strong>PS:</strong> Penalties saved</li>
                  <li><strong>OG:</strong> Own goals</li>
                  <li><strong>PM:</strong> Penalties missed</li>
                  <li><strong>xGF/xGA:</strong> Expected Goals For/Against</li>
                  <li><strong>T:</strong> Tackles</li>
                  <li><strong>DA:</strong> Defensive actions</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">💡 Table Features</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• <strong>Horizontal scroll:</strong> Use the horizontal scrollbar to view all statistics</li>
                <li>• <strong>Sticky columns:</strong> Position and Team columns remain visible while scrolling</li>
                <li>• <strong>Color coding:</strong> Different statistics use distinct colors for easy identification</li>
                <li>• <strong>Expected Goals:</strong> Displayed with one decimal place (e.g., 2.1)</li>
                <li>• <strong>Real-time data:</strong> Updated after each completed match</li>
              </ul>
            </div>
            
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Note:</strong> All statistics are calculated from completed Premier League matches only. 
                Enhanced data includes goalkeeper saves, defensive actions, cards, and advanced metrics 
                to provide comprehensive team performance analysis.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}