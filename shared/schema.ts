import { z } from "zod";
import { createInsertSchema } from "drizzle-zod";

// Hardcoded Premier League Teams Data
export const PREMIER_LEAGUE_TEAMS = [
  { id: 1, name: "Arsenal", short_name: "ARS", code: 3 },
  { id: 2, name: "Aston Villa", short_name: "AVL", code: 7 },
  { id: 3, name: "Burnley", short_name: "BUR", code: 90 },
  { id: 4, name: "Bournemouth", short_name: "BOU", code: 91 },
  { id: 5, name: "Brentford", short_name: "BRE", code: 94 },
  { id: 6, name: "Brighton", short_name: "BHA", code: 36 },
  { id: 7, name: "Chelsea", short_name: "CHE", code: 8 },
  { id: 8, name: "Crystal Palace", short_name: "CRY", code: 31 },
  { id: 9, name: "Everton", short_name: "EVE", code: 11 },
  { id: 10, name: "Fulham", short_name: "FUL", code: 54 },
  { id: 11, name: "Leeds", short_name: "LEE", code: 2 },
  { id: 12, name: "Liverpool", short_name: "LIV", code: 14 },
  { id: 13, name: "Man City", short_name: "MCI", code: 43 },
  { id: 14, name: "Man Utd", short_name: "MUN", code: 1 },
  { id: 15, name: "Newcastle", short_name: "NEW", code: 4 },
  { id: 16, name: "Nott'm Forest", short_name: "NFO", code: 17 },
  { id: 17, name: "Sunderland", short_name: "SUN", code: 56 },
  { id: 18, name: "Spurs", short_name: "TOT", code: 6 },
  { id: 19, name: "West Ham", short_name: "WHU", code: 21 },
  { id: 20, name: "Wolves", short_name: "WOL", code: 39 },
] as const;

// Team lookup maps for efficient access
export const TEAMS_BY_ID = Object.fromEntries(
  PREMIER_LEAGUE_TEAMS.map(team => [team.id, team])
);

export const TEAMS_BY_SHORT_NAME = Object.fromEntries(
  PREMIER_LEAGUE_TEAMS.map(team => [team.short_name, team])
);

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
  // New defensive contribution fields for 2025/26 season
  defensive_contribution: z.number().optional(),
  defensive_contribution_per_90: z.number().optional(),
  tackles: z.number().optional(),
  recoveries: z.number().optional(),
  clearances_blocks_interceptions: z.number().optional(),
  starts: z.number().optional(),
  starts_per_90: z.number().optional(),
  expected_goals: z.string().optional(),
  expected_assists: z.string().optional(),
  expected_goal_involvements: z.string().optional(),
  expected_goals_per_90: z.number().optional(),
  expected_assists_per_90: z.number().optional(),
  expected_goal_involvements_per_90: z.number().optional(),
  expected_goals_conceded: z.string().optional(),
  expected_goals_conceded_per_90: z.number().optional(),
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
  total_players: z.number(),
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

// Import database utilities for schema definitions
import { sql } from 'drizzle-orm';
import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  boolean,
  decimal,
  json,
  varchar,
  index,
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

