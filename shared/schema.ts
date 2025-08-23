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

// Re-export watchlist types
export * from "./watchlist-schema";

// Import pgTable for database schema definitions
import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  pgTable,
  timestamp,
  varchar,
  decimal,
  date,
} from "drizzle-orm/pg-core";

// Session storage table
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: varchar("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Daily price tracking table for historical price and transfer data
export const dailyPlayerPrices = pgTable("daily_player_prices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: integer("player_id").notNull(),
  playerName: varchar("player_name").notNull(),
  recordDate: date("record_date").notNull(),
  originalPrice: integer("original_price").notNull(), // Start of season price
  currentPrice: integer("current_price").notNull(), // Price on this date
  ownership: decimal("ownership", { precision: 5, scale: 2 }).notNull(), // Ownership percentage
  totalTransfersIn: integer("total_transfers_in").notNull(),
  totalTransfersOut: integer("total_transfers_out").notNull(),
  dailyTransfersIn: integer("daily_transfers_in").default(0), // Calculated from previous day
  dailyTransfersOut: integer("daily_transfers_out").default(0), // Calculated from previous day
  priceChangeEvent: integer("price_change_event").default(0), // Price change in this gameweek
  teamId: integer("team_id"),
  position: varchar("position"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_daily_prices_player_date").on(table.playerId, table.recordDate),
  index("idx_daily_prices_date").on(table.recordDate),
]);

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type DailyPlayerPrice = typeof dailyPlayerPrices.$inferSelect;
export type InsertDailyPlayerPrice = typeof dailyPlayerPrices.$inferInsert;

// FPL Teams table with projection metadata
export const fplTeams = pgTable("fpl_teams", {
  id: integer("id").primaryKey(), // Official FPL team ID
  name: varchar("name").notNull(),
  shortName: varchar("short_name").notNull(),
  code: integer("code").notNull(),
  
  // Projection metadata for 2025/26 season
  expectedGoalsPerGame: decimal("expected_goals_per_game", { precision: 4, scale: 2 }),
  goalVariance: decimal("goal_variance", { precision: 4, scale: 2 }),
  goalConfidence: decimal("goal_confidence", { precision: 4, scale: 2 }),
  
  baseCleanSheetRate: decimal("base_clean_sheet_rate", { precision: 4, scale: 2 }),
  homeBonus: decimal("home_bonus", { precision: 4, scale: 2 }),
  cleanSheetConfidence: decimal("clean_sheet_confidence", { precision: 4, scale: 2 }),
  
  // Team classification for tiered projections
  attackingTier: varchar("attacking_tier"), // 'elite', 'strong', 'average', 'weak', 'promoted'
  defensiveTier: varchar("defensive_tier"), // 'elite', 'strong', 'average', 'weak', 'promoted'
  
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_fpl_teams_name").on(table.name),
  index("idx_fpl_teams_tier").on(table.attackingTier),
]);

export type FplTeam = typeof fplTeams.$inferSelect;
export type InsertFplTeam = typeof fplTeams.$inferInsert;

// Admin settings for Team Goal Projections model
export const adminGoalProjectionSettings = pgTable("admin_goal_projection_settings", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  
  // Global multipliers
  globalTierMultiplier: decimal("global_tier_multiplier", { precision: 4, scale: 2 }).default("1.25"),
  lowConfidenceBoost: decimal("low_confidence_boost", { precision: 4, scale: 2 }).default("1.25"),
  lowConfidenceThreshold: decimal("low_confidence_threshold", { precision: 4, scale: 2 }).default("0.65"),
  
  // Context multipliers
  derbyGoalsMultiplier: decimal("derby_goals_multiplier", { precision: 4, scale: 2 }).default("0.87"),
  topSixGoalsMultiplier: decimal("top_six_goals_multiplier", { precision: 4, scale: 2 }).default("1.12"),
  relegationBattleGoalsMultiplier: decimal("relegation_battle_goals_multiplier", { precision: 4, scale: 2 }).default("0.83"),
  earlyKickoffGoalsMultiplier: decimal("early_kickoff_goals_multiplier", { precision: 4, scale: 2 }).default("0.94"),
  lateKickoffGoalsMultiplier: decimal("late_kickoff_goals_multiplier", { precision: 4, scale: 2 }).default("1.07"),
  postEuropeanGoalsMultiplier: decimal("post_european_goals_multiplier", { precision: 4, scale: 2 }).default("0.88"),
  midweekFixtureGoalsMultiplier: decimal("midweek_fixture_goals_multiplier", { precision: 4, scale: 2 }).default("0.91"),
  seasonFinaleGoalsMultiplier: decimal("season_finale_goals_multiplier", { precision: 4, scale: 2 }).default("1.05"),
  newManagerBounceGoalsMultiplier: decimal("new_manager_bounce_goals_multiplier", { precision: 4, scale: 2 }).default("1.08"),
  weatherConditionsGoalsMultiplier: decimal("weather_conditions_goals_multiplier", { precision: 4, scale: 2 }).default("0.96"),
  
  // Market bounds
  marketFloorMultiplier: decimal("market_floor_multiplier", { precision: 4, scale: 2 }).default("0.4"),
  marketCeilingMultiplier: decimal("market_ceiling_multiplier", { precision: 4, scale: 2 }).default("2.0"),
  absoluteMinGoals: decimal("absolute_min_goals", { precision: 4, scale: 2 }).default("0.3"),
  absoluteMaxGoals: decimal("absolute_max_goals", { precision: 4, scale: 2 }).default("4.2"),
  
  // Metadata
  lastUpdated: timestamp("last_updated").defaultNow(),
  updatedBy: varchar("updated_by").default("admin"),
});

export type AdminGoalProjectionSettings = typeof adminGoalProjectionSettings.$inferSelect;
export type InsertAdminGoalProjectionSettings = typeof adminGoalProjectionSettings.$inferInsert;
