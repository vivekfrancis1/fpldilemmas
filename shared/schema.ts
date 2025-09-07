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

// Historical player stats types
export type HistoricalPlayerStats = typeof historicalPlayerStats.$inferSelect;
export type InsertHistoricalPlayerStats = typeof historicalPlayerStats.$inferInsert;

// Pre-calculated player summary table for optimized queries
export const playerSummaryCache = pgTable("player_summary_cache", {
  playerId: integer("player_id").primaryKey(),
  playerName: varchar("player_name", { length: 100 }),
  teamName: varchar("team_name", { length: 50 }),
  teamShort: varchar("team_short", { length: 10 }),
  position: varchar("position", { length: 10 }),
  season: varchar("season", { length: 10 }).default("2025/26"),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    seasonIdx: index("player_summary_cache_season_idx").on(table.season)
  };
});

export type PlayerSummaryCache = typeof playerSummaryCache.$inferSelect;
export type InsertPlayerSummaryCache = typeof playerSummaryCache.$inferInsert;

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
  jsonb,
  varchar,
  index,
  uniqueIndex,
  date,
  real,
  primaryKey,
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
  email: varchar("email").unique().notNull(),
  password: varchar("password").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  role: varchar("role").notNull().default("user"), // "admin" or "user"
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

// Comprehensive historical player stats table for storing all previous seasons' metrics
export const historicalPlayerStats = pgTable("historical_player_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: integer("player_id").notNull(),
  playerName: varchar("player_name").notNull(),
  season: varchar("season").notNull(), // Format: "2023/24", "2022/23", etc.
  teamId: integer("team_id").notNull(),
  teamName: varchar("team_name").notNull(),
  position: varchar("position").notNull(), // "Goalkeeper", "Defender", "Midfielder", "Forward"
  elementType: integer("element_type").notNull(), // 1=GK, 2=DEF, 3=MID, 4=FWD
  
  // Core attacking metrics
  goalsScored: integer("goals_scored").notNull().default(0),
  assists: integer("assists").notNull().default(0),
  
  // Core defensive metrics
  clearancesBlocksInterceptions: integer("clearances_blocks_interceptions").notNull().default(0), // CBI
  tackles: integer("tackles").notNull().default(0), // T
  recoveries: integer("recoveries").notNull().default(0), // R
  defensiveContribution: integer("defensive_contribution").notNull().default(0), // DC (calculated based on position)
  cleanSheets: integer("clean_sheets").notNull().default(0),
  goalsConceded: integer("goals_conceded").notNull().default(0),
  
  // Goalkeeping specific
  saves: integer("saves").notNull().default(0),
  penaltiesSaved: integer("penalties_saved").notNull().default(0),
  
  // Disciplinary
  yellowCards: integer("yellow_cards").notNull().default(0),
  redCards: integer("red_cards").notNull().default(0),
  
  // Performance metrics
  minutes: integer("minutes").notNull().default(0),
  starts: integer("starts").notNull().default(0),
  totalPoints: integer("total_points").notNull().default(0),
  bonus: integer("bonus").notNull().default(0),
  bps: integer("bps").notNull().default(0),
  
  // Expected metrics (if available in historical data)
  expectedGoals: decimal("expected_goals", { precision: 5, scale: 2 }),
  expectedAssists: decimal("expected_assists", { precision: 5, scale: 2 }),
  expectedGoalsConceded: decimal("expected_goals_conceded", { precision: 5, scale: 2 }),
  
  // ICT Index components
  influence: decimal("influence", { precision: 5, scale: 1 }),
  creativity: decimal("creativity", { precision: 5, scale: 1 }),
  threat: decimal("threat", { precision: 5, scale: 1 }),
  ictIndex: decimal("ict_index", { precision: 5, scale: 1 }),
  
  // Per-90 minute rates for normalized comparison
  goalsPer90: decimal("goals_per_90", { precision: 5, scale: 2 }),
  assistsPer90: decimal("assists_per_90", { precision: 5, scale: 2 }),
  defensiveContributionPer90: decimal("defensive_contribution_per_90", { precision: 5, scale: 2 }),
  tacklesPer90: decimal("tackles_per_90", { precision: 5, scale: 2 }),
  recoveriesPer90: decimal("recoveries_per_90", { precision: 5, scale: 2 }),
  cbiPer90: decimal("cbi_per_90", { precision: 5, scale: 2 }),
  cleanSheetsPer90: decimal("clean_sheets_per_90", { precision: 5, scale: 2 }),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_historical_player_season").on(table.playerId, table.season),
  index("idx_historical_season").on(table.season),
  index("idx_historical_position").on(table.elementType),
  index("idx_historical_team").on(table.teamId),
  index("idx_historical_player_team_season").on(table.playerId, table.teamId, table.season),
]);

