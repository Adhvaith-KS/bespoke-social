-- =============================================
-- The Bespoke Arcade — Database Schema
-- Full data model from design doc section 4
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- USERS
-- =============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slack_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  role_title TEXT,
  region TEXT NOT NULL DEFAULT 'US' CHECK (region IN ('US', 'IN')),
  timezone TEXT DEFAULT 'America/Los_Angeles',
  opt_in_bereal BOOLEAN DEFAULT false,
  opt_in_ttal BOOLEAN DEFAULT false,
  opt_in_story BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_slack_id ON users(slack_id);

-- =============================================
-- EVENTS (spine of the app — all scoring flows through here)
-- =============================================
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'wordle_solve', 'wordle_fail', 'bespokle_solve',
    'bereal_post', 'bereal_award', 'trivia_answer',
    'ttal_vote', 'ttal_fool', 'story_turn',
    'card_minted', 'skribbl_join', 'digest_mention'
  )),
  points INTEGER NOT NULL DEFAULT 0,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_user_id ON events(user_id);
CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_events_created_at ON events(created_at);
CREATE INDEX idx_events_user_type ON events(user_id, type);

-- =============================================
-- WORDLE
-- =============================================
CREATE TABLE wordle_days (
  date DATE PRIMARY KEY,
  word TEXT NOT NULL,
  blurb TEXT,
  source_note TEXT,
  share_grid_emoji_key JSONB DEFAULT '{}'
);

CREATE TABLE wordle_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL REFERENCES wordle_days(date),
  guesses JSONB NOT NULL DEFAULT '[]',
  solved BOOLEAN NOT NULL DEFAULT false,
  num_guesses INTEGER NOT NULL DEFAULT 0,
  duration_s INTEGER,
  shared_to_slack BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX idx_wordle_attempts_user ON wordle_attempts(user_id);
CREATE INDEX idx_wordle_attempts_date ON wordle_attempts(date);

-- =============================================
-- BESPOKLE (word ladder)
-- =============================================
CREATE TABLE bespokle_days (
  date DATE PRIMARY KEY,
  start_word TEXT NOT NULL,
  par INTEGER NOT NULL,
  solution_path JSONB NOT NULL DEFAULT '[]',
  one_liner TEXT
);

CREATE TABLE bespokle_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL REFERENCES bespokle_days(date),
  path JSONB NOT NULL DEFAULT '[]',
  steps INTEGER NOT NULL DEFAULT 0,
  solved BOOLEAN NOT NULL DEFAULT false,
  shared_to_slack BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX idx_bespokle_attempts_user ON bespokle_attempts(user_id);

-- =============================================
-- BEREAL
-- =============================================
CREATE TABLE bereal_days (
  date DATE PRIMARY KEY,
  prompt_text TEXT NOT NULL,
  ping_time_us TIMESTAMPTZ,
  ping_time_in TIMESTAMPTZ
);

CREATE TABLE bereal_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL REFERENCES bereal_days(date),
  image_path TEXT NOT NULL,
  posted_at TIMESTAMPTZ DEFAULT NOW(),
  on_time BOOLEAN DEFAULT false,
  ai_caption TEXT
);

CREATE INDEX idx_bereal_posts_date ON bereal_posts(date);

CREATE TABLE bereal_awards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL REFERENCES bereal_days(date),
  post_id UUID NOT NULL REFERENCES bereal_posts(id) ON DELETE CASCADE,
  award_title TEXT NOT NULL,
  award_text TEXT
);

-- =============================================
-- TWO TRUTHS AND A LIE
-- =============================================
CREATE TABLE ttal_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  statements JSONB DEFAULT '[]',
  lie_index INTEGER,
  status TEXT NOT NULL DEFAULT 'interviewing' CHECK (status IN (
    'interviewing', 'pending_approval', 'approved', 'featured', 'done'
  ))
);

CREATE TABLE ttal_days (
  date DATE PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  votes JSONB DEFAULT '{}',
  revealed BOOLEAN DEFAULT false
);

-- =============================================
-- TRIVIA
-- =============================================
CREATE TABLE trivia_days (
  date DATE PRIMARY KEY,
  questions JSONB NOT NULL DEFAULT '[]'
);

CREATE TABLE trivia_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL REFERENCES trivia_days(date),
  q_index INTEGER NOT NULL,
  answer_index INTEGER NOT NULL,
  correct BOOLEAN NOT NULL DEFAULT false,
  answered_in_s REAL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date, q_index)
);

CREATE INDEX idx_trivia_answers_user ON trivia_answers(user_id);

-- =============================================
-- STORY CHAIN
-- =============================================
CREATE TABLE story_turns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  text TEXT NOT NULL,
  illustration_svg TEXT,
  recap_after TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE story_lottery (
  date DATE PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  notified_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'written', 'passed'))
);

-- =============================================
-- COFFEE CHAT CARDS
-- =============================================
CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  flavor_text TEXT,
  subject_role TEXT,
  badges_snapshot JSONB DEFAULT '[]',
  confirmed_by_subject BOOLEAN DEFAULT false,
  met_on DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cards_owner ON cards(owner_id);
CREATE INDEX idx_cards_subject ON cards(subject_id);

-- =============================================
-- BADGES
-- =============================================
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_key TEXT NOT NULL,
  label TEXT NOT NULL,
  awarded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_key)
);

CREATE INDEX idx_badges_user ON badges(user_id);

-- =============================================
-- SHARES (share-to-Slack with AI commentary)
-- =============================================
CREATE TABLE shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game TEXT NOT NULL,
  date DATE NOT NULL,
  result_summary JSONB DEFAULT '{}',
  commentary_text TEXT,
  slack_ts TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shares_user_game ON shares(user_id, game);

-- =============================================
-- CONFIG (kill switches, feature flags)
-- =============================================
CREATE TABLE config (
  key TEXT PRIMARY KEY,
  value JSONB DEFAULT 'true'
);

-- Seed default kill switches
INSERT INTO config (key, value) VALUES
  ('feature.wordle.enabled', 'true'),
  ('feature.bespokle.enabled', 'true'),
  ('feature.bereal.enabled', 'true'),
  ('feature.trivia.enabled', 'true'),
  ('feature.ttal.enabled', 'true'),
  ('feature.story.enabled', 'true'),
  ('feature.cards.enabled', 'true'),
  ('feature.skribbl.enabled', 'true'),
  ('feature.digest.enabled', 'true');

-- =============================================
-- JOBS (simple Postgres job queue)
-- =============================================
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'done', 'failed')),
  result JSONB,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  run_after TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_run_after ON jobs(run_after);
CREATE INDEX idx_jobs_type ON jobs(type);

-- =============================================
-- VIEWS for common queries
-- =============================================

-- Leaderboard view: total points per user
CREATE VIEW leaderboard AS
SELECT
  u.id,
  u.name,
  u.avatar_url,
  u.role_title,
  COALESCE(SUM(e.points), 0) AS total_points,
  COUNT(e.id) AS total_events
FROM users u
LEFT JOIN events e ON u.id = e.user_id
GROUP BY u.id, u.name, u.avatar_url, u.role_title
ORDER BY total_points DESC;

-- Per-game leaderboard
CREATE VIEW game_leaderboard AS
SELECT
  u.id,
  u.name,
  e.type AS game,
  COALESCE(SUM(e.points), 0) AS game_points,
  COUNT(e.id) AS game_events
FROM users u
JOIN events e ON u.id = e.user_id
GROUP BY u.id, u.name, e.type
ORDER BY game_points DESC;
