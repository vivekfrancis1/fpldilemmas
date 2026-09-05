import { Users, Shield, Star, TrendingUp, Target, Zap, UserPlus, Activity } from "lucide-react";
import { BootstrapData } from "@shared/schema";
import { StatsData } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

interface StatsCardsProps {
  data?: BootstrapData;
  isLoading: boolean;
}

export default function StatsCards({ data, isLoading }: StatsCardsProps) {
  // Ties are common for whole-number counting stats (goals, assists, points, DC) — especially
  // early in a season — so list every player at the max, not just whichever one `reduce` happens
  // to hit first. Names use FPL's own `web_name` (e.g. "Evanilson"), the short name FPL itself
  // displays everywhere, rather than the unwieldy first_name + second_name combination.
  const namesAtMax = (players: BootstrapData["elements"], valueFn: (p: any) => number): string => {
    const maxValue = players.reduce((max, p) => Math.max(max, valueFn(p)), -Infinity);
    return players
      .filter((p) => valueFn(p) === maxValue)
      .map((p) => p.web_name)
      .join(", ");
  };

  const calculateStats = (data: BootstrapData): StatsData => {
    const players = data.elements;
    const totalPlayers = players.length;
    // Find specific players for different stats
    const mostOwnedPlayer = players.reduce((max, p) =>
      parseFloat(p.selected_by_percent) > parseFloat(max.selected_by_percent) ? p : max
    );

    const bestValuePlayer = players.reduce((max, p) =>
      (parseFloat(p.value_season) || 0) > (parseFloat(max.value_season) || 0) ? p : max
    );

    const mostPointsValue = players.reduce((max, p) => Math.max(max, p.total_points), -Infinity);
    const mostGoalsValue = players.reduce((max, p) => Math.max(max, p.goals_scored), -Infinity);
    const mostAssistsValue = players.reduce((max, p) => Math.max(max, p.assists), -Infinity);
    const mostDCValue = players.reduce((max, p) => Math.max(max, (p as any).defensive_contribution || 0), -Infinity);

    const bestFormPlayer = players.reduce((max, p) =>
      parseFloat(p.form) > parseFloat(max.form) ? p : max
    );

    return {
      totalPlayers,
      mostOwned: {
        value: `${parseFloat(mostOwnedPlayer.selected_by_percent).toFixed(1)}%`,
        player: mostOwnedPlayer.web_name
      },
      bestValue: {
        value: `${parseFloat(bestValuePlayer.value_season || '0').toFixed(1)} pts/£m`,
        player: bestValuePlayer.web_name
      },
      mostPoints: {
        value: `${mostPointsValue} pts`,
        player: namesAtMax(players, (p) => p.total_points)
      },
      mostGoals: {
        value: `${mostGoalsValue} goals`,
        player: namesAtMax(players, (p) => p.goals_scored)
      },
      mostAssists: {
        value: `${mostAssistsValue} assists`,
        player: namesAtMax(players, (p) => p.assists)
      },
      mostDefensiveContributions: {
        value: `${mostDCValue} DC`,
        player: namesAtMax(players, (p) => (p as any).defensive_contribution || 0)
      },
      bestForm: {
        value: `${parseFloat(bestFormPlayer.form).toFixed(1)} avg`,
        player: bestFormPlayer.web_name
      }
    };
  };

  const stats = data ? calculateStats(data) : null;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm p-1.5 sm:p-2 border-l-2 border-gray-200">
            <div className="flex items-center justify-between">
              <div className="space-y-1 flex-1 min-w-0">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-12" />
              </div>
              <Skeleton className="h-6 w-6 rounded-full flex-shrink-0" />
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
      title: "Most Defensive Contributions",
      value: stats.mostDefensiveContributions.value,
      player: stats.mostDefensiveContributions.player,
      icon: Shield,
      bgColor: "border-blue-500",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-500",
      testId: "most-dc"
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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-2">
      {statCards.map((card) => (
        <div key={card.testId} className={`bg-white rounded-lg shadow-sm p-1.5 sm:p-2 border-l-2 ${card.bgColor}`} title={card.player || undefined}>
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-xs text-gray-600 truncate" data-testid={`text-${card.testId}-label`}>
                {card.title}
              </p>
              <p className="text-xs sm:text-sm font-bold text-gray-900 truncate" data-testid={`text-${card.testId}-value`}>
                {card.value}
              </p>
            </div>
            <div className={`w-6 h-6 ${card.iconBg} rounded-full flex items-center justify-center flex-shrink-0`}>
              <card.icon className={`${card.iconColor} h-3 w-3`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
