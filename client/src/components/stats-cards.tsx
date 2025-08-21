import { Users, PoundSterling, Star, TrendingUp } from "lucide-react";
import { BootstrapData } from "@shared/schema";
import { StatsData } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

interface StatsCardsProps {
  data?: BootstrapData;
  isLoading: boolean;
}

export default function StatsCards({ data, isLoading }: StatsCardsProps) {
  const calculateStats = (data: BootstrapData): StatsData => {
    const players = data.elements;
    const totalPlayers = players.length;
    const avgPrice = (players.reduce((sum, p) => sum + p.now_cost, 0) / totalPlayers / 10).toFixed(1);
    
    // Find most owned player
    const mostOwnedPlayer = players.reduce((max, player) => 
      parseFloat(player.selected_by_percent) > parseFloat(max.selected_by_percent) ? player : max
    );
    const mostOwnedPercent = parseFloat(mostOwnedPlayer.selected_by_percent).toFixed(1);
    
    // Find best value player
    const bestValuePlayer = players.reduce((max, player) => 
      (parseFloat(player.value_season) || 0) > (parseFloat(max.value_season) || 0) ? player : max
    );
    const bestValueScore = (parseFloat(bestValuePlayer.value_season) || 0).toFixed(1);
    
    return {
      totalPlayers,
      avgPrice: `£${avgPrice}m`,
      mostOwned: `${mostOwnedPercent}%`,
      bestValue: `${bestValueScore} pts/£m`,
      mostOwnedPlayer: `${mostOwnedPlayer.first_name} ${mostOwnedPlayer.second_name}`,
      bestValuePlayer: `${bestValuePlayer.first_name} ${bestValuePlayer.second_name}`
    };
  };

  const stats = data ? calculateStats(data) : null;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow-md p-6 border-l-4 border-gray-200">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-16" />
              </div>
              <Skeleton className="h-12 w-12 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-fpl-green">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1" data-testid="text-total-players-label">Total Players</p>
            <p className="text-2xl font-bold text-gray-900" data-testid="text-total-players-value">{stats.totalPlayers}</p>
          </div>
          <div className="w-12 h-12 bg-fpl-green bg-opacity-10 rounded-full flex items-center justify-center">
            <Users className="text-fpl-green text-xl h-6 w-6" />
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1" data-testid="text-avg-price-label">Avg Player Price</p>
            <p className="text-2xl font-bold text-gray-900" data-testid="text-avg-price-value">{stats.avgPrice}</p>
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <PoundSterling className="text-blue-500 h-6 w-6" />
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-fpl-pink">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1" data-testid="text-most-owned-label">Most Owned</p>
            <p className="text-2xl font-bold text-gray-900" data-testid="text-most-owned-value">{stats.mostOwned}</p>
            <p className="text-xs text-gray-500 mt-1" data-testid="text-most-owned-player">{stats.mostOwnedPlayer}</p>
          </div>
          <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center">
            <Star className="text-fpl-pink h-6 w-6" />
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1" data-testid="text-best-value-label">Best Value</p>
            <p className="text-2xl font-bold text-gray-900" data-testid="text-best-value-value">{stats.bestValue}</p>
            <p className="text-xs text-gray-500 mt-1" data-testid="text-best-value-player">{stats.bestValuePlayer}</p>
          </div>
          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
            <TrendingUp className="text-orange-500 h-6 w-6" />
          </div>
        </div>
      </div>
    </div>
  );
}