// Admin settings for Team Clean Sheet Projections model
export const adminCSProjectionSettings = pgTable("admin_cs_projection_settings", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  
  // Core CS parameters
  decayFactor: decimal("decay_factor", { precision: 4, scale: 3 }).default("0.02"),
  
  // Base rate boosts for different defense tiers
  weakDefenseBoost: decimal("weak_defense_boost", { precision: 4, scale: 2 }).default("3.0"), // 200% boost
  averageDefenseBoost: decimal("average_defense_boost", { precision: 4, scale: 2 }).default("1.75"), // 75% boost
  strongDefenseBoost: decimal("strong_defense_boost", { precision: 4, scale: 2 }).default("1.3"), // 30% boost
  
  // Defensive floors by tier
  eliteDefensiveFloor: decimal("elite_defensive_floor", { precision: 4, scale: 1 }).default("25"),
  strongDefensiveFloor: decimal("strong_defensive_floor", { precision: 4, scale: 1 }).default("22"),
  averageDefensiveFloor: decimal("average_defensive_floor", { precision: 4, scale: 1 }).default("18"),
  weakDefensiveFloor: decimal("weak_defensive_floor", { precision: 4, scale: 1 }).default("16"),
  promotedDefensiveFloor: decimal("promoted_defensive_floor", { precision: 4, scale: 1 }).default("15"),
  
  // Context multipliers for clean sheets
  derbyCSMultiplier: decimal("derby_cs_multiplier", { precision: 4, scale: 2 }).default("0.82"),
  topSixCSMultiplier: decimal("top_six_cs_multiplier", { precision: 4, scale: 2 }).default("0.88"),
  relegationBattleCSMultiplier: decimal("relegation_battle_cs_multiplier", { precision: 4, scale: 2 }).default("0.78"),
  earlyKickoffCSMultiplier: decimal("early_kickoff_cs_multiplier", { precision: 4, scale: 2 }).default("1.06"),
  lateKickoffCSMultiplier: decimal("late_kickoff_cs_multiplier", { precision: 4, scale: 2 }).default("0.93"),
  postEuropeanCSMultiplier: decimal("post_european_cs_multiplier", { precision: 4, scale: 2 }).default("0.87"),
  midweekFixtureCSMultiplier: decimal("midweek_fixture_cs_multiplier", { precision: 4, scale: 2 }).default("0.95"),
  seasonFinaleCSMultiplier: decimal("season_finale_cs_multiplier", { precision: 4, scale: 2 }).default("0.90"),
  newManagerBounceCSMultiplier: decimal("new_manager_bounce_cs_multiplier", { precision: 4, scale: 2 }).default("1.03"),
  weatherConditionsCSMultiplier: decimal("weather_conditions_cs_multiplier", { precision: 4, scale: 2 }).default("1.02"),
  
  // Metadata
  lastUpdated: timestamp("last_updated").defaultNow(),
  updatedBy: varchar("updated_by").default("admin"),
});

export type AdminCSProjectionSettings = typeof adminCSProjectionSettings.$inferSelect;
export type InsertAdminCSProjectionSettings = typeof adminCSProjectionSettings.$inferInsert;

// Admin settings for Team Goals Against Projections model
export const adminGoalsAgainstSettings = pgTable("admin_goals_against_settings", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  
  // Core defensive parameters
  globalDefensiveMultiplier: decimal("global_defensive_multiplier", { precision: 4, scale: 2 }).default("1.0"),
  defensiveConfidenceBoost: decimal("defensive_confidence_boost", { precision: 4, scale: 2 }).default("0.85"),
  weakDefenseThreshold: decimal("weak_defense_threshold", { precision: 4, scale: 2 }).default("0.60"),
  
  // Defensive tier multipliers
  eliteDefenseMultiplier: decimal("elite_defense_multiplier", { precision: 4, scale: 2 }).default("0.75"),
  strongDefenseMultiplier: decimal("strong_defense_multiplier", { precision: 4, scale: 2 }).default("0.85"),
  averageDefenseMultiplier: decimal("average_defense_multiplier", { precision: 4, scale: 2 }).default("1.0"),
  weakDefenseMultiplier: decimal("weak_defense_multiplier", { precision: 4, scale: 2 }).default("1.15"),
  promotedDefenseMultiplier: decimal("promoted_defense_multiplier", { precision: 4, scale: 2 }).default("1.25"),
  
  // Goals against bounds
  minGoalsAgainst: decimal("min_goals_against", { precision: 4, scale: 2 }).default("0.5"),
  maxGoalsAgainst: decimal("max_goals_against", { precision: 4, scale: 2 }).default("3.5"),
  
  // Metadata
  lastUpdated: timestamp("last_updated").defaultNow(),
  updatedBy: varchar("updated_by").default("admin"),
});

export type AdminGoalsAgainstSettings = typeof adminGoalsAgainstSettings.$inferSelect;
export type InsertAdminGoalsAgainstSettings = typeof adminGoalsAgainstSettings.$inferInsert;

