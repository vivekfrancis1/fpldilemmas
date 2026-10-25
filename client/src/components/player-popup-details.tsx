import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Calendar, ArrowLeft } from "lucide-react";
import { PosChip, TeamChip, asPos } from "@/components/tool-ui";
import { BootstrapData } from "@shared/schema";
import { getFixtureDifficultyColor } from "@/lib/heatmap-colors";

interface PlayerPopupDetailsProps {
  player: {
    id: number;
    web_name?: string;
    first_name?: string;
    second_name?: string;
    team: number;
    element_type: number;
    now_cost?: number;
    total_points?: number;
    points_per_game?: string;
    form?: string;
    selected_by_percent?: string;
    value_season?: string;
    value_form?: string;
    minutes?: number;
    goals_scored?: number;
    assists?: number;
    clean_sheets?: number;
    goals_conceded?: number;
    saves?: number;
    penalties_saved?: number;
    bonus?: number;
    bps?: number;
    yellow_cards?: number;
    red_cards?: number;
    dreamteam_count?: number;
    cost_change_event?: number;
    cost_change_start?: number;
    influence?: string;
    creativity?: string;
    threat?: string;
    ict_index?: string;
    expected_goals?: string;
    expected_assists?: string;
    expected_goal_involvements?: string;
    expected_goals_conceded?: string;
    starts?: number;
    defensive_contribution?: number;
    [key: string]: any;
  };
  children?: React.ReactNode;
}

const getDifficultyColor = (difficulty: number) => getFixtureDifficultyColor(difficulty);

const getPositionName = (elementType: number) => {
  switch (elementType) {
    case 1: return "GKP";
    case 2: return "DEF";
    case 3: return "MID";
    case 4: return "FWD";
    default: return "UNK";
  }
};

type ViewMode = 'default' | 'stats' | 'fixtures';

