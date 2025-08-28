-- =====================================================
-- PRODUCTION DATABASE SYNC SCRIPT
-- =====================================================
-- Instructions: Copy and run these SQL statements in your production database
-- to sync it with the development database.
-- 
-- IMPORTANT: Run these in order:
-- 1. Schema creation (tables)
-- 2. Data imports (content creators)
-- 3. Admin settings (if needed)
-- =====================================================

-- =====================================================
-- 1. CONTENT CREATORS DATA (22 records)
-- =====================================================

-- Clear existing data (optional - remove if you want to preserve existing data)
-- DELETE FROM fpl_content_creators;
-- DELETE FROM fpl_creator_tracking;

-- Insert Content Creators
INSERT INTO fpl_content_creators (id, name, manager_id, manager_name, player_name, description, twitter_handle, youtube_url, followers, is_active, added_date, last_updated) VALUES (27, 'Let''s Talk FPL (Andy)', 44, 'sdafsadf', 'Andy LTFPL', 'Popular YouTuber known for team reveals and draft advice.', '@LetsTalk_FPL', 'https://www.youtube.com/@LetsTalkFPL', NULL, true, '2025-08-27 04:40:51.304309', '2025-08-28 05:40:50.03');
INSERT INTO fpl_content_creators (id, name, manager_id, manager_name, player_name, description, twitter_handle, youtube_url, followers, is_active, added_date, last_updated) VALUES (28, 'FPL Focal', 200, 'Focal Point', 'Oscar -', 'Data-driven content creator.', '@FPLFocal', 'https://www.youtube.com/@FPLFocal', NULL, true, '2025-08-27 04:40:51.382467', '2025-08-28 05:01:41.15');
INSERT INTO fpl_content_creators (id, name, manager_id, manager_name, player_name, description, twitter_handle, youtube_url, followers, is_active, added_date, last_updated) VALUES (29, 'FPL Harry', 1320, 'DANIELS XI', 'Harry Daniels', 'Engaging podcaster and streamer.', '@FPL_Harry', 'https://www.youtube.com/@FPLHarry', NULL, true, '2025-08-27 04:40:51.453179', '2025-08-28 05:01:41.312');
INSERT INTO fpl_content_creators (id, name, manager_id, manager_name, player_name, description, twitter_handle, youtube_url, followers, is_active, added_date, last_updated) VALUES (30, 'FPL Raptor', 1587, 'Eggspected Goals', 'FPL Raptor', 'Analytical YouTuber with strong community engagement.', '@FPL__Raptor', 'https://www.youtube.com/@FPLRaptor', NULL, true, '2025-08-27 04:40:51.524573', '2025-08-28 05:01:41.46');
INSERT INTO fpl_content_creators (id, name, manager_id, manager_name, player_name, description, twitter_handle, youtube_url, followers, is_active, added_date, last_updated) VALUES (31, 'FPL Pickle', 14501, 'Jota Pad', 'FPL Pickle', 'Humorous FPL content with tips and memes.', '@FPLPickle', 'https://www.youtube.com/@FPLPickle_YT', NULL, true, '2025-08-27 04:40:51.596041', '2025-08-28 05:46:18.176');
INSERT INTO fpl_content_creators (id, name, manager_id, manager_name, player_name, description, twitter_handle, youtube_url, followers, is_active, added_date, last_updated) VALUES (32, 'FPL Mate', 16267, 'FPL Mate', 'FPL Mate -Dan-', 'Meme-focused creator active in FPL discussions.', '@FPLMate', 'https://www.youtube.com/@FPLMate', NULL, true, '2025-08-27 04:40:51.667655', '2025-08-28 05:01:41.757');
INSERT INTO fpl_content_creators (id, name, manager_id, manager_name, player_name, description, twitter_handle, youtube_url, followers, is_active, added_date, last_updated) VALUES (33, 'Ben Crellin', 6586, 'ƃuᴉʞuᴉɥʇuʍopǝpᴉsdn', 'Ben Crellin', 'Fixture ticker expert; creates essential spreadsheets for planning.', '@BenCrellin', NULL, NULL, true, '2025-08-27 04:40:51.739108', '2025-08-28 05:01:41.905');
INSERT INTO fpl_content_creators (id, name, manager_id, manager_name, player_name, description, twitter_handle, youtube_url, followers, is_active, added_date, last_updated) VALUES (34, 'Az Phillips', 441, 'BlackBox XV', 'Az Phillips', 'Insightful analyst and podcaster on FPL BlackBox.', '@AzPhillipsFPL', 'https://www.youtube.com/@FPLBlackBox', NULL, true, '2025-08-27 04:40:51.81082', '2025-08-28 05:01:42.053');
INSERT INTO fpl_content_creators (id, name, manager_id, manager_name, player_name, description, twitter_handle, youtube_url, followers, is_active, added_date, last_updated) VALUES (35, 'Kelly Somers', 1924811, 'K Som United', 'Kelly Somers', 'Official FPL Podcast host; provides expert insights.', '@KellySomers', '', NULL, true, '2025-08-27 04:40:51.882436', '2025-08-28 05:59:06.926');
INSERT INTO fpl_content_creators (id, name, manager_id, manager_name, player_name, description, twitter_handle, youtube_url, followers, is_active, added_date, last_updated) VALUES (36, 'Julien Laurens', 1514450, 'Sambi on ice', 'Julien Laurens', 'ESPN pundit sharing occasional FPL tips.', '@LaurensJulien', NULL, NULL, true, '2025-08-27 04:40:51.953105', '2025-08-28 05:01:42.35');
INSERT INTO fpl_content_creators (id, name, manager_id, manager_name, player_name, description, twitter_handle, youtube_url, followers, is_active, added_date, last_updated) VALUES (37, 'Sam Bonfield', 260, 'Best In Alderweireld', 'Sam Bonfield', 'FPL Podcast regular; family-oriented content.', '@samfpl_', 'https://www.youtube.com/@FPLFamily', NULL, true, '2025-08-27 04:40:52.024987', '2025-08-28 05:01:42.498');
INSERT INTO fpl_content_creators (id, name, manager_id, manager_name, player_name, description, twitter_handle, youtube_url, followers, is_active, added_date, last_updated) VALUES (38, 'Lee Bonfield', 341, 'Little Beauties', 'Lee Bonfield', 'Co-host of FPL Family Podcast.', '@FPLFamily', 'https://www.youtube.com/@FPLFamily', NULL, true, '2025-08-27 04:40:52.095288', '2025-08-28 05:01:42.646');
INSERT INTO fpl_content_creators (id, name, manager_id, manager_name, player_name, description, twitter_handle, youtube_url, followers, is_active, added_date, last_updated) VALUES (39, 'Holly Shand', 135, 'HollyGunnarSolskjær', 'Holly Shand', 'Writer and podcaster focused on women''s football and FPL.', '@HollyShand', 'https://www.youtube.com/@HollyShand', NULL, true, '2025-08-27 04:40:52.166641', '2025-08-28 05:01:42.792');
INSERT INTO fpl_content_creators (id, name, manager_id, manager_name, player_name, description, twitter_handle, youtube_url, followers, is_active, added_date, last_updated) VALUES (40, 'Ian Irving', 7577129, 'Rambo Ravens FC', 'Ian Irving', 'Podcast contributor with in-depth analysis.', '@IanIrving_', NULL, NULL, true, '2025-08-27 04:40:52.237926', '2025-08-28 05:01:42.944');
INSERT INTO fpl_content_creators (id, name, manager_id, manager_name, player_name, description, twitter_handle, youtube_url, followers, is_active, added_date, last_updated) VALUES (41, 'FPL Sonaldo', 16725, 'FPL Sonaldo', 'Andy Park', 'Humorous takes on FPL; active in community leagues.', '@FPLSonaldo', NULL, NULL, true, '2025-08-27 04:40:52.308358', '2025-08-28 05:01:43.091');
INSERT INTO fpl_content_creators (id, name, manager_id, manager_name, player_name, description, twitter_handle, youtube_url, followers, is_active, added_date, last_updated) VALUES (42, 'FPL Pras', 3570, 'Pras United', 'Pras United', 'Podcaster on The FPL Wire; data-focused strategies.', '@Pras_fpl', 'https://www.youtube.com/@TheFPLWire', NULL, true, '2025-08-27 04:40:52.379527', '2025-08-28 05:01:43.239');
INSERT INTO fpl_content_creators (id, name, manager_id, manager_name, player_name, description, twitter_handle, youtube_url, followers, is_active, added_date, last_updated) VALUES (43, 'Gianni Buttice', 17614, '***Buttice''s Babes**', 'Gianni Buttice', 'Data-driven FPL analysis and tools.', '@GianniButtice', 'https://www.youtube.com/@gianni_buttice', NULL, true, '2025-08-27 04:40:52.451016', '2025-08-28 05:01:43.385');
INSERT INTO fpl_content_creators (id, name, manager_id, manager_name, player_name, description, twitter_handle, youtube_url, followers, is_active, added_date, last_updated) VALUES (44, 'BigMan Bakar', 963, 'The Malouda Triangle', 'BigMan Bakar', 'Shares advanced tactics.', '@BigManBakar', '', NULL, true, '2025-08-27 04:40:52.522317', '2025-08-28 05:51:43.214');
INSERT INTO fpl_content_creators (id, name, manager_id, manager_name, player_name, description, twitter_handle, youtube_url, followers, is_active, added_date, last_updated) VALUES (45, 'Yelena', 251, 'Finding Timo', 'Yelena Cekerevac', 'Rising creator', '@FPL_Yelena', NULL, NULL, true, '2025-08-27 04:40:52.593546', '2025-08-28 05:01:43.68');
INSERT INTO fpl_content_creators (id, name, manager_id, manager_name, player_name, description, twitter_handle, youtube_url, followers, is_active, added_date, last_updated) VALUES (48, 'Lateriser12', 5469, 'Bad Team On Paper', 'Pranil Sheth', 'Co-host of The FPL Wire podcast; multiple top 200 finishes and elite FPL veteran.', '@lateriser12', 'https://www.youtube.com/@TheFPLWire', NULL, true, '2025-08-27 04:40:52.807612', '2025-08-28 05:01:44.118');
INSERT INTO fpl_content_creators (id, name, manager_id, manager_name, player_name, description, twitter_handle, youtube_url, followers, is_active, added_date, last_updated) VALUES (50, 'Abdul Rehman (FPL Salah)', 124, 'Attock Athletic', 'Abdul Rehman', 'Top FPL manager with multiple top 1k finishes; contributor to The Athletic and FPL shows.', '@FPL_Salah', NULL, NULL, true, '2025-08-27 04:40:52.950162', '2025-08-28 05:01:44.265');
INSERT INTO fpl_content_creators (id, name, manager_id, manager_name, player_name, description, twitter_handle, youtube_url, followers, is_active, added_date, last_updated) VALUES (51, 'Zophar', 5149, 'Z', 'Utkarsh D', 'Co-host of The FPL Wire podcast; 8x top 10k finishes, best rank 17th overall.', '@ZopharFPL', 'https://www.youtube.com/@TheFPLWire', NULL, true, '2025-08-27 04:40:53.021273', '2025-08-28 05:01:44.419');

