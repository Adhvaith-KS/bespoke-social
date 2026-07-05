/**
 * Pure aggregation helpers shared by the leaderboard and profile APIs.
 * Everything derives from the `events` table (the scoring spine) —
 * points are never stored anywhere else.
 */

export interface EventRow {
  user_id: string;
  type: string;
  points: number;
  created_at: string;
}

export interface UserRow {
  id: string;
  name: string;
  role_title: string | null;
  avatar_url: string | null;
}

export interface PlayerStanding {
  id: string;
  name: string;
  initials: string;
  role: string;
  points: number;
  events: number;
  streak: number;
}

export type GameKey = 'global' | 'wordle' | 'bespokle' | 'trivia' | 'bereal';

/** Which event types count toward each leaderboard tab. */
export const GAME_EVENT_TYPES: Record<GameKey, string[] | null> = {
  global: null, // null = all types
  wordle: ['wordle_solve', 'wordle_fail'],
  bespokle: ['bespokle_solve'],
  trivia: ['trivia_answer'],
  bereal: ['bereal_post', 'bereal_award'],
};

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

function toUTCDay(timestamp: string): string {
  return new Date(timestamp).toISOString().split('T')[0];
}

function previousDay(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().split('T')[0];
}

/**
 * Current streak: consecutive UTC days with at least one event, counting
 * backward from today (or yesterday, if today has no activity yet —
 * the streak isn't broken until the day actually ends).
 */
export function currentStreak(timestamps: string[], today: string): number {
  const days = new Set(timestamps.map(toUTCDay));
  let cursor = days.has(today) ? today : previousDay(today);
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = previousDay(cursor);
  }
  return streak;
}

/** Longest run of consecutive active days anywhere in history. */
export function longestStreak(timestamps: string[]): number {
  const days = [...new Set(timestamps.map(toUTCDay))].sort();
  let longest = 0;
  let run = 0;
  for (let i = 0; i < days.length; i++) {
    run = i > 0 && previousDay(days[i]) === days[i - 1] ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  return longest;
}

/**
 * Build ranked standings for a game tab from raw users + events.
 * Company-scale data (hundreds of users) — in-memory aggregation is fine.
 */
export function buildStandings(
  users: UserRow[],
  events: EventRow[],
  game: GameKey,
  today: string
): PlayerStanding[] {
  const typeFilter = GAME_EVENT_TYPES[game];
  const filtered = typeFilter
    ? events.filter((e) => typeFilter.includes(e.type))
    : events;

  const byUser = new Map<string, EventRow[]>();
  for (const event of filtered) {
    const list = byUser.get(event.user_id);
    if (list) list.push(event);
    else byUser.set(event.user_id, [event]);
  }

  const standings: PlayerStanding[] = [];
  for (const user of users) {
    const userEvents = byUser.get(user.id) ?? [];
    if (userEvents.length === 0 && game !== 'global') continue;
    standings.push({
      id: user.id,
      name: user.name,
      initials: initialsOf(user.name),
      role: user.role_title ?? 'Bespoke Labs',
      points: userEvents.reduce((sum, e) => sum + e.points, 0),
      events: userEvents.length,
      streak: currentStreak(
        userEvents.map((e) => e.created_at),
        today
      ),
    });
  }

  return standings.sort((a, b) => b.points - a.points || b.events - a.events);
}
