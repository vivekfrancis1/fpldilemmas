import { z } from "zod";

export const playerSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  second_name: z.string(),
  web_name: z.string(),
  element_type: z.number(),
  team: z.number(),
  now_cost: z.number(),
  total_points: z.number(),
  form: z.string(),
  points_per_game: z.string(),
  selected_by_percent: z.string(),
  value_form: z.string(),
  value_season: z.string(),
  minutes: z.number(),
  goals_scored: z.number(),
  assists: z.number(),
  clean_sheets: z.number(),
  goals_conceded: z.number(),
  own_goals: z.number(),
  penalties_saved: z.number(),
  penalties_missed: z.number(),
  yellow_cards: z.number(),
  red_cards: z.number(),
  saves: z.number(),
  bonus: z.number(),
  bps: z.number(),
  influence: z.string(),
  creativity: z.string(),
  threat: z.string(),
  ict_index: z.string(),
  news: z.string(),
  news_added: z.string().nullable(),
  chance_of_playing_this_round: z.number().nullable(),
  chance_of_playing_next_round: z.number().nullable(),
  cost_change_event: z.number(),
  cost_change_event_fall: z.number(),
  cost_change_start: z.number(),
  cost_change_start_fall: z.number(),
  dreamteam_count: z.number(),
  ep_next: z.string().nullable(),
  ep_this: z.string().nullable(),
  event_points: z.number(),
  in_dreamteam: z.boolean(),
  photo: z.string(),
  special: z.boolean(),
  squad_number: z.number().nullable(),
  status: z.string(),
  transfers_in: z.number(),
  transfers_in_event: z.number(),
  transfers_out: z.number(),
  transfers_out_event: z.number(),
});

// Historical player data schema for previous seasons
export const historicalPlayerDataSchema = z.object({
  season_name: z.string(),
  element_code: z.number(),
  start_cost: z.number(),
  end_cost: z.number(),
  total_points: z.number(),
  minutes: z.number(),
  goals_scored: z.number(),
  assists: z.number(),
  clean_sheets: z.number(),
  goals_conceded: z.number(),
  own_goals: z.number(),
  penalties_saved: z.number(),
  penalties_missed: z.number(),
  yellow_cards: z.number(),
  red_cards: z.number(),
  saves: z.number(),
  bonus: z.number(),
  bps: z.number(),
  influence: z.string(),
  creativity: z.string(),
  threat: z.string(),
  ict_index: z.string(),
});

// Extended player schema with historical data
export const playerWithHistorySchema = playerSchema.extend({
  history_past: z.array(historicalPlayerDataSchema).optional(),
  first_name: z.string(),
  second_name: z.string(),
  team_name: z.string().optional(),
  position: z.string().optional(),
});

export const teamSchema = z.object({
  id: z.number(),
  name: z.string(),
  short_name: z.string(),
  code: z.number(),
  strength: z.number(),
  strength_overall_home: z.number(),
  strength_overall_away: z.number(),
  strength_attack_home: z.number(),
  strength_attack_away: z.number(),
  strength_defence_home: z.number(),
  strength_defence_away: z.number(),
  pulse_id: z.number(),
});

export const elementTypeSchema = z.object({
  id: z.number(),
  plural_name: z.string(),
  plural_name_short: z.string(),
  singular_name: z.string(),
  singular_name_short: z.string(),
  squad_select: z.number(),
  squad_min_play: z.number(),
  squad_max_play: z.number(),
  ui_shirt_specific: z.boolean(),
  sub_positions_locked: z.array(z.number()),
  element_count: z.number(),
});

export const fixtureSchema = z.object({
  id: z.number(),
  code: z.number(),
  event: z.number().nullable(),
  finished: z.boolean(),
  finished_provisional: z.boolean(),
  kickoff_time: z.string().nullable(),
  minutes: z.number(),
  provisional_start_time: z.boolean(),
  started: z.boolean(),
  team_a: z.number(),
  team_a_score: z.number().nullable(),
  team_h: z.number(),
  team_h_score: z.number().nullable(),
  stats: z.array(z.any()),
  team_h_difficulty: z.number(),
  team_a_difficulty: z.number(),
  pulse_id: z.number(),
});

export const bootstrapDataSchema = z.object({
  elements: z.array(playerSchema),
  teams: z.array(teamSchema),
  element_types: z.array(elementTypeSchema),
  events: z.array(z.any()),
});

export const playerSummarySchema = z.object({
  fixtures: z.array(fixtureSchema),
  history: z.array(z.any()),
  history_past: z.array(z.any()),
});

export type Player = z.infer<typeof playerSchema>;
export type HistoricalPlayerData = z.infer<typeof historicalPlayerDataSchema>;
export type PlayerWithHistory = z.infer<typeof playerWithHistorySchema>;
export type Team = z.infer<typeof teamSchema>;
export type ElementType = z.infer<typeof elementTypeSchema>;
export type Fixture = z.infer<typeof fixtureSchema>;
export type BootstrapData = z.infer<typeof bootstrapDataSchema>;
export type PlayerSummary = z.infer<typeof playerSummarySchema>;


