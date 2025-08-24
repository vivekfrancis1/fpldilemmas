import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Shield, Target, BarChart3 } from "lucide-react";

interface TeamConfidenceData {
  id: number;
  team: string;
  teamName: string;
  confidenceScore: number;
  confidenceLevel: 'High' | 'Medium' | 'Low';
  attackingTier: string;
  defensiveTier: string;
  expectedGoalsPerGame: number;
  baseCleanSheetRate: number;
  tierMultiplier: number;
  confidenceMultiplier: number;
}

const getConfidenceBadgeColor = (level: string) => {
  switch (level) {
    case 'High': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    case 'Low': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
    default: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
  }
};

const getTierBadgeColor = (tier: string) => {
  switch (tier) {
    case 'elite': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
    case 'strong': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
    case 'weak': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
    case 'promoted': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    default: return 'bg-slate-100 text-slate-800 dark:bg-slate-900/20 dark:text-slate-400';
  }
};

export default function TeamConfidence() {
  const { data: confidenceData, isLoading, error } = useQuery<TeamConfidenceData[]>({
    queryKey: ["/api/team-confidence-analysis"],
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fpl-purple mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Loading team confidence analysis...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="p-6">
            <p className="text-red-600 dark:text-red-400">Failed to load team confidence data. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Sort teams by confidence score descending
  const sortedTeams = confidenceData?.slice().sort((a, b) => b.confidenceScore - a.confidenceScore) || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-fpl-purple dark:text-white">Team Confidence Analysis</h1>
        <p className="text-muted-foreground">
          Confidence levels and multipliers used in projection calculations
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">High Confidence</p>
                <p className="text-2xl font-bold">
                  {sortedTeams.filter(t => t.confidenceLevel === 'High').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm font-medium">Medium Confidence</p>
                <p className="text-2xl font-bold">
                  {sortedTeams.filter(t => t.confidenceLevel === 'Medium').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium">Low Confidence</p>
                <p className="text-2xl font-bold">
                  {sortedTeams.filter(t => t.confidenceLevel === 'Low').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-fpl-purple" />
              <div>
                <p className="text-sm font-medium">Total Teams</p>
                <p className="text-2xl font-bold">{sortedTeams.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Confidence Table */}
      <Card>
        <CardHeader>
          <CardTitle>Team Confidence Breakdown</CardTitle>
          <CardDescription>
            Detailed confidence analysis showing multipliers used in goal and clean sheet projections
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">Team</th>
                  <th className="text-center p-2 font-medium">Confidence</th>
                  <th className="text-center p-2 font-medium">Level</th>
                  <th className="text-center p-2 font-medium">Attack Tier</th>
                  <th className="text-center p-2 font-medium">Defense Tier</th>
                  <th className="text-center p-2 font-medium">xG/Game</th>
                  <th className="text-center p-2 font-medium">CS Rate</th>
                  <th className="text-center p-2 font-medium">Tier Multiplier</th>
                  <th className="text-center p-2 font-medium">Confidence Multiplier</th>
                </tr>
              </thead>
              <tbody>
                {sortedTeams.map((team) => (
                  <tr key={team.id} className="border-b hover:bg-muted/50">
                    <td className="p-2">
                      <div>
                        <p className="font-medium">{team.team}</p>
                        <p className="text-sm text-muted-foreground">{team.teamName}</p>
                      </div>
                    </td>
                    <td className="text-center p-2">
                      <span className="font-mono font-medium">{team.confidenceScore}%</span>
                    </td>
                    <td className="text-center p-2">
                      <Badge className={getConfidenceBadgeColor(team.confidenceLevel)}>
                        {team.confidenceLevel}
                      </Badge>
                    </td>
                    <td className="text-center p-2">
                      <Badge className={getTierBadgeColor(team.attackingTier)}>
                        {team.attackingTier}
                      </Badge>
                    </td>
                    <td className="text-center p-2">
                      <Badge className={getTierBadgeColor(team.defensiveTier)}>
                        {team.defensiveTier}
                      </Badge>
                    </td>
                    <td className="text-center p-2">
                      <span className="font-mono">{team.expectedGoalsPerGame.toFixed(2)}</span>
                    </td>
                    <td className="text-center p-2">
                      <span className="font-mono">{team.baseCleanSheetRate}%</span>
                    </td>
                    <td className="text-center p-2">
                      <span className="font-mono font-medium">{team.tierMultiplier}</span>
                    </td>
                    <td className="text-center p-2">
                      <span className="font-mono font-medium">{team.confidenceMultiplier}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Explanation */}
      <Card>
        <CardHeader>
          <CardTitle>How Confidence Analysis Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Confidence Levels</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• <strong>High (≥85%):</strong> Very reliable projections</li>
                <li>• <strong>Medium (65-85%):</strong> Standard reliability</li>
                <li>• <strong>Low (≤65%):</strong> Less reliable, boosted projections</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Multipliers</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• <strong>Tier Multiplier:</strong> Applied based on team strength</li>
                <li>• <strong>Confidence Multiplier:</strong> Boosts low-confidence teams</li>
                <li>• Values shown are samples from projection calculations</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}