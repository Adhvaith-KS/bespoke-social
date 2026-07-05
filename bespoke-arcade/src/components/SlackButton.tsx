'use client';

import { useState } from 'react';
import styles from './SlackButton.module.css';

/**
 * Send on Slack — intentionally non-functional for now. Slack integration
 * is deferred to the end of the project. Everything this button will
 * eventually do is tracked in SLACK-TODO.md at the repo root.
 */
export default function SlackButton({ id }: { id?: string }) {
  const [nudged, setNudged] = useState(false);

  return (
    <div className={styles.wrap}>
      <button
        className={`btn btn-secondary btn-lg ${styles.slackBtn}`}
        onClick={() => setNudged(true)}
        id={id}
      >
        💬 Send on Slack
      </button>
      {nudged && (
        <span className={styles.note}>Slack hookup lands later. Noted!</span>
      )}
    </div>
  );
}