-- =====================================================
-- 2. TRACKING DATA (92 records) - SAMPLE SHOWN
-- =====================================================
-- Note: This is a large dataset. You may want to start fresh in production
-- rather than importing all historical tracking data.
-- Uncomment and run if you want to preserve tracking history:

/*
INSERT INTO fpl_creator_tracking (creator_id, gameweek, overall_rank, overall_points, gameweek_points, gameweek_rank, team_value, bank, total_transfers, free_transfers, wildcard_used, bench_boost_used, free_hit_used, triple_captain_used, hits_taken, recorded_at, is_verified) VALUES (27, 21, 7467022, 89, 43, 7673712, 100.0, 0, 0, 1, false, false, false, false, 0, '2025-08-28 05:54:19.369', true);
-- ... (Add remaining 91 tracking records as needed)
*/

-- =====================================================
-- 3. SCHEMA VERIFICATION COMMANDS
-- =====================================================
-- Run these to verify your production database has the correct structure:

-- Check tables exist:
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

-- Check content creators count:
SELECT COUNT(*) as content_creators_count FROM fpl_content_creators;

-- Check tracking records count:
SELECT COUNT(*) as tracking_records FROM fpl_creator_tracking;

-- =====================================================
-- 4. SEQUENCE UPDATES (IMPORTANT)
-- =====================================================
-- After inserting data, update the sequences to prevent ID conflicts:

SELECT setval('fpl_content_creators_id_seq', (SELECT MAX(id) FROM fpl_content_creators));
SELECT setval('fpl_creator_tracking_id_seq', (SELECT MAX(id) FROM fpl_creator_tracking));

-- =====================================================
-- 5. ADMIN SETTINGS (Optional)
-- =====================================================
-- These are configuration settings for admin tools.
-- They may already exist in production with different values.
-- Review and update as needed.

-- Goal projection settings are stored in admin_goal_projection_settings table
-- Match projection settings are in admin_match_projection_settings table
-- Clean sheet settings are in admin_cs_projection_settings table

-- =====================================================
-- COMPLETION CHECKLIST:
-- =====================================================
-- [ ] All 16 tables exist in production
-- [ ] 22 content creators imported successfully
-- [ ] Tracking data imported (if desired)
-- [ ] Sequences updated to prevent conflicts
-- [ ] Admin settings reviewed and configured
-- [ ] Test the application to ensure data is working
-- =====================================================