// Price changes table for tracking actual price movements
export const priceChanges = pgTable("price_changes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: integer("player_id").notNull(),
  playerName: varchar("player_name").notNull(),
  teamId: integer("team_id"),
  teamName: varchar("team_name"),
  position: varchar("position"),
  oldPrice: integer("old_price").notNull(), // Previous price
  newPrice: integer("new_price").notNull(), // New price after change
  priceChange: integer("price_change").notNull(), // Change amount (can be negative)
  changeDate: date("change_date").notNull(), // Date when change was detected
  ownership: decimal("ownership", { precision: 5, scale: 2 }).notNull(), // Ownership at time of change
  transfersIn: integer("transfers_in").default(0), // Season total transfers in
  transfersOut: integer("transfers_out").default(0), // Season total transfers out
  transfersInGw: integer("transfers_in_gw").default(0), // Gameweek transfers in
  transfersOutGw: integer("transfers_out_gw").default(0), // Gameweek transfers out
  totalSeasonChange: integer("total_season_change").default(0), // Total change from season start
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_price_changes_player").on(table.playerId),
  index("idx_price_changes_date").on(table.changeDate),
  index("idx_price_changes_player_date").on(table.playerId, table.changeDate),
]);

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type DailyPlayerPrice = typeof dailyPlayerPrices.$inferSelect;
export type InsertDailyPlayerPrice = typeof dailyPlayerPrices.$inferInsert;
export type PriceChange = typeof priceChanges.$inferSelect;
export type InsertPriceChange = typeof priceChanges.$inferInsert;

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

// Player Projections Cache - Stores pre-calculated projections for fast retrieval
export const playerProjections = pgTable("player_projections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: integer("player_id").notNull(),
  playerName: varchar("player_name").notNull(),
  teamId: integer("team_id").notNull(),
  teamName: varchar("team_name").notNull(),
  position: varchar("position").notNull(),
  elementType: integer("element_type").notNull(), // 1=GK, 2=DEF, 3=MID, 4=FWD
  
  // Current season data (from FPL API)
  currentPrice: integer("current_price").notNull(), // Price in tenths (e.g., 75 = £7.5m)
  ownership: decimal("ownership", { precision: 5, scale: 2 }).notNull(),
  
  // Gameweek-specific projections (stored as JSON for flexibility)
  goalProjections: jsonb("goal_projections").notNull(), // {gw4: 0.15, gw5: 0.22, ...}
  assistProjections: jsonb("assist_projections").notNull(),
  cleanSheetProjections: jsonb("clean_sheet_projections").notNull(),
  minutesProjections: jsonb("minutes_projections").notNull(),
  defensiveProjections: jsonb("defensive_projections").notNull(),
  totalPointsProjections: jsonb("total_points_projections").notNull(),
  
  // Summary stats for quick access
  totalGoals: decimal("total_goals", { precision: 5, scale: 2 }).notNull(),
  totalAssists: decimal("total_assists", { precision: 5, scale: 2 }).notNull(),
  totalPoints: decimal("total_points", { precision: 6, scale: 2 }).notNull(),
  averagePointsPerGameweek: decimal("average_points_per_gameweek", { precision: 5, scale: 2 }).notNull(),
  seasonProjectedPoints: integer("season_projected_points").notNull(),
  
  // Projection metadata
  gameweekRange: varchar("gameweek_range").notNull(), // "4-9", "10-15", etc.
  startGameweek: integer("start_gameweek").notNull(),
  endGameweek: integer("end_gameweek").notNull(),
  season: varchar("season").notNull().default("2025/26"),
  
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_player_projections_player").on(table.playerId),
  index("idx_player_projections_range").on(table.startGameweek, table.endGameweek),
  index("idx_player_projections_total_points").on(table.totalPoints),
  index("idx_player_projections_updated").on(table.lastUpdated),
  uniqueIndex("idx_player_projections_unique").on(table.playerId, table.startGameweek, table.endGameweek, table.season),
]);

// Team Projections Cache - Stores team-level projections  
export const teamProjections = pgTable("team_projections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: integer("team_id").notNull(),
  teamName: varchar("team_name").notNull(),
  
  // Gameweek-specific team projections
  goalProjections: jsonb("goal_projections").notNull(), // {gw4: 1.8, gw5: 2.1, ...}
  cleanSheetProjections: jsonb("clean_sheet_projections").notNull(), // {gw4: 0.45, gw5: 0.32, ...}
  goalsAgainstProjections: jsonb("goals_against_projections").notNull(),
  
  // Goal/assist share data by position
  goalShareData: jsonb("goal_share_data").notNull(), // {gw4: {playerId: sharePercentage}, ...}
  assistShareData: jsonb("assist_share_data").notNull(),
  
  // Range metadata
  gameweekRange: varchar("gameweek_range").notNull(),
  startGameweek: integer("start_gameweek").notNull(),
  endGameweek: integer("end_gameweek").notNull(),
  season: varchar("season").notNull().default("2025/26"),
  
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_team_projections_team").on(table.teamId),
  index("idx_team_projections_range").on(table.startGameweek, table.endGameweek),
  uniqueIndex("idx_team_projections_unique").on(table.teamId, table.startGameweek, table.endGameweek, table.season),
]);