// Admin settings for Team Assist Projections model
export const adminAssistProjectionSettings = pgTable("admin_assist_projection_settings", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  
  // Core assist parameters
  globalAssistMultiplier: decimal("global_assist_multiplier", { precision: 4, scale: 2 }).default("1.0"),
  creativityBoost: decimal("creativity_boost", { precision: 4, scale: 2 }).default("1.15"),
  lowCreativityThreshold: decimal("low_creativity_threshold", { precision: 4, scale: 2 }).default("0.65"),
  
  // Assist tier multipliers
  eliteAttackMultiplier: decimal("elite_attack_multiplier", { precision: 4, scale: 2 }).default("1.25"),
  strongAttackMultiplier: decimal("strong_attack_multiplier", { precision: 4, scale: 2 }).default("1.15"),
  averageAttackMultiplier: decimal("average_attack_multiplier", { precision: 4, scale: 2 }).default("1.0"),
  weakAttackMultiplier: decimal("weak_attack_multiplier", { precision: 4, scale: 2 }).default("0.85"),
  promotedAttackMultiplier: decimal("promoted_attack_multiplier", { precision: 4, scale: 2 }).default("0.75"),
  
  // Assist bounds
  minAssistsPerGame: decimal("min_assists_per_game", { precision: 4, scale: 2 }).default("0.3"),
  maxAssistsPerGame: decimal("max_assists_per_game", { precision: 4, scale: 2 }).default("2.5"),
  
  // Metadata
  lastUpdated: timestamp("last_updated").defaultNow(),
  updatedBy: varchar("updated_by").default("admin"),
});

export type AdminAssistProjectionSettings = typeof adminAssistProjectionSettings.$inferSelect;
export type InsertAdminAssistProjectionSettings = typeof adminAssistProjectionSettings.$inferInsert;

// Player mappings for current season (stable data only)
export const playerMappings = pgTable("player_mappings", {
  id: integer("id").primaryKey(), // FPL player ID
  firstName: varchar("first_name", { length: 100 }),
  secondName: varchar("second_name", { length: 100 }),
  webName: varchar("web_name", { length: 50 }),
  currentTeamId: integer("current_team_id").notNull(),
  currentTeamName: varchar("current_team_name", { length: 100 }),
  position: varchar("position", { length: 20 }),
  lastUpdated: timestamp("last_updated").defaultNow(),
}, (table) => [
  index("idx_player_mappings_team").on(table.currentTeamId),
]);

export type PlayerMapping = typeof playerMappings.$inferSelect;
export type InsertPlayerMapping = typeof playerMappings.$inferInsert;

// Admin settings for Match Projections model
export const adminMatchProjectionSettings = pgTable("admin_match_projection_settings", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  
  // Core match projection parameters
  homeAdvantageMultiplier: decimal("home_advantage_multiplier", { precision: 4, scale: 2 }).default("1.15"),
  strengthMultiplierBase: decimal("strength_multiplier_base", { precision: 4, scale: 2 }).default("2.2"),
  
  // Goal bounds for match projections
  homeMinGoals: decimal("home_min_goals", { precision: 4, scale: 2 }).default("0.5"),
  homeMaxGoals: decimal("home_max_goals", { precision: 4, scale: 2 }).default("4.0"),
  awayMinGoals: decimal("away_min_goals", { precision: 4, scale: 2 }).default("0.3"),
  awayMaxGoals: decimal("away_max_goals", { precision: 4, scale: 2 }).default("3.5"),
  
  // Clean sheet calculation parameters
  cleanSheetExponent: decimal("clean_sheet_exponent", { precision: 4, scale: 2 }).default("1.0"), // For Math.exp(-goals * exponent)
  cleanSheetMultiplier: decimal("clean_sheet_multiplier", { precision: 4, scale: 2 }).default("100"), // Convert to percentage
  
  // Match context adjustments
  derbyMatchMultiplier: decimal("derby_match_multiplier", { precision: 4, scale: 2 }).default("0.92"),
  topSixMatchMultiplier: decimal("top_six_match_multiplier", { precision: 4, scale: 2 }).default("1.08"),
  relegationBattleMultiplier: decimal("relegation_battle_multiplier", { precision: 4, scale: 2 }).default("0.88"),
  
  // Metadata
  lastUpdated: timestamp("last_updated").defaultNow(),
  updatedBy: varchar("updated_by").default("admin"),
});

export type AdminMatchProjectionSettings = typeof adminMatchProjectionSettings.$inferSelect;
export type InsertAdminMatchProjectionSettings = typeof adminMatchProjectionSettings.$inferInsert;

