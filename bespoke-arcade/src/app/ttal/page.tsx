'use client';

import { useState } from 'react';
import styles from './ttal.module.css';
import Avatar from '@/components/Avatar';
import { ME, PEOPLE } from '@/lib/demo-people';

// Today's featured person. Daily rotation returns with the backend.
const FEATURED_PERSON = PEOPLE[0];

const DEMO_STATEMENTS = [
  'Almost fell to my death after slipping due to snow on a trek',
  'Went viral for making a reel about going to the minions movie wearing suits (it was a meme trend in 2022)',
  'Watched the same movie twice a day at the movie theatre everyday for a week',
];

export default function TTALPage() {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [voted, setVoted] = useState(false);

  // Submit-your-own form
  const [formOpen, setFormOpen] = useState(false);
  const [statements, setStatements] = useState(['', '', '']);
  const [lieIndex, setLieIndex] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleVote = () => {
    if (selectedIndex === null) return;
    setVoted(true);
  };

  const updateStatement = (i: number, value: string) => {
    setStatements((prev) => prev.map((s, idx) => (idx === i ? value : s)));
  };

  const canSubmitOwn =
    statements.every((s) => s.trim().length >= 10) && lieIndex !== null;

  const submitOwn = () => {
    if (!canSubmitOwn) return;
    // Demo: queued client-side. Live mode will write ttal_profiles.
    setSubmitted(true);
    setFormOpen(false);
  };

  return (
    <div className="container">
      <div className={styles.ttal}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>
            <span className={styles.titleGradient}>Two Truths, One Lie</span>
          </h1>
          <p className={styles.subtitle}>
            One person a day. One lie. Results drop on Slack at end of day.
          </p>
        </div>

        {/* Featured person */}
        <div className={styles.personCard}>
          <div className={styles.personAvatarWrap}>
            <Avatar
              name={FEATURED_PERSON.name}
              photo={FEATURED_PERSON.photo}
              size={80}
            />
          </div>
          <h2 className={styles.personName}>{FEATURED_PERSON.name}</h2>
          <p className={styles.personRole}>{FEATURED_PERSON.role}</p>

          <p className={styles.personPrompt}>Which statement is the lie?</p>

          <div className={styles.statements}>
            {DEMO_STATEMENTS.map((statement, i) => {
              let className = styles.statement;
              if (voted) {
                className += ` ${styles.statementDisabled}`;
                if (i === selectedIndex) className += ` ${styles.statementSelected}`;
              } else if (i === selectedIndex) {
                className += ` ${styles.statementSelected}`;
              }

              return (
                <button
                  key={i}
                  className={className}
                  onClick={() => !voted && setSelectedIndex(i)}
                  disabled={voted}
                  id={`statement-${i}`}
                >
                  <span className={styles.statementNumber}>{i + 1}</span>
                  <span>{statement}</span>
                </button>
              );
            })}
          </div>

          {!voted ? (
            <button
              className={`btn btn-primary btn-lg ${styles.voteBtn}`}
              onClick={handleVote}
              disabled={selectedIndex === null}
              id="ttal-vote"
            >
              {selectedIndex !== null
                ? `Vote for statement ${selectedIndex + 1}`
                : 'Select a statement to vote'}
            </button>
          ) : (
            <div className={styles.resultCard}>
              <h3 className={styles.resultTitle}>🗳️ Vote locked in</h3>
              <p className={styles.resultCommentary}>
                No spoilers here. The reveal, the vote split, and the roast
                land on Slack at end of day.
              </p>
            </div>
          )}
        </div>

        {/* Add your own */}
        <div className={styles.ownSection}>
          {submitted ? (
            <div className={styles.ownDone}>
              ✅ Your two truths and one lie are queued. You will be featured
              on an upcoming day. Start practicing your poker face.
            </div>
          ) : formOpen ? (
            <div className={styles.ownForm} id="ttal-own-form">
              <h2 className={styles.ownTitle}>Your two truths, one lie</h2>
              <p className={styles.ownHint}>
                Write three statements about yourself, then mark the lie.
                Nobody sees which is which until your reveal.
              </p>
              {statements.map((value, i) => (
                <div key={i} className={styles.ownRow}>
                  <input
                    className={styles.ownInput}
                    value={value}
                    onChange={(e) => updateStatement(i, e.target.value)}
                    placeholder={`Statement ${i + 1}`}
                    maxLength={160}
                    id={`ttal-own-${i}`}
                  />
                  <button
                    className={`${styles.lieToggle} ${
                      lieIndex === i ? styles.lieToggleActive : ''
                    }`}
                    onClick={() => setLieIndex(i)}
                    title="Mark as the lie"
                  >
                    {lieIndex === i ? '🤥 the lie' : 'truth'}
                  </button>
                </div>
              ))}
              <div className={styles.ownActions}>
                <button
                  className="btn btn-primary"
                  onClick={submitOwn}
                  disabled={!canSubmitOwn}
                  id="ttal-own-submit"
                >
                  Queue mine ({ME.name})
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setFormOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              className="btn btn-secondary btn-lg"
              onClick={() => setFormOpen(true)}
              id="ttal-add-own"
            >
              ✍️ Add your own
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
