import { pgTable, text, timestamp, integer, boolean, serial } from "drizzle-orm/pg-core";
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