// Projection Update Log - Track when projections were last calculated
export const projectionUpdateLog = pgTable("projection_update_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  updateType: varchar("update_type").notNull(), // "player_projections", "team_projections", "full_refresh"
  gameweekRange: varchar("gameweek_range").notNull(),
  playersUpdated: integer("players_updated").default(0),
  teamsUpdated: integer("teams_updated").default(0),
  duration: integer("duration").notNull(), // Update duration in milliseconds
  status: varchar("status").notNull(), // "success", "partial", "failed"
  errorDetails: jsonb("error_details"),
  startedAt: timestamp("started_at").notNull(),
  completedAt: timestamp("completed_at").defaultNow(),
}, (table) => [
  index("idx_projection_log_type").on(table.updateType),
  index("idx_projection_log_completed").on(table.completedAt),
]);

export type PlayerProjection = typeof playerProjections.$inferSelect;
export type InsertPlayerProjection = typeof playerProjections.$inferInsert;
export type TeamProjection = typeof teamProjections.$inferSelect;
export type InsertTeamProjection = typeof teamProjections.$inferInsert;
export type ProjectionUpdateLog = typeof projectionUpdateLog.$inferSelect;

// Player Contributions - Detailed breakdown of individual player contributions to team totals
export const playerContributions = pgTable("player_contributions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: integer("player_id").notNull(),
  playerName: varchar("player_name").notNull(),
  teamId: integer("team_id").notNull(),
  gameweekRange: varchar("gameweek_range").notNull(),
  season: varchar("season").notNull().default("2025/26"),
  
  // Raw projections (goals, assists, etc.)
  projectedGoals: decimal("projected_goals", { precision: 6, scale: 2 }).notNull().default("0"),
  projectedAssists: decimal("projected_assists", { precision: 6, scale: 2 }).notNull().default("0"),
  projectedCleanSheets: decimal("projected_clean_sheets", { precision: 6, scale: 2 }).notNull().default("0"),
  projectedDefensiveContributions: decimal("projected_defensive_contributions", { precision: 6, scale: 2 }).notNull().default("0"),
  projectedMinutes: decimal("projected_minutes", { precision: 6, scale: 2 }).notNull().default("0"),
  projectedBonus: decimal("projected_bonus", { precision: 6, scale: 2 }).notNull().default("0"),
  
  // FPL point conversions by category
  goalsToPoints: decimal("goals_to_points", { precision: 6, scale: 2 }).notNull().default("0"),
  assistsToPoints: decimal("assists_to_points", { precision: 6, scale: 2 }).notNull().default("0"),
  cleanSheetsToPoints: decimal("clean_sheets_to_points", { precision: 6, scale: 2 }).notNull().default("0"),
  defensiveToPoints: decimal("defensive_to_points", { precision: 6, scale: 2 }).notNull().default("0"),
  minutesToPoints: decimal("minutes_to_points", { precision: 6, scale: 2 }).notNull().default("0"),
  bonusToPoints: decimal("bonus_to_points", { precision: 6, scale: 2 }).notNull().default("0"),
  
  // Team share percentages
  goalSharePercentage: decimal("goal_share_percentage", { precision: 5, scale: 2 }).default("0"),
  assistSharePercentage: decimal("assist_share_percentage", { precision: 5, scale: 2 }).default("0"),
  
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_player_contributions_player").on(table.playerId),
  index("idx_player_contributions_team").on(table.teamId),
  index("idx_player_contributions_range").on(table.gameweekRange),
  uniqueIndex("idx_player_contributions_unique").on(table.playerId, table.gameweekRange, table.season),
]);

