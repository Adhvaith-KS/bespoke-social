'use client';

import { useState } from 'react';
import styles from './ShareToSlack.module.css';

type ShareState = 'idle' | 'sharing' | 'queued' | 'error';

interface ShareToSlackProps {
  game: 'wordle' | 'bespokle' | 'trivia';
  /** Result facts for scoring + commentary (guesses, steps, correct, ...). */
  resultSummary: Record<string, unknown>;
  /** Spoiler-free emoji grid posted alongside the commentary. */
  gridText?: string;
  id?: string;
}

/**
 * Share-to-Slack (design doc 7.2) — shared by Wordle, Bespokle, and Trivia.
 *
 * Sharing is always opt-in per attempt. The click enqueues a
 * `share_commentary` job; the worker adds AI commentary and posts to
 * #arcade-scores, so the button resolves to "queued", not "posted".
 */
export default function ShareToSlack({
  game,
  resultSummary,
  gridText,
  id,
}: ShareToSlackProps) {
  const [state, setState] = useState<ShareState>('idle');
  const [detail, setDetail] = useState<string | null>(null);

  const share = async () => {
    if (state === 'sharing' || state === 'queued') return;
    setState('sharing');
    setDetail(null);

    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game, resultSummary, gridText }),
      });
      const data = await res.json();

      if (!res.ok || !data.queued) {
        setState('error');
        setDetail(data.error || 'Something went wrong. Try again.');
        return;
      }

      setState('queued');
      if (!data.live) {
        setDetail('Demo mode: connect Supabase to post for real.');
      } else if (data.pointsAwarded > 0) {
        setDetail(
          `+${data.pointsAwarded} pts scored · The Arcade Desk is writing your commentary`
        );
      } else {
        setDetail('The Arcade Desk is writing your commentary');
      }
    } catch {
      setState('error');
      setDetail('Connection error. Try again.');
    }
  };

  const label =
    state === 'sharing'
      ? 'Sharing…'
      : state === 'queued'
      ? '✓ Queued for #arcade-scores'
      : state === 'error'
      ? '💬 Retry Share to Slack'
      : '💬 Share to Slack';

  return (
    <div className={styles.wrapper}>
      <button
        className={`btn btn-secondary ${styles.shareBtn} ${
          state === 'queued' ? styles.shareBtnQueued : ''
        } ${state === 'sharing' ? styles.shareBtnSharing : ''}`}
        onClick={share}
        disabled={state === 'sharing' || state === 'queued'}
        id={id}
      >
        {state === 'sharing' && <span className={styles.spinner} />}
        {label}
      </button>
      {detail && (
        <p
          className={`${styles.detail} ${
            state === 'error' ? styles.detailError : ''
          }`}
        >
          {detail}
        </p>
      )}
    </div>
  );
}
