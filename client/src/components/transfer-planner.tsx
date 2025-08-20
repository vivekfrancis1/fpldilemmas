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
      
      // Form score (0-10)
      const form = parseFloat(player.form) || 0;
      
      // Value score (points per million)
      const valueScore = player.now_cost > 0 ? (player.total_points / (player.now_cost / 10)) : 0;
      
      // Fixture difficulty score (next 5 fixtures)
      const teamFixtures = fixtures
        .filter(f => (f.team_h === team.id || f.team_a === team.id) && !f.finished)
        .slice(0, 5);
      
      const avgFixtureDifficulty = teamFixtures.length > 0 
        ? teamFixtures.reduce((sum, f) => {
            const difficulty = f.team_h === team.id ? f.team_h_difficulty : f.team_a_difficulty;
            return sum + difficulty;
          }, 0) / teamFixtures.length
        : 3;
      
      const fixtureScore = 6 - avgFixtureDifficulty; // Invert so easier fixtures = higher score
      
      // Transfer trend based on transfers in/out
      let transferTrend: PlayerTransferValue['transferTrend'] = 'stable';
      const transfersNet = player.transfers_in_event - player.transfers_out_event;
      if (transfersNet > 50000) transferTrend = 'rising';
      else if (transfersNet < -50000) transferTrend = 'falling';
      
      // Overall score
      const overallScore = (form * 0.4) + (valueScore * 0.3) + (fixtureScore * 0.3);
      
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
        recommendation
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