export type PlayerContribution = typeof playerContributions.$inferSelect;
export type InsertPlayerContribution = typeof playerContributions.$inferInsert;

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
  
  // Clean Sheet Parameters
  cleanSheetExponent: decimal("clean_sheet_exponent", { precision: 4, scale: 2 }).default("1.15"),
  cleanSheetMultiplier: decimal("clean_sheet_multiplier", { precision: 4, scale: 2 }).default("85"),
  
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
  eliteAttackMultiplier: decimal("elite_attack_multiplier", { precision: 4, scale: 2 }).default("1.35"),
  strongAttackMultiplier: decimal("strong_attack_multiplier", { precision: 4, scale: 2 }).default("1.15"),
  averageAttackMultiplier: decimal("average_attack_multiplier", { precision: 4, scale: 2 }).default("1.00"),
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
  cleanSheetExponent: decimal("clean_sheet_exponent", { precision: 4, scale: 2 }).default("1.15"), // For Math.exp(-goals * exponent)
  cleanSheetMultiplier: decimal("clean_sheet_multiplier", { precision: 4, scale: 2 }).default("85"), // Convert to percentage
  
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
  eliteAttackMultiplier: decimal("elite_attack_multiplier", { precision: 4, scale: 2 }).default("1.35"),
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
  strongDefenseTeams: text("strong_defense_teams").default("[12,13,7,15,9]"),
  averageDefenseTeams: text("average_defense_teams").default("[8,14,18,2,10,16]"),
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

// Historical xG data cache - pre-calculated and never changes
export const historicalXGCache = pgTable("historical_xg_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: integer("player_id").notNull(),
  playerName: varchar("player_name").notNull(),
  season: varchar("season").notNull(), // "2024/25", "2023/24", etc.
  firstName: varchar("first_name"),
  secondName: varchar("second_name"),
  webName: varchar("web_name"),
  teamId: integer("team_id"),
  teamName: varchar("team_name"),
  elementType: integer("element_type").notNull(), // 1=GK, 2=DEF, 3=MID, 4=FWD
  
  // xG metrics
  expectedGoals: decimal("expected_goals", { precision: 6, scale: 3 }).notNull().default("0"),
  minutes: integer("minutes").notNull().default(0),
  xgPer90: decimal("xg_per_90", { precision: 6, scale: 3 }).notNull().default("0"),
  
  // Cache metadata
  createdAt: timestamp("created_at").defaultNow(),
  lastUpdated: timestamp("last_updated").defaultNow(),
}, (table) => [
  index("idx_historical_xg_player_season").on(table.playerId, table.season),
  index("idx_historical_xg_season").on(table.season),
  index("idx_historical_xg_name").on(table.playerName),
  uniqueIndex("idx_historical_xg_unique").on(table.playerId, table.season),
]);

export type HistoricalXGCache = typeof historicalXGCache.$inferSelect;
export type InsertHistoricalXGCache = typeof historicalXGCache.$inferInsert;

// Player Projection Cache Tables
export const playerGoalsProjections = pgTable("player_goals_projections", {
  playerId: integer("player_id").notNull(),
  gameweek: integer("gameweek").notNull(),
  season: text("season").notNull().default("2025/26"),
  goals: real("goals").notNull().default(0),
  calculatedAt: timestamp("calculated_at").defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.playerId, table.gameweek] }),
}));

export const playerAssistProjections = pgTable("player_assist_projections", {
  playerId: integer("player_id").notNull(),
  gameweek: integer("gameweek").notNull(),
  season: text("season").notNull().default("2025/26"),
  assists: real("assists").notNull().default(0),
  calculatedAt: timestamp("calculated_at").defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.playerId, table.gameweek] }),
}));

export const teamCleanSheetProjections = pgTable("team_clean_sheet_projections", {
  teamId: integer("team_id").notNull(),
  gameweek: integer("gameweek").notNull(),
  season: text("season").notNull().default("2025/26"),
  cleanSheetProbability: real("clean_sheet_probability").notNull().default(0),
  calculatedAt: timestamp("calculated_at").defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.teamId, table.gameweek] }),
}));

export const playerDefensiveProjections = pgTable("player_defensive_projections", {
  playerId: integer("player_id").notNull(),
  gameweek: integer("gameweek").notNull(),
  season: text("season").notNull().default("2025/26"),
  defensiveContribution: real("defensive_contribution").notNull().default(0),
  points: real("points").notNull().default(0),
  calculatedAt: timestamp("calculated_at").defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.playerId, table.gameweek] }),
}));

export const playerMinutesProjections = pgTable("player_minutes_projections", {
  playerId: integer("player_id").notNull(),
  gameweek: integer("gameweek").notNull(),
  season: text("season").notNull().default("2025/26"),
  minutes: real("minutes").notNull().default(0),
  calculatedAt: timestamp("calculated_at").defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.playerId, table.gameweek] }),
}));

// Types for projection cache tables
export type PlayerGoalsProjection = typeof playerGoalsProjections.$inferSelect;
export type InsertPlayerGoalsProjection = typeof playerGoalsProjections.$inferInsert;

