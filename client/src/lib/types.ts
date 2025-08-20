export interface FilterState {
  search: string;
  position: string;
  team: string;
  maxPrice: string;
}

export interface SortState {
  field: string;
  direction: 'asc' | 'desc';
}

export interface StatsData {
  totalPlayers: number;
  avgPrice: string;
  mostOwned: string;
  bestValue: string;
}
