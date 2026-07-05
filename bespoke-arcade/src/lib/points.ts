/**
 * Points configuration — single source of truth.
 * From design doc section 9.
 */

export type EventType =
  | 'wordle_solve'
  | 'wordle_fail'
  | 'bespokle_solve'
  | 'bereal_post'
  | 'bereal_award'
  | 'trivia_answer'
  | 'ttal_vote'
  | 'ttal_fool'
  | 'story_turn'
  | 'skribbl_join'
  | 'card_minted_writer'
  | 'card_minted_subject'
  | 'digest_mention';

export interface PointsResult {
  points: number;
  breakdown: string;
}

/**
 * Calculate points for a given event type.
 * All points are computed at insert time from this map.
 */
export function calculatePoints(
  type: EventType,
  payload: Record<string, number | boolean> = {}
): PointsResult {
  switch (type) {
    case 'wordle_solve': {
      const guesses = payload.guesses as number || 6;
      const base = 10;
      const bonus = 6 - guesses;
      return {
        points: base + bonus,
        breakdown: `${base} base + ${bonus} guess bonus`,
      };
    }
    case 'wordle_fail':
      return { points: 0, breakdown: 'No points for failed attempt' };

    case 'bespokle_solve': {
      const stepsOverPar = payload.steps_over_par as number || 0;
      const base = 10;
      const bonus = Math.max(0, 5 - stepsOverPar) * 2;
      return {
        points: base + bonus,
        breakdown: `${base} base + ${bonus} par bonus`,
      };
    }

    case 'trivia_answer': {
      const correct = payload.correct as boolean;
      if (!correct) return { points: 0, breakdown: 'Incorrect answer' };
      const base = 5;
      const speedBonus = Math.min(3, Math.max(0, payload.speed_bonus as number || 0));
      return {
        points: base + speedBonus,
        breakdown: `${base} correct + ${speedBonus} speed bonus`,
      };
    }

    case 'bereal_post': {
      const base = 8;
      const onTimeBonus = payload.on_time ? 4 : 0;
      return {
        points: base + onTimeBonus,
        breakdown: `${base} post${onTimeBonus ? ' + 4 on-time bonus' : ''}`,
      };
    }

    case 'bereal_award':
      return { points: 3, breakdown: '3 flat award bonus' };

    case 'ttal_vote':
      return { points: 5, breakdown: '5 for correct guess' };

    case 'ttal_fool': {
      const votersFooled = payload.voters_fooled as number || 0;
      return {
        points: 2 * votersFooled,
        breakdown: `2 × ${votersFooled} voters fooled`,
      };
    }

    case 'story_turn':
      return { points: 10, breakdown: '10 for writing a story turn' };

    case 'skribbl_join':
      return { points: 3, breakdown: '3 for joining skribbl' };

    case 'card_minted_writer':
      return { points: 4, breakdown: '4 for minting a card' };

    case 'card_minted_subject':
      return { points: 2, breakdown: '2 for being on a card' };

    case 'digest_mention':
      return { points: 0, breakdown: 'No points for digest mention' };

    default:
      return { points: 0, breakdown: 'Unknown event type' };
  }
}

/**
 * Streak multiplier: 7-day any-game streak gives +10% that week.
 */
export function applyStreakMultiplier(points: number, streakDays: number): number {
  if (streakDays >= 7) {
    return Math.round(points * 1.1);
  }
  return points;
}