export type PlayerAssistProjection = typeof playerAssistProjections.$inferSelect;
export type InsertPlayerAssistProjection = typeof playerAssistProjections.$inferInsert;

export type TeamCleanSheetProjection = typeof teamCleanSheetProjections.$inferSelect;
export type InsertTeamCleanSheetProjection = typeof teamCleanSheetProjections.$inferInsert;

export type PlayerDefensiveProjection = typeof playerDefensiveProjections.$inferSelect;
export type InsertPlayerDefensiveProjection = typeof playerDefensiveProjections.$inferInsert;

export type PlayerMinutesProjection = typeof playerMinutesProjections.$inferSelect;
export type InsertPlayerMinutesProjection = typeof playerMinutesProjections.$inferInsert;

// Gameweek Data Cache Tables - Store actual FPL data when gameweeks complete
export const gameweekPlayerDataTable = pgTable("gameweek_player_data", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull(),
  gameweek: integer("gameweek").notNull(),
  season: text("season").notNull().default("2025/26"), // e.g., "2025/26"
  
  // Core FPL stats from element-summary API
  minutes: integer("minutes").default(0),
  goals_scored: integer("goals_scored").default(0),
  assists: integer("assists").default(0),
  clean_sheets: integer("clean_sheets").default(0),
  goals_conceded: integer("goals_conceded").default(0),
  own_goals: integer("own_goals").default(0),
  penalties_saved: integer("penalties_saved").default(0),
  penalties_missed: integer("penalties_missed").default(0),
  yellow_cards: integer("yellow_cards").default(0),
  red_cards: integer("red_cards").default(0),
  saves: integer("saves").default(0),
  bonus: integer("bonus").default(0),
  bps: integer("bps").default(0),
  total_points: integer("total_points").default(0),
  
  // Defensive stats (if available)
  defensive_contribution: integer("defensive_contribution").default(0),
  tackles: integer("tackles").default(0),
  recoveries: integer("recoveries").default(0),
  clearances_blocks_interceptions: integer("clearances_blocks_interceptions").default(0),
  starts: integer("starts").default(0),
  
  // Metadata
  wasHome: boolean("was_home").default(false),
  opponentTeam: integer("opponent_team"),
  fixtureId: integer("fixture_id"),
  kickoffTime: timestamp("kickoff_time"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => [
  index("idx_gameweek_player_data_player_gw").on(table.playerId, table.gameweek),
  index("idx_gameweek_player_data_season_gw").on(table.season, table.gameweek),
]);

export const gameweekUpdateLogTable = pgTable("gameweek_update_log", {
  id: serial("id").primaryKey(),
  gameweek: integer("gameweek").notNull(),
  season: text("season").notNull().default("2025/26"),
  updateType: text("update_type").notNull(), // "completed", "partial", "failed"
  playersUpdated: integer("players_updated").default(0),
  errors: jsonb("errors"), // Store any errors that occurred
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  duration: integer("duration_ms"), // milliseconds
});

// Export schemas for the new tables
export const insertGameweekPlayerDataSchema = createInsertSchema(gameweekPlayerDataTable);
export type InsertGameweekPlayerData = z.infer<typeof insertGameweekPlayerDataSchema>;
export type GameweekPlayerData = typeof gameweekPlayerDataTable.$inferSelect;

export const insertGameweekUpdateLogSchema = createInsertSchema(gameweekUpdateLogTable);
export type InsertGameweekUpdateLog = z.infer<typeof insertGameweekUpdateLogSchema>;
export type GameweekUpdateLog = typeof gameweekUpdateLogTable.$inferSelect;

// FPL Scoring Component Cache Tables
export const cachedPlayerSaves = pgTable("cached_player_saves", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull(),
  playerName: text("player_name").notNull(),
  teamName: text("team_name").notNull(),
  position: text("position").notNull(),
  gameweekData: jsonb("gameweek_data").notNull(), // saves per gameweek
  pointsData: jsonb("points_data").notNull(), // points per gameweek
  totalValue: real("total_value").notNull().default(0),
  totalPoints: real("total_points").notNull().default(0),
  averagePerGameweek: real("average_per_gameweek").notNull().default(0),
  lastUpdated: timestamp("last_updated").defaultNow(),
}, (table) => [
  index("idx_cached_saves_player_id").on(table.playerId),
  index("idx_cached_saves_total_value").on(table.totalValue),
]);

