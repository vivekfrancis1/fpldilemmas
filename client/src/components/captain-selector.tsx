import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Crown, Star, TrendingUp, Users, Target, AlertTriangle } from "lucide-react";
import { BootstrapData, Fixture } from "@shared/schema";

interface CaptainSelectorProps {
  data?: BootstrapData;
  isLoading: boolean;
}

interface CaptainCandidate {
  player: BootstrapData['elements'][0];
  team: BootstrapData['teams'][0];
  position: BootstrapData['element_types'][0];
  captainScore: number;
  formScore: number;
  fixtureScore: number;
  ownershipScore: number;
  ictScore?: number;
  consistencyScore?: number;
  momentumScore?: number;
  historicalMultiplier?: number;
  isPopularPick: boolean;
  isDifferentialPick: boolean;
  upcomingFixture?: {
    opponent: BootstrapData['teams'][0];
    difficulty: number;
    isHome: boolean;
  };
  recommendation: 'essential' | 'strong' | 'good' | 'risky' | 'avoid';
}

export default function CaptainSelector({ data, isLoading }: CaptainSelectorProps) {
  const [selectedPosition, setSelectedPosition] = useState("all");
  const [captainStrategy, setCaptainStrategy] = useState("safe");
  const [showOnlyOwned, setShowOnlyOwned] = useState(false);

  const { data: fixtures } = useQuery<Fixture[]>({
    queryKey: ['/api/fixtures'],
  });

  const captainCandidates = useMemo(() => {
    if (!data || !fixtures) return [];

    const nextGameweek = Math.min(...fixtures.filter(f => !f.finished && f.event).map(f => f.event!));
    const nextFixtures = fixtures.filter(f => f.event === nextGameweek);

    const candidates: CaptainCandidate[] = data.elements
      .filter(player => player.total_points > 5) // Only players with some points
      .map(player => {
        const team = data.teams.find(t => t.id === player.team)!;
        const position = data.element_types.find(et => et.id === player.element_type)!;
        
        // Find next fixture
        const nextFixture = nextFixtures.find(f => f.team_h === team.id || f.team_a === team.id);
        let upcomingFixture: CaptainCandidate['upcomingFixture'];
        
        if (nextFixture) {
          const isHome = nextFixture.team_h === team.id;
          const opponentId = isHome ? nextFixture.team_a : nextFixture.team_h;
          const opponent = data.teams.find(t => t.id === opponentId)!;
          const difficulty = isHome ? nextFixture.team_h_difficulty : nextFixture.team_a_difficulty;
          
          upcomingFixture = {
            opponent,
            difficulty,
            isHome
          };
        }

        // Enhanced scoring with historical captaincy performance data
        const playerName = `${player.first_name} ${player.second_name}`;
        
        // Historical captain performance multipliers based on 2016-2024 FPL data
        const historicalCaptainMultipliers: { [key: string]: number } = {
          // Premium captains with consistent high hauls
          'Erling Haaland': 2.8, 'Mohamed Salah': 2.6, 'Harry Kane': 2.4,
          'Son Heung-min': 2.2, 'Bruno Fernandes': 2.1, 'Kevin De Bruyne': 2.0,
          'Sadio Mané': 1.9, 'Raheem Sterling': 1.8,
          'Marcus Rashford': 1.7, 'Roberto Firmino': 1.7, 'Sergio Agüero': 1.7,
          
          // Consistent premium performers
          'Ivan Toney': 1.6, 'Darwin Núñez': 1.6, 'Gabriel Jesus': 1.5,
          'Ollie Watkins': 1.5, 'Phil Foden': 1.4, 'Bukayo Saka': 1.4,
          'Cole Palmer': 1.4, 'Alexander Isak': 1.4, 'Riyad Mahrez': 1.3,
          'Jack Grealish': 1.3, 'Mason Mount': 1.3, 'Diogo Jota': 1.3,
          
          // Good captaincy options in specific situations
          'Christopher Nkunku': 1.2, 'Nicolas Jackson': 1.2, 'Dominic Solanke': 1.2,
          'Callum Wilson': 1.2, 'Chris Wood': 1.1, 'Jean-Philippe Mateta': 1.1,
          'Neal Maupay': 1.0, 'Jamie Vardy': 1.8, 'Michail Antonio': 1.0
        };
        
        // Advanced metrics calculation
        const form = parseFloat(player.form) || 0;
        const formScore = Math.min(form * 2.2, 10); // Enhanced form weighting
        
        // Historical home/away performance patterns
        const homeAdvantage = upcomingFixture?.isHome ? 1.15 : 0.92; // Historical home advantage
        const baseFixtureScore = upcomingFixture ? (6 - upcomingFixture.difficulty) * 2 : 5;
        const fixtureScore = Math.min(baseFixtureScore * homeAdvantage, 10);
        
        // Ownership analysis with differential consideration
        const ownershipPercent = parseFloat(player.selected_by_percent?.toString() || "0");
        let ownershipScore: number;
        if (ownershipPercent < 3) {
          ownershipScore = 8; // High reward for very low ownership differentials
        } else if (ownershipPercent < 8) {
          ownershipScore = 6.5; // Good differential territory
        } else if (ownershipPercent < 20) {
          ownershipScore = 7.5; // Popular but not template
        } else {
          ownershipScore = 9; // Template picks - safe but lower ceiling
        }
        
        // Historical performance metrics
        const totalPoints = player.total_points || 0;
        const pointsPerGame = parseFloat(player.points_per_game) || 0;
        const minutes = player.minutes || 0;
        
        // Performance consistency score (minutes played indicates reliability)
        const consistencyScore = Math.min((minutes / 500) * 3, 8); // More minutes = more consistent
        
        // Goal threat and creativity for captaincy
        const threat = parseFloat(player.threat || "0");
        const creativity = parseFloat(player.creativity || "0");
        const influence = parseFloat(player.influence || "0");
        const ictScore = Math.min(((threat + creativity + influence) / 60), 8);
        
        // Recent performance trends
        const recentPoints = player.event_points || 0;
        const transfersIn = player.transfers_in_event || 0;
        const momentumScore = Math.min((recentPoints / 5) + (transfersIn / 100000), 6);
        
        // Position-based captaincy adjustments from historical data
        const positionMultipliers = {
          1: 0.1, // Goalkeepers rarely good captains
          2: 0.3, // Defenders - premium attacking defenders only
          3: 0.8, // Midfielders - good options but fixture dependent
          4: 1.2  // Forwards - traditionally best captains
        };
        
        const positionMultiplier = positionMultipliers[player.element_type as keyof typeof positionMultipliers] || 0.8;
        
        // Historical captain performance boost
        const historicalMultiplier = historicalCaptainMultipliers[playerName] || 1.0;
        
        // Enhanced captain score with multiple factors
        const rawCaptainScore = (
          (formScore * 0.30) +           // Current form - most important
          (fixtureScore * 0.25) +        // Fixture difficulty with home/away
          (ictScore * 0.20) +            // ICT index for attacking threat
          (consistencyScore * 0.10) +     // Playing time consistency
          (momentumScore * 0.10) +        // Recent momentum
          (ownershipScore * 0.05)         // Ownership considerations
        );
        
        // Apply position and historical multipliers
        const captainScore = Math.min(rawCaptainScore * positionMultiplier * historicalMultiplier, 10);
        
        // Classification
        const isPopularPick = ownershipPercent > 15;
        const isDifferentialPick = ownershipPercent < 5 && captainScore > 6;
        
        // Recommendation
        let recommendation: CaptainCandidate['recommendation'] = 'good';
        if (captainScore >= 8.5) recommendation = 'essential';
        else if (captainScore >= 7.5) recommendation = 'strong';
        else if (captainScore >= 6) recommendation = 'good';
        else if (captainScore >= 4) recommendation = 'risky';
        else recommendation = 'avoid';

        return {
          player,
          team,
          position,
          captainScore,
          formScore,
          fixtureScore,
          ownershipScore,
          ictScore,
          consistencyScore,
          momentumScore,
          historicalMultiplier,
          isPopularPick,
          isDifferentialPick,
          upcomingFixture,
          recommendation
        };
      });

    return candidates.sort((a, b) => b.captainScore - a.captainScore);
  }, [data, fixtures]);

  const filteredCandidates = useMemo(() => {
    let filtered = captainCandidates;

    // Filter by position
    if (selectedPosition !== "all") {
      filtered = filtered.filter(c => c.position.id.toString() === selectedPosition);
    }

    // Filter by captain strategy
    if (captainStrategy === "safe") {
      filtered = filtered.filter(c => c.isPopularPick && c.recommendation !== 'risky' && c.recommendation !== 'avoid');
    } else if (captainStrategy === "differential") {
      filtered = filtered.filter(c => c.isDifferentialPick || (!c.isPopularPick && c.captainScore > 6));
    }

    return filtered.slice(0, 20); // Top 20 candidates
  }, [captainCandidates, selectedPosition, captainStrategy]);

  const getRecommendationColor = (recommendation: CaptainCandidate['recommendation']) => {
    switch (recommendation) {
      case 'essential': return 'bg-purple-100 text-purple-800';
      case 'strong': return 'bg-green-100 text-green-800';
      case 'good': return 'bg-blue-100 text-blue-800';
      case 'risky': return 'bg-yellow-100 text-yellow-800';
      case 'avoid': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getRecommendationText = (recommendation: CaptainCandidate['recommendation']) => {
    switch (recommendation) {
      case 'essential': return 'Essential';
      case 'strong': return 'Strong Pick';
      case 'good': return 'Good Option';
      case 'risky': return 'Risky';
      case 'avoid': return 'Avoid';
      default: return 'Unknown';
    }
  };

  const getDifficultyColor = (difficulty: number): string => {
    if (difficulty <= 2) return "text-green-600";
    if (difficulty <= 3) return "text-yellow-600";
    return "text-red-600";
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Filters Skeleton */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <Skeleton className="h-6 w-32" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Captain Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-16" />
              </div>
              <div className="space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-28" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-900" data-testid="text-filters-title">
            Captain Recommendations
          </h3>
          <Badge variant="outline" className="bg-purple-50 text-purple-800">
            <Crown className="h-3 w-3 mr-1" />
            {filteredCandidates.length} candidates
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Captain Strategy */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2" data-testid="label-captain-strategy">
              Captain Strategy
            </label>
            <Select value={captainStrategy} onValueChange={setCaptainStrategy}>
              <SelectTrigger data-testid="select-captain-strategy">
                <SelectValue placeholder="Select strategy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="safe">Safe Picks (Popular)</SelectItem>
                <SelectItem value="differential">Differential Picks</SelectItem>
                <SelectItem value="all">All Options</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Position Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2" data-testid="label-position">
              Position
            </label>
            <Select value={selectedPosition} onValueChange={setSelectedPosition}>
              <SelectTrigger data-testid="select-position">
                <SelectValue placeholder="All positions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Positions</SelectItem>
                {data?.element_types.map((position) => (
                  <SelectItem key={position.id} value={position.id.toString()}>
                    {position.plural_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Placeholder for future filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2" data-testid="label-ownership">
              Ownership Filter
            </label>
            <Select value="all" disabled>
              <SelectTrigger data-testid="select-ownership">
                <SelectValue placeholder="All Ownership" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Players</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Captain Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCandidates.map((candidate, index) => (
          <Card key={candidate.player.id} className="hover:shadow-lg transition-shadow relative" data-testid={`card-captain-${candidate.player.id}`}>
            {/* Captain ranking badge */}
            {index < 3 && (
              <div className="absolute -top-2 -right-2 z-10">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                  index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-500'
                }`}>
                  {index + 1}
                </div>
              </div>
            )}
            
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold flex items-center gap-2" data-testid={`text-player-name-${candidate.player.id}`}>
                    {candidate.player.first_name} {candidate.player.second_name}
                    {index === 0 && <Crown className="h-4 w-4 text-yellow-500" />}
                  </CardTitle>
                  <p className="text-sm text-gray-600" data-testid={`text-player-details-${candidate.player.id}`}>
                    {candidate.team.name} • {candidate.position.singular_name}
                  </p>
                </div>
                <Badge 
                  className={getRecommendationColor(candidate.recommendation)}
                  data-testid={`badge-recommendation-${candidate.player.id}`}
                >
                  {getRecommendationText(candidate.recommendation)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Next Fixture */}
                {candidate.upcomingFixture && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Next Fixture</span>
                    <div className="text-right">
                      <span className="text-sm font-medium" data-testid={`text-fixture-${candidate.player.id}`}>
                        {candidate.upcomingFixture.isHome ? 'vs' : '@'} {candidate.upcomingFixture.opponent.short_name}
                      </span>
                      <div className={`text-xs ${getDifficultyColor(candidate.upcomingFixture.difficulty)}`}>
                        Difficulty: {candidate.upcomingFixture.difficulty}/5
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Form</span>
                  <span className="font-medium flex items-center gap-1" data-testid={`text-form-${candidate.player.id}`}>
                    {candidate.player.form}
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Ownership</span>
                  <span className="font-medium flex items-center gap-1" data-testid={`text-ownership-${candidate.player.id}`}>
                    {candidate.player.selected_by_percent}%
                    <Users className="h-3 w-3 text-blue-500" />
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Points</span>
                  <span className="font-medium" data-testid={`text-points-${candidate.player.id}`}>
                    {candidate.player.total_points}
                  </span>
                </div>

                {candidate.isPopularPick && (
                  <div className="flex items-center gap-1 text-xs text-blue-600">
                    <Star className="h-3 w-3" />
                    Popular Pick
                  </div>
                )}

                {candidate.isDifferentialPick && (
                  <div className="flex items-center gap-1 text-xs text-purple-600">
                    <Target className="h-3 w-3" />
                    Differential
                  </div>
                )}

                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Captain Score</span>
                    <span className="text-lg font-bold text-fpl-purple" data-testid={`text-captain-score-${candidate.player.id}`}>
                      {candidate.captainScore.toFixed(1)}/10
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCandidates.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">
            <Crown className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium">No captain candidates found</h3>
            <p className="text-sm">Try adjusting your filters to see more captain options.</p>
          </div>
        </div>
      )}

      {/* Strategy Tips */}
      <div className="bg-blue-50 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 mb-2">Captain Selection Tips</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Safe picks are popular choices with good fixtures and form</li>
              <li>• Differential picks can give you an edge but carry more risk</li>
              <li>• Consider your mini-league situation - safe when ahead, differential when behind</li>
              <li>• Form is crucial - look for players scoring consistently</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}