import Link from 'next/link';
import styles from './page.module.css';
import { MascotFace, MASCOT } from '@/components/Mascot';

interface Feature {
  href: string;
  icon: string;
  title: string;
  description: string;
  colorClass: string;
}

const features: Feature[] = [
  {
    href: '/wordle',
    icon: '🔤',
    title: 'Bespoke Wordle',
    description: 'A daily 5-letter word from company and ML vocabulary. Six tries, then see how the office did.',
    colorClass: 'featureCardPurple',
  },
  {
    href: '/bespokle',
    icon: '🪜',
    title: 'Bespokle',
    description: 'Turn the start word into POKE one letter at a time. Solve it and BES slides in for the reveal.',
    colorClass: 'featureCardCyan',
  },
  {
    href: '/trivia',
    icon: '🧠',
    title: 'Company Trivia',
    description: 'Four timed questions a day, some lore and some not, with a speed bonus for quick answers.',
    colorClass: 'featureCardAmber',
  },
  {
    href: '/bereal',
    icon: '📸',
    title: 'BE(spoke)REAL',
    description: 'One photo prompt a day. Post before midnight, caption it yourself, collect anonymous likes.',
    colorClass: 'featureCardEmerald',
  },
  {
    href: '/ttal',
    icon: '🎭',
    title: 'Two Truths, One Lie',
    description: 'One colleague featured per day. Spot the lie, then wait for the reveal on Slack at end of day.',
    colorClass: 'featureCardRose',
  },
  {
    href: '/story',
    icon: '📖',
    title: 'Story Chain',
    description: 'One person adds a few sentences a day and the saga keeps going. Check whose turn it is.',
    colorClass: 'featureCardPurple',
  },
  {
    href: '/cards',
    icon: '🃏',
    title: 'Coffee Chat Cards',
    description: 'Get matched by the donut bot in #virtual-coffee, have the chat, mint their card.',
    colorClass: 'featureCardCyan',
  },
  {
    href: '/leaderboard',
    icon: '🏆',
    title: 'Leaderboard',
    description: 'Bespoke social points across every game, with commentary from the overlord himself.',
    colorClass: 'featureCardAmber',
  },
];

export default function Home() {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="container">
      <section className={styles.hero}>
        <div className={styles.heroBadge}>
          <span className={styles.heroPulse} />
          Bespoke Labs
        </div>

        <h1 className={styles.heroTitle}>
          <span className={styles.heroGradient}>Bespoke</span>
          <br />
          Social
        </h1>

        <p className={styles.heroSub}>
          Daily games, photo prompts, and culture rituals for Bespoke Labs.
          Play anything, earn bespoke social points, climb the leaderboard.
        </p>

        <p className="section-title">{today}</p>
      </section>

      {/* Meet the Culture Overlord */}
      <section className={styles.mascotCard} id="mascot-intro">
        <div className={styles.mascotFace}>
          <MascotFace size={132} />
        </div>
        <div className={styles.mascotCopy}>
          <p className="eyebrow">Meet your {MASCOT.title.toLowerCase()}</p>
          <h2 className={styles.mascotName}>{MASCOT.name}</h2>
          <p className={styles.mascotBio}>
            A robotic goat who lives inside Bespoke Social and our Slack. His
            one job is making sure we all have fun. He writes the leaderboard
            commentary, runs the nightly Award Ceremony, and remembers every
            streak you have ever broken.
          </p>
          <p className={styles.mascotNote}>
            Name and job title still under review. He has opinions about both.
          </p>
        </div>
      </section>

      {/* Quick Stats */}
      <section className={styles.statsBar}>
        <div className={styles.statItem}>
          <span className={styles.statValue}>–</span>
          <span className={styles.statLabel}>Your Streak</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statValue}>–</span>
          <span className={styles.statLabel}>Points Today</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statValue}>–</span>
          <span className={styles.statLabel}>Rank</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statValue}>8</span>
          <span className={styles.statLabel}>Games Active</span>
        </div>
      </section>

      {/* Feature Grid */}
      <section>
        <h2 className="section-title">Today&apos;s Activities</h2>
        <div className={`${styles.featureGrid} stagger-children`}>
          {features.map((feature) => (
            <Link
              key={feature.href}
              href={feature.href}
              className={`${styles.featureCard} ${styles[feature.colorClass]}`}
              id={`feature-${feature.href.slice(1)}`}
            >
              <span className={styles.featureIcon}>{feature.icon}</span>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <p className={styles.featureDesc}>{feature.description}</p>
              <div className={styles.featureStatus}>
                <span className={`${styles.statusDot} ${styles.statusLive}`} />
                <span className={styles.statusLabel}>Play Now</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <p className={styles.footerTagline}>
          Bespoke Social, a culture experiment by Bespoke Labs
        </p>
        <p className={styles.footerSub}>
          Supervised, loosely, by {MASCOT.name}
        </p>
      </footer>
    </div>
  );
}