export const cachedPlayerGoalsConceded = pgTable("cached_player_goals_conceded", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull(),
  playerName: text("player_name").notNull(),
  teamName: text("team_name").notNull(),
  position: text("position").notNull(),
  gameweekData: jsonb("gameweek_data").notNull(), // goals conceded per gameweek
  pointsData: jsonb("points_data").notNull(), // points per gameweek
  totalValue: real("total_value").notNull().default(0),
  totalPoints: real("total_points").notNull().default(0),
  averagePerGameweek: real("average_per_gameweek").notNull().default(0),
  lastUpdated: timestamp("last_updated").defaultNow(),
}, (table) => [
  index("idx_cached_goals_conceded_player_id").on(table.playerId),
  index("idx_cached_goals_conceded_total_value").on(table.totalValue),
]);

export const cachedPlayerYellowCards = pgTable("cached_player_yellow_cards", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull(),
  playerName: text("player_name").notNull(),
  teamName: text("team_name").notNull(),
  position: text("position").notNull(),
  gameweekData: jsonb("gameweek_data").notNull(), // yellow cards per gameweek
  pointsData: jsonb("points_data").notNull(), // points per gameweek
  totalValue: real("total_value").notNull().default(0),
  totalPoints: real("total_points").notNull().default(0),
  averagePerGameweek: real("average_per_gameweek").notNull().default(0),
  lastUpdated: timestamp("last_updated").defaultNow(),
}, (table) => [
  index("idx_cached_yellow_cards_player_id").on(table.playerId),
  index("idx_cached_yellow_cards_total_value").on(table.totalValue),
]);

export const cachedPlayerRedCards = pgTable("cached_player_red_cards", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull(),
  playerName: text("player_name").notNull(),
  teamName: text("team_name").notNull(),
  position: text("position").notNull(),
  gameweekData: jsonb("gameweek_data").notNull(), // red cards per gameweek
  pointsData: jsonb("points_data").notNull(), // points per gameweek
  totalValue: real("total_value").notNull().default(0),
  totalPoints: real("total_points").notNull().default(0),
  averagePerGameweek: real("average_per_gameweek").notNull().default(0),
  lastUpdated: timestamp("last_updated").defaultNow(),
}, (table) => [
  index("idx_cached_red_cards_player_id").on(table.playerId),
  index("idx_cached_red_cards_total_value").on(table.totalValue),
]);

export const cachedPlayerBonusPoints = pgTable("cached_player_bonus_points", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull(),
  playerName: text("player_name").notNull(),
  teamName: text("team_name").notNull(),
  position: text("position").notNull(),
  gameweekData: jsonb("gameweek_data").notNull(), // bonus points per gameweek
  pointsData: jsonb("points_data").notNull(), // points per gameweek
  totalValue: real("total_value").notNull().default(0),
  totalPoints: real("total_points").notNull().default(0),
  averagePerGameweek: real("average_per_gameweek").notNull().default(0),
  lastUpdated: timestamp("last_updated").defaultNow(),
}, (table) => [
  index("idx_cached_bonus_points_player_id").on(table.playerId),
  index("idx_cached_bonus_points_total_value").on(table.totalValue),
]);

// CACHED PLAYER TOTAL POINTS - Ultra-fast comprehensive FPL points cache
export const cachedPlayerTotalPoints = pgTable("cached_player_total_points", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull(),
  playerName: text("player_name").notNull(),
  teamName: text("team_name").notNull(),
  position: text("position").notNull(),
  gameweekData: jsonb("gameweek_data").notNull(), // all 10 FPL scoring components per gameweek
  totalPointsData: jsonb("total_points_data").notNull(), // comprehensive points breakdown per gameweek
  totalExpectedPoints: real("total_expected_points").notNull().default(0),
  averagePerGameweek: real("average_per_gameweek").notNull().default(0),
  lastUpdated: timestamp("last_updated").defaultNow(),
}, (table) => [
  index("idx_cached_total_points_player_id").on(table.playerId),
  index("idx_cached_total_points_total").on(table.totalExpectedPoints),
]);

// Cached spread betting odds data
export const cachedSpreadBettingOdds = pgTable("cached_spread_betting_odds", {
  id: serial("id").primaryKey(),
  fixtureId: varchar("fixture_id").notNull(),
  gameweek: integer("gameweek").notNull(),
  kickoffTime: timestamp("kickoff_time").notNull(),
  homeTeamId: integer("home_team_id"),
  homeTeamName: varchar("home_team_name").notNull(),
  homeTeamShortName: varchar("home_team_short_name").notNull(),
  awayTeamId: integer("away_team_id"),
  awayTeamName: varchar("away_team_name").notNull(),
  awayTeamShortName: varchar("away_team_short_name").notNull(),
  // Total goals spread data
  totalGoalsSell: real("total_goals_sell").notNull(),
  totalGoalsBuy: real("total_goals_buy").notNull(),
  totalGoalsMidpoint: real("total_goals_midpoint").notNull(),
  // Supremacy spread data  
  supremacySell: real("supremacy_sell").notNull(),
  supremacyBuy: real("supremacy_buy").notNull(),
  supremacyMidpoint: real("supremacy_midpoint").notNull(),
  // Calculated expected goals using T+S/2 and T-S/2 formulas
  homeExpectedGoals: real("home_expected_goals").notNull(),
  awayExpectedGoals: real("away_expected_goals").notNull(),
  // Market data metadata
  marketConfidence: varchar("market_confidence").notNull(), // High, Medium, Low
  dataSource: varchar("data_source").notNull().default("The Odds API"),
  bookmakerCount: integer("bookmaker_count").default(0),
  // Cache metadata
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  fetchDate: date("fetch_date").notNull(),
}, (table) => [
  index("idx_spread_betting_gameweek").on(table.gameweek),
  index("idx_spread_betting_kickoff").on(table.kickoffTime),
  index("idx_spread_betting_teams").on(table.homeTeamShortName, table.awayTeamShortName),
  index("idx_spread_betting_fetch_date").on(table.fetchDate),
  uniqueIndex("idx_spread_betting_unique").on(table.fixtureId, table.fetchDate),
]);

// Types for cached scoring component tables
export type CachedPlayerSaves = typeof cachedPlayerSaves.$inferSelect;
export type InsertCachedPlayerSaves = typeof cachedPlayerSaves.$inferInsert;

export type CachedPlayerGoalsConceded = typeof cachedPlayerGoalsConceded.$inferSelect;
export type InsertCachedPlayerGoalsConceded = typeof cachedPlayerGoalsConceded.$inferInsert;

export type CachedPlayerYellowCards = typeof cachedPlayerYellowCards.$inferSelect;
export type InsertCachedPlayerYellowCards = typeof cachedPlayerYellowCards.$inferInsert;

export type CachedPlayerRedCards = typeof cachedPlayerRedCards.$inferSelect;
export type InsertCachedPlayerRedCards = typeof cachedPlayerRedCards.$inferInsert;

export type CachedPlayerBonusPoints = typeof cachedPlayerBonusPoints.$inferSelect;
export type InsertCachedPlayerBonusPoints = typeof cachedPlayerBonusPoints.$inferInsert;

// Pre-computed 2024/25 data cache for fast goal/assist share calculations
export const cachedHistoricalData = pgTable("cached_historical_data", {
  id: serial("id").primaryKey(),
  season: varchar("season", { length: 10 }).notNull(),
  playerId: integer("player_id").notNull(),
  teamId: integer("team_id").notNull(),
  teamName: varchar("team_name", { length: 100 }).notNull(),
  firstName: varchar("first_name", { length: 50 }).notNull(),
  secondName: varchar("second_name", { length: 50 }).notNull(),
  webName: varchar("web_name", { length: 50 }),
  positionName: varchar("position_name", { length: 20 }).notNull(),
  goalsScored: integer("goals_scored").default(0),
  assists: integer("assists").default(0),
  totalPoints: integer("total_points").default(0),
  minutes: integer("minutes").default(0),
  lastUpdated: timestamp("last_updated").defaultNow(),
}, (table) => [
  index("cached_historical_season_player_idx").on(table.season, table.playerId),
  index("cached_historical_team_idx").on(table.teamName),
]);

// Types for cached historical data
export type CachedHistoricalData = typeof cachedHistoricalData.$inferSelect;
export type InsertCachedHistoricalData = typeof cachedHistoricalData.$inferInsert;

// Types for spread betting odds cache
export type CachedSpreadBettingOdds = typeof cachedSpreadBettingOdds.$inferSelect;
export type InsertCachedSpreadBettingOdds = typeof cachedSpreadBettingOdds.$inferInsert;

