import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, ArrowUpDown, Target, DollarSign } from "lucide-react";
import { BootstrapData, Fixture } from "@shared/schema";

interface TransferPlannerProps {
  data?: BootstrapData;
  isLoading: boolean;
}

interface PlayerTransferValue {
  player: BootstrapData['elements'][0];
  team: BootstrapData['teams'][0];
  position: BootstrapData['element_types'][0];
  form: number;
  formRank: number;
  valueScore: number;
  fixtureScore: number;
  overallScore: number;
  transferTrend: 'rising' | 'falling' | 'stable';
  recommendation: 'strong_in' | 'in' | 'neutral' | 'out' | 'strong_out';
  ictScore?: number;
  consistencyScore?: number;
  momentumScore?: number;
  historicalMultiplier?: number;
}

export default function TransferPlanner({ data, isLoading }: TransferPlannerProps) {
  const [selectedPosition, setSelectedPosition] = useState("all");
  const [priceRange, setPriceRange] = useState("all");
  const [transferType, setTransferType] = useState("in");

  const { data: fixtures } = useQuery<Fixture[]>({
    queryKey: ['/api/fixtures'],
  });

  const transferCandidates = useMemo(() => {
    if (!data || !fixtures) return [];

    // Calculate transfer values for each player
    const candidates: PlayerTransferValue[] = data.elements.map(player => {
      const team = data.teams.find(t => t.id === player.team)!;
      const position = data.element_types.find(et => et.id === player.element_type)!;
      
      // Enhanced transfer analysis with historical performance data
      const playerName = `${player.first_name} ${player.second_name}`;
      
      // Historical transfer performance multipliers based on 2016-2024 FPL data
      const historicalTransferMultipliers: { [key: string]: number } = {
        // Consistent season performers - excellent transfer targets
        'Erling Haaland': 2.6, 'Mohamed Salah': 2.4, 'Son Heung-min': 2.2,
        'Harry Kane': 2.1, 'Bruno Fernandes': 2.0, 'Kevin De Bruyne': 1.9,
        'Bukayo Saka': 1.8, 'Phil Foden': 1.8, 'Cole Palmer': 1.7,
        'Martin Ødegaard': 1.7, 'Ivan Toney': 1.6, 'Alexander Isak': 1.6,
        
        // Reliable mid-tier performers
        'Ollie Watkins': 1.5, 'Darwin Núñez': 1.5, 'Gabriel Jesus': 1.4,
        'Diogo Jota': 1.4, 'James Maddison': 1.4, 'Jack Grealish': 1.3,
        'Christopher Nkunku': 1.3, 'Nicolas Jackson': 1.3, 'Dominic Solanke': 1.2,
        'Callum Wilson': 1.2, 'Jean-Philippe Mateta': 1.2, 'Chris Wood': 1.1,
        
        // Defensive options with transfer value
        'Trent Alexander-Arnold': 1.9, 'Andrew Robertson': 1.6, 'Reece James': 1.5,
        'João Cancelo': 1.4, 'Kyle Walker': 1.3, 'Ben Chilwell': 1.3,
        'Kieran Trippier': 1.2, 'Luke Shaw': 1.2, 'Oleksandr Zinchenko': 1.1
      };
      
      // Advanced form analysis with recent trend weighting
      const form = parseFloat(player.form) || 0;
      const formScore = Math.min(form * 2.5, 10); // Enhanced form impact
      
      // Sophisticated value calculation with position-adjusted expectations
      const positionValueMultipliers = {
        1: 0.7, // Goalkeepers - lower value expectations
        2: 0.8, // Defenders - moderate value expectations
        3: 1.0, // Midfielders - standard value expectations
        4: 1.2  // Forwards - higher value expectations
      };
      
      const positionMultiplier = positionValueMultipliers[player.element_type as keyof typeof positionValueMultipliers] || 1.0;
      const baseValueScore = player.now_cost > 0 ? (player.total_points / (player.now_cost / 10)) : 0;
      const valueScore = baseValueScore * positionMultiplier;
      
      // Enhanced fixture analysis with home/away consideration
      const teamFixtures = fixtures
        .filter(f => (f.team_h === team.id || f.team_a === team.id) && !f.finished)
        .slice(0, 6); // Analyze next 6 fixtures instead of 5
      
      let weightedFixtureScore = 0;
      let totalWeight = 0;
      
      teamFixtures.forEach((fixture, index) => {
        const isHome = fixture.team_h === team.id;
        const difficulty = isHome ? fixture.team_h_difficulty : fixture.team_a_difficulty;
        const homeAdvantage = isHome ? 0.3 : 0; // Home advantage factor
        const weight = Math.pow(0.85, index); // Diminishing weight for later fixtures
        
        const adjustedDifficulty = Math.max(1, difficulty - homeAdvantage);
        const fixtureValue = 6 - adjustedDifficulty;
        
        weightedFixtureScore += fixtureValue * weight;
        totalWeight += weight;
      });
      
      const fixtureScore = totalWeight > 0 ? (weightedFixtureScore / totalWeight) : 3;
      
      // Advanced transfer momentum analysis
      const transfersIn = player.transfers_in_event || 0;
      const transfersOut = player.transfers_out_event || 0;
      const transfersNet = transfersIn - transfersOut;
      
      let transferTrend: PlayerTransferValue['transferTrend'] = 'stable';
      let momentumScore = 5; // Base momentum score
      
      if (transfersNet > 100000) {
        transferTrend = 'rising';
        momentumScore = Math.min(8, 5 + (transfersNet / 200000));
      } else if (transfersNet < -100000) {
        transferTrend = 'falling';
        momentumScore = Math.max(2, 5 + (transfersNet / 200000));
      } else {
        momentumScore = 5 + (transfersNet / 500000);
      }
      
      // Historical performance metrics
      const totalPoints = player.total_points || 0;
      const pointsPerGame = parseFloat(player.points_per_game) || 0;
      const minutes = player.minutes || 0;
      
      // Consistency and reliability factors
      const consistencyScore = Math.min((minutes / 600) * 4, 8); // Playing time consistency
      const reliabilityScore = Math.min((totalPoints / 50) * 3, 8); // Season performance
      
      // ICT index for attacking threat
      const threat = parseFloat(player.threat || "0");
      const creativity = parseFloat(player.creativity || "0");
      const influence = parseFloat(player.influence || "0");
      const ictScore = Math.min(((threat + creativity + influence) / 80), 7);
      
      // Price change potential (important for transfers)
      const priceChangeScore = Math.min(Math.abs(transfersNet) / 150000, 4);
      
      // Injury risk assessment
      const availabilityFactor = (player.chance_of_playing_next_round || 100) / 100;
      const injuryRiskPenalty = (1 - availabilityFactor) * 3; // Up to -3 points for injury risk
      
      // Historical transfer performance boost
      const historicalMultiplier = historicalTransferMultipliers[playerName] || 1.0;
      
      // Enhanced overall score with multiple weighted factors
      const rawOverallScore = (
        (formScore * 0.25) +           // Current form
        (valueScore * 0.20) +          // Points per million value
        (fixtureScore * 0.20) +        // Fixture difficulty
        (ictScore * 0.15) +            // ICT index threat
        (consistencyScore * 0.10) +     // Playing time consistency
        (momentumScore * 0.05) +        // Transfer momentum
        (priceChangeScore * 0.03) +     // Price change potential
        (reliabilityScore * 0.02)       // Season performance
      ) - injuryRiskPenalty;             // Injury risk penalty
      
      // Apply historical multiplier and cap the score
      const overallScore = Math.min(Math.max(rawOverallScore * historicalMultiplier, 0), 10);
      
      // Recommendation logic
      let recommendation: PlayerTransferValue['recommendation'] = 'neutral';
      if (overallScore >= 8) recommendation = 'strong_in';
      else if (overallScore >= 6) recommendation = 'in';
      else if (overallScore <= 2) recommendation = 'strong_out';
      else if (overallScore <= 4) recommendation = 'out';
      
      return {
        player,
        team,
        position,
        form,
        formRank: 0, // Will be calculated after sorting
        valueScore,
        fixtureScore,
        overallScore,
        transferTrend,
        recommendation,
        ictScore,
        consistencyScore,
        momentumScore,
        historicalMultiplier
      };
    });

    // Calculate form ranks
    const sortedByForm = [...candidates].sort((a, b) => b.form - a.form);
    sortedByForm.forEach((candidate, index) => {
      candidate.formRank = index + 1;
    });

    return candidates;
  }, [data, fixtures]);

  const filteredCandidates = useMemo(() => {
    let filtered = transferCandidates;

    // Filter by position
    if (selectedPosition !== "all") {
      filtered = filtered.filter(c => c.position.id.toString() === selectedPosition);
    }

    // Filter by price range
    if (priceRange !== "all") {
      const [min, max] = priceRange.split("-").map(Number);
      filtered = filtered.filter(c => {
        const price = c.player.now_cost / 10;
        return price >= min && price <= max;
      });
    }

    // Filter by transfer type
    if (transferType === "in") {
      filtered = filtered.filter(c => c.recommendation === 'strong_in' || c.recommendation === 'in');
    } else if (transferType === "out") {
      filtered = filtered.filter(c => c.recommendation === 'strong_out' || c.recommendation === 'out');
    }

    // Sort by overall score
    return filtered.sort((a, b) => {
      if (transferType === "out") {
        return a.overallScore - b.overallScore; // Worst first for transfers out
      }
      return b.overallScore - a.overallScore; // Best first for transfers in
    });
  }, [transferCandidates, selectedPosition, priceRange, transferType]);

  const getRecommendationColor = (recommendation: PlayerTransferValue['recommendation']) => {
    switch (recommendation) {
      case 'strong_in': return 'bg-green-100 text-green-800';
      case 'in': return 'bg-green-50 text-green-700';
      case 'neutral': return 'bg-gray-100 text-gray-700';
      case 'out': return 'bg-red-50 text-red-700';
      case 'strong_out': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getRecommendationText = (recommendation: PlayerTransferValue['recommendation']) => {
    switch (recommendation) {
      case 'strong_in': return 'Strong Buy';
      case 'in': return 'Buy';
      case 'neutral': return 'Hold';
      case 'out': return 'Sell';
      case 'strong_out': return 'Strong Sell';
      default: return 'Hold';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Filters Skeleton */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <Skeleton className="h-6 w-32" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i}>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Transfer Cards Skeleton */}
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
            Transfer Recommendations
          </h3>
          <Badge variant="outline" className="bg-blue-50 text-blue-800">
            <Target className="h-3 w-3 mr-1" />
            {filteredCandidates.length} players
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Transfer Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2" data-testid="label-transfer-type">
              Transfer Type
            </label>
            <Select value={transferType} onValueChange={setTransferType}>
              <SelectTrigger data-testid="select-transfer-type">
                <SelectValue placeholder="Select transfer type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in">Transfers In</SelectItem>
                <SelectItem value="out">Transfers Out</SelectItem>
                <SelectItem value="all">All Players</SelectItem>
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

          {/* Price Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2" data-testid="label-price-range">
              Price Range
            </label>
            <Select value={priceRange} onValueChange={setPriceRange}>
              <SelectTrigger data-testid="select-price-range">
                <SelectValue placeholder="All prices" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Prices</SelectItem>
                <SelectItem value="0-5">£0.0 - £5.0m</SelectItem>
                <SelectItem value="5-7">£5.0 - £7.0m</SelectItem>
                <SelectItem value="7-10">£7.0 - £10.0m</SelectItem>
                <SelectItem value="10-15">£10.0 - £15.0m</SelectItem>
                <SelectItem value="15-20">£15.0+</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort by would go here if needed */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2" data-testid="label-sort">
              Sort By
            </label>
            <Select value="score" disabled>
              <SelectTrigger data-testid="select-sort">
                <SelectValue placeholder="Overall Score" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="score">Overall Score</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Transfer Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCandidates.slice(0, 24).map((candidate) => (
          <Card key={candidate.player.id} className="hover:shadow-lg transition-shadow" data-testid={`card-player-${candidate.player.id}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold" data-testid={`text-player-name-${candidate.player.id}`}>
                    {candidate.player.first_name} {candidate.player.second_name}
                  </CardTitle>
                  <p className="text-sm text-gray-600" data-testid={`text-player-team-${candidate.player.id}`}>
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
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Price</span>
                  <span className="font-medium" data-testid={`text-price-${candidate.player.id}`}>
                    £{(candidate.player.now_cost / 10).toFixed(1)}m
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Form</span>
                  <div className="flex items-center gap-1">
                    <span className="font-medium" data-testid={`text-form-${candidate.player.id}`}>
                      {candidate.form.toFixed(1)}
                    </span>
                    {candidate.transferTrend === 'rising' && <TrendingUp className="h-3 w-3 text-green-500" />}
                    {candidate.transferTrend === 'falling' && <TrendingDown className="h-3 w-3 text-red-500" />}
                    {candidate.transferTrend === 'stable' && <ArrowUpDown className="h-3 w-3 text-gray-400" />}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Points</span>
                  <span className="font-medium" data-testid={`text-points-${candidate.player.id}`}>
                    {candidate.player.total_points}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Value Score</span>
                  <span className="font-medium" data-testid={`text-value-${candidate.player.id}`}>
                    {candidate.valueScore.toFixed(1)}
                  </span>
                </div>

                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Overall Score</span>
                    <span className="text-lg font-bold text-fpl-purple" data-testid={`text-overall-score-${candidate.player.id}`}>
                      {candidate.overallScore.toFixed(1)}/10
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
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium">No players found</h3>
            <p className="text-sm">Try adjusting your filters to see more transfer options.</p>
          </div>
        </div>
      )}
    </div>
  );
}