-- Migration: Comprehensive season data archival
-- Adds missing FPL fixture-level fields to gameweek_player_data
-- and creates season_player_snapshot table for end-of-season archival

-- Add missing xStats, ICT, price, ownership, and match-score columns
ALTER TABLE "gameweek_player_data" ADD COLUMN IF NOT EXISTS "expected_goals" numeric(6,3) DEFAULT 0;
ALTER TABLE "gameweek_player_data" ADD COLUMN IF NOT EXISTS "expected_assists" numeric(6,3) DEFAULT 0;
ALTER TABLE "gameweek_player_data" ADD COLUMN IF NOT EXISTS "expected_goal_involvements" numeric(6,3) DEFAULT 0;
ALTER TABLE "gameweek_player_data" ADD COLUMN IF NOT EXISTS "expected_goals_conceded" numeric(6,3) DEFAULT 0;
ALTER TABLE "gameweek_player_data" ADD COLUMN IF NOT EXISTS "influence" numeric(7,1) DEFAULT 0;
ALTER TABLE "gameweek_player_data" ADD COLUMN IF NOT EXISTS "creativity" numeric(7,1) DEFAULT 0;
ALTER TABLE "gameweek_player_data" ADD COLUMN IF NOT EXISTS "threat" numeric(7,1) DEFAULT 0;
ALTER TABLE "gameweek_player_data" ADD COLUMN IF NOT EXISTS "ict_index" numeric(7,1) DEFAULT 0;
ALTER TABLE "gameweek_player_data" ADD COLUMN IF NOT EXISTS "value" integer DEFAULT 0;
ALTER TABLE "gameweek_player_data" ADD COLUMN IF NOT EXISTS "selected" integer DEFAULT 0;
ALTER TABLE "gameweek_player_data" ADD COLUMN IF NOT EXISTS "transfers_in" integer DEFAULT 0;
ALTER TABLE "gameweek_player_data" ADD COLUMN IF NOT EXISTS "transfers_out" integer DEFAULT 0;
ALTER TABLE "gameweek_player_data" ADD COLUMN IF NOT EXISTS "team_h_score" integer;
ALTER TABLE "gameweek_player_data" ADD COLUMN IF NOT EXISTS "team_a_score" integer;

-- Season-end player snapshot: captures full bootstrap-static data per player per season
CREATE TABLE IF NOT EXISTS "season_player_snapshot" (
  "id" serial PRIMARY KEY NOT NULL,
  "season" varchar(10) NOT NULL,
  "player_id" integer NOT NULL,
  "element_code" integer,
  "web_name" varchar(100),
  "first_name" varchar(100),
  "second_name" varchar(100),
  "team_id" integer,
  "element_type" integer,
  "total_points" integer DEFAULT 0,
  "minutes" integer DEFAULT 0,
  "goals_scored" integer DEFAULT 0,
  "assists" integer DEFAULT 0,
  "clean_sheets" integer DEFAULT 0,
  "goals_conceded" integer DEFAULT 0,
  "own_goals" integer DEFAULT 0,
  "penalties_saved" integer DEFAULT 0,
  "penalties_missed" integer DEFAULT 0,
  "yellow_cards" integer DEFAULT 0,
  "red_cards" integer DEFAULT 0,
  "saves" integer DEFAULT 0,
  "bonus" integer DEFAULT 0,
  "bps" integer DEFAULT 0,
  "influence" numeric(10,1) DEFAULT 0,
  "creativity" numeric(10,1) DEFAULT 0,
  "threat" numeric(10,1) DEFAULT 0,
  "ict_index" numeric(10,1) DEFAULT 0,
  "expected_goals" numeric(7,2),
  "expected_assists" numeric(7,2),
  "expected_goal_involvements" numeric(7,2),
  "expected_goals_conceded" numeric(7,2),
  "starts" integer DEFAULT 0,
  "now_cost" integer DEFAULT 0,
  "start_cost" integer DEFAULT 0,
  "selected_by_percent" numeric(6,2),
  "transfers_in_event" integer DEFAULT 0,
  "transfers_out_event" integer DEFAULT 0,
  "form" numeric(5,2),
  "points_per_game" numeric(5,2),
  "value_form" numeric(7,2),
  "value_season" numeric(7,2),
  "snapshot_date" timestamp DEFAULT now(),
  "created_at" timestamp DEFAULT now(),
  CONSTRAINT "season_player_snapshot_season_player_unique" UNIQUE("season", "player_id")
);

CREATE INDEX IF NOT EXISTS "idx_season_snapshot_season" ON "season_player_snapshot" ("season");
CREATE INDEX IF NOT EXISTS "idx_season_snapshot_player" ON "season_player_snapshot" ("player_id", "season");
CREATE INDEX IF NOT EXISTS "idx_season_snapshot_team" ON "season_player_snapshot" ("team_id", "season");
CREATE INDEX IF NOT EXISTS "idx_season_snapshot_element_type" ON "season_player_snapshot" ("element_type", "season");