// Unified Projection Settings - persistent storage for all projection controls
export const unifiedProjectionSettings = pgTable("unified_projection_settings", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  
  // Core balance controls
  autoBalance: boolean("auto_balance").default(true),
  leagueGoalsPerSeason: integer("league_goals_per_season").default(1050),
  
  // Global multipliers
  globalTierMultiplier: decimal("global_tier_multiplier", { precision: 4, scale: 2 }).default("1.25"),
  lowConfidenceBoost: decimal("low_confidence_boost", { precision: 4, scale: 2 }).default("1.25"),
  lowConfidenceThreshold: decimal("low_confidence_threshold", { precision: 4, scale: 2 }).default("0.65"),
  
  // Match context multipliers
  derbyMatchMultiplier: decimal("derby_match_multiplier", { precision: 4, scale: 2 }).default("0.87"),
  topSixMatchMultiplier: decimal("top_six_match_multiplier", { precision: 4, scale: 2 }).default("1.12"),
  relegationBattleMultiplier: decimal("relegation_battle_multiplier", { precision: 4, scale: 2 }).default("0.83"),
  earlyKickoffMultiplier: decimal("early_kickoff_multiplier", { precision: 4, scale: 2 }).default("0.94"),
  lateKickoffMultiplier: decimal("late_kickoff_multiplier", { precision: 4, scale: 2 }).default("1.07"),
  postEuropeanMultiplier: decimal("post_european_multiplier", { precision: 4, scale: 2 }).default("0.88"),
  midweekFixtureMultiplier: decimal("midweek_fixture_multiplier", { precision: 4, scale: 2 }).default("0.91"),
  seasonFinaleMultiplier: decimal("season_finale_multiplier", { precision: 4, scale: 2 }).default("1.05"),
  newManagerBounceMultiplier: decimal("new_manager_bounce_multiplier", { precision: 4, scale: 2 }).default("1.08"),
  weatherConditionsMultiplier: decimal("weather_conditions_multiplier", { precision: 4, scale: 2 }).default("0.96"),
  
  // Offensive tier multipliers
  eliteAttackMultiplier: decimal("elite_attack_multiplier", { precision: 4, scale: 2 }).default("1.30"),
  strongAttackMultiplier: decimal("strong_attack_multiplier", { precision: 4, scale: 2 }).default("1.15"),
  averageAttackMultiplier: decimal("average_attack_multiplier", { precision: 4, scale: 2 }).default("1.00"),
  weakAttackMultiplier: decimal("weak_attack_multiplier", { precision: 4, scale: 2 }).default("0.85"),
  promotedAttackMultiplier: decimal("promoted_attack_multiplier", { precision: 4, scale: 2 }).default("0.70"),
  
  // Offensive variance controls
  offensiveVarianceEnabled: boolean("offensive_variance_enabled").default(false),
  eliteAttackingGoals: integer("elite_attacking_goals").default(80),
  weakAttackingGoals: integer("weak_attacking_goals").default(35),
  
  // Defensive tier multipliers
  eliteDefenseMultiplier: decimal("elite_defense_multiplier", { precision: 4, scale: 2 }).default("0.60"),
  strongDefenseMultiplier: decimal("strong_defense_multiplier", { precision: 4, scale: 2 }).default("0.75"),
  averageDefenseMultiplier: decimal("average_defense_multiplier", { precision: 4, scale: 2 }).default("1.00"),
  weakDefenseMultiplier: decimal("weak_defense_multiplier", { precision: 4, scale: 2 }).default("1.35"),
  promotedDefenseMultiplier: decimal("promoted_defense_multiplier", { precision: 4, scale: 2 }).default("1.60"),

  // Team tier assignments (JSON arrays of team IDs)
  eliteAttackTeams: text("elite_attack_teams").default("[]"),
  strongAttackTeams: text("strong_attack_teams").default("[]"),
  averageAttackTeams: text("average_attack_teams").default("[]"),
  weakAttackTeams: text("weak_attack_teams").default("[]"),
  promotedAttackTeams: text("promoted_attack_teams").default("[]"),
  eliteDefenseTeams: text("elite_defense_teams").default("[1]"),
  strongDefenseTeams: text("strong_defense_teams").default("[12,13,7,16,15,9]"),
  averageDefenseTeams: text("average_defense_teams").default("[8,14,18,2,10]"),
  weakDefenseTeams: text("weak_defense_teams").default("[6,19,20,4,5]"),
  promotedDefenseTeams: text("promoted_defense_teams").default("[3,11,17]"),
  
  // Bounds and limits
  absoluteMinGoals: decimal("absolute_min_goals", { precision: 4, scale: 2 }).default("0.30"),
  absoluteMaxGoals: decimal("absolute_max_goals", { precision: 4, scale: 2 }).default("4.20"),
  marketFloorMultiplier: decimal("market_floor_multiplier", { precision: 4, scale: 2 }).default("0.40"),
  marketCeilingMultiplier: decimal("market_ceiling_multiplier", { precision: 4, scale: 2 }).default("2.00"),
  
  // Venue Factors
  homeAdvantageMultiplier: decimal("home_advantage_multiplier", { precision: 4, scale: 2 }).default("1.15"),
  awayFactorMultiplier: decimal("away_factor_multiplier", { precision: 4, scale: 2 }).default("0.88"),
  
  // Metadata
  lastUpdated: timestamp("last_updated").defaultNow(),
  updatedBy: varchar("updated_by").default("admin"),
});

