'use client';

import { useEffect, useState } from 'react';
import styles from './leaderboard.module.css';
import Avatar from '@/components/Avatar';
import { PEOPLE } from '@/lib/demo-people';
import { MASCOT } from '@/components/Mascot';

type GameTab = 'global' | 'wordle' | 'bespokle' | 'trivia' | 'bereal';

interface PlayerRow {
  id: string;
  name: string;
  initials: string;
  role: string;
  photo?: string;
  points: number;
  events: number;
  streak: number;
}

// Demo data — the three-person cast until Supabase is configured
const MOCK_PLAYERS: PlayerRow[] = [
  { id: PEOPLE[1].id, name: PEOPLE[1].name, initials: PEOPLE[1].initials, role: PEOPLE[1].role, photo: PEOPLE[1].photo, points: 142, events: 23, streak: 5 },
  { id: PEOPLE[0].id, name: PEOPLE[0].name, initials: PEOPLE[0].initials, role: PEOPLE[0].role, photo: PEOPLE[0].photo, points: 128, events: 19, streak: 7 },
  { id: PEOPLE[2].id, name: PEOPLE[2].name, initials: PEOPLE[2].initials, role: PEOPLE[2].role, photo: PEOPLE[2].photo, points: 115, events: 17, streak: 3 },
];

const COMMENTARIES: Record<GameTab, string> = {
  global: 'Tarun holds the top spot by fourteen points, but Adhvaith is one day from the streak multiplier. Shrey has been overtaken twice this week, both times while asleep. The leaderboard does not sleep, Shrey.',
  wordle: 'Adhvaith solved it in two guesses today. Two. The rest of the board is still recovering.',
  bespokle: 'Shrey found a route one step faster than everyone else. The word POKE has started flinching when he logs on.',
  trivia: 'Tarun keeps answering before the timer bar finishes rendering. We reviewed the tape. It is legal. It should not be.',
  bereal: 'Everyone who posted today gets an award tonight. The desk plant photo already has a fan club.',
};

const TABS: { key: GameTab; label: string; icon: string }[] = [
  { key: 'global', label: 'Global', icon: '🌐' },
  { key: 'wordle', label: 'Wordle', icon: '🔤' },
  { key: 'bespokle', label: 'Bespokle', icon: '🪜' },
  { key: 'trivia', label: 'Trivia', icon: '🧠' },
  { key: 'bereal', label: 'BE(spoke)REAL', icon: '📸' },
];

const MEDALS = ['🥇', '🥈', '🥉'];

interface TabData {
  live: boolean;
  players: PlayerRow[];
}

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<GameTab>('global');
  const [tabData, setTabData] = useState<Partial<Record<GameTab, TabData>>>({});
  const [loading, setLoading] = useState(true);

  const selectTab = (tab: GameTab) => {
    setActiveTab(tab);
    setLoading(!tabData[tab]);
  };

  useEffect(() => {
    if (tabData[activeTab]) return;
    let cancelled = false;

    fetch(`/api/leaderboard?game=${activeTab}`)
      .then((res) => res.json())
      .then((data: TabData) => {
        if (cancelled) return;
        setTabData((prev) => ({
          ...prev,
          [activeTab]: {
            live: data.live,
            players: data.live ? data.players : MOCK_PLAYERS,
          },
        }));
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setTabData((prev) => ({
          ...prev,
          [activeTab]: { live: false, players: MOCK_PLAYERS },
        }));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, tabData]);

  const current = tabData[activeTab];
  const players = current?.players ?? [];
  const isLive = current?.live ?? false;

  return (
    <div className="container">
      <div className={styles.leaderboard}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>
            <span className={styles.titleGradient}>Leaderboard</span>
          </h1>
          <p className={styles.subtitle}>
            Points across all games •{' '}
            {isLive ? 'Live from Supabase' : 'Demo data (connect Supabase to go live)'}
          </p>
        </div>

        {/* Tabs */}
        <div className={styles.tabs} id="leaderboard-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`${styles.tab} ${
                activeTab === tab.key ? styles.tabActive : ''
              }`}
              onClick={() => selectTab(tab.key)}
              id={`tab-${tab.key}`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Commentary from the Culture Overlord */}
        <div className={styles.commentary}>
          {COMMENTARIES[activeTab]}
          <span className={styles.commentaryAuthor}>
            By {MASCOT.name}, {MASCOT.title}
          </span>
        </div>

        {/* Board */}
        <div className={styles.board} id="leaderboard-board">
          {loading && !current ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>⏳</div>
              <div className={styles.emptyText}>Loading standings…</div>
            </div>
          ) : players.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🕹️</div>
              <div className={styles.emptyText}>No plays yet</div>
              <div className={styles.emptySub}>
                Finish a game and hit Share to Slack to get on the board.
              </div>
            </div>
          ) : (
            players.map((player, index) => (
              <div
                key={player.id}
                className={`${styles.row} ${index < 3 ? styles.rowTop : ''}`}
              >
                <span
                  className={`${styles.rank} ${index < 3 ? styles.rankTop : ''}`}
                >
                  {index < 3 ? (
                    <span className={styles.rankMedal}>{MEDALS[index]}</span>
                  ) : (
                    index + 1
                  )}
                </span>
                <Avatar name={player.name} photo={player.photo} size={40} />
                <div className={styles.playerInfo}>
                  <div className={styles.playerName}>{player.name}</div>
                  <div className={styles.playerRole}>{player.role}</div>
                </div>
                <div className={styles.stats}>
                  <div className={styles.stat}>
                    <span className={`${styles.statValue} ${styles.statValuePrimary}`}>
                      {player.points}
                    </span>
                    <span className={styles.statLabel}>Points</span>
                  </div>
                  <div className={styles.stat}>
                    <span className={styles.statValue}>{player.events}</span>
                    <span className={styles.statLabel}>Events</span>
                  </div>
                  {player.streak > 0 && (
                    <span className={`${styles.streak} ${styles.streakFire}`}>
                      🔥 {player.streak}d
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
