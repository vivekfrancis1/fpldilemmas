-- Migration: detailed positions (Left-back, Defensive midfield, Left winger...) per FPL player, from FotMob squad pages.
-- Stored next to FPL's own position; out_of_position marks a main position FPL would not file under that position.

CREATE TABLE IF NOT EXISTS "player_detailed_positions" (
  "fpl_player_id" integer PRIMARY KEY NOT NULL,
  "fpl_position" varchar(3) NOT NULL,
  "main_position" varchar(4) NOT NULL,
  "main_position_label" varchar(30) NOT NULL,
  "other_positions" text[] DEFAULT '{}'::text[] NOT NULL,
  "out_of_position" boolean DEFAULT false NOT NULL,
  "fotmob_player_id" integer NOT NULL,
  "match_method" varchar(20) NOT NULL,
  "source" varchar(20) DEFAULT 'fotmob' NOT NULL,
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_player_detailed_positions_main" ON "player_detailed_positions" ("main_position");
