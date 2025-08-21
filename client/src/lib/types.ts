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
  | "squad_number";

export interface SortState {
  field: SortableField;
  direction: 'asc' | 'desc';
}

export interface StatsData {
  totalPlayers: number;
  avgPrice: string;
  mostOwned: string;
  bestValue: string;
}
