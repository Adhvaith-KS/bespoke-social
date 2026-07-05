'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './me.module.css';
import Avatar from '@/components/Avatar';
import { ME, PEOPLE } from '@/lib/demo-people';

interface BadgeDef {
  key: string;
  icon: string;
  name: string;
}

// Badge catalog — earned state comes from the `badges` table in live mode
const BADGE_CATALOG: BadgeDef[] = [
  { key: 'wordle_wizard', icon: '🧙', name: 'Wordle Wizard' },
  { key: 'ladder_legend', icon: '🪜', name: 'Ladder Legend' },
  { key: 'trivia_titan', icon: '🧠', name: 'Trivia Titan' },
  { key: 'most_on_time', icon: '⏰', name: 'Most On Time' },
  { key: 'plot_twister', icon: '📖', name: 'Plot Twister' },
  { key: 'social_butterfly', icon: '🦋', name: 'Social Butterfly' },
  { key: 'streak_master', icon: '🔥', name: 'Streak Master' },
  { key: 'early_bird', icon: '🐦', name: 'Early Bird' },
];

interface Profile {
  live: boolean;
  user?: {
    name: string;
    role: string | null;
    region: string;
    initials: string;
  };
  stats?: {
    totalPoints: number;
    rank: number;
    totalEvents: number;
    longestStreak: number;
  };
  streaks?: { wordle: number; bespokle: number; trivia: number; any: number };
  badges?: { key: string; label: string; awardedAt: string }[];
  optIns?: { bereal: boolean; ttal: boolean; story: boolean };
}

function formatBadgeDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    fetch('/api/me')
      .then((res) => res.json())
      .then((data: Profile) => setProfile(data))
      .catch(() => setProfile({ live: false }));
  }, []);

  const live = profile?.live === true;
  const earnedBadges = new Map(
    (profile?.badges ?? []).map((b) => [b.key, b.awardedAt])
  );

  const statValue = (value: number | undefined) =>
    live && value !== undefined ? value.toLocaleString() : '–';

  const streakDisplay = (days: number | undefined) =>
    live && days !== undefined && days > 0 ? `🔥 ${days}d` : '–';

  const weekLabel = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="container">
      <div className={styles.profile}>
        {/* Header — demo mode shows the demo cast lead */}
        <div className={styles.header}>
          <div className={styles.avatarWrap}>
            <Avatar
              name={live ? profile?.user?.name || ME.name : ME.name}
              photo={live ? undefined : ME.photo}
              size={96}
            />
          </div>
          <h1 className={styles.name}>
            {live ? profile?.user?.name : ME.name}
          </h1>
          <p className={styles.role}>
            {live
              ? profile?.user?.role || 'Bespoke Labs'
              : profile === null
              ? 'Loading profile…'
              : ME.role}
          </p>
        </div>

        {/* Stats */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>
              {statValue(profile?.stats?.totalPoints)}
            </div>
            <div className={styles.statLabel}>Total Points</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>
              {live && profile?.stats ? `#${profile.stats.rank}` : '–'}
            </div>
            <div className={styles.statLabel}>Global Rank</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>
              {statValue(profile?.stats?.totalEvents)}
            </div>
            <div className={styles.statLabel}>Events</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>
              {statValue(profile?.stats?.longestStreak)}
            </div>
            <div className={styles.statLabel}>Longest Streak</div>
          </div>
        </div>

        {/* Streaks */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Active Streaks</h2>
          </div>
          <div className={styles.streakGrid}>
            <div className={styles.streakCard}>
              <span className={styles.streakIcon}>🔤</span>
              <div className={styles.streakInfo}>
                <div className={styles.streakName}>Wordle</div>
                <div className={styles.streakDays}>Play daily to maintain</div>
              </div>
              <span className={styles.streakFire}>
                {streakDisplay(profile?.streaks?.wordle)}
              </span>
            </div>
            <div className={styles.streakCard}>
              <span className={styles.streakIcon}>🪜</span>
              <div className={styles.streakInfo}>
                <div className={styles.streakName}>Bespokle</div>
                <div className={styles.streakDays}>Play daily to maintain</div>
              </div>
              <span className={styles.streakFire}>
                {streakDisplay(profile?.streaks?.bespokle)}
              </span>
            </div>
            <div className={styles.streakCard}>
              <span className={styles.streakIcon}>🧠</span>
              <div className={styles.streakInfo}>
                <div className={styles.streakName}>Trivia</div>
                <div className={styles.streakDays}>Play daily to maintain</div>
              </div>
              <span className={styles.streakFire}>
                {streakDisplay(profile?.streaks?.trivia)}
              </span>
            </div>
            <div className={styles.streakCard}>
              <span className={styles.streakIcon}>🎯</span>
              <div className={styles.streakInfo}>
                <div className={styles.streakName}>Any Game</div>
                <div className={styles.streakDays}>7-day streak = +10% bonus</div>
              </div>
              <span className={styles.streakFire}>
                {streakDisplay(profile?.streaks?.any)}
              </span>
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Badges</h2>
          </div>
          <div className={styles.badgeGrid}>
            {BADGE_CATALOG.map((badge) => {
              const awardedAt = earnedBadges.get(badge.key);
              return (
                <div
                  key={badge.key}
                  className={`${styles.badgeCard} ${
                    !awardedAt ? styles.badgeLocked : ''
                  }`}
                >
                  <div className={styles.badgeIcon}>{badge.icon}</div>
                  <div className={styles.badgeName}>{badge.name}</div>
                  <div className={styles.badgeDate}>
                    {awardedAt ? formatBadgeDate(awardedAt) : 'Locked'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Player Card Preview */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Your Player Card</h2>
          </div>
          <div className={styles.playerCard}>
            <div className={styles.playerCardHeader}>
              <Avatar
                name={live ? profile?.user?.name || ME.name : ME.name}
                photo={live ? undefined : ME.photo}
                size={56}
              />
              <div>
                <div className={styles.playerCardName}>
                  {live ? profile?.user?.name : ME.name}
                </div>
                <div className={styles.playerCardRole}>
                  {live ? profile?.user?.role || 'Bespoke Labs' : ME.role}
                </div>
              </div>
            </div>
            <p className={styles.playerCardFlavor}>
              {live
                ? `${profile?.stats?.totalPoints ?? 0} points, rank #${
                    profile?.stats?.rank ?? '–'
                  }. Weekly flavor text lands with the Friday run.`
                : 'Earn bespoke social points by playing daily and posting your BE(spoke)REAL. The weekly card refreshes every Friday.'}
            </p>
            <div className={styles.playerCardBadges}>
              {BADGE_CATALOG.filter((b) => earnedBadges.has(b.key)).map(
                (badge) => (
                  <span key={badge.key} className="badge badge-purple">
                    {badge.icon} {badge.name}
                  </span>
                )
              )}
            </div>
            <div className={styles.playerCardFooter}>
              <span>Bespoke Social</span>
              <span>Week of {weekLabel}</span>
            </div>
          </div>
        </div>

        {/* Coffee chat cards collected */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Cards Collected</h2>
          </div>
          <div className={styles.cardsRow}>
            <div className={styles.cardChipCollected}>
              <Avatar name={PEOPLE[1].name} photo={PEOPLE[1].photo} size={30} />
              {PEOPLE[1].name}
            </div>
            <div className={styles.cardChipMissing}>
              <span className={styles.cardChipQ}>?</span>
              {PEOPLE[2].name}
            </div>
            <Link href="/cards" className={styles.cardsLink}>
              View collection →
            </Link>
          </div>
          <p className={styles.cardsHint}>
            Anyone who opens your profile sees this collection. Grow it
            through donut matches in #virtual-coffee.
          </p>
        </div>

      </div>
    </div>
  );
}
