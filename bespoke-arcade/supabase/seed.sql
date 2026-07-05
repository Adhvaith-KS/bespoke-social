-- =============================================
-- The Bespoke Arcade — Demo Seed
-- Run after 001_initial_schema.sql to light up the
-- leaderboard/profile immediately. Idempotent-ish:
-- users skip on conflict; re-running duplicates events,
-- so run once (or TRUNCATE events first).
-- =============================================

INSERT INTO users (slack_id, name, role_title, region, timezone, opt_in_bereal, opt_in_ttal, opt_in_story) VALUES
  ('U_DEMO_PLAYER', 'Demo Player',  'Arcade Tester',      'US', 'America/Los_Angeles', true,  false, true),
  ('U_PRIYA',       'Priya Sharma', 'ML Engineer',        'IN', 'Asia/Kolkata',        true,  true,  true),
  ('U_ARJUN',       'Arjun Mehta',  'Backend Engineer',   'IN', 'Asia/Kolkata',        true,  false, true),
  ('U_SARAH',       'Sarah Chen',   'Product Manager',    'US', 'America/Los_Angeles', false, true,  true),
  ('U_MAHESH',      'Mahesh Iyer',  'Research Scientist', 'IN', 'Asia/Kolkata',        true,  true,  false),
  ('U_EMILY',       'Emily Wang',   'Design Engineer',    'US', 'America/New_York',    true,  false, false)
ON CONFLICT (slack_id) DO NOTHING;

-- Events across the last 5 days (points follow src/lib/points.ts)
INSERT INTO events (user_id, type, points, payload, created_at)
SELECT u.id, v.type, v.points, v.payload::jsonb,
       now() - make_interval(days => v.days_ago, hours => v.hours_ago)
FROM (VALUES
  -- Priya: strong all-rounder on a streak (days 0-4)
  ('U_PRIYA', 'wordle_solve',   13, '{"guesses": 3}',            0, 3),
  ('U_PRIYA', 'bespokle_solve', 20, '{"steps_over_par": 0}',     0, 2),
  ('U_PRIYA', 'wordle_solve',   12, '{"guesses": 4}',            1, 5),
  ('U_PRIYA', 'trivia_answer',  21, '{"correct": 3}',            1, 4),
  ('U_PRIYA', 'bespokle_solve', 18, '{"steps_over_par": 1}',     2, 6),
  ('U_PRIYA', 'wordle_solve',   14, '{"guesses": 2}',            3, 3),
  ('U_PRIYA', 'bereal_post',    12, '{"on_time": true}',         4, 7),

  -- Arjun: wordle specialist, 5-day streak
  ('U_ARJUN', 'wordle_solve',   14, '{"guesses": 2}',            0, 6),
  ('U_ARJUN', 'wordle_solve',   13, '{"guesses": 3}',            1, 6),
  ('U_ARJUN', 'wordle_solve',   12, '{"guesses": 4}',            2, 7),
  ('U_ARJUN', 'trivia_answer',  18, '{"correct": 3}',            2, 3),
  ('U_ARJUN', 'wordle_solve',   13, '{"guesses": 3}',            3, 5),
  ('U_ARJUN', 'wordle_solve',   11, '{"guesses": 5}',            4, 6),

  -- Sarah: ladder queen
  ('U_SARAH', 'bespokle_solve', 20, '{"steps_over_par": 0}',     0, 8),
  ('U_SARAH', 'bespokle_solve', 20, '{"steps_over_par": 0}',     1, 9),
  ('U_SARAH', 'trivia_answer',  16, '{"correct": 2}',            1, 2),
  ('U_SARAH', 'bespokle_solve', 18, '{"steps_over_par": 1}',     2, 8),
  ('U_SARAH', 'bereal_post',     8, '{"on_time": false}',        3, 4),

  -- Mahesh: trivia + bereal, streak recently broken
  ('U_MAHESH', 'trivia_answer', 22, '{"correct": 3}',            0, 4),
  ('U_MAHESH', 'trivia_answer', 19, '{"correct": 3}',            2, 5),
  ('U_MAHESH', 'bereal_post',   12, '{"on_time": true}',         2, 9),
  ('U_MAHESH', 'bereal_award',   3, '{"award": "Best Angle"}',   2, 1),
  ('U_MAHESH', 'wordle_fail',    0, '{"guesses": 6}',            3, 6),

  -- Emily: casual player
  ('U_EMILY', 'wordle_solve',   12, '{"guesses": 4}',            1, 7),
  ('U_EMILY', 'bereal_post',    12, '{"on_time": true}',         2, 6),
  ('U_EMILY', 'bereal_award',    3, '{"award": "Coziest Desk"}', 2, 1),
  ('U_EMILY', 'trivia_answer',  13, '{"correct": 2}',            4, 5),

  -- Demo Player: a little history so /me has data on first load
  ('U_DEMO_PLAYER', 'wordle_solve',   12, '{"guesses": 4}',        1, 4),
  ('U_DEMO_PLAYER', 'bespokle_solve', 18, '{"steps_over_par": 1}', 1, 3),
  ('U_DEMO_PLAYER', 'trivia_answer',  15, '{"correct": 2}',        2, 5)
) AS v(slack_id, type, points, payload, days_ago, hours_ago)
JOIN users u ON u.slack_id = v.slack_id;

-- A couple of badges so the profile page shows earned + locked states
INSERT INTO badges (user_id, badge_key, label)
SELECT u.id, v.badge_key, v.label
FROM (VALUES
  ('U_DEMO_PLAYER', 'ladder_legend', 'Ladder Legend'),
  ('U_PRIYA',       'wordle_wizard', 'Wordle Wizard'),
  ('U_ARJUN',       'streak_master', 'Streak Master')
) AS v(slack_id, badge_key, label)
JOIN users u ON u.slack_id = v.slack_id
ON CONFLICT (user_id, badge_key) DO NOTHING;
