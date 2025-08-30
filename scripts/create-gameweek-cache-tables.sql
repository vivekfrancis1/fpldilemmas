-- Create gameweek data cache tables for storing actual FPL data when gameweeks complete
-- This script safely creates new tables without affecting existing schema

CREATE TABLE IF NOT EXISTS gameweek_player_data (
  id SERIAL PRIMARY KEY,
  player_id INTEGER NOT NULL,
  gameweek INTEGER NOT NULL,
  season TEXT NOT NULL DEFAULT '2025/26',
  
  -- Core FPL stats from element-summary API
  minutes INTEGER DEFAULT 0,
  goals_scored INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  clean_sheets INTEGER DEFAULT 0,
  goals_conceded INTEGER DEFAULT 0,
  own_goals INTEGER DEFAULT 0,
  penalties_saved INTEGER DEFAULT 0,
  penalties_missed INTEGER DEFAULT 0,
  yellow_cards INTEGER DEFAULT 0,
  red_cards INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  bonus INTEGER DEFAULT 0,
  bps INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  
  -- Defensive stats (if available)
  defensive_contribution INTEGER DEFAULT 0,
  tackles INTEGER DEFAULT 0,
  recoveries INTEGER DEFAULT 0,
  clearances_blocks_interceptions INTEGER DEFAULT 0,
  starts INTEGER DEFAULT 0,
  
  -- Metadata
  was_home BOOLEAN DEFAULT false,
  opponent_team INTEGER,
  fixture_id INTEGER,
  kickoff_time TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_gameweek_player_data_player_gw 
ON gameweek_player_data (player_id, gameweek);

CREATE INDEX IF NOT EXISTS idx_gameweek_player_data_season_gw 
ON gameweek_player_data (season, gameweek);

CREATE TABLE IF NOT EXISTS gameweek_update_log (
  id SERIAL PRIMARY KEY,
  gameweek INTEGER NOT NULL,
  season TEXT NOT NULL DEFAULT '2025/26',
  update_type TEXT NOT NULL, -- 'completed', 'partial', 'failed'
  players_updated INTEGER DEFAULT 0,
  errors JSONB, -- Store any errors that occurred
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  duration_ms INTEGER -- milliseconds
);

-- Create indexes for the log table
CREATE INDEX IF NOT EXISTS idx_gameweek_update_log_season_gw 
ON gameweek_update_log (season, gameweek);

-- Verify tables were created
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('gameweek_player_data', 'gameweek_update_log')
ORDER BY table_name, ordinal_position;