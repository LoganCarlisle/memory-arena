-- Create tables for Memory Arena stats

-- Table to track user sessions/online status
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Table for active game sessions
CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  discipline TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- Table for live arenas
CREATE TABLE IF NOT EXISTS arenas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  discipline TEXT,
  player_count INTEGER DEFAULT 0,
  max_players INTEGER DEFAULT 100,
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active', -- active, ended, cancelled
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for game results/scores
CREATE TABLE IF NOT EXISTS game_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  discipline TEXT NOT NULL,
  score DECIMAL,
  percentage DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE arenas ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own sessions" ON user_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own game sessions" ON game_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view arenas" ON arenas
  FOR SELECT USING (true);

CREATE POLICY "Users can view their own results" ON game_results
  FOR ALL USING (auth.uid() = user_id);

-- Function to update user session
CREATE OR REPLACE FUNCTION update_user_session()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_sessions (user_id, last_seen)
  VALUES (NEW.id, NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET last_seen = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update session on auth
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION update_user_session();

-- Insert some sample data
INSERT INTO arenas (title, discipline, player_count, ends_at) VALUES
('March Cards Slam', 'cards', 1284, NOW() + INTERVAL '47 minutes'),
('Numbers 1000 Challenge', 'numbers', 743, NOW() + INTERVAL '2 hours'),
('World Tour Qualifier', 'mixed', 512, NOW() + INTERVAL '1 hour'),
('Surprise Mix League', 'surprise', 329, NOW() + INTERVAL '30 minutes');

-- Insert sample game sessions for active users
INSERT INTO game_sessions (user_id, discipline) VALUES
('00000000-0000-0000-0000-000000000001', 'cards'),
('00000000-0000-0000-0000-000000000002', 'numbers'),
('00000000-0000-0000-0000-000000000003', 'words'),
('00000000-0000-0000-0000-000000000004', 'names_faces'),
('00000000-0000-0000-0000-000000000005', 'images'),
('00000000-0000-0000-0000-000000000006', 'surprise');