-- Migration: Durable team-level match results archive
-- Reconstructed from gameweek_player_data before FPL's live bootstrap-static/fixtures
-- endpoints reset for the next season (team-level history had no persistent storage before this).

CREATE TABLE IF NOT EXISTS "season_fixtures_archive" (
  "id" serial PRIMARY KEY NOT NULL,
  "season" varchar(10) NOT NULL,
  "fixture_id" integer NOT NULL,
  "gameweek" integer NOT NULL,
  "team_h" integer NOT NULL,
  "team_h_short" varchar(10),
  "team_h_name" varchar(50),
  "team_a" integer NOT NULL,
  "team_a_short" varchar(10),
  "team_a_name" varchar(50),
  "team_h_score" integer,
  "team_a_score" integer,
  "kickoff_time" timestamp,
  "finished" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now(),
  CONSTRAINT "season_fixtures_archive_season_fixture_unique" UNIQUE("season", "fixture_id")
);

CREATE INDEX IF NOT EXISTS "idx_season_fixtures_archive_season_gw" ON "season_fixtures_archive" ("season", "gameweek");
