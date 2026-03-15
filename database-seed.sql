-- Seed data for testing
-- Run this after creating the schema

-- Insert sample user sessions (simulate online users)
INSERT INTO user_sessions (user_id, last_seen) VALUES
('11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '2 minutes'),
('22222222-2222-2222-2222-222222222222', NOW() - INTERVAL '1 minute'),
('33333333-3333-3333-3333-333333333333', NOW() - INTERVAL '3 minutes'),
('44444444-4444-4444-4444-444444444444', NOW() - INTERVAL '30 seconds'),
('55555555-5555-5555-5555-555555555555', NOW() - INTERVAL '4 minutes'),
('66666666-6666-6666-6666-666666666666', NOW() - INTERVAL '45 seconds'),
('77777777-7777-7777-7777-777777777777', NOW() - INTERVAL '1 minute'),
('88888888-8888-8888-8888-888888888888', NOW() - INTERVAL '2 minutes'),
('99999999-9999-9999-9999-999999999999', NOW() - INTERVAL '3 minutes'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NOW() - INTERVAL '30 seconds'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', NOW() - INTERVAL '1 minute'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', NOW() - INTERVAL '2 minutes'),
('dddddddd-dddd-dddd-dddd-dddddddddddd', NOW() - INTERVAL '45 seconds'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', NOW() - INTERVAL '3 minutes'),
('ffffffff-ffff-ffff-ffff-ffffffffffff', NOW() - INTERVAL '1 minute');

-- Insert sample game sessions
INSERT INTO game_sessions (user_id, discipline, created_at) VALUES
('11111111-1111-1111-1111-111111111111', 'cards', NOW() - INTERVAL '2 minutes'),
('22222222-2222-2222-2222-222222222222', 'cards', NOW() - INTERVAL '1 minute'),
('33333333-3333-3333-3333-333333333333', 'cards', NOW() - INTERVAL '3 minutes'),
('44444444-4444-4444-4444-444444444444', 'cards', NOW() - INTERVAL '30 seconds'),
('55555555-5555-5555-5555-555555555555', 'numbers', NOW() - INTERVAL '4 minutes'),
('66666666-6666-6666-6666-666666666666', 'numbers', NOW() - INTERVAL '45 seconds'),
('77777777-7777-7777-7777-777777777777', 'words', NOW() - INTERVAL '1 minute'),
('88888888-8888-8888-8888-888888888888', 'words', NOW() - INTERVAL '2 minutes'),
('99999999-9999-9999-9999-999999999999', 'names_faces', NOW() - INTERVAL '3 minutes'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'names_faces', NOW() - INTERVAL '30 seconds'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'images', NOW() - INTERVAL '1 minute'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'images', NOW() - INTERVAL '2 minutes'),
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'surprise', NOW() - INTERVAL '45 seconds'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'surprise', NOW() - INTERVAL '3 minutes'),
('ffffffff-ffff-ffff-ffff-ffffffffffff', 'cards', NOW() - INTERVAL '1 minute');

-- Insert sample game results for activity feed
INSERT INTO game_results (user_id, discipline, score, percentage, created_at) VALUES
('11111111-1111-1111-1111-111111111111', 'cards', 0.92, 92, NOW() - INTERVAL '1 minute'),
('22222222-2222-2222-2222-222222222222', 'numbers', 0.87, 87, NOW() - INTERVAL '2 minutes'),
('33333333-3333-3333-3333-333333333333', 'words', 0.95, 95, NOW() - INTERVAL '3 minutes');