export type UnifiedProjectionSettings = typeof unifiedProjectionSettings.$inferSelect;

// FPL Content Creators table
export const fplContentCreators = pgTable("fpl_content_creators", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  name: varchar("name", { length: 100 }).notNull(),
  managerId: integer("manager_id").notNull(), // FPL manager ID
  managerName: varchar("manager_name", { length: 100 }).notNull(), // FPL team name
  playerName: varchar("player_name", { length: 100 }), // Player's real name (first + last)
  description: text("description"),
  twitterHandle: varchar("twitter_handle", { length: 100 }), // Twitter handle (e.g., @FPL_Harry)
  youtubeUrl: varchar("youtube_url", { length: 255 }), // YouTube channel URL
  followers: integer("followers"),
  isActive: boolean("is_active").default(true),
  addedDate: timestamp("added_date").defaultNow(),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export type FplContentCreator = typeof fplContentCreators.$inferSelect;
export type InsertFplContentCreator = typeof fplContentCreators.$inferInsert;

export const insertFplContentCreatorSchema = createInsertSchema(fplContentCreators);

// FPL Content Creator tracking data (historical snapshots)
export const fplCreatorTracking = pgTable("fpl_creator_tracking", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  creatorId: integer("creator_id").notNull().references(() => fplContentCreators.id),
  gameweek: integer("gameweek").notNull(),
  
  // FPL Performance Data
  overallRank: integer("overall_rank"),
  overallPoints: integer("overall_points"),
  gameweekPoints: integer("gameweek_points"),
  gameweekRank: integer("gameweek_rank"),
  teamValue: decimal("team_value", { precision: 4, scale: 1 }), // e.g., 100.5
  bank: decimal("bank", { precision: 4, scale: 1 }), // money in bank
  totalTransfers: integer("total_transfers"),
  freeTransfers: integer("free_transfers"),
  wildcardUsed: boolean("wildcard_used").default(false),
  benchBoostUsed: boolean("bench_boost_used").default(false),
  freeHitUsed: boolean("free_hit_used").default(false),
  tripleCaptainUsed: boolean("triple_captain_used").default(false),
  
  // Team Analysis
  captainPlayerId: integer("captain_player_id"),
  captainPlayerName: varchar("captain_player_name", { length: 100 }),
  viceCaptainPlayerId: integer("vice_captain_player_id"),
  viceCaptainPlayerName: varchar("vice_captain_player_name", { length: 100 }),
  
  // Transfer Activity
  transfersIn: json("transfers_in"), // Array of {playerId, playerName, cost}
  transfersOut: json("transfers_out"), // Array of {playerId, playerName, cost}
  hitsTaken: integer("hits_taken").default(0),
  
  // Metadata
  recordedAt: timestamp("recorded_at").defaultNow(),
  isVerified: boolean("is_verified").default(false), // Whether data has been manually verified
});

export type FplCreatorTracking = typeof fplCreatorTracking.$inferSelect;
export type InsertFplCreatorTracking = typeof fplCreatorTracking.$inferInsert;

export const insertFplCreatorTrackingSchema = createInsertSchema(fplCreatorTracking);
export type InsertUnifiedProjectionSettings = typeof unifiedProjectionSettings.$inferInsert;
