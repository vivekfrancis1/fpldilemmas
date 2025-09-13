-- Create admin user for production
-- Run this SQL directly in your production database

INSERT INTO users (email, password, first_name, last_name, role)
VALUES (
  'fpldilemmas@gmail.com',
  '$2b$12$C/SGTxayQ0YkhmiGwV/QYuhioddYXP4DbGHgPRbMRWUNgyB6vpiye',
  'FPL',
  'Admin',
  'admin'
)
ON CONFLICT (email) DO NOTHING;