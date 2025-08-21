import { pgTable, text, timestamp, integer, boolean, serial, varchar, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Watchlist entries table
export const watchlistEntries = pgTable("watchlist_entries", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull(),
  playerName: text("player_name").notNull(),
  teamName: text("team_name").notNull(),
  position: text("position").notNull(),
  currentPrice: integer("current_price").notNull(), // Price in tenths (e.g., 85 = £8.5m)
  targetPrice: integer("target_price"), // Optional target price for alerts
  alertOnRise: boolean("alert_on_rise").default(false),
  alertOnFall: boolean("alert_on_fall").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Price change alerts table
export const priceAlerts = pgTable("price_alerts", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull(),
  playerName: text("player_name").notNull(),
  oldPrice: integer("old_price").notNull(),
  newPrice: integer("new_price").notNull(),
  changeType: text("change_type").notNull(), // 'rise' | 'fall'
  changeAmount: integer("change_amount").notNull(), // Amount changed in tenths
  alertTriggered: boolean("alert_triggered").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Schema types
export type WatchlistEntry = typeof watchlistEntries.$inferSelect;
export type InsertWatchlistEntry = typeof watchlistEntries.$inferInsert;
export type PriceAlert = typeof priceAlerts.$inferSelect;
export type InsertPriceAlert = typeof priceAlerts.$inferInsert;

// Historical player data storage for faster loading
export const historicalPlayers = pgTable("historical_players", {
  id: varchar("id").primaryKey(), // Combination of player_id and season like "123_2023/24"
  playerId: integer("player_id").notNull(),
  season: varchar("season", { length: 10 }).notNull(), // e.g., "2023/24"
  
  // Player identification
  firstName: varchar("first_name", { length: 100 }),
  secondName: varchar("second_name", { length: 100 }),
  webName: varchar("web_name", { length: 50 }),
  teamName: varchar("team_name", { length: 100 }),
  teamShortName: varchar("team_short_name", { length: 10 }),
  positionName: varchar("position_name", { length: 50 }),
  
  // Season statistics (stored as strings to match API format)
  seasonName: varchar("season_name", { length: 10 }),
  elementCode: integer("element_code"),
  startCost: integer("start_cost"),
  endCost: integer("end_cost"),
  totalPoints: integer("total_points"),
  minutes: integer("minutes"),
  goalsScored: integer("goals_scored"),
  assists: integer("assists"),
  cleanSheets: integer("clean_sheets"),
  goalsConceded: integer("goals_conceded"),
  ownGoals: integer("own_goals"),
  penaltiesSaved: integer("penalties_saved"),
  penaltiesMissed: integer("penalties_missed"),
  yellowCards: integer("yellow_cards"),
  redCards: integer("red_cards"),
  saves: integer("saves"),
  bonus: integer("bonus"),
  bps: integer("bps"),
  influence: varchar("influence", { length: 20 }),
  creativity: varchar("creativity", { length: 20 }),
  threat: varchar("threat", { length: 20 }),
  ictIndex: varchar("ict_index", { length: 20 }),
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Index for fast season-based queries
  seasonIdx: index("historical_players_season_idx").on(table.season),
  playerSeasonIdx: index("historical_players_player_season_idx").on(table.playerId, table.season),
}));

export type HistoricalPlayer = typeof historicalPlayers.$inferSelect;
export type InsertHistoricalPlayer = typeof historicalPlayers.$inferInsert;

// Zod schemas for validation
export const insertWatchlistEntrySchema = createInsertSchema(watchlistEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPriceAlertSchema = createInsertSchema(priceAlerts).omit({
  id: true,
  createdAt: true,
});

export type InsertWatchlistEntryForm = z.infer<typeof insertWatchlistEntrySchema>;
export type InsertPriceAlertForm = z.infer<typeof insertPriceAlertSchema>;