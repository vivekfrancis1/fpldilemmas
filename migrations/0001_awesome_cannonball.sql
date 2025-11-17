CREATE TABLE "assist_share_daily" (
	"id" serial PRIMARY KEY NOT NULL,
	"calculation_date" date NOT NULL,
	"team_id" integer NOT NULL,
	"player_id" integer NOT NULL,
	"player_name" varchar NOT NULL,
	"assist_share_percentage" numeric(5, 2) NOT NULL,
	"expected_assists" numeric(6, 3),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "buy_price_overrides" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"manager_id" integer NOT NULL,
	"player_id" integer NOT NULL,
	"buy_price" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cached_historical_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"season" varchar(10) NOT NULL,
	"player_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"team_name" varchar(100) NOT NULL,
	"first_name" varchar(50) NOT NULL,
	"second_name" varchar(50) NOT NULL,
	"web_name" varchar(50),
	"position_name" varchar(20) NOT NULL,
	"goals_scored" integer DEFAULT 0,
	"assists" integer DEFAULT 0,
	"total_points" integer DEFAULT 0,
	"minutes" integer DEFAULT 0,
	"last_updated" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cached_player_bonus_points" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"player_name" text NOT NULL,
	"team_name" text NOT NULL,
	"position" text NOT NULL,
	"gameweek_data" jsonb NOT NULL,
	"points_data" jsonb NOT NULL,
	"total_value" real DEFAULT 0 NOT NULL,
	"total_points" real DEFAULT 0 NOT NULL,
	"average_per_gameweek" real DEFAULT 0 NOT NULL,
	"last_updated" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cached_player_cbit_points" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"player_name" text NOT NULL,
	"team_name" text NOT NULL,
	"position" text NOT NULL,
	"gameweek_data" jsonb NOT NULL,
	"points_data" jsonb NOT NULL,
	"total_value" real DEFAULT 0 NOT NULL,
	"total_points" real DEFAULT 0 NOT NULL,
	"average_per_gameweek" real DEFAULT 0 NOT NULL,
	"last_updated" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cached_player_goals_conceded" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"player_name" text NOT NULL,
	"team_name" text NOT NULL,
	"position" text NOT NULL,
	"gameweek_data" jsonb NOT NULL,
	"points_data" jsonb NOT NULL,
	"total_value" real DEFAULT 0 NOT NULL,
	"total_points" real DEFAULT 0 NOT NULL,
	"average_per_gameweek" real DEFAULT 0 NOT NULL,
	"last_updated" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cached_player_minutes_points" (
	"player_id" integer PRIMARY KEY NOT NULL,
	"gameweeks_data" jsonb NOT NULL,
	"season_total" integer NOT NULL,
	"last_updated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cached_player_red_cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"player_name" text NOT NULL,
	"team_name" text NOT NULL,
	"position" text NOT NULL,
	"gameweek_data" jsonb NOT NULL,
	"points_data" jsonb NOT NULL,
	"total_value" real DEFAULT 0 NOT NULL,
	"total_points" real DEFAULT 0 NOT NULL,
	"average_per_gameweek" real DEFAULT 0 NOT NULL,
	"last_updated" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cached_player_save_points" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"player_name" text NOT NULL,
	"team_name" text NOT NULL,
	"position" text NOT NULL,
	"gameweek_data" jsonb NOT NULL,
	"points_data" jsonb NOT NULL,
	"penalty_saves_data" jsonb NOT NULL,
	"total_saves" real DEFAULT 0 NOT NULL,
	"total_save_points" real DEFAULT 0 NOT NULL,
	"total_penalty_saves" integer DEFAULT 0 NOT NULL,
	"average_per_gameweek" real DEFAULT 0 NOT NULL,
	"last_updated" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cached_player_saves" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"player_name" text NOT NULL,
	"team_name" text NOT NULL,
	"position" text NOT NULL,
	"gameweek_data" jsonb NOT NULL,
	"points_data" jsonb NOT NULL,
	"total_value" real DEFAULT 0 NOT NULL,
	"total_points" real DEFAULT 0 NOT NULL,
	"average_per_gameweek" real DEFAULT 0 NOT NULL,
	"last_updated" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cached_player_total_points" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"player_name" text NOT NULL,
	"team_name" text NOT NULL,
	"position" text NOT NULL,
	"gameweek_data" jsonb NOT NULL,
	"total_points_data" jsonb NOT NULL,
	"total_expected_points" real DEFAULT 0 NOT NULL,
	"average_per_gameweek" real DEFAULT 0 NOT NULL,
	"last_updated" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cached_player_yellow_cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"player_name" text NOT NULL,
	"team_name" text NOT NULL,
	"position" text NOT NULL,
	"gameweek_data" jsonb NOT NULL,
	"points_data" jsonb NOT NULL,
	"total_value" real DEFAULT 0 NOT NULL,
	"total_points" real DEFAULT 0 NOT NULL,
	"average_per_gameweek" real DEFAULT 0 NOT NULL,
	"last_updated" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cached_spread_betting_odds" (
	"id" serial PRIMARY KEY NOT NULL,
	"fixture_id" varchar NOT NULL,
	"gameweek" integer NOT NULL,
	"kickoff_time" timestamp NOT NULL,
	"home_team_id" integer,
	"home_team_name" varchar NOT NULL,
	"home_team_short_name" varchar NOT NULL,
	"away_team_id" integer,
	"away_team_name" varchar NOT NULL,
	"away_team_short_name" varchar NOT NULL,
	"total_goals_sell" real NOT NULL,
	"total_goals_buy" real NOT NULL,
	"total_goals_midpoint" real NOT NULL,
	"supremacy_sell" real NOT NULL,
	"supremacy_buy" real NOT NULL,
	"supremacy_midpoint" real NOT NULL,
	"home_expected_goals" real NOT NULL,
	"away_expected_goals" real NOT NULL,
	"market_confidence" varchar NOT NULL,
	"data_source" varchar DEFAULT 'The Odds API' NOT NULL,
	"bookmaker_count" integer DEFAULT 0,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	"fetch_date" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fpl_top_manager_tracking" (
	"id" integer PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY (sequence name "fpl_top_manager_tracking_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"manager_id" integer NOT NULL,
	"gameweek" integer NOT NULL,
	"overall_rank" integer,
	"overall_points" integer,
	"gameweek_points" integer,
	"gameweek_rank" integer,
	"team_value" numeric(4, 1),
	"total_transfers" integer,
	"recorded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fpl_top_managers" (
	"id" integer PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY (sequence name "fpl_top_managers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(100) NOT NULL,
	"manager_id" integer NOT NULL,
	"category" varchar(10) NOT NULL,
	"static_rank" integer NOT NULL,
	"is_active" boolean DEFAULT true,
	"added_date" timestamp DEFAULT now(),
	"last_updated" timestamp DEFAULT now(),
	CONSTRAINT "fpl_top_managers_manager_id_unique" UNIQUE("manager_id")
);
--> statement-breakpoint
CREATE TABLE "goal_share_daily" (
	"id" serial PRIMARY KEY NOT NULL,
	"calculation_date" date NOT NULL,
	"team_id" integer NOT NULL,
	"player_id" integer NOT NULL,
	"player_name" varchar NOT NULL,
	"goal_share_percentage" numeric(5, 2) NOT NULL,
	"expected_goals" numeric(6, 3),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "historical_xg_cache" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" integer NOT NULL,
	"player_name" varchar NOT NULL,
	"season" varchar NOT NULL,
	"first_name" varchar,
	"second_name" varchar,
	"web_name" varchar,
	"team_id" integer,
	"team_name" varchar,
	"element_type" integer NOT NULL,
	"expected_goals" numeric(6, 3) DEFAULT '0' NOT NULL,
	"minutes" integer DEFAULT 0 NOT NULL,
	"xg_per_90" numeric(6, 3) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"last_updated" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "player_summary_cache" (
	"player_id" integer PRIMARY KEY NOT NULL,
	"player_name" varchar(100),
	"team_name" varchar(50),
	"team_short" varchar(10),
	"position" varchar(10),
	"season" varchar(10) DEFAULT '2025/26',
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "player_total_points_snapshots" (
	"window_id" varchar NOT NULL,
	"player_id" integer NOT NULL,
	"player_name" varchar(100) NOT NULL,
	"team_name" varchar(50) NOT NULL,
	"position" varchar(20) NOT NULL,
	"price" numeric(5, 2) NOT NULL,
	"ownership" numeric(5, 2) NOT NULL,
	"total_projected_points" numeric(6, 2) DEFAULT '0' NOT NULL,
	"average_points_per_gameweek" numeric(5, 2) DEFAULT '0' NOT NULL,
	"average_value" numeric(5, 2) DEFAULT '0' NOT NULL,
	"average_minutes" numeric(5, 2) DEFAULT '0' NOT NULL,
	"gameweek_breakdown" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "player_total_points_snapshots_window_id_player_id_pk" PRIMARY KEY("window_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "player_total_points_windows" (
	"window_id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"start_gameweek" integer NOT NULL,
	"end_gameweek" integer NOT NULL,
	"season" varchar(10) DEFAULT '2025/26' NOT NULL,
	"fetched_at" timestamp DEFAULT now() NOT NULL,
	"record_count" integer DEFAULT 0,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "player_venue_splits" (
	"player_id" integer NOT NULL,
	"venue" varchar(10) NOT NULL,
	"season" varchar(10) DEFAULT '2025/26' NOT NULL,
	"player_name" varchar(100) NOT NULL,
	"team_name" varchar(50),
	"position" varchar(20),
	"matches" integer DEFAULT 0 NOT NULL,
	"starts" integer DEFAULT 0 NOT NULL,
	"minutes" integer DEFAULT 0 NOT NULL,
	"total_points" integer DEFAULT 0 NOT NULL,
	"goals_scored" integer DEFAULT 0 NOT NULL,
	"assists" integer DEFAULT 0 NOT NULL,
	"clean_sheets" integer DEFAULT 0 NOT NULL,
	"goals_conceded" integer DEFAULT 0 NOT NULL,
	"own_goals" integer DEFAULT 0 NOT NULL,
	"penalties_saved" integer DEFAULT 0 NOT NULL,
	"penalties_missed" integer DEFAULT 0 NOT NULL,
	"yellow_cards" integer DEFAULT 0 NOT NULL,
	"red_cards" integer DEFAULT 0 NOT NULL,
	"saves" integer DEFAULT 0 NOT NULL,
	"bonus" integer DEFAULT 0 NOT NULL,
	"bps" integer DEFAULT 0 NOT NULL,
	"expected_goals" numeric(6, 3) DEFAULT '0',
	"expected_assists" numeric(6, 3) DEFAULT '0',
	"expected_goal_involvements" numeric(6, 3) DEFAULT '0',
	"expected_goals_conceded" numeric(6, 3) DEFAULT '0',
	"influence" numeric(8, 2) DEFAULT '0',
	"creativity" numeric(8, 2) DEFAULT '0',
	"threat" numeric(8, 2) DEFAULT '0',
	"ict_index" numeric(8, 2) DEFAULT '0',
	"tackles" integer DEFAULT 0,
	"recoveries" integer DEFAULT 0,
	"clearances_blocks_interceptions" integer DEFAULT 0,
	"defensive_contribution" integer DEFAULT 0,
	"cbit_points" integer DEFAULT 0 NOT NULL,
	"save_points" integer DEFAULT 0 NOT NULL,
	"minutes_points" integer DEFAULT 0 NOT NULL,
	"last_updated" timestamp DEFAULT now(),
	"data_completeness" numeric(5, 2) DEFAULT '100',
	CONSTRAINT "player_venue_splits_player_id_venue_season_pk" PRIMARY KEY("player_id","venue","season")
);
--> statement-breakpoint
CREATE TABLE "static_cached_projections" (
	"id" serial PRIMARY KEY NOT NULL,
	"range_id" integer NOT NULL,
	"entity_id" integer NOT NULL,
	"entity_name" varchar(100) NOT NULL,
	"entity_type" varchar(20) NOT NULL,
	"position" varchar(20),
	"team_name" varchar(50),
	"projected_value" numeric(8, 3) DEFAULT '0',
	"projected_points" numeric(6, 2) DEFAULT '0',
	"share_percentage" numeric(5, 2) DEFAULT '0',
	"projected_minutes" numeric(8, 2) DEFAULT '0',
	"bonus_value_1" numeric(8, 3) DEFAULT '0',
	"bonus_value_2" numeric(8, 3) DEFAULT '0',
	"bonus_value_3" numeric(8, 3) DEFAULT '0',
	"gameweek_breakdown" jsonb,
	"data_source" varchar(50) DEFAULT 'api',
	"calculation_method" varchar(30),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "static_player_projections" (
	"id" serial PRIMARY KEY NOT NULL,
	"range_id" integer NOT NULL,
	"player_id" integer NOT NULL,
	"player_name" varchar(100) NOT NULL,
	"position" varchar(20) NOT NULL,
	"team" varchar(50) NOT NULL,
	"total_points" numeric(6, 2) DEFAULT '0' NOT NULL,
	"projected_goals" numeric(6, 3) DEFAULT '0' NOT NULL,
	"projected_assists" numeric(6, 3) DEFAULT '0' NOT NULL,
	"projected_minutes" numeric(8, 2) DEFAULT '0' NOT NULL,
	"projected_clean_sheets" numeric(6, 3) DEFAULT '0' NOT NULL,
	"projected_bonus_points" numeric(6, 3) DEFAULT '0' NOT NULL,
	"gameweek_breakdown" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "static_projection_ranges" (
	"id" serial PRIMARY KEY NOT NULL,
	"range_name" varchar(20) NOT NULL,
	"projection_type" varchar(30) NOT NULL,
	"start_gameweek" integer NOT NULL,
	"end_gameweek" integer NOT NULL,
	"season" varchar(10) DEFAULT '2025/26' NOT NULL,
	"last_calculated" timestamp DEFAULT now(),
	"record_count" integer DEFAULT 0,
	"calculation_status" varchar(20) DEFAULT 'pending',
	"calculation_duration" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "team_projections_daily" (
	"id" serial PRIMARY KEY NOT NULL,
	"calculation_date" date NOT NULL,
	"team_id" integer NOT NULL,
	"gameweeks" varchar NOT NULL,
	"home_goals" numeric(4, 2),
	"away_goals" numeric(4, 2),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "transfer_planner_drafts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"manager_id" integer NOT NULL,
	"draft_letter" varchar(1) NOT NULL,
	"gameweek_transfers" jsonb NOT NULL,
	"planned_chips" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"optimized_lineups" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"mode" varchar(20) DEFAULT 'manual' NOT NULL,
	"team_bank" numeric(5, 1) NOT NULL,
	"team_value" numeric(6, 1) NOT NULL,
	"total_projected_points" numeric(7, 2) DEFAULT '0',
	"total_transfers_used" integer DEFAULT 0 NOT NULL,
	"captain_player_id" integer,
	"vice_captain_player_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "admin_match_projection_settings" ALTER COLUMN "clean_sheet_exponent" SET DEFAULT '1.15';--> statement-breakpoint
ALTER TABLE "admin_match_projection_settings" ALTER COLUMN "clean_sheet_multiplier" SET DEFAULT '85';--> statement-breakpoint
ALTER TABLE "unified_projection_settings" ALTER COLUMN "strong_defense_teams" SET DEFAULT '[12,13,7,15,9]';--> statement-breakpoint
ALTER TABLE "unified_projection_settings" ALTER COLUMN "average_defense_teams" SET DEFAULT '[8,14,18,2,10,16]';--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "admin_goal_projection_settings" ADD COLUMN "clean_sheet_exponent" numeric(4, 2) DEFAULT '1.15';--> statement-breakpoint
ALTER TABLE "admin_goal_projection_settings" ADD COLUMN "clean_sheet_multiplier" numeric(4, 2) DEFAULT '85';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" varchar DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "fpl_email" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "fpl_manager_id" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "fpl_session_cookies" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "fpl_cookies_expiry" timestamp;--> statement-breakpoint
ALTER TABLE "fpl_top_manager_tracking" ADD CONSTRAINT "fpl_top_manager_tracking_manager_id_fpl_top_managers_manager_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."fpl_top_managers"("manager_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_total_points_snapshots" ADD CONSTRAINT "player_total_points_snapshots_window_id_player_total_points_windows_window_id_fk" FOREIGN KEY ("window_id") REFERENCES "public"."player_total_points_windows"("window_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "static_cached_projections" ADD CONSTRAINT "static_cached_projections_range_id_static_projection_ranges_id_fk" FOREIGN KEY ("range_id") REFERENCES "public"."static_projection_ranges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "static_player_projections" ADD CONSTRAINT "static_player_projections_range_id_static_projection_ranges_id_fk" FOREIGN KEY ("range_id") REFERENCES "public"."static_projection_ranges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_buy_price_overrides_manager" ON "buy_price_overrides" USING btree ("manager_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_buy_price_overrides_manager_player" ON "buy_price_overrides" USING btree ("manager_id","player_id");--> statement-breakpoint
CREATE INDEX "cached_historical_season_player_idx" ON "cached_historical_data" USING btree ("season","player_id");--> statement-breakpoint
CREATE INDEX "cached_historical_team_idx" ON "cached_historical_data" USING btree ("team_name");--> statement-breakpoint
CREATE INDEX "idx_cached_bonus_points_player_id" ON "cached_player_bonus_points" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "idx_cached_bonus_points_total_value" ON "cached_player_bonus_points" USING btree ("total_value");--> statement-breakpoint
CREATE INDEX "idx_cached_cbit_points_player_id" ON "cached_player_cbit_points" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "idx_cached_cbit_points_total_points" ON "cached_player_cbit_points" USING btree ("total_points");--> statement-breakpoint
CREATE INDEX "idx_cached_goals_conceded_player_id" ON "cached_player_goals_conceded" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "idx_cached_goals_conceded_total_value" ON "cached_player_goals_conceded" USING btree ("total_value");--> statement-breakpoint
CREATE INDEX "cached_player_minutes_points_player_id_idx" ON "cached_player_minutes_points" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "idx_cached_red_cards_player_id" ON "cached_player_red_cards" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "idx_cached_red_cards_total_value" ON "cached_player_red_cards" USING btree ("total_value");--> statement-breakpoint
CREATE INDEX "idx_cached_save_points_player_id" ON "cached_player_save_points" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "idx_cached_save_points_total_points" ON "cached_player_save_points" USING btree ("total_save_points");--> statement-breakpoint
CREATE INDEX "idx_cached_save_points_position" ON "cached_player_save_points" USING btree ("position");--> statement-breakpoint
CREATE INDEX "idx_cached_saves_player_id" ON "cached_player_saves" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "idx_cached_saves_total_value" ON "cached_player_saves" USING btree ("total_value");--> statement-breakpoint
CREATE INDEX "idx_cached_total_points_player_id" ON "cached_player_total_points" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "idx_cached_total_points_total" ON "cached_player_total_points" USING btree ("total_expected_points");--> statement-breakpoint
CREATE INDEX "idx_cached_yellow_cards_player_id" ON "cached_player_yellow_cards" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "idx_cached_yellow_cards_total_value" ON "cached_player_yellow_cards" USING btree ("total_value");--> statement-breakpoint
CREATE INDEX "idx_spread_betting_gameweek" ON "cached_spread_betting_odds" USING btree ("gameweek");--> statement-breakpoint
CREATE INDEX "idx_spread_betting_kickoff" ON "cached_spread_betting_odds" USING btree ("kickoff_time");--> statement-breakpoint
CREATE INDEX "idx_spread_betting_teams" ON "cached_spread_betting_odds" USING btree ("home_team_short_name","away_team_short_name");--> statement-breakpoint
CREATE INDEX "idx_spread_betting_fetch_date" ON "cached_spread_betting_odds" USING btree ("fetch_date");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_spread_betting_unique" ON "cached_spread_betting_odds" USING btree ("fixture_id","fetch_date");--> statement-breakpoint
CREATE INDEX "idx_historical_xg_player_season" ON "historical_xg_cache" USING btree ("player_id","season");--> statement-breakpoint
CREATE INDEX "idx_historical_xg_season" ON "historical_xg_cache" USING btree ("season");--> statement-breakpoint
CREATE INDEX "idx_historical_xg_name" ON "historical_xg_cache" USING btree ("player_name");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_historical_xg_unique" ON "historical_xg_cache" USING btree ("player_id","season");--> statement-breakpoint
CREATE INDEX "player_summary_cache_season_idx" ON "player_summary_cache" USING btree ("season");--> statement-breakpoint
CREATE INDEX "idx_snapshots_player_id" ON "player_total_points_snapshots" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "idx_snapshots_total_points" ON "player_total_points_snapshots" USING btree ("total_projected_points");--> statement-breakpoint
CREATE INDEX "idx_snapshots_position" ON "player_total_points_snapshots" USING btree ("position");--> statement-breakpoint
CREATE INDEX "idx_windows_start_gw" ON "player_total_points_windows" USING btree ("start_gameweek");--> statement-breakpoint
CREATE INDEX "idx_windows_active" ON "player_total_points_windows" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_windows_unique_range" ON "player_total_points_windows" USING btree ("start_gameweek","season");--> statement-breakpoint
CREATE INDEX "idx_player_venue_splits_player" ON "player_venue_splits" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "idx_player_venue_splits_venue" ON "player_venue_splits" USING btree ("venue");--> statement-breakpoint
CREATE INDEX "idx_player_venue_splits_season" ON "player_venue_splits" USING btree ("season");--> statement-breakpoint
CREATE INDEX "idx_static_player_projections_range" ON "static_player_projections" USING btree ("range_id");--> statement-breakpoint
CREATE INDEX "idx_static_player_projections_player" ON "static_player_projections" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "idx_static_player_projections_total_points" ON "static_player_projections" USING btree ("total_points");--> statement-breakpoint
CREATE INDEX "idx_drafts_manager_id" ON "transfer_planner_drafts" USING btree ("manager_id");--> statement-breakpoint
CREATE INDEX "idx_drafts_manager_letter" ON "transfer_planner_drafts" USING btree ("manager_id","draft_letter");