export function PlayerPopupDetails({ player, children }: PlayerPopupDetailsProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('default');

  const { data: bootstrapData } = useQuery<BootstrapData>({
    queryKey: ['/api/bootstrap-static'],
    staleTime: 5 * 60 * 1000,
  });

  const { data: fixturesData } = useQuery<any[]>({
    queryKey: ['/api/fixtures'],
    staleTime: 5 * 60 * 1000,
  });

  const currentGameweek = useMemo(() => {
    if (!bootstrapData?.events) return 1;
    const current = bootstrapData.events.find((e: any) => e.is_current);
    return current?.id || 1;
  }, [bootstrapData]);

  const teamName = useMemo(() => {
    if (!bootstrapData?.teams) return '';
    const team = bootstrapData.teams.find((t: any) => t.id === player.team);
    return team?.short_name || team?.name || '';
  }, [bootstrapData, player.team]);

  const upcomingFixtures = useMemo(() => {
    if (!fixturesData || !bootstrapData?.teams) return [];
    
    const upcoming: Array<{
      gameweek: number;
      fixtures: Array<{ opponent: string; difficulty: number; isHome: boolean }>;
    }> = [];

    for (let gw = currentGameweek + 1; gw <= Math.min(currentGameweek + 12, 38); gw++) {
      const gwFixtures = fixturesData
        .filter((f: any) => f.event === gw && (f.team_h === player.team || f.team_a === player.team))
        .map((f: any) => {
          const isHome = f.team_h === player.team;
          const opponentId = isHome ? f.team_a : f.team_h;
          const opponentTeam = bootstrapData.teams.find((t: any) => t.id === opponentId);
          return {
            opponent: opponentTeam?.short_name || 'TBD',
            difficulty: isHome ? f.team_h_difficulty : f.team_a_difficulty,
            isHome,
          };
        });
      
      upcoming.push({ gameweek: gw, fixtures: gwFixtures });
    }

    return upcoming;
  }, [fixturesData, bootstrapData, player.team, currentGameweek]);

  const elementType = player.element_type;

  const statsGrid = useMemo(() => {
    const ppg = parseFloat(player.points_per_game || '0');
    const gamesPlayed = ppg > 0 ? Math.round((player.total_points || 0) / ppg) : 0;
    const stats: Array<{ label: string; value: string | number; color: string }> = [
      { label: 'Matches Played', value: gamesPlayed, color: 'text-gray-700' },
      { label: 'Starts', value: player.starts || 0, color: 'text-gray-600' },
      { label: 'Minutes', value: player.minutes || 0, color: 'text-gray-700' },
      { label: 'Total Points', value: player.total_points || 0, color: 'text-indigo-700 dark:text-indigo-300' },
      { label: 'PPG', value: player.points_per_game || '0.0', color: 'text-sky-700 dark:text-sky-300' },
      { label: 'Form', value: player.form || '0.0', color: 'text-indigo-700 dark:text-indigo-300' },
      { label: 'Price', value: `£${((player.now_cost || 0) / 10).toFixed(1)}m`, color: 'text-emerald-700 dark:text-emerald-300' },
      { label: 'Value', value: player.value_season || '0.0', color: 'text-teal-700 dark:text-teal-300' },
      { label: 'Own%', value: `${player.selected_by_percent || '0'}%`, color: 'text-gray-700' },
      { label: 'Goals', value: player.goals_scored || 0, color: 'text-emerald-700 dark:text-emerald-300' },
      { label: 'Assists', value: player.assists || 0, color: 'text-sky-600 dark:text-sky-300' },
      { label: 'DC', value: player.defensive_contribution || 0, color: 'text-amber-600 dark:text-amber-300' },
      { label: 'xG', value: player.expected_goals ? parseFloat(player.expected_goals).toFixed(2) : '0.00', color: 'text-indigo-600 dark:text-indigo-300' },
      { label: 'xA', value: player.expected_assists ? parseFloat(player.expected_assists).toFixed(2) : '0.00', color: 'text-sky-600 dark:text-sky-300' },
      { label: 'xGI', value: player.expected_goal_involvements ? parseFloat(player.expected_goal_involvements).toFixed(2) : '0.00', color: 'text-indigo-600 dark:text-indigo-300' },
    ];

    if ([1, 2].includes(elementType)) {
      stats.push({ label: 'Goals Conceded', value: player.goals_conceded || 0, color: 'text-red-600 dark:text-red-300' });
      stats.push({ label: 'xGC', value: player.expected_goals_conceded ? parseFloat(player.expected_goals_conceded).toFixed(2) : '0.00', color: 'text-red-600 dark:text-red-300' });
    }
    if ([1, 2, 3].includes(elementType)) {
      stats.push({ label: 'Clean Sheets', value: player.clean_sheets || 0, color: 'text-emerald-600 dark:text-emerald-300' });
    }
    if (elementType === 1) {
      stats.push({ label: 'Saves', value: player.saves || 0, color: 'text-sky-600 dark:text-sky-300' });
      stats.push({ label: 'Pen Saved', value: player.penalties_saved || 0, color: 'text-emerald-700 dark:text-emerald-300' });
    }

    stats.push(
      { label: 'Bonus', value: player.bonus || 0, color: 'text-indigo-600 dark:text-indigo-300' },
      { label: 'YC', value: player.yellow_cards || 0, color: 'text-amber-600 dark:text-amber-300' },
      { label: 'RC', value: player.red_cards || 0, color: 'text-red-600 dark:text-red-300' },
    );

    return stats;
  }, [player, elementType]);

  if (viewMode === 'stats') {
    return (
      <div className="space-y-3">
        <button
          onClick={() => setViewMode('default')}
          className="flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-300 hover:text-indigo-800 dark:hover:text-indigo-100 font-bold transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="flex items-center gap-2 mb-2">
          <span className="font-bold text-base">{player.web_name}</span>
          <PosChip pos={asPos(getPositionName(elementType))} />
          <TeamChip>{teamName}</TeamChip>
        </div>

        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          {statsGrid.map((stat, idx) => (
            <div key={idx} className="rounded-xl border border-gray-200 bg-white p-1.5 text-center shadow-sm sm:p-2">
              <div className="mb-0.5 truncate text-[9px] font-bold uppercase leading-tight tracking-wide text-gray-500 sm:text-[10px]">{stat.label}</div>
              <div className={`text-xs font-extrabold tabular-nums sm:text-sm ${stat.color}`}>{stat.value}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (viewMode === 'fixtures') {
    return (
      <div className="space-y-3">
        <button
          onClick={() => setViewMode('default')}
          className="flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-300 hover:text-indigo-800 dark:hover:text-indigo-100 font-bold transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="flex items-center gap-2 mb-2">
          <span className="font-bold text-base">{player.web_name}</span>
          <PosChip pos={asPos(getPositionName(elementType))} />
          <TeamChip>{teamName}</TeamChip>
        </div>

        <div className="space-y-1.5">
          {upcomingFixtures.map((gw) => (
            <div key={gw.gameweek} className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500 w-10 shrink-0">GW{gw.gameweek}</span>
              {gw.fixtures.length > 0 ? (
                <div className="flex gap-1.5 flex-wrap">
                  {gw.fixtures.map((fix, fIdx) => (
                    <span
                      key={fIdx}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold ${getDifficultyColor(fix.difficulty)}`}
                    >
                      {fix.opponent}
                      <span className="text-[10px] opacity-70">({fix.isHome ? 'H' : 'A'})</span>
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-gray-400 italic">No fixture</span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {children}

      <div className={`flex gap-2 ${children ? 'pt-2 border-t border-gray-200' : ''}`}>
        <button
          onClick={() => setViewMode('stats')}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl text-xs sm:text-sm font-bold hover:from-indigo-500 hover:to-violet-500 transition-all"
        >
          <BarChart3 className="h-3.5 w-3.5" />
          Season Statistics
        </button>
        <button
          onClick={() => setViewMode('fixtures')}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 border border-indigo-500/40 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs sm:text-sm font-bold hover:bg-indigo-500/20 transition-all"
        >
          <Calendar className="h-3.5 w-3.5" />
          Upcoming Fixtures
        </button>
      </div>
    </div>
  );
}
