import { Users, PoundSterling, Star, TrendingUp, Target, Zap, UserPlus, Activity } from "lucide-react";
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
    
    // Find specific players for different stats
    const mostOwnedPlayer = players.reduce((max, p) => 
      parseFloat(p.selected_by_percent) > parseFloat(max.selected_by_percent) ? p : max
    );
    
    const bestValuePlayer = players.reduce((max, p) => 
      (parseFloat(p.value_season) || 0) > (parseFloat(max.value_season) || 0) ? p : max
    );
    
    const mostPointsPlayer = players.reduce((max, p) => 
      p.total_points > max.total_points ? p : max
    );
    
    const mostGoalsPlayer = players.reduce((max, p) => 
      p.goals_scored > max.goals_scored ? p : max
    );
    
    const mostAssistsPlayer = players.reduce((max, p) => 
      p.assists > max.assists ? p : max
    );
    
    const bestFormPlayer = players.reduce((max, p) => 
      parseFloat(p.form) > parseFloat(max.form) ? p : max
    );
    
    return {
      totalPlayers,
      avgPrice: `£${avgPrice}m`,
      mostOwned: {
        value: `${parseFloat(mostOwnedPlayer.selected_by_percent).toFixed(1)}%`,
        player: `${mostOwnedPlayer.first_name} ${mostOwnedPlayer.second_name}`
      },
      bestValue: {
        value: `${parseFloat(bestValuePlayer.value_season || '0').toFixed(1)} pts/£m`,
        player: `${bestValuePlayer.first_name} ${bestValuePlayer.second_name}`
      },
      mostPoints: {
        value: `${mostPointsPlayer.total_points} pts`,
        player: `${mostPointsPlayer.first_name} ${mostPointsPlayer.second_name}`
      },
      mostGoals: {
        value: `${mostGoalsPlayer.goals_scored} goals`,
        player: `${mostGoalsPlayer.first_name} ${mostGoalsPlayer.second_name}`
      },
      mostAssists: {
        value: `${mostAssistsPlayer.assists} assists`,
        player: `${mostAssistsPlayer.first_name} ${mostAssistsPlayer.second_name}`
      },
      bestForm: {
        value: `${parseFloat(bestFormPlayer.form).toFixed(1)} avg`,
        player: `${bestFormPlayer.first_name} ${bestFormPlayer.second_name}`
      }
    };
  };

  const stats = data ? calculateStats(data) : null;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow-md p-4 border-l-4 border-gray-200">
            <div className="flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      title: "Total Players",
      value: stats.totalPlayers.toString(),
      player: null,
      icon: Users,
      bgColor: "border-fpl-green",
      iconBg: "bg-fpl-green bg-opacity-10",
      iconColor: "text-fpl-green",
      testId: "total-players"
    },
    {
      title: "Avg Player Price", 
      value: stats.avgPrice,
      player: null,
      icon: PoundSterling,
      bgColor: "border-blue-500",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-500",
      testId: "avg-price"
    },
    {
      title: "Most Points",
      value: stats.mostPoints.value,
      player: stats.mostPoints.player,
      icon: Target,
      bgColor: "border-green-500",
      iconBg: "bg-green-100",
      iconColor: "text-green-500",
      testId: "most-points"
    },
    {
      title: "Most Goals",
      value: stats.mostGoals.value,
      player: stats.mostGoals.player,
      icon: Zap,
      bgColor: "border-red-500",
      iconBg: "bg-red-100",
      iconColor: "text-red-500",
      testId: "most-goals"
    },
    {
      title: "Most Assists",
      value: stats.mostAssists.value,
      player: stats.mostAssists.player,
      icon: UserPlus,
      bgColor: "border-purple-500",
      iconBg: "bg-purple-100",
      iconColor: "text-purple-500",
      testId: "most-assists"
    },
    {
      title: "Best Form",
      value: stats.bestForm.value,
      player: stats.bestForm.player,
      icon: Activity,
      bgColor: "border-yellow-500",
      iconBg: "bg-yellow-100",
      iconColor: "text-yellow-500",
      testId: "best-form"
    },
    {
      title: "Most Owned",
      value: stats.mostOwned.value,
      player: stats.mostOwned.player,
      icon: Star,
      bgColor: "border-fpl-pink",
      iconBg: "bg-pink-100",
      iconColor: "text-fpl-pink",
      testId: "most-owned"
    },
    {
      title: "Best Value",
      value: stats.bestValue.value,
      player: stats.bestValue.player,
      icon: TrendingUp,
      bgColor: "border-orange-500",
      iconBg: "bg-orange-100",
      iconColor: "text-orange-500",
      testId: "best-value"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {statCards.map((card) => (
        <div key={card.testId} className={`bg-white rounded-lg shadow-md p-4 border-l-4 ${card.bgColor}`}>
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-600 mb-1" data-testid={`text-${card.testId}-label`}>
                {card.title}
              </p>
              <p className="text-lg font-bold text-gray-900 mb-1" data-testid={`text-${card.testId}-value`}>
                {card.value}
              </p>
              {card.player && (
                <p className="text-xs text-gray-500 truncate" data-testid={`text-${card.testId}-player`}>
                  {card.player}
                </p>
              )}
            </div>
            <div className={`w-10 h-10 ${card.iconBg} rounded-full flex items-center justify-center ml-3 flex-shrink-0`}>
              <card.icon className={`${card.iconColor} h-5 w-5`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
