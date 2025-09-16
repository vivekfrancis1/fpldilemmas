export interface FilterState {
  search: string;
  position: string;
  team: string;
  maxPrice: string;
}

export type SortableField = 
  | "total_points" | "minutes" | "goals_scored" | "assists" | "clean_sheets" 
  | "goals_conceded" | "penalties_saved" | "penalties_missed" | "yellow_cards" 
  | "red_cards" | "saves" | "bonus" | "bps" | "form" | "points_per_game" 
  | "selected_by_percent" | "now_cost" | "value_form" | "value_season" 
  | "transfers_in" | "transfers_out" | "transfers_in_event" | "transfers_out_event"
  | "influence" | "creativity" | "threat" | "ict_index" | "event_points" 
  | "dreamteam_count" | "own_goals" | "cost_change_event" | "cost_change_event_fall"
  | "cost_change_start" | "cost_change_start_fall" | "ep_next" | "ep_this"
  | "squad_number" | "defensive_contribution" | "defensive_contribution_per_90"
  | "tackles" | "recoveries" | "clearances_blocks_interceptions" | "starts"
  | "starts_per_90" | "expected_goals" | "expected_assists" | "expected_goal_involvements"
  | "expected_goals_conceded" | "expected_goals_per_90" | "expected_assists_per_90"
  | "expected_goal_involvements_per_90" | "expected_goals_conceded_per_90" | "defensive_contribution_points" | "save_points" | "minutes_points" | "gc_points" | "attack_points";

export interface SortState {
  field: SortableField;
  direction: 'asc' | 'desc';
}

export interface PlayerStat {
  value: string;
  player: string;
}

export interface StatsData {
  totalPlayers: number;
  avgPrice: string;
  mostOwned: PlayerStat;
  bestValue: PlayerStat;
  mostPoints: PlayerStat;
  mostGoals: PlayerStat;
  mostAssists: PlayerStat;
  bestForm: PlayerStat;
}