// Daily projection storage tables for ultra-fast performance
export const teamProjectionsDaily = pgTable("team_projections_daily", {
  id: serial("id").primaryKey(),
  calculationDate: date("calculation_date").notNull(),
  teamId: integer("team_id").notNull(),
  gameweeks: varchar("gameweeks").notNull(), // JSON array as string: "[4,5,6,7,8,9]"
  homeGoals: decimal("home_goals", { precision: 4, scale: 2 }),
  awayGoals: decimal("away_goals", { precision: 4, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const goalShareDaily = pgTable("goal_share_daily", {
  id: serial("id").primaryKey(),
  calculationDate: date("calculation_date").notNull(),
  teamId: integer("team_id").notNull(),
  playerId: integer("player_id").notNull(),
  playerName: varchar("player_name").notNull(),
  goalSharePercentage: decimal("goal_share_percentage", { precision: 5, scale: 2 }).notNull(),
  expectedGoals: decimal("expected_goals", { precision: 6, scale: 3 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const assistShareDaily = pgTable("assist_share_daily", {
  id: serial("id").primaryKey(),
  calculationDate: date("calculation_date").notNull(),
  teamId: integer("team_id").notNull(),
  playerId: integer("player_id").notNull(),
  playerName: varchar("player_name").notNull(),
  assistSharePercentage: decimal("assist_share_percentage", { precision: 5, scale: 2 }).notNull(),
  expectedAssists: decimal("expected_assists", { precision: 6, scale: 3 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Comprehensive static cache tables for ALL projection tools (Option 3 Expansion)
export const staticProjectionRanges = pgTable("static_projection_ranges", {
  id: serial("id").primaryKey(),
  rangeName: varchar("range_name", { length: 20 }).notNull(), // e.g. "GW4-9", "GW4-15"
  projectionType: varchar("projection_type", { length: 30 }).notNull(), // "player_goals", "team_assists", "clean_sheets", etc.
  startGameweek: integer("start_gameweek").notNull(),
  endGameweek: integer("end_gameweek").notNull(),
  season: varchar("season", { length: 10 }).notNull().default("2025/26"),
  lastCalculated: timestamp("last_calculated").defaultNow(),
  recordCount: integer("record_count").default(0),
  calculationStatus: varchar("calculation_status", { length: 20 }).default("pending"), // pending, calculating, completed, error
  calculationDuration: integer("calculation_duration").default(0), // milliseconds
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Universal static cache for ALL projection types (players, teams, shares)
export const staticCachedProjections = pgTable("static_cached_projections", {
  id: serial("id").primaryKey(),
  rangeId: integer("range_id").references(() => staticProjectionRanges.id).notNull(),
  
  // Universal identifiers (works for players, teams, shares)
  entityId: integer("entity_id").notNull(), // playerId OR teamId
  entityName: varchar("entity_name", { length: 100 }).notNull(), // playerName OR teamName
  entityType: varchar("entity_type", { length: 20 }).notNull(), // "player" OR "team"
  position: varchar("position", { length: 20 }), // For players only
  teamName: varchar("team_name", { length: 50 }), // For players
  
  // Universal projection values (different tools use different fields)
  projectedValue: decimal("projected_value", { precision: 8, scale: 3 }).default("0"), // Main value (goals, assists, etc.)
  projectedPoints: decimal("projected_points", { precision: 6, scale: 2 }).default("0"), // FPL points
  sharePercentage: decimal("share_percentage", { precision: 5, scale: 2 }).default("0"), // For goal/assist share
  projectedMinutes: decimal("projected_minutes", { precision: 8, scale: 2 }).default("0"), // Minutes
  
  // Bonus values for complex projections
  bonusValue1: decimal("bonus_value_1", { precision: 8, scale: 3 }).default("0"), // Clean sheets, saves, etc.
  bonusValue2: decimal("bonus_value_2", { precision: 8, scale: 3 }).default("0"), // Cards, defensive, etc.
  bonusValue3: decimal("bonus_value_3", { precision: 8, scale: 3 }).default("0"), // Bonus points, etc.
  
  // Gameweek-by-gameweek breakdown for detailed analysis
  gameweekBreakdown: jsonb("gameweek_breakdown"), // {gw4: {value: 0.5, points: 2.1, ...}, ...}
  
  // Metadata
  dataSource: varchar("data_source", { length: 50 }).default("api"), // "api", "calculated", "cached"
  calculationMethod: varchar("calculation_method", { length: 30 }), // "hybrid", "projection", "share"
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Indexes for fast retrieval
export const staticCachedProjectionsRangeIndex = index("static_cached_projections_range_idx").on(staticCachedProjections.rangeId);
export const staticCachedProjectionsEntityIndex = index("static_cached_projections_entity_idx").on(staticCachedProjections.entityId, staticCachedProjections.entityType);

// Types for daily projections
export type InsertTeamProjectionsDaily = typeof teamProjectionsDaily.$inferInsert;
export type SelectTeamProjectionsDaily = typeof teamProjectionsDaily.$inferSelect;
export type InsertGoalShareDaily = typeof goalShareDaily.$inferInsert;
export type SelectGoalShareDaily = typeof goalShareDaily.$inferSelect;
export type InsertAssistShareDaily = typeof assistShareDaily.$inferInsert;
export type SelectAssistShareDaily = typeof assistShareDaily.$inferSelect;

// Types for comprehensive static cache tables
export type StaticProjectionRange = typeof staticProjectionRanges.$inferSelect;
export type InsertStaticProjectionRange = typeof staticProjectionRanges.$inferInsert;
export type StaticCachedProjection = typeof staticCachedProjections.$inferSelect;
export type InsertStaticCachedProjection = typeof staticCachedProjections.$inferInsert;
