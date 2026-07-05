'use client';

import { useEffect, useState } from 'react';
import styles from './story.module.css';
import Avatar from '@/components/Avatar';
import { ME, PEOPLE, personOfTheDay } from '@/lib/demo-people';

interface StoryTurn {
  id: string;
  date: string;
  author: string;
  authorPhoto?: string;
  text: string;
}

interface StoryData {
  live: boolean;
  date: string;
  turns: StoryTurn[];
  canWrite: boolean;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().split('T')[0];
}

const DEMO_TURNS: StoryTurn[] = [
  {
    id: 'demo-1',
    date: daysAgo(2),
    author: PEOPLE[1].name,
    authorPhoto: PEOPLE[1].photo,
    text: 'Monday morning, a box of donuts appeared in the middle of the office with a sticky note that just said do not.',
  },
  {
    id: 'demo-2',
    date: daysAgo(1),
    author: PEOPLE[2].name,
    authorPhoto: PEOPLE[2].photo,
    text: 'By evening a second note had appeared in different handwriting asking do not what. The donuts sat untouched, radiating quiet menace.',
  },
];

const TODAYS_AUTHOR = personOfTheDay();

export default function StoryScroll() {
  const [turns, setTurns] = useState<StoryTurn[]>(DEMO_TURNS);
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/story')
      .then((res) => res.json())
      .then((incoming: StoryData) => {
        if (incoming.live && incoming.turns.length > 0) {
          setTurns(incoming.turns);
        }
      })
      .catch(() => {
        // demo turns already shown
      });
  }, []);

  const showMsg = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3500);
  };

  const myTurn = TODAYS_AUTHOR.id === ME.id;
  const turnWrittenToday = turns.some(
    (t) => t.date === new Date().toISOString().split('T')[0]
  );

  const submitTurn = async () => {
    const text = draft.trim();
    if (submitting) return;
    if (text.length < 10) {
      showMsg('Give it at least a sentence (10+ characters).');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const result = await res.json();
      if (!res.ok) {
        showMsg(result.error || 'Could not save your turn.');
        return;
      }
      setTurns((prev) => [
        ...prev,
        {
          id: result.turn?.id ?? `local-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          author: ME.name,
          authorPhoto: ME.photo,
          text,
        },
      ]);
      setDraft('');
      showMsg('Turn added. The saga continues tomorrow.');
    } catch {
      showMsg('Connection error. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container">
      <div className={styles.story}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            <span className={styles.titleGradient}>Story Chain</span>
          </h1>
          <p className={styles.subtitle}>
            One person adds 1-3 sentences a day. The saga never ends.
          </p>
        </div>

        {message && <div className={styles.message}>{message}</div>}

        {/* Whose turn today */}
        <div className={styles.turnBanner} id="story-turn-banner">
          <Avatar
            name={TODAYS_AUTHOR.name}
            photo={TODAYS_AUTHOR.photo}
            size={34}
          />
          <span>
            Today&apos;s author: <strong>{TODAYS_AUTHOR.name}</strong>
            {myTurn ? '. That is you!' : ''}
          </span>
        </div>

        {/* The scroll */}
        <div className={styles.scroll} id="story-scroll">
          {turns.map((turn, i) => (
            <div key={turn.id} className={styles.turnWrap}>
              {i > 0 && <div className={styles.connector} />}
              <div className={styles.turnCard}>
                <div className={styles.turnBody}>
                  <div className={styles.turnMeta}>
                    <span className={styles.turnDay}>Day {i + 1}</span>
                    <span className={styles.turnDate}>
                      {new Date(`${turn.date}T00:00:00Z`).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        timeZone: 'UTC',
                      })}
                    </span>
                    <span className={styles.turnAuthorChip}>
                      <Avatar name={turn.author} photo={turn.authorPhoto} size={22} />
                      {turn.author}
                    </span>
                  </div>
                  <p className={styles.turnText}>{turn.text}</p>
                </div>
              </div>
            </div>
          ))}

          {turns.length === 0 && (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>📜</div>
              <p>The scroll is blank. Someone has to write the first line.</p>
            </div>
          )}
        </div>

        {/* Write today's turn */}
        {myTurn && !turnWrittenToday ? (
          <div className={styles.writeBox} id="story-write">
            <div className={styles.writeLabel}>
              🖋 Your turn. Add 1-3 sentences
            </div>
            <textarea
              className={styles.writeInput}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="And then, against every code review comment ever written…"
              maxLength={600}
              rows={3}
            />
            <div className={styles.writeFooter}>
              <span className={styles.writeCount}>{draft.length}/600</span>
              <button
                className="btn btn-primary"
                onClick={submitTurn}
                disabled={submitting}
                id="story-submit"
              >
                {submitting ? 'Writing…' : 'Add to the saga'}
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.closed}>
            {turnWrittenToday
              ? 'The turn for today is in. A new author takes over at midnight.'
              : `Waiting on ${TODAYS_AUTHOR.name}. A new author takes over at midnight.`}
          </div>
        )}
      </div>
    </div>
  );
}
