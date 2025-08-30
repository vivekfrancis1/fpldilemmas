-- Create projection cache tables manually to avoid data loss
-- Player Projections Cache table
CREATE TABLE IF NOT EXISTS player_projections (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id INTEGER NOT NULL,
  player_name VARCHAR NOT NULL,
  team_id INTEGER NOT NULL,
  team_name VARCHAR NOT NULL,
  position VARCHAR NOT NULL,
  element_type INTEGER NOT NULL,
  current_price INTEGER NOT NULL,
  ownership DECIMAL(5,2) NOT NULL,
  goal_projections JSONB NOT NULL DEFAULT '{}',
  assist_projections JSONB NOT NULL DEFAULT '{}',
  clean_sheet_projections JSONB NOT NULL DEFAULT '{}',
  minutes_projections JSONB NOT NULL DEFAULT '{}',
  defensive_projections JSONB NOT NULL DEFAULT '{}',
  total_points_projections JSONB NOT NULL DEFAULT '{}',
  total_goals DECIMAL(5,2) NOT NULL DEFAULT 0,
  total_assists DECIMAL(5,2) NOT NULL DEFAULT 0,
  total_points DECIMAL(6,2) NOT NULL DEFAULT 0,
  average_points_per_gameweek DECIMAL(5,2) NOT NULL DEFAULT 0,
  season_projected_points INTEGER NOT NULL DEFAULT 0,
  gameweek_range VARCHAR NOT NULL,
  start_gameweek INTEGER NOT NULL,
  end_gameweek INTEGER NOT NULL,
  season VARCHAR NOT NULL DEFAULT '2025/26',
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Team Projections Cache table  
CREATE TABLE IF NOT EXISTS team_projections (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id INTEGER NOT NULL,
  team_name VARCHAR NOT NULL,
  goal_projections JSONB NOT NULL DEFAULT '{}',
  clean_sheet_projections JSONB NOT NULL DEFAULT '{}',
  goals_against_projections JSONB NOT NULL DEFAULT '{}',
  goal_share_data JSONB NOT NULL DEFAULT '{}',
  assist_share_data JSONB NOT NULL DEFAULT '{}',
  gameweek_range VARCHAR NOT NULL,
  start_gameweek INTEGER NOT NULL,
  end_gameweek INTEGER NOT NULL,
  season VARCHAR NOT NULL DEFAULT '2025/26',
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Projection Update Log table
CREATE TABLE IF NOT EXISTS projection_update_log (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  update_type VARCHAR NOT NULL,
  gameweek_range VARCHAR NOT NULL,
  players_updated INTEGER DEFAULT 0,
  teams_updated INTEGER DEFAULT 0,
  duration INTEGER NOT NULL,
  status VARCHAR NOT NULL,
  error_details JSONB,
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_player_projections_player ON player_projections(player_id);
CREATE INDEX IF NOT EXISTS idx_player_projections_range ON player_projections(start_gameweek, end_gameweek);
CREATE INDEX IF NOT EXISTS idx_player_projections_total_points ON player_projections(total_points);
CREATE INDEX IF NOT EXISTS idx_player_projections_updated ON player_projections(last_updated);
CREATE UNIQUE INDEX IF NOT EXISTS idx_player_projections_unique ON player_projections(player_id, start_gameweek, end_gameweek, season);

CREATE INDEX IF NOT EXISTS idx_team_projections_team ON team_projections(team_id);
CREATE INDEX IF NOT EXISTS idx_team_projections_range ON team_projections(start_gameweek, end_gameweek);
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_projections_unique ON team_projections(team_id, start_gameweek, end_gameweek, season);

CREATE INDEX IF NOT EXISTS idx_projection_log_type ON projection_update_log(update_type);
CREATE INDEX IF NOT EXISTS idx_projection_log_completed ON projection_update_log(